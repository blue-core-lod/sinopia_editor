// Golden corpus: real Blue Core records, loaded and saved with no edits.
//
// Each record in __golden_fixtures__/manifest.json is loaded into a real store
// with the real profiles it uses (recorded by refreshProfiles.mjs), then saved
// through the real saveResource, and the body PUT to the API is parsed back
// into a dataset. That output must be the input, triple for triple, with every
// blank node keeping its label. Loading and saving the output a second time
// must give the same output again.
//
// Where today's editor does change a record, its output is recorded instead and
// the record is listed in __golden_fixtures__/KNOWN_DIFFERENCES.md:
//   <record>.expected.nt         the first save, when it differs from the input
//   <record>.expected-resave.nt  the second save, when it differs from the first
//
// UPDATE_GOLDEN=1 re-records both from today's output.
import fs from "node:fs"
import _ from "lodash"
import path from "node:path"
import { newResourceFromDataset, saveResource } from "actionCreators/resources"
import { resourceTemplateIdFromDataset } from "actionCreators/resourceHelpers"
import { selectCurrentResourceKey } from "selectors/resources"
import { selectErrors } from "selectors/errors"
import { createStore } from "testUtils"
import { datasetFromN3, datasetFromJsonld } from "utilities/Utilities"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const fixturesDir = path.join(__dirname, "__golden_fixtures__")
const profilesDir = path.join(fixturesDir, "profiles")
const { records } = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "manifest.json"), "utf8"),
)

const profiles = fs
  .readdirSync(profilesDir)
  .filter((file) => file !== "ids.json")
  .map((file) => JSON.parse(fs.readFileSync(path.join(profilesDir, file))))
const profileIds = JSON.parse(
  fs.readFileSync(path.join(profilesDir, "ids.json")),
)

// The profile as the API returns it for a profile or version URI. A version
// other than the recorded one is not in the fixtures.
const profileFor = (uri) =>
  profiles.find((profile) => [profile.uri, profile.version_uri].includes(uri))

// Template search for a resource id, answered from the recorded resolutions.
const searchResultsFor = (url) => {
  const uri = profileIds[new URL(url).searchParams.get("q")]
  return { results: uri ? [profileFor(uri)] : [] }
}

const keycloak = {
  token: "golden-token",
  updateToken: jest.fn().mockResolvedValue(false),
}

const respond = (status, json) =>
  Promise.resolve({
    ok: status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(json),
  })

// Every PUT, by url: the resource itself, plus the user's history.
let puts = []
const fakeApi = (url, { method = "GET", body } = {}) => {
  const target = url.split("?")[0]
  if (method === "PUT") {
    puts.push({ url, body })
    return respond(200, {})
  }
  if (target.endsWith("/search/profile"))
    return respond(200, searchResultsFor(url))
  const profile = profileFor(decodeURI(target))
  return profile ? respond(200, profile) : respond(404, { error: "Not found" })
}

const errorsIn = (store) => selectErrors(store.getState(), "golden") || []

// Load the dataset the way the editor does: its own hasResourceTemplate wins,
// and the manifest stands in for the template a cataloger would pick.
const loadAndSave = async (dataset, record) => {
  const store = createStore()
  const resourceTemplateId =
    resourceTemplateIdFromDataset(record.uri, dataset) ||
    record.resourceTemplate

  await store.dispatch(
    newResourceFromDataset(dataset, record.uri, resourceTemplateId, "golden"),
  )
  expect(errorsIn(store)).toEqual([])

  puts = []
  await store.dispatch(
    saveResource(
      selectCurrentResourceKey(store.getState()),
      "stanford",
      [],
      "golden",
      keycloak,
    ),
  )
  expect(errorsIn(store)).toEqual([])
  const saved = puts.filter(({ url }) => url === record.uri)
  expect(saved).toHaveLength(1)

  return datasetFromJsonld(JSON.parse(JSON.parse(saved[0].body).data))
}

let originalEnv
beforeAll(() => {
  // Stage's configuration, so the recorded profile URIs are local to the API.
  originalEnv = window._env_
  window._env_ = { SINOPIA_API_BASE_URL: "https://stage.bcld.info/api" }
  global.fetch = jest.fn(fakeApi)
})

afterAll(() => {
  window._env_ = originalEnv
})

// The triples of a dataset as sorted N-Triples lines, blank node labels and all.
const triplesOf = (dataset) =>
  dataset.toString().split("\n").filter(Boolean).sort()

// The recorded output for a save, or the dataset it should be unchanged from.
// UPDATE_GOLDEN=1 records the output when it differs, and drops a stale record.
const expectedFor = async (expectedPath, output, unchangedFrom) => {
  if (process.env.UPDATE_GOLDEN) {
    if (_.isEqual(triplesOf(output), triplesOf(unchangedFrom)))
      fs.rmSync(expectedPath, { force: true })
    else fs.writeFileSync(expectedPath, `${triplesOf(output).join("\n")}\n`)
  }
  return fs.existsSync(expectedPath)
    ? datasetFromN3(fs.readFileSync(expectedPath, "utf8"))
    : unchangedFrom
}

describe("golden corpus: load and save with no edits", () => {
  it.each(records.map((record) => [record.file, record]))(
    "%s",
    async (file, record) => {
      const recordPath = path.join(fixturesDir, file)
      const input = await datasetFromN3(fs.readFileSync(recordPath, "utf8"))

      const firstSave = await loadAndSave(input, record)
      expect(triplesOf(firstSave)).toEqual(
        triplesOf(
          await expectedFor(
            recordPath.replace(/\.nt$/, ".expected.nt"),
            firstSave,
            input,
          ),
        ),
      )

      // Stable: reopening and saving the output changes nothing more.
      const secondSave = await loadAndSave(firstSave, record)
      expect(triplesOf(secondSave)).toEqual(
        triplesOf(
          await expectedFor(
            recordPath.replace(/\.nt$/, ".expected-resave.nt"),
            secondSave,
            firstSave,
          ),
        ),
      )
    },
  )
})
