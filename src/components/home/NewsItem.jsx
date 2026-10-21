// Copyright 2019 Stanford University see LICENSE for license

import React from "react"
import Package from "../../../package.json"

const NewsItem = () => (
  <div className="news-item" data-testid="news-item">
    <h3>Latest news</h3>
    <h4>Blue Core Sinopia Version {Package.version} highlights</h4>
    <p>
      <i>
        For complete release notes see the{" "}
        <a href="https://github.com/blue-core-lod/blue-core/wiki">
          Blue Core help site
        </a>
        .
      </i>
    </p>
    <ul>
      <li>New Scriptshifter integration</li>
      <li>New LCSH Suggest Service 2.0 implementation</li>
      <li>
        New resource template versioning
      </li>
      <li>Convert a MARC record and load BIBFRAME</li>
      <li>UI/UX updates</li>
      <li>Various bug fixes</li>
    </ul>
  </div>
)

export default NewsItem
