import { Fn2 } from "@fn2/loaded"
import tinyId from "@fn2/tiny-id"

interface Patches {
  id: string
  fn: Function
  memo: Record<string, any>
}

interface Originals {
  instance: any
  fnName: string
  fn: Function
}

export class Patch {
  fn2: Fn2 = null
  tinyId: typeof tinyId = null

  originals: Originals[]
  patches: Patches[]
  steps: Record<string, Record<string, any>[]>

  constructor() {
    this.reset()
  }

  create(
    instance: any,
    fnName: string,
    ...steps: Record<string, any>[]
  ): Record<string, any> {
    const id = this.tinyId.generate()
    const memo = this.update(id, ...steps)

    const fn = (...args: any[]): Promise<any> | any => {
      const out = this.fn2.run(
        memo,
        args,
        ...this.steps[id]
      )
      const returnFnId = this.returnFnId(id)

      if (out.then) {
        return out.then(
          (out: Record<string, any>) => out[returnFnId]
        )
      } else {
        return out[returnFnId]
      }
    }

    this.originals = this.originals.concat({
      fn: instance[fnName],
      fnName,
      instance,
    })

    instance[fnName] = fn

    this.patches = this.patches.concat({
      id,
      fn,
      memo,
    })

    return memo
  }

  update(
    id: string,
    ...steps: Record<string, any>[]
  ): Record<string, any>

  update(
    fn: Function,
    ...steps: Record<string, any>[]
  ): Record<string, any>

  update(
    idOrFn: string | Function,
    ...steps: Record<string, any>[]
  ): Record<string, any> {
    let id: string
    let fn: Function
    let memo: Record<string, any>

    if (typeof idOrFn === "string") {
      id = idOrFn
      memo = {}
    } else {
      ;({ id, fn, memo } = this.find(idOrFn))
      this.remove(idOrFn)
    }

    this.steps[id] = this.steps[id] || []
    this.steps[id] = this.steps[id]
      .concat(this.fillSteps(steps))
      .sort(this.sortSteps)

    if (fn) {
      this.patches = this.patches.concat({ id, fn, memo })
    }

    return memo
  }

  find(id: string): Patches
  find(fn: Function): Patches
  find(fnOrString: Function | string): Patches {
    return this.patches.find(({ id, fn }) => {
      return typeof fnOrString === "string"
        ? fnOrString === id
        : fnOrString === fn
    })
  }

  remove(fn: Function): void {
    this.patches = this.patches.filter(
      ({ fn: f }) => fn !== f
    )
  }

  reset(): void {
    if (this.originals) {
      for (const { instance, fnName, fn } of this
        .originals) {
        instance[fnName] = fn
      }
    }

    this.originals = []
    this.patches = []
    this.steps = {}
  }

  private fillSteps(
    steps: Record<string, any>[]
  ): Record<string, any>[] {
    let order = 1

    for (const step of steps) {
      if (step.order !== undefined) {
        order = step.order
      } else {
        order = order + 1
        if (order === 0) {
          order += 1
        }
        step.order = order
      }
    }

    return steps
  }

  private returnFnId(id: string): string {
    const mainFn = this.steps[id]
      .concat([])
      .reverse()
      .find(
        step => step.order === 0 || step.return === true
      )

    if (!mainFn) {
      throw new Error(
        "Provide a return step with { order: 0 } or { return: true }."
      )
    }

    return Object.keys(mainFn).find(
      key =>
        ["args", "order", "returnArgs", "return"].indexOf(
          key
        ) < 0
    )
  }

  private sortSteps(
    { order: a }: Record<string, any>,
    { order: b }: Record<string, any>
  ): number {
    return a > b ? 1 : a < b ? -1 : 0
  }
}

export default new Patch()
