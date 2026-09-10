import { loadResourceTemplate } from "actionCreators/templates"
import Config from "Config"
import { createState } from "stateUtils"
import useAuthenticateStore from "stores/authenticateStore"
import useEditorStore from "stores/editorStore"
import useEntitiesStore from "stores/entitiesStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

beforeEach(() => {
  useAuthenticateStore.setState({
    user: { username: "Foo McBar", groups: ["stanford", "pcc"] },
  })
})

afterEach(() => {
  useAuthenticateStore.setState({ user: undefined })
})

describe("loadResourceTemplate()", () => {
  describe("a valid template", () => {
    it("returns templates and dispatches actions when loaded", async () => {
      createState()

      const subjectTemplate = await loadResourceTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle",
        {},
        "testerrorkey"
      )
      expect(subjectTemplate).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
      expect(subjectTemplate.propertyTemplates).toHaveLength(1)
      expect(subjectTemplate.propertyTemplates[0]).toBePropertyTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle > literal"
      )

      // Template was added to Zustand store
      expect(
        useEntitiesStore.getState().subjectTemplates[
          "ld4p:RT:bf2:Title:AbbrTitle"
        ]
      ).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
    })
  })

  describe("a template already in state", () => {
    it("returns templates", async () => {
      createState({ hasResourceWithLiteral: true })

      const subjectTemplate = await loadResourceTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle",
        {},
        "testerrorkey"
      )
      expect(subjectTemplate).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
      expect(subjectTemplate.propertyTemplates).toHaveLength(1)
      expect(subjectTemplate.propertyTemplates[0]).toBePropertyTemplate(
        "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle > literal"
      )
    })
  })

  describe("an invalid template", () => {
    it("dispatches errors and returns empty", async () => {
      createState({ hasResourceWithLiteral: true })

      const subjectTemplate = await loadResourceTemplate(
        "rt:repeated:propertyURI:propertyLabel",
        {},
        "testerrorkey"
      )
      expect(subjectTemplate).toBeNull()

      // Template was added to Zustand store
      expect(
        useEntitiesStore.getState().subjectTemplates[
          "rt:repeated:propertyURI:propertyLabel"
        ]
      ).toBeSubjectTemplate("rt:repeated:propertyURI:propertyLabel")

      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "A property template may not use the same property URI as another property template (http://id.loc.gov/ontologies/bibframe/geographicCoverage) unless both propery templates are of type nested resource and the nested resources are of different classes."
      )
    })
  })

  describe("an error retrieving the template", () => {
    it("dispatches errors and returns empty", async () => {
      createState({ hasResourceWithLiteral: true })

      const subjectTemplate = await loadResourceTemplate(
        "ld4p:RT:bf2:xxx",
        {},
        "testerrorkey"
      )
      expect(subjectTemplate).toBeNull()

      expect(useEditorStore.getState().errors.testerrorkey).toContain(
        "Error retrieving ld4p:RT:bf2:xxx: Error parsing resource: Error retrieving resource: Not Found"
      )
    })
  })
})
