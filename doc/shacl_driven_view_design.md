# SHACL-driven view: design

**Status:** design / experiment proposal
**Branch base:** `rdf-quad-array-stage1` (commit `5ad9faa`)
**Companion doc:** [`rdf_source_of_truth_roadmap.md`](./rdf_source_of_truth_roadmap.md) (Stage 1/2/3)

## Goal

Drive the editor's structure, component selection, and validation from a **loaded SHACL
shapes graph** keyed by RDF class, instead of from Sinopia **ResourceTemplate** JSON-LD.
The resource's own RDF (the canonical quad array introduced in Stage 1,
`entities.resourceQuads`) supplies the data; the SHACL `NodeShape`/`PropertyShape` graph
supplies the structure and constraints.

The motivating shapes graph is the BIBFRAME `big:` profile (Monograph/Work, Title, Agent,
Contribution, Relation, Series, …) using `sh:NodeShape`, `sh:PropertyShape`, `sh:path`,
`sh:minCount`/`sh:maxCount`, `sh:node`, `sh:severity`, `sh:targetClass`, and `sh:or`.

There are two ways to reach this. This document specifies **Option A** (the low-risk
experiment) in full, then analyzes **Option B** (the long-term destination) in depth.

---

## The inversion

Today:

```
ResourceTemplate JSON-LD ──TemplatesBuilder──▶ subjectTemplate ─┐
                                                                │
resource quads ──recursiveResourceFromDataset(quads, subjectTemplate)──▶ view
                                                                │
view ──resourceValidationHelpers──▶ errors    view ──GraphBuilder──▶ save quads
```

Structure (`subjectTemplate.propertyTemplates`), component choice
(`InputLiteral`/`InputLookup`/`NestedResource`), and validation rules (`required`,
`validationRegex`, `validationDataType`) all originate in the ResourceTemplate.

The experiment replaces that origin with a SHACL NodeShape graph.

---

## Option A — SHACL → `subjectTemplate` adapter

### Principle

Introduce a `ShapesBuilder` that is a **drop-in peer of `TemplatesBuilder`** (`src/TemplatesBuilder.js`).
It consumes the SHACL dataset and emits the **exact same `subjectTemplate` object shape** the
rest of the app already expects (`{ key, class, classes, label, propertyTemplates,
propertyTemplateKeys, … }`, each `propertyTemplate` being `{ key, label, uris, defaultUri,
type, component, required, repeatable, ordered, validationRegex, validationDataType,
valueSubjectTemplateKeys, … }`).

Because the emitted shape is unchanged, `recursiveResourceFromDataset`, the three-tier
selectors, `PropertyComponent`, and `GraphBuilder` keep working untouched. The only deep
changes are (1) **how a shape is selected for a subject** (by `rdf:type`, not by an explicit
template id) and (2) **severity** in validation.

This is the minimal-blast-radius path and the correct one to prove the idea on a branch.

### SHACL → template field mapping

| SHACL construct | `subjectTemplate` / `propertyTemplate` field | Notes |
|---|---|---|
| `sh:NodeShape` | `subjectTemplate` | one per shape |
| `sh:targetClass` | `subjectTemplate.classes` + dispatch key | replaces explicit `resourceTemplateId` |
| `rdfs:label` (shape) | `subjectTemplate.label` | |
| `sh:property` → `sh:PropertyShape` | `propertyTemplate` | property shapes are blank nodes; `dataset.match` them |
| `sh:path` | `propertyTemplate.uris` / `defaultUri` | the predicate |
| `rdfs:label` (prop shape) | `propertyTemplate.label` | |
| `sh:minCount >= 1` | `required` | also governs how many empty rows to expand |
| `sh:maxCount` | `repeatable` (absent/`>1` → repeatable; `1` → single) | **upper-bound enforcement is new** |
| `sh:node <big:X>` | `valueSubjectTemplateKeys` + `component:"NestedResource"` | resolves to the `<big:X>` NodeShape |
| `sh:datatype` | `validationDataType` + literal | |
| `sh:pattern` | `validationRegex` | |
| `sh:nodeKind` (`sh:IRI`/`sh:Literal`) | `type` (`uri`/`literal`) | |
| `sh:class` | authority / nested hint | see gaps |
| `sh:order` | `ordered` / display order | `big:` graph has none → declaration order |
| `sh:severity` | **new** — per-constraint severity | `Violation` / `Warning` / `Info` |
| `sh:or ( … )` | **new** — alternative constraints | e.g. Agent needs `rdfs:label` **or** `bf:code` |

