import React, { useState } from "react"
import PropTypes from "prop-types"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBolt } from "@fortawesome/free-solid-svg-icons"

const DiacriticsButton = ({
  id,
  content,
  handleClick,
  handleBlur,
  onScriptShifter,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      label: "Set language and script",
      action: (e) => {
        setIsOpen(false)
        handleClick(e)
      },
    },
    {
      label: "ScriptShifter",
      action: () => {
        setIsOpen(false)
        onScriptShifter()
      },
    },
  ]

  const handleToggle = (event) => {
    setIsOpen((prev) => !prev)
    event.preventDefault()
  }

  const handleKeyDown = (event) => {
    const index = parseInt(event.key, 10) - 1
    if (index >= 0 && index < menuItems.length) {
      event.preventDefault()
      menuItems[index].action(event)
    }
  }

  return (
    <div className={`dropdown${isOpen ? " show" : ""}`}>
      <button
        className="btn btn-outline-secondary fs-4 py-0"
        id={id}
        aria-label={`Select diacritics for ${content}`}
        data-testid={`Select diacritics for ${content}`}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      >
        <FontAwesomeIcon icon={faBolt} />
      </button>
      {isOpen && (
        <ul className="dropdown-menu show" aria-labelledby={id}>
          {menuItems.map((item, index) => (
            <li key={item.label}>
              <button className="dropdown-item" onClick={item.action}>
                <span className="text-muted me-2">{index + 1}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

DiacriticsButton.propTypes = {
  id: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  handleClick: PropTypes.func.isRequired,
  handleBlur: PropTypes.func.isRequired,
  onScriptShifter: PropTypes.func.isRequired,
}

export default DiacriticsButton
