// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import PropTypes from "prop-types"
import useEntitiesStore from "stores/entitiesStore"
import useEditorStore from "stores/editorStore"
import { selectLanguageLabel } from "selectors/languages"

const LanguageButton = ({ value }) => {
  const langLabel = useEntitiesStore((state) =>
    selectLanguageLabel(state, value.lang)
  )

  const handleClick = (event) => {
    event.preventDefault()
    useEditorStore.getState().showLangModal(value.key)
  }

  const label = `Change language for ${value.literal || value.label || ""}`

  return (
    <React.Fragment>
      <button
        id="language"
        onClick={handleClick}
        aria-label={label}
        data-testid={label}
        title={langLabel}
        className="btn btn-link"
      >
        {value.lang ? `Language: ${value.lang}` : "No language specified"}
      </button>
    </React.Fragment>
  )
}

LanguageButton.propTypes = {
  value: PropTypes.object.isRequired,
}

export default LanguageButton
