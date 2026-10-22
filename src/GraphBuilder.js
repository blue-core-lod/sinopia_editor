// Copyright 2019 Stanford University see LICENSE for license

import rdf from "rdf-ext"
import _ from "lodash"

const MADS_AUTHORITATIVE_LABEL =
  "http://www.loc.gov/mads/rdf/v1#authoritativeLabel"
const MADS_COMPONENT_LIST = "http://www.loc.gov/mads/rdf/v1#componentList"

const findPropertyByUri = (subject, uri) =>
  subject.properties.find(
    (property) =>
      property.propertyUri === uri ||
      property.propertyTemplate?.defaultUri === uri,
  )

// The label a component shows: a nested component (Subject Part A, B, C) is
// named by the first label or literal among its values.
const componentLabel = (value) => {
  if (value.valueSubject) {
    const named = value.valueSubject.properties
      .flatMap((property) => property.values || [])
      .find((innerValue) => innerValue.label || innerValue.literal)
    return named ? componentLabel(named) : null
  }
  const text = value.label || value.literal
  return text ? { text, lang: value.lang } : null
}

/**
 * Builds RDF graphs for a full resource
 */
export default class GraphBuilder {
  /**
   * @param {Object} resource to be converted to graph
   * @param {boolean} useBlankNode when the resource has no uri, use a blank node
   *   as the subject (rather than an empty-uri named node). This lets the Blue Core
   *   API mint a uri for a brand-new resource without recording a bogus derivedFrom.
   */
  constructor(resource, useBlankNode = false) {
    this.resource = resource
    this.useBlankNode = useBlankNode
    this.dataset = rdf.dataset()
  }

  /**
   * @return {Dataset} an RDF graph that represents the data in the state
   */
  get graph() {
    if (this.resource) {
      let resourceTerm
      if (this.resource.uri) {
        resourceTerm = rdf.namedNode(this.resource.uri)
      } else if (this.useBlankNode) {
        resourceTerm = rdf.blankNode()
      } else {
        resourceTerm = rdf.namedNode("")
      }
      this.addGeneratedByTriple(resourceTerm, this.resource.subjectTemplate)
      this.buildSubject(this.resource, resourceTerm)
    }
    return this.dataset
  }

  buildSubject(subject, subjectTerm) {
    this.addType(subjectTerm, subject.classes)
    subject.properties.forEach((property) =>
      this.buildProperty(property, subjectTerm),
    )
    this.addComponentListLabel(subject, subjectTerm)
  }

  // A complex subject's heading is its components' labels joined with "--",
  // LC's form (e.g. "Heat--Transmission"). When the cataloger leaves the
  // authoritative label blank, build it from the components so the heading is
  // not lost to anything that only reads the label. A typed label is kept.
  addComponentListLabel(subject, subjectTerm) {
    const labelProperty = findPropertyByUri(subject, MADS_AUTHORITATIVE_LABEL)
    const componentProperty = findPropertyByUri(subject, MADS_COMPONENT_LIST)
    if (!labelProperty || !componentProperty) return
    if (this.checkPropertyHasValue(labelProperty)) return

    const labels = (componentProperty.values || [])
      .filter((value) => this.checkValueHasValue(value))
      .map(componentLabel)
      .filter(Boolean)
    if (_.isEmpty(labels)) return

    this.dataset.add(
      rdf.quad(
        subjectTerm,
        rdf.namedNode(MADS_AUTHORITATIVE_LABEL),
        rdf.literal(
          labels.map((label) => label.text).join("--"),
          labels[0].lang,
        ),
      ),
    )
  }

  buildProperty(property, subjectTerm) {
    if (!this.shouldAddProperty(property)) return

    if (property.propertyTemplate?.ordered) {
      const values = property.values.filter((value) =>
        this.checkValueHasValue(value),
      )
      if (_.isEmpty(values)) return

      let nextNode = rdf.blankNode()
      this.dataset.add(
        rdf.quad(
          subjectTerm,
          // For ordered, get propertyUri from property.
          rdf.namedNode(property.propertyUri),
          nextNode,
        ),
      )
      values.forEach((value, index) => {
        const thisNode = nextNode
        nextNode =
          index !== values.length - 1
            ? rdf.blankNode()
            : rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil")
        this.dataset.add(
          rdf.quad(
            thisNode,
            rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"),
            nextNode,
          ),
        )
        this.buildValue(
          value,
          thisNode,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#first"),
          property,
        )
      })
    } else {
      const values = property.values.filter((value) =>
        this.checkValueHasValue(value),
      )

      values.forEach((value) =>
        this.buildValue(
          value,
          subjectTerm,
          rdf.namedNode(value.propertyUri),
          property,
        ),
      )
    }
  }