Nested-resource resolution already works the SHACL way: `selectResourceTemplateId`
(`src/actionCreators/resourceHelpers.js:494`) matches a nested object's `rdf:type` against
`subjectTemplate.classes`. SHACL's `sh:node` + `sh:targetClass` is the same match, so if
`ShapesBuilder` fills `classes` from `targetClass`, nested walking is free.

### Gaps SHACL does not carry

ResourceTemplates encode UI affordances that have no standard SHACL equivalent. The adapter
must bridge these:

1. **Component selection (largest gap).** SHACL says "IRI with `sh:class bf:Agent`" but not
   "use a QA lookup against LCNAF vs. a dropdown list vs. a free URI box." The `big:` graph
   carries no `dash:editor` and no authority hints. Bridge with a heuristic
   `componentFor(propertyShape)`:
   - has `sh:node` → `NestedResource`
   - `sh:nodeKind sh:IRI` (or has `sh:class`) → `InputList` / `InputLookup`, default `InputURI`
     when no authority is known
   - else → `InputLiteral`

   Longer term, annotate PropertyShapes with `dash:editor` or a Sinopia predicate and map
   authorities off `sh:class`; for the experiment the heuristic suffices.
2. **Authority configs** (which QA endpoint) — not derivable; default to plain URI input, or
   keep a side-table keyed by `sh:class`.
3. **Defaults** (`userIdDefault`, `dateDefault`, literal defaults), **remarks / help text /
   `remarkUrl`**, **`labelSuppressed` / `immutable` / `suppressible`** — absent in SHACL;
   drop for the experiment or carry a small annotation vocab.
4. **Ordered RDF lists** — SHACL does not say "serialize as an `rdf:List`." The `big:` graph
   does not need it; flag as unsupported.

### File-by-file changes

1. **`src/ShapesBuilder.js`** (new) — peer of `TemplatesBuilder`. Input: SHACL dataset + a
   target NodeShape IRI (or target class). Output: a `subjectTemplate` in the existing shape,
   `propertyTemplates` built from each `sh:property`, `classes` from `sh:targetClass`, the
   heuristic `component`, plus `severity` on each `propertyTemplate`.
2. **Shapes loading** — analog of `loadResourceTemplate` (`src/actionCreators/templates.js`).
   Load the `.ttl` once (fixture or endpoint), parse to a dataset, index NodeShapes by
   `sh:targetClass`. Replace the `resourceTemplatePromises` cache with a shapes index. For the
   experiment, load from a static fixture behind a `USE_SHACL=true` flag so the template path
   is undisturbed.
3. **Shape selection** — `resourceTemplateIdFromDataset` / `findRootResourceTemplateId` (which
   read a `hasResourceTemplate` triple from the data) are replaced by **dispatch on `rdf:type`**:
   read the subject's types, find the NodeShape whose `sh:targetClass` matches. This is a real
   behavior change — saved resources currently embed a `hasResourceTemplate` pointer; SHACL keys
   purely off class. Must decide how to resolve a subject matching multiple shapes (the `big:`
   Work targets both `bf:Monograph` and `bf:Text`).
4. **`recursiveResourceFromDataset`** (`resourceHelpers.js`) — unchanged if `ShapesBuilder`
   emits the standard shape. Watch `newNestedResourceFromObject` → `selectResourceTemplateId`:
   point it at the shapes index instead of `loadResourceTemplate`.
