// Re-records the profiles the golden corpus loads with, from the live API.
//
//   node __tests__/__golden_fixtures__/refreshProfiles.mjs
//
// Starts from each record's resourceTemplate in manifest.json and follows every
// nested template reference. A reference by URI is fetched as the editor
// fetches it; a reference by template id is resolved through profile search,
// as the editor does, and recorded in profiles/ids.json. Each response is saved
// verbatim as profiles/<uuid>.json, version_uri included, so a save records the
// same template version the fixtures were made with.
//
// Refreshing changes the version URIs written on save, so recorded outputs
// (*.expected.nt) need re-recording afterwards with UPDATE_GOLDEN=1.
import fs from "node:fs"
import path from "node:path"

const dir = path.dirname(new URL(import.meta.url).pathname)
const profilesDir = path.join(dir, "profiles")
const manifest = JSON.parse(
  fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
)

const SINOPIA = "http://sinopia.io/vocabulary/"
const ACCEPT = { Accept: "application/vnd.sinopia+json" }

const getJson = async (url) => {
  const resp = await fetch(url, { headers: ACCEPT })
  if (!resp.ok) throw new Error(`${url} returned ${resp.status}`)
  return resp.json()
}

const valuesOf = (profile, predicate) =>
  profile.data.flatMap((node) =>
    (node[`${SINOPIA}${predicate}`] || []).map(
      (value) => value["@id"] ?? value["@value"],
    ),
  )

const resourceIdOf = (profile) =>
  profile.data.find((node) => node["@id"] === profile.uri)?.[
    `${SINOPIA}hasResourceId`
  ]?.[0]?.["@value"]

// Profile search lives under the API base; profile URIs are on the site root.
const searchUrlFor = (profileUri, id) =>
  `${new URL(profileUri).origin}/api/search/profile?${new URLSearchParams({
    q: id,
    limit: 50,
  })}`

// A dangling id is recorded as null, so the test's search finds nothing for it,
// just as the live search does.
const resolveId = async (fromUri, id) => {
  const { results } = await getJson(searchUrlFor(fromUri, id))
  const match = results.find((profile) => resourceIdOf(profile) === id)
  if (!match) console.warn(`No profile has resource id ${id} (from ${fromUri})`)
  return match?.uri ?? null
}

const profiles = new Map()
const ids = new Map()
const queue = manifest.records.map((record) => record.resourceTemplate)

while (queue.length > 0) {
  const ref = queue.shift()
  const uri = ref.split("/version/")[0]
  if (profiles.has(uri)) continue

  const profile = await getJson(`${encodeURI(ref)}?expand=true`)
  profiles.set(uri, profile)

  for (const nested of valuesOf(profile, "hasResourceTemplateId")) {
    if (/^https?:\/\//.test(nested)) {
      queue.push(nested)
    } else if (!ids.has(nested)) {
      const resolved = await resolveId(uri, nested)
      ids.set(nested, resolved)
      if (resolved) queue.push(resolved)
    }
  }
}

fs.rmSync(profilesDir, { recursive: true, force: true })
fs.mkdirSync(profilesDir)
for (const profile of profiles.values()) {
  fs.writeFileSync(
    path.join(profilesDir, `${profile.uuid}.json`),
    `${JSON.stringify(profile, null, 2)}\n`,
  )
}
fs.writeFileSync(
  path.join(profilesDir, "ids.json"),
  `${JSON.stringify(Object.fromEntries(ids), null, 2)}\n`,
)
console.log(`Recorded ${profiles.size} profiles in ${profilesDir}`)
