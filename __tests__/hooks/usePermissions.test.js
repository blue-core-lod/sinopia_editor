import React from "react"
import { screen } from "@testing-library/react"
import usePermissions from "hooks/usePermissions"
import { renderComponent, createStore } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// RTL v12 has no renderHook, so the hook is exercised through a probe
// component that renders the result of hasRole().
const renderProbe = (role, roles) => {
  const HasRoleProbe = () => {
    const { hasRole } = usePermissions()
    return <div data-testid="has-role">{hasRole(role) ? "true" : "false"}</div>
  }

  const state = createState({ roles })
  // `undefined` models a user stored before roles existed, so drop the key.
  if (roles === undefined) delete state.authenticate.user.roles
  renderComponent(<HasRoleProbe />, createStore(state))
  return screen.getByTestId("has-role").textContent
}

describe("hasRole()", () => {
  describe("when the user has the role", () => {
    it("returns true", () => {
      expect(
        renderProbe("template_edit", ["template_edit", "offline_access"])
      ).toEqual("true")
    })
  })

  describe("when the user does not have the role", () => {
    it("returns false", () => {
      expect(renderProbe("template_edit", ["offline_access"])).toEqual("false")
    })
  })

  describe("when the user has no roles", () => {
    it("returns false", () => {
      expect(renderProbe("template_edit", [])).toEqual("false")
    })
  })

  describe("when the user predates roles being stored", () => {
    it("returns false rather than throwing", () => {
      expect(renderProbe("template_edit", undefined)).toEqual("false")
    })
  })
})
