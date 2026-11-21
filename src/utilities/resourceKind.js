// Copyright 2026 Stanford University see LICENSE for license
import Config from "Config"

const BF = "http://id.loc.gov/ontologies/bibframe/"

// The letter shown in each kind's badge. Kinds without one get no badge.
export const kindBadges = { work: "W", instance: "I", template: "RT" }

export const kindLabels = {
  work: "Work",
  instance: "Instance",
  template: "Resource template",
}

// The kind of resource a subject template edits.
export const kindForSubjectTemplate = (subjectTemplate) => {
  if (subjectTemplate?.id === Config.rootResourceTemplateId) return "template"
  if (subjectTemplate?.class === `${BF}Work`) return "work"
  if (subjectTemplate?.class === `${BF}Instance`) return "instance"
  return "other"
}
