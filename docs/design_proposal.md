# Sinopia Editor (Blue Core): Design Proposal

*Draft for discussion, November 6, 2026. Reviewed at `74996e8b` (`main` after #274).*

## Summary

The Blue Core fork of the Sinopia editor started as a proof of concept for editing arbitrary RDF through resource templates. It now edits BIBFRAME Works, Instances and resource templates against the Blue Core API, and catalogers are testing it on stage. The team describes it as fragile: bugs that were fixed come back.

This review finds that the fragility has a small number of structural causes rather than many unrelated mistakes:

1. **The RDF ↔ form translation has no ownership rule.** Every property template sees every object of its predicate, a node can be claimed by several fields, and triples the form doesn't model are kept as a detached N-Quads string with stale blank-node labels. Values duplicated into two fields, which double on every save (reproduced in a test; see D1), and silent data loss (#169, #240, #242) both follow from this.
2. **The API boundary is untyped and spread across three modules.** Errors are flattened into "Error parsing resource", the JSON-LD context is fetched from another domain on every load (#255), search options are silently dropped, and the resource URI doubles as the API URL.
3. **The same flow exists in more than one place.** There are two `loadResource` implementations, two copy paths, and six variants of "new subject from template". Fixing one leaves the other.
4. **Derived data is stored and maintained by hand.** Ancestor key lists and validation errors live in the store and are updated in every reducer. At least one helper updates them after the entity is already deleted.
5. **The tests are thorough but assert the wrong things.** Coverage is 93% of lines and all 842 tests pass, but no feature test checks what gets saved, RDF assertions are substring matches, and there is no corpus of real Blue Core records. The bug classes that recur are exactly the ones the tests can't see.

**Recommendation: a targeted rewrite of the core inside the existing application, not a new application.** Specifically:

- **Rewrite** the RDF ↔ model translation (load, save, copy) as pure, tested functions with an explicit ownership rule, and **rewrite** the API client as one typed module. These are where the recurring bugs live, and patching them has already produced special cases on top of special cases (`claimedLinks`, link release, the ancestor guard, the suppressible fallback).
- **Refactor incrementally** the store (to Redux Toolkit with derived data in selectors), the editor shell (to remove the global "current resource" so a side-by-side editor is possible), and the pages that the UX redesign replaces.
- **Keep** the property and input components, the resource template format, the template editor, and the secondary features (Load RDF, MARC import, exports, metrics, transfer, groups and permissions).

The same functions and tests also reduce the cost of the other options open for Sinopia's future (see **Relationship to the Blue Core Description Editor**). The work is planned in [design_plan.md](design_plan.md).

## Current state of the editor

### What it is

- **Stack:** React 19, Redux 5 with thunks and hand-written reducers (no Redux Toolkit), react-router 7, Bootstrap 5 (including its JavaScript), Radix dialogs, webpack 5, Jest 30, Express for serving and proxying. About 21,000 lines of source in `src/`.
- **Data model:** one normalized store in which `entities.subjects`, `entities.properties` and `entities.values` hold the form model, next to subject templates, property templates, lookups, languages, exports and groups in the same slice. UI flags (`show`, `showNav`, `changed`) are stored on the domain entities.
- **Loading** (`actionCreators/resourceHelpers.js`): fetch the resource with `?expand=true`, parse JSON-LD into an rdf-ext dataset, and walk the template tree. For each property template and each of its predicates, collect every matching object, match nested objects to nested templates by `rdf:type`, and merge in placeholders. Everything not consumed becomes `unusedRDF`, a canonical N-Quads string.
- **Saving** (`GraphBuilder.js`): rebuild the subject tree from the store, emit a new graph with freshly minted blank nodes, then merge `unusedRDF` back in before POST or PUT.
- **API access:** `sinopiaApi.js`, `sinopiaSearch.js` and `utilities/SinopiaApiHelper.js` each make their own `fetch` calls. The Keycloak instance is passed as an argument through every thunk.

### What works well

- The **property and input components** (`PanelProperty`, `PropertyComponent`, `editor/inputs/*`) are reasonably factored and encode a great deal of template behavior: lookups, literals with language and script, ordered values, nested resources, diacritics. That knowledge would be expensive to rediscover.
- The **framework layer is current.** A large upgrade in October 2026 brought React, Redux, react-router and Jest up to date. The framework is not what causes the bugs.
- **Test infrastructure exists and runs fast**: 134 suites in about 10 seconds in parallel, with no flaky tests in three runs. The problem is what the tests assert, which is cheaper to fix than missing infrastructure.

### Where bugs come from

Churn and bug history since May 2025 (343 commits, 49 bug-labelled issues) concentrate in a few places:

| Area | Evidence | Recurring bugs |
|---|---|---|
| RDF round trip (load/save) | `resourceHelpers.js` 17 commits, `GraphBuilder.js` 11, `TemplatesBuilder.js`; 27 commits since June 2026 across the three | #169, #180, #183, #240 → #268, #242, #266, #24, #52 |
| Template identity and versioning | 7 commits in 12 days that reverse each other (643f624f, b44622ea, 9159e13a, 8ac60f5c) | #41, #131, #254 |
| Copy | two copy paths that behave differently | #156, #236, #266, #272 |
| MARC import | the editor passes marc2bf output through unchanged | #155, #195, #217, #271 |
| Search | `sinopiaSearch.js` is the most-changed source file (27 commits) | #49, #61, #76, #89, #95, #269 |
| Config, deployment, auth | `Config.js` 23 commits, `webpack.config.js` 14, `Dockerfile` 8 | #23, #113, #117, #166, #213, #241 |

## Architectural review

Severity: **Critical** means it corrupts or loses data, or blocks users. **High** means it regularly causes bugs or blocks planned work. **Medium** means it adds cost or risk. **Low** is cleanup. File references are at `74996e8b`.

### Data model and RDF round trip

**D1. No exclusive ownership of RDF nodes. Critical.**
- *Evidence:* every property collects every object of its predicate (`actionCreators/resourceHelpers.js:330-361`, `:554-561`). `claimedLinks` deliberately lets a node be claimed more than once (`:107-111`, `:435-451`). Nested-template matching compares all of a template's classes, optional ones included, with all of a node's types (`:795-797`). Template validation allows templates to share an optional class (`templateValidationHelpers.js:174-191`).
- *Rationale:* when two fields share a predicate and a node carries a class from each field's nested template, the node appears in both fields.
  - **Where it happens on stage:** the stage Work profile has "Primary Contribution" (class `bf:PrimaryContribution`) and "Other creator(s)/contributor(s)" (class `bf:Contribution`), both on `bf:contribution`. MARC-converted data types a 100 field as `a bf:Contribution, bf:PrimaryContribution`, as on stage Work 4094d623.
  - **Why it doubles:** the loader keeps every `rdf:type` on the subject (`resourceHelpers.js:290`). Each field's copy is then written back as a new blank node with both types, so the next load matches both copies to both fields again.
  - **Reproduced** with the existing `testing:dupeProperties` fixture and a node typed `bf:Note, bf:TitleNote`: rounds of load-and-save give 1 → 2 → 4 values per field and 2 → 4 → 8 saved links, with no error and no unused RDF.
  - **Not yet seen on stage:** Work 4094d623 was saved once from Sinopia and still has one contribution. Either something in the real templates stops it, or the cataloger deleted the extra copy. Opening it in Sinopia will tell.
  - **Why the existing safeguards miss it:** two matching templates *inside* one field raise an error (`resolveAmbiguousChildRtIds`), but across fields nothing checks. Template validation (`templateValidationHelpers.js:165-191`) states that such fields "would duplicate the value into both fields". It only compares template classes with each other, so it passes templates whose classes differ but which the same data node can carry together, and it explicitly allows a shared optional class.
- *Fix:* one assignment pass per subject that gives each object to exactly one (property template, nested template) pair, ranked by specificity: required class beats optional class beats suppressible fallback. Objects left over stay unassigned and are preserved (D2). Use the same matching function in the loader and in the template validator so they can't disagree.

**D2. Unmodeled triples are kept as a detached string. Critical.**
- *Evidence:* `unusedRDF` is `dataset.difference(usedDataset).toCanonical()` (`actionCreators/resources.js:110-116`), with canonical blank-node labels. On save it is merged into a graph whose blank nodes are all new (`GraphBuilder.js:111`, `:205`; `sinopiaApi.js:333-338`).
- *Rationale:*
  - A partly modeled blank node (say a Title with one property the template doesn't cover) leaves that triple pointing at the old label. After save it's an orphan, shown as "unused" forever, and orphans accumulate.
  - A copy keeps the original's `unusedRDF`, so the new resource is POSTed with triples about the original's URI.
  - With `?expand=true`, the expanded sub-graphs of referenced resources count as "unused" and are written into this resource on save.
- *Fix:* attach unmodeled triples to the node they belong to, so the serializer writes them under that node's new term. Exclude triples not reachable from the root through owned links before deciding what is unused. Show unmodeled data read-only (the user's constraint: never drop data). Clear it on copy, or rewrite it to the new root.

**D3. `?expand=true` pulls other resources into the edit model. High.**
- *Evidence:* `sinopiaApi.js:51-53` always expands. A nested subject with its own URI is recursed into (`resourceHelpers.js:627-665`) and all of its triples are written back on save (`GraphBuilder.js:203-207`). The ancestor and cycle guard (`:115-119`, `:632-656`) exists only because of this.
- *Rationale:* saving an Instance writes a snapshot of its Work's or Agent's triples into the Instance document.
- *Fix:* treat named nodes outside the document as references (URI plus cached label). Keep expanded data in a read-only cache for labels and previews.

**D4. Literal datatypes and languages don't round-trip. High.**
- *Evidence:* the loader keeps only the value and language and drops the datatype (`resourceHelpers.js:850-854`, `utilities/valueFactory.js:25`). The serializer writes a datatype only from the template's `validationDataType` (`GraphBuilder.js:167-179`). Untagged literals get the default language added (`resourceHelpers.js:836-848`).
- *Rationale:* `"1999"^^edtf`, which marc2bf emits throughout, comes back as a plain string, and every load-and-save rewrites the data (#169).
- *Fix:* store the datatype on the value and write it back unchanged. Use the template only as the default for new values. Don't add a language to an existing literal.

**D5. Derived data is stored and maintained by hand, and one path gets it wrong. High.**
- *Evidence:* the ancestor lists (`descUriOrLiteralValueKeys`, `descWithErrorPropertyKeys`) and validation errors are computed inside reducers (`reducers/resourceHelpers.js:206-227`). `clearValueFromNewState` and `clearPropertyFromNewState` delete the entity and then try to update its ancestors, and the walkers return immediately because the entity is already gone (`:245-247`, `:261-263`, `:364-396`).
- *Rationale:* removing a nested subject leaves stale keys on its ancestors. `hasValidationErrors` can stay true while `selectValidationErrors` returns nothing (`selectors/errors.js:13-16`, `:37`), so Save is disabled with no visible error. This is consistent with the "save error with nothing flagged" report in #270.
- *Fix:* store only normalized entities and compute presence and errors with memoized selectors.

**D6. A selector mutates the store. High.**
- *Evidence:* `selectProperty` assigns `subjectTemplate` onto the live object returned by `selectNormSubject` (`selectors/resources.js:33-37`). That object then reaches the `_.isEqual` checks in `reducers/resourceHelpers.js:13-47`.
- *Fix:* return a new object. Redux Toolkit's immutability middleware catches this class of bug in development.

**D7. Copy drops nested resources, and a test pins the behavior. High.**
- *Evidence:* `newValueCopy` sets `valueSubject = null` (`resourceHelpers.js:1016-1035`), and `__tests__/actionCreators/resources.newResourceCopy.test.js:65-88` asserts this. Copy from state (`actionCreators/resources.js:315`) and copy by reloading as new (`hooks/useResource.js:55-69`) are different code paths.
- *Rationale:* reported by the reviewer from reading the code; not confirmed at runtime. Whatever the runtime effect, two copy paths with different semantics is how copy bugs (#156, #236, #272) keep returning.
- *Fix:* one copy routine: take the loaded RDF, rewrite the root to a new identity, clear or remap relationships according to an explicit rule, and load it like any other resource.

**D8. Smaller round-trip losses and additions. Medium.**
- Only the first `rdfs:label` of a URI is kept, but all are marked used, so the rest are lost on save (`resourceHelpers.js:867-879`).
- A suppressed URI value gets `<uri> a <templateClass>` written even if the source never typed it (`reducers/resources.js:168-169`, `GraphBuilder.js:217`).
- `addComponentListLabel` writes labels the cataloger never entered (`GraphBuilder.js:78-100`).
- `mergeValues` reorders values by template id, and `TemplatesBuilder.js:347` sorts `valueSubjectTemplateKeys` in place, which reorders what the profile author specified.
- Placeholders are added once per predicate rather than once per property, so a multi-predicate property can show duplicate empty nested forms (`resourceHelpers.js:330-344`, `:383-390`).

**D9. Template identity depends on how the template was requested. Medium.**
- *Evidence:* a subject template's key is the ref used to fetch it (`TemplatesBuilder.js:71`; `actionCreators/templates.js:96-111`, `:219`).
- *Rationale:* the same template fetched by id, by profile URI and by version URI becomes three entries. Comparisons on `subjectTemplateKey` (`mergeValues`, `selectSiblingValues`, `ResourceDiffer.js:75-79`, `:151`) then fail. This sits underneath the template versioning churn.
- *Fix:* key templates by canonical version IRI and keep an alias map from any ref to it. Write the `hasResourceTemplate` contract down with the API team and pin it with contract fixtures.

**D10. Duplicated logic. Medium.**
- Two `loadResource` implementations: `resourceHelpers.js:42-91` is dead and out of date; `resources.js:56-141` is live.
- The "difference → setUnusedRDF" sequence is copied four times.
- Six variants of "new subject from a template, wrapped in a value" (`expandProperty` twice, `valuesForExpandedProperty`, `templatePromisesFor`, `addSiblingValueSubject`, `resetValueSubject`), each handling defaults and the template-promise cache slightly differently.

**D11. Loading interleaves async template fetches with mutation of a shared object graph. Medium.**
- *Evidence:* the loader builds a tree of plain objects, mutates it in place (`property.values = …`), and fetches nested templates through a promise cache while it walks.
- *Rationale:* the order of operations depends on network timing, so the code is hard to reason about and hard to test synchronously.
- *Fix:* resolve the whole template tree first, then run a synchronous, pure `rdfToModel`.

### API, integration and UI shell

**A1. The JSON-LD context is fetched from another domain on every parse. Critical (root cause of #255).**
- *Evidence:* `datasetFromJsonld` creates `new JsonLdParser()` with no `documentLoader` (`utilities/Utilities.js:155-176`), so the parser fetches any context named by URL from the cataloger's browser.
- *Where the URL comes from:* not the editor. The URL is bibframe-json's context, served by GitHub Pages at bibframe-json.org. Two Blue Core components put it into the data:
  - bluecore-models frames stored records with it (`utils/graph.py`, `CONTEXT_URL = bibframe_json.CONTEXT_URL`), and the reframe DAG in bluecore-workflows (added 2026-09-12; "Keep the @context the reframe sweep is now meant to write", 2026-10-06) rewrites stored records into that compacted form.
  - bluecore_api serves a record's stored `@context` (`with_context` in `app/utils/jsonld.py`). Only records with no stored context get the API's own same-origin `<BLUECORE_URL>/api/context.jsonld`.

  Profiles come back expanded, with no context at all.
- *Why a failed fetch is fatal:* compacted JSON-LD is plain JSON with short keys (`"title"`, `"mainTitle"`, `"@type": ["Work"]`). Only the context says which IRI each key stands for and which values are IRIs, typed literals or language strings. Without it a JSON-LD processor can't produce a single triple, so it rightly fails rather than guessing.
- *The server is already protected:* bluecore-models resolves this URL from its installed package and refuses to fetch other contexts. The editor needs the same.
- *Fix:* bundle the context and supply a document loader that serves the bundled copy. Optionally ask the API to return expanded JSON-LD to the editor.

**A2. No single API client; errors are flattened. High.**
- *Evidence:* `fetchResource` reports every failure (network, 401, 404, JSON-LD) as "Error parsing resource" (`sinopiaApi.js:83-85`). `loadResource` adds "Error retrieving <uri>" (`actionCreators/resources.js:127`, `:137`). `checkResp` only reaches its fallback message because reading `errors[0].title` throws (`SinopiaApiHelper.js:23-31`). `fetchSearchResultsFromUrl` never checks `resp.ok` (`sinopiaSearch.js:124`). There is no timeout, no retry and no `AbortController` anywhere.
- *Fix:* one `apiClient` module with typed errors (network, auth, not found, conflict, validation, parse), `ok` checks, abort, a single retry for idempotent GETs, and errors that name what failed.

**A3. Token handling is inconsistent. Medium.**
- *Evidence:* only `sendResourceBody` refreshes the token (`sinopiaApi.js:131-144`). `putUserHistory`, `postMarc`, `postTransfer`, `detectLanguage` and `postUser` read `keycloak.token` directly. `loadUserData` calls `fetchUser(userId)` without the Keycloak instance (`actionCreators/user.js:11`), so a first-time user's 404 leads to a swallowed error.
- *Fix:* the client refreshes and injects the token for every authenticated request. Thunks stop taking `keycloak` as an argument.

**A4. The resource URI doubles as the API URL. Medium.**
- *Evidence:* `fetchResource(uri)`, PUT to `resource.uri`, `${uri}/versions` and `${uri}/relationships`. `postMarc` does `resourceUri.replace("resource", "marc")` (`sinopiaApi.js:215`), which is wrong for `/works/…` URIs. Templates on another host (the #255 profiles are on bluecore-dev while the resources are on stage) only produce a `console.warn`.
- *Fix:* one function that maps a resource IRI to an API endpoint and refuses writes to foreign hosts.

**A5. Search options are silently dropped. High.**
- *Evidence:* `resourceSearchUrl` sends only `q`, `limit` and `offset` (`sinopiaSearch.js:28-34`); type and group filters are commented out (`:52-84`) and sort is never sent. Class filters and facets work on the current page only (`selectors/search.js:26-36`, `actionCreators/search.js:14-37`). Lookups pass `typeFilter`, which is also dropped (`sinopiaSearch.js:410`).
- *Rationale:* "Sort by" does nothing, filtered pages look short or empty against an unfiltered total, and the Work's "has Instance" lookup returns Works and Hubs as well as Instances (part of #265).
- *Fix:* agree the search contract with the API team (filters, sort, facets) and send it, or remove the controls until it exists.

**A6. "Recent resources" relies on a function known to be broken. High.**
- *Evidence:* `getSearchResultsByUris` builds a request body it never sends and returns the first page of an unfiltered search; the code has a BUG comment (`sinopiaSearch.js:91-118`). User history (`actionCreators/history.js`) depends on it.
- *Rationale:* the dashboard's recent resources are wrong, and the redesigned resource chips and dashboard (#244, #248) need exactly this data.
- *Fix:* an API lookup by a list of URIs, or history entries that store label and class at the time they're recorded.

**A7. One full resource fetch per search hit. High.**
- *Evidence:* every Work, Instance or Item hit dispatches `loadSearchRelationships`, which is `fetchResource(?expand=true)` plus a JSON-LD parse (`actionCreators/search.js:68-74`, `actionCreators/relationships.js:41-53`). Failures only go to `console.warn`.
- *Fix:* have search hits carry relationship refs (`instanceOf`, `hasInstance`) with labels.

**A8. A global "current resource" is read throughout the editor. High (blocks the side-by-side editor).**
- *Evidence:* 16 components and hooks call `selectCurrentResourceKey`, including `SaveAndPublishButton`, `CloseButton`, `CopyToNewButton`, `PermissionsAction` and `UnusedRDFDisplay`. `resourceHasChangesSinceLastSave` falls back to it (`selectors/resources.js:133-136`). Modals are one global stack keyed by name.
- *Fix:* a `ResourceContext` (or explicit `resourceKey` prop) through the editor tree. Per-pane UI state lives in a `ui` slice keyed by view and resource.

**A9. UI state is stored on domain entities, and "dirty" disagrees with data. Medium.**
- *Evidence:* `show` and `showNav` sit on properties and subjects (`reducers/resources.js:38-53`). "Property not added" is `valueKeys === null`. `changed` is set on keydown (`hooks/useResourcHasChanged.js`) while values commit on blur (`InputLiteralValue.jsx:59-61`).
- *Rationale:* uncommitted text lives in component state, so moving focus between panes in a dual editor risks losing it, and the "unsaved changes" warning can be wrong.
- *Fix:* move view state into the `ui` slice and commit edits as they happen, debounced.

**A10. Routing is an effect that runs on every render. Medium.**
- *Evidence:* `App.jsx:76-150` depends on `canCreate`/`canEdit` closures that change every render, so `dispatch(authenticate(keycloak))` and the deep-link load re-run on every App render. Login works because of these incidental re-runs.
- *Fix:* route components (or react-router loaders) that load what the route needs. Authenticate once, driven by Keycloak events.

**A11. Deep-link reloads break configuration. High.**
- *Evidence:* `index.html:5` loads `env-config.js` by relative path. On `/sinopia/editor/resource/works/<id>` that resolves to a 404 (confirmed on stage), and `Config.js` getters then throw on `window._env_` (#241).
- *Fix:* use the absolute path `/sinopia/env-config.js` and guard `window._env_ ?? {}`. Add a browser smoke test that reloads a nested route.

**A12. No optimistic concurrency. Medium.**
- *Evidence:* PUT sends no `If-Match`, and the store isn't refreshed after save.
- *Rationale:* with a side-by-side editor and several catalogers working on stage, lost updates will be silent.
- *Fix:* `If-Match` / 412 handling in the client, coordinated with the API.

**A13. Effect and lifecycle bugs. Medium.**
- `RelationshipResults.jsx:37-73` keeps `isMounted` in state captured by a closure, so its unmount guard never fires.
- `HeaderSearch.jsx:36` returns `() => popover.hide` without calling it, leaking a Popover per mount.
- `useNavTarget.js` and `SearchFilter.jsx` disable `exhaustive-deps` to work around selectors that return new objects.
- Resource search has no stale-response guard, so an older page can overwrite a newer one.
- `Search.jsx:24` calls `useSearch()` without an error key, so paging errors are written under `undefined` and never shown.

**A14. Accessibility. Medium.**
- 15 `href="#"` anchors act as buttons or tabs.
- One clickable `div` has jsx-a11y disabled (`PanelProperty.jsx:44-46`).
- `id="dropdownMenuButton"` is repeated for every lookup value (`ResourceList.jsx:107`).
- Bootstrap's JavaScript dropdowns run outside React's control.
- Validation errors aren't tied to inputs with `aria-describedby`.
- The lookup input has no visible label.

### Tooling, tests and operations

**T1. Tests don't check what gets saved. Critical for regression risk.**
- *Evidence:* feature tests mock `postResource`/`putResource` and never assert on the payload (0 `toHaveBeenCalledWith` on save calls in `__tests__/feature`). The 43 RDF assertions use `toMatch(string)`, a substring check, so extra or duplicated triples pass. Fixtures are small synthetic records (largest 7 KB) and synthetic templates. Action-creator tests use the deprecated `redux-mock-store` and pin dispatched actions, so expected values get edited along with the code (`resources.newResourceFromDataset.test.js` changed in 23 commits).
- *Fix:* a golden corpus of real stage records with the real profiles they use, asserting load followed by save with no edits gives an isomorphic dataset, run twice to show the result is stable. Assert dataset equality. Assert on save payloads in feature tests. Test against a real store.

**T2. Test fixtures ship in the production bundle. High.**
- *Evidence:* `sinopiaApi.js:16` and `sinopiaSearch.js:8` import `__tests__/testUtilities/fixtureLoaderHelper` behind a runtime flag. The production build contains 74 `__tests__` modules (184 KB), and the Docker image has to copy `__tests__`.
- *Fix:* inject a fake API in tests. Remove the fixture branches from `src`.

**T3. Open proxies on the server. High.**
- *Evidence:* `app.js` forwards any POST under `/api/search/*` to `INDEX_URL` (Elasticsearch in docker-compose) with CORS open to any origin. Nothing in `src` calls this route. `/api/qa` is an open proxy to lookup.ld4l.org.
- *Fix:* delete `/api/search` and restrict `/api/qa` to the paths the app uses.

**T4. CI never builds or runs the app. High.**
- *Evidence:* `test.yml` runs lint and Jest only. Tests set `window._env_ = {}` and mock Keycloak, so configuration, routing and auth regressions (#241, #23) can't surface.
- *Fix:* build the bundle in CI and run one Playwright smoke test against it: deep-link reload, login, open, save, reopen.

**T5. Production image and server. Medium.**
- `npm start` runs `babel-node`, which Babel says is not for production.
- The single-stage Dockerfile uses `npm install` rather than `npm ci`, ships devDependencies and runs as root.
- Images are only tagged `:latest`.
- Node is pinned to the exact patch 24.4.0.
- The weekly dependency workflow opens PRs with `GITHUB_TOKEN`, so the PR checks don't run on them.

**T6. The RDF libraries are the most outdated and most entangled dependencies. Medium.**
- *Evidence:* rdf-ext 1.3.5 (current 2.x), n3 1.26 with a deep import of `n3/lib/N3Parser`, jsonld-streaming-parser 2.4 (current 5.x), with jsonld.js for serializing. Parse and serialize use different JSON-LD implementations. #240 (the non-filing "0" dropped) was patched with a shim rather than at the source.
- *Fix:* one RDF/JS stack behind one module, chosen as part of the new core.

**T7. Leftovers from earlier upgrades. Low.**
- Node polyfills (`crypto`, `vm`, `stream`, `buffer`) bring in crypto-browserify, which is responsible for all four production `npm audit` findings.
- A dozen dependencies have no imports.
- 112 `propTypes` declarations do nothing under React 19, and `prop-types` isn't declared in `package.json`.
- The bundle is 3.1 MB with no content hash, and an 11.7 MB source map is served publicly.

## Current bugs: causes and how this design addresses them

| Bug | Root cause (confidence) | Short-term fix | Addressed structurally by |
|---|---|---|---|
| **#255** API retrieval errors for one tester | The editor fetches the JSON-LD context from `bibframe-json.org` in the user's browser. The tester's screenshot shows "Failed to load remote context … Failed to fetch". The domain was registered on 2026-10-03, and institutional filters often block newly registered domains, which explains why only this user is affected. Search works because hits aren't parsed as JSON-LD. (High on mechanism, medium on why only this user.) | Bundle the context with a custom document loader. Say "could not load JSON-LD context" in the error. Ask the tester to open the context URL to confirm. | A1, A2: the editor resolves known contexts locally, as the server does, and errors name what failed. |
| **#266** Copying an Instance or importing MARC duplicates Publication Information | **The data, not the loader.** The source Instance in the report (32fa956d) has two `bf:Publication` nodes. The second holds every value of the first plus `bf:date "2026"^^edtf` and `bf:place countries/cc`, which look like 008 data. The record has a single version, created by the MARC import (`derivedFrom <http://example.org/in00001487459#Instance>`, the same symptom as #271). The editor posts the converted RDF unchanged, so the copy and the editor faithfully show both. The editor's cross-field duplication (D1) doesn't apply here: the stage Instance profile's four provision-activity templates have disjoint classes. (High that the duplicate arrived with the import; not checked whether marc2bibframe2 emits two nodes or the API merges them.) | Find whether marc2bibframe2 emits a separate 008 Publication node, and merge it into the 264 node on import (API or converter), or have the Load RDF page show the duplicate before submit. Fix the existing stage records separately. | Import goes through `rdfToModel`, so the cataloger reviews converted data in the form before saving (Phase 3). A policy row decides whether the editor ever merges look-alike nodes. |
| **#254** Nested template labels missing in the template editor, and the long "not editable" list | The template editor shows a nested template's label only from `<ref> rdfs:label` in the fetched data; it never resolves the referenced template. When the ref is a legacy literal id, or the label's subject IRI differs from the ref (profile vs version URI, or proxy vs public host), the label is missing, and the unconsumed triples appear as "Some triples are not editable with this template". The data remediation on stage fits this. (Medium.) Latent risk: saving merges those triples back into the template (D2). | Close, since the data is remediated. Add a test that resolves labels across profile and version URIs. | D9 (canonical template identity with aliases), D2 (unmodeled data attached to its node, never merged back blindly), D3. |
| **#271** MARC import gives `example.org` URIs and `bf:derivedFrom <http://example.org/…#Work>` | The editor sends MARC to `/marc2bibframe` with no `baseuri` and posts the result unchanged (`LoadByRDFForm.jsx:69-117`, `:148-188`). `http://example.org/{001}#Work` is marc2bibframe2's default base. The API mints a new root and records `derivedFrom` from the placeholder subject, leaving the other example.org URIs in place. (High that the fix is mostly server-side.) | API ticket: pass a real `baseuri`, or replace example.org IRIs with blank nodes before minting, and don't record `derivedFrom` for placeholder bases. Editor: send `baseuri`. | The import flow loads converted RDF through the same `rdfToModel` as any resource, so the cataloger reviews it in the form before it's saved, instead of it being posted blind. |
| **#269** Search can't go to page 2 | Fixed in `fe6ce954` (Oct 22), the day after the report. The old pager followed API `links.next`, which was sometimes missing. The "resolved by #76" comment points at the wrong change. Related problems remain: paging errors are invisible (A13) and client-side filtering is measured against an unfiltered total (A5). (High that it's fixed.) | Verify on stage and close, citing fe6ce954. Fix the missing error key. | A2, A5, A13. |
| **#265** Can't link an existing Instance from the Work | A lookup exists on the Work's `hasInstance`, but it's an unlabeled box next to a "Create New" button. Its type filter is dropped, so it returns Works first. "Create New" makes an orphaned Instance without setting `instanceOf` or `hasInstance`. An unsaved Work has no URI to link to. Copy clears `instanceOf` and collapses the field. Inverse links are never shown. (Medium-high.) | Label the lookup, send the type filter, and keep `instanceOf` when deriving an Instance by copy. | A dedicated Work/Instance relationship control (Phase 5 of the plan), with the API deriving `hasInstance` from `instanceOf`. |

## Goals, non-goals and anti-goals

**Goals**

- **Saving a description without edits doesn't change it.** For every record in the golden corpus, load then save gives an isomorphic dataset, and doing it twice gives the same result.
- **Every triple has one owner.** Each node in a resource belongs to exactly one field, or is preserved as unmodeled data attached to its parent.
- **One implementation of each flow:** load, save, copy, import and template resolution.
- **Errors say what failed and what to do about it.**
- **The editor shell supports more than one resource on screen**, which the side-by-side Work and Instance editor (#249) needs.
- **The UX redesign (#244–#250) is buildable** without fighting the store.
- **The recurring bug classes become tests that fail**, not tickets.

**Non-goals**

- Replacing resource templates with schema-driven forms. Templates keep driving forms (constraint).
- Moving the template editor out of Sinopia (constraint).
- Generic RDF editing beyond BIBFRAME Works, Instances, Hubs (as references) and resource templates.
- Live collaboration, batch editing, authority promotion, Wikidata publishing. These belong to the Blue Core Description Editor design and are out of scope here.
- Fixing data already on stage. The bluecore-models refactor and a separate stage decision cover that.

**Anti-goals** (failure even if it technically works)

- A rewrite that runs for months alongside the current editor with no cataloger-visible improvement.
- A new data layer that quietly changes what gets saved without a cataloger-readable statement of what changed.
- Dropping triples the form doesn't model.
- A redesign that looks new but still edits one resource at a time through a global singleton.

## Refactor or rewrite: the decision

Three options were considered.

| Option | What it means | Assessment |
|---|---|---|
| **A. Incremental refactor only** | Keep the loader and serializer and fix bugs inside them. Tidy the store and API around them. | Doesn't remove the causes. D1 and D2 are design properties: every recent fix (`claimedLinks`, link release, the ancestor guard, the suppressible fallback) added a special case, and some tests now pin bugs in place. Expect the same churn. |
| **B. Full rewrite as a new application** | A new codebase, possibly a new framework, reaching feature parity with Sinopia: templates, template editor, Load RDF, MARC, exports, metrics, transfer, groups. | Large parity surface with nothing for catalogers until the end. The property and input components encode template behavior that works. A rewrite would rebuild the untested API boundary on the same unwritten contract. It also competes with the Blue Core Description Editor for the same team. |
| **C. Targeted rewrite of the core, inside the existing app** *(recommended)* | Rewrite the RDF ↔ model translation and the API client as new modules, checked against the old ones with a differential harness and a golden corpus, then switched over. Refactor the store and shell incrementally. Rebuild the pages the redesign replaces. | Puts the rewrite effort where the bugs are. Keeps working components. Every phase ships, and the redesign lands on a shell that supports it. |

**Why C:**

- **The bugs concentrate in about 3,000 lines.** `resourceHelpers.js`, `GraphBuilder.js`, `TemplatesBuilder.js`, the reducers' helpers, and the three API modules account for most fix commits and most open data bugs. The rest of the app is ordinary React that a refactor can handle.
- **The new core can be checked against the old one.** Pure `rdfToModel` and `modelToRdf` functions can run beside the current loader on the same corpus. Their differences are a list of today's behaviors to mark as *chosen* (keep) or *inherited* (accidental), the same method the bluecore-models refactor (#213) uses. That makes the switch safe and reviewable.
- **Each phase leaves the editor shippable.** The plan delivers bug fixes in the first weeks and redesigned pages before the end.
- **It keeps the future open** (see the next section).

**Framework:** stay on React. Changing frameworks (for example to Vue, as Marva uses) was allowed but isn't justified: none of the recurring bugs come from React, the framework layer was just upgraded, and a framework change turns option C into option B. Redux stays, through Redux Toolkit; an `ui` slice and `ResourceContext` solve the state problems without replacing the store library.

**TypeScript:** new core modules are written in TypeScript from the start, compiled by Babel's TypeScript preset and checked with `tsc --noEmit` in CI. This needs no bundler change. The typed state shapes and template models are where wrong assumptions hide today. Existing JavaScript isn't converted except where a phase rewrites it.

## Target architecture

```
            ┌──────────────────────── UI ─────────────────────────┐
            │  Pages (layout route: Blue Core header/footer)      │
            │  Editor shell: panes, each with a ResourceContext   │
            │  Property & input components (kept, mostly as-is)   │
            └───────────────┬──────────────────────┬──────────────┘
                            │ selectors / actions  │ ui slice (per view+resource)
            ┌───────────────▼──────────────────────▼──────────────┐
            │  Store (Redux Toolkit): entity adapters for         │
            │  subjects / properties / values; templates; search; │
            │  derived data via memoized selectors only           │
            └───────────────┬─────────────────────────────────────┘
                            │ model in / model out
            ┌───────────────▼─────────────────────────────────────┐
            │  Core (pure, typed, synchronous)                     │
            │  resolveTemplates → rdfToModel → model → modelToRdf │
            │  assignment rule · unmodeled data on nodes ·        │
            │  copy = clone + reload · canonical template IRIs    │
            └───────────────┬─────────────────────────────────────┘
                            │ datasets
            ┌───────────────▼─────────────────────────────────────┐
            │  rdf module: one RDF/JS stack, one JSON-LD pair,    │
            │  bundled contexts (no remote fetch)                 │
            ├─────────────────────────────────────────────────────┤
            │  apiClient: typed errors, token injection, abort,   │
            │  IRI→endpoint mapping, If-Match, contract fixtures  │
            └─────────────────────────────────────────────────────┘
```

### The core

- **`resolveTemplates(rootTemplateRef)`** fetches the template tree up front and returns templates keyed by canonical version IRI, with an alias map from any ref. It's the only async step.
- **`rdfToModel(dataset, rootIri, templates)`** is pure and synchronous.
  - It assigns each object to exactly one field by the ranking in D1.
  - It keeps datatypes, language tags, every label, and the original order.
  - Triples it doesn't model are attached to the node they belong to.
  - Named nodes outside the document become references.
  - Returns the model plus an assignment report (which triples went where, and what is unmodeled) that tests and the "not editable" panel both use.
- **`modelToRdf(model)`** is the exact inverse. Blank-node identity comes from client-side node keys (UUIDs) that are dropped on output, so unmodeled data rejoins its node.
- **`copyResource(dataset, rootIri, rule)`** rewrites the root and applies an explicit relationship rule. For example, "deriving an Instance keeps `instanceOf`; copying a Work clears `hasInstance`". The result goes through `rdfToModel` like any load.
- **The load and save policy as a table.** Following the bluecore-models #213 pattern, today's load and save behavior is written down as a table of cases, each marked *chosen* or *inherited*. Examples: "a node typed both ProvisionActivity and Publication is shown in…", "an untagged literal gets…", "a second rdfs:label is…". The table runs as tests against the new core, and a plain-language version is published for catalogers. Changing a row is a separate, reviewed decision.

### The store

- Redux Toolkit `configureStore` with immutability and serializability checks in development.
- `createEntityAdapter` for subjects, properties and values.
- No stored derived data: presence, ancestors and errors come from memoized selectors.
- A `ui` slice keyed by view and resource for expansion, collapse, order preferences and modals.
- RTK Query, or a thin cache over `apiClient`, for search, history and templates, so requests are de-duplicated and cancelled.

### The shell

- Route components (or react-router loaders) instead of the imperative routing effect.
- A layout route for the Blue Core header and footer.
- Each editor pane is wrapped in a `ResourceContext`. Nothing reads a global current resource.
- Text inputs commit to the store as you type (debounced), so "unsaved changes" is always accurate and switching panes can't lose text.

### The API boundary

- One `apiClient` module with typed errors, token refresh and injection, abort and timeout, one retry for idempotent reads, IRI-to-endpoint mapping that refuses foreign hosts for writes, `If-Match` on PUT, and `problem+json` errors when the API offers them.
- Contract fixtures recorded from real API responses for resources (with and without expansion), profiles (with and without `version_uri`), search pages and user history. Each fixture is checked against the client's types.

### Requested API changes

These are coordinated tickets in the API repo. The editor works with the current API until each lands.

| Change | Needed for | Priority |
|---|---|---|
| Search filters, sort and facets honored server-side | A5, #245 | High |
| Search hits include relationship refs with labels, and all of the hit's types with labels | A7, #245, #249 | High |
| Inverse relationships for a resource (the Instances of a Work), for the left nav | #248, #265 | High |
| Template version in template search results | #244 | Low |
| Per-user view preferences (for example property order in the resource editor) | #248 | Low (the browser can store them until then) |
| Look up resources by a list of URIs | A6, #244, #248 | High |
| `hasInstance` derived server-side from `instanceOf` | #265, #249 | High |
| `If-Match` / ETag and 412 on PUT | A12, #249 | Medium |
| `problem+json` errors with paths that map to fields | A2 | Medium |
| MARC import: real `baseuri`, placeholder IRIs replaced, no `derivedFrom` for placeholders | #271 | High |
| Per-user pinned templates | #246 | Medium |
| Either expanded JSON-LD for the editor, or a same-origin context | A1 (the bundled context covers it until then) | Low |
| Optionally, mint an IRI before the first save (`POST` returns a reserved IRI, or the client mints and the API accepts it) | linking an unsaved Work and Instance in #249 and #265 | Decision needed |

## UI/UX redesign

The redesign issues (#244, #245, #246, #248, #249, #250) and their Figma mockups (BLUE-CORE file, nodes 14-2022, 42-4230, 42-4398, 268-1510, 293-3198, 488-5328) describe a shared Blue Core header and footer, a persistent Sinopia menu with search, and new dashboard, search results, templates, resource editor, side-by-side Work and Instance editor, and template editor pages. This section is based on the issue text and a review of all six Figma frames (November 6, 2026).

### What the mockups show beyond the issue text

**Every page**
- The header carries Help (a dropdown), Contact, Switch applications and Logout.
- The Sinopia menu has Dashboard, Editor, Resource templates and Actions, plus a search box with a scope dropdown ("BIBFRAME - All").
- The footer links to Search, Marva, Sinopia, Graph Toolbox, API, Keycloak and Workflows.
- Action icons are icon-only (create, view, edit, copy, pin). Testers already called icon-only actions cryptic (#270), so they need text labels or at least accessible names and tooltips.

**Dashboard (14-2022)**
- *Recent templates* has a **Version** column the issue doesn't mention.
- *Recent searches* has **Authority** and **Query** columns with a re-run action.
- *Recent resources* has **Label, Class, Group** columns. The mockup's label cell shows a URI and its Group cell shows a date, so the intended content of those columns needs confirming. Either way, a real label and class need the by-URI lookup (A6).

**Search results (42-4230)**
- Numbered pagination (1 … 10, Previous/Next) at the top and bottom, a "Sort by relevance" checkbox, and a Filter dropdown.
- The Class column lists **several class labels per hit** (Monograph, Work, Text), so search hits must carry all of their types with labels.
- "Relationships" expands in place to rows such as "Instance: A stone is a story", each with its own view and copy actions. That needs relationship refs with labels in the search hit (A7).

**Resource templates (42-4398)**
- A *Pinned resource templates* section above a dedicated template search, using the same table.
- Columns: Label (with the template id under it), Resource URI, Author, Date, Guiding statement and Actions (create, view, edit, copy, pin).
- The "Resource URI" column shows the template's class (for example `bf:Relation`), so "Class" may be the better heading.

**Resource editor (268-1510)**
- *Recently opened* chips have a type icon (W green circle, I magenta diamond, RT blue square), a truncated main title, a close ×, and arrows to scroll.
- The entity header shows the type icon and label, view and copy icons, a **Work / Work and Instance** toggle, "View triples not editable with this template", and the URI with a copy button.
- **Left nav:**
  - presence dots for properties that have values;
  - a bar marking the current section;
  - **Instances** and **Versions** sections at the bottom.

  An Instances list on a Work needs inverse relationships from the API, the same `hasInstance` derivation as #265.
- **Every top-level property is a shaded, collapsible section with delete and ↑ ↓ controls.** Nested resources keep today's layout: optional-class checkboxes, URI and label pairs, "+ Add another …", and the ScriptShifter button on each literal.

**Work and Instance side by side (293-3198)**
- Two full editors at half width each, with the left nav hidden.
- **Each pane is fully editable.** Each has its own header, toggle, "not editable" link and URI.
- "Copy Work to Instance >>" and "<< Copy Instance to Work" buttons sit above the panes.
- The Instance pane opens with a class picker ("Other classes: Print, Archival, Electronic"). The Work pane ends with *has Instance*, and the Instance pane starts with *Instance of*.
- **The mockup doesn't show where Save, Close or the save status go** for two resources at once.

**Template editor (488-5328)**
- The same chips, a blue "RT" header, and a left nav of the template's own fields (Template ID, Class, Optional classes, Template label, Author, Remark, Date, Resource attributes, Property templates, Versions).
- Collapsible, shaded sections with delete and ↑ ↓. "+ Add another property template" sits in the Property templates header.
- Within a property template, fields such as Property type, Literal, URI and Lookup attributes, and Resource template IDs are collapsible sub-sections.

### What this means for the design

- **↑ ↓ means two different things.** In the template editor it reorders property templates, which is a real change to the template and is saved; the template already stores its property templates in order. In the resource editor it reorders top-level properties of a description. RDF properties have no order, and changing the template from inside a description would affect every cataloger. **Recommendation:** in the resource editor, ↑ ↓ is a per-cataloger view preference, stored with the user's settings (in the API if possible, otherwise in the browser) and never written to the description or the template. This settles the open question from the issues; it needs confirming with the designer.
- **Per-property delete at the top level** maps onto today's "remove property" action. In the new store it clears the property's values. It doesn't touch the template.
- **The side-by-side view needs the form to work at half width.** Today's property layout uses fixed Bootstrap column widths, and the mockup's inputs at roughly 650 px wide are close to the limit for long titles and nested agents. The property components need container-relative layout (CSS container queries or flex) before they can sit in a pane. This is a small, contained change to the kept components.
- **Saving two resources at once has to be designed.** The plan proposes per-pane save buttons plus a combined "Save both", with per-resource status ("Work saved, Instance not saved; retry"). That needs the designer's sign-off before Phase 5.
- **"Copy Work to Instance" by exact property match** is feasible in the core (Phase 5) once copy is "clone, then load". The mockup doesn't show feedback, so the plan adds a preview of what will be copied.
- **No mockup needs a different framework.** Everything shown is collapsible sections, chips, tables, toggles and dropdowns. Building them on the Radix primitives the app already uses, rather than Bootstrap's JavaScript, also fixes the keyboard and focus problems in A14.
- **New API needs from the mockups:**
  - all class labels on search hits;
  - inverse relationships (Instances of a Work) for the left nav;
  - the template version for the dashboard;
  - per-user view preferences, if reordering is kept per cataloger.

  These are added to **Requested API changes**.

| Design item | Difficulty in the current code | Why | What makes it possible |
|---|---|---|---|
| Blue Core header and footer, persistent menu | Easy–medium | Every page renders its own `<Header>`, which mixes search, session and navigation (`connect`-based). | Layout route in the shell (Phase 6). |
| Color-coded recent resource chips replacing tabs (W green, I red, RT blue) | Medium | Open resources already exist (`ResourcesNav`), but "recently opened" depends on the broken by-URI lookup (A6), and the type comes from one template class per template. | By-URI lookup or history that stores labels; type normalized to Work/Instance/Hub/Template in the model. |
| Collapsible left nav, fixed while scrolling | Easy–medium | Width is hard-coded Bootstrap columns; expansion is stored on entities (A9). | `ui` slice. |
| Collapsible property sections, up/down reordering | Medium–hard | Collapse state would join the flags on entities. Property order is template order. | `ui` slice for collapse. In the resource editor, ↑ ↓ is a per-cataloger view preference; in the template editor it reorders the template's property templates. |
| Left nav with presence dots and Instances / Versions sections | Medium | Presence comes from the hand-maintained ancestor keys (D5). There's no inverse-relationship data for an Instances list. | Presence from selectors (Phase 4); inverse relationships from the API. |
| Forms at half width for the side-by-side view | Medium | Fixed Bootstrap column widths in the property components. | Container-relative layout in the kept components. |
| Unused triples collapsed under "View triples not editable in this template" | Easy once D2 is fixed | Today's list is noisy because it includes expanded sub-graphs and orphaned blank-node triples. | Assignment report from `rdfToModel`. |
| **Side-by-side Work and Instance editor** with copy between them (#249) | **Hard; the biggest blocker** | Global current resource (A8), one modal stack, commit-on-blur (A9), copy that drops nested resources (D7), and no IRI before first save. | `ResourceContext` and `ui` slice (Phase 4); copy-by-property-match in the core; relationship control and IRI decision (Phase 5). |
| Search results table: sortable columns, several class labels per hit, relationships expanding in place, numbered pages (#245) | UI medium, data hard | Sort and filters are not sent (A5), relationships come from one fetch per hit (A7), and hits don't carry all their types with labels. | API search contract changes first. |
| Templates page with pinned templates per user (#246) | Medium | User history exists but there's no pin type. Template lookup by id searches and filters client-side. | Pinned templates in the API; `apiClient` token handling. |
| Dashboard: recent templates, searches, resources (#244) | Medium | Depends on A6. | Same as chips. |
| Template editor redesign (#250) | Medium | Same shell and collapse needs as the resource editor; nested template labels (#254). | Phases 4 and 6, D9. |

Nothing in the mockups needs a different framework. The side-by-side editor is the one design that the current architecture can't support without the shell changes in this proposal. Building it first, on today's shell, would multiply the singleton problem.

**Tester feedback to fold in** (#270): built-in diacritics, typeahead for the ScriptShifter list, labeled action buttons instead of icon-only ones, a visible "Saved" confirmation, save errors that point at a field (D5), human-readable property help instead of raw RDF, and clearer wording in the copy flow (the Save button after picking a template, and the two "_Instance" tabs).

## Relationship to the Blue Core Description Editor

The Blue Core Description Editor proposal (edsu/bluecore-editor, `docs/design.md`) is a separate, schema-driven editor built on bibframe-json, with a single description view across Work and Instance. **How Sinopia relates to it is undecided.** This proposal doesn't depend on that decision, and the core it builds keeps the main options cheaper:

| Option | What this proposal contributes |
|---|---|
| **Sinopia stays a template-driven sibling** | A reliable template editor and template-driven cataloging with lossless round trips. |
| **Sinopia converges toward the description editor's model** | The core uses the same ideas the description editor relies on: client-side node keys with UUIDs, edits that could become a patch log, separate writes per resource, contexts bundled with no remote fetch, `If-Match`, `problem+json`. A later move to bibframe-json as the model would replace `rdfToModel`, not the shell. |
| **Sinopia is eventually replaced** | The golden corpus, contract fixtures and load/save policy table carry over to any successor, and catalogers get a stable editor in the meantime. |

Ideas borrowed from the description editor design regardless of the decision:
- never drop data it doesn't model;
- "Work saved, Instance not saved; retry" save states;
- scope prompts when a shared Work is edited;
- errors and warnings that never block saving a draft.

## Constraints

Agreed in discussion:

- **Resource templates keep driving forms, and the template editor stays in Sinopia.** Existing templates keep working without migration.
- **BIBFRAME only, keep data.** The editor targets BIBFRAME Works, Instances and resource templates. Triples it doesn't model are preserved and shown read-only, never dropped.
- **These features stay:** Load RDF and MARC import, exports and metrics, transfer to the ILS, groups and permissions.
- **API changes are allowed when coordinated:** each is a ticket in the API repo, and the editor works against the current API until it lands.
- **A framework change is allowed but must be justified.** This proposal recommends staying on React.
- **Team:** 2–3 developers, mostly dedicated.

## Open questions and risks

- **Sinopia's long-term relationship to the Blue Core Description Editor** (above).
- **Minting IRIs before first save.** Linking an unsaved Work and Instance needs an IRI. The options are "save first, automatically" (no API change, but creates drafts on the server), a reservation endpoint, or client-minted IRIs the API accepts. This needs a decision with the API team before Phase 5.
- **What ↑ ↓ means in the resource editor.** The recommendation is a per-cataloger view preference (see UI/UX redesign). It needs confirming with the designer, along with where it's stored.
- **Saving in the side-by-side view.** The mockup shows no Save, Close or status. The proposal is per-pane save plus "Save both", with per-resource status.
- **Dashboard "Recent resources" columns.** The mockup shows a URI as the label and a date under Group.
- **Which multi-typed nodes are "the same field"?** The assignment ranking in D1 settles most cases. Real profiles may have templates whose classes overlap on purpose; the policy table will surface them as rows to decide.
- **The golden corpus needs real data.** We need permission to copy 30–50 stage records and their profiles into the repo as fixtures, and a way to refresh them.
- **Template versioning contract.** The `hasResourceTemplate` / `version_uri` behavior has reversed several times. It has to be written down with the API team; otherwise D9's fix rests on an assumption.
- **Behavior changes need cataloger review.** The new core will differ from the old one in places where the old one was wrong. Those differences go to catalogers as policy table rows, which takes their time.

## References

- Bugs: #254, #255, #265, #266, #269, #271; feedback #270; redesign #244, #245, #246, #248, #249, #250; config #241.
- Blue Core Description Editor design: <https://github.com/edsu/bluecore-editor/blob/main/docs/design.md>
- Phased refactor pattern: blue-core-lod/bluecore-models#213
- Plan: [design_plan.md](design_plan.md)
