import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import TemplateVersionWarningModal from "components/editor/actions/TemplateVersionWarningModal"
import * as resourceActionCreators from "actionCreators/resources"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({ keycloak: { token: "Secret" } }),
}))

describe("<TemplateVersionWarningModal />", () => {
  const profileUri = "https://api.sinopia.io/resource/0894a8b3"

  const stateWithUsage = (usage) => {
    const state = createState({ hasResourceWithLiteral: true })
    state.entities.subjects.t9zVwg2zO.label = "Monograph Instance"
    state.editor.currentModal = ["TemplateVersionWarningModal"]
    state.editor.templateUsage = {
      t9zVwg2zO: {
        profile_uri: profileUri,
        current_version_uri: `${profileUri}/version/48213`,
        requires_new_version: true,
        copied: false,
        ...usage,
      },
    }
    return state
  }

  it("names the template and the version id the resources stay on", () => {
    const state = stateWithUsage({
      instance_count: 3,
      versions: [
        { version_uri: `${profileUri}/version/48213`, instance_count: 3 },
      ],
    })
    renderComponent(<TemplateVersionWarningModal />, createStore(state))

    screen.getByText("Template: Monograph Instance (version id 48213)")
    screen.getByText(
      /The 3 existing resource\(s\) will remain attached to version id 48213 and will not be changed\./,
    )
  })

  it("lists each version when resources are on more than one", () => {
    const state = stateWithUsage({
      instance_count: 4,
      versions: [
        { version_uri: `${profileUri}/version/17`, instance_count: 1 },
        { version_uri: `${profileUri}/version/48213`, instance_count: 2 },
        {
          version_uri: "https://api.sinopia.io/resource/parent/version/9",
          instance_count: 1,
        },
      ],
    })
    renderComponent(<TemplateVersionWarningModal />, createStore(state))

    screen.getByText(/attached to the template versions they were made with/)
    screen.getByText("version id 17: 1 resource(s)")
    screen.getByText("version id 48213: 2 resource(s)")
    screen.getByText("made with templates that nest this one: 1")
  })

  it("saves when confirmed", () => {
    const saveSpy = jest
      .spyOn(resourceActionCreators, "saveResource")
      .mockReturnValue({ type: "NOOP" })
    const state = stateWithUsage({ instance_count: 1, versions: [] })
    const store = createStore(state)
    renderComponent(<TemplateVersionWarningModal />, store)

    fireEvent.click(screen.getByLabelText("Save new template version"))

    expect(saveSpy).toHaveBeenCalledWith(
      "t9zVwg2zO",
      state.entities.subjects.t9zVwg2zO.group,
      state.entities.subjects.t9zVwg2zO.editGroups,
      "testErrorKey",
      { token: "Secret" },
    )
    expect(store.getState().editor.currentModal).toEqual([])
    saveSpy.mockRestore()
  })

  it("does not save when cancelled", () => {
    const saveSpy = jest.spyOn(resourceActionCreators, "saveResource")
    const store = createStore(
      stateWithUsage({ instance_count: 1, versions: [] }),
    )
    renderComponent(<TemplateVersionWarningModal />, store)

    fireEvent.click(screen.getByLabelText("Cancel saving new template version"))

    expect(saveSpy).not.toHaveBeenCalled()
    expect(store.getState().editor.currentModal).toEqual([])
    saveSpy.mockRestore()
  })
})
