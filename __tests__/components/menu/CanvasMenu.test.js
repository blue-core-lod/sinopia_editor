// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import CanvasMenu from "components/menu/CanvasMenu"

describe("<CanvasMenu />", () => {
  // jsdom does not provide fetch, so stand one in to assert it is never used.
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    delete global.fetch
  })

  it("renders the help sections without fetching remote content", () => {
    render(<CanvasMenu />)

    screen.getByText("Help")
    screen.getByText("Communication")
    screen.getByText("Training Resources")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("renders every link to open safely in a new tab", () => {
    render(<CanvasMenu />)

    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(10)
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })
    expect(
      screen.getByRole("link", { name: "Sinopia help site" }),
    ).toHaveAttribute("href", "https://github.com/ld4p/sinopia/wiki")
  })

  it("calls the close handler", () => {
    const closeHandleMenu = jest.fn()
    render(<CanvasMenu closeHandleMenu={closeHandleMenu} />)

    fireEvent.click(screen.getByRole("button", { name: "Close Help Menu" }))
    expect(closeHandleMenu).toHaveBeenCalled()
  })
})
