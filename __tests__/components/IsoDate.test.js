import React from "react"
import IsoDate from "components/IsoDate"
import { render, screen } from "@testing-library/react"

describe("<IsoDate />", () => {
  it("renders the date as YYYY-MM-DD", () => {
    // No offset, so it's parsed (and shown) as local time
    render(<IsoDate datetime="2021-08-08T12:00:00" />)
    expect(screen.getByText("2021-08-08")).toHaveAttribute(
      "datetime",
      "2021-08-08T12:00:00",
    )
  })

  it("uses the provided timeZone", () => {
    // A date-only value is midnight UTC, so it must not slip a day locally
    render(<IsoDate datetime="2012-09-21" timeZone="UTC" />)
    screen.getByText("2012-09-21")
  })

  it("handles invalid dates", () => {
    const { container } = render(<IsoDate datetime="foo" />)
    expect(container).toBeEmpty()
  })

  it("does not render if null", () => {
    const { container } = render(<IsoDate datetime={null} />)
    expect(container).toBeEmpty()
  })
})
