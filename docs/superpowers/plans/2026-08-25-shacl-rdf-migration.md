# SHACL RDF Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom `sinopia:` predicates in `TemplatesBuilder.js` with standard SHACL predicates so templates are portable and standards-based.

**Architecture:** Direct predicate swap within the existing TemplatesBuilder parsing architecture. The internal state shape is preserved — only the RDF vocabulary changes. `buildList()` linked-list traversal is replaced by `sh:property` + `sh:order` sorting. `propertyTypeFor()` substring extraction is replaced by SHACL constraint inspection.

**Tech Stack:** rdf-ext (existing), Jest + React Testing Library (existing), N3 turtle format for test RDF

**Spec:** `docs/superpowers/specs/2026-08-24-shacl-rdf-migration-design.md`

## Global Constraints

- Internal state shape produced by `TemplatesBuilder.build()` must not change — all downstream code depends on it
- `sinopia:hasResourceTemplate` on resources stays unchanged (out of scope)
- Custom extension predicates stay under `sinopia:` namespace
- Big-bang cutover: no dual-vocabulary support
- No new npm dependencies
- ESLint `--max-warnings 0` — CI fails on any warning
- Tests run via `npx jest path/to/test` for individual files, `npm test` for full suite

---

### Task 1: Update TemplatesBuilder Tests to Use SHACL RDF

**Files:**
- Modify: `__tests__/TemplatesBuilder.test.js`

**Interfaces:**
- Consumes: `TemplatesBuilder` class (constructor, `build()` method)
- Produces: Updated test RDF strings using SHACL predicates; expected outputs unchanged

This task converts all inline N3 test data from sinopia vocabulary to SHACL. The expected assertion values stay identical — they test the internal state shape, which doesn't change.

**Key predicate mappings for test RDF:**
- `<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/ResourceTemplate>` → `<http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape>`
- `<http://sinopia.io/vocabulary/hasClass>` → `<http://www.w3.org/ns/shacl#targetClass>`
- `<http://www.w3.org/2000/01/rdf-schema#label>` (on templates/properties) → `<http://www.w3.org/ns/shacl#name>`
- `<http://sinopia.io/vocabulary/hasRemark>` → `<http://www.w3.org/ns/shacl#description>`
- `<http://sinopia.io/vocabulary/hasPropertyTemplate> _:list` + `rdf:first/rest` → `<http://www.w3.org/ns/shacl#property> _:propNode` + `_:propNode <http://www.w3.org/ns/shacl#order> "0"^^xsd:integer`
- `<http://sinopia.io/vocabulary/hasPropertyUri>` → `<http://www.w3.org/ns/shacl#path>`
- `<http://sinopia.io/vocabulary/hasPropertyType> <.../propertyType/literal>` → `<http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#Literal>`
- `<http://sinopia.io/vocabulary/hasPropertyType> <.../propertyType/uri>` → `<http://www.w3.org/ns/shacl#nodeKind> <http://www.w3.org/ns/shacl#IRI>`
- `<http://sinopia.io/vocabulary/hasPropertyType> <.../propertyType/resource>` → (remove; add `sh:node` on the resource attributes node instead of `hasResourceTemplateId`)
- `<http://sinopia.io/vocabulary/hasPropertyAttribute> <.../propertyAttribute/required>` → `<http://www.w3.org/ns/shacl#minCount> "1"^^xsd:integer`
- `<http://sinopia.io/vocabulary/hasPropertyAttribute> <.../propertyAttribute/repeatable>` → (remove; absence of `sh:maxCount` means repeatable)
- Non-repeatable properties → `<http://www.w3.org/ns/shacl#maxCount> "1"^^xsd:integer`
- `<http://sinopia.io/vocabulary/hasDefault>` → `<http://www.w3.org/ns/shacl#defaultValue>`
- `<http://sinopia.io/vocabulary/hasValidationRegex>` → `<http://www.w3.org/ns/shacl#pattern>`
- `<http://sinopia.io/vocabulary/hasValidationDataType>` → `<http://www.w3.org/ns/shacl#datatype>`
- `rdf:type <.../PropertyTemplate>` → `rdf:type <http://www.w3.org/ns/shacl#PropertyShape>`
- `<http://sinopia.io/vocabulary/hasResourceTemplateId>` → `<http://www.w3.org/ns/shacl#node>`

