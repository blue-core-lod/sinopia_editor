// Copyright 2026 Stanford University see LICENSE for license

// The Blue Core applications a user can switch to. Paths are relative to the
// current host, since every application is served from the same domain.
const applicationMenuSections = [
  {
    heading: "Applications",
    links: [
      { label: "Search", href: "/api/search" },
      { label: "Marva", href: "/marva/" },
      { label: "Sinopia", href: "/sinopia/" },
      { label: "Toolbox", href: "/toolbox/" },
      { label: "API", href: "/api/docs" },
      { label: "Keycloak", href: "/keycloak/" },
      { label: "Workflows", href: "/workflows/" },
    ],
  },
]

export default applicationMenuSections
