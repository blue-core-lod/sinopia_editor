import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import LcshTypeahead from "components/editor/inputs/LcshTypeahead"

import suggest from "utilities/LocSuggest"
import fetchSubjectDetails from "utilities/LocSubjectDetails"

jest.mock("utilities/LocSuggest")
jest.mock("utilities/LocSubjectDetails")

const simpleHit = {
  aLabel: "Agricultural economics",
  suggestLabel: "Agricultural economics",
  uri: "http://id.loc.gov/authorities/subjects/sh85002058",
}

const lcnafHit = {
  aLabel: "Smith, John",
  suggestLabel: "Smith, John USE Smith, J.",
  uri: "http://id.loc.gov/authorities/names/n50013549",
}

const complexHit = {
  aLabel: "Agriculture--Economic aspects",
  suggestLabel: "Agriculture--Economic aspects",
  uri: "http://id.loc.gov/authorities/subjects/sh2001001234",
}

describe("<LcshTypeahead />", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    suggest.mockResolvedValue({ hits: [] })
    fetchSubjectDetails.mockResolvedValue({
      authoritativeLabel: "Mocked label",
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renders nothing when query is empty", () => {
    const { container } = render(
      <LcshTypeahead query="" onSelect={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when query is shorter than 3 chars", () => {
    const { container } = render(
      <LcshTypeahead query="ag" onSelect={jest.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("calls suggest with the query and all three types after debounce", async () => {
    suggest
      .mockResolvedValueOnce({ hits: [simpleHit] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="agr" onSelect={jest.fn()} />)

    await act(async () => {
      jest.runAllTimers()
    })

    expect(suggest).toHaveBeenCalledWith("agr", "SimpleType")
    expect(suggest).toHaveBeenCalledWith("agr", "Geographic")
    expect(suggest).toHaveBeenCalledWith("agr", "ComplexSubject")
  })

  it("renders nothing when all suggest calls return empty hits", async () => {
    suggest.mockResolvedValue({ hits: [] })

    const { container } = render(
      <LcshTypeahead query="agr" onSelect={jest.fn()} />
    )

    await act(async () => {
      jest.runAllTimers()
    })

    expect(container.firstChild).toBeNull()
  })

  it("renders the Simple group heading when simple hits exist", async () => {
    suggest
      .mockResolvedValueOnce({ hits: [simpleHit] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="agr" onSelect={jest.fn()} />)

    await act(async () => {
      jest.runAllTimers()
    })

    expect(screen.getByText("Simple")).toBeInTheDocument()
    // suggestLabel appears in the result list button
    expect(screen.getAllByText(simpleHit.suggestLabel).length).toBeGreaterThan(
      0
    )
  })

  it("renders LCNAF and Complex groups when those hits exist", async () => {
    suggest
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [lcnafHit] })
      .mockResolvedValueOnce({ hits: [complexHit] })

    render(<LcshTypeahead query="agr" onSelect={jest.fn()} />)

    await act(async () => {
      jest.runAllTimers()
    })

    expect(screen.getByText("LCNAF")).toBeInTheDocument()
    expect(screen.getByText("Complex")).toBeInTheDocument()
    expect(screen.getByText(lcnafHit.suggestLabel)).toBeInTheDocument()
    expect(screen.getByText(complexHit.suggestLabel)).toBeInTheDocument()
  })

  it("calls onSelect with label and uri when a result item is clicked", async () => {
    const onSelect = jest.fn()
    suggest
      .mockResolvedValueOnce({ hits: [simpleHit] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="agr" onSelect={onSelect} />)

    await act(async () => {
      jest.runAllTimers()
    })

    // Click the result button (it is a <button> inside the listbox)
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(simpleHit.suggestLabel) })
    )

    expect(onSelect).toHaveBeenCalledWith({
      label: simpleHit.aLabel,
      uri: simpleHit.uri,
    })
  })

  it("uses suggestLabel as label when aLabel is absent", async () => {
    const onSelect = jest.fn()
    const hitNoALabel = {
      suggestLabel: "Fallback label",
      uri: "http://id.loc.gov/authorities/subjects/sh001",
    }
    suggest
      .mockResolvedValueOnce({ hits: [hitNoALabel] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="fal" onSelect={onSelect} />)

    await act(async () => {
      jest.runAllTimers()
    })

    fireEvent.click(screen.getByRole("button", { name: /Fallback label/ }))

    expect(onSelect).toHaveBeenCalledWith({
      label: hitNoALabel.suggestLabel,
      uri: hitNoALabel.uri,
    })
  })

  it("shows a loading indicator while details are being fetched", async () => {
    // Never resolves so component stays in loading state
    fetchSubjectDetails.mockReturnValue(new Promise(() => {}))
    suggest
      .mockResolvedValueOnce({ hits: [simpleHit] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="agr" onSelect={jest.fn()} />)

    await act(async () => {
      jest.runAllTimers()
    })

    expect(screen.getByText(/Loading/)).toBeInTheDocument()
  })

  it("renders the subject ID in the details panel once loaded", async () => {
    fetchSubjectDetails.mockResolvedValue({
      authoritativeLabel: "Agricultural economics",
      about: "sh85002058",
    })
    suggest
      .mockResolvedValueOnce({ hits: [simpleHit] })
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValueOnce({ hits: [] })

    render(<LcshTypeahead query="agr" onSelect={jest.fn()} />)

    await act(async () => {
      jest.runAllTimers()
    })

    expect(screen.getByText(/sh85002058/)).toBeInTheDocument()
  })
})
