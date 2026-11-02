# Personal DevOps Portfolio | vedad-dizdarevic.dev

A personal website showcasing my work as a Cloud & DevOps Engineer: the projects I've built, the decisions behind them, and how I approach problems.

## Why this exists

A CV is a good summary, but a poor window into how I actually work. It lists tools and job titles, yet it can't show how a project was approached, which challenges came up, or why a particular solution was chosen.

This site fills that gap. Each project is presented as a short case study with the problem, the architecture, the trade-offs, and the outcome, backed by working code and infrastructure you can inspect yourself.

## Solution

A single page, 3-4 sections long web site that showcases my professional skills and projects.
- Architecture diagrams beat screenshots. For infrastructure projects, a clean diagram plus a short “what I decided and why” gets more attention than code listings. Show outcomes and decisions, not just tools: cost, reliability, deployment time, trade-offs you considered.
- Link live things where possible: a running demo, a Grafana dashboard screenshot, or a pipeline run.
- Offer a bilingual option. A German version of at least the hero and contact sections helps a lot for local employers and freelance clients.
- Separate the two audiences gently. Employers want “what can you do for my team,” freelance clients want “what problem can you solve and how fast.” A short “Work with me” section can cover freelance without cluttering the job pitch.
- Add a downloadable CV (PDF), kept in sync with LinkedIn.
- Make it fast and accessible. A DevOps person with a slow, bloated site loses credibility. Aim for green Lighthouse scores.

### Hosting: make the site itself a project

Since the site is itself a showcase, host it in a way that demonstrates your skills while staying cheap and simple:

- Static site generator: Astro, Hugo, or plain HTML/CSS. Avoid heavy frameworks you don’t need.
- Hosting: S3 + CloudFront (with Terraform and a CI/CD pipeline) shows real skills, or Cloudflare Pages/GitHub Pages if you want zero maintenance.
- Mention it on the site: A small “How this site is built” note with a link to the repo turns the site into portfolio evidence.
- Basics to get right: HTTPS, SPF/DKIM/DMARC on your email domain, and a sensible security headers setup.

## Must-have features

- A sharp positioning statement at the top. Name, role, and one line on what makes you different. Your decade in 3D/CGI plus production infrastructure work at showroom+ is a differentiator, so use it instead of hiding it.
- Two or three flagship project case studies (sorted.onl and rainalert.live). This is the core of the site. Each one should have:
  - The problem or goal in a sentence or two
  - An architecture diagram
  - The stack (Terraform, EKS, ArgoCD, GitLab CI/CD, etc.)
  - Two or three decisions you made and why (trade-offs, cost, security, reliability)
  - Links to the repo and, where possible, something live or visual (a pipeline run, a Grafana dashboard screenshot)
- Clear calls to action. Contact, GitHub, LinkedIn, and a downloadable CV should be reachable from every screen without scrolling hunts. Say plainly that you are open to full-time roles and freelance work. 
- A grouped skills section. Organize by area (cloud, IaC, CI/CD, containers, observability) and show the DevOps diploma. Skip skill bars and percentages, since they say nothing.
- A short, human About section. Your path, what you’re aiming for, languages, and a line or two of personality (games, books, biking, coffee). It helps people remember you.

## Strong differentiators
- “How this site is built” section. The site itself becomes a project: static hosting, IaC, CI/CD pipeline, monitoring. Link the repo.
- A “Work with me” section for freelance. Keep it separate from the job pitch: what you offer, what kind of problems you solve, and how to start a conversation. A simple contact form or booking link works.
- German and English versions. At minimum the hero, contact, and services section. This matters for the Rhein-Main market.

## Quality features people notice without noticing
- Fast load and good Lighthouse scores
- Works well on mobile, since recruiters often open links on a phone
- Dark/light mode that follows system preference
- Proper HTTPS, security headers, and a custom-domain email
- Basic SEO and a clean social preview image, so your link looks good when shared on LinkedIn