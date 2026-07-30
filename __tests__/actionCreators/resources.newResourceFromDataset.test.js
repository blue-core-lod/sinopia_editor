import { newResourceFromDataset } from "actionCreators/resources"
import mockConsole from "jest-mock-console"
import Config from "Config"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import GraphBuilder from "GraphBuilder"
import { datasetFromN3 } from "utilities/Utilities"
import { nanoid } from "nanoid"
import expectedAction from "../__action_fixtures__/newResourceFromDataset-ADD_SUBJECT"
import expectedOrderedAction from "../__action_fixtures__/newResourceFromDataset-ADD_SUBJECT-ordered"
import expectedBadOrderedAction from "../__action_fixtures__/newResourceFromDataset-ADD_SUBJECT-bad-ordered"
import expectedNestedAction from "../__action_fixtures__/newResourceFromDataset-ADD_SUBJECT-nested"
import { safeAction, cloneAddResourceActionAsNewResource } from "actionUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

jest.mock("nanoid")

nanoid.mockImplementation(() => "abc123")

// Support mocking/restoring the `console` object
let restoreConsole = null

// This forces Sinopia server to use fixtures
jest.spyOn(Config, "useResourceTemplateFixtures", "get").mockReturnValue(true)

const mockStore = configureMockStore([thunk])

beforeAll(() => {
  // Capture and not display console output
  restoreConsole = mockConsole(["error", "debug"])
})

afterAll(() => {
  restoreConsole()
})

