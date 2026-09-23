import rdf from "rdf-ext"
import GraphBuilder from "GraphBuilder"
import ResourceBuilder from "resourceBuilderUtils"

const RDF_FIRST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first"
const RDF_REST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"
const RDF_NIL = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil"
const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label"

// Walks an rdf:List hanging off subjectTerm/propertyUri and returns its members
// in order. Asserting on toCanonical() cannot prove ordering, because canonical
// n-quads sorts the triples and relabels the blank nodes that carry the links.
const listMembers = (dataset, subjectTerm, propertyUri) => {
  const headQuads = dataset
    .match(subjectTerm, rdf.namedNode(propertyUri))
    .toArray()
  if (headQuads.length !== 1) return null
  const members = []
  let node = headQuads[0].object
  while (node.value !== RDF_NIL) {
    const firstQuad = dataset.match(node, rdf.namedNode(RDF_FIRST)).toArray()[0]
    const restQuad = dataset.match(node, rdf.namedNode(RDF_REST)).toArray()[0]
    if (!firstQuad || !restQuad) return null
    members.push(firstQuad.object.value)
    node = restQuad.object
  }
  return members
}

const labelFor = (dataset, uri) => {
  const quad = dataset
    .match(rdf.namedNode(uri), rdf.namedNode(RDFS_LABEL))
    .toArray()[0]
  return quad ? quad.object.value : null
}

