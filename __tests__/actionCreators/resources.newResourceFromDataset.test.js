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

  describe("loading a resource with a NamedNode value that has more than one property", () => {
    // resourceTemplate:testing:namedNodeMultiProp is NOT suppressible and has
    // two properties. The value below is a real NamedNode (not a blank
    // node) asserting that type locally -- this used to force suppress
    // mode purely because the value was a NamedNode, which corrupted both
    // properties into copies of the node's own URI and discarded its real
    // identity on save.
    const namedNodeUri = "http://foo/named-multi-prop"
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:namedNodeMultiPropHost" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiPropHost> .
    <> <http://sinopia.io/testing/NamedNodeMultiPropHost/property1> <${namedNodeUri}> .
    <${namedNodeUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiProp> .
    <${namedNodeUri}> <http://sinopia.io/testing/NamedNodeMultiProp/property1> "Value one"@en .
    <${namedNodeUri}> <http://sinopia.io/testing/NamedNodeMultiProp/property2> "Value two"@en .
    `

    const store = mockStore(createState())

    it("does not force suppression and preserves the value's real identity", async () => {
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
      const valueSubject = property.values[0].valueSubject

      // The value's own URI is preserved, not discarded.
      expect(valueSubject.uri).toBe(namedNodeUri)

      // Both properties were populated from their real triples, not both
      // substituted with the node's own URI.
      expect(valueSubject.properties[0].values[0].literal).toBe("Value one")
      expect(valueSubject.properties[1].values[0].literal).toBe("Value two")

      // Nothing left unused.
      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      // Round-trips as the same NamedNode, not a fresh blank node.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      const expectedRdf = expectedGraph.toCanonical()
      expect(actualRdf).toMatch(expectedRdf)
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
        newResourceFromDataset(dataset, mergeDefaultsUri, null, "testerrorkey")
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
        "<http://foo/bar> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
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

  describe("loading a resource with a value matching both a suppressible and a non-suppressible candidate", () => {
    // resourceTemplate:testing:suppressedUri (suppressible, one uri property)
    // and resourceTemplate:testing:richUri (not suppressible, a label and a
    // source property) both declare http://sinopia.io/testing/Uri as their
    // class. The value below asserts that type locally and has real data for
    // richUri's properties, so it should resolve to richUri rather than
    // throwing on the ambiguous class match.
    const richUri =
      "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3e"
    const n3 = `<${richUri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ambiguousClassNonSuppressible" .
    <${richUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/AmbiguousClassNonSuppressible> .
    <${richUri}> <http://sinopia.io/testing/AmbiguousClassNonSuppressible/property1> _:b7 .
    _:b7 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    _:b7 <http://sinopia.io/testing/RichUri/label> "A rich value"@en .
    _:b7 <http://sinopia.io/testing/RichUri/source> <http://foo/scheme> .
    `

    const store = mockStore(createState())

    it("resolves to the non-suppressible candidate and consumes its properties", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, richUri, null, "testerrorkey")
      )
      expect(result).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find(
        (action) => action.type === "ADD_SUBJECT"
      )
      expect(addSubjectAction).not.toBeNull()

      const property = addSubjectAction.payload.properties[0]
      const valueSubject = property.values[0].valueSubject
      expect(valueSubject.subjectTemplate.id).toBe(
        "resourceTemplate:testing:richUri"
      )
      expect(valueSubject.properties[0].values[0].literal).toBe("A rich value")
      expect(valueSubject.properties[1].values[0].uri).toBe("http://foo/scheme")

      // Both properties were consumed from the real data, so nothing is left unused.
      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3)
      const expectedRdf = expectedGraph.toCanonical()
      expect(actualRdf).toMatch(expectedRdf)
    })
  })

  describe("loading a resource with a value matching two non-suppressible candidates", () => {
    // resourceTemplate:testing:richUri and :richUri2 are both NOT
    // suppressible and both declare http://sinopia.io/testing/Uri as their
    // class. Preferring non-suppressible candidates only resolves the
    // suppressible-vs-non-suppressible case; with two non-suppressible
    // matches there's still no way to know which one the value represents.
    // This is caught by template validation before matching is even
    // attempted -- the host template itself fails to load.
    const ambiguousUri =
      "http://localhost:3000/resource/c7db5404-7d7d-40ac-b38e-c821d2c3ae3a"
    const n3 = `<${ambiguousUri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ambiguousClassMultipleNonSuppressible" .
    <${ambiguousUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/AmbiguousClassMultipleNonSuppressible> .
    <${ambiguousUri}> <http://sinopia.io/testing/AmbiguousClassMultipleNonSuppressible/property1> _:b8 .
    _:b8 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    _:b8 <http://sinopia.io/testing/RichUri/label> "A rich value"@en .
    `

    const store = mockStore(createState())

    it("dispatches an error rather than guessing", async () => {
      const dataset = await datasetFromN3(n3)
      const result = await store.dispatch(
        newResourceFromDataset(dataset, ambiguousUri, null, "testerrorkey")
      )
      expect(result).toBe(false)

      const actions = store.getActions()
      expect(actions).toHaveAction("ADD_ERROR", {
        errorKey: "testerrorkey",
        error:
          "The following resource templates references for http://sinopia.io/testing/AmbiguousClassMultipleNonSuppressible/property1 have the same class (http://sinopia.io/testing/Uri), but must be unique: resourceTemplate:testing:richUri, resourceTemplate:testing:richUri2",
      })
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
  describe("loading a typed NamedNode value whose sibling template declares rdf:type", () => {
    // The shape of an LC authority reference in an expanded Blue Core record:
    // the value asserts its class and carries a label, nothing more. Both
    // candidate templates claim that class, so the non-suppressible one wins.
    // It declares an rdf:type property of its own, which consumes the value's
    // type quad -- so the "captured nothing" fallback to the suppressible
    // sibling has to ignore a type-only match or the label is silently lost.
    const bareUri = "http://id.loc.gov/authorities/subjects/sh85023027"
    const RDFS = "http://www.w3.org/2000/01/rdf-schema#label"
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ambiguousClassTypedSibling" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/AmbiguousClassTypedSibling> .
    <> <http://sinopia.io/testing/AmbiguousClassTypedSibling/property1> <${bareUri}> .
    <${bareUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    <${bareUri}> <${RDFS}> "Chemistry, Physical and theoretical"@en .
    `

    const load = async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)
      const actions = store.getActions()
      return {
        values: actions.find((a) => a.type === "ADD_SUBJECT").payload
          .properties[0].values,
        unusedRDF: actions.find((a) => a.type === "SET_UNUSED_RDF")?.payload
          ?.rdf,
      }
    }

    const forTemplate = (values, id) =>
      values.find((value) => value.valueSubject.subjectTemplate.id === id)

    it("falls back to the suppressible sibling rather than the type-only match", async () => {
      const { values } = await load()
      const suppressed = forTemplate(
        values,
        "resourceTemplate:testing:suppressedUri"
      )

      expect(suppressed).toBeDefined()
      expect(suppressed.valueSubject.properties[0].values[0].uri).toBe(bareUri)
    })

    it("keeps the label instead of dropping it into unused RDF", async () => {
      const { unusedRDF } = await load()

      expect(unusedRDF ?? "").not.toContain(
        "Chemistry, Physical and theoretical"
      )
    })
  })

  describe("loading a NamedNode value whose only local triple is its rdf:type", () => {
    // resourceTemplate:testing:ambiguousClassNonSuppressible offers both
    // :suppressedUri (suppressible) and :richUri (not suppressible) for
    // http://sinopia.io/testing/Uri. The value below asserts that type and
    // nothing else -- a bare reference that happens to state its class,
    // which is the common shape in LC data. Matching the non-suppressible
    // template leaves every field empty, so the suppressible sibling is
    // preferred and the reference stays visible in a lookup field.
    const bareUri = "http://foo/bare-typed-ref"
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:ambiguousClassNonSuppressible" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/AmbiguousClassNonSuppressible> .
    <> <http://sinopia.io/testing/AmbiguousClassNonSuppressible/property1> <${bareUri}> .
    <${bareUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    `

    it("falls back to the suppressible template and keeps the reference", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find((a) => a.type === "ADD_SUBJECT")
      // Every offered template contributes a value: an empty placeholder for
      // the one with no data, plus the real value for the matched one. What
      // matters is that the reference landed on the suppressible template
      // rather than being stranded in the empty rich one.
      const values = addSubjectAction.payload.properties[0].values
      const valueForTemplate = (id) =>
        values.find((value) => value.valueSubject.subjectTemplate.id === id)

      const suppressedValue = valueForTemplate(
        "resourceTemplate:testing:suppressedUri"
      )
      expect(suppressedValue.valueSubject.properties[0].values[0].uri).toBe(
        bareUri
      )

      const richValue = valueForTemplate("resourceTemplate:testing:richUri")
      expect(
        richValue.valueSubject.properties.every(
          (property) => !property.values || property.values.length === 0
        )
      ).toBe(true)

      // Nothing dropped and nothing left over.
      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      // The reference survives the round trip unchanged. It used to gain an
      // rdfs:label holding the URI itself, because newUriFromObject defaulted
      // a URI value's label to the URI. Removed that fallback, so saving
      // a bare reference now adds nothing the dataset did not supply.
      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      expect(actualRdf).toMatch(
        `<${uri}> <http://sinopia.io/testing/AmbiguousClassNonSuppressible/property1> <${bareUri}> .`
      )
      expect(actualRdf).toMatch(
        `<${bareUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .`
      )
      expect(actualRdf).not.toMatch(
        "http://www.w3.org/2000/01/rdf-schema#label"
      )
    })
  })

  describe("loading a blank node as the object of a uri property", () => {
    // Ingested BIBFRAME does this: bf:source is sometimes a reference to a
    // scheme URI and sometimes an inline bf:Source node carrying its own code.
    // A uri-typed property cannot hold the inline form, and a blank node is
    // neither a NamedNode nor a Literal -- so it must not be coerced into one.
    // A blank node's value is the label the parser invented for it ("b0_src"
    // here, "df_153_102" in a JSON-LD parsed record), so writing it back as a
    // literal puts a parser artifact into the record as cataloged data.
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uri" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    <> <http://sinopia.io/testing/Uri/property1> _:src .
    _:src <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Source> .
    _:src <http://id.loc.gov/ontologies/bibframe/code> "thema" .
    `

    const load = async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)
      const actions = store.getActions()
      const subject = actions.find((a) => a.type === "ADD_SUBJECT").payload
      return {
        values: subject.properties.flatMap((property) => property.values || []),
        unusedRDF: actions.find((a) => a.type === "SET_UNUSED_RDF")?.payload
          ?.rdf,
      }
    }

    it("does not turn the blank node's label into a literal value", async () => {
      const { values } = await load()

      expect(values.map((value) => value.literal).filter(Boolean)).toEqual([])
    })

    it("reports the link triple as unused so it is not lost on save", async () => {
      // unorderedObjects() marks the link quad used before it is known whether
      // the object yields a value. Dropping the value without releasing it
      // would strip bf:source from the record on the next save.
      const { unusedRDF } = await load()

      expect(unusedRDF ?? "").toContain(
        "http://sinopia.io/testing/Uri/property1"
      )
    })

    it("reports the blank node's triples as unused rather than inventing a value", async () => {
      const { unusedRDF } = await load()

      expect(unusedRDF ?? "").toContain(
        "http://id.loc.gov/ontologies/bibframe/code"
      )
    })
  })

  describe("loading a uri value that the dataset gives no label", () => {
    // The editor used to invent a label holding the uri itself,
    // then write it back on save as though a cataloger had supplied it.
    const bareUri = "http://id.loc.gov/authorities/genreForms/gf2014026113"
    const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"

    const loadUriValue = async (n3) => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3)
      await store.dispatch(
        newResourceFromDataset(dataset, uri, null, "testerrorkey")
      )
      const addSubjectAction = store
        .getActions()
        .find((action) => action.type === "ADD_SUBJECT")
      return {
        value: addSubjectAction?.payload?.properties?.[0]?.values?.[0],
        rdf: new GraphBuilder(addSubjectAction.payload).graph.toCanonical(),
      }
    }

    const bareN3 = `<${uri}> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uri" .
    <${uri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/Uri> .
    <${uri}> <http://sinopia.io/testing/Uri/property1> <${bareUri}> .
    `

    it("leaves the label unset rather than defaulting it to the uri", async () => {
      const { value } = await loadUriValue(bareN3)

      expect(value.uri).toEqual(bareUri)
      expect(value.label).toBeNull()
    })

    it("does not write a made-up rdfs:label on save", async () => {
      const { rdf } = await loadUriValue(bareN3)

      expect(rdf).toMatch(
        `<${uri}> <http://sinopia.io/testing/Uri/property1> <${bareUri}> .`
      )
      expect(rdf).not.toMatch(RDFS_LABEL)
    })

    it("still keeps a label the dataset does supply", async () => {
      const labelledN3 = `${bareN3}<${bareUri}> <${RDFS_LABEL}> "Bird's-eye view prints"@en .
      `
      const { value, rdf } = await loadUriValue(labelledN3)

      expect(value.label).toEqual("Bird's-eye view prints")
      expect(rdf).toMatch(
        `<${bareUri}> <${RDFS_LABEL}> "Bird's-eye view prints"@en .`
      )
    })
  })

  describe("loading a type-only NamedNode value with no suppressible sibling", () => {
    // resourceTemplate:testing:namedNodeMultiPropHost offers only
    // :namedNodeMultiProp (not suppressible), so there is no suppressible
    // template to fall back to. The value has no properties to show, but its
    // URI is its identity and must survive the round trip rather than being
    // silently discarded on save.
    const bareUri = "http://foo/bare-typed-no-sibling"
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:namedNodeMultiPropHost" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiPropHost> .
    <> <http://sinopia.io/testing/NamedNodeMultiPropHost/property1> <${bareUri}> .
    <${bareUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiProp> .
    `

    it("keeps the value and round-trips its URI", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find((a) => a.type === "ADD_SUBJECT")
      const valueSubject =
        addSubjectAction.payload.properties[0].values[0].valueSubject

      expect(valueSubject.uri).toBe(bareUri)
      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      const actualRdf = new GraphBuilder(
        addSubjectAction.payload
      ).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(actualRdf).toMatch(expectedGraph.toCanonical())
    })
  })

  describe("loading a type-only blank node value with no suppressible sibling", () => {
    // A blank node asserting only its type has nothing to preserve: no URI
    // to fall back on and no values to show. Dropping it is correct, but it
    // must be reported as unused RDF rather than disappearing silently.
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:namedNodeMultiPropHost" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiPropHost> .
    <> <http://sinopia.io/testing/NamedNodeMultiPropHost/property1> _:b1 .
    _:b1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/NamedNodeMultiProp> .
    `

    it("drops the value but reports it as unused RDF", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const addSubjectAction = actions.find((a) => a.type === "ADD_SUBJECT")
      // mergeValues leaves the template's empty placeholder where the dropped
      // value would have been, so the cataloger still gets a blank form.
      const values = addSubjectAction.payload.properties[0].values
      expect(values).toHaveLength(1)
      expect(values[0].valueSubject.uri).toBeNull()
      expect(
        values[0].valueSubject.properties.every(
          (property) => !property.values || property.values.length === 0
        )
      ).toBe(true)

      const unusedAction = actions.find((a) => a.type === "SET_UNUSED_RDF")
      expect(unusedAction.payload.rdf).not.toBeNull()
      expect(unusedAction.payload.rdf).toMatch(
        "http://sinopia.io/testing/NamedNodeMultiPropHost/property1"
      )
      expect(unusedAction.payload.rdf).toMatch(
        "http://sinopia.io/testing/NamedNodeMultiProp"
      )
    })
  })
  describe("loading data whose linked parts point back at each other", () => {
    // resourceTemplate:testing:cycleA has a nested property pointing at
    // :cycleB, which has a nested property pointing back at :cycleA. Before
    // the guard, following that loop allocated a subject per hop until the
    // heap was exhausted -- the tab died with no error.
    const bUri = "http://foo/cycle-b"
    const propertyFor = (subject, uri) =>
      subject.properties.find((property) =>
        Object.keys(property.propertyTemplate.uris).includes(uri)
      )

    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:cycleA" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleA> .
    <> <http://sinopia.io/testing/CycleA/toB> <${bUri}> .
    <${bUri}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleB> .
    <${bUri}> <http://sinopia.io/testing/CycleB/toA> <> .
    `

    it("stops at the loop and keeps the link as a bare reference", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const resource = actions.find((a) => a.type === "ADD_SUBJECT").payload

      // A expanded into B ...
      const bSubject = propertyFor(
        resource,
        "http://sinopia.io/testing/CycleA/toB"
      ).values[0].valueSubject
      expect(bSubject.subjectTemplate.id).toBe(
        "resourceTemplate:testing:cycleB"
      )
      expect(bSubject.uri).toBe(bUri)

      // ... and B's link back to A stopped there, keeping A's URI but not
      // expanding it a second time.
      const backSubject = propertyFor(
        bSubject,
        "http://sinopia.io/testing/CycleB/toA"
      ).values[0].valueSubject
      expect(backSubject.uri).toBe(uri)
      expect(
        propertyFor(backSubject, "http://sinopia.io/testing/CycleA/toB").values
      ).toBeNull()

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      // The loop round-trips exactly, in both directions.
      const actualRdf = new GraphBuilder(resource).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(actualRdf).toMatch(expectedGraph.toCanonical())
    })
  })

  describe("loading data where a node links to itself", () => {
    // The shortest possible loop: one node, one nested property, pointing at
    // itself.
    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:selfCycle" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/SelfCycle> .
    <> <http://sinopia.io/testing/SelfCycle/toSelf> <> .
    `

    it("stops at the self-reference and round-trips it", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const resource = actions.find((a) => a.type === "ADD_SUBJECT").payload
      expect(resource.properties[0].values[0].valueSubject.uri).toBe(uri)

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })

      const actualRdf = new GraphBuilder(resource).graph.toCanonical()
      const expectedGraph = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(actualRdf).toMatch(expectedGraph.toCanonical())
    })
  })

  describe("loading data where one node is referenced from two branches", () => {
    // Not a loop: <a3> is reached twice, but by two separate paths, so it is
    // never its own ancestor. Both branches must expand it in full -- this is
    // what distinguishes a path-scoped guard from a global "already seen"
    // memo, which would leave the second branch empty.
    const b1 = "http://foo/branch-1"
    const b2 = "http://foo/branch-2"
    const shared = "http://foo/shared-a3"

    const n3 = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:cycleA" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleA> .
    <> <http://sinopia.io/testing/CycleA/toB> <${b1}> .
    <> <http://sinopia.io/testing/CycleA/toB> <${b2}> .
    <${b1}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleB> .
    <${b1}> <http://sinopia.io/testing/CycleB/toA> <${shared}> .
    <${b2}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleB> .
    <${b2}> <http://sinopia.io/testing/CycleB/toA> <${shared}> .
    <${shared}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/CycleA> .
    <${shared}> <http://www.w3.org/2000/01/rdf-schema#label> "shared node"@en .
    `

    it("expands the shared node in both branches", async () => {
      const store = mockStore(createState())
      const dataset = await datasetFromN3(n3.replace(/<>/g, `<${uri}>`))
      expect(
        await store.dispatch(
          newResourceFromDataset(dataset, uri, null, "testerrorkey")
        )
      ).toBe(true)

      const actions = store.getActions()
      const resource = actions.find((a) => a.type === "ADD_SUBJECT").payload
      const branches = resource.properties.find((property) =>
        Object.keys(property.propertyTemplate.uris).includes(
          "http://sinopia.io/testing/CycleA/toB"
        )
      ).values
      expect(branches).toHaveLength(2)

      branches.forEach((branch) => {
        const sharedSubject = branch.valueSubject.properties.find((property) =>
          Object.keys(property.propertyTemplate.uris).includes(
            "http://sinopia.io/testing/CycleB/toA"
          )
        ).values[0].valueSubject
        expect(sharedSubject.uri).toBe(shared)
        // Fully expanded, not stopped short: its label came through.
        const labelProperty = sharedSubject.properties.find((property) =>
          Object.keys(property.propertyTemplate.uris).includes(
            "http://www.w3.org/2000/01/rdf-schema#label"
          )
        )
        expect(labelProperty.values[0].literal).toBe("shared node")
      })

      expect(actions).toHaveAction("SET_UNUSED_RDF", {
        resourceKey: "abc123",
        rdf: null,
      })
    })
  })
})
