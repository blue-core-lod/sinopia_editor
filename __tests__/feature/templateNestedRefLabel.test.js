import { renderApp } from "testUtils"
import { fireEvent, screen } from "@testing-library/react"
import { featureSetup, resourceHeaderSelector } from "featureUtils"

jest.mock("KeycloakContext", () => ({
  useKeycloak: jest.fn().mockReturnValue({}),
}))

featureSetup()

// A parent template names a nested template by URI and carries that template's
// rdfs:label so the template editor can show what the ref is. Profiles may
// write the ref as the profile URI and the label against a version URI of the
// same profile, or the reverse. Either way the label must show, and the label
// triple must not be reported as "not editable".
// See https://github.com/blue-core-lod/sinopia_editor/issues/254
const profileUri =
  "https://bluecore-dev.stanford.edu/profiles/ecc1d1f6-a816-419a-9c49-b61d51927c16"
const versionUri = `${profileUri}/version/2`

const templateRdf = (refUri, labelUri) => `
<> <http://sinopia.io/vocabulary/hasClass> <http://id.loc.gov/ontologies/bibframe/Work> .
<> <http://sinopia.io/vocabulary/hasPropertyTemplate> _:list .
<> <http://sinopia.io/vocabulary/hasResourceId> <resourceTemplate:testing:nestedRefLabel> .
<> <http://sinopia.io/vocabulary/hasResourceTemplate> "sinopia:template:resource" .
<> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/ResourceTemplate> .
<> <http://www.w3.org/2000/01/rdf-schema#label> "Nested ref label test"@en .
<http://sinopia.io/vocabulary/propertyType/resource> <http://www.w3.org/2000/01/rdf-schema#label> "nested resource" .
_:list <http://www.w3.org/1999/02/22-rdf-syntax-ns#first> _:pt .
_:list <http://www.w3.org/1999/02/22-rdf-syntax-ns#rest> <http://www.w3.org/1999/02/22-rdf-syntax-ns#nil> .
_:pt <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/PropertyTemplate> .
_:pt <http://sinopia.io/vocabulary/hasPropertyUri> <http://id.loc.gov/ontologies/bibframe/title> .
_:pt <http://sinopia.io/vocabulary/hasPropertyType> <http://sinopia.io/vocabulary/propertyType/resource> .
_:pt <http://sinopia.io/vocabulary/hasResourceAttributes> _:attrs .
_:pt <http://www.w3.org/2000/01/rdf-schema#label> "Title"@en .
_:attrs <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://sinopia.io/vocabulary/ResourcePropertyTemplate> .
_:attrs <http://sinopia.io/vocabulary/hasResourceTemplateId> <${refUri}> .
<${labelUri}> <http://www.w3.org/2000/01/rdf-schema#label> "Nested Work Title" .
`

const loadTemplate = async (rdf) => {
  renderApp()

  fireEvent.click(screen.getByText("Linked Data Editor", { selector: "a" }))
  fireEvent.click(screen.getByText("Load RDF", { selector: "a" }))
  fireEvent.change(screen.getByLabelText(/Accepts JSON-LD/), {
    target: { value: rdf },
  })
  fireEvent.click(screen.getByText("Submit", { selector: "button" }))

  await screen.findByText("Nested ref label test", {
    selector: resourceHeaderSelector,
  })
}

// The unused-RDF panel also prints the label triple, so look for the label in
// the ref's label field in the editor.
const expectLabelShownAndNothingUnused = async () => {
  expect(
    await screen.findByLabelText("Label for Resource Template IDs"),
  ).toHaveValue("Nested Work Title")
  expect(
    screen.queryByText(/Some triples are not editable with this template/),
  ).not.toBeInTheDocument()
}

describe("template editor nested template ref labels", () => {
  it("shows the label when the ref matches the label's subject", async () => {
    await loadTemplate(templateRdf(profileUri, profileUri))

    await expectLabelShownAndNothingUnused()
  })

  it("shows the label when the ref is the profile URI and the label is on the version URI", async () => {
    await loadTemplate(templateRdf(profileUri, versionUri))

    await expectLabelShownAndNothingUnused()
  })

  it("shows the label when the ref is the version URI and the label is on the profile URI", async () => {
    await loadTemplate(templateRdf(versionUri, profileUri))

    await expectLabelShownAndNothingUnused()
  })
})
