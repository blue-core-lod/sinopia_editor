import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"
import { selectSubjectAndPropertyTemplates } from "selectors/templates"

const entitiesState = () => useEntitiesStore.getState()

describe("selectSubjectAndPropertyTemplates()", () => {
  it("returns null when no subject", () => {
    createState()
    expect(
      selectSubjectAndPropertyTemplates(entitiesState(), "abc123")
    ).toEqual(null)
  })

  it("returns templates", () => {
    createState({ hasResourceWithLiteral: true })
    const subjectTemplate = selectSubjectAndPropertyTemplates(
      entitiesState(),
      "ld4p:RT:bf2:Title:AbbrTitle"
    )
    expect(subjectTemplate).toBeSubjectTemplate("ld4p:RT:bf2:Title:AbbrTitle")
    expect(subjectTemplate.propertyTemplates).toBePropertyTemplates([
      "ld4p:RT:bf2:Title:AbbrTitle > http://id.loc.gov/ontologies/bibframe/mainTitle > literal",
    ])
  })
})