**Predicates that stay unchanged in test RDF:**
- `sinopia:hasResourceId`, `sinopia:hasResourceTemplate`, `sinopia:hasAuthor`, `sinopia:hasDate`
- `sinopia:hasOptionalClass`, `sinopia:hasResourceAttribute`, `sinopia:resourceAttribute/suppressible`
- `sinopia:hasPropertyAttribute` for `ordered`, `immutable`, `suppressLanguage`
- `sinopia:hasRemarkUrl`, `sinopia:hasLiteralAttributes`, `sinopia:hasLookupAttributes`, `sinopia:hasUriAttributes`, `sinopia:hasResourceAttributes`
- `sinopia:hasLiteralPropertyAttributes`, `sinopia:literalPropertyAttribute/userIdDefault`, `sinopia:literalPropertyAttribute/dateDefault`
- `sinopia:hasAuthority`, `sinopia:hasUri`, `sinopia:hasUriAttribute`, `sinopia:uriAttribute/labelSuppressed`

- [ ] **Step 1: Convert "builds subjectTemplate" test RDF**

Replace the inline N3 string. Key changes:
- `rdf:type` object → `sh:NodeShape`
- `hasClass` → `sh:targetClass`
- `rdfs:label` on the template → `sh:name`
- `hasRemark` → `sh:description`
- `rdfs:label` on class URIs stays as `rdfs:label` (these are labels on the class resources themselves, not on the template)

```javascript
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
```

Expected output (`build.subjectTemplate(...)`) stays exactly the same.

- [ ] **Step 2: Convert "builds common property template properties" test RDF**

Key changes:
- Template-level: `rdf:type` → `sh:NodeShape`, `hasClass` → `sh:targetClass`, `rdfs:label` → `sh:name`
- Property ordering: remove `hasPropertyTemplate _:listNode` + `rdf:first/rest` linked list. Instead use `sh:property _:propNode` directly, and add `sh:order "0"^^<http://www.w3.org/2001/XMLSchema#integer>` on the property node
- Property node: `rdf:type` → `sh:PropertyShape`, `hasPropertyUri` → `sh:path`, `rdfs:label` → `sh:name`
- `hasPropertyType literal` → `sh:nodeKind sh:Literal`
- `hasPropertyAttribute required` → `sh:minCount "1"^^xsd:integer`
- `hasPropertyAttribute repeatable` → remove (absence of maxCount = repeatable)
- `hasPropertyAttribute ordered/immutable/suppressLanguage` → stay as sinopia
- `hasRemark` → `sh:description`
- `rdfs:label` on property URI resources stays as `rdfs:label`

```javascript
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
```

Expected output stays the same. Note: `repeatable: true` is now the default when `sh:maxCount` is absent.

- [ ] **Step 3: Convert "builds literal property template" test RDF**

Key changes same as above, plus:
- `hasLiteralAttributes` stays as sinopia
- `hasDefault` → `sh:defaultValue`
- `hasValidationRegex` → `sh:pattern`
- `hasValidationDataType` → `sh:datatype`
- `hasLiteralPropertyAttributes`, `userIdDefault`, `dateDefault` stay as sinopia

```javascript
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
```

- [ ] **Step 4: Convert "builds URI property template" test RDF**

Key changes:
- `hasPropertyType uri` → `sh:nodeKind sh:IRI`
- `hasUriAttributes` stays as sinopia
- `hasDefault` on the URI attributes node → `sh:defaultValue`
- `hasUriAttribute labelSuppressed` stays as sinopia

```javascript
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
```

- [ ] **Step 5: Convert "builds URI property template with legacy defaults" test RDF**

Same as URI template but with BlankNode defaults using `sinopia:hasUri` (stays as sinopia).

```javascript
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
```

- [ ] **Step 6: Convert "builds nested resource property template" test RDF**