5. **Validation** (`src/reducers/resourceValidationHelpers.js` + the validation reducer) — the
   substantive new work:
   - add **`maxCount`** (cardinality upper bound); generalize `required` from "first value
     non-empty" to **`minCount`**;
   - thread **severity** through the error model. Today `state.editor.errors[errorKey]` holds
     flat strings rendered uniformly by `<Alerts/>`. To honor `sh:Violation`/`sh:Warning`/
     `sh:Info`, carry a severity per validation and style/sort accordingly, and decide which
     severities block save (presumably only `Violation`). This is the most visible payoff.
   - `sh:or` groups (Agent: label-or-code) need an any-of evaluator.
6. **`GraphBuilder` / save** — unchanged. Stage 1 already unions preserved unmanaged quads, and
   with SHACL the "unmanaged" set becomes "quads whose predicate matches no PropertyShape in the
   matched NodeShape" — same mechanism, so non-shape triples still round-trip.
7. **`PropertyComponent.jsx`** — unchanged (still switches on `propertyTemplate.component`),
   given the heuristic populates `component`.

### Two genuinely new behaviors

- **Class-based shape dispatch** (replacing explicit template ids), including multi-class /
  multi-shape resolution. This is what makes it "SHACL" rather than templates in Turtle clothing.
- **Severity** — `Violation` / `Warning` / `Info`. Requires extending the error/validation model
  end to end. Highest value, most invasive.

### Incremental sub-steps

1. `ShapesBuilder` emits a `subjectTemplate` from one NodeShape; unit-test the mapping table.
2. Fixture loader + shapes index behind `USE_SHACL`; dispatch root shape by `rdf:type`.
3. Load a Monograph fixture and render it (component heuristic only; no severity yet).
4. Add cardinality (`minCount`/`maxCount`) validation in the existing binary-error model.
5. Add severity end to end (model → `<Alerts/>` → save-gating).
6. `sh:or` evaluator; nested shapes (`Title`, `Agent`, `Contribution`, `Relation`, `Series`).

### Verification

- Unit: SHACL `.ttl` → `subjectTemplate` snapshot for each `big:` shape; component heuristic;
  `sh:targetClass` dispatch incl. multi-class.
- Validation: minCount/maxCount/severity/`sh:or` cases.
- Round-trip: load a Monograph with a non-shape triple, save, confirm it survives (reuses the
  Stage 1 unmanaged-quads union).
- Manual: `USE_SHACL=true USE_FIXTURES=true npm run dev-start`, load a Monograph, confirm it
  renders and that warnings vs. violations display distinctly.

### Risks / open decisions (Option A)

- **Multi-shape dispatch** — resolution when a subject's types match more than one NodeShape.
- **Severity model** — schema for severity in `state.editor.errors`; which severities block save.
- **Component fidelity** — the heuristic cannot recover lookups/authorities without annotation;
  expect plainer inputs than the template UI until a `dash:`/Sinopia annotation vocab is added.
- **Dropped `hasResourceTemplate` dispatch** — diverges from how saved resources self-describe.

---

## Option B — derive the view directly from quads + shapes (full analysis)

> Preferred long-term. This is the convergence of **Stage 2** (invert editing: quads canonical,
> view derived), **Stage 3** (retire the normalized model), and **SHACL replacing templates**,
> done as one coherent architecture rather than an adapter bolted onto the old machine.

### What B is

No `subjectTemplate` intermediary and no `entities.subjects/properties/values`. The Redux
source of truth is the **canonical quad array per resource** (`entities.resourceQuads`, from
Stage 1) plus a **loaded shapes index**. The view the components render is a **pure derivation**:

```
view = derive(resourceQuads, shapesIndex, uiState)
```

