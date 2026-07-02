import Config from "Config"

/**
 * Fetches the list of languages supported by ScriptShifter.
 * @return {Promise<Object>} JSON response from ScriptShifter languages endpoint
 */
export const languages = () =>
  fetch(`${Config.scriptShifterUrl}/languages`)
    .then((resp) => {
      if (!resp.ok)
        throw new Error(`ScriptShifter languages returned ${resp.statusText}`)
      return resp.json()
    })
    .catch((err) => {
      console.error(
        `Error fetching ScriptShifter languages: ${err.message || err}`
      )
      throw err
    })

/**
 * Transliterates text using ScriptShifter.
 * @param {string} text - The input text to transliterate
 * @param {string} lang - The language code (e.g., "cherokee")
 * @param {string} [tDir="r2s"] - Transliteration direction
 * @param {string} [capitalize="no_change"] - Capitalization option
 * @param {Object} [options={}] - Additional options
 * @return {Promise<Object>} JSON response from ScriptShifter translate endpoint
 */
export const translate = (
  text,
  lang,
  tDir = "r2s",
  capitalize = "no_change",
  options = {}
) =>
  fetch(`${Config.scriptShifterUrl}/trans`, {
    method: "POST",
    headers: {
      accept: "*/*",
      "content-type": "application/json",
    },
    body: JSON.stringify({ text, lang, t_dir: tDir, capitalize, options }),
  })
    .then((resp) => {
      if (!resp.ok)
        throw new Error(`ScriptShifter translate returned ${resp.statusText}`)
      return resp.json()
    })
    .catch((err) => {
      console.error(
        `Error fetching ScriptShifter translation: ${err.message || err}`
      )
      throw err
    })
