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
