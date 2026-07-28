import React, { useRef, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import PropTypes from "prop-types"
import TextareaAutosize from "react-textarea-autosize"
import {
  updateLiteralValue,
  removeValue,
  addValue,
  setSubjectComponentList,
} from "actions/resources"
import { newLiteralValue } from "utilities/valueFactory"
import LanguageButton from "./LanguageButton"
import DiacriticsButton from "./DiacriticsButton"
import RemoveButton from "./RemoveButton"
import DiacriticsSelection from "components/editor/diacritics/DiacriticsSelection"
import ScriptShifterSelection from "components/editor/diacritics/ScriptShifterSelection"
import useDiacritics from "hooks/useDiacritics"
import ValuePropertyURI from "../property/ValuePropertyURI"
import LiteralTypeLabel from "../property/LiteralTypeLabel"
import useResourceHasChanged from "hooks/useResourcHasChanged"
import LcshTypeahead from "./LcshTypeahead"
import _ from "lodash"

const MADS_AUTH_LABEL = "http://www.loc.gov/mads/rdf/v1#authoritativeLabel"

const InputLiteralValue = ({
  value,
  propertyTemplate,
  displayValidations,
  shouldFocus,
}) => {
  const dispatch = useDispatch()
  const inputLiteralRef = useRef(null)
  const [focusHasBeenSet, setFocusHasBeenSet] = useState(false)
  const [showScriptShifter, setShowScriptShifter] = useState(false)
  const id = `inputliteral-${value.key}`
  const diacriticsId = `diacritics-${value.key}`
  const diacriticsBtnId = `diacritics-btn-${value.key}`
  const scriptShifterId = `script-shifter-${value.key}`
  const {
    showDiacritics,
    toggleDiacritics,
    closeDiacritics,
    handleBlurDiacritics,
    currentContent,
    setCurrentContent,
    handleChangeDiacritics,
    handleKeyDownDiacritics,
    handleAddCharacter,
    handleClickDiacritics,
  } = useDiacritics(
    inputLiteralRef,
    id,
    diacriticsId,
    diacriticsBtnId,
    value.literal || ""
  )
  const handleKeyDownResourceHasChanged = useResourceHasChanged(value)

  useEffect(() => {
    if (value.literal === "" && !focusHasBeenSet && shouldFocus) {
      inputLiteralRef.current.focus()
      setFocusHasBeenSet(true)
    }
  }, [focusHasBeenSet, shouldFocus, value.literal])

  const handleBlur = (event) => {
    if (handleBlurDiacritics(event)) {
      dispatch(updateLiteralValue(value.key, currentContent, value.lang))
      event.preventDefault()
    }
  }

  const handleDiacriticsClick = (event) => {
    setShowScriptShifter(false)
    toggleDiacritics(event)
  }

  const handleOpenScriptShifter = () => {
    closeDiacritics()
    setShowScriptShifter(true)
  }

  const handleCloseScriptShifter = () => {
    setShowScriptShifter(false)
    inputLiteralRef.current.focus()
  }

  const handleTranslate = (translatedText, marcCode) => {
    dispatch(
      addValue(
        newLiteralValue(
          value.property,
          value.propertyUri,
          translatedText,
          marcCode
        ),
        value.key
      )
    )
  }

  const handleRemoveClick = (event) => {
    dispatch(removeValue(value.key))
    event.preventDefault()
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      dispatch(updateLiteralValue(value.key, currentContent, value.lang))
      event.preventDefault()
    }
    handleKeyDownResourceHasChanged()
    // Handle any position changing
    handleKeyDownDiacritics(event)
  }

  const subjectKey = useSelector(
    (state) => state.entities.properties[value.propertyKey]?.subjectKey
  )

  const isLcshAuthLabel = value.propertyUri === MADS_AUTH_LABEL

  const handleLcshSelect = ({ label, uri }) => {
    setCurrentContent(label)
    dispatch(updateLiteralValue(value.key, label, value.lang))
    if (uri && subjectKey) {
      dispatch(setSubjectComponentList(subjectKey, uri))
    }
  }

  const showLang =
    (!propertyTemplate.languageSuppressed || value.lang) &&
    !propertyTemplate.validationDataType

  const controlClasses = ["form-control"]
  if (displayValidations && !_.isEmpty(value.errors))
    controlClasses.push("is-invalid")

  return (
    <React.Fragment>
      <ValuePropertyURI propertyTemplate={propertyTemplate} value={value} />
      <LiteralTypeLabel propertyTemplate={propertyTemplate} />
      <div className="row my-2">
        <div className="col">
          <TextareaAutosize
            required={propertyTemplate.required}
            className={controlClasses.join(" ")}
            placeholder={propertyTemplate.label}
            aria-label={propertyTemplate.label}
            onChange={handleChangeDiacritics}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={handleClickDiacritics}
            value={currentContent}
            ref={inputLiteralRef}
            id={id}
          />
          <div className="invalid-feedback">{value.errors.join(", ")}</div>
        </div>
        <div className="col-md-auto">
          <DiacriticsButton
            id={diacriticsBtnId}
            content={currentContent}
            handleClick={handleDiacriticsClick}
            handleBlur={handleBlur}
            onScriptShifter={handleOpenScriptShifter}
          />
          {showLang && <LanguageButton value={value} />}
        </div>
        <div className="col-sm-1">
          <RemoveButton
            content={currentContent}
            handleClick={handleRemoveClick}
          />
        </div>
      </div>
      <div className="row">
        <DiacriticsSelection
          id={diacriticsId}
          handleAddCharacter={handleAddCharacter}
          closeDiacritics={closeDiacritics}
          showDiacritics={showDiacritics}
        />
        <ScriptShifterSelection
          id={scriptShifterId}
          show={showScriptShifter}
          text={currentContent}
          onTranslate={handleTranslate}
          close={handleCloseScriptShifter}
        />
      </div>
      {isLcshAuthLabel && (
        <LcshTypeahead query={currentContent} onSelect={handleLcshSelect} />
      )}
    </React.Fragment>
  )
}

InputLiteralValue.propTypes = {
  value: PropTypes.object.isRequired,
  propertyTemplate: PropTypes.object.isRequired,
  displayValidations: PropTypes.bool.isRequired,
  shouldFocus: PropTypes.bool.isRequired,
}

export default InputLiteralValue
