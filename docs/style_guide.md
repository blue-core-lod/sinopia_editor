# Sinopia UI style guide

Source: Figma file **BLUE-CORE**, frame *Dashboard* (node `14:2022`).
<https://www.figma.com/design/FgMp6A6CrdxtBlA7NvNVdW/BLUE-CORE?node-id=14-2022>

This guide covers the Blue Core look as applied to Sinopia. The global
styling (palette, type, Bootstrap theme, header, sub-nav, footer, data tables)
is already in `src/styles/`. Use this guide when you update individual sections
of the UI so they match.

## 1. Tokens

All tokens are SCSS variables in `src/styles/colors.scss` and
`src/styles/bootstrap-variables.scss`. Use the variable, not the hex value.

### Color

| SCSS variable       | Hex       | Figma name                      | Use for                                                     |
| ------------------- | --------- | ------------------------------- | ----------------------------------------------------------- |
| `$core-blue`        | `#003CAF` | Core/Core Blue                  | Links, icons, nav text, primary buttons, header rule, footer rule |
| `$digital-blue`     | `#006CB8` | Web Interactive/Digital blue    | Primary button **border** only                              |
| `$sinopia-wordmark` | `#4368AE` | n/a (header text)               | The "\| SINOPIA" app name. Don't reuse elsewhere.           |
| `$black-100`        | `#2E2D29` | Primary/Black 100               | Body text, input text (`$body-color`)                       |
| `$black-70`         | `#6D6C69` | Primary/Black 70                | Placeholder, secondary or muted text                        |
| `$black-40`         | `#ABABA9` | Primary/Black 40                | Table rules, input borders, card borders (`$border-color`)  |
| `$mist`             | `#F0F4F7` | n/a (band fill)                 | Sub-nav band, footer, panel fills, `.table-light`           |
| `$white`            | `#FFFFFF` | Primary/White                   | Page background (`$body-bg`), header, modals                |

Legacy colors still in use and **not** part of the design: `$reno-sand`
(template-editing accent), `$bright-red` (`$danger`), `$pampas`, `$white-linen`,
`$swirl` and `$nobel` (editor lookup and nested-resource panels). Leave them in
place until those sections get their own designs. Don't add new uses.

**Rule of thumb:** if a user can click it, make it Core Blue. Everything else
is Black 100 on white, with Black 40 rules and Mist bands.

### Typography

Helvetica Neue is a system font, so it isn't loaded from the web. Source Sans 3
comes from Google Fonts (`main.scss`).

| Figma style      | Family         | Size / leading | Weight      | CSS                                         | Use for                            |
| ---------------- | -------------- | -------------- | ----------- | ------------------------------------------- | ---------------------------------- |
| BC H1            | Helvetica Neue | 30px / 24px    | Light 300   | `<h1>` (`$h1-font-size`, weight 300)        | One page title per page ("Sinopia dashboard") |
| BC H2            | Helvetica Neue | 18px / 24px    | Regular 400 | `<h2>` (`$h2-font-size`)                    | Section titles ("Recent templates") |
| BC Link          | Helvetica Neue | 16px           | Regular 400 | `a`, nav links                              | Links and navigation               |
| BC Paragraph     | Helvetica Neue | 14px / 25px    | Light 300   | `.resource-template-list td`                | Dense table cells                  |
| (table body)     | Helvetica Neue | 16px / 22px    | Light 300   | data-table `td`                             | Other table cells                  |
| (table header)   | Helvetica Neue | 14px / 25px    | Bold 700    | data-table `thead th`                       | Column headings                    |
| BC Watermark     | Helvetica Neue | 16px           | Italic 400  | `.form-control::placeholder` in the search box | Placeholder text ("Search...")   |
| Paragraph        | Source Sans 3  | 16px           | Regular 400 | `$input-font-family`                        | Form inputs and selects            |
| Extra Small      | Source Sans 3  | 14px           | Regular 400 | `.btn-sm`, search button                    | Small buttons                      |

Font stacks:

```scss
$font-family-sans-serif: "Helvetica Neue", Helvetica, Arial, sans-serif; // body text
$font-family-controls: "Source Sans 3", "Source Sans Pro", sans-serif;   // inputs, buttons
```

Heading scale (compressed so that h3–h6 never come out bigger than h2):
h1 30px, h2 18px, h3 18px, h4 16px, h5 16px, h6 14px. All headings are weight
400 except h1, which is 300.

### Borders, radii, rules

| Element                       | Border                       | Radius |
| ----------------------------- | ---------------------------- | ------ |
| Header bottom rule            | 3px solid `$core-blue`       | n/a    |
| Footer bottom rule            | 10px solid `$core-blue`      | n/a    |
| Table row divider             | 1px solid `$black-40`        | n/a    |
| Inputs, selects               | 1px solid `$black-40`        | 2px    |
| Primary button                | 1px solid `$digital-blue`    | 4px    |
| Pill call-to-action ("Contact us") | none, `$core-blue` fill | 20px   |
| Cards, modals, dropdowns      | 1px solid `$black-40`        | 2px    |

`$enable-shadows` is now `false`. The design is flat, so don't add box shadows.

## 2. Page layout

```
┌──────────────────────────────────────────────────────────────┐
│ [logo] | SINOPIA         Help  Switch application  Logout    │  white
╞══════════════════════════════════════════════════════════════╡  3px Core Blue
│ Dashboard  Editor  Resource templates  Actions▾   [search…]  │  Mist band
└──────────────────────────────────────────────────────────────┘
  Page title (H1)

  ▼ Section title (H2)
  Label ↑        Resource URI      Author ↑ …        Actions
  ─────────────────────────────────────────────────────────    1px Black 40
  row …                                              [icons]
  ─────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────┐
│ [logo]  (Contact us)   ┊ APPLICATIONS                         │  Mist band
│                        ┊ Search  Marva  Sinopia  …            │
╞══════════════════════════════════════════════════════════════╡  10px Core Blue
```

