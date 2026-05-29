# RDF as the Single Source of Truth — Staged Roadmap

This document describes a multi-stage refactor that moves the Sinopia editor
from a normalized Redux entity model toward storing each resource's **RDF as the
single source of truth**, represented as a plain, serializable quad array.

It is a living design doc. **Stage 1 is implemented** (commit `5ad9faa`);
**Stages 2 and 3 are design only** and have open decisions noted inline.

---

## 1. Context & motivation

### Today's architecture

The Redux source of truth is a **normalized, template-driven entity model**:

```
state.entities.subjects   // {<key>: subject}
state.entities.properties // {<key>: property}
state.entities.values     // {<key>: value}
```

RDF is never stored. It is produced and consumed only at the boundaries:

- **Load** — `fetchResource` → `datasetFromJsonld` → an `rdf-ext` dataset →
  `recursiveResourceFromDataset` (`src/actionCreators/resourceHelpers.js`) walks
  the *template* structure and queries the dataset per slot, building the
  normalized entities. The dataset is then discarded.
- **Save / preview** — `GraphBuilder` (`src/GraphBuilder.js`) rebuilds an
  `rdf-ext` dataset from the entities, serialized to JSON-LD.

### The key insight: most of the state is not RDF

A resource's normalized state fuses three different kinds of data:

| Kind | Examples | Source |
|---|---|---|
| ① **RDF data** | `value.literal/lang/uri/label`, `subject.classes`, `subject.uri` | the graph |
| ② **Template-derived structure** | `propertyUri`, `component`, `labels`, `rootSubjectKey`, `rootPropertyKey`, `subjectTemplateKey`, the existence of empty/required/default value slots | template + position |
| ③ **UI / validation state** | `show`, `showNav`, `changed`, `errors`, `descWithErrorPropertyKeys`, `descUriOrLiteralValueKeys`, `bf*Refs`, `defaultLang`, `group`, `editGroups` | editing session |

Only ① lives in the graph, and the view is **`f(graph, templates, uiState)`** —
not derivable from the graph alone. The parser even synthesizes empty required
fields and template defaults that have **no backing quads**. This shapes every
stage below: RDF can be the source of truth for the *data*, but the UI still
needs a template-shaped, key-stable view layer.

### Goals

1. **Single source of truth** — eliminate the dual representation (normalized
   entities vs. transient GraphBuilder RDF).
2. **RDF fidelity / round-tripping** — no data loss through load → edit → save.
3. **Simplify / reduce bugs** — fewer hand-maintained derived fields.

### Representation decision (applies to all stages)

Store RDF as a **plain-object quad array**, not as:

- a live **`rdf-ext` dataset** — mutable, non-plain; breaks Redux DevTools
  serialization / time-travel (the store is classic `createStore` + `thunk`, so
  nothing *enforces* serializability, but a live dataset still renders poorly).
- **JSON-LD** — its parse/serialize path is **async** (`datasetFromJsonld`,
  `jsonldFromDataset` return Promises) so it cannot run inside a reducer, and it
  has no canonical shape (framing/compaction/blank-node labels vary), making it
  a poor edit target.

A plain quad array is serializable (DevTools-friendly), synchronously mutable in
reducers, and gives quad-level granularity.

```js
// Plain quad shape (see src/utilities/Utilities.js)
{ subject: Term, predicate: Term, object: Term, graph: Term }
// Term: { termType, value, language?, datatype? }
```

---

## 2. Stage 1 — Canonical quad layer + faithful save  ✅ DONE (`5ad9faa`)

### What shipped

- `quadsFromDataset` / `datasetFromQuads` — sync converters between an
  `rdf-ext` dataset and a plain quad array (`src/utilities/Utilities.js`).
- New entity state: `entities.resourceQuads` (full loaded graph — the canonical
  seed for later stages) and `entities.unmanagedQuads` (quads no template slot
  captured). Removed `editor.unusedRDF`.
- **Faithful save**: `saveBodyForResource` (`src/sinopiaApi.js`) now unions the
  preserved `unmanagedQuads` into the `GraphBuilder` output before serializing.
- `UnusedRDFDisplay` reads the quad array via `selectUnmanagedQuads` and builds
  its dataset with the sync `datasetFromQuads`.

### Bug it fixed

`editor.unusedRDF` was **display-only and silently dropped on save** — any triple
not captured by a template slot was lost on every round-trip. It is now
preserved and re-emitted.

### Known limitation (carried into later stages)