Key changes:
- `hasPropertyType resource` → removed entirely (resource type is detected by presence of `sh:node`)
- `hasResourceTemplateId` → `sh:node`
- `hasResourceAttributes` stays as sinopia (it's the container node)

```javascript
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
```

- [ ] **Step 7: Convert "preserves full HTTPS URLs" test RDF**

Same pattern as nested resource but with HTTPS URL in `sh:node`.

```javascript
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
```

- [ ] **Step 8: Convert "builds lookup property template" test RDF**

Key changes:
- `hasPropertyType uri` → `sh:nodeKind sh:IRI`
- `hasLookupAttributes` stays as sinopia
- `hasAuthority` stays as sinopia
- `hasDefault` on lookup attrs → `sh:defaultValue`

```javascript
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
```

- [ ] **Step 9: Convert "builds distinct keys" test RDF**

Two property shapes sharing the same `sh:path` but differing in type. Uses `sh:property` with two direct references and `sh:order` 0 and 1.

```javascript
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
```

- [ ] **Step 10: Run tests to verify they all fail**

Run: `npx jest __tests__/TemplatesBuilder.test.js --verbose`

Expected: All 7 tests FAIL because TemplatesBuilder still parses sinopia predicates but the test RDF now uses SHACL predicates.

- [ ] **Step 11: Commit**

```bash
git add __tests__/TemplatesBuilder.test.js
git commit -m "test: convert TemplatesBuilder tests to SHACL RDF [t92]"
```

---

### Task 2: Update TemplatesBuilder to Parse SHACL

**Files:**
- Modify: `src/TemplatesBuilder.js`

**Interfaces:**
- Consumes: `rdf-ext` dataset with SHACL-vocabulary quads
- Produces: Same internal state shape (subjectTemplate + propertyTemplates) — no interface change

- [ ] **Step 1: Add SHACL namespace constant and update constructor**

At the top of the file, add the SHACL namespace. Update the constructor to detect `sh:NodeShape` instead of `sinopia:ResourceTemplate`.

```javascript
const SH = "http://www.w3.org/ns/shacl#"

// In constructor, change:
//   rdf.namedNode("http://sinopia.io/vocabulary/ResourceTemplate")
// to:
//   rdf.namedNode(`${SH}NodeShape`)
```

- [ ] **Step 2: Update `buildSubjectTemplate()`**

Replace predicate URIs:
- `hasClass` → `${SH}targetClass`
- `rdfsLabel` → `${SH}name` (for the template's own label)
- `hasRemark` → `${SH}description`

Keep unchanged: `hasResourceId`, `hasOptionalClass`, `hasAuthor`, `hasDate`, `hasResourceAttribute`, `resourceAttribute/suppressible`

Also update `buildClasses()`:
- The primary class lookup changes from `hasClass` to `${SH}targetClass`
- The `rdfs:label` lookups on class resource URIs stay as `rdfsLabel` (these are labels on external class resources, not template labels)

- [ ] **Step 3: Replace `buildPropertyTemplates()` and delete `buildList()`**

Replace the linked-list traversal with `sh:property` + `sh:order` sorting:

```javascript
buildPropertyTemplates() {
  const propertyTerms = this.objectsFor(this.resourceTerm, `${SH}property`)
  if (_.isEmpty(propertyTerms)) return

  // Sort by sh:order
  propertyTerms.sort((a, b) => {
    const orderA = parseInt(this.valueFor(a, `${SH}order`)) || 0
    const orderB = parseInt(this.valueFor(b, `${SH}order`)) || 0
    return orderA - orderB
  })

  propertyTerms.forEach((propertyTerm) =>
    this.buildPropertyTemplate(propertyTerm)
  )
}
```

Delete the `buildList()` method entirely.

- [ ] **Step 4: Replace `propertyTypeFor()` with SHACL constraint inspection**

Replace the substring extraction with constraint-based detection:

```javascript
propertyTypeFor(propertyTerm) {
  // Resource type: detected by presence of sh:node on the resource attributes node
  const resourceAttrTerm = this.objectFor(
    propertyTerm,
    "http://sinopia.io/vocabulary/hasResourceAttributes"
  )
  if (resourceAttrTerm) {
    const nodeRef = this.objectFor(resourceAttrTerm, `${SH}node`)
    if (nodeRef) return "resource"
  }

  // Check sh:nodeKind
  const nodeKind = this.valueFor(propertyTerm, `${SH}nodeKind`)
  if (nodeKind === `${SH}IRI`) return "uri"
  if (nodeKind === `${SH}Literal`) return "literal"

  // Fallback: presence of sh:datatype implies literal
  if (this.objectFor(propertyTerm, `${SH}datatype`)) return "literal"

  return "uri" // default fallback
}
```

- [ ] **Step 5: Update `newBasePropertyTemplate()`**

Replace predicate URIs:
- `hasPropertyUri` → `${SH}path`
- `rdfsLabel` (on property template) → `${SH}name`
- `hasRemark` → `${SH}description`
- `hasPropertyAttribute required` → check `sh:minCount >= 1`
- `hasPropertyAttribute repeatable` → check absence of `sh:maxCount 1` (invert logic)

Keep unchanged: `hasRemarkUrl`, `hasPropertyAttribute` for `ordered`/`immutable`/`languageSuppressed`

```javascript
// For required, replace the hasPropertyAttribute/required check with:
required: (() => {
  const minCount = this.valueFor(propertyTerm, `${SH}minCount`)
  return minCount !== null && parseInt(minCount) >= 1
})(),

// For repeatable, replace the hasPropertyAttribute/repeatable check with:
repeatable: (() => {
  const maxCount = this.valueFor(propertyTerm, `${SH}maxCount`)
  return maxCount === null || parseInt(maxCount) > 1
})(),
```

Note: The remaining `hasPropertyAttribute` values (`ordered`, `immutable`, `languageSuppressed`) still need to be read. Keep the `valuesFor(propertyTerm, "http://sinopia.io/vocabulary/hasPropertyAttribute")` call but only use it for these three sinopia extensions.

- [ ] **Step 6: Update literal-specific methods**

In `newLiteralPropertyTemplate()`:
- `hasLiteralAttributes` stays as sinopia
- `hasDefault` → `${SH}defaultValue` (in `defaultsForLiteral`)
- `hasLiteralPropertyAttributes`, `userIdDefault`, `dateDefault` stay as sinopia

In `validationRegexForLiteral()`:
- `hasLiteralAttributes` stays as sinopia
- `hasValidationRegex` → `${SH}pattern`

In `validationDataTypeForLiteral()`:
- `hasLiteralAttributes` stays as sinopia
- `hasValidationDataType` → `${SH}datatype`

In `defaultsForLiteral()`:
- `hasDefault` → `${SH}defaultValue`

- [ ] **Step 7: Update URI-specific methods**

In `newUriPropertyTemplate()`:
- `hasUriAttributes` stays as sinopia
- `hasUriAttribute` stays as sinopia
- `uriAttribute/labelSuppressed` stays as sinopia

In `defaultsForUri()`:
- `hasDefault` → `${SH}defaultValue`
- `rdfs:label` stays (this is on default value resources)
- `hasUri` stays as sinopia (legacy fallback)

- [ ] **Step 8: Update resource-specific methods**

In `newResourcePropertyTemplate()`:
- `hasResourceAttributes` stays as sinopia
- `hasResourceTemplateId` → `${SH}node`
- `hasDefault` → `${SH}defaultValue`

- [ ] **Step 9: Update lookup-specific methods**

In `newLookupPropertyTemplate()`:
- `hasLookupAttributes` stays as sinopia
- `hasDefault` → `${SH}defaultValue` (in `defaultsForUri`)
- `hasAuthority` stays as sinopia

The `buildPropertyTemplate()` dispatch still checks `hasLookupAttributes` the same way — this stays as sinopia.

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx jest __tests__/TemplatesBuilder.test.js --verbose`

Expected: All 7 tests PASS with the same expected outputs as before.

- [ ] **Step 11: Commit**

```bash
git add src/TemplatesBuilder.js
git commit -m "feat: replace sinopia vocabulary with SHACL in TemplatesBuilder [t92]"
```

---

### Task 3: Convert Template Fixtures and Static Templates

**Files:**
- Modify: All 42 files in `__tests__/__template_fixtures__/`
- Modify: All 6 files in `static/templates/`

**Interfaces:**
- Consumes: N/A (data files)
- Produces: JSON-LD fixtures using SHACL predicates; consumed by fixture-loading tests and the template editor

- [ ] **Step 1: Write a throwaway conversion script**

Create `scripts/convert-fixtures.mjs` (will not be committed). The script reads each JSON-LD fixture, applies the predicate mapping, and writes it back.

```javascript
import fs from "fs"
import path from "path"

const SINOPIA = "http://sinopia.io/vocabulary/"
const SH = "http://www.w3.org/ns/shacl#"
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
const RDFS = "http://www.w3.org/2000/01/rdf-schema#"
const XSD = "http://www.w3.org/2001/XMLSchema#"

function convertFixture(data) {
  return data.map((node) => {
    const converted = {}

    for (const [key, value] of Object.entries(node)) {
      const newKey = mapPredicate(key)
      const newValue = mapValue(key, value)
      converted[newKey] = newValue
    }

    return converted
  })
}

function mapPredicate(pred) {
  const map = {
    [`${SINOPIA}hasClass`]: `${SH}targetClass`,
    [`${SINOPIA}hasPropertyTemplate`]: `${SH}property`,
    [`${SINOPIA}hasPropertyUri`]: `${SH}path`,
    [`${SINOPIA}hasPropertyType`]: null, // removed, replaced by nodeKind/node
    [`${SINOPIA}hasDefault`]: `${SH}defaultValue`,
    [`${SINOPIA}hasValidationRegex`]: `${SH}pattern`,
    [`${SINOPIA}hasValidationDataType`]: `${SH}datatype`,
    [`${SINOPIA}hasRemark`]: `${SH}description`,
    [`${RDFS}label`]: null, // context-dependent, handled in mapValue
    [`${SINOPIA}hasResourceTemplateId`]: `${SH}node`,
  }
  // rdfs:label on templates/properties → sh:name
  // rdfs:label on class resources stays as rdfs:label
  // This requires node-type context — handle in convertFixture
  return map[pred] ?? pred
}

function mapValue(key, value) {
  // Map @type values
  if (key === "@type") {
    return value.map((t) => {
      if (t === `${SINOPIA}ResourceTemplate`) return `${SH}NodeShape`
      if (t === `${SINOPIA}PropertyTemplate`) return `${SH}PropertyShape`
      return t
    })
  }

  // Convert @list to direct array + add sh:order
  if (key === `${SINOPIA}hasPropertyTemplate` && Array.isArray(value)) {
    // Handle @list conversion — this needs special care per fixture
    return value
  }

  // Map property attribute values
  if (key === `${SINOPIA}hasPropertyAttribute`) {
    return convertPropertyAttributes(value)
  }

  return value
}

function convertPropertyAttributes(attrs) {
  // Filter out required and repeatable — they become sh:minCount/maxCount
  // Keep ordered, immutable, languageSuppressed
  return attrs.filter((attr) => {
    const id = attr["@id"]
    return (
      id !== `${SINOPIA}propertyAttribute/required` &&
      id !== `${SINOPIA}propertyAttribute/repeatable`
    )
  })
}

// Process directories
const dirs = [
  "__tests__/__template_fixtures__",
  "static/templates",
]

for (const dir of dirs) {
  const fullDir = path.resolve(dir)
  if (!fs.existsSync(fullDir)) continue
  for (const file of fs.readdirSync(fullDir)) {
    if (!file.endsWith(".json")) continue
    const filePath = path.join(fullDir, file)
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
    const converted = convertFixture(data)
    fs.writeFileSync(filePath, JSON.stringify(converted, null, 2) + "\n")
    console.log(`Converted: ${filePath}`)
  }
}
```

Note: This script is a starting point. The `@list` → `sh:property` + `sh:order` conversion and the context-dependent `rdfs:label` → `sh:name` mapping require fixture-specific logic. The script should be refined iteratively — run it, inspect the output, fix edge cases, re-run.

- [ ] **Step 2: Run the conversion script**

Run: `node scripts/convert-fixtures.mjs`

- [ ] **Step 3: Manually verify representative fixtures**

Open and inspect these fixtures to confirm correct conversion:
- `__tests__/__template_fixtures__/Immutable.json` — simple, one property
- `__tests__/__template_fixtures__/DiscogsLookup.json` — lookup with authorities
- `__tests__/__template_fixtures__/Instance.json` — complex, multiple properties
- `static/templates/rt_resource_template_doc.json` — meta-template

Check:
- `@type` arrays use `sh:NodeShape` / `sh:PropertyShape`
- `@list` replaced with direct `sh:property` references + `sh:order` integers
- `hasPropertyType` removed, `sh:nodeKind` or `sh:node` added
- `required` → `sh:minCount`, `repeatable` → absence of `sh:maxCount`
- `hasDefault` → `sh:defaultValue`, `hasValidationRegex` → `sh:pattern`, etc.
- Sinopia extensions unchanged

- [ ] **Step 4: Run the full test suite to check for fixture-dependent test failures**

Run: `npm test`

Fix any failures caused by fixture conversion issues. The TemplatesBuilder tests should pass (Task 2). Other tests that load fixtures via `fixtureLoaderHelper` may surface issues.

- [ ] **Step 5: Delete the conversion script**

```bash
rm scripts/convert-fixtures.mjs
```

- [ ] **Step 6: Commit**

```bash
git add __tests__/__template_fixtures__/ static/templates/
git commit -m "chore: convert template fixtures and static templates to SHACL [t92]"
```

---

### Task 4: Update Vocab.js

**Files:**
- Modify: `src/components/vocabulary/Vocab.js`

**Interfaces:**
- Consumes: N/A (documentation UI component)
- Produces: Updated vocabulary reference page

- [ ] **Step 1: Update the vocabulary dictionary**

Replace/remove/add entries:

```javascript
const vocabulary = {
  // === SHACL predicates (new) ===
  "sh:NodeShape": {
    description: "SHACL class for a resource template (replaces sinopia:ResourceTemplate)",
    url: "http://www.w3.org/ns/shacl#NodeShape",
  },
  "sh:PropertyShape": {
    description: "SHACL class for a property template (replaces sinopia:PropertyTemplate)",
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
    description: "Numeric ordering of property templates within a resource template",
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
```

**Removed entries** (replaced by SHACL equivalents):
- `hasClass` → `sh:targetClass`
- `hasPropertyTemplate` → `sh:property`
- `hasPropertyType` → `sh:nodeKind`
- `hasPropertyUri` → `sh:path`
- `hasRemark` → `sh:description`
- `hasDefault` → `sh:defaultValue`
- `hasValidationRegex` → `sh:pattern`
- `hasValidationDataType` → `sh:datatype`
- `hasPropertyAttribute` → `sh:minCount` / `sh:maxCount`
- `hasResourceTemplateId` → `sh:node`
- `PropertyTemplate` → `sh:PropertyShape`
- `ResourceTemplate` → `sh:NodeShape`
- `propertyAttribute/required` → `sh:minCount`
- `propertyAttribute/repeatable` → `sh:maxCount`
- `propertyType/literal`, `propertyType/resource`, `propertyType/uri` → `sh:nodeKind`

- [ ] **Step 2: Update the page heading**

Change "Sinopia Vocabulary" to "Template Vocabulary" and update the description paragraph:

```javascript
const header = <h2>Template Vocabulary</h2>
```

```jsx
<h1>Vocabulary</h1>
<p>
  Templates use SHACL (Shapes Constraint Language) predicates for standard
  template structure, supplemented by Sinopia extension predicates for
  domain-specific features.
</p>
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Fix any formatting issues.

- [ ] **Step 4: Commit**

```bash
git add src/components/vocabulary/Vocab.js
git commit -m "feat: update Vocab.js with SHACL terms, remove replaced sinopia entries [t92]"
```

---

### Task 5: Full Test Suite Verification and Cleanup

**Files:**
- Potentially modify: any files with test failures

**Interfaces:**
- Consumes: All prior task outputs
- Produces: Clean test suite, passing lint

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: All tests pass. If any fail, investigate — failures here are likely caused by:
1. Fixture conversion issues from Task 3
2. Tests that directly reference sinopia predicate URIs in assertions

- [ ] **Step 2: Fix any failing tests**

Address each failure. Common patterns:
- Tests that construct RDF with sinopia predicates inline (similar to TemplatesBuilder.test.js) need the same predicate swaps
- Tests that assert on fixture content may need updates if they check predicate URIs

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Fix any issues with: `npm run fix`

- [ ] **Step 4: Run full test suite one final time**

Run: `npm test`

Expected: All tests pass, zero warnings.

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining test failures from SHACL migration [t92]"
```

(Skip this step if no fixes were needed.)