describe("newResourceFromDataset", () => {
  const uri =
    "http://localhost:3000/resource/b6c5f4c0-e7cd-4ca5-a20f-2a37fe1080d6"
  const resourceTemplateId = "resourceTemplate:testing:inputs"

  const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:inputs" .
  <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Inputs> .
  <> <http://sinopia.io/testing/Inputs/property1> "A literal value"@en .
  <> <http://sinopia.io/testing/Inputs/property2> <http://uri/value> .
  <> <http://sinopia.io/testing/Inputs/property3> <http://aims.fao.org/aos/agrovoc/c_331388> .
  <> <http://sinopia.io/testing/Inputs/property4> <http://id.loc.gov/vocabulary/carriers/sq> .
  <> <http://sinopia.io/testing/Inputs/property5> _:b2 .
  <http://uri/value> <http://www.w3.org/2000/01/rdf-schema#label> "A URI value"@en .
  <http://aims.fao.org/aos/agrovoc/c_331388> <http://www.w3.org/2000/01/rdf-schema#label> "corn sheller"@en .
  <http://id.loc.gov/vocabulary/carriers/sq> <http://www.w3.org/2000/01/rdf-schema#label> "audio roll" .
  _:b2 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Literal> .
  _:b2 <http://sinopia.io/testing/Literal/property1> "A nested resource"@en .
  `

  describe("loading a resource", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      // ADD_TEMPLATES is dispatched numerous times since mock store doesn't update state.
      expect(actions).toHaveAction("ADD_TEMPLATES")

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()
      expect(safeAction(addSubjectAction)).toEqual(expectedAction)

      // URI should be set for resource.
      expect(addSubjectAction.payload.uri).toBe(uri)

      // As a bonus check, roundtrip to RDF.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const expectedRdf = expectedGraph.toCanonical()
      expect(actualRdf).toMatch(expectedRdf)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
      expect(actions).toHaveAction("SET_CURRENT_EDIT_RESOURCE", "abc123")
      expect(actions).toHaveAction("LOAD_RESOURCE_FINISHED", "abc123")
    })
  })

  describe("loading a suppressed nested resource", () => {
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:suppressible" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Suppressible> .
    <> <http://sinopia.io/testing/Suppressible/property1> <http://foo/bar> .
    <http://foo/bar> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    <http://foo/bar> <http://www.w3.org/2000/01/rdf-schema#label> "Foo Bar"@en .    
    `

    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      // ADD_TEMPLATES is dispatched numerous times since mock store doesn't update state.
      expect(actions).toHaveAction("ADD_TEMPLATES")

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()
      // safeStringify is used because it removes circular references
      expect(safeAction(addSubjectAction)).toEqual(expectedNestedAction)

      // URI should be set for resource.
      expect(addSubjectAction.payload.uri).toBe(uri)

      // Roundtripped RDF should match.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const expectedRdf = expectedGraph.toCanonical()
      expect(actualRdf).toMatch(expectedRdf)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
      expect(actions).toHaveAction("SET_CURRENT_EDIT_RESOURCE", "abc123")
      expect(actions).toHaveAction("LOAD_RESOURCE_FINISHED", "abc123")
    })
  })

  describe("loading a legacy suppressed nested resource (suppressed nested resource that is not suppressed)", () => {
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:suppressible" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Suppressible> .
    <> <http://sinopia.io/testing/Suppressible/property1> _:b3 .
    _:b3 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    _:b3 <http://sinopia.io/testing/Uri/property1> <http://foo/bar> .
    <http://foo/bar> <http://www.w3.org/2000/01/rdf-schema#label> "Foo Bar"@en .  
    `

    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      // ADD_TEMPLATES is dispatched numerous times since mock store doesn't update state.
      expect(actions).toHaveAction("ADD_TEMPLATES")

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()
      // safeStringify is used because it removes circular references
      expect(safeAction(addSubjectAction)).toEqual(expectedNestedAction)

      // URI should be set for resource.
      expect(addSubjectAction.payload.uri).toBe(uri)

      // Roundtripped RDF should NOT match.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const expectedRdf = expectedGraph.toCanonical()
      expect(actualRdf).not.toMatch(expectedRdf)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
      expect(actions).toHaveAction("SET_CURRENT_EDIT_RESOURCE", "abc123")
      expect(actions).toHaveAction("LOAD_RESOURCE_FINISHED", "abc123")
    })
  })

  describe("loading a legacy resource (<> as root)", () => {
    // Legacy resources have <> as the root resource rather than <[uri]>.
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(safeAction(addSubjectAction)).toEqual(expectedAction)
    })
  })

  describe("loading a resource with extra triples", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const extraRdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property6x> <ubertemplate1:property6> .
<x> <http://id.loc.gov/ontologies/bibframe/uber/template1/property6> <ubertemplate1:property6> .
`
      const dataset = await datasetFromN3(n3 + extraRdf)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(safeAction(addSubjectAction)).toEqual(expectedAction)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: extraRdf,
      })
    })
  })

  describe("loading a resource with extra label triple", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const extraRdf = `<http://uri/value> <http://www.w3.org/2000/01/rdf-schema#label> "An extra label"@en .`

      const dataset = await datasetFromN3(n3 + extraRdf)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(safeAction(addSubjectAction)).toEqual(expectedAction)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
    })
  })

  describe("loading a resource with an ordered property", () => {
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ordered" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Ordered> .
    <> <http://sinopia.io/testing/Ordered/property1> _:b9 .
    _:b9 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> _:b10 .
    _:b9 <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:b11 .
    _:b10 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <http://www.w3.org/1999/02/22-rdf-syntax-ns#nil> .
    _:b10 <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:b12 .
    _:b11 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Literal> .
    _:b11 <http://sinopia.io/testing/Literal/property1> "literal1"@en .
    _:b12 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Literal> .
    _:b12 <http://sinopia.io/testing/Literal/property1> "literal2"@en .    
    `

    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )

      expect(safeAction(addSubjectAction)).toEqual(expectedOrderedAction)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
    })
  })

  describe("loading a resource with with ordered triples for ordered property", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ordered" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Ordered> .
    <> <http://sinopia.io/testing/Ordered/property1> _:b9 .
    _:b9 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Literal> .
    _:b9 <http://sinopia.io/testing/Literal/property1> "literal1"@en .    
`
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(safeAction(addSubjectAction)).toEqual(expectedBadOrderedAction)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: `_:c14n0 <http://sinopia.io/testing/Literal/property1> "literal1"@en .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Literal> .
`,
      })
    })
  })

  describe("loading a new resource", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey", true)
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )

      // URI should not be set for resource.
      expect(addSubjectAction.payload.uri).toBeNull()

      const newExpectedAddResourceAction =
        cloneAddResourceActionAsNewResource(expectedAction)
      expect(safeAction(addSubjectAction)).toEqual(newExpectedAddResourceAction)

      // LOAD_RESOURCE_FINISHED marks the resource as unchanged, which isn't wanted when new.
      expect(actions).not.toHaveAction("LOAD_RESOURCE_FINISHED")
    })
  })

  describe("loading a resource with provided resource template id", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      // Change the hasResourceTemplate triple.
      const fixtureRdf = n3.replace(
        resourceTemplateId,
        `${resourceTemplateId}x`
      )
      const dataset = await datasetFromN3(fixtureRdf)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, resourceTemplateId, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()

      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(safeAction(addSubjectAction)).toEqual(expectedAction)
    })
  })

  describe("loading a resource with errors", () => {
    const store = mockStore(createState())

    it("dispatches actions", async () => {
      const fixtureRdf = n3.replace(
        resourceTemplateId,
        "rt:repeated:propertyURI:propertyLabel"
      )
      const dataset = await datasetFromN3(fixtureRdf)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(false)

      const actions = store.getActions()
      expect(actions).toHaveAction("ADD_ERROR", {
        errorKey: "testerrorkey",
        error:
          "A property template may not use the same property URI as another property template (http://id.loc.gov/ontologies/bibframe/geographicCoverage) unless both propery templates are of type nested resource and the nested resources are of different classes.",
      })
    })
  })

  describe("loading a resource with a nested resource property that has multiple valueSubjectTemplateKeys", () => {
    // Only one of the two valueSubjectTemplateKeys (mergeDefaultsMatch) has real
    // data in the dataset. The other (mergeDefaultsSibling) has a configured
    // default. Loading should not populate that sibling's default value: doing
    // so would let template defaults masquerade as (and, on save, silently
    // overwrite) data that was never in the source RDF.
    const mergeDefaultsUri =
      "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3d"
    const mergeDefaultsN3 = `<${mergeDefaultsUri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:mergeDefaultsHost" .
    <${mergeDefaultsUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/MergeDefaultsHost> .
    <${mergeDefaultsUri}> <http://sinopia.io/testing/MergeDefaultsHost/property1> _:b1 .
    _:b1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/MergeDefaultsMatch> .
    _:b1 <http://sinopia.io/testing/MergeDefaultsMatch/property1> "Real value"@en .
    `

    const store = mockStore(createState())

    it("does not apply the unmatched sibling template's default value", async () => {
      const dataset = await datasetFromN3(mergeDefaultsN3)
      const result = await store.dispatch(
        newResourceFromDataset(
          dataset,
          mergeDefaultsUri,
          null,
          "testerrorkey"
        )
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()

      const resource = addSubjectAction.payload
      const property = resource.properties[0]

      const matchValue = property.values.find(
        (value) =>
          value.valueSubject.subjectTemplate.id ===
          "resourceTemplate:testing:mergeDefaultsMatch"
      )
      expect(matchValue.valueSubject.properties[0].values[0].literal).toBe(
        "Real value"
      )

      const siblingValue = property.values.find(
        (value) =>
          value.valueSubject.subjectTemplate.id ===
          "resourceTemplate:testing:mergeDefaultsSibling"
      )
      expect(siblingValue).not.toBeUndefined()
      // Should be null/empty, not populated from the sibling's configured default.
      expect(siblingValue.valueSubject.properties[0].values).toBeFalsy()

      // And on save, the unmatched sibling (having no real content) should not
      // be written to the graph at all -- confirming no phantom default value
      // is persisted.
      const actualRdf = new GraphBuilder(resource).graph.toCanonical()
      expect(actualRdf).not.toMatch("Sibling default value")
      expect(actualRdf).toMatch("Real value")
    })
  })

  describe("loading a suppressed nested resource with no local rdf:type", () => {
    // Unlike "loading a suppressed nested resource" above, <http://foo/bar>
    // has no local rdf:type triple -- the normal shape for a reference to an
    // external, shared vocabulary term. There is exactly one candidate
    // template (resourceTemplate:testing:suppressedUri) and it is marked
    // suppressible, so the value should still be recovered.
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:suppressible" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Suppressible> .
    <> <http://sinopia.io/testing/Suppressible/property1> <http://foo/bar> .
    <http://foo/bar> <http://www.w3.org/2000/01/rdf-schema#label> "Foo Bar"@en .
    `

    const store = mockStore(createState())

    it("recovers the value using the sole suppressible candidate", async () => {
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const result = await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()

      const property = addSubjectAction.payload.properties[0]
      const recoveredValue =
        property.values[0].valueSubject.properties[0].values[0]
      expect(recoveredValue.uri).toBe("http://foo/bar")
      expect(recoveredValue.label).toBe("Foo Bar")

      // On save, the recovered value round-trips as a flat, suppressed URI --
      // the real reference is written out, not silently dropped or replaced.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      expect(actualRdf).toMatch(
        "<http://sinopia.io/testing/Suppressible/property1> <http://foo/bar>"
      )
      expect(actualRdf).toMatch(
        '<http://foo/bar> <http://www.w3.org/2000/01/rdf-schema#label> "Foo Bar"@en'
      )
      // Since no local rdf:type triple was found for the recovered value,
      // the recovered subject has no known classes, so (unlike a value
      // matched by a real local type) no rdf:type is re-stamped on save.
      // The core reference is preserved either way -- this only documents
      // the known asymmetry with a genuinely Sinopia-authored round-trip.
      expect(actualRdf).not.toMatch(
        '<http://foo/bar> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'
      )
    })
  })

  describe("loading a resource property with two suppressible candidates and no local rdf:type", () => {
    // resourceTemplate:testing:suppressedUri and :suppressedUri2 are both
    // suppressible and have the identical shape (a bare uri + label). With no
    // local rdf:type on the value to disambiguate them, the loader must not
    // guess -- the real value should not appear under either candidate.
    const ambiguousUri =
      "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3c"
    const n3 = `<${ambiguousUri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:suppressibleAmbiguous" .
    <${ambiguousUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/SuppressibleAmbiguous> .
    <${ambiguousUri}> <http://sinopia.io/testing/SuppressibleAmbiguous/property1> <http://foo/bar> .
    <http://foo/bar> <http://www.w3.org/2000/01/rdf-schema#label> "Foo Bar"@en .
    `

    const store = mockStore(createState())

    it("does not guess which candidate the value represents", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, ambiguousUri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()

      const property = addSubjectAction.payload.properties[0]
      expect(property.values).toHaveLength(2)

      const uris = property.values.map(
        (value) => value.valueSubject.properties[0].values?.[0]?.uri
      )
      expect(uris).not.toContain("http://foo/bar")

      // Both candidate placeholders are empty, so on save neither is written
      // -- the real reference is lost from the editor, but nothing wrong (or
      // guessed) is persisted either.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      expect(actualRdf).not.toMatch("http://foo/bar")
    })
  })

  describe("loading a resource with a required nested resource property that has no data at all", () => {
    // resourceTemplate:testing:mergeDefaultsSibling has a configured literal
    // default (see the merge-defaults describe block above), but here it's
    // the SOLE valueSubjectTemplateKeys entry for a REQUIRED property, and
    // the dataset has no triple at all for that property -- unlike the
    // merge-defaults case, this never reaches newValuesFromDatasetByPropertyUri's
    // "resource" branch (there's no object to try matching), so it goes
    // through newProperty's required-property pre-population
    // (valuesForExpandedProperty) instead. That path threads noDefaults
    // through just like the dataset-merge path, so the default should not
    // appear here either.
    const requiredUri =
      "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3b"
    const n3 = `<${requiredUri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:requiredSingleDefaultHost" .
    <${requiredUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/RequiredSingleDefaultHost> .
    `

    const store = mockStore(createState())

    it("does not apply the candidate template's default value", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, requiredUri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()

      const resource = addSubjectAction.payload
      const property = resource.properties[0]
      expect(property.values).toHaveLength(1)

      const innerProperty = property.values[0].valueSubject.properties[0]
      expect(innerProperty.values).toBeFalsy()

      const actualRdf = new GraphBuilder(resource).graph.toCanonical()
      expect(actualRdf).not.toMatch("Sibling default value")
    })
  })
})
