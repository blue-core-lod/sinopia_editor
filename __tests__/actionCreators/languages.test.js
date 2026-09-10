// Copyright 2019 Stanford University see LICENSE for license

import { fetchLanguages } from "actionCreators/languages"
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"

const mockStore = configureMockStore([thunk])

describe("fetchLanguages", () => {
  it("dispatches actions", async () => {
    useEntitiesStore.setState({ languages: {}, languageLookup: [] })
    const store = mockStore(createState({ noLanguage: true }))
    await store.dispatch(fetchLanguages())

    const state = useEntitiesStore.getState()

    expect(state.languages.taw).toEqual("Tai")
    expect(state.languages.en).toEqual("English")
    expect(state.languages.eng).toEqual("English")

    expect(state.languageLookup).toContainEqual({
      id: "taw",
      label: "Tai (taw)",
    })
    expect(state.languageLookup).toContainEqual({
      id: "en",
      label: "English (en)",
    })

    expect(state.scripts.Adlm).toEqual("Adlam")
    expect(state.scripts.Latn).toEqual("Latin")

    expect(state.scriptLookup).toContainEqual({
      id: "Adlm",
      label: "Adlam (Adlm)",
    })
    expect(state.scriptLookup).toContainEqual({
      id: "Latn",
      label: "Latin (Latn)",
    })

    expect(state.transliterations.alaloc).toEqual(
      "American Library Association-Library of Congress"
    )
    expect(state.transliterations.buckwalt).toEqual(
      "Buckwalter Arabic transliteration system"
    )

    expect(state.transliterationLookup).toContainEqual({
      id: "alaloc",
      label: "American Library Association-Library of Congress (alaloc)",
    })
    expect(state.transliterationLookup).toContainEqual({
      id: "buckwalt",
      label: "Buckwalter Arabic transliteration system (buckwalt)",
    })
  })
})
