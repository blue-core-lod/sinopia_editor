import React, { useState, useEffect } from "react"
import PropTypes from "prop-types"
import { languages as fetchLanguages, translate } from "utilities/ScriptShifter"

const ScriptShifterSelection = ({ id, show, text, onTranslate, close }) => {
  const [langList, setLangList] = useState([])
  const [loading, setLoading] = useState(false)
  const [capitalize, setCapitalize] = useState(false)
  const [translating, setTranslating] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!show || langList.length > 0) return
    setLoading(true)
    setError(null)
    fetchLanguages()
      .then((data) =>
        setLangList(Object.entries(data).map(([id, info]) => ({ id, ...info })))
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [show, langList.length])

  if (!show) return null

  const handleTranslate = (lang, tDir) => {
    setTranslating(`${lang.id}-${tDir}`)
    translate(text, lang.id, tDir, capitalize ? "capitalize_first" : "no_change")
      .then((result) => {
        if (result?.output) {
          onTranslate(result.output, lang.marc_code)
          close()
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setTranslating(null))
  }

  const closeHandler = (event) => {
    close()
    event.preventDefault()
  }

  return (
    <div id={id} className="container">
      <div className="row">
        <section className="col-1 offset-11">
          <button
            className="btn btn-lg"
            onClick={closeHandler}
            aria-label="Close ScriptShifter"
          >
            &times;
          </button>
        </section>
      </div>
      <div className="row">
        <div className="col">
          <p>
            Visit{" "}
            <a
              href="https://bibframe.org/scriptshifter"
              target="_blank"
              rel="noopener noreferrer"
            >
              bibframe.org/scriptshifter
            </a>{" "}
            to test these languages.
          </p>
          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id={`${id}-capitalize`}
              checked={capitalize}
              onChange={(e) => setCapitalize(e.target.checked)}
            />
            <label className="form-check-label" htmlFor={`${id}-capitalize`}>
              Capitalize first letter of transliteration
            </label>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading languages...</span>
            </div>
          ) : (
            <div style={{ overflow: "auto", maxHeight: "400px" }}>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-center">Script to Roman</th>
                    <th className="text-center">Roman to Script</th>
                  </tr>
                </thead>
                <tbody>
                  {langList.map((lang) => (
                    <tr key={lang.id}>
                      <td>
                        <div>{lang.label}</div>
                        {lang.description && (
                          <small className="text-muted">
                            {lang.description}
                          </small>
                        )}
                      </td>
                      <td className="text-center">
                        {lang.has_s2r && (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            aria-label={`Script to Roman for ${lang.label}`}
                            checked={translating === `${lang.id}-s2r`}
                            onChange={() => handleTranslate(lang, "s2r")}
                            disabled={translating !== null}
                          />
                        )}
                      </td>
                      <td className="text-center">
                        {lang.has_r2s && (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            aria-label={`Roman to Script for ${lang.label}`}
                            checked={translating === `${lang.id}-r2s`}
                            onChange={() => handleTranslate(lang, "r2s")}
                            disabled={translating !== null}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

ScriptShifterSelection.propTypes = {
  id: PropTypes.string.isRequired,
  show: PropTypes.bool.isRequired,
  text: PropTypes.string.isRequired,
  onTranslate: PropTypes.func.isRequired,
  close: PropTypes.func.isRequired,
}

export default ScriptShifterSelection
