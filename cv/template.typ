// The CV, in one language: typst compile template.typ --input lang=de (see build.sh).
//
// One plain column so applicant tracking systems and printers read it in order. The only cues from
// the site are its fonts and its accent, on white. Content lives in data.yaml.

#let lang = sys.inputs.at("lang", default: "en")
#let data = yaml("data.yaml")
#let t(value) = if type(value) == dictionary { value.at(lang) } else { value }

// The site's light-theme accent and text tokens (site/src/styles/global.css).
#let accent = rgb("#386474")
#let ink = rgb("#14161f")
#let muted = rgb("#4b5563")

#set document(
  title: data.name + " – CV",
  author: data.name,
  description: t(data.role),
)
#set page(
  paper: "a4",
  margin: (x: 1.8cm, top: 1.5cm, bottom: 1.7cm),
  footer: context {
    set text(size: 7.5pt, fill: muted)
    t(data.updated)
    h(1fr)
    counter(page).display("1 / 1", both: true)
  },
)
#set text(font: "Inter", size: 9.2pt, fill: ink, lang: lang, hyphenate: false)
#set par(leading: 0.5em, spacing: 0.55em)
#set list(marker: [•], indent: 0.2em, body-indent: 0.5em, spacing: 0.42em)
#show link: set text(fill: accent)

// The name.
#show heading.where(level: 1): set text(font: "DM Sans", size: 22pt, weight: 500, fill: ink)
#show heading.where(level: 1): set block(above: 0pt, below: 0.35em)
// Section titles, on a hairline.
#show heading.where(level: 2): it => block(
  above: 0.95em,
  below: 0.5em,
  width: 100%,
  stroke: (bottom: 0.6pt + accent),
  inset: (bottom: 0.25em),
  text(font: "DM Sans", size: 10.5pt, weight: 500, fill: accent, it.body),
)
// A project or job: the title in semibold, with its link or dates on the right.
#show heading.where(level: 3): set text(font: "Inter", size: 9.2pt, weight: 600, fill: ink)
#show heading.where(level: 3): set block(above: 0pt, below: 0.32em)

#let aside(body) = {
  h(1fr)
  text(weight: 400, body)
}

= #data.name

#text(font: "DM Sans", size: 12pt, weight: 500, fill: accent, t(data.role))

#v(0.1em)
#text(size: 8.5pt, fill: muted)[
  #data.contact.map(c => box(if "url" in c { link(c.url, t(c.text)) } else { t(c.text) })).join([ | ])
]

#text(weight: 600, t(data.availability))

== #t(data.labels.profile)

#t(data.profile)

== #t(data.labels.skills)

#for s in data.skills [
  #strong(delta: 200, t(s.label)): #t(s.items) \
]

== #t(data.labels.projects)

#for p in data.projects {
  block(breakable: false, above: 0pt, below: 0.75em)[
    === #t(p.title) #aside(link(p.link.url, p.link.text))
    #list(..t(p.bullets))
  ]
}

== #t(data.labels.education)

#list(..t(data.education))

#v(0.2em)
#strong(delta: 200, t(data.labels.languages)): #t(data.languages)

== #t(data.labels.experience)

#for e in data.experience {
  block(breakable: false, above: 0pt, below: 0.75em)[
    === #e.role, #text(weight: 400, e.company) #aside(text(fill: muted, t(e.dates)))
    #t(e.text)
  ]
}

#v(0.5em)
#text(fill: muted, t(data.earlier))
