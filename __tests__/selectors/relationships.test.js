import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"
import {
  selectRelationships,
  hasRelationships,
  hasSearchRelationships,
  selectSearchRelationships,
} from "selectors/relationships"
import useSearchStore from "stores/searchStore"

const entitiesState = () => useEntitiesStore.getState()

afterEach(() => {
  useSearchStore.setState({ resource: null, template: null })
})

describe("selectRelationships()", () => {
  it("merges relationships from resource and API (inferred)", () => {
    createState({ hasTemplateWithLiteral: true })
    const subjects = { ...entitiesState().subjects }
    subjects["8VrbxGPeF"] = {
      ...subjects["8VrbxGPeF"],
      bfAdminMetadataRefs: [
        "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
      ],
      bfItemRefs: [
        "http://localhost:3000/resource/032b24cb-0b5f-4df6-88d2-cb9efdf3f374",
      ],
      bfInstanceRefs: [],
      bfWorkRefs: [],
    }
    useEntitiesStore.setState({
      subjects,
      relationships: {
        "8VrbxGPeF": {
          bfAdminMetadataRefs: [
            "http://localhost:3000/resource/142b24cb-0b5f-4df6-88d2-cb9efdf3f375",
          ],
          bfItemRefs: [
            "http://localhost:3000/resource/032b24cb-0b5f-4df6-88d2-cb9efdf3f374",
          ],
          bfInstanceRefs: [
            "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376",
          ],
          bfWorkRefs: [],
        },
      },
    })

    expect(selectRelationships(entitiesState(), "8VrbxGPeF")).toStrictEqual({
      bfAdminMetadataRefs: [
        "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
        "http://localhost:3000/resource/142b24cb-0b5f-4df6-88d2-cb9efdf3f375",
      ],
      bfItemRefs: [
        "http://localhost:3000/resource/032b24cb-0b5f-4df6-88d2-cb9efdf3f374",
      ],
      bfInstanceRefs: [
        "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376",
      ],
      bfWorkRefs: [],
    })
  })
})

describe("hasRelationships()", () => {
  it("returns true when relationships", () => {
    createState({ hasTemplateWithLiteral: true })
    const subjects = { ...entitiesState().subjects }
    subjects["8VrbxGPeF"] = {
      ...subjects["8VrbxGPeF"],
      bfAdminMetadataRefs: [
        "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
      ],
    }
    useEntitiesStore.setState({ subjects })

    expect(hasRelationships(entitiesState(), "8VrbxGPeF")).toBe(true)
  })

  it("returns false when no relationships", () => {
    createState({ hasTemplateWithLiteral: true })

    expect(hasRelationships(entitiesState(), "8VrbxGPeF")).toBe(false)
  })
})

describe("hasSearchRelationships()", () => {
  it("returns true when relationships", () => {
    useSearchStore.setState({
      resource: {
        relationshipResults: {
          "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376":
            {
              bfInstanceRefs: [
                "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
              ],
            },
        },
      },
    })
    expect(
      hasSearchRelationships(
        "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376"
      )
    ).toBe(true)
  })

  it("returns false when no relationships", () => {
    useSearchStore.setState({
      resource: {
        relationshipResults: {
          "http://localhost:3000/resource/032b24cb-0b5f-4df6-88d2-cb9efdf3f374":
            {
              bfInstanceRefs: [],
            },
        },
      },
    })

    expect(
      hasSearchRelationships(
        "http://localhost:3000/resource/032b24cb-0b5f-4df6-88d2-cb9efdf3f374"
      )
    ).toBe(false)
    expect(
      hasSearchRelationships(
        "http://localhost:3000/resource/xxxb24cb-0b5f-4df6-88d2-cb9efdf3f374"
      )
    ).toBe(false)
  })
})

describe("selectSearchRelationships()", () => {
  it("returns relationships", () => {
    useSearchStore.setState({
      resource: {
        relationshipResults: {
          "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376":
            {
              bfInstanceRefs: [
                "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
              ],
            },
        },
      },
    })
    expect(
      selectSearchRelationships(
        "http://localhost:3000/resource/252b24cb-0b5f-4df6-88d2-cb9efdf3f376"
      )
    ).toStrictEqual({
      bfInstanceRefs: [
        "http://localhost:3000/resource/922b24cb-0b5f-4df6-88d2-cb9efdf3f373",
      ],
    })
  })
})
