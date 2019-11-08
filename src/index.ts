import fn2 from "fn2"
import tinyId from "@fn2/tiny-id"

export class Patch {
  fn2: typeof fn2 = null
  tinyId: typeof tinyId = null

  patches: [string, Function][] = []
  steps: Record<string, Record<string, any>[]> = {}

  create(
    instance: any,
    fnName: string,
    ...steps: Record<string, any>[]
  ): Record<string, any> {
    const id = this.tinyId.generate()
    const memo = this.update(id, ...steps)
    const [, fn] = this.findPatch(id)

    instance[fnName] = fn

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
    const memo = {}

    let id: string

    if (typeof idOrFn === "string") {
      id = idOrFn
    } else {
      ;[id] = this.findPatch(idOrFn)
      this.removePatch(idOrFn)
    }

    this.steps[id] = this.steps[id] || []
    this.steps[id] = this.steps[id]
      .concat(this.fillSteps(steps))
      .sort(this.sortSteps)

    const returnFnId = this.returnFnId(id)

    const fn = (...args: any[]): Promise<any> | any => {
      const out = this.fn2(memo, args, ...this.steps[id])

      if (out.then) {
        return out.then(
          (out: Record<string, any>) => out[returnFnId]
        )
      } else {
        return out[returnFnId]
      }
    }

    this.patches = this.patches.concat([[id, fn]])

    return memo
  }

  reset(): void {
    this.patches = []
    this.steps = {}
  }

  private findPatch(id: string): [string, Function]
  private findPatch(fn: Function): [string, Function]
  private findPatch(
    fnOrString: Function | string
  ): [string, Function] {
    return this.patches.find(([id, fn]) => {
      return typeof fnOrString === "string"
        ? fnOrString === id
        : fnOrString === fn
    })
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

  private removePatch(fn: Function): void {
    this.patches = this.patches.filter(([, f]) => fn !== f)
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
      key => ["order", "return"].indexOf(key) < 0
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
