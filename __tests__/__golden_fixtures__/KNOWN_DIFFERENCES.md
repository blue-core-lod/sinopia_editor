# Golden corpus: known differences

Records whose load-and-save output, with no edits, is not the input triple for triple (blank node labels included). Each one's current output is recorded in `<record>.expected.nt` (first save) and, when a second save changes it again, `<record>.expected-resave.nt`, so that `goldenCorpus.test.js` pins today's behavior. Each difference becomes a row in the Phase 0b load/save policy table, where it is marked _chosen_ or _inherited_.

Profiles are as recorded by `refreshProfiles.mjs`. Refreshing them changes the version URI written on save, so re-record outputs afterwards with `UPDATE_GOLDEN=1 npx jest __tests__/goldenCorpus.test.js`, and review the diff of the `.nt` files before committing.

There are none at present: every record in the corpus is saved back exactly as it was loaded.
