import { loadResourceTemplate } from "actionCreators/templates"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import { addTemplates } from "reducers/templates"
import { selectSubjectTemplate } from "selectors/templates"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const mockStore = configureMockStore([thunk])

describe("loadResourceTemplate()", () => {
  describe("a valid template", () => {
    it("returns templates and dispatches actions when loaded", async () => {
      const store = mockStore(createState())

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate("ld4p:RT:bf2:Title:AbbrTitle", {}, "testerrorkey")
      )
      expect(subjectTemplate).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
      expect(subjectTemplate.propertyTemplates).toHaveLength(1)
      expect(subjectTemplate.propertyTemplates[0]).toBePropertyTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle > literal"
      )

      expect(store.getActions()).toEqual([
        {
          type: "ADD_TEMPLATES",
          payload: expect.toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle"),
        },
      ])
    })
  })

  describe("a template already in state", () => {
    it("returns templates", async () => {
      const store = mockStore(createState({ hasResourceWithLiteral: true }))

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate("ld4p:RT:bf2:Title:AbbrTitle", {}, "testerrorkey")
      )
      expect(subjectTemplate).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
      expect(subjectTemplate.propertyTemplates).toHaveLength(1)
      expect(subjectTemplate.propertyTemplates[0]).toBePropertyTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle > literal"
      )

      expect(store.getActions()).toHaveLength(0)
    })
  })

  describe("an invalid template", () => {
    it("dispatches errors and returns empty", async () => {
      const store = mockStore(createState({ hasResourceWithLiteral: true }))

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate(
          "rt:repeated:propertyURI:propertyLabel",
          {},
          "testerrorkey"
        )
      )
      expect(subjectTemplate).toBeNull()

      expect(store.getActions()).toEqual([
        {
          type: "ADD_TEMPLATES",
          payload: expect.toBeSubjectTemplate(
            "rt:repeated:propertyURI:propertyLabel"
          ),
        },
        {
          type: "ADD_ERROR",
          payload: {
            errorKey: "testerrorkey",
            error:
              "A property template may not use the same property URI as another property template (http://id.loc.gov/ontologies/bibframe/geographicCoverage) unless both propery templates are of type nested resource and the nested resources are of different classes.",
          },
        },
      ])
    })
  })

  describe("an error retrieving the template", () => {
    it("dispatches errors and returns empty", async () => {
      const store = mockStore(createState({ hasResourceWithLiteral: true }))

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate("ld4p:RT:bf2:xxx", {}, "testerrorkey")
      )
      expect(subjectTemplate).toBeNull()

      expect(store.getActions()).toEqual([
        {
          type: "ADD_ERROR",
          payload: {
            errorKey: "testerrorkey",
            error:
              "Error retrieving ld4p:RT:bf2:xxx: Error parsing resource: Error retrieving resource: Not Found",
          },
        },
      ])
    })
  })

  describe("templates referenced by URI", () => {
    const profileUri =
      "https://bluecore-dev.stanford.edu/profiles/3db30d3a-7a3e-4762-a28c-1a0efc244345"

    // Feed a dispatched ADD_TEMPLATES through the real reducer, which is where
    // the state key is actually chosen.
    const stateAfterLoading = (actions) =>
      actions
        .filter((action) => action.type === "ADD_TEMPLATES")
        .reduce(
          (entities, action) => addTemplates(entities, action),
          createState().entities
        )

    it("keys a version-pinned template on the version URI, not its human id", async () => {
      const store = mockStore(createState())
      const versionUri = `${profileUri}/version/1`

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate(versionUri, {}, "testerrorkey")
      )

      expect(subjectTemplate.key).toEqual(versionUri)
      expect(subjectTemplate.id).toEqual("bluecore:bf2:Title:VersionedTitle")
      expect(subjectTemplate.version).toEqual(1)
      expect(subjectTemplate.profileUri).toEqual(profileUri)
    })

    it("finds a URI-referenced template in state on a later lookup by the same URI", async () => {
      const store = mockStore(createState())

      await store.dispatch(loadResourceTemplate(profileUri, {}, "testerrorkey"))
      const entities = stateAfterLoading(store.getActions())

      expect(
        selectSubjectTemplate({ entities }, profileUri)
      ).not.toBeUndefined()
    })

    it("renders two versions of one template independently in a single session", async () => {
      const store = mockStore(createState())
      const resourceTemplatePromises = {}

      const v1 = await store.dispatch(
        loadResourceTemplate(
          `${profileUri}/version/1`,
          resourceTemplatePromises,
          "testerrorkey"
        )
      )
      const v2 = await store.dispatch(
        loadResourceTemplate(
          `${profileUri}/version/2`,
          resourceTemplatePromises,
          "testerrorkey"
        )
      )

      // Same template, two versions -- so the same human id, but they must not
      // share a state key or the second overwrites the first.
      expect(v1.id).toEqual(v2.id)
      expect(v1.key).not.toEqual(v2.key)

      const entities = stateAfterLoading(store.getActions())
      expect(
        selectSubjectTemplate({ entities }, `${profileUri}/version/1`).label
      ).toEqual("Versioned Title v1")
      expect(
        selectSubjectTemplate({ entities }, `${profileUri}/version/2`).label
      ).toEqual("Versioned Title v2")
    })

    it("still keys a legacy bare-id reference on the bare id", async () => {
      const store = mockStore(createState())

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate("ld4p:RT:bf2:Title:AbbrTitle", {}, "testerrorkey")
      )

      expect(subjectTemplate.key).toEqual("ld4p:RT:bf2:Title:AbbrTitle")
      expect(subjectTemplate.version).toBeNull()
    })

    // 14.8% of nested refs on bluecore-dev point at a different environment's
    // host. Following them couples environments, but they resolve today and
    // nothing in this ticket may stop them resolving. Rewriting them is a
    // template manager's data fix, not a reader change.
    it("still follows a reference to a profile on a foreign host", async () => {
      const store = mockStore(createState())
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {})

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate(profileUri, {}, "testerrorkey")
      )

      expect(subjectTemplate).not.toBeNull()
      expect(subjectTemplate.id).toEqual("bluecore:bf2:Title:VersionedTitle")
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("different environment"),
        profileUri
      )
      warn.mockRestore()
    })

    // The templates in static/templates are hardcoded, have no profile and no
    // version, and are reached by id. Version-aware keying must leave them
    // exactly where they were or the template editor itself stops loading.
    it("leaves base templates keyed on their id, with no version", async () => {
      const store = mockStore(createState())

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate("sinopia:template:resource", {}, "testerrorkey")
      )

      expect(subjectTemplate.key).toEqual("sinopia:template:resource")
      expect(subjectTemplate.id).toEqual("sinopia:template:resource")
      expect(subjectTemplate.version).toBeNull()
      expect(subjectTemplate.versionUri).toBeNull()
      expect(subjectTemplate.profileUri).toBeNull()
    })

    // The parent records only a URI, so there is no expected id to compare
    // against -- but a payload that is not a resource template at all is
    // detectable, and silently rendering it as a template with null fields is
    // how a mis-pinned reference becomes an unopenable resource.
    it("fails loudly when a URI reference does not resolve to a resource template", async () => {
      const store = mockStore(createState())
      const notATemplate =
        "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f-invalid-template"

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate(notATemplate, {}, "testerrorkey")
      )

      expect(subjectTemplate).toBeNull()
      expect(store.getActions()).toEqual([
        {
          type: "ADD_ERROR",
          payload: {
            errorKey: "testerrorkey",
            error: expect.stringContaining("is not a resource template"),
          },
        },
      ])
    })

    // A null id would flow into isTemplate(), which decides whether a save
    // POSTs to /profiles or /resources -- a silent wrong-collection write
    // rather than a visible failure.
    it("fails loudly when a typed template carries no hasResourceId", async () => {
      const store = mockStore(createState())
      const noIdProfile =
        "http://localhost:3000/profiles/44444444-4444-4444-8444-444444444444"

      const subjectTemplate = await store.dispatch(
        loadResourceTemplate(noIdProfile, {}, "testerrorkey")
      )

      expect(subjectTemplate).toBeNull()
      expect(store.getActions()).toEqual([
        {
          type: "ADD_ERROR",
          payload: {
            errorKey: "testerrorkey",
            error: expect.stringContaining("has no sinopia:hasResourceId"),
          },
        },
      ])
    })
  })
})
