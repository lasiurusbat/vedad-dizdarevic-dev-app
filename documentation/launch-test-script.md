# Launch test script

The checks only a person with real devices can do, from [Phase 11 of the implementation plan](implementation-plan.md#phase-11-launch). Playwright already covers layout, axe, console errors and broken images in Chromium; this script covers what it cannot: real phones, other browsers, the content, and the people-facing details.

Go through it once per device. Note any failure as a short line (device, page, what happened) and hand the list over; fix each one in its own small PR.

Live site: `https://vedad-dizdarevic.dev`. German: `https://vedad-dizdarevic.dev/de/`.

## 1. Pages to open (every device, both languages)

| Page | English | German |
|---|---|---|
| Home | `/` | `/de/` |
| Sorted | `/projects/sorted/` | `/de/projects/sorted/` |
| Rain Alert | `/projects/rainalert/` | `/de/projects/rainalert/` |
| This site | `/projects/this-site/` | `/de/projects/this-site/` |
| Privacy policy | `/datenschutz/` | `/de/datenschutz/` |
| 404 | `/nothing-here/` | `/de/nothing-here/` |

For each page, both themes (header switch):

- [ ] Nothing overflows sideways, nothing overlaps, no text is cut off.
- [ ] Text is readable without zooming; buttons and links are easy to hit with a thumb.
- [ ] Images and screenshots load and look sharp; the hero illustration moves.
- [ ] The language switch lands on the same page in the other language.
- [ ] The theme switch works, and the choice is still there after a reload.

## 2. Phones (real iPhone in Safari, real Android in Chrome)

- [ ] **Home, top to bottom:** the name and role headline fits without being cut off, and the buttons are reachable without scrolling sideways.
- [ ] **Header and navigation:** every section link scrolls to its section; Contact, CV, GitHub and LinkedIn are reachable.
- [ ] **Diagrams** (Sorted, Rain Alert, this site): the diagram scrolls sideways inside its box, a swipe on it still scrolls the page, the path buttons (Requests, Mail, Releases, …) highlight one path, the text description opens under it.
- [ ] **Screenshot gallery** (Sorted, Rain Alert): swipe sideways; tapping a screenshot opens it full size; it closes again; "Actual size" works on large images.
- [ ] **Work with me:** the services grid is readable; tapping a dot jumps to the section that shows the service.
- [ ] **Contact form:** see section 4.
- [ ] **CV download** (header and hero button): the PDF opens or downloads in the page's language.
- [ ] **Rotate the phone** to landscape and back: nothing breaks.
- [ ] **Dark device setting:** the site is dark by default whatever the device says; the switch turns light on.

## 3. Desktop browsers (Firefox, Safari, Chrome)

Chromium is covered by Playwright, so Firefox and Safari matter most.

- [ ] Home in both languages: layout, fonts, the hero illustration and its animation.
- [ ] Case study pages: diagram renders, mouse wheel scrolls the page, Ctrl/Cmd + wheel zooms the diagram, dragging pans only after zooming in.
- [ ] Gallery lightbox: opens, closes with Escape and with the close button, and "Actual size" works on a large image.
- [ ] Keyboard only: Tab reaches every link and button in a sensible order, focus is always visible, the diagram box can be scrolled with the arrow keys.
- [ ] Zoom to 200%: nothing is cut off.
- [ ] Print preview of the CV PDFs looks right (page 1 and page 2).

## 4. Contact form (do it once per language)

- [ ] The form shows (it is hidden without JavaScript on purpose; the email address always shows).
- [ ] Sending it empty shows the three field errors, in the page's language.
- [ ] A real message shows "Thanks, your message is on its way" (German: the matching text).
- [ ] The message arrives at `hello@vedad-dizdarevic.dev` within a minute, with the right name, address and text.
- [ ] Replying to it from the mailbox reaches the sender's address.
- [ ] Turnstile loads only once you start on the form (no third-party request on page load).

## 5. Every call to action

- [ ] Hero: Contact, CV (English page: English PDF; German page: German PDF).
- [ ] Header: CV, GitHub, LinkedIn open in a new tab and land on the right profile.
- [ ] Footer: "How this site is built", Privacy policy, GitHub, LinkedIn.
- [ ] Case study closing band: contact button, "Next case study" (the loop is Sorted → Rain Alert → this site → Sorted).
- [ ] Work with me: the email button opens a mail draft to `hello@vedad-dizdarevic.dev`.
- [ ] Sorted page: the link to `sorted.onl` opens the live product.
- [ ] Case study repository links: this site's repository opens; the private repositories say "private repository" and do not link.

## 6. Reading the text

- [ ] Read every page in English once, start to finish: wrong claims, typos, anything you would not say to a client.
- [ ] Read every page in German once, ideally with a native speaker: tone (formal "Sie"), wording, anything that sounds translated.
- [ ] Every number is one you can defend: cost figures are labelled estimates, Sorted's Multi-AZ is described as designed and not running, no customer, revenue or traffic claims.
- [ ] Names, dates, job titles and the AWS certification status ("In progress") match the CV and LinkedIn.
- [ ] Nothing mentions a placeholder, a demo you did not mean to ship or an old product name.

## 7. CV and profiles

- [ ] Open both CV PDFs from the site. Compare, line by line, with the LinkedIn profile: job titles, dates, employers, skills, languages, diploma.
- [ ] The PDFs contain no phone number, street address, date of birth or private email (the build checks this; look once yourself).
- [ ] The CV links to `hello@vedad-dizdarevic.dev` and the site address.

## 8. Link previews

- [ ] Paste the home page, a case study and the German home page into LinkedIn's Post Inspector (`https://www.linkedin.com/post-inspector/`) and into a private chat (WhatsApp, Slack or iMessage): title, description and image are right.
- [ ] After any change to the share card, press "Inspect" again; LinkedIn caches the old image.

## 9. Language redirect (VPN)

- [ ] With a German, Austrian or Swiss exit, a fresh visit to `/` lands on `/de/`.
- [ ] Clicking the English link in the language switch on the German page stays on English (`/?lang=en`).
- [ ] With a US or UK exit, `/` stays on English.
- [ ] A deep link such as `/projects/sorted/` is not redirected from anywhere.

## 10. After launch

- [ ] Add the site address to LinkedIn, the GitHub profile, the CV and the email signature.
- [ ] Post a short note on LinkedIn about how the site is built (link to the `this-site` case study).
- [ ] After two weeks: Search Console (coverage, errors, queries) and the Better Stack incident list.

## Report back

Send the list of failures as lines of the form `device or browser — page — what happened`. Items that fail twice are worth a test in `tests/e2e`.
