import React from "react"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import SaveAndPublishButton from "components/editor/actions/SaveAndPublishButton"
import * as resourceActionCreators from "actionCreators/resources"
import * as templateUsageActionCreators from "actionCreators/templateUsage"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({ keycloak: { token: "Secret" } }),
}))

describe("<SaveAndPublishButton /> for a template with resources", () => {
  const stateWithUsage = (usage) => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.changed = true
    state.editor.templateUsage = {
      t9zVwg2zO: { instance_count: 2, copied: false, ...usage },
    }
    return state
  }

  let saveSpy
  beforeEach(() => {
    saveSpy = jest
      .spyOn(resourceActionCreators, "saveResource")
      .mockReturnValue({ type: "NOOP" })
  })
  afterEach(() => jest.restoreAllMocks())

  const mockCheck = (result) =>
    jest
      .spyOn(templateUsageActionCreators, "checkTemplateChange")
      .mockReturnValue(() => Promise.resolve(result))

  it("asks for confirmation when existing resources would not fit", async () => {
    const checkSpy = mockCheck({ requires_new_version: true })
    const store = createStore(stateWithUsage())
    renderComponent(<SaveAndPublishButton />, store)

    fireEvent.click(screen.getByLabelText("Save"))

    await waitFor(() =>
      expect(store.getState().editor.currentModal).toEqual([
        "TemplateVersionWarningModal",
      ]),
    )
    expect(checkSpy).toHaveBeenCalledWith("t9zVwg2zO", { token: "Secret" })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it("saves when existing resources would fit", async () => {
    mockCheck({ requires_new_version: false })
    const store = createStore(stateWithUsage())
    renderComponent(<SaveAndPublishButton />, store)

    fireEvent.click(screen.getByLabelText("Save"))

    await waitFor(() => expect(saveSpy).toHaveBeenCalled())
    expect(store.getState().editor.currentModal).toEqual([])
  })

  it("saves when the check could not be made", async () => {
    mockCheck(null)
    renderComponent(<SaveAndPublishButton />, createStore(stateWithUsage()))

    fireEvent.click(screen.getByLabelText("Save"))

    await waitFor(() => expect(saveSpy).toHaveBeenCalled())
  })

  it("saves without checking when no resources use the template", () => {
    const checkSpy = mockCheck({ requires_new_version: true })
    renderComponent(
      <SaveAndPublishButton />,
      createStore(stateWithUsage({ instance_count: 0 })),
    )

    fireEvent.click(screen.getByLabelText("Save"))

    expect(checkSpy).not.toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  })
})
