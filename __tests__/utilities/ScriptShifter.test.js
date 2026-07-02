import { languages, translate } from "utilities/ScriptShifter"

const mockLanguagesResponse = [
  { id: "cherokee", label: "Cherokee" },
  { id: "chinese", label: "Chinese" },
]

const mockTranslateResponse = {
  output: "ᎣᏏᏲ",
  lang: "cherokee",
  t_dir: "r2s",
}

describe("ScriptShifter", () => {
  describe("languages()", () => {
    it("returns language list on success", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLanguagesResponse),
      })

      const result = await languages()

      expect(result).toEqual(mockLanguagesResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        "https://bibframe.org/scriptshifter/languages"
      )
    })

    it("throws on non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      })

      await expect(languages()).rejects.toThrow(
        "ScriptShifter languages returned Not Found"
      )
    })

    it("throws on fetch failure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

      await expect(languages()).rejects.toThrow("Network error")
    })
  })

  describe("translate()", () => {
    it("returns translation on success with defaults", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTranslateResponse),
      })

      const result = await translate("Osiyo", "cherokee")

      expect(result).toEqual(mockTranslateResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        "https://bibframe.org/scriptshifter/trans",
        {
          method: "POST",
          headers: {
            accept: "*/*",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            text: "Osiyo",
            lang: "cherokee",
            t_dir: "r2s",
            capitalize: "no_change",
            options: {},
          }),
        }
      )
    })

    it("passes custom tDir, capitalize, and options", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTranslateResponse),
      })

      await translate("Osiyo", "cherokee", "s2r", "uppercase", { foo: "bar" })

      expect(global.fetch).toHaveBeenCalledWith(
        "https://bibframe.org/scriptshifter/trans",
        expect.objectContaining({
          body: JSON.stringify({
            text: "Osiyo",
            lang: "cherokee",
            t_dir: "s2r",
            capitalize: "uppercase",
            options: { foo: "bar" },
          }),
        })
      )
    })

    it("throws on non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
      })

      await expect(translate("Osiyo", "cherokee")).rejects.toThrow(
        "ScriptShifter translate returned Bad Request"
      )
    })

    it("throws on fetch failure", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

      await expect(translate("Osiyo", "cherokee")).rejects.toThrow(
        "Network error"
      )
    })
  })
})
