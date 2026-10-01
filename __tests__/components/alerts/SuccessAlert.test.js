// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { render, screen } from "@testing-library/react"
import SuccessAlert from "components/alerts/SuccessAlert"

describe("<SuccessAlert />", () => {
  it("renders nothing when messages is empty", () => {
    render(<SuccessAlert messages={[]} />)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("renders each message as a paragraph inside an alert-success wrapper", () => {
    render(<SuccessAlert messages={["Resource saved", "Export complete"]} />)
    expect(screen.getByRole("alert")).toHaveClass("alert-success")
    expect(screen.getByText("Resource saved")).toBeInTheDocument()
    expect(screen.getByText("Export complete")).toBeInTheDocument()
  })
})
