import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"
import { selectLanguageLabel } from "selectors/languages"

const entitiesState = () => useEntitiesStore.getState()

describe("selectLanguageLabel()", () => {
  it("returns No Language Specified when no tag", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), null)).toEqual(
      "No language specified"
    )
  })

  it("returns English for en", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "en")).toEqual("English")
  })

  it("returns language label for language", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "taw")).toEqual("Tai")
  })

  it("returns Unknown language for unknown language", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "foo")).toEqual(
      "Unknown language (foo)"
    )
  })

  it("returns script label for script", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "en-Latn")).toEqual(
      "English - Latin"
    )
  })

  it("returns Unknown script for unknown script", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "en-Foo")).toEqual(
      "English - Unknown script (Foo)"
    )
  })

  it("returns transliteration label for transliteration", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "en-t-en-m0-alaloc")).toEqual(
      "English - American Library Association-Library of Congress"
    )
  })

  it("returns Unknown script for unknown transliteration", () => {
    createState()
    expect(selectLanguageLabel(entitiesState(), "en-t-en-m0-foo")).toEqual(
      "English - Unknown transliteration (foo)"
    )
  })
})
