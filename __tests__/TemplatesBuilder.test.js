import TemplatesBuilder from "TemplatesBuilder"
import { datasetFromN3 } from "utilities/Utilities"
import ResourceBuilder from "resourceBuilderUtils"
import timezoneMock from "timezone-mock"

timezoneMock.register("US/Pacific")

describe("TemplatesBuilder", () => {
  const mockDate = new Date("2019-05-14T11:01:58.135Z")
  jest.spyOn(global, "Date").mockImplementation(() => mockDate)

  const build = new ResourceBuilder()
  it("builds subjectTemplate", async () => {
    const rdf = `<> <http://sinopia.io/vocabulary/hasAuthor> "Justin Littman"@en .
<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://sinopia.io/vocabulary/hasOptionalClass> <http://id.loc.gov/ontologies/bibframe/Uber2> .
<> <http://sinopia.io/vocabulary/hasOptionalClass> <http://id.loc.gov/ontologies/bibframe/Uber3> .
<> <http://sinopia.io/vocabulary/hasDate> "2020-07-27"@en .
<> <http://www.w3.org/ns/shacl#description> "Template for testing purposes."@en .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
<> <http://sinopia.io/vocabulary/hasResourceAttribute> <http://sinopia.io/vocabulary/resourceAttribute/suppressible> .
<http://id.loc.gov/ontologies/bibframe/Uber1> <http://www.w3.org/2000/01/rdf-schema#label> "Uber1"@en .
<http://id.loc.gov/ontologies/bibframe/Uber2> <http://www.w3.org/2000/01/rdf-schema#label> "Uber2"@en .
<http://id.loc.gov/ontologies/bibframe/Uber3> <http://www.w3.org/2000/01/rdf-schema#label> "Uber3"@en .`

    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "", "", "stanford", [
      "cornell",
    ]).build()
    expect(subjectTemplate).toStrictEqual(
      build.subjectTemplate({
        id: "resourceTemplate:testing:uber1",
        clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        classes: {
          "http://id.loc.gov/ontologies/bibframe/Uber1": "Uber1",
          "http://id.loc.gov/ontologies/bibframe/Uber2": "Uber2",
          "http://id.loc.gov/ontologies/bibframe/Uber3": "Uber3",
        },
        label: "Uber template1",
        author: "Justin Littman",
        remark: "Template for testing purposes.",
        date: "2020-07-27",
        propertyTemplates: [],
        suppressible: true,
        group: "stanford",
        editGroups: ["cornell"],
      })
    )
  })

  it("builds common property template properties", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b1_c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b1_c14n0 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b1_c14n0 <http://sinopia.io/vocabulary/hasPropertyAttribute> <http://sinopia.io/vocabulary/propertyAttribute/ordered> .
_:b1_c14n0 <http://sinopia.io/vocabulary/hasPropertyAttribute> <http://sinopia.io/vocabulary/propertyAttribute/immutable> .
_:b1_c14n0 <http://sinopia.io/vocabulary/hasPropertyAttribute> <http://sinopia.io/vocabulary/propertyAttribute/suppressLanguage> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#minCount> "1"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#Literal> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#description> "A repeatable literal with multiple URIs."@en .
_:b1_c14n0 <http://sinopia.io/vocabulary/hasRemarkUrl> <http://access.rdatoolkit.org/2.4.2.html> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property2> .
_:b1_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b1_c14n0 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .
<http://access.rdatoolkit.org/2.4.2.html> <http://www.w3.org/2000/01/rdf-schema#label> "Note on Manifestation"@en .
<http://id.loc.gov/ontologies/bibframe/uber/template1/property1> <http://www.w3.org/2000/01/rdf-schema#label> "Property 1"@en .`

    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()
    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "Property 1",
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property2":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
        },
        required: true,
        repeatable: true,
        ordered: true,
        immutable: true,
        suppressLanguage: true,
        remark: "A repeatable literal with multiple URIs.",
        remarkUrl: "http://access.rdatoolkit.org/2.4.2.html",
        remarkUrlLabel: "Note on Manifestation",
        type: "literal",
        component: "InputLiteral",
      })
    )
  })

  it("builds literal property template", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b2_c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b2_c14n0 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b2_c14n0 <http://sinopia.io/vocabulary/hasLiteralAttributes> _:b2_c14n1 .
_:b2_c14n0 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#Literal> .
_:b2_c14n0 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b2_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b2_c14n0 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .
_:b2_c14n1 <http://www.w3.org/ns/shacl#defaultValue> "default1"@en .
_:b2_c14n1 <http://www.w3.org/ns/shacl#defaultValue> "default2" .
_:b2_c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/LiteralPropertyTemplate> .
_:b2_c14n1 <http://www.w3.org/ns/shacl#pattern> "^\\\\d+$"@en .
_:b2_c14n1 <http://www.w3.org/ns/shacl#datatype> <http://www.w3.org/2001/XMLSchema#integer> .
_:b2_c14n1 <http://sinopia.io/vocabulary/hasLiteralPropertyAttributes> <http://sinopia.io/vocabulary/literalPropertyAttribute/userIdDefault> .
_:b2_c14n1 <http://sinopia.io/vocabulary/hasLiteralPropertyAttributes> <http://sinopia.io/vocabulary/literalPropertyAttribute/dateDefault> .
<http://sinopia.io/vocabulary/literalPropertyAttribute/userIdDefault> <http://www.w3.org/2000/01/rdf-schema#label> "user ID default" .
<http://sinopia.io/vocabulary/literalPropertyAttribute/dateDefault> <http://www.w3.org/2000/01/rdf-schema#label> "date default" .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "", "iasimov").build()
    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
        },
        defaults: [
          { literal: "default1", lang: "en" },
          { literal: "default2", lang: null },
          { literal: "iasimov", lang: null },
          { literal: "2019-05-14", lang: null },
        ],
        repeatable: true,
        type: "literal",
        validationRegex: "^\\d+$",
        validationDataType: "http://www.w3.org/2001/XMLSchema#integer",
        languageSuppressed: true,
        component: "InputLiteral",
      })
    )
  })

  it("builds URI property template", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
    <> <http://www.w3.org/ns/shacl#property> _:b3_c14n3 .
    <> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
    <> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
    <> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
    <> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
    _:b3_c14n3 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
    _:b3_c14n2 <http://www.w3.org/ns/shacl#defaultValue> <http://sinopia.io/uri1> .
    <http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "Test uri1"@en .
    _:b3_c14n2 <http://www.w3.org/ns/shacl#defaultValue> <http://sinopia.io/uri2> .
    _:b3_c14n2 <http://sinopia.io/vocabulary/hasUriAttribute> <http://sinopia.io/vocabulary/uriAttribute/labelSuppressed> .
    _:b3_c14n2 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/UriPropertyTemplate> .
    _:b3_c14n3 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#IRI> .
    _:b3_c14n3 <http://sinopia.io/vocabulary/hasUriAttributes> _:b3_c14n2 .
    _:b3_c14n3 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
    _:b3_c14n3 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
    _:b3_c14n3 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()
    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
        },
        defaults: [
          { uri: "http://sinopia.io/uri1", label: "Test uri1", lang: "en" },
          { uri: "http://sinopia.io/uri2", label: null, lang: null },
        ],
        repeatable: true,
        type: "uri",
        component: "InputURI",
        labelSuppressed: true,
      })
    )
  })

  it("builds URI property template with legacy defaults", async () => {
    // Legacy defaults used a nested resource to model URIs and labels.
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b3_c14n3 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b3_c14n3 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b3_c14n0 <http://sinopia.io/vocabulary/hasUri> <http://sinopia.io/uri1> .
_:b3_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/Uri> .
_:b3_c14n0 <http://www.w3.org/2000/01/rdf-schema#label> "Test uri1"@en .
_:b3_c14n1 <http://sinopia.io/vocabulary/hasUri> <http://sinopia.io/uri2> .
_:b3_c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/Uri> .
_:b3_c14n2 <http://www.w3.org/ns/shacl#defaultValue> _:b3_c14n0 .
_:b3_c14n2 <http://www.w3.org/ns/shacl#defaultValue> _:b3_c14n1 .
_:b3_c14n2 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/UriPropertyTemplate> .
_:b3_c14n3 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#IRI> .
_:b3_c14n3 <http://sinopia.io/vocabulary/hasUriAttributes> _:b3_c14n2 .
_:b3_c14n3 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b3_c14n3 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b3_c14n3 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()
    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
        },
        defaults: [
          { uri: "http://sinopia.io/uri1", label: "Test uri1", lang: "en" },
          { uri: "http://sinopia.io/uri2", label: null, lang: null },
        ],
        repeatable: true,
        type: "uri",
        component: "InputURI",
      })
    )
  })

  it("builds nested resource property template", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b4_c14n1 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b4_c14n1 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b4_c14n0 <http://www.w3.org/ns/shacl#node> <resourceTemplate:testing:uber2> .
_:b4_c14n0 <http://www.w3.org/ns/shacl#node> <resourceTemplate:testing:uber3> .
_:b4_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/ResourcePropertyTemplate> .
_:b4_c14n1 <http://sinopia.io/vocabulary/hasResourceAttributes> _:b4_c14n0 .
_:b4_c14n1 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b4_c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b4_c14n1 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()
    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
        },
        repeatable: true,
        valueSubjectTemplateKeys: [
          "resourceTemplate:testing:uber2",
          "resourceTemplate:testing:uber3",
        ],
        component: "NestedResource",
        type: "resource",
      })
    )
  })

  it("preserves full HTTPS URLs in nested resource property template", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b4_c14n1 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b4_c14n1 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b4_c14n0 <http://www.w3.org/ns/shacl#node> <https://dev.bcld.info/profiles/5f862f31-6f1a-469c-ba66-f3cea0bc6599> .
_:b4_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/ResourcePropertyTemplate> .
_:b4_c14n1 <http://sinopia.io/vocabulary/hasResourceAttributes> _:b4_c14n0 .
_:b4_c14n1 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b4_c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b4_c14n1 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()
    expect(
      subjectTemplate.propertyTemplates[0].valueSubjectTemplateKeys
    ).toEqual([
      "https://dev.bcld.info/profiles/5f862f31-6f1a-469c-ba66-f3cea0bc6599",
    ])
  })

  it("builds lookup property template", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b5_c14n1 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
<urn:discogs> <http://www.w3.org/2000/01/rdf-schema#label> "Discogs" .
<urn:ld4p:qa:oclc_fast:topic> <http://www.w3.org/2000/01/rdf-schema#label> "AGROVOC (QA)" .
_:b5_c14n1 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b5_c14n0 <http://sinopia.io/vocabulary/hasAuthority> <urn:discogs> .
_:b5_c14n0 <http://sinopia.io/vocabulary/hasAuthority> <urn:ld4p:qa:oclc_fast:topic> .
_:b5_c14n0 <http://sinopia.io/vocabulary/hasAuthority> <urn:ld4p:sinopia:bibframe:instance> .
_:b5_c14n0 <http://www.w3.org/ns/shacl#defaultValue> _:b5_c14n2 .
_:b5_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/LookupPropertyTemplate> .
_:b5_c14n1 <http://sinopia.io/vocabulary/hasLookupAttributes> _:b5_c14n0 .
_:b5_c14n1 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#IRI> .
_:b5_c14n1 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b5_c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b5_c14n1 <http://www.w3.org/ns/shacl#name> "Uber template1, property2"@en .
_:b5_c14n2 <http://sinopia.io/vocabulary/hasUri> <http://sinopia.io/uri1> .
_:b5_c14n2 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/Uri> .
_:b5_c14n2 <http://www.w3.org/2000/01/rdf-schema#label> "URI1"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()

    expect(subjectTemplate.propertyTemplates[0]).toStrictEqual(
      build.propertyTemplate({
        subjectTemplateKey: "resourceTemplate:testing:uber1",
        label: "Uber template1, property2",
        uris: {
          "http://id.loc.gov/ontologies/bibframe/uber/template1/property1":
            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
        },
        defaults: [
          { uri: "http://sinopia.io/uri1", label: "URI1", lang: "en" },
        ],
        repeatable: true,
        authorities: [
          {
            uri: "urn:discogs",
            label: "Discogs",
            authority: "discogs",
            subauthority: "all",
            nonldLookup: true,
          },
          {
            uri: "urn:ld4p:qa:oclc_fast:topic",
            label: "OCLCFAST Topic (QA) - direct",
            authority: "oclcfast_direct",
            subauthority: "topic",
            nonldLookup: false,
          },
          {
            label: "Sinopia BIBFRAME instance resources",
            nonldLookup: false,
            type: "http://id.loc.gov/ontologies/bibframe/Instance",
            uri: "urn:ld4p:sinopia:bibframe:instance",
          },
        ],
        type: "uri",
        component: "InputLookup",
      })
    )
  })

  it("builds distinct keys for property templates sharing a propertyURI but differing in type", async () => {
    const rdf = `<> <http://www.w3.org/ns/shacl#targetClass> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/ns/shacl#property> _:b2_c14n0 .
<> <http://www.w3.org/ns/shacl#property> _:b3_c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:uber1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .
<> <http://www.w3.org/ns/shacl#name> "Uber template1"@en .
_:b2_c14n0 <http://www.w3.org/ns/shacl#order> "0"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b2_c14n0 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#Literal> .
_:b2_c14n0 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b2_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b2_c14n0 <http://www.w3.org/ns/shacl#name> "Uber template1, property1 (literal)"@en .
_:b3_c14n0 <http://www.w3.org/ns/shacl#order> "1"^^<http://www.w3.org/2001/XMLSchema#integer> .
_:b3_c14n0 <http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#IRI> .
_:b3_c14n0 <http://www.w3.org/ns/shacl#path> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> .
_:b3_c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#PropertyShape> .
_:b3_c14n0 <http://www.w3.org/ns/shacl#name> "Uber template1, property1 (uri)"@en .`
    const dataset = await datasetFromN3(rdf)
    const subjectTemplate = new TemplatesBuilder(dataset, "").build()

    expect(subjectTemplate.propertyTemplates).toHaveLength(2)
    const [literalTemplate, uriTemplate] = subjectTemplate.propertyTemplates
    expect(literalTemplate.type).toBe("literal")
    expect(uriTemplate.type).toBe("uri")
    expect(literalTemplate.key).not.toEqual(uriTemplate.key)
    expect(subjectTemplate.propertyTemplateKeys).toEqual([
      literalTemplate.key,
      uriTemplate.key,
    ])
  })
})
