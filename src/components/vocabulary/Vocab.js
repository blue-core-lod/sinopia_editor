// Copyright 2020 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import Header from "../Header"
import AlertsContextProvider from "components/alerts/AlertsContextProvider"
import ContextAlert from "components/alerts/ContextAlert"
import _ from "lodash"

const vocabulary = {
  // === SHACL predicates (new) ===
  "sh:NodeShape": {
    description:
      "SHACL class for a resource template (replaces sinopia:ResourceTemplate)",
    url: "http://www.w3.org/ns/shacl#NodeShape",
  },
  "sh:PropertyShape": {
    description:
      "SHACL class for a property template (replaces sinopia:PropertyTemplate)",
    url: "http://www.w3.org/ns/shacl#PropertyShape",
  },
  "sh:targetClass": {
    description: "The RDF class for a resource",
    url: "http://www.w3.org/ns/shacl#targetClass",
  },
  "sh:property": {
    description: "Property template used by the resource template",
    url: "http://www.w3.org/ns/shacl#property",
  },
  "sh:order": {
    description:
      "Numeric ordering of property templates within a resource template",
    url: "http://www.w3.org/ns/shacl#order",
  },
  "sh:path": {
    description: "URI of the RDF property being described",
    url: "http://www.w3.org/ns/shacl#path",
  },
  "sh:name": {
    description: "Human-readable label for a template or property",
    url: "http://www.w3.org/ns/shacl#name",
  },
  "sh:description": {
    description:
      "Comment or guiding statement intended to be presented as supplementary information in user display",
    url: "http://www.w3.org/ns/shacl#description",
  },
  "sh:nodeKind": {
    description: "Specifies the type of node (sh:Literal, sh:IRI)",
    url: "http://www.w3.org/ns/shacl#nodeKind",
  },
  "sh:node": {
    description: "Reference to a nested resource template (NodeShape)",
    url: "http://www.w3.org/ns/shacl#node",
  },
  "sh:minCount": {
    description: "Minimum number of values required (1 = required)",
    url: "http://www.w3.org/ns/shacl#minCount",
  },
  "sh:maxCount": {
    description: "Maximum number of values allowed (absence = repeatable)",
    url: "http://www.w3.org/ns/shacl#maxCount",
  },
  "sh:defaultValue": {
    description: "Default value(s) specific to a property",
    url: "http://www.w3.org/ns/shacl#defaultValue",
  },
  "sh:pattern": {
    description: "Regular Expression to validate a literal",
    url: "http://www.w3.org/ns/shacl#pattern",
  },
  "sh:datatype": {
    description: "Data Type to validate the literal, e.g. integer or dateTime",
    url: "http://www.w3.org/ns/shacl#datatype",
  },
  // === Sinopia extensions (kept) ===
  "bf/nonfiling": {
    description:
      "Number of character positions associated with a definite or indefinite article (e.g., Le, An) at the beginning of a title that are disregarded in sorting and filing processes.",
    url: "http://sinopia.io/vocabulary/bf/nonfiling",
  },
  hasAuthor: {
    description: "Contact information associated with the template",
    url: "http://sinopia.io/vocabulary/hasAuthor",
  },
  hasAuthority: {
    description: "An authority associated with a lookup",
    url: "http://sinopia.io/vocabulary/hasAuthority",
  },
  hasOptionalClass: {
    description: "Optional RDF classes for a resource",
    url: "http://sinopia.io/vocabulary/hasOptionalClass",
  },
  hasDate: {
    description: "Date associated with the template",
    url: "http://sinopia.io/vocabulary/hasDate",
  },
  hasLiteralAttributes: {
    description: "Attributes for a literal",
    url: "http://sinopia.io/vocabulary/hasLiteralAttributes",
  },
  hasLiteralPropertyAttributes: {
    description: "Attributes for a literal property",
    url: "http://sinopia.io/vocabulary/hasLiteralPropertyAttributes",
  },
  hasLookupAttributes: {
    description: "Attributes for a lookup",
    url: "http://sinopia.io/vocabulary/hasLookupAttributes",
  },
  hasRemarkUrl: {
    description: "The property's remark as a URL",
    url: "http://sinopia.io/vocabulary/hasRemarkUrl",
  },
  hasResourceAttributes: {
    description: "Attributes specific to a resource (e.g., suppressible)",
    url: "http://sinopia.io/vocabulary/hasResourceAttributes",
  },
  hasResourceId: {
    description: "The resource's ID",
    url: "http://sinopia.io/vocabulary/hasResourceId",
  },
  hasResourceTemplate: {
    description:
      "The template used in creating, editing, or updating a resource",
    url: "http://sinopia.io/vocabulary/hasResourceTemplate",
  },
  hasUri: {
    description: "URI (legacy)",
    url: "http://sinopia.io/vocabulary/hasUri",
  },
  hasUriAttributes: {
    description: "Attributes for a URI",
    url: "http://sinopia.io/vocabulary/hasUriAttributes",
  },
  hasUriAttribute: {
    description: "Attributes specific to a URI (e.g., label suppressible)",
    url: "http://sinopia.io/vocabulary/hasUriAttributes",
  },
  "literalPropertyAttribute/userIdDefault": {
    description: "Default to the current user's ID",
    url: "http://sinopia.io/vocabulary/literalPropertyAttribute/userIdDefault",
  },
  "literalPropertyAttribute/dateDefault": {
    description: "Default to the current date",
    url: "http://sinopia.io/vocabulary/literalPropertyAttribute/dateDefault",
  },
  "propertyAttribute/immutable": {
    description: "Value cannot be changed once assigned (for IDs)",
    url: "http://sinopia.io/vocabulary/propertyAttribute/immutable",
  },
  "propertyAttribute/ordered": {
    description: "Values are ordered",
    url: "http://sinopia.io/vocabulary/propertyAttribute/ordered",
  },
  "propertyAttribute/suppressLanguage": {
    description: "Language selection is suppressed",
    url: "http://sinopia.io/vocabulary/propertyAttribute/languageSuppressed",
  },
  "resourceAttribute/suppressible": {
    description:
      "whether resource is suppressible (must have only one property which is a lookup or URI)",
    url: "http://sinopia.io/vocabulary/resourceAttribute/suppressible",
  },
  LookupPropertyTemplate: {
    description: "Class for a lookup property template",
    url: "http://sinopia.io/vocabulary/LookupPropertyTemplate",
  },
  ResourcePropertyTemplate: {
    description: "Class for a resource property template",
    url: "http://sinopia.io/vocabulary/ResourcePropertyTemplate",
  },
  Uri: {
    description: "Class for a URI template",
    url: "http://sinopia.io/vocabulary/Uri",
  },
  UriPropertyTemplate: {
    description: "Class for a URI property template",
    url: "http://sinopia.io/vocabulary/UriPropertyTemplate",
  },
}