- The body keeps a 20px side margin (`$page-gutter`). Full-width bands (header,
  sub-nav, footer) cancel it with `margin: 0 -$page-gutter; padding: 0 $page-gutter`.
  Do the same for any new full-width band.
- In the design, content sits about 56px from the left edge of a 1440px frame.
- Leave about 1.5rem below the sub-nav before the page title, and 2.5–3rem
  between sections.

## 3. Components

### Links

- Color `$core-blue`, always.
- **Navigation and footer links** have a permanent dotted underline:
  `text-decoration: underline dotted; text-underline-offset: 3px;`
- **Inline and in-table links** have no underline at rest and a dotted
  underline on hover. This is the global `a` rule.
- **Active nav item:** bold (700) with no underline.

### Buttons

| Kind         | Markup                         | Look                                                         |
| ------------ | ------------------------------ | ------------------------------------------------------------ |
| Primary      | `btn btn-primary`              | Core Blue fill, white text, Digital Blue border, 4px radius   |
| Small action | `btn btn-primary btn-sm`       | As above, Source Sans 3 at 14px, padding about 2px 6px        |
| Outlined     | `btn btn-secondary`            | Transparent, Core Blue border and text                        |
| Text / icon  | `btn btn-link`                 | Core Blue, no border; dotted underline on hover               |
| Disabled     | `:disabled`                    | Black 40 fill                                                 |

### Data tables

Already styled for `.resource-template-list`, `.search-list`,
`.search-results-list` and `.resource-list`. To give another table the same
look, add one of those classes or extend the selector list in `main.scss`.

- No fill, no vertical borders, no outer box.
- One 1px `$black-40` rule under the header row and under every body row.
- Header cells: 14px bold black. Sort arrows (↑) are Core Blue.
- Body cells: Helvetica Neue Light, top-aligned. Two-line cells (label plus
  ID) stack with 25px leading.
- Actions column: right-aligned Core Blue icons about 20px wide (`.icon-lg`),
  with about 8px between them.
- Numeric columns (Version) are centered.
- Note: the markup still has `table-bordered`. The CSS overrides it, but you
  can drop the class when you next touch those components.

### Section headings

The design shows a filled Core Blue triangle (▼) before each H2 section title,
which suggests the section can collapse. **Not implemented**: the dashboard
`<h2>`s aren't collapsible, so adding a triangle in CSS would promise behavior
that isn't there. When you make a section collapsible, use the existing
`button.collapse-heading` pattern. It now draws a Core Blue ▶ that rotates
to ▼ when open.

### Header search

One row of controls: select (`BIBFRAME - All`) | text input | **Search** button.

- Select and input: white, 1px Black 40 border, 2px radius, Source Sans 3 at 16px.
- Placeholder: Helvetica Neue Italic, Black 70.
- Button: primary style at 14px, 4px radius, label "Search".
- The design has no "Search" label or info icon in front of the field. The
  current markup keeps them, and changing that is a markup decision.

### Header (top bar)

- White background, 3px Core Blue bottom rule.
- Logo about 30px tall, then "| SINOPIA" in Helvetica Neue Light 24px, `$sinopia-wordmark`.
- Right side: Help, Switch application, Logout, all plain Core Blue links with
  dotted underlines. Help and Switch application open the right sidebar menus.
  The "•" separators are hidden and the username isn't shown.
- **Not in the current markup:** Contact, and the ▾ the design shows on Help and
  Switch applications. The design's outlined Help button was dropped in favor
  of a plain link.

### Footer

- `$mist` fill with a 10px Core Blue bottom rule, full width.
- Left: Blue Core logo, then a **Contact us** pill (Core Blue fill, white
  Helvetica Neue Bold 20px, 20px radius).
- A dotted 1px Core Blue vertical divider, then "APPLICATIONS" (14px,
  uppercase, black) above a row of Core Blue dotted-underline links in
  Helvetica Neue Light 16px.
- **Not in the current markup:** the current footer has CC0/LD4P2 text, which
  now sits on the Mist band. The logo, pill, and applications list need markup
  changes.

### Modals and cards

- White background, 1px Black 40 border, 2px radius, no shadow.
- Use H4 (16px) for modal titles.

### Dropdown menus

- 1px Black 40 border, 2px radius. Items in Core Blue.
- `.dropdown-header`: Mist fill, Black 100 bold.

## 4. Not covered by the design

These areas have no Blue Core design yet. They've moved to the new neutrals
where the swap was safe, but their structure is unchanged:

- Resource editor: property panels, nested resources (`$white-linen`), lookup
  pills (`$swirl`), template-mode accent (`$reno-sand`).
- Left resource nav and resource tabs. Tabs now use Black 40 borders and an
  active state in Core Blue.
- Offcanvas help menu (`rgb(55, 66, 79)`).
- Home page news banner (now Mist).

Ask design for frames before restyling these.

## 5. Checklist for updating a section

1. Use only the tokens in section 1. No new hex values.
2. Make interactive elements Core Blue and everything else Black 100, 70, or 40.
3. Use 1px Black 40 rules instead of boxes or filled table headers.
4. Use Helvetica Neue for text and Source Sans 3 for form controls.
5. Use a 2px radius on inputs and cards, 4px on buttons, and no shadows.
6. Run `npm run lint`, which also checks SCSS formatting with Prettier.
