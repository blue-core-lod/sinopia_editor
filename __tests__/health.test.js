import express from "express"
import request from "supertest"
import { healthPayload, registerHealthRoute } from "../src/Health"
import webpackConfig from "../webpack.config"

describe("healthPayload", () => {
  it("reports ok", () => {
    expect(healthPayload()).toEqual({ status: "ok" })
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
    expect(response.body).toEqual({ status: "ok" })
  })
})

describe("dev server health middleware", () => {
  const setupMiddlewares = () => {
    const existing = [{ name: "existing-middleware" }]
    return {
      middlewares: webpackConfig.devServer.setupMiddlewares(existing, {}),
      existing,
    }
  }

  it("runs ahead of the other dev server middlewares", () => {
    const { middlewares } = setupMiddlewares()

    expect(middlewares[0].path).toBe("/health")
  })

  it("keeps the existing dev server middlewares", () => {
    const { middlewares } = setupMiddlewares()

    expect(middlewares.map((each) => each.name)).toContain(
      "existing-middleware"
    )
  })

  it("responds with JSON rather than index.html", async () => {
    const { middlewares } = setupMiddlewares()
    const app = express()
    app.use(middlewares[0].path, middlewares[0].middleware)

    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/json")
    expect(response.body).toEqual({ status: "ok" })
  })
})
