import React from "react"
import { render, screen } from "@testing-library/react"
import Footer from "components/Footer"

describe("<Footer />", () => {
  it("renders the shared Blue Core footer", () => {
    render(<Footer />)

    expect(screen.getByTestId("bluecore-footer")).toBeInTheDocument()
  })
})
