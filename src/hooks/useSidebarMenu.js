import { useState } from "react"

/**
 * State for the right-hand sidebar: whether it is open and which menu it
 * shows. The menu is kept separately from isOpen so the content doesn't
 * change while the sidebar slides closed.
 */
const useSidebarMenu = (initialMenu = "help") => {
  const [isOpen, setIsOpen] = useState(false)
  const [menu, setMenu] = useState(initialMenu)

  // Clicking the header link for the open menu closes it; any other menu link
  // opens (or switches the sidebar to) that menu.
  const toggleMenu = (menuName) => {
    if (isOpen && menu === menuName) {
      setIsOpen(false)
    } else {
      setMenu(menuName)
      setIsOpen(true)
    }
  }

  const closeMenu = () => setIsOpen(false)

  return { isOpen, menu, toggleMenu, closeMenu }
}

export default useSidebarMenu
