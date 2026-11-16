import React from "react"
import { fireEvent, screen } from "@testing-library/react"
import TemplateVersionMessage from "components/editor/TemplateVersionMessage"
import * as templateVersion from "actionCreators/templateVersion"
import { createStore, renderComponent } from "testUtils"
import { createState } from "stateUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

describe("<TemplateVersionMessage />", () => {
  const profileUri =
    "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"
  const warning = "Warning: a newer version of this template is available."

  const stateWithCheck = (check, options = {}) => {
    const state = createState({ hasResourceWithLiteral: true, ...options })
    state.editor.templateVersionCheck = {
      t9zVwg2zO: {
        is_latest: false,
        compatible: true,
        current_version_uri: `${profileUri}/version/12`,
        resource_version_uri: `${profileUri}/version/7`,
        incompatible_instances: [],
        ...check,
      },
    }
    return state
  }

  const renderMessage = (state, store = createStore(state)) =>
    renderComponent(<TemplateVersionMessage resourceKey="t9zVwg2zO" />, store)

  const republishButton = () =>
    screen.getByRole("button", { name: "Re-publish with latest template" })

  it("shows nothing without a check", () => {
    renderMessage(createState({ hasResourceWithLiteral: true }))

    expect(
      screen.queryByTestId("Template version message"),
    ).not.toBeInTheDocument()
  })

  it("offers to re-publish a resource that fits the latest version", () => {
    renderMessage(stateWithCheck({}))

    screen.getByText(warning)
    screen.getByText(
      "This resource was made with version id 7 and can be re-published with version id 12.",
    )
    expect(republishButton()).toBeEnabled()
  })

  it("asks for a save first when the resource has unsaved changes", () => {
    const state = stateWithCheck({})
    state.entities.subjects.t9zVwg2zO.changed = true

    renderMessage(state)

    expect(republishButton()).toBeDisabled()
    screen.getByText(
      "Recent changes were made to this resource. Save your changes before re-publishing.",
    )
  })

  it("names a Work with unsaved changes and makes the save-first text bold", () => {
    const state = stateWithCheck({})
    state.entities.subjects.t9zVwg2zO.changed = true
    state.entities.subjectTemplates["ld4p:RT:bf2:Title:AbbrTitle"].class =
      "http://id.loc.gov/ontologies/bibframe/Work"

    renderMessage(state)

    const text = screen.getByText(
      "Recent changes were made to this Work. Save your changes before re-publishing.",
    )
    expect(text.tagName).toEqual("STRONG")
  })

  it("does not let someone who can't edit the resource re-publish it", () => {
    renderMessage(stateWithCheck({}, { otherGroups: true }))

    screen.getByText(warning)
    expect(republishButton()).toBeDisabled()
    screen.getByText("You don't have permission to re-publish this resource.")
  })

  it("lists why a resource doesn't fit the latest version", () => {
    renderMessage(
      stateWithCheck({
        compatible: false,
        incompatible_instances: [
          {
            problems: [
              {
                subject: "https://bcld.info/works/abc",
                property: "http://id.loc.gov/ontologies/bibframe/subtitle",
                reason: "newly required, but it has no value",
              },
              {
                subject: "https://bcld.info/works/abc",
                property: null,
                reason: "class bf:Text is no longer in the template",
              },
            ],
          },
        ],
      }),
    )

    screen.getByText(warning)
    screen.getByText(
      "This resource was made with version id 7 and would not fit version id 12:",
    )
    screen.getByText(
      "http://id.loc.gov/ontologies/bibframe/subtitle: newly required, but it has no value",
    )
    screen.getByText(
      "https://bcld.info/works/abc: class bf:Text is no longer in the template",
    )
    screen.getByText("It will stay attached to version id 7.")
    expect(
      screen.queryByRole("button", { name: "Re-publish with latest template" }),
    ).not.toBeInTheDocument()
  })

  it("says when Blue Core couldn't check the resource", () => {
    renderMessage(stateWithCheck({ compatible: null }))

    screen.getByText(warning)
    screen.getByText(
      "Blue Core couldn't check whether this resource fits the latest version.",
    )
    expect(
      screen.queryByRole("button", { name: "Re-publish with latest template" }),
    ).not.toBeInTheDocument()
  })

  describe("re-publishing", () => {
    afterEach(() => jest.restoreAllMocks())

    const spyOnRepublish = () =>
      jest
        .spyOn(templateVersion, "republishWithLatestTemplate")
        .mockReturnValue(() => Promise.resolve(true))

    it("re-publishes when the button is clicked", async () => {
      const republishSpy = spyOnRepublish()
      renderMessage(stateWithCheck({}))

      fireEvent.click(republishButton())

      expect(republishSpy).toHaveBeenCalledWith(
        "t9zVwg2zO",
        "testErrorKey",
        undefined,
      )
      await screen.findByRole("button", {
        name: "Re-publish with latest template",
      })
    })

    it("confirms a re-publish", () => {
      renderMessage(stateWithCheck({ republished: true }))

      screen.getByText("Re-published with template version id 12.")
      expect(
        screen.getByTestId("Template version message").className,
      ).toContain("alert-success")
      expect(screen.queryByText(warning)).not.toBeInTheDocument()
    })

    const needsFields = [
      { label: "Versioned Title v3 > Subtitle", message: "Required" },
    ]

    it("lists the fields a re-publish needs and lets the cataloger choose", async () => {
      const republishSpy = spyOnRepublish()
      renderMessage(stateWithCheck({ needsFields }))

      screen.getByText(warning)
      screen.getByText(
        "Re-publishing with version id 12 needs these fields filled in first:",
      )
      screen.getByText("Versioned Title v3 > Subtitle: Required")
      expect(
        screen.queryByRole("button", {
          name: "Re-publish with latest template",
        }),
      ).not.toBeInTheDocument()

      fireEvent.click(
        screen.getByRole("button", { name: "Open with latest template" }),
      )
      expect(republishSpy).toHaveBeenCalledWith(
        "t9zVwg2zO",
        "testErrorKey",
        undefined,
        { skipValidation: true },
      )
      await screen.findByRole("button", { name: "Open with latest template" })
    })

    it("keeps the current version when asked", () => {
      const store = createStore(stateWithCheck({ needsFields }))
      renderMessage(null, store)

      fireEvent.click(screen.getByRole("button", { name: "Keep version id 7" }))

      expect(
        screen.queryByTestId("Template version message"),
      ).not.toBeInTheDocument()
      expect(
        store.getState().editor.templateVersionCheck.t9zVwg2zO.dismissed,
      ).toBe(true)
    })

    it("asks for a save first before opening with the latest template", () => {
      const state = stateWithCheck({ needsFields })
      state.entities.subjects.t9zVwg2zO.changed = true

      renderMessage(state)

      expect(
        screen.getByRole("button", { name: "Open with latest template" }),
      ).toBeDisabled()
      screen.getByText(
        "Recent changes were made to this resource. Save your changes before re-publishing.",
      )
      expect(
        screen.getByRole("button", { name: "Keep version id 7" }),
      ).toBeEnabled()
    })

    it("does not let someone who can't edit the resource open it with the latest template", () => {
      renderMessage(stateWithCheck({ needsFields }, { otherGroups: true }))

      expect(
        screen.getByRole("button", { name: "Open with latest template" }),
      ).toBeDisabled()
      screen.getByText("You don't have permission to re-publish this resource.")
    })
  })

  it("stays dismissed for as long as the resource is loaded", () => {
    const store = createStore(stateWithCheck({}))
    const { unmount } = renderMessage(null, store)

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss template version message" }),
    )
    expect(
      screen.queryByTestId("Template version message"),
    ).not.toBeInTheDocument()
    expect(
      store.getState().editor.templateVersionCheck.t9zVwg2zO.dismissed,
    ).toBe(true)

    unmount()
    renderMessage(null, store)
    expect(
      screen.queryByTestId("Template version message"),
    ).not.toBeInTheDocument()
  })
})
