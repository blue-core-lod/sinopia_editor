// Copyright 2019 Stanford University see LICENSE for license
import configureMockStore from "redux-mock-store"
import thunk from "redux-thunk"
import * as sinopiaApi from "sinopiaApi"
import { createState } from "stateUtils"
import { transfer } from "actionCreators/transfer"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

const mockStore = configureMockStore([thunk])

const resourceUri =
  "https://api.development.sinopia.io/resource/7b4c275d-b0c7-40a4-80b3-e95a0d9d987c"

describe("transfer", () => {
  describe("successful", () => {
    it("dispatches ADD_SUCCESS with the resource URI", async () => {
      sinopiaApi.postTransfer = jest.fn().mockResolvedValue()
      const store = mockStore(createState())
      await store.dispatch(transfer(resourceUri, undefined, "testerrorkey"))

      expect(sinopiaApi.postTransfer).toHaveBeenCalledWith(resourceUri, undefined)
      expect(store.getActions()).toHaveAction("ADD_SUCCESS", {
        successKey: "testerrorkey",
        message: `Export of ${resourceUri} requested. You will be notified by email once processed.`,
      })
    })
  })
  describe("failure", () => {
    it("dispatches actions to remove user", async () => {
      sinopiaApi.postTransfer = jest.fn().mockRejectedValue("Ooops!")
      const store = mockStore(createState())
      await store.dispatch(transfer(resourceUri, undefined, "testerrorkey"))

      expect(store.getActions()).toHaveAction("ADD_ERROR", {
        errorKey: "testerrorkey",
        error: "Error requesting transfer: Ooops!",
      })
    })
  })
})
