// Copyright 2018 Stanford University see LICENSE for license
import Config from "Config"

const OLD_ENV = process.env

describe("Config", () => {
  describe("static default values", () => {
    it("sinopia domain name has static value", () => {
      expect(Config.sinopiaDomainName).toEqual("bcld.info/sinopia")
    })

    it("sinopia url has static value", () => {
      expect(Config.sinopiaUrl).toEqual("https://bcld.info/sinopia")
    })

    it("sinopia env has static value", () => {
      expect(Config.sinopiaEnv).toEqual("")
    })

    it("index url has static value", () => {
      expect(Config.indexUrl).toEqual("http://localhost:9200")
    })

    it("useResourceTemplateFixtures is false by default", () => {
      expect(Config.useResourceTemplateFixtures).toEqual(false)
    })

    it("sinopia help and resource menu content has a link to github pages", () => {
      expect(Config.sinopiaHelpAndResourcesMenuContent).toEqual(
        "https://ld4p.github.io/sinopia/help_and_resources/menu_content.html"
      )
    })

    it("keycloak realm has static value", () => {
      expect(Config.keycloakRealm).toEqual("bluecore")
    })

    it("keycloak client id has static value", () => {
      expect(Config.keycloakClientId).toEqual("bluecore_api")
    })

    it("max records for lookups/QA has static value", () => {
      expect(Config.maxRecordsForQALookups).toEqual(20)
    })
  })

  describe("static environmental values overrides", () => {
    beforeAll(() => {
      process.env = {
        USE_FIXTURES: "true",
        SINOPIA_URI: "https://dev.bcld.info/sinopia",
        SINOPIA_ENV: "TEST",
        SINOPIA_GROUP: "foobar",
        KEYCLOAK_URL: "https://bcld.info/keycloak",
        KEYCLOAK_CLIENTID: "bluecore_workflows",
        MAX_RECORDS_FOR_QA_LOOKUPS: 15,
        INDEX_URL: "http://elasticsearch.aws.example.com",
      }
    })

    it("sinopia url overrides static value", () => {
      expect(Config.sinopiaUrl).toEqual("https://dev.bcld.info/sinopia")
    })

    it("sinopia env overrides static value for display", () => {
      expect(Config.sinopiaEnv).toEqual(" - TEST")
    })

    it("index url overrides static value", () => {
      expect(Config.indexUrl).toEqual("http://elasticsearch.aws.example.com")
    })

    it("useResourceTemplateFixtures value overrides static value", () => {
      expect(Config.useResourceTemplateFixtures).toEqual(true)
    })

    it("keycloak client ID overrides static value", () => {
      expect(Config.keycloakClientId).toEqual("bluecore_workflows")
    })

    it("max records for lookups/QA environment variable overrides static value", () => {
      expect(Config.maxRecordsForQALookups).toEqual(15)
    })

    afterAll(() => {
      process.env = OLD_ENV
    })
  })
})
