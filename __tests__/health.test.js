import express from "express"
import request from "supertest"
import Package from "../package.json"
import { healthPayload, registerHealthRoute } from "../src/Health"
import webpackConfig from "../webpack.config"

const expectedPayload = { status: "ok", version: Package.version }

describe("healthPayload", () => {
  it("reports ok", () => {
    expect(healthPayload().status).toBe("ok")
  })

  it("reports the package version", () => {
    expect(healthPayload().version).toBe(Package.version)
  })

  it("reports a version that looks like a release", () => {
    expect(healthPayload().version).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe("registerHealthRoute", () => {
  it("answers GET /health with JSON even when a catch-all is present", async () => {
    const app = express()
    registerHealthRoute(app)
    app.get("*", (req, res) => res.type("html").send("<html>index</html>"))

    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/json")
    expect(response.body).toEqual(expectedPayload)
  })
})

describe("dev server health middleware", () => {
  const setupMiddlewares = () => {
    const existingEntry = { name: "existing-middleware" }
    const middlewares = webpackConfig.devServer.setupMiddlewares(
      [existingEntry],
      {}
    )
    return { middlewares, existingEntry }
  }

  it("runs ahead of the other dev server middlewares", () => {
    const { middlewares, existingEntry } = setupMiddlewares()
    const healthIndex = middlewares.findIndex((m) => m.path === "/health")

    expect(healthIndex).toBeGreaterThanOrEqual(0)
    expect(healthIndex).toBeLessThan(middlewares.indexOf(existingEntry))
  })

  it("keeps the existing dev server middlewares", () => {
    const { middlewares } = setupMiddlewares()

    expect(middlewares.map((each) => each.name)).toContain(
      "existing-middleware"
    )
  })

  it("responds with JSON rather than index.html", async () => {
    const { middlewares } = setupMiddlewares()
    const healthMiddleware = middlewares.find((m) => m.path === "/health")
    const app = express()
    app.use(healthMiddleware.path, healthMiddleware.middleware)

    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/json")
    expect(response.body).toEqual(expectedPayload)
  })
})
