import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import TemplateUsageMessage from "components/editor/TemplateUsageMessage"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<TemplateUsageMessage />", () => {
  const profileUri = "https://api.sinopia.io/resource/0894a8b3"

  const stateWithUsage = (usage) => {
    const state = createState({ hasResourceWithLiteral: true })
    state.editor.templateUsage = {
      t9zVwg2zO: { profile_uri: profileUri, copied: false, ...usage },
    }
    return state
  }

  const renderMessage = (state) =>
    renderComponent(
      <TemplateUsageMessage resourceKey="t9zVwg2zO" />,
      createStore(state),
    )

  it("warns that resources use the template being edited", () => {
    renderMessage(stateWithUsage({ instance_count: 3 }))

    screen.getByText("This template is used by 3 resource(s).")
    screen.getByText(/Each save creates a new template version\./)
  })

  it("shows nothing when no resources use the template", () => {
    renderMessage(stateWithUsage({ instance_count: 0 }))

    expect(
      screen.queryByTestId("Template usage message"),
    ).not.toBeInTheDocument()
  })

  it("shows nothing when usage is unknown", () => {
    renderMessage(createState({ hasResourceWithLiteral: true }))

    expect(
      screen.queryByTestId("Template usage message"),
    ).not.toBeInTheDocument()
  })

  it("notes that resources stay with the original of an unsaved copy", () => {
    const state = stateWithUsage({ instance_count: 2, copied: true })
    state.entities.subjects.t9zVwg2zO.uri = null

    renderMessage(state)

    screen.getByText("The template you copied is used by 2 resource(s).")
    screen.getByText(/Those resources stay attached to the original template\./)
  })

  it("shows nothing for a copy once it is saved", () => {
    const state = stateWithUsage({ instance_count: 2, copied: true })
    state.entities.subjects.t9zVwg2zO.uri =
      "https://api.sinopia.io/resource/new"

    renderMessage(state)

    expect(
      screen.queryByTestId("Template usage message"),
    ).not.toBeInTheDocument()
  })

  it("can be dismissed", () => {
    renderMessage(stateWithUsage({ instance_count: 3 }))

    fireEvent.click(screen.getByLabelText("Dismiss template usage message"))

    expect(
      screen.queryByTestId("Template usage message"),
    ).not.toBeInTheDocument()
  })
})