  buildValue(value, subjectTerm, propertyTerm, property) {
    // Can't use type to distinguish between uri and literal because inputlookups allow providing a literal for a uri.
    if (property.propertyTemplate.type === "resource") {
      this.buildValueSubject(value, subjectTerm, propertyTerm)
    } else if (value.uri) {
      this.buildUriValue(value, subjectTerm, propertyTerm)
    } else {
      this.buildLiteralValue(value, subjectTerm, propertyTerm)
    }
  }

  buildLiteralValue(value, subjectTerm, propertyTerm) {
    // TODO: ?. accessor for 2 tests that are hella annoying to fix
    const validationDataType =
      value.property?.propertyTemplate?.validationDataType
    let valueTerm
    if (validationDataType) {
      const namedNode = rdf.namedNode(validationDataType)
      valueTerm = rdf.literal(value.literal, namedNode)
    } else {
      valueTerm = rdf.literal(value.literal, value.lang)
    }
    this.dataset.add(rdf.quad(subjectTerm, propertyTerm, valueTerm))
  }

  buildUriValue(value, subjectTerm, propertyTerm) {
    const valueTerm = rdf.namedNode(value.uri)
    this.dataset.add(rdf.quad(subjectTerm, propertyTerm, valueTerm))
    if (value.label) {
      this.dataset.add(
        rdf.quad(
          valueTerm,
          rdf.namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
          rdf.literal(value.label, value.lang),
        ),
      )
    }
  }

  buildValueSubject(value, subjectTerm, propertyTerm) {
    if (!this.shouldAddValueSubject(value)) return
    if (value.valueSubject.subjectTemplate.suppressible) {
      this.buildSuppressedValueSubject(value, subjectTerm, propertyTerm)
    } else {
      // Preserve a real URI identity (e.g. loaded from a NamedNode value
      // that carries its own properties) rather than always minting a
      // fresh blank node -- otherwise that identity is lost on save.
      const objTerm = value.valueSubject.uri
        ? rdf.namedNode(value.valueSubject.uri)
        : rdf.blankNode()
      this.dataset.add(rdf.quad(subjectTerm, propertyTerm, objTerm))
      this.buildSubject(value.valueSubject, objTerm)
    }
  }

  buildSuppressedValueSubject(value, subjectTerm, propertyTerm) {
    const uriValues = value.valueSubject.properties[0].values.filter(
      (value) => value.uri,
    )
    uriValues.forEach((uriValue) => {
      this.buildUriValue(uriValue, subjectTerm, propertyTerm)
      this.addType(rdf.namedNode(uriValue.uri), value.valueSubject.classes)
    })
    const literalValues = value.valueSubject.properties[0].values.filter(
      (value) => value.literal,
    )
    if (!_.isEmpty(literalValues)) {
      const bnode = rdf.blankNode()
      this.dataset.add(rdf.quad(subjectTerm, propertyTerm, bnode))
      this.addType(bnode, value.valueSubject.classes)
      literalValues.forEach((literalValue) => {
        this.buildLiteralValue(
          literalValue,
          bnode,
          rdf.namedNode(literalValue.propertyUri),
        )
      })
    }
  }

  // Add only if there is actually a value somewhere.
  shouldAddValueSubject(value) {
    return this.checkSubjectHasValue(value.valueSubject)
  }

  shouldAddProperty(property) {
    return this.checkPropertyHasValue(property)
  }

  checkSubjectHasValue(subject) {
    // A value subject that has its own URI is worth serializing even when
    // none of its properties were filled in. The URI is the identity of a
    // real referenced resource -- dropping the subject would silently
    // discard the link to it.
    if (subject.uri) return true
    return subject.properties.some((property) =>
      this.checkPropertyHasValue(property),
    )
  }

  checkPropertyHasValue(property) {
    if (_.isEmpty(property.values)) return false
    return property.values.some((value) => this.checkValueHasValue(value))
  }

  checkValueHasValue(value) {
    if (value.literal || value.uri) return true
    if (value.valueSubject) return this.checkSubjectHasValue(value.valueSubject)
    return false
  }

  /**
   * Adds the assertion that points at the resourceTemplate we used to generate this node
   * @param {rdf.Term} baseURI
   * @param {Object} resourceTemplate the resource template containing the versionUri or id to use as the object of the triple
   * @returns {void}
   * @throws when resourceTemplate is missing both versionUri and id
   */
  addGeneratedByTriple(baseURI, resourceTemplate) {
    const templateTerm = resourceTemplate.versionUri
      ? rdf.namedNode(resourceTemplate.versionUri)
      : rdf.literal(resourceTemplate.id)
    this.dataset.add(
      rdf.quad(
        baseURI,
        rdf.namedNode("http://sinopia.io/vocabulary/hasResourceTemplate"),
        templateTerm,
      ),
    )
  }

  addType(subjectTerm, classes) {
    classes.forEach((clazz) => {
      this.dataset.add(
        rdf.quad(
          subjectTerm,
          rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          rdf.namedNode(clazz),
        ),
      )
    })
  }
}
