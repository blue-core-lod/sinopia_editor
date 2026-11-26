import React from "react"
import { fireEvent, screen, within } from "@testing-library/react"
import RecentlyOpened from "components/editor/RecentlyOpened"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import useResource from "hooks/useResource"
import { createState } from "stateUtils"
import { createStore, renderComponent } from "testUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.mock("hooks/useResource")

const work = {
  uri: "http://localhost:3000/works/5b0bc9ee",
  label: "The impawsibly good book of cat jokes",
  type: ["http://id.loc.gov/ontologies/bibframe/Work"],
}
const instance = {
  uri: "http://localhost:3000/instances/7c1de2ff",
  label: "Splat the Cat and the cat in space",
  type: ["http://id.loc.gov/ontologies/bibframe/Instance"],
}
const hub = {
  uri: "http://localhost:3000/hubs/9e2fa3aa",
  label: "A hub",
  type: ["http://id.loc.gov/ontologies/bibframe/Hub"],
}
// group is one of the default user's groups, so canEdit() passes and the
// template_edit role decides between editing and viewing.
const template = {
  id: "resourceTemplate:bf2:WorkMonograph",
  resourceLabel: "_Work Monograph",
  uri: "http://localhost:3000/profiles/1a2b3c4d",
  group: "stanford",
  editGroups: [],
}

const handleEdit = jest.fn()
const handleView = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  useResource.mockReturnValue({ handleEdit, handleView })
})

const setupRow = (state) => {
  const store = createStore(state)
  renderComponent(
    <AlertsContextProvider value="testerrorkey">
      <RecentlyOpened />
    </AlertsContextProvider>,
    store,
  )
  return store
}

const historyState = (options) => {
  const state = createState(options)
  state.history.resources = [work, instance, hub]
  state.history.templates = [template]
  return state
}

const items = () =>
  screen.getAllByRole("listitem").map((item) => ({
    kind: item.className.replace("recently-opened-item recently-opened-", ""),
    text: item.textContent,
  }))

describe("<RecentlyOpened />", () => {
  it("renders nothing without history or other open resources", () => {
    setupRow(createState())

    expect(screen.queryByText("Recently opened:")).not.toBeInTheDocument()
  })

  it("lists works and instances, then templates, each with its badge", () => {
    setupRow(historyState())

    screen.getByRole("heading", { name: "Recently opened:" })
    // The hub in the history is left out
    expect(items()).toEqual([
      { kind: "work", text: `W${work.label}×` },
      { kind: "instance", text: `I${instance.label}×` },
      { kind: "template", text: "RT_Work Monograph×" },
    ])
    // The full title is available when the label is cut off
    expect(screen.getByRole("button", { name: work.label })).toHaveAttribute(
      "title",
      work.label,
    )
  })

  it("opens a resource for editing", () => {
    setupRow(historyState())

    fireEvent.click(screen.getByRole("button", { name: instance.label }))

    expect(useResource).toHaveBeenCalledWith("testerrorkey", {
      resourceURI: instance.uri,
    })
    expect(handleEdit).toHaveBeenCalled()
  })

  it("opens a template for editing for a user with template_edit", () => {
    setupRow(historyState())

    fireEvent.click(screen.getByRole("button", { name: "_Work Monograph" }))

    expect(useResource).toHaveBeenCalledWith("testerrorkey", {
      resourceURI: template.uri,
      resourceTemplateId: template.id,
    })
    expect(handleEdit).toHaveBeenCalled()
    expect(handleView).not.toHaveBeenCalled()
  })

  it("opens a template for viewing for a user without template_edit", () => {
    setupRow(historyState({ roles: ["template_create"] }))

    fireEvent.click(screen.getByRole("button", { name: "_Work Monograph" }))

    expect(handleView).toHaveBeenCalled()
    expect(handleEdit).not.toHaveBeenCalled()
  })

  it("removes a resource or a template from the history", () => {
    const store = setupRow(historyState())

    fireEvent.click(
      screen.getByRole("button", {
        name: `Remove ${work.label} from recently opened`,
      }),
    )
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove _Work Monograph from recently opened",
      }),
    )

    expect(items()).toEqual([{ kind: "instance", text: `I${instance.label}×` }])
    expect(store.getState().history.resources).toEqual([instance, hub])
    expect(store.getState().history.templates).toEqual([])
  })

  describe("with another open resource the history does not show", () => {
    // Two open resources with /resource/ URIs; t9zVwg2zO is the current one
    const openState = () => createState({ hasTwoLiteralResources: true })

    it("lists the other resource, not the current one", () => {
      setupRow(openState())

      expect(screen.getAllByRole("listitem")).toHaveLength(1)
      expect(screen.getByRole("listitem")).toHaveClass("recently-opened-other")
    })

    it("switches to it", () => {
      const store = setupRow(openState())

      fireEvent.click(
        within(screen.getByRole("listitem")).getAllByRole("button")[0],
      )

      expect(store.getState().editor.currentResource).toBe("u0aWxh3a1")
    })

    it("closes it", () => {
      const store = setupRow(openState())

      fireEvent.click(
        within(screen.getByRole("listitem")).getByRole("button", {
          name: /^Close /,
        }),
      )

      expect(store.getState().editor.resources).toEqual(["t9zVwg2zO"])
      expect(screen.queryByText("Recently opened:")).not.toBeInTheDocument()
    })
  })

  describe("scrolling", () => {
    const sizes = (scrollWidth, clientWidth) => {
      jest
        .spyOn(HTMLElement.prototype, "scrollWidth", "get")
        .mockReturnValue(scrollWidth)
      jest
        .spyOn(HTMLElement.prototype, "clientWidth", "get")
        .mockReturnValue(clientWidth)
    }

    afterEach(() => jest.restoreAllMocks())

    it("has no arrows when the boxes fit", () => {
      sizes(700, 1000)
      setupRow(historyState())

      expect(
        screen.queryByRole("button", { name: /Scroll recently opened/ }),
      ).not.toBeInTheDocument()
    })

    it("has arrows when the boxes overflow, left disabled at the start", () => {
      sizes(1500, 1000)
      setupRow(historyState())

      expect(
        screen.getByRole("button", { name: "Scroll recently opened left" }),
      ).toBeDisabled()
      const right = screen.getByRole("button", {
        name: "Scroll recently opened right",
      })
      expect(right).toBeEnabled()

      const list = screen.getByRole("list")
      list.scrollBy = jest.fn()
      fireEvent.click(right)
      expect(list.scrollBy).toHaveBeenCalledWith({
        left: 800,
        behavior: "smooth",
      })
    })
  })
})
