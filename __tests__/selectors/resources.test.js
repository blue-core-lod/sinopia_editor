import { createState } from "stateUtils"
import useEntitiesStore from "stores/entitiesStore"
import {
  selectSubject,
  selectProperty,
  selectValue,
  selectFullSubject,
  resourceHasChangesSinceLastSave,
  selectResourceUriMap,
  selectResourceGroup,
  selectMainTitleProperty,
  selectMainTitleValue,
} from "selectors/resources"

const entitiesState = () => useEntitiesStore.getState()

describe("selectSubject()", () => {
  it("returns null when no match", () => {
    createState()
    expect(selectSubject(entitiesState(), "abc123")).toBeNull()
  })

  it("returns subject", () => {
    createState({ hasResourceWithNestedResource: true })
    expect(selectSubject(entitiesState(), "ljAblGiBW")).toBeSubject("ljAblGiBW")
  })
})

describe("selectProperty()", () => {
  it("returns null when no match", () => {
    createState()
    expect(selectProperty(entitiesState(), "abc123")).toBeNull()
  })

  it("returns property", () => {
    createState({ hasResourceWithNestedResource: true })
    expect(selectProperty(entitiesState(), "v1o90QO1Qx")).toBeProperty(
      "v1o90QO1Qx"
    )
  })
})

describe("selectValue()", () => {
  it("returns null when no match", () => {
    createState()
    expect(selectValue(entitiesState(), "abc123")).toBeNull()
  })

  it("returns value", () => {
    createState({ hasResourceWithNestedResource: true })
    const value = selectValue(entitiesState(), "VDOeQCnFA8")
    expect(value).toBeValue("VDOeQCnFA8")
  })
})

describe("selectFullSubject()", () => {
  it("returns null when no match", () => {
    createState()
    expect(selectFullSubject(entitiesState(), "abc123")).toBeNull()
  })

  it("returns subject and all descendants", () => {
    createState({ hasResourceWithNestedResource: true })
    const subject = selectFullSubject(entitiesState(), "ljAblGiBW")
    expect(subject).toBeSubject("ljAblGiBW")
    expect(subject.properties).toHaveLength(1)
    const property = subject.properties[0]
    expect(property).toBeProperty("v1o90QO1Qx")
    expect(property.values).toHaveLength(1)
    const value = property.values[0]
    expect(value).toBeValue("VDOeQCnFA8")
    const nestedSubject = value.valueSubject
    expect(nestedSubject).toBeSubject("XPb8jaPWo")
    expect(nestedSubject.properties).toHaveLength(1)
    const nestedProperty = nestedSubject.properties[0]
    expect(nestedProperty).toBeProperty("7caLbfwwle")
    expect(nestedProperty.values).toHaveLength(1)
    const nestedValue = nestedProperty.values[0]
    expect(nestedValue).toBeValue("pRJ0lO_mT-")
  })
})

describe("resourceHasChangesSinceLastSave", () => {
  it("returns changed for currentResource if key not provided", () => {
    createState({ hasResourceWithNestedResource: true })
    useEntitiesStore.setState({
      subjects: {
        ...entitiesState().subjects,
        ljAblGiBW: { ...entitiesState().subjects.ljAblGiBW, changed: true },
      },
    })
    expect(resourceHasChangesSinceLastSave(entitiesState())).toBe(true)
  })
  it("returns changed for provided resource", () => {
    createState({ hasResourceWithNestedResource: true })
    useEntitiesStore.setState({
      subjects: {
        ...entitiesState().subjects,
        ljAblGiBW: { ...entitiesState().subjects.ljAblGiBW, changed: true },
      },
    })
    expect(resourceHasChangesSinceLastSave(entitiesState(), "ljAblGiBW")).toBe(
      true
    )
  })
})

describe("selectResourceUriMap", () => {
  it("returns map of URIs to keys", () => {
    createState({ hasTwoLiteralResources: true })
    useEntitiesStore.setState({
      subjects: {
        ...entitiesState().subjects,
        t9zVwg2zO: {
          ...entitiesState().subjects.t9zVwg2zO,
          uri: "http://localhost:3000/resource/f383bfff-5364-47a3-a081-8c9e2d79f43f",
        },
        u0aWxh3a1: {
          ...entitiesState().subjects.u0aWxh3a1,
          uri: "http://localhost:3000/resource/g493bfff-5364-47a3-a081-8c9e2d79f5fg",
        },
      },
    })
    expect(selectResourceUriMap(entitiesState())).toEqual({
      "http://localhost:3000/resource/f383bfff-5364-47a3-a081-8c9e2d79f43f":
        "t9zVwg2zO",
      "http://localhost:3000/resource/g493bfff-5364-47a3-a081-8c9e2d79f5fg":
        "u0aWxh3a1",
    })
  })
})

describe("selectResourceGroup", () => {
  it("returns groups", () => {
    createState({ hasResourceWithNestedResource: true })
    expect(selectResourceGroup(entitiesState(), "ljAblGiBW")).toEqual({
      group: "stanford",
      editGroups: ["cornell"],
    })
  })
})

describe("selectMainTitleProperty", () => {
  it("returns property", () => {
    createState({ hasResourceWithMainTitle: true })
    expect(
      selectMainTitleProperty(entitiesState(), "cqxLskA9kjAfMFDeuvzGq").key
    ).toEqual("PZg9YbCZyx4AoJs2eL2zm")
  })
})

describe("selectMainTitleValue", () => {
  it("returns property", () => {
    createState({ hasResourceWithMainTitle: true })
    expect(
      selectMainTitleValue(entitiesState(), "cqxLskA9kjAfMFDeuvzGq").key
    ).toEqual("JjUhYxaBo9nuIh8GKd9k5")
  })
})
