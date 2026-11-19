import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import DashboardSection from "components/dashboard/DashboardSection"

const renderSection = () =>
  render(
    <DashboardSection id="recent-things" title="Recent things">
      <p>A recent thing</p>
    </DashboardSection>,
  )

describe("<DashboardSection />", () => {
  it("renders the title as an expanded toggle in a heading", () => {
    renderSection()

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Recent things",
    })
    const toggle = screen.getByRole("button", { name: "Recent things" })
    expect(heading).toContainElement(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(toggle).toHaveAttribute("aria-controls", "recent-things-content")
    expect(toggle).not.toHaveClass("collapsed")
    expect(screen.getByText("A recent thing")).toBeVisible()
  })

  it("collapses and expands the section when the title is clicked", () => {
    renderSection()
    const toggle = screen.getByRole("button", { name: "Recent things" })

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveClass("collapsed")
    expect(screen.getByText("A recent thing")).not.toBeVisible()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("A recent thing")).toBeVisible()
  })
})
