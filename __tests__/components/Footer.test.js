import React from "react"
import { render, screen, within } from "@testing-library/react"
import Footer from "components/Footer"

describe("<Footer />", () => {
  it("opens an email to Blue Core from Contact us", () => {
    render(<Footer />)

    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute(
      "href",
      "mailto:contact@bluecore.info",
    )
  })

  it("lists the same applications as the Switch application menu", () => {
    render(<Footer />)

    const applications = screen.getByRole("navigation", {
      name: "Applications",
    })
    const links = within(applications).getAllByRole("link")
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Search", "/api/search"],
      ["Marva", "/marva/"],
      ["Sinopia", "/sinopia/"],
      ["Toolbox", "/toolbox/"],
      ["API", "/api/docs"],
      ["Keycloak", "/keycloak/"],
      ["Workflows", "/workflows/"],
    ])
  })

  it("shows the Blue Core logo", () => {
    render(<Footer />)

    screen.getByRole("img", { name: "Blue Core" })
  })
})
