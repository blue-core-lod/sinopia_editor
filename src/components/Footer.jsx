// Copyright 2018 Stanford University see LICENSE for license

import React from "react"
import applicationMenuSections from "./menu/applicationLinks"

const bcLogo = require("../styles/bluecore-small.png")

// The same applications the header's "Switch application" sidebar lists.
const applicationLinks = applicationMenuSections.flatMap(
  (section) => section.links,
)

const Footer = () => (
  <footer id="footer">
    <div className="footer-brand">
      <img src={bcLogo} alt="Blue Core" className="footer-logo" />
      <a className="footer-contact" href="mailto:contact@bluecore.info">
        Contact us
      </a>
    </div>
    <nav
      className="footer-applications"
      aria-labelledby="footer-applications-heading"
    >
      <h2 id="footer-applications-heading">Applications</h2>
      <ul>
        {applicationLinks.map(({ label, href }) => (
          <li key={href}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  </footer>
)

export default Footer