`GraphBuilder` mints fresh blank nodes, so the regenerated managed subgraph
shares no bnode labels with the preserved unmanaged quads. An unmanaged triple
referencing a bnode from a template-captured node can dangle after the union.
No worse than before (which dropped it entirely); resolved when quads become
canonical end-to-end (Stage 3) or when arbitrary-RDF editing is added.

### What Stage 1 deliberately did **not** do

It did not change the editing model, the edit loop, or key generation. The
normalized entities remain the live editing source of truth; `resourceQuads` is
stored but not yet consumed. Those are Stages 2 and 3.

---

## 3. Stage 2 — Invert editing: quads canonical, view derived  📋 DESIGN

**Goal:** make the stored quad array the thing edits mutate, and turn the
template-shaped normalized view into a **derived cache** for the UI. After this
stage, `entities.resourceQuads` is authoritative for ① the data; the
`subjects/properties/values` entities are rebuilt from it.

### The three hard problems

#### 3.1 A synchronous, template-driven derive path

`recursiveResourceFromDataset` is already the "RDF → template-shaped view"
function, but it is **async** because it calls `loadResourceTemplate` (which may
fetch from the API) and it **dispatches** actions as it goes.

Split it into two phases:

- **Ensure templates loaded** — async, runs **once** per resource (on load, or
  when a template first appears). By edit time, every needed template is already
  in `state.entities.subjectTemplates / propertyTemplates`.
- **Build view from quads + templates** — a **pure, synchronous** function
  `derive(quads, templates, uiState) -> {subjects, properties, values}` that can
  run inside a reducer or a memoized selector on every change.

This is the main new machinery. The existing parser logic (ordered RDF lists via
`rdf:first`/`rdf:rest`, suppressed/nested value subjects, `rdfs:label` handling,
merging template defaults with dataset values) is reused but made pure/sync.

#### 3.2 value ↔ quad provenance

Today the parser consumes quads and discards the mapping (`context.usedDataset`
is global, not per-value). Edits need to know **which quads** a value owns so
they can be surgically replaced.

- Each derived value records the quad(s) it came from (its subject term +
  predicate + object term), and each derived subject records its RDF term (named
  node URI or blank-node id).
- Edits become **surgical quad mutations** (remove the old quad(s), add the new
  one). Surgical edits also keep blank-node ids **stable** across edits — only
  *adding* a nested resource mints a new bnode.

#### 3.3 Relocate ③ UI/validation state off the RDF entities

`show`, `showNav`, `changed`, `errors`, `descWithErrorPropertyKeys`,
`descUriOrLiteralValueKeys`, `bf*Refs`, `defaultLang`, `group`, `editGroups`
currently live on the same objects the graph would own. They must move to a
**separate slice** so `derive()` can rebuild the data view without destroying
session state, then reattach it.

**Open decision (3.3):** where UI state lives.
- *Recommended:* a parallel `entities.viewState` keyed by stable derived key;
  selectors recombine data + UI state. Cleanest separation, more plumbing.
- *Alternative:* keep it on the derived view objects, rehydrated each derive.
  Less component churn, but `derive()` must carefully preserve it.

### Keying: stable identity across re-derivation

If keys are regenerated on each derive, React remounts inputs (focus/scroll
loss) and UI state orphans. Two options:

- **Pure position keys** — derive the key from graph location
  (`parentTerm ∣ propertyTemplate ∣ propertyUri ∣ slotIndex`). Makes keys
  meaningful but requires every key consumer to tolerate the new format.
- **nanoid-map hybrid (recommended)** — keep the `nanoid` key *format* and
  maintain a persistent `positionSignature → nanoid` map; reuse the existing
  nanoid for a known position, mint new only for new positions. Far smaller
  blast radius on components/cross-references.

Gotchas (both options): **literals must key by slot index, not content** (content
changes while typing); **insert/remove/reorder shifts sibling indices** (the
classic array-index-key tradeoff, bounded to affected siblings).

**Open decision (keying):** pure position keys vs. nanoid-map hybrid.

### Edit loop after Stage 2

`UPDATE_VALUE` / `ADD_VALUE` / `REMOVE_VALUE` / `SET_VALUE_ORDER` become:
1. mutate the canonical quad array (surgical add/remove, using provenance),
2. re-derive the affected subtree synchronously (key-stable),
3. recompute validation/`changed` in the relocated UI-state slice.

### Risks

- Re-derive cost on every keystroke (mitigate: derive only the affected subtree;
  memoize; consider `reselect`).
