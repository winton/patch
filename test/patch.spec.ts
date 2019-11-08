import fn2 from "fn2"
import load from "@fn2/loaded"
import tinyId from "@fn2/tiny-id"

import expect from "./expect"
import patch from "../src"

load(fn2, { fn2, patch, tinyId })
beforeEach(() => patch.reset())

it("patches", () => {
  expect.assertions(8)

  let calls = []

  class A {
    patchMe(hi: string): boolean {
      return true
    }
  }

  const a = new A()

  patch.create(
    a,
    "patchMe",
    {
      fn: (hi: string) => {
        expect(hi).toBe("hi")
        calls.push(-1)
      },
      order: -1,
    },
    {
      patchMe: a.patchMe.bind(a),
      order: 0,
    },
    {
      fn: (hi: string) => {
        expect(hi).toBe("hi")
        calls.push(1)
      },
    }
  )

  expect(a.patchMe("hi")).toBe(true)
  expect(calls).toEqual([-1, 1])

  calls = []

  patch.update(
    a.patchMe,
    {
      fn: (hi: string) => calls.push(-2),
      order: -2,
    },
    {
      after: (hi: string) => {
        calls.push(2)
        return 2
      },
      order: 2,
    }
  )

  a.patchMe("hi")
  expect(calls).toEqual([-2, -1, 1, 2])

  expect(patch.find(a.patchMe).memo).toEqual({
    fn: undefined,
    patchMe: true,
    after: 2,
  })
})
