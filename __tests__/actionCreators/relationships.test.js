import {
  loadRelationships,
  loadSearchRelationships,
} from "actionCreators/relationships"
import * as sinopiaApi from "sinopiaApi"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import { datasetFromJsonld } from "utilities/Utilities"
import instanceWithRefs from "../__resource_fixtures__/instance_with_refs.json"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])

const uri =
  "http://localhost:3000/resource/a5c5f4c0-e7cd-4ca5-a20f-2a37fe1080d5"

describe("loadRelationships()", () => {
  it("is a no-op — refs are tracked on the subject via updateBibframeRefs", async () => {
    const store = mockStore(createState())

    const result = await store.dispatch(
      loadRelationships(
        "7d7d-40ac-b38e",
        "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3f",
        "testerrorkey"
      )
    )

    expect(result).toBe(true)
    expect(store.getActions()).toHaveLength(0)
  })
})

describe("loadSearchRelationships()", () => {
  it("fetches resource and dispatches refs extracted from BIBFRAME predicates", async () => {
    const dataset = await datasetFromJsonld(instanceWithRefs)
    sinopiaApi.fetchResource = jest.fn().mockResolvedValue([dataset, {}])

    const store = mockStore(createState())
    await store.dispatch(loadSearchRelationships(uri))

    const actions = store.getActions()
    expect(actions).toHaveLength(1)
    expect(actions).toHaveAction("SET_SEARCH_RELATIONSHIPS", {
      uri,
      relationships: {
        bfAdminMetadataRefs: [],
        bfItemRefs: [],
        bfInstanceRefs: [],
        bfWorkRefs: [
          "http://localhost:3000/resource/f6ee6410-5206-492b-8e48-3b6333010c33",
        ],
      },
    })

    expect(sinopiaApi.fetchResource).toHaveBeenCalledWith(uri)
  })

  describe("when fetchResource errors", () => {
    it("silently handles error", async () => {
      sinopiaApi.fetchResource = jest.fn().mockRejectedValue(new Error("Ooops"))

      const store = mockStore(createState())
      const result = await store.dispatch(loadSearchRelationships(uri))

      expect(result).toBe(false)
      expect(store.getActions()).toHaveLength(0)
    })
  })
})
