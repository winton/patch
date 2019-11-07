import fn2 from "fn2"
import tinyId from "@fn2/tiny-id"

export class Patch {
  fn2: typeof fn2 = null
  tinyId: typeof tinyId = null
  steps: Record<string, Record<string, any>[]> = {}

  create(
    instance: any,
    fnName: string,
    ...steps: Record<string, any>[]
  ): Record<string, any> {
    const memo = {}
    const id = this.tinyId.generate()
    const fn = this.add(id, memo, ...steps)

    fn["patch"] = (
      memo: Record<string, any>,
      ...steps: Record<string, any>[]
    ): Function => {
      return this.add(id, memo, ...steps)
    }

    instance[fnName] = fn

    return memo
  }

  add(
    id: string,
    memo: Record<string, any>,
    ...steps: Record<string, any>[]
  ): Function {
    this.steps[id] = this.steps[id] || []
    this.steps[id] = this.steps[id].concat(
      this.fillSteps(steps).sort(this.sortSteps)
    )

    const returnFnId = this.returnFnId(id)

    return (...args: any[]): Promise<any> | any => {
      const out = this.fn2(memo, args, ...this.steps[id])

      if (out.then) {
        return out.then(
          (out: Record<string, any>) => out[returnFnId]
        )
      } else {
        return out[returnFnId]
      }
    }
  }

  reset(): void {
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
      .reverse()
      .find(
        step => step.order === 0 || step.return === true
      )

    if (!mainFn) {
      throw new Error(
        "Provide a return step with either { order: 0 } or { return: true }."
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
