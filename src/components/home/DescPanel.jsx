// Copyright 2019 Stanford University see LICENSE for license

import React from "react"

const DescPanel = () => {
  const throwException = () => {
    throw new Error("What, me worry?")
  }

  return (
    <div className="desc-panel">
      <h3 onDoubleClick={() => throwException()}>
        Blue Core is a co-created and co-owned linked open data environment.
      </h3>
      <p>
        Sinopia for Blue Core enables libraries to collaboratively create and
        manage authoritative BIBFRAME metadata, where participating libraries
        can:
      </p>
      <ul>
        <li>
          create metadata in a linked open data environment without having to
          set up and maintain local tools
        </li>
        <li>implement best practices related to linked open data creation</li>
        <li>
          collaboratively produce shared BIBFRAME descriptions in a linked open
          data environment
        </li>
        <li>
          contribute feedback and expertise to iterative development of tools
          for working in a linked open data environment
        </li>
      </ul>
      <p>
        Sinopia was developed by the{" "}
        <a href="https://searchworks.stanford.edu/view/qt361vf0063">
          Linked Data for Production: Pathway to Implementation (LD4P2)
        </a>{" "}
        project, a collaboration among Cornell University, Harvard University,
        the Library of Congress, Stanford University, the School of Library and
        Information Science at the University of Iowa, and the Program for
        Cooperative Cataloging (PCC).
      </p>
      <p>
        The term <i>sinopia</i> refers to &quot;The preliminary drawing for a
        fresco or mural, named for the reddish-brown pigment traditionally used
        to draw or transfer it.&quot; (
        <a href="https://web.archive.org/web/20240722180115/http://www.lynnerutter.com/glossary.php#s">
          Glossary of Esoteric Architectural and Design Terms by Lynne Rutter
        </a>
        ) LD4P&apos;s Sinopia was a preliminary step, a sketch of what&apos;s
        possible, on the way to a full-fledged linked open data production
        environment now underway with Blue Core. For more information, visit{" "}
        <a href="https://bluecore.info/">bluecore.info</a> or email us at{" "}
        <a href="mailto:contact@bluecore.info">contact@bluecore.info</a>
      </p>
    </div>
  )
}

export default DescPanel
