// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { render } from "@testing-library/react"
import SuccessAlert from "components/alerts/SuccessAlert"

describe("<SuccessAlert />", () => {
  it("renders nothing when messages is empty", () => {
    const { container } = render(<SuccessAlert messages={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders each message as a paragraph inside an alert-success wrapper", () => {
    const { getByRole, getByText } = render(
      <SuccessAlert messages={["Resource saved", "Export complete"]} />
    )
    expect(getByRole("alert")).toHaveClass("alert-success")
    expect(getByText("Resource saved")).toBeInTheDocument()
    expect(getByText("Export complete")).toBeInTheDocument()
  })
})
