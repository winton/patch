import load from "@loaded/loaded"
import fn2 from "fn2"
import tinyId from "@fn2/tiny-id"

import expect from "./expect"
import patch from "../src"

beforeEach(() => patch.reset())

it("patches", () => {
  expect.assertions(2)

  load(fn2, { fn2, patch, tinyId })

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
      fn: (hi: string) => expect(hi).toBe("hi"),
      order: -1,
    },
    {
      patchMe: a.patchMe.bind(a),
      order: 0,
    }
  )

  expect(a.patchMe("hi")).toBe(true)
})