describe("GraphBuilder", () => {
  const build = new ResourceBuilder({
    injectPropertyKeyIntoValue: true,
    injectPropertyIntoValue: true,
    injectClassesIntoSubject: true,
  })
  describe("graph()", () => {
    it("builds a graph for literals", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.literalProperty({
            values: [
              // With languange
              build.literalValue({
                literal: "literal1",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
              }),
              // Without language
              build.literalValue({
                literal: "literal2",
                lang: null,
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property3",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property2> "literal1"@en .
<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property3> "literal2" .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("uses a blank node subject when useBlankNode is set and the resource has no uri", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.literalProperty({
            values: [
              build.literalValue({
                literal: "literal1",
                lang: null,
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
              }),
            ],
          }),
        ],
      })

      const canonical = new GraphBuilder(resource, true).graph.toCanonical()
      // Subject is a blank node, not an empty-uri named node (<>).
      expect(canonical).not.toContain("<>")
      expect(canonical).toContain(
        '_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template1/property2> "literal1" .'
      )
    })

    it("builds a graph for literal with validationDataType", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:literalValidation",
          clazz: "http://sinopia.io/testing/LiteralValidation",
        }),
        properties: [
          build.literalProperty({
            propertyTemplate: build.propertyTemplate({
              subjectTemplateKey: "resourceTemplate:testing:literalValidation",
              label: "literalValidation, integer validationDataType",
              uris: {
                "http://sinopia.io/testing/LiteralValidation/property3":
                  "http://sinopia.io/testing/LiteralValidation/property3",
              },
              type: "literal",
              validationDataType: "http://www.w3.org/2001/XMLSchema#integer",
              languageSuppressed: true,
              component: "InputLiteral",
            }),
            values: [
              build.literalValue({
                literal: "literal with dataType",
                lang: null,
                propertyUri:
                  "http://sinopia.io/testing/LiteralValidation/property3",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://sinopia.io/testing/LiteralValidation/property3> "literal with dataType"^^<http://www.w3.org/2001/XMLSchema#integer> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:literalValidation" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/testing/LiteralValidation> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for uris", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.uriProperty({
            values: [
              // With label
              build.uriValue({
                uri: "http://sinopia.io/uri1",
                label: "URI1",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property8",
              }),
              // Without label
              build.uriValue({
                uri: "http://sinopia.io/uri2",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property8",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property8> <http://sinopia.io/uri1> .
<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property8> <http://sinopia.io/uri2> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "URI1"@en .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for nested resources", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.resourceProperty({
            values: [
              build.subjectValue({
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber2",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                  }),
                  classes: [
                    "http://id.loc.gov/ontologies/bibframe/Uber2",
                    "http://id.loc.gov/ontologies/bibframe/Uber2a",
                  ],
                  properties: [
                    build.literalProperty({
                      values: [
                        build.literalValue({
                          literal: "literal3",
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template2/property1",
                        }),
                      ],
                    }),
                  ],
                }),
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> _:c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template2/property1> "literal3"@en .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2a> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for ordered resources", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.resourceProperty({
            propertyTemplate: build.propertyTemplate({
              subjectTemplateKey: "resourceTemplate:testing:uber1",
              label: "Uber template1, property19",
              uris: {
                "http://id.loc.gov/ontologies/bibframe/uber/template1/property19":
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property19",
              },
              ordered: true,
              type: "resource",
              component: "NestedResource",
            }),
            propertyUri:
              "http://id.loc.gov/ontologies/bibframe/uber/template1/property19",
            values: [
              build.subjectValue({
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber4",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber4",
                  }),
                  properties: [build.property()],
                }),
              }),
              build.subjectValue({
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber4",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber4",
                  }),
                  properties: [
                    build.literalProperty({
                      values: [
                        build.literalValue({
                          literal: "literal1",
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template4/property1",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
              build.subjectValue({
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber4",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber4",
                  }),
                  properties: [
                    build.property(),
                    build.literalProperty({
                      values: [
                        build.literalValue({
                          literal: "literal2",
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template4/property1",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
              build.subjectValue({
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber4",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber4",
                  }),
                  properties: [build.property()],
                }),
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property19> _:c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:c14n2 .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> _:c14n1 .
_:c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:c14n3 .
_:c14n1 <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <http://www.w3.org/1999/02/22-rdf-syntax-ns#nil> .
_:c14n2 <http://id.loc.gov/ontologies/bibframe/uber/template4/property1> "literal1"@en .
_:c14n2 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber4> .
_:c14n3 <http://id.loc.gov/ontologies/bibframe/uber/template4/property1> "literal2"@en .
_:c14n3 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber4> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph ignoring null values", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [build.property()],
      })

      const rdf = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph ignoring empty nested resources", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.property({
            values: [
              build.subjectValue({
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber2",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                  }),
                  properties: [
                    build.property({
                      values: null,
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph ignoring empty literals", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.literalProperty({
            values: [
              build.literalValue({
                literal: "literal1",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
              }),
              build.literalValue({
                // Empty
                literal: "",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property2> "literal1"@en .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph ignoring empty URIs", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.literalProperty({
            values: [
              build.uriValue({
                uri: "http://sinopia.io/uri1",
                label: "URI1",
                lang: null,
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property8",
              }),
              build.uriValue({
                // Empty
                uri: "",
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property8",
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property8> <http://sinopia.io/uri1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "URI1" .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for suppressible nested resource with uri", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.resourceProperty({
            values: [
              build.subjectValue({
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber2",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                    suppressible: true,
                  }),
                  classes: [
                    "http://id.loc.gov/ontologies/bibframe/Uber2",
                    "http://id.loc.gov/ontologies/bibframe/Uber2a",
                  ],
                  properties: [
                    build.uriProperty({
                      values: [
                        build.uriValue({
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template2/property1",
                          uri: "http://sinopia.io/uri1",
                          label: "URI1",
                          lang: null,
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> <http://sinopia.io/uri1> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<http://sinopia.io/uri1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .
<http://sinopia.io/uri1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2a> .
<http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "URI1" .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for suppressible nested resource with multiple uris", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.resourceProperty({
            values: [
              build.subjectValue({
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber2",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                    suppressible: true,
                  }),
                  properties: [
                    build.uriProperty({
                      values: [
                        build.uriValue({
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
                          uri: "http://sinopia.io/uri1",
                          label: "URI1",
                          lang: null,
                        }),
                        build.uriValue({
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
                          uri: "http://sinopia.io/uri2",
                          label: "URI2",
                          lang: null,
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> <http://sinopia.io/uri1> .
<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> <http://sinopia.io/uri2> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<http://sinopia.io/uri1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .
<http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "URI1" .
<http://sinopia.io/uri2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .
<http://sinopia.io/uri2> <http://www.w3.org/2000/01/rdf-schema#label> "URI2" .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })

    it("builds a graph for suppresible nested resource with literal", () => {
      const resource = build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:uber1",
          clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
        }),
        properties: [
          build.resourceProperty({
            values: [
              build.subjectValue({
                propertyUri:
                  "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
                valueSubject: build.subject({
                  subjectTemplate: build.subjectTemplate({
                    id: "resourceTemplate:testing:uber2",
                    clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                    suppressible: true,
                  }),
                  properties: [
                    build.literalProperty({
                      values: [
                        build.literalValue({
                          propertyUri:
                            "http://id.loc.gov/ontologies/bibframe/uber/template2/property1",
                          literal: "literal3",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
            ],
          }),
        ],
      })

      const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> _:c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template2/property1> "literal3"@en .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .`
      expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
    })
  })

  it("builds a graph for suppresible nested resource with multiple literal", () => {
    const resource = build.subject({
      subjectTemplate: build.subjectTemplate({
        id: "resourceTemplate:testing:uber1",
        clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
      }),
      properties: [
        build.resourceProperty({
          values: [
            build.subjectValue({
              propertyUri:
                "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
              valueSubject: build.subject({
                subjectTemplate: build.subjectTemplate({
                  id: "resourceTemplate:testing:uber2",
                  clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                  suppressible: true,
                }),
                properties: [
                  build.literalProperty({
                    values: [
                      build.literalValue({
                        propertyUri:
                          "http://id.loc.gov/ontologies/bibframe/uber/template2/property1",
                        literal: "literal3",
                      }),
                      build.literalValue({
                        propertyUri:
                          "http://id.loc.gov/ontologies/bibframe/uber/template2/property2",
                        literal: "literal4",
                      }),
                    ],
                  }),
                ],
              }),
            }),
          ],
        }),
      ],
    })

    const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> _:c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template2/property1> "literal3"@en .
_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template2/property2> "literal4"@en .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .`
    expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
  })

  it("builds a graph for suppressible nested resource with uri and literal", () => {
    const resource = build.subject({
      subjectTemplate: build.subjectTemplate({
        id: "resourceTemplate:testing:uber1",
        clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
      }),
      properties: [
        build.resourceProperty({
          values: [
            build.subjectValue({
              propertyUri:
                "http://id.loc.gov/ontologies/bibframe/uber/template1/property1",
              valueSubject: build.subject({
                subjectTemplate: build.subjectTemplate({
                  id: "resourceTemplate:testing:uber2",
                  clazz: "http://id.loc.gov/ontologies/bibframe/Uber2",
                  suppressible: true,
                }),
                properties: [
                  build.property({
                    values: [
                      build.uriValue({
                        propertyUri:
                          "http://id.loc.gov/ontologies/bibframe/uber/template2/property1",
                        uri: "http://sinopia.io/uri1",
                        label: "URI1",
                      }),
                      build.literalValue({
                        propertyUri:
                          "http://id.loc.gov/ontologies/bibframe/uber/template2/property2",
                        literal: "literal3",
                      }),
                    ],
                  }),
                ],
              }),
            }),
          ],
        }),
      ],
    })

    const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> <http://sinopia.io/uri1> .
<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property1> _:c14n0 .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<http://sinopia.io/uri1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .
<http://sinopia.io/uri1> <http://www.w3.org/2000/01/rdf-schema#label> "URI1"@en .
_:c14n0 <http://id.loc.gov/ontologies/bibframe/uber/template2/property2> "literal3"@en .
_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .`
    expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
  })

  describe("an ordered, repeatable uri property", () => {
    const propertyUri = "http://www.loc.gov/mads/rdf/v1#componentList"
    const dressUri = "http://id.loc.gov/authorities/subjects/sh85039410"
    const patternsUri = "http://id.loc.gov/authorities/subjects/sh99001366"

    const orderedUriResource = (values) =>
      build.subject({
        subjectTemplate: build.subjectTemplate({
          id: "resourceTemplate:testing:orderedUri",
          clazz: "http://sinopia.io/testing/OrderedUri",
        }),
        properties: [
          build.uriProperty({
            propertyTemplate: build.propertyTemplate({
              subjectTemplateKey: "resourceTemplate:testing:orderedUri",
              label: "Ordered URI input",
              uris: { [propertyUri]: propertyUri },
              ordered: true,
              repeatable: true,
              type: "uri",
              component: "InputURIValue",
            }),
            propertyUri,
            values,
          }),
        ],
      })

    const twoComponents = () =>
      orderedUriResource([
        build.uriValue({
          uri: dressUri,
          label: "Dress accessories",
          lang: null,
          propertyUri,
        }),
        build.uriValue({
          uri: patternsUri,
          label: "Patterns",
          lang: null,
          propertyUri,
        }),
      ])

    it("serializes the values as an rdf:List in order", () => {
      const dataset = new GraphBuilder(twoComponents()).graph

      expect(listMembers(dataset, rdf.namedNode(""), propertyUri)).toEqual([
        dressUri,
        patternsUri,
      ])
    })

    it("preserves order when the values are reversed", () => {
      const reversed = orderedUriResource([
        build.uriValue({
          uri: patternsUri,
          label: "Patterns",
          lang: null,
          propertyUri,
        }),
        build.uriValue({
          uri: dressUri,
          label: "Dress accessories",
          lang: null,
          propertyUri,
        }),
      ])
      const dataset = new GraphBuilder(reversed).graph

      expect(listMembers(dataset, rdf.namedNode(""), propertyUri)).toEqual([
        patternsUri,
        dressUri,
      ])
    })

    it("attaches an rdfs:label to each uri", () => {
      const dataset = new GraphBuilder(twoComponents()).graph

      expect(labelFor(dataset, dressUri)).toEqual("Dress accessories")
      expect(labelFor(dataset, patternsUri)).toEqual("Patterns")
    })

    it("emits a single-member list for one value", () => {
      const resource = orderedUriResource([
        build.uriValue({
          uri: dressUri,
          label: "Dress accessories",
          lang: null,
          propertyUri,
        }),
      ])
      const dataset = new GraphBuilder(resource).graph

      expect(listMembers(dataset, rdf.namedNode(""), propertyUri)).toEqual([
        dressUri,
      ])
    })
  })

  it("builds a graph when multiple classes", () => {
    const resource = build.subject({
      subjectTemplate: build.subjectTemplate({
        id: "resourceTemplate:testing:uber1",
        clazz: "http://id.loc.gov/ontologies/bibframe/Uber1",
      }),
      classes: [
        "http://id.loc.gov/ontologies/bibframe/Uber1",
        "http://id.loc.gov/ontologies/bibframe/Uber2",
      ],
      properties: [
        build.literalProperty({
          values: [
            // With languange
            build.literalValue({
              literal: "literal1",
              propertyUri:
                "http://id.loc.gov/ontologies/bibframe/uber/template1/property2",
            }),
            // Without language
            build.literalValue({
              literal: "literal2",
              lang: null,
              propertyUri:
                "http://id.loc.gov/ontologies/bibframe/uber/template1/property3",
            }),
          ],
        }),
      ],
    })

    const rdf = `<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property2> "literal1"@en .
<> <http://id.loc.gov/ontologies/bibframe/uber/template1/property3> "literal2" .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "resourceTemplate:testing:uber1" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber1> .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://id.loc.gov/ontologies/bibframe/Uber2> .`
    expect(new GraphBuilder(resource).graph.toCanonical()).toMatch(rdf)
  })
})
