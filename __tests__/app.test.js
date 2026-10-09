import fs from "fs"
import path from "path"
import request from "supertest"
import Package from "../package.json"
import app from "../app"

const indexHtml = path.join(__dirname, "..", "dist", "index.html")

describe("GET /", () => {
  // dist/ is gitignored and CI does not build before running tests, so stand in
  // a placeholder when there is no real build output. Without this the route
  // 404s on a clean checkout even though it works locally.
  let created = false

  beforeAll(() => {
    if (fs.existsSync(indexHtml)) return
    fs.mkdirSync(path.dirname(indexHtml), { recursive: true })
    fs.writeFileSync(indexHtml, "<html><body>test</body></html>")
    created = true
  })

  afterAll(() => {
    if (created) fs.rmSync(indexHtml)
  })

  it("responds with ok status as HTML", async () => {
    const response = await request(app).get("/")

    expect(response.status).toBe(200)
    expect(response.type).toBe("text/html")
  })
})

describe("GET /health", () => {
  it("responds with ok status and the package version as JSON", async () => {
    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/json")
    expect(response.body).toEqual({ status: "ok", version: Package.version })
  })
})

describe("static file exposure", () => {
  const distDir = path.join(__dirname, "..", "dist")
  const asset = path.join(distDir, "app-test-asset.js")

  beforeAll(() => {
    fs.mkdirSync(distDir, { recursive: true })
    fs.writeFileSync(asset, "window.appTestAsset = true")
  })

  afterAll(() => {
    fs.rmSync(asset)
  })

  it.each([
    "/package-lock.json",
    "/package.json",
    "/src/Config.js",
    "/app.js",
    "/backup.env",
    "/CLAUDE.md",
  ])("does not serve repository file %s", async (url) => {
    const response = await request(app).get(url)

    expect(response.status).toBe(404)
  })

  it.each([
    ["/.git/HEAD", "ref: refs/"],
    ["/.git/config", "[core]"],
  ])("does not serve git metadata %s", async (url, contents) => {
    const response = await request(app).get(url)

    expect(response.text).not.toContain(contents)
  })

  it("serves webpack output from /dist", async () => {
    const response = await request(app).get("/dist/app-test-asset.js")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/javascript")
    expect(response.text).toBe("window.appTestAsset = true")
  })

  it("404s a missing asset rather than answering with index.html", async () => {
    const response = await request(app).get("/dist/missing.js")

    expect(response.status).toBe(404)
  })

  it.each([
    ["/dist/missing.js", 404],
    ["/dist/.hidden", 403],
  ])("answers %s with a bare %i and no stack trace", async (url, status) => {
    const response = await request(app).get(url)

    expect(response.status).toBe(status)
    expect(response.text).not.toContain(path.join(__dirname, ".."))
  })
})
