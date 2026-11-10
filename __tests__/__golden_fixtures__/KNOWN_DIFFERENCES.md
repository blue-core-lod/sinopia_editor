# Golden corpus: known differences

Records whose load-and-save output, with no edits, is not isomorphic to the input. Each one's current output is recorded in `<record>.expected.nt` (first save) and, when a second save changes it again, `<record>.expected-resave.nt`, so that `goldenCorpus.test.js` pins today's behavior. Each difference becomes a row in the Phase 0b load/save policy table, where it is marked _chosen_ or _inherited_.

Profiles are as recorded by `refreshProfiles.mjs`. Refreshing them changes the version URI written on save, so re-record outputs afterwards with `UPDATE_GOLDEN=1 npx jest __tests__/goldenCorpus.test.js`, and review the diff of the `.nt` files before committing.

## moon_handbooks_zion_bryce.nt

Serial Work `https://stage.bcld.info/works/6a6a9253-8d9b-4b99-a483-571644f372e0` from batch ingest. It has no `sinopia:hasResourceTemplate`, so it is loaded with `bluecore:bf2:Monograph:Work` (profile `deeb77f0…`, version 4315322), which is what a cataloger would pick: stage has no Serial Work profile.

First save, 188 triples to 166:

| Difference | Count | Notes |
|---|---|---|
| `sinopia:hasResourceTemplate` added, naming the profile version URI | +1 | By design since #190. |
| Untagged literals written back with `@en` (titles, part names, `madsrdf:authoritativeLabel`, a note, a `bf:code`, `bf:edition`, an admin-metadata date and `catalogerId`) | 19 | The resource default language is applied on load (#191). Also tags values that are not language-bearing: `bf:code "13"`, `bf:date "2026-09-12"`. |
| `rdf:type` written onto referenced external IRIs (`bf:Agent`, `bf:Content`, `bf:DescriptionAuthentication`, `bf:GeographicCoverage`, `bf:GenreForm` ×2, `bf:Language`, `bf:Organization`, `bf:Status`) | +9 | The type comes from the template class of the lookup the IRI loaded into, and is asserted about an LC/FAST IRI. |
| **Every `madsrdf:componentList` dropped**, with its RDF list (`rdf:first`/`rdf:rest`) | −6 lists, −32 triples | **Data loss.** Five LC subject IRIs that were list members (`sh85006537`, `sh85019837`, `sh85149885`, `sh91004723`, `n79021759-781`) no longer appear in the record. The inline `madsrdf:GenreForm "Guides"` and `madsrdf:Topic` members survive, but nothing links to them any more. The list triples are neither written back by the form (`bluecore:bf2:madsrdf:Topic:Complex`'s ordered `componentList` property) nor kept as unused RDF. Needs a ticket (follows on from #127). |

Second save (`expected-resave.nt`), not stable:

| Difference | Count | Notes |
|---|---|---|
| The date on the second `bf:AdminMetadata` (`bf:agent` `organizations/cbc`, `bf:status` `mstatus/c`) gains `@en` | 1 | Not yet traced. Likely cause: on the first load this node is not the one the template's admin-metadata property takes, so it passes through untouched, and on the second load it is, so the default language is applied. If so, which of two sibling nodes the form takes depends on dataset order. |
