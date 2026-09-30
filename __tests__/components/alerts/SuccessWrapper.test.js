// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { render, screen } from "@testing-library/react"
import SuccessWrapper from "components/alerts/SuccessWrapper"

describe("<SuccessWrapper />", () => {
  it("renders children inside an alert-success div", () => {
    render(
      <SuccessWrapper>
        <p>Saved successfully</p>
      </SuccessWrapper>
    )
    const alert = screen.getByRole("alert")
    expect(alert).toHaveClass("alert-success")
    expect(alert).toHaveTextContent("Saved successfully")
  })
})
