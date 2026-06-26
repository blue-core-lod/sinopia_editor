// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { render } from "@testing-library/react"
import SuccessWrapper from "components/alerts/SuccessWrapper"

describe("<SuccessWrapper />", () => {
  it("renders children inside an alert-success div", () => {
    const { getByRole } = render(
      <SuccessWrapper>
        <p>Saved successfully</p>
      </SuccessWrapper>
    )
    const alert = getByRole("alert")
    expect(alert).toHaveClass("alert-success")
    expect(alert).toHaveTextContent("Saved successfully")
  })
})