where `shapesIndex` maps `targetClass → NodeShape` and `uiState` holds the non-RDF concerns
(expanded/collapsed, focus, in-progress edits, per-node validation display toggles). There is no
parse-into-entities step and no build-graph-from-entities step; both `TemplatesBuilder`-style
parsing and `GraphBuilder` largely dissolve.

### How B differs from A

| Concern | A (adapter) | B (direct derivation) |
|---|---|---|
| Structure source | SHACL → `subjectTemplate` object | shapes index consumed directly |
| Resource state | normalized `subjects/properties/values` | quad array (canonical) + `uiState` |
| View construction | `recursiveResourceFromDataset` (async, dispatch-driven) | `derive()` (sync, pure, memoized selectors) |
| Save | `GraphBuilder` from entities + unmanaged union | write canonical quads directly |
| Edit | dispatch entity actions; rebuild graph at save | quad add/remove; view re-derives |
| Validation | extend `resourceValidationHelpers` | run a SHACL processor over the quads |
| "Unmanaged" triples | preserved subset re-emitted on save | nonexistent — all quads are the source |

### The `derive()` function

`derive(rootSubject, resourceQuads, shapesIndex)` walks the data graph guided by the shape:

1. Find the root subject's `rdf:type` quads → resolve its `NodeShape` via `sh:targetClass`.
2. For each `sh:PropertyShape` in the shape, in `sh:order` (then declaration) order:
   - Collect data quads whose predicate = `sh:path`.
   - Render one value-row per object; pad with empty rows to satisfy `sh:minCount`; cap input
     affordance at `sh:maxCount`.
   - If `sh:node` is present, the object is a nested subject → recurse with the referenced
     NodeShape.
   - Component per row from `sh:nodeKind`/`sh:datatype`/`sh:class` + annotation vocab.
3. Quads whose predicate matches no PropertyShape are surfaced as "extra" rows (read-only) rather
   than silently dropped — the Stage 1 unmanaged concept becomes a first-class, always-visible
   view category instead of a saved side-set.

This is a Redux **selector**, memoized per `(resourceKey, shapesVersion)`, replacing the
three-tier `selectNorm*/select*/selectFull*` family with derive-on-read.

### Editing in B

Edits become **quad mutations**, not entity mutations:

- Edit a literal → replace the object term of the matching quad (same subject + predicate +
  position), dispatch `setResourceQuads` with the new array.
- Add a repeatable value → append a quad.
- Add a nested resource → mint a blank node, add its `rdf:type` quad and a linking quad.
- Delete → remove the quad (and, for nested subjects, its subtree).

The view re-derives from the changed quads. This is exactly the **Stage 2 edit loop** described
in the roadmap, with SHACL supplying the structure that templates supplied there.

#### The keying problem (the central hard problem, shared with Stage 2)

