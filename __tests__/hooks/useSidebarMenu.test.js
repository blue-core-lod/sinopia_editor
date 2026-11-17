import { act, renderHook } from "@testing-library/react"
import useSidebarMenu from "hooks/useSidebarMenu"

describe("useSidebarMenu", () => {
  it("starts closed on the help menu", () => {
    const { result } = renderHook(() => useSidebarMenu())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.menu).toEqual("help")
  })

  it("opens the menu that was clicked", () => {
    const { result } = renderHook(() => useSidebarMenu())

    act(() => result.current.toggleMenu("applications"))

    expect(result.current.isOpen).toBe(true)
    expect(result.current.menu).toEqual("applications")
  })

  it("switches menus while open", () => {
    const { result } = renderHook(() => useSidebarMenu())

    act(() => result.current.toggleMenu("help"))
    act(() => result.current.toggleMenu("applications"))

    expect(result.current.isOpen).toBe(true)
    expect(result.current.menu).toEqual("applications")
  })

  it("closes when the open menu is clicked again, keeping its content", () => {
    const { result } = renderHook(() => useSidebarMenu())

    act(() => result.current.toggleMenu("applications"))
    act(() => result.current.toggleMenu("applications"))

    expect(result.current.isOpen).toBe(false)
    expect(result.current.menu).toEqual("applications")
  })

  it("closes from closeMenu", () => {
    const { result } = renderHook(() => useSidebarMenu())

    act(() => result.current.toggleMenu("help"))
    act(() => result.current.closeMenu())

    expect(result.current.isOpen).toBe(false)
  })
})
