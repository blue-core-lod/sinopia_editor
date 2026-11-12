# Sinopia Editor (Blue Core): Plan

*Draft for discussion, November 6, 2026. Based on [design_proposal.md](design_proposal.md).*

**Baseline: `74996e8b`**, `main` after #274. At that commit:
- all 134 test suites (842 tests) pass in about 10 seconds in parallel;
- line coverage is 93.7% and branch coverage 83.2%;
- the production bundle is 3.1 MB plus an 851 KB chunk.

This document is the overview: why, where we end, the phases, the rules every phase follows, the constraints, and the decisions. Each phase becomes an epic, and each PR listed under it becomes a ticket. The PR lists are best estimates and will change as the work teaches us things.

## Why

The editor began as a proof of concept for editing arbitrary RDF through resource templates. It now carries Blue Core cataloging on stage, and the team experiences it as fragile: fixed bugs come back. The review in the design proposal traces this to a few structural causes.

1. **Loading and saving have no ownership rule for triples.**
   - Every field sees every object of its predicate, and a node can belong to several fields.
   - Triples the form doesn't model are kept as a detached string with stale blank-node labels and merged back blindly on save.
   - Values duplicated into two fields (doubling on every save, reproduced in a test) and lost data (#169, #240, #242) both follow, and each fix so far has added a special case to the same loader. (#266 itself turned out to be duplicates that arrived with the MARC import.)
2. **The API boundary is spread over three modules with no typed errors.**
   - A JSON-LD context fetched from another domain (bibframe-json.org) blocks one tester completely (#255).
   - Search silently drops its filters and sort.
   - "Recent resources" relies on a function that is known to be broken.
   - Every failure is reported as "Error parsing resource".
3. **Flows are implemented more than once.** There are two load paths, two copy paths and six ways to make a subject from a template. A fix in one leaves the other broken.
4. **Derived data is stored and maintained by hand in the reducers**, and at least one path gets it wrong. The result is a Save button disabled with no visible error.
5. **The editor shell assumes one resource at a time.** A global "current resource" is read by 16 components, which blocks the side-by-side Work and Instance editor that catalogers asked for (#249, #265).
6. **The tests cover a lot but check the wrong things.**
   - No feature test checks what gets saved.
   - RDF assertions are substring matches.
   - There is no corpus of real records.
   - CI never builds or runs the app.

   The bug classes that recur are exactly the ones these tests can't see.

The framework itself (React 19, Redux 5, react-router 7, Jest 30) is current and isn't the cause. So the plan is a **targeted rewrite of the core inside the existing app**: new load, save and copy functions and a new API client, checked against today's code before they replace it. Around that, the store and editor shell are refactored incrementally and the redesigned pages are rebuilt. The proposal explains why this was chosen over an incremental-only refactor or a new application.

## Where we end

When the planned work is complete:

**Data integrity**
- Loading and saving are two pure, typed, synchronous functions, `rdfToModel` and `modelToRdf`, plus one async `resolveTemplates`. Copy, import and "load as new" all go through them.
- Every triple has exactly one owner. A node goes to one field by an explicit ranking. Anything the form doesn't model stays attached to its node, is shown read-only, and is written back unchanged.
- Datatypes, language tags, every label and value order survive a round trip. Referenced resources (a Work cited from an Instance) are references, not copies.
- **A load-and-save policy table** describes what the editor does with each kind of input. Each row is marked *chosen* or *inherited*. The table runs as tests and is published in plain language for catalogers. Changing a row is a separate, reviewed PR.

**Testing and operations**
- A golden corpus of real Blue Core records and their profiles proves that saving without edits changes nothing, twice in a row.
- Contract fixtures recorded from the real API pin the response shapes the editor depends on.
- CI builds the bundle and runs a browser smoke test against it.

**Code structure**
- One `apiClient` handles every request:
  - typed errors that say what failed;
  - token refresh;
  - abort and timeout;
  - IRI-to-endpoint mapping;
  - `If-Match` on PUT;
  - contexts bundled locally, so no remote fetch.
- The store uses Redux Toolkit entity adapters. Derived data comes only from memoized selectors. View state lives in a `ui` slice keyed by view and resource.
- The editor shell gives each pane a `ResourceContext`, and nothing reads a global current resource.

**Features**
- Catalogers can link an existing Instance from a Work, create a linked Instance from a Work, and edit a Work and its Instance side by side.
- The redesigned pages (#244, #245, #246, #248, #249, #250) are in place on the shared Blue Core header and footer.
- Search sorting and filtering work server-side.

**Unchanged**
- The resource template format and the template editor.
- Load RDF, MARC import, exports, metrics, transfer, and groups and permissions.
- The property and input components, apart from targeted fixes.

## Phases

Each phase is an epic issue and is blocked by the phases it depends on. Each PR is one ticket. A phase is done when its exit criteria hold on `main`.

| Phase | Epic | Depends on | Changes behavior? |
|---|---|---|---|
| 0a | Safety net | none | No |
| 0b | Today's load/save behavior as a policy | 0a | No |
| 1 | Stop the bleeding: current bugs | none (runs alongside 0) | Yes, bug fixes only |
| 2 | One API client; build and server hygiene | 0a (smoke test) | No, except error messages |
| 3 | New core: load, save, copy | 0b | No (differences are listed and reviewed) |
| 4 | Store and editor shell | 2; 3 for the entity work | No |
| 5 | Work and Instance relationships; side-by-side editor | 3, 4; API tickets | Yes, new features |
| 6 | UX redesign pages | 2 (non-editor pages), 4 (editor pages) | Yes, new UI |
| 7 | Cleanup and optional toolchain | 3, 4 | No |
| After | Policy changes, one row per PR | 3 | Yes, by decision |

### Phase 0a: Safety net

**Goal:** tests that fail on the bug classes that recur, and CI that runs the real app. Nothing in `src/` changes, apart from the one-line config fix CI needs.

**Exit criteria:**
- The golden corpus tests run in CI.
- Feature tests assert on save payloads.
- CI builds the bundle and runs the smoke test.
- The suite is green.

**PRs:**
1. **RDF test helpers:** `expectIsomorphic(actual, expected)`, which compares canonicalized datasets for equality, plus a one-line diff on failure. Replace the 43 `toMatch(string)` RDF assertions with it, and fix the tests that start failing. Each failure is either a real bug (add a `// pins current behavior, see #…` comment and a ticket) or a wrong expectation.
2. **Golden corpus, part 1:**
   - Copy 10 real stage records (Monograph Work and Instance, a copied Instance, a MARC-imported Instance, a record with `bflc:Uncontrolled`, a record with non-filing characters) and the profiles they use into `__tests__/__golden__/`, with a script that refreshes them.
   - Add one test per record: load, save with no edits, then assert the result is isomorphic to the input or to a recorded current output, and do it twice to show the result is stable.
   - Where today's output differs from the input, record today's output as the expected value and list the record in a `KNOWN_DIFFERENCES.md`. These become rows in Phase 0b.
3. **Golden corpus, part 2:** grow it to 30–50 records, including real cases of the open bugs (#266, #242, #169) and template-editor records (#254).
4. **Payload assertions in feature tests:** save, copy, MARC import and template save. Assert on what `postResource`/`putResource` received.
5. **Contract fixtures:** record real API responses (a resource with and without `expand=true`, a profile with and without `version_uri`, a search page, user history), with a refresh script. Add tests that the current client parses them.
6. **CI build and smoke test:**
   - Run `npm run build` in CI.
   - Add one Playwright test against the built app with a stubbed API: reload a nested route, open a record, save, reopen.
   - Fix `index.html` to load `/sinopia/env-config.js` and guard `window._env_` (#241). This is the one `src` change in the phase, and the smoke test proves it.
7. **Dependency workflow token:** create the weekly dependency PR with the GitHub App token so the PR checks run.

### Phase 0b: Today's load/save behavior as a policy

**Goal:** a written, tested statement of what the editor does today when it loads and saves, so the new core can be checked against it.

**Exit criteria:**
- Every row of the policy table is a named test case against today's code, and they all pass.
- Each row is marked *chosen* or *inherited* after a review with the team.
- A plain-language version for catalogers is published in `docs/`.

**PRs:**
1. **Policy table, draft:** `docs/load_save_policy.md`, one row per case, developer view. Starting rows include:
   - A node typed both `bf:ProvisionActivity` and `bf:Publication`.
   - A predicate shared by two property templates.
   - An object that matches no nested template.
   - An untagged literal.
   - A typed literal the template doesn't declare.
   - A second `rdfs:label`.
   - A blank node that is only partly modeled.
   - A referenced Work arriving in `expand=true`.
   - A suppressed URI that has no type.
   - Copying a resource that has `hasInstance` or `instanceOf`.
   - Copying a resource that has unmodeled triples.
   - Template refs given as a profile URI, a version URI or a legacy id.
2. **Policy tests against today's code:** one parametrized test per row using small fixtures, asserting today's behavior, including the rows that look wrong. A row that turns out to misread the code is corrected in the table, not in the code.
3. **Review and marking:** a team session to mark each row *chosen* or *inherited*. Follow-up tickets go under "After" for each inherited row someone wants to change.
4. **Cataloger version:** the same rows in plain language, for example "If a Publication is also typed as a Provision Activity, it appears under…". It is generated from the test descriptions, and CI checks that the published copy matches.

### Phase 1: Stop the bleeding

**Goal:** fix or close the current-cycle bugs with small, low-risk changes, each with a test. This runs alongside Phase 0. The structural fixes come later, in Phases 3 and 5.

**Exit criteria:**
- #255 and #269 are closed.
- #271 has an API ticket and an editor PR.
- #254 is closed with a test.
- #265 and #266 have interim fixes, and their structural fixes are linked to Phases 3 and 5.

**PRs:**
1. **#255: bundled JSON-LD context.**
   - Bundle `bibframe-json.org/v0.1/context/bibframe.jsonld`.
   - Give `datasetFromJsonld` a document loader that serves bundled contexts and refuses others with a clear error.
   - Add a fixture that uses the remote context.
   - Ask the tester to open the context URL to confirm the cause.
2. **#255: honest load errors.** Separate the "fetch failed", "not found", "not authorized" and "couldn't parse" messages in `fetchResource` and `loadResource`, naming the URL that failed.
3. ~~**#269: verify and close.**~~ [COMPLETE]
   - Confirm on stage that paging works since `fe6ce954`, and close the issue citing that commit.
   - Fix `Search.jsx`'s missing error key so paging errors are shown.
   - Add a stale-response guard to resource search.
4. **#271, API side:** open the ticket in the API repo. The import should pass a real `baseuri`, or replace `example.org` IRIs with blank nodes before minting, and must not record `derivedFrom` for placeholder bases.
5. **#271, editor side:**
   - Send a `baseuri` to `/marc2bibframe`.
   - Add a test asserting that no `example.org` IRI is in the import payload.
   - If the conversion still returns one, show a warning on the Load RDF page before the cataloger submits.
6. **#254: close with a test.** Add a template-editor test where a nested template ref is the profile URI and the label's subject is the version URI, or the reverse. Assert that the label shows and that no triple appears as "not editable". Fix the label lookup to try the alias if the test fails.
7. **#265, interim:**
   - Send `typeFilter` for lookups so "has Instance" returns only Instances.
   - Give the lookup a visible label ("Link an existing Instance").
   - Keep `instanceOf` when an Instance is derived by copy.
   - "Create New" from a Work sets `instanceOf` on the new Instance once the Work has an IRI.
   - Show a note when the Work is unsaved ("Save the Work to link a new Instance").
8. **#266, import duplicates:**
   - Add the import-produced record (32fa956d) to the golden corpus.
   - With the API team, find whether marc2bibframe2 emits a separate 008-derived Publication node, and merge or drop it on import.
   - Until then, the Load RDF page warns when two provision activities of the same type have overlapping values.
9. **D1 repro as a pinned test:** add the multi-typed-node test (a node typed `bf:Note, bf:TitleNote` under `testing:dupeProperties`), asserting today's doubling with a `// pins current behavior` note. Then check stage Work 4094d623 in Sinopia for the Primary/Other contribution duplicate.
10. **#270 quick wins:** a visible "Saved" confirmation, text labels on the view, edit and copy actions, and clearer wording for the copy flow's Save step.

### Phase 2: One API client; build and server hygiene

**Goal:** every request goes through one typed client, and production no longer ships test code or open proxies. User-visible behavior stays the same, apart from clearer error messages.

**Exit criteria:**
- No `fetch` call outside `apiClient`.
- No `__tests__` import in `src`.
- The smoke test passes against the new Docker image.

**PRs:**
1. **`apiClient` skeleton (TypeScript):**
   - typed error classes;
   - `ok` checks;
   - an abort signal and timeout;
   - one retry for idempotent GETs;
   - token refresh and injection from the Keycloak context;
   - a `problem+json` parser that falls back to the current error shape.
2. **IRI-to-endpoint mapping:** one function that turns a resource IRI into its API, versions, relationships or MARC endpoint, and refuses writes to foreign hosts. This replaces `resourceUri.replace("resource","marc")` and `uriFromResourceId`.
3. **Move resource reads and writes** (fetch, post, put, versions, relationships) to the client.
4. **Move search and template search** to the client, including its own `resp.ok` check.
5. **Move user, history, MARC, transfer, exports and language detection** to the client, and stop passing `keycloak` through the thunks.
6. **Remove fixtures from `src`:** a fake API for tests, injected through a Jest `moduleNameMapper` or a small provider. Delete the `USE_FIXTURES` branches.
7. **Server:** delete the `/api/search` proxy, restrict `/api/qa` to the paths the app uses, replace `babel-node` with plain ESM or a compiled server, and fix the `docker-compose` port.
8. **Docker:**
   - multi-stage build with `npm ci`, ending in a slim runtime image with `dist/` and the server;
   - run as a non-root user;
   - set `NODE_ENV=production`;
   - tag images by version and SHA;
   - pin `node:24-slim`;
   - remove the stale build args.
9. **Dependencies:** remove the unused packages and the Node polyfills a build doesn't need, verified by the build and the smoke test. Move build-only packages to `devDependencies`. Add content hashes to bundle filenames. Stop serving the source map publicly.

### Phase 3: New core: load, save, copy

**Goal:** the pure, typed core described in the proposal, built beside the current loader and serializer, checked against them on the golden corpus and the policy tests, then switched in behind the existing action names.

**Method:**
1. Build the new functions.
2. Run them in tests beside the old ones on the corpus and the policy cases, and list every difference.
3. Classify each difference as matching an *inherited* row we agree to change, or as a bug in the new core.
4. Fix the new core, or record the change as a policy decision.
5. Switch over.
6. Delete the old code.

The switch happens only when the differences list is empty or every remaining difference is an approved policy row.

**Exit criteria:**
- The old loader, serializer and both copy paths are deleted.
- The golden corpus round-trips with no differences.
- The policy tests pass, with each changed row approved and its marking updated.
- The multi-typed-node test shows one value in one field, stable across saves (D1), and #242 is fixed.

**PRs:**
1. **RDF module (TypeScript):**
   - one RDF/JS stack (n3 2.x with an RDF/JS dataset, or rdf-ext 2; choose in this PR and record the choice);
   - one JSON-LD parse and serialize pair;
   - bundled contexts;
   - canonicalization and isomorphism helpers.

   The current code keeps using its own imports for now.
2. **Model types and `resolveTemplates`:**
   - typed model for subjects, properties, values and unmodeled data;
   - templates keyed by canonical version IRI with an alias map;
   - fetches the whole template tree up front.
3. **`rdfToModel`, part 1:** literals and URIs, keeping datatypes, language tags, every label and order. Includes the assignment report.
4. **`rdfToModel`, part 2:**
   - nested resources with the exclusive assignment ranking: required class beats optional class beats suppressible fallback;
   - one placeholder per property, not per predicate;
   - the matching function shared with template validation.
5. **`rdfToModel`, part 3:** unmodeled triples attached to their node, named nodes outside the document treated as references, and expanded sub-graphs excluded.
6. **`modelToRdf`:** the exact inverse, using UUID node keys for blank-node identity, with unmodeled data written back under its node.
7. **Differential harness:** runs old and new on the corpus and the policy cases and writes the differences list. It runs in CI as a report, not a gate, until the switch.
8. **`copyResource`:** root rewrite plus an explicit relationship rule, then a load like any other resource. Add policy rows for copy.
9. **Switch loading:** `loadResource`, `newResourceFromDataset` and MARC import call `rdfToModel` and normalize the result into the existing entities.
10. **Switch saving:** `saveBodyForResource` calls `modelToRdf`.
11. **Switch copy:** in-editor copy and "copy from search" both call `copyResource`.
12. **Delete the old code:** the dead `loadResource` in `resourceHelpers.js`, the old loader and serializer paths, `unusedRDF` as a string, `claimedLinks`, the ancestor guard, and the tests that pinned old behavior.
13. **"Not editable" panel:** driven by the assignment report. It lists only this resource's unmodeled triples, grouped by node, under "View triples not editable in this template" (#248).

### Phase 4: Store and editor shell

**Goal:** a store and shell that support more than one resource on screen and a redesign without stored derived data. No behavior change.

**Exit criteria:**
- Nothing reads `selectCurrentResourceKey` outside the shell.
- No derived data is stored.
- Redux Toolkit's immutability checks are on in development.
- There is no imperative routing effect in `App.jsx`.

**PRs:**
1. **`configureStore`:** Redux Toolkit store setup with dev checks on. Fix the selector that mutates state (`selectProperty`) and anything else the checks find.
2. **Search and history as RTK slices** with request de-duplication and cancellation. These are the most self-contained slices, so they go first.
3. **Entity adapters** for subjects, properties and values. Move the reducers to `createSlice` with today's action names.
4. **Derived data to selectors:**
   - remove `descUriOrLiteralValueKeys`, `descWithErrorPropertyKeys` and the stored errors, and compute them with `createSelector`;
   - this fixes the clear-helper bug, so the Save button can no longer be disabled with no error shown;
   - add a test for the "save error with nothing flagged" case (#270).
5. **`ui` slice:** move `show`, `showNav`, `changed`, "property added" and the modal stack out of the entities, keyed by view and resource.
6. **`ResourceContext`:** wrap the editor in a provider, then convert the 16 consumers of `selectCurrentResourceKey` in small batches, about 4 components per PR.
7. **Commit as you type:** text inputs dispatch on change (debounced) instead of on blur, and "unsaved changes" is derived from the store.
8. **Routing:** route components or loaders replace the routing effect in `App.jsx`. Authentication is driven by Keycloak events. One load flow replaces the spread-out "load, then pick a template" flow.
9. **Layout route:** one place for the header and footer, ready for Phase 6.
10. **Cleanup:** replace `redux-mock-store` tests with real-store tests, as each area is touched.

### Phase 5: Work and Instance relationships; side-by-side editor

**Goal:** catalogers can link and create Instances from a Work and edit both side by side (#265, #249).

**Depends on these API tickets:**
- `hasInstance` derived from `instanceOf`;
- `If-Match` and 412;
- search hits with relationship refs;
- a decision on IRIs before first save (see Decisions).

**Exit criteria:**
- #265 and #249 are closed.
- A Work and an Instance can be edited and saved together with per-resource save state.
- A concurrent edit gives a 412 and a clear message, not a silent overwrite.

**PRs:**
1. **Relationship control:** a dedicated control for `hasInstance` and `instanceOf` with "Link existing" (a type-filtered search) and "Create linked". It shows inverse links from the API, and the same data fills the left nav's **Instances** section in the resource editor mockup.
2. **Forms at half width:** container-relative layout in the property and input components, replacing fixed Bootstrap column widths, so a pane at about 650 px works. Check it with the longest real templates in the golden corpus.
3. **IRI before first save:** implement whichever option is chosen. Until it lands, "Create linked" saves the Work first, with the cataloger's confirmation.
4. **`If-Match` on PUT and a 412 dialog** that names the resource and offers to reload.
5. **Dual editor shell:** two panes, each with its own `ResourceContext`, header, Work / Work and Instance toggle, "not editable" link and URI, as in the 293-3198 mockup. The left nav is collapsed by default, as #249 specifies. For a Work with several Instances, show the primary Instance.
6. **Per-resource save state:** per-pane Save plus "Save both", with "Work saved, Instance not saved; retry". The mockup doesn't show saving, so this needs the designer's sign-off first.
7. **Copy between panes:** "Copy Work to Instance >>" and "<< Copy Instance to Work" by exact property match between the templates, using the core's copy functions. Show a preview of what will be copied.
8. **Feature tests** for linking, creating, dual editing and copying, with payload assertions.

### Phase 6: UX redesign pages

**Goal:** the redesigned pages from #244, #245, #246, #248 and #250, on the shared Blue Core header and footer.

The non-editor pages (PRs 1–5) can start once Phase 2 is done. The editor pages (PRs 6–9) wait for Phase 4. Each page is one or two PRs. A page ships when its accessibility checks pass (keyboard navigation, labeled controls, no `href="#"` buttons).

**Depends on these API tickets:**
- search filters, sort and facets;
- lookup by a list of URIs;
- pinned templates.

**PRs:**
1. **Design tokens and components**, built on the Radix primitives the app already uses:
   - colors per entity type (Work green, Instance magenta, template blue);
   - type icons (W circle, I diamond, RT square);
   - buttons;
   - a collapsible section with delete and ↑ ↓ slots;
   - entity chip;
   - a sortable table;
   - the Work / Work and Instance toggle.

   Action icons get accessible names and tooltips (#270). Replace Bootstrap's JavaScript dropdowns and popovers.
2. **Blue Core header and footer** in the layout route (following bluecore-airflow-common#1 and #2): Help, Contact, Switch applications, Logout, and the footer's application links. Add the persistent Sinopia menu with the scoped search ("BIBFRAME - All").
3. **Search results table (#245):**
   - columns Label, Class (every class label on the hit), Modified and Actions (view, edit, copy);
   - numbered pagination top and bottom;
   - "Sort by relevance" and a Filter dropdown, with sort and filter run server-side;
   - "Relationships" expanding in place to rows with their own actions, filled from search-hit refs, not one fetch per hit.
4. **Resource templates page (#246):**
   - a pinned section above a dedicated template search, using the same table;
   - columns Label (with the template id), Class or Resource URI (confirm the heading), Author, Date, Guiding statement and Actions (create, view, edit, copy, pin);
   - actions that follow the user's permissions.
5. **Dashboard (#244):** collapsible sections, using lookup by URIs.
   - *Recent templates* includes the Version column.
   - *Recent searches* shows Authority and Query with a re-run action.
   - *Recent resources* shows Label, Class and Group, with the column content confirmed first.
6. **Recent resource chips (#248, #250)** replacing tabs, with type icons, truncated main titles, a close button and scroll arrows.
7. **Resource editor (#248):**
   - entity header with type icon, view and copy, the Work / Work and Instance toggle, "View triples not editable with this template", and the URI with a copy button;
   - collapsible left nav that stays in place while scrolling, with presence dots and Instances and Versions sections;
   - shaded, collapsible top-level property sections with delete;
   - ↑ ↓ as a per-cataloger view preference (see Decisions), stored in the browser until the API stores preferences.
8. **Template editor (#250):** the same shell in blue.
   - The left nav lists the template's own fields.
   - Sections are collapsible, and "+ Add another property template" sits in the section header.
   - ↑ ↓ reorders property templates in the saved template.
   - Sub-sections inside each property template are collapsible.
9. **#270 remainder:** typeahead for the ScriptShifter list, readable property help instead of raw RDF, and built-in diacritics and special-character entry.

### Phase 7: Cleanup and optional toolchain

**Goal:** remove what the earlier phases made obsolete, and adopt toolchain changes only where they pay for themselves.

**PRs:**
1. Remove the 112 `propTypes` declarations, or declare `prop-types` as documentation. Delete `jest-prop-type-error`.
2. Convert the remaining hand-written reducers and `connect()` components that earlier phases didn't touch.
3. Extend TypeScript checks (`checkJs`) to the modules around the core.
4. *Optional:* Vite and Vitest, now that the polyfills and fixture coupling are gone. Express 5 in the same pass.

### After: policy changes

Each *inherited* row of the load/save policy that the team wants to change is its own PR. It changes one row, the code behind it and its marking, and catalogers review it against the published table. Examples likely to come up:
- datatypes on literals the template doesn't declare (#169);
- extra `rdfs:label`s;
- the relationship rule on copy.

## How we work

- Each PR references its phase epic, and each epic references this plan.
- Branch names follow `tXXX-description`, and commits use conventional prefixes with `[tXXX]`.
- **Small PRs:** one concern per PR, aiming for under about 400 changed lines excluding fixtures. Anything bigger is split, for example "add new function" then "switch callers" then "delete old".
- Whoever picks up the next PR in a workstream reviews the current one, so people read code just before they change it.
- **Every PR must:**
  - leave the golden corpus and policy tests passing;
  - leave the smoke test passing;
  - not regress the bundle size by more than 5% without an explanation.
- **Behavior changes are explicit.** Phases 0a, 0b, 2, 3, 4 and 7 preserve behavior. A PR in those phases that changes what gets saved fails the corpus, and that's the point. Behavior changes happen in Phase 1 (bugs), 5 and 6 (features), and After (policy rows).
- When a phase finishes, its lead adds a short comment to the epic: what surprised them, and anything the next phase should know.

## Constraints

Agreed in discussion:

- **Resource templates keep driving forms, and the template editor stays in Sinopia.** Existing templates must keep working without migration.
- **BIBFRAME only, keep data.** The editor targets BIBFRAME Works, Instances and resource templates. Triples it doesn't model are preserved and shown read-only, never dropped. Generic RDF editing is not a goal.
- **These features must survive:** Load RDF and MARC import, exports and metrics, transfer to the ILS, groups and permissions.
- **API changes are allowed when coordinated.** Each is a ticket in the API repo, and the editor works against the current API until it lands. No phase is blocked on an API change without an interim path.
- **A framework change is allowed if justified.** None is planned (see Decisions).
- **Capacity:** 2–3 developers, mostly dedicated.

Constraints the plan adds:

- **Behavior-preserving phases don't change what gets saved** (see How we work).
- **The editor keeps shipping.** Every merged PR leaves `main` deployable to stage. There is no long-running rewrite branch.
- **No data repair on stage** as part of this plan. Data problems found on stage are reported and handled separately.

## Decisions

Decisions made in this proposal that should be reviewed:

- **Targeted rewrite of the core, inside the existing app.** We rewrite load, save, copy and the API client; refactor the store and shell; and rebuild the redesigned pages. We don't build a new application. *(The proposal gives the reasoning.)*
- **Stay on React and Redux** (through Redux Toolkit). A framework change would turn this into a new application and fixes none of the recurring bugs.
- **New core modules are written in TypeScript**, compiled by Babel and checked with `tsc --noEmit`. There's no bundler change, and existing JavaScript isn't converted except where a phase rewrites it.
- **Vite and Vitest are optional and come last.** They don't affect correctness, and they're easier once the polyfills and fixture coupling are gone.
- **Today's behavior is written down as a policy before the new core replaces it** (Phase 0b), following bluecore-models#213. Tests pin today's behavior, including inherited rows. Changes come one row at a time.
- **The golden corpus uses real stage records**, refreshed by script, not synthetic fixtures.
- **Exclusive assignment of triples to fields**, with the ranking required class beats optional class beats suppressible fallback. Leftovers are preserved as unmodeled data.
- **Referenced resources aren't edited in place.** Data from `expand=true` is a read-only cache for labels.
- **Copy is "clone the RDF, then load"**, with an explicit relationship rule. The two current copy paths are deleted.
- **Templates are keyed by canonical version IRI** with an alias map.
- **Bundle JSON-LD contexts.** The editor never fetches a context from another domain.
- **Phase 1 runs alongside Phase 0**, so current bugs aren't held up by the safety net. Phase 1 fixes stay small. Anything structural waits for Phase 3 or 5.
- **#269 is treated as fixed by `fe6ce954`**, pending a check on stage.
- **#254 is closed on the strength of the data remediation**, plus a test that the label lookup handles both profile and version URIs.
- **#271 is mainly an API fix.** The editor sends a `baseuri` and warns if `example.org` IRIs remain.
- **↑ ↓ means different things in the two editors** (from the Figma review). In the template editor it reorders property templates and is saved. In the resource editor it's a per-cataloger view preference and is never written to the description or the template.
- **Redesign components are built on Radix** (already a dependency), not Bootstrap's JavaScript, for keyboard and focus handling.

## Open decisions

These need an answer before the phase noted:

| Question | Needed by | Options |
|---|---|---|
| How Sinopia relates to the Blue Core Description Editor in the long run | Not blocking; revisit after Phase 3 | Sibling, converge, or eventually replaced (see the proposal). The core is designed to keep all three options open. |
| IRIs before first save | Phase 5 | Save first automatically; a reservation endpoint; client-minted IRIs the API accepts. |
| Confirm ↑ ↓ in the resource editor is a per-cataloger view preference, and where it's stored | Phase 6, PR 7 | Browser only, or the API's user settings. (In the template editor it reorders the template; that one is settled.) |
| Save, Close and status in the side-by-side view (not in the mockup) | Phase 5, PR 6 | Per-pane Save plus "Save both" (proposed), or one Save for both. |
| What the dashboard's *Recent resources* Label and Group columns hold | Phase 6, PR 5 | The mockup shows a URI and a date; probably the main title and the owning group. |
| Which RDF/JS stack | Phase 3, PR 1 | n3 2.x with an RDF/JS dataset, or rdf-ext 2. |
| Permission to copy stage records into the repo as fixtures | Phase 0a, PR 2 | Which records, and whether any need anonymizing. |
| The `hasResourceTemplate` / `version_uri` contract | Phase 3, PR 2 | Written down with the API team and pinned by contract fixtures. |
| Whether Hubs appear in the side-by-side editor | Phase 5 | Out of scope for now, or shown read-only. |

## Follow-ups (not part of this plan)

- **Stage data:** orphaned triples and duplicate Publication nodes already saved there. This needs a separate decision with the people who use stage.
- **SHACL validation in the cataloging workflow (#59).** The core's assignment report and `problem+json` field paths make this easier later.
- **The accessibility tickets migrated from Sinopia Classic (#50).** Phase 6's accessibility checks cover new pages only.
- **Upstream contributions** to marc2bibframe2, such as a documented `baseuri` default.