const displayProperty = (params) => {
  const header = <h2>Template Vocabulary</h2>
  const key = params.sub ? `${params.element}/${params.sub}` : params.element
  const element = vocabulary[key]
  if (_.isEmpty(element))
    return (
      <div>
        {header}
        <h1>{key} not found</h1>
      </div>
    )
  return (
    <div>
      {header}
      <h1>{key}</h1>
      <h3>
        <em>{element.url}</em>
      </h3>
      <p>{element.description}</p>
      <p>
        Back to <a href="/vocabulary">Vocabulary</a>
      </p>
    </div>
  )
}

const AllProperties = () => (
  <div>
    <h1>Vocabulary</h1>
    <p>
      Templates use SHACL (Shapes Constraint Language) predicates for standard
      template structure, supplemented by Sinopia extension predicates for
      domain-specific features.
    </p>
    {Object.keys(vocabulary).map((key) => {
      const element = vocabulary[key]
      return (
        <div className="card w-50 mb-2" id={key} key={key}>
          <div className="card-body">
            <h2 className="card-title">
              <a href={`/vocabulary/${key}`}>{key}</a>
            </h2>
            <h3 className="card-subtitle mb-2 text-muted">{element.url}</h3>
            <p>{element.description}</p>
          </div>
        </div>
      )
    })}
  </div>
)

const vocabErrorKey = "vocab"

const Vocab = (props) => {
  const body =
    props.match.params.element === undefined ? (
      <AllProperties />
    ) : (
      displayProperty(props.match.params)
    )
  return (
    <AlertsContextProvider value={vocabErrorKey}>
      <div id="vocabulary">
        <Header triggerHomePageMenu={props.triggerHandleOffsetMenu} />
        <ContextAlert />
        {body}
      </div>
    </AlertsContextProvider>
  )
}

Vocab.propTypes = {
  triggerHandleOffsetMenu: PropTypes.func,
  match: PropTypes.object,
}

export default Vocab