- Blank-node / ordered-list churn if any path regenerates instead of patching.
- Behavioral drift vs. the current hand-maintained `desc*` / `bf*Refs` tracking.

### Suggested incremental sub-steps

1. Extract the pure `derive()` from `recursiveResourceFromDataset` (no behavior
   change yet; assert it reproduces today's entities for fixtures).
2. Add value↔quad provenance to the derived entities.
3. Move UI/validation state to its own slice (selectors recombine).
4. Introduce stable keying (chosen option).
5. Switch one edit action (e.g. `UPDATE_VALUE`) to quad-first + targeted
   re-derive; expand to the rest.

### Verification

- `derive(quads, templates)` reproduces the current normalized entities for the
  resource fixtures (golden-master test).
- Typing in a literal preserves input focus (key stability).
- Round-trip: load → quad-first edit → save produces the expected graph;
  non-template triples still survive.

---

## 4. Stage 3 — Retire the normalized model  📋 DESIGN

**Precondition:** Stage 2's derived view is proven in production (correctness +
performance) so the normalized entities are provably redundant.

**Goal:** remove the dual representation. Quads (`entities.resourceQuads`) become
the **sole stored model**; the template-shaped view is computed **on read** via
selectors rather than stored in `entities.subjects/properties/values`.

### What gets removed / changed

- **Stored entities** — delete `entities.subjects/properties/values` and their
  reducers: the `add/update/remove` handlers in `src/reducers/resources.js` and
  the `merge*/replace*/clear*` helpers in `src/reducers/resourceHelpers.js`. The
  hand-maintained `descUriOrLiteralValueKeys` / `descWithErrorPropertyKeys` /
  `bf*Refs` bookkeeping disappears (recomputed by `derive()`).
- **Selectors** — the three-tier `selectNorm*/select*/selectFull*`
  (`src/selectors/resources.js`) become pure derivations over
  `(quads, templates, uiState)`, memoized. Components keep using the same
  selector names where possible to limit churn.
- **Parser** — `recursiveResourceFromDataset` is fully replaced by the pure
  `derive()` from Stage 2; load just stores quads.
- **GraphBuilder** — likely **retired** for the save path: since quads are
  canonical, save serializes them directly (`datasetFromQuads` →
  `jsonldFromDataset`), and the union-with-unmanaged hack from Stage 1 goes away
  because managed and unmanaged quads are no longer separated. GraphBuilder may
  remain only if a derived-from-view serialization is still needed somewhere
  (e.g. preview of unsaved structure) — to be confirmed.
- **Stage 1 limitation resolved** — with a single quad set there is no
  managed/unmanaged split and no fresh-bnode union, so the dangling-blank-node
  edge case disappears.

### Sequencing

1. Flip selectors to derive-on-read behind the existing selector API.
2. Remove writes to `entities.subjects/properties/values` (reducers become
   no-ops, then deleted).
3. Delete dead reducers/helpers and the normalized slices from `store.js`.
4. Retire/trim `GraphBuilder` and simplify the save path.

### What to measure / watch

- Selector performance under realistic resource sizes (derive-on-read can be hot;
  memoization and subtree-scoped derivation matter).
- Exact parity of serialized output before/after on the fixture corpus.
- Cypress E2E for the full edit/save flows.

### Open questions

- Is GraphBuilder fully removable, or still needed for preview/diff of unsaved
  state?
- Do any consumers depend on the normalized entity *shape* in ways selectors
  can't transparently preserve?
- How are `group` / `editGroups` / versions / relationships (currently adjacent
  to subjects) handled once subjects are gone?

---

## 5. Cross-cutting concerns

- **Performance** — the central trade of "single source of truth" is derive cost.
  Prefer subtree-scoped, memoized derivation; never full-resource re-derive on a
  keystroke.
- **Serializability** — plain quad arrays keep Redux DevTools/time-travel working.
- **Testing** — golden-master `derive()` tests vs. current entities; round-trip
  fidelity tests; focus-stability tests; Cypress E2E for edit/save.
- **Fixtures** — `USE_FIXTURES=true` load paths and `__tests__/__resource_fixtures__`
  must keep working at each stage.

## 6. Decision log

| Decision | Status |
|---|---|
| RDF representation in state | **Plain quad array** (decided) |
| Stage 2 UI/validation state location | Open — *recommend* parallel `viewState` slice |
| Stage 2 keying | Open — *recommend* nanoid-map hybrid |
| Stage 3 GraphBuilder retirement | Open — confirm preview/diff needs |