React needs stable keys across re-derivation; quads have no identity. Two strategies (from the
roadmap's decision log):

- **Position keys** — key a row by `(subjectId, predicate, index)`. Simple, but index shifts on
  insert/delete reorder rows and literal edits can collide.
- **nanoid-map hybrid** (recommended) — maintain a side map from a quad's stable content
  signature to a nanoid in `uiState`, so a row keeps its key across edits. Adds a reconciliation
  step on each derive.

This problem is **identical in A's Stage-2 successor and in B**; B just confronts it immediately
instead of deferring it. It is the single biggest reason B is more than "A without the adapter."

### Validation in B

Replace the hand-written `resourceValidationHelpers` with a **SHACL validation pass** over the
resource quads against the shapes graph — either a library (`rdf-validate-shacl` /
`shacl-engine`) or a focused in-house evaluator covering the constructs the `big:` profile uses
(`minCount`, `maxCount`, `datatype`, `pattern`, `node`, `class`, `or`, `severity`). Output is a
list of results `{ focusNode, path, severity, message }` mapped onto view rows by
`(subject, path)`. Severity is native to SHACL here — no retrofit. Save-gating keys off
`sh:Violation`.

A library buys conformance (full SHACL Core, `sh:or`/`sh:and`/`sh:not`, nested shapes,
`sh:in`/`sh:hasValue`, deactivation) at the cost of a dependency and async/perf characteristics
to manage; an in-house evaluator stays small and synchronous but only covers what you implement.

### Component selection in B

Same gap as A — SHACL alone cannot say "lookup vs. list." B should commit to an **annotation
vocabulary** (`dash:editor`, or Sinopia predicates on PropertyShapes) plus an authority map keyed
by `sh:class`, since B is the long-lived architecture and the heuristic-only fidelity loss
acceptable for an experiment is not acceptable permanently.

### What gets deleted in B

- `entities.subjects/properties/values` and their reducers/handlers.
- The three-tier selector family (`selectNorm*/select*/selectFull*`) → replaced by `derive`.
- `recursiveResourceFromDataset` and the entire dataset→entities parser in `resourceHelpers.js`.
- `TemplatesBuilder` (and `ShapesBuilder`, if A was built first) → shapes are consumed directly,
  not pre-built into `subjectTemplate` objects.
- Most of `GraphBuilder` — save writes canonical quads; the managed/unmanaged split and its
  dangling-blank-node edge case dissolve.

This is precisely the Stage 3 deletion list, with templates removed too.

### Hard problems unique to / amplified in B

1. **Stable keying across re-derivation** (above) — the gating problem.
2. **Ordered RDF lists** — `derive` must both read `rdf:List` structure into ordered rows and
   write it back on edit; SHACL does not describe list-shaped paths, so this needs an annotation
   or convention.
3. **Performance** — `derive` runs on every render of a large resource; must be memoized
   carefully and incremental on quad change, or large Monographs will re-walk the whole graph per
   keystroke. The current normalized model gets per-entity memoization "for free."
4. **Cycles / shared blank nodes** — a pure graph walk must guard against cyclic references and
   nodes reachable by multiple paths; the template model sidesteps this by construction.
5. **Multi-shape dispatch** — same as A, but now in the hot derive path.
6. **Blank-node identity on save** — writing quads directly means the editor owns blank-node
   labels end to end (an improvement over GraphBuilder minting fresh ones, but it must be
   deliberate so round-trips are stable).

### Migration path A → B

A is a stepping stone, not a detour, **if** B is the goal:

1. Ship A (SHACL renders via the adapter; severity + cardinality land in validation).
2. Build `derive(quads, shapesIndex, uiState)` alongside, validated against A's output on the
   same fixtures (A becomes the oracle for B).
3. Move editing from entity actions to quad mutations (Stage 2), solving keying.
4. Flip components from the normalized selectors to `derive`; delete the normalized model,
   parser, and `GraphBuilder` (Stage 3).
5. Replace adapter validation with a SHACL processor.
6. Delete `ShapesBuilder` and `subjectTemplate`.

Each step is independently testable, and A's rendered output + Stage 1's round-trip tests serve
as regression oracles throughout.

### Cost / benefit

**Benefits of B:** one source of truth (quads); no fused-state bug class; SHACL conformance for
validation; no lossy managed/unmanaged split; the editor finally matches the "RDF is the data"
mental model the whole roadmap is chasing.

**Costs/risks of B:** the keying problem must be solved well; `derive` performance must be
engineered, not assumed; SHACL coverage (lists, advanced constraints) is real work; it touches
nearly every component and selector at once unless sequenced through A.

### Recommendation

Build **A first** as the experiment — it proves SHACL-driven structure and severity at low risk
and produces the oracle and the loading/dispatch/validation groundwork B needs. Then converge to
**B** by following the migration path, treating it as the SHACL-flavored execution of Stages 2–3
in the companion roadmap. Do **not** attempt B cold: the keying, performance, and SHACL-coverage
problems are best attacked with A's rendered output as a reference implementation.
