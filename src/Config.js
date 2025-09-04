// Copyright 2019 Stanford University see LICENSE for license

class Config {
  static get rootResourceTemplateId() {
    return process.env.ROOT_RESOURCE_TEMPLATE_ID || "sinopia:template:resource"
  }

  static get sinopiaApiBase() {
    return process.env.SINOPIA_API_BASE_URL || "http://localhost:3000"
  }

  /*
   * There are two value types of `process.env` variables:
   *   1. When undefined, `if` condition is not satisfied and default `false` is returned
   *   2. When defined, will always be a string.
   *     a. When set to 'true' return `true` (use fixtures)
   *     b. When set to 'false' or any other string, return `false` (don't use fixtures)
   */
  static get useResourceTemplateFixtures() {
    if (process.env.USE_FIXTURES) {
      return process.env.USE_FIXTURES === "true"
    }

    return false
  }

  static get useLanguageFixtures() {
    return false
  }

  static get sinopiaUrl() {
    return process.env.SINOPIA_URI || "https://bcld.info/sinopia"
  }

  static get sinopiaEnv() {
    if (process.env.SINOPIA_ENV) {
      return ` - ${process.env.SINOPIA_ENV}`
    }

    // We do not set this value in production, and don't want to see the env label in production
    return ""
  }

  static get indexUrl() {
    return process.env.INDEX_URL || "http://localhost:9200"
  }

  /*
   * The host for the public endpoint for the Sinopia search.  This is different than
   * the indexURL because it's the path to the public proxy endpoint, not directly to elasticsearch.
   * In development we may want to set this to `//localhost:8000`, but when deployed typically
   * the default (empty string) will work as the search is proxied through the same server
   * that hosts the client javascript.
   */
  static get searchHost() {
    return process.env.SEARCH_HOST || ""
  }

  static get searchResultsPerPage() {
    return 10
  }

  static get templateSearchResultsPerPage() {
    // This # should be large enough to return all results.
    return 250
  }

  /*
   * This is the public endpont for the sinopia search.
   */
  static get searchPath() {
    // return "/api/search/sinopia_resources/_search"
    return "/search"
  }

  static get templateSearchPath() {
    return "/api/search/sinopia_templates/_search"
  }

  static get sinopiaDomainName() {
    return `${this.sinopiaUrl}`.replace("https://", "")
  }

  static get sinopiaHelpAndResourcesMenuContent() {
    return "https://ld4p.github.io/sinopia/help_and_resources/menu_content.html"
  }

  static get keycloakUrl() {
    return process.env.KEYCLOAK_URL || "http://localhost/keycloak"
  }

  static get keycloakRealm() {
    return process.env.KEYCLOAK_REALM || "bluecore"
  }

  static get keycloakClientId() {
    return process.env.KEYCLOAK_CLIENTID || "bluecore_api"
  }

  static get maxRecordsForQALookups() {
    return process.env.MAX_RECORDS_FOR_QA_LOOKUPS || 20
  }

  static get qaUrl() {
    return process.env.QA_URL || "https://lookup.ld4l.org"
  }

  static get exportBucketUrl() {
    return (
      process.env.EXPORT_BUCKET_URL ||
      "https://sinopia-exports-development.s3-us-west-2.amazonaws.com"
    )
  }

  static get honeybadgerApiKey() {
    return process.env.HONEYBADGER_API_KEY || ""
  }

  static get honeybadgerRevision() {
    return process.env.HONEYBADGER_REVISION || ""
  }

  static get transferConfig() {
    return {
      ils: {
        // group: label
        stanford: "Catalog",
        cornell: "Catalog",
        penn: "Catalog",
        ucdavis: "Catalog",
        princeton: "Catalog",
        northwestern: "Catalog",
        dnal: "Catalog",
        miami: "Catalog",
        harvard: "Catalog",
        emory: "Catalog",
        newcastle: "Catalog",
        leeds: "Catalog",
        memorial: "Catalog",
        jmu: "Catalog",
        brandeis: "Catalog",
        PUC: "Catalog",
        utoronto: "Catalog",
        ucf: "Catalog",
        usf: "Catalog",
      },
      // Can add additional transfer targets, e.g., discovery
    }
  }

  static get defaultLanguageId() {
    return "en"
  }
}

export default Config
