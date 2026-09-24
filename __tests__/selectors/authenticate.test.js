// Copyright 2019 Stanford University see LICENSE for license

import { hasUser, selectUser, selectRoles } from "selectors/authenticate"

const stateWithUser = {
  authenticate: {
    user: {
      username: "jfoo",
    },
  },
}

const stateWithRoles = {
  authenticate: {
    user: {
      username: "jfoo",
      roles: ["template_edit"],
    },
  },
}

const stateWithoutUser = {
  authenticate: {},
}

describe("hasUser()", () => {
  describe("when there is a user", () => {
    it("returns true", () => {
      expect(hasUser(stateWithUser)).toBe(true)
    })
  })
  describe("when no user", () => {
    it("returns false", () => {
      expect(hasUser(stateWithoutUser)).toBe(false)
    })
  })
})

describe("selectUser()", () => {
  it("returns user", () => {
    expect(selectUser(stateWithUser)).toEqual({
      username: "jfoo",
    })
  })
})

describe("selectRoles()", () => {
  describe("when the user has roles", () => {
    it("returns the roles", () => {
      expect(selectRoles(stateWithRoles)).toEqual(["template_edit"])
    })
  })

  describe("when the user has no roles", () => {
    it("returns an empty array", () => {
      expect(selectRoles(stateWithUser)).toEqual([])
    })
  })

  describe("when there is no user", () => {
    it("returns an empty array", () => {
      expect(selectRoles(stateWithoutUser)).toEqual([])
    })
  })
})
