// The picture a link shows when it is shared (Open Graph), 1200 x 630 px at 72 ppi. One per page
// and language, rendered at build time by src/pages/og/[name].png.ts. Colours are the site's dark
// tokens (site/src/styles/global.css); fonts are the CV's (cv/fonts).

#let input(key) = sys.inputs.at(key, default: "")
#let heading-text = input("heading")
#let detail = input("detail")
#let name = input("name")
#let role = input("role")

#let canvas = rgb("#0f101a")
#let fg = rgb("#ffffff")
#let muted = rgb("#a6b5be")
#let accent = rgb("#8fb4c3")
#let hairline = rgb(255, 255, 255, 23)

#set page(
  width: 1200pt,
  height: 630pt,
  margin: (x: 72pt, top: 72pt, bottom: 60pt),
  // The light bloom at the top of every page of the site.
  background: rect(
    width: 100%,
    height: 100%,
    fill: gradient.radial(
      accent.transparentize(84%),
      canvas.transparentize(100%),
      center: (50%, -12%),
      radius: 75%,
    ),
  ),
  fill: canvas,
)
#set text(font: "Inter", fill: fg, lang: input("lang"), hyphenate: false)
#set par(leading: 0.3em, justify: false)

// The site's wordmark: the name between two corner brackets.
#let corner(sides) = box(width: 12pt, height: 12pt, stroke: sides)
#let wordmark = grid(
  columns: (auto, auto, auto),
  column-gutter: 6pt,
  align: (top, horizon, bottom),
  corner((top: 2pt + muted, left: 2pt + muted)),
  pad(y: 8pt, text(font: "DM Sans", weight: 500, size: 26pt, name)),
  corner((bottom: 2pt + accent, right: 2pt + accent)),
)

#grid(
  rows: (auto, 1fr, auto),
  wordmark,
  align(horizon, stack(
    spacing: 26pt,
    text(font: "DM Sans", weight: 500, size: 82pt, tracking: -0.015em, heading-text),
    text(font: "Inter", size: 38pt, fill: muted, detail),
  )),
  {
    line(length: 100%, stroke: 1pt + hairline)
    v(20pt)
    grid(
      columns: (1fr, auto),
      text(size: 24pt, fill: muted, role), text(size: 24pt, fill: accent, "vedad-dizdarevic.dev"),
    )
  },
)
