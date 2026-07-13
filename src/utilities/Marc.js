import Config from "Config"

const FIELD_TERMINATOR = 0x1e
const SUBFIELD_DELIMITER = 0x1f

const xmlEscape = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const parseRecord = (bytes) => {
  const decoder = new TextDecoder("utf-8")
  const leader = decoder.decode(bytes.slice(0, 24))
  const baseAddress = parseInt(leader.slice(12, 17), 10)

  // Directory runs from byte 24 to baseAddress - 1 (field terminator before base)
  const directory = bytes.slice(24, baseAddress - 1)
  const entryCount = Math.floor(directory.length / 12)

  const fields = []
  for (let i = 0; i < entryCount; i++) {
    const e = i * 12
    const tag = decoder.decode(directory.slice(e, e + 3))
    const fieldLength = parseInt(decoder.decode(directory.slice(e + 3, e + 7)), 10)
    const fieldStart = parseInt(decoder.decode(directory.slice(e + 7, e + 12)), 10)

    // fieldLength includes the field terminator; exclude it
    const fieldBytes = bytes.slice(
      baseAddress + fieldStart,
      baseAddress + fieldStart + fieldLength - 1
    )

    if (parseInt(tag, 10) < 10) {
      // Control fields (001-009): no indicators or subfields
      fields.push({ tag, data: decoder.decode(fieldBytes) })
    } else {
      const ind1 = fieldBytes[0] === 0x20 ? " " : String.fromCharCode(fieldBytes[0])
      const ind2 = fieldBytes[1] === 0x20 ? " " : String.fromCharCode(fieldBytes[1])
      const subfields = []

      let j = 2
      while (j < fieldBytes.length) {
        if (fieldBytes[j] === SUBFIELD_DELIMITER) {
          const code = String.fromCharCode(fieldBytes[j + 1])
          let end = j + 2
          while (end < fieldBytes.length && fieldBytes[end] !== SUBFIELD_DELIMITER) {
            end++
          }
          subfields.push({ code, data: decoder.decode(fieldBytes.slice(j + 2, end)) })
          j = end
        } else {
          j++
        }
      }

      fields.push({ tag, ind1, ind2, subfields })
    }
  }

  return { leader, fields }
}

const recordToXml = ({ leader, fields }) => {
  const fieldXml = fields
    .map(({ tag, data, ind1, ind2, subfields }) => {
      if (data !== undefined) {
        return `    <controlfield tag="${tag}">${xmlEscape(data)}</controlfield>`
      }
      const sfXml = subfields
        .map(
          ({ code, data: sfData }) =>
            `      <subfield code="${code}">${xmlEscape(sfData)}</subfield>`
        )
        .join("\n")
      return `    <datafield tag="${tag}" ind1="${ind1}" ind2="${ind2}">\n${sfXml}\n    </datafield>`
    })
    .join("\n")

  return `  <record>\n    <leader>${xmlEscape(leader)}</leader>\n${fieldXml}\n  </record>`
}

/**
 * Converts MARC21 binary data to a MARCXML string.
 * Accepts an ArrayBuffer (e.g. from FileReader.readAsArrayBuffer).
 * @param {ArrayBuffer} buffer - MARC21 binary data
 * @return {string} MARCXML string
 */
export const marcToMarcXml = (buffer) => {
  const bytes = new Uint8Array(buffer)
  const records = []
  let offset = 0

  while (offset < bytes.length) {
    const lengthStr = String.fromCharCode(...bytes.slice(offset, offset + 5))
    const recordLength = parseInt(lengthStr, 10)
    if (isNaN(recordLength) || recordLength === 0) break

    records.push(parseRecord(bytes.slice(offset, offset + recordLength)))
    offset += recordLength
  }

  const body = records.map(recordToXml).join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim">\n${body}\n</collection>`
}

/**
 * Converts MARCXML to BIBFRAME RDF using the configured marc2bibframe service.
 * @param {string} marcXml - MARCXML data as a string
 * @param {string} [format="text/turtle"] - Desired RDF output format (e.g. "text/turtle", "application/ld+json")
 * @return {Promise<string>} RDF as a string in the requested format
 */
export const marcToBibframe = (marcXml, format = "text/turtle") =>
  fetch(Config.marc2BibframeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/marcxml+xml",
      Accept: format,
    },
    body: marcXml,
  })
    .then((resp) => {
      if (!resp.ok)
        throw new Error(`marc2bibframe service returned ${resp.statusText}`)
      return resp.text()
    })
    .catch((err) => {
      console.error(`Error converting MARC to BIBFRAME: ${err.message || err}`)
      throw err
    })
