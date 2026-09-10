// Copyright 2019 Stanford University see LICENSE for license
import * as sinopiaApi from "sinopiaApi"
import { createState } from "stateUtils"
import { transfer } from "actionCreators/transfer"
import useEditorStore from "stores/editorStore"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

afterEach(() => {
  useEditorStore.setState({ errors: {}, successes: {} })
})

const resourceUri =
  "https://api.development.sinopia.io/resource/7b4c275d-b0c7-40a4-80b3-e95a0d9d987c"

describe("transfer", () => {
  describe("by resource URI", () => {
    describe("successful", () => {
      it("dispatches ADD_SUCCESS with the resource URI", async () => {
        sinopiaApi.postTransfer = jest.fn().mockResolvedValue()
        createState()
        await transfer(resourceUri, null, undefined, "testerrorkey")

        expect(sinopiaApi.postTransfer).toHaveBeenCalledWith(
          { instance_uri: resourceUri },
          undefined
        )
        expect(useEditorStore.getState().successes.testerrorkey).toContain(
          `Export of ${resourceUri} requested. You will be notified by email once processed.`
        )
      })
    })
    describe("failure", () => {
      it("dispatches ADD_ERROR", async () => {
        sinopiaApi.postTransfer = jest.fn().mockRejectedValue("Ooops!")
        createState()
        await transfer(resourceUri, null, undefined, "testerrorkey")

        expect(useEditorStore.getState().errors.testerrorkey).toContain(
          "Error requesting transfer: Ooops!"
        )
      })
    })
  })

  describe("by resource URI and local identifier", () => {
    const localId = "a123"

    describe("successful", () => {
      it("dispatches ADD_SUCCESS mentioning the identifier", async () => {
        sinopiaApi.postTransfer = jest.fn().mockResolvedValue()
        createState()
        await transfer(resourceUri, localId, undefined, "testerrorkey")

        expect(sinopiaApi.postTransfer).toHaveBeenCalledWith(
          { instance_uri: resourceUri, local_id: localId },
          undefined
        )
        expect(useEditorStore.getState().successes.testerrorkey).toContain(
          `Export of ${resourceUri} using identifier ${localId} requested. You will be notified by email once processed.`
        )
      })
    })
    describe("failure", () => {
      it("dispatches ADD_ERROR", async () => {
        sinopiaApi.postTransfer = jest.fn().mockRejectedValue("Ooops!")
        createState()
        await transfer(resourceUri, localId, undefined, "testerrorkey")

        expect(useEditorStore.getState().errors.testerrorkey).toContain(
          "Error requesting transfer: Ooops!"
        )
      })
    })
  })
})
