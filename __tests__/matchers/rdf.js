// Dataset equality, so extra or duplicated triples fail a test instead of
// slipping past a substring match on the canonical string.
const canonicalLines = (dataset) =>
  dataset
    .toCanonical()
    .split("\n")
    .filter((line) => line.length > 0)

// One line per differing triple: "-" is expected but missing, "+" is unexpected.
// Blank-node labels are assigned per graph, so a single real difference can also
// relabel the blank nodes around it.
const diff = (actualLines, expectedLines) => {
  const missing = expectedLines.filter((line) => !actualLines.includes(line))
  const extra = actualLines.filter((line) => !expectedLines.includes(line))
  return [
    ...missing.map((line) => `- ${line}`),
    ...extra.map((line) => `+ ${line}`),
  ].join("\n")
}

expect.extend({
  toBeIsomorphicTo(actual, expected) {
    if (actual?.toCanonical == null || expected?.toCanonical == null) {
      throw new Error("expected both values to be rdf-ext datasets")
    }

    const actualLines = canonicalLines(actual)
    const expectedLines = canonicalLines(expected)
    const pass = actualLines.join("\n") === expectedLines.join("\n")

    return {
      pass,
      message: () =>
        pass
          ? `Expected datasets not to be isomorphic:\n${actualLines.join("\n")}`
          : `Expected datasets to be isomorphic (- missing, + unexpected):\n${diff(
              actualLines,
              expectedLines,
            )}`,
    }
  },
})
