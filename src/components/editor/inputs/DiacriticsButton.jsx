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

  const handleToggle = (event) => {
    setIsOpen((prev) => !prev)
    event.preventDefault()
  }

  const handleSetLanguage = (event) => {
    setIsOpen(false)
    handleClick(event)
  }

  const handleScriptShifter = () => {
    setIsOpen(false)
    onScriptShifter()
  }

  return (
    <div className={`dropdown${isOpen ? " show" : ""}`}>
      <button
        className="btn btn-link fs-4 py-0 dropdown-toggle"
        id={id}
        aria-label={`Select diacritics for ${content}`}
        data-testid={`Select diacritics for ${content}`}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onBlur={handleBlur}
      >
        <FontAwesomeIcon icon={faBolt} />
      </button>
      {isOpen && (
        <ul className="dropdown-menu show" aria-labelledby={id}>
          <li>
            <button className="dropdown-item" onClick={handleSetLanguage}>
              Set language and script
            </button>
          </li>
          <li>
            <button className="dropdown-item" onClick={handleScriptShifter}>
              ScriptShifter
            </button>
          </li>
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
