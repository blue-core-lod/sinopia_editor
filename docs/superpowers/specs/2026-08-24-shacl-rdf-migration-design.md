# Replace Sinopia Vocabulary with SHACL RDF in TemplatesBuilder

**Issue:** [#92](https://github.com/blue-core-lod/sinopia_editor/issues/92)
**Date:** 2026-08-24
**Status:** Approved

## Summary

Replace the custom `http://sinopia.io/vocabulary/` predicates used by `TemplatesBuilder.js` to parse RDF templates with standard [SHACL (Shapes Constraint Language)](https://www.w3.org/TR/shacl/) predicates. This makes templates portable, validatable with off-the-shelf tools, and easier to author.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `sinopia:hasResourceTemplate` on resources | Keep as-is | Resource-level metadata, not template structure |
| Custom extension namespace | Stay under `sinopia:` | May move to `bluecore:` in follow-up |
| Backward compatibility | Big-bang cutover | No dual-support; convert all fixtures/templates at once |
| Property ordering | `sh:order` integers | Replaces RDF linked-list traversal; idiomatic SHACL |
| SHACL validation on load | Deferred | Separate follow-up issue |

## Predicate Mapping

### Mapped to SHACL

| Current Sinopia predicate | SHACL replacement |
|---|---|
| `rdf:type sinopia:ResourceTemplate` | `rdf:type sh:NodeShape` |
| `sinopia:hasClass` | `sh:targetClass` |
| `sinopia:hasPropertyTemplate` (RDF list) | `sh:property` + `sh:order` on each property shape |
| `sinopia:hasPropertyUri` | `sh:path` |
| `sinopia:hasPropertyType literal` | `sh:nodeKind sh:Literal` |
| `sinopia:hasPropertyType uri` | `sh:nodeKind sh:IRI` |
| `sinopia:hasPropertyType resource` | `sh:node <ShapeRef>` |
| `sinopia:propertyAttribute/required` | `sh:minCount 1` |
| `sinopia:propertyAttribute/repeatable` | Absence of `sh:maxCount 1` |
| `sinopia:hasDefault` | `sh:defaultValue` |
| `sinopia:hasValidationRegex` | `sh:pattern` |
| `sinopia:hasValidationDataType` | `sh:datatype` |
| `sinopia:hasRemark` | `sh:description` |
| `rdfs:label` | `sh:name` |
| `sinopia:hasResourceTemplateId` | `sh:node <ShapeURI>` |
| `sinopia:ResourceTemplate` (class) | `sh:NodeShape` |
| `sinopia:PropertyTemplate` (class) | `sh:PropertyShape` |

### Remain as sinopia: Extensions

| Predicate | Reason |
|---|---|
| `sinopia:hasResourceId` | Template business key; no SHACL equivalent |
| `sinopia:hasOptionalClass` | Could use `sh:class` but keeping for clarity |
| `sinopia:hasAuthority` | Lookup authority config; domain-specific |
| `sinopia:propertyAttribute/immutable` | No SHACL equivalent |
| `sinopia:propertyAttribute/ordered` | "Values are ordered" flag (distinct from `sh:order` which orders property shapes) |
| `sinopia:propertyAttribute/languageSuppressed` | No SHACL equivalent |
| `sinopia:uriAttribute/labelSuppressed` | No SHACL equivalent |
| `sinopia:resourceAttribute/suppressible` | No SHACL equivalent |
| `sinopia:literalPropertyAttribute/userIdDefault` | Runtime injection; no SHACL equivalent |
| `sinopia:literalPropertyAttribute/dateDefault` | Runtime injection; no SHACL equivalent |
| `sinopia:hasRemarkUrl` / `hasRemarkUrlLabel` | No SHACL equivalent |
| `sinopia:hasAuthor` / `hasDate` | Provenance metadata |
| `sinopia:hasLiteralAttributes` / `hasUriAttributes` / `hasLookupAttributes` / `hasResourceAttributes` | Type-specific attribute container nodes |
| `sinopia:hasResourceTemplate` | Resource-level metadata (out of scope) |

## File-by-File Changes

### `src/TemplatesBuilder.js`

**Namespace constants** added at top of file:

```js
const SH = "http://www.w3.org/ns/shacl#"
```

**Constructor:** Type detection changes from `sinopia:ResourceTemplate` to `sh:NodeShape`.

**`buildSubjectTemplate()`:**
- `hasClass` -> `sh:targetClass`
- `rdfs:label` -> `sh:name`
- `hasRemark` -> `sh:description`
- `hasResourceId`, `hasOptionalClass`, `hasAuthor`, `hasDate`, `suppressible` stay as sinopia

**`buildPropertyTemplates()`** (biggest change):
- Currently finds `sinopia:hasPropertyTemplate` quad, calls `buildList()` to traverse `rdf:first`/`rdf:rest`
- New: find all `sh:property` quads from subject, read `sh:order` from each, sort numerically
- **`buildList()` is deleted**

**`propertyTypeFor()`** replaced with SHACL constraint inspection:
- `sh:node` present -> `"resource"`
- `sh:nodeKind sh:IRI` -> `"uri"`
- `sh:nodeKind sh:Literal` or `sh:datatype` present -> `"literal"`
- Lookup detection: type is `"uri"` and `sinopia:hasLookupAttributes` present -> lookup

**`newBasePropertyTemplate()`:**
- `hasPropertyUri` -> `sh:path`
- `rdfs:label` -> `sh:name`
- `hasPropertyAttribute` containing `required` -> check `sh:minCount >= 1`
- `hasPropertyAttribute` containing `repeatable` -> check absence of `sh:maxCount 1`
- `hasDefault` -> `sh:defaultValue`
- `hasRemark` -> `sh:description`
- Sinopia extensions (`ordered`, `immutable`, `languageSuppressed`, `hasRemarkUrl`) stay

**Type-specific methods:**
- `hasValidationRegex` -> `sh:pattern`
- `hasValidationDataType` -> `sh:datatype`
- `hasResourceTemplateId` -> `sh:node` shape references
- Attribute containers (`hasLiteralAttributes`, etc.) and `hasAuthority` stay as sinopia

### `src/GraphBuilder.js`

**No changes.** Serializes resources (not templates). Only sinopia predicate used is `hasResourceTemplate`, which stays.

### `src/components/vocabulary/Vocab.js`

- Replace vocabulary entries that now map to SHACL with their SHACL equivalents
- Keep entries for sinopia extensions
- Remove entries for concepts that no longer exist (`hasPropertyType`, `propertyType/*`, type-specific template classes)
- Update page heading from "Sinopia Vocabulary" to "Template Vocabulary"

### Test Fixtures (`__tests__/__template_fixtures__/`, 42 files)

Conversion per fixture:
1. `@type` changes: `ResourceTemplate` -> `sh:NodeShape`, `PropertyTemplate` -> `sh:PropertyShape`, remove type-specific classes
2. `@list` property template references -> `sh:property` array + `sh:order` integers on each shape
3. Predicate swaps per mapping table above
4. Sinopia extensions unchanged

Automated with a throwaway conversion script (not committed).

### Static Templates (`static/templates/`, 6 files)

Same conversion as test fixtures. These are meta-templates for the template editor; correctness is critical.

### Test Files

- `TemplatesBuilder.test.js`: assertions unchanged (they check internal state shape, which doesn't change). Fixture data changes but expected outputs are identical.
- `GraphBuilder.test.js`: no changes.
- `resourceBuilderUtils.js`: no changes.

## Out of Scope (Documented for Follow-up)

| File | Predicate | Notes |
|---|---|---|
| `src/GraphBuilder.js` | `sinopia:hasResourceTemplate` | Resource-level, stays |
| `src/actionCreators/resourceHelpers.js` | `sinopia:hasResourceTemplate` | Resource-level, stays |
| `src/utilities/Utilities.js` | `sinopia:hasResourceTemplate` | Resource-level, stays |
| `src/utilities/SinopiaApiHelper.js` | `sinopia:hasResourceId` | Reads template ID from API responses |
| `src/sinopiaSearch.js` | `hasAuthor`, `hasDate`, `hasResourceId`, `hasClass`, `hasRemark` | Reads template metadata from search results. Must be updated when API templates are migrated to SHACL — track as follow-up tied to API migration |
| `src/components/load/LoadByRDFForm.jsx` | `sinopia:hasResourceTemplate` | Embedded N3 example, resource-level |
| `src/reducers/resourceHelpers.js` | `sinopia:localAdminMetadataFor` | Unrelated to templates |

## Internal State Shape

The internal state shape produced by `TemplatesBuilder.build()` is **unchanged**. The `subjectTemplate` and `propertyTemplate` objects have identical fields before and after this migration. This means all downstream code (selectors, reducers, components) is completely unaffected.

## Risk

- **Low risk** to downstream code: internal state shape is preserved
- **Medium risk** in fixture conversion: 42 fixtures must be converted correctly. Automated script + manual verification of representative samples mitigates this
- **Coordination needed**: API-stored templates must be migrated before deploying the updated editor. This is the API-side migration step, not part of this PR
