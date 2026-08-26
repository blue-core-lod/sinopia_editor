import request from "supertest"
import app from "../app"

describe("GET /", () => {
  it("responds with ok status as HTML", async () => {
    const response = await request(app).get("/")

    expect(response.status).toBe(200)
    expect(response.type).toBe("text/html")
  })
})

describe("GET /health", () => {
  it("responds with ok status as JSON", async () => {
    const response = await request(app).get("/health")

    expect(response.status).toBe(200)
    expect(response.type).toBe("application/json")
    expect(response.body).toEqual({ status: "ok" })
  })
})
