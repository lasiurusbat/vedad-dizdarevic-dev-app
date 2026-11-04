# Case Study: Rain Alert

**A containerised Flask app, shipped to production by a tag-gated CI/CD pipeline.**
Live at <https://rainalert.live/> · Source: `github.com/lasiurusbat/RainAlert` · Image: `lasiurusbat/rainalert` on Docker Hub

---

## 1. Summary

| | |
|---|---|
| **What** | A web app that shows the 7-day rain chance for any city, with an hourly strip, alerts and a calendar export |
| **Role** | Sole developer and operator: application, container, pipeline, DNS, release process, documentation |
| **Stack** | Python 3.14, Flask, gunicorn · Docker (multi-stage) · GitHub Actions · Docker Hub · Render · custom domain with managed TLS |
| **Releases** | 13+ tagged releases, `v1.0` (2026-10-22) to `v1.2.4`, each shipped by pushing a git tag |
| **Tests** | 616 offline tests, 128 real-browser tests (headless Chrome), 7 live integration tests |
| **Cost** | Free tier on every service; both upstream data APIs are keyless |
| **State** | No database, no accounts, no server-side session: the app is stateless |

**Headline results**

- A release is `git tag v1.2.3 && git push origin v1.2.3`. Nothing else is done by hand.
- The image that passes the tests is the image that ships. It is built once, tested, then pushed, never rebuilt.
- After every deploy, a smoke test confirms the **new build** is the one answering on the public domain, not just that the site is up.
- Pull requests can never touch a secret, push an image or deploy.

---

## 2. The problem and the constraints

The product is small: type a city, see the chance of rain for seven days. The engineering problem is to
run it **reliably and cheaply in production**, as one person, on services that are free, shared and
rate-limited.

| Constraint | Consequence |
|---|---|
| Free tiers only | A 512 MB instance that sleeps when idle; no paid add-ons |
| Free, keyless upstreams (Nominatim, Open-Meteo) | Rate limits the app cannot raise, shared egress IPs, no SLA |
| One operator | Release and rollback must be low-ceremony, and a mistake must be hard to make |
| Public site, no login | Security headers, a strict CSP and a minimal attack surface matter more than auth |
| Open-Meteo's free licence is non-commercial | No ads, subscriptions or paid tiers, which also shapes the monetisation path (donations only) |

---

## 3. Architecture

```
                        ┌────────────────────────── GitHub ──────────────────────────┐
  git tag v1.2.x  ───►  │  Actions: build → test in image → browser tests → push     │
                        └───────────────┬───────────────────────────┬────────────────┘
                                        │ docker push               │ deploy hook (imgURL=tag)
                                        ▼                           ▼
                                  Docker Hub  ───── pull ─────►  Render web service
                                  (tag = version)                 (gunicorn, 1 worker × 4 threads)
                                                                        │   ▲
              rainalert.live  ── CNAME ──► *.onrender.com ── TLS ───────┘   │ smoke test greps
                                                                            │ "Version 1.2.x"
                                  ┌─────────────────────────────────────────┘
                                  ▼
              Nominatim (geocoding) · Open-Meteo (forecast) · OpenWeather (fallback, optional)
```

**Layers of the application** (imports only point downward):

| Layer | Responsibility |
|---|---|
| `rainalert/web` | Flask routes, app factory, security headers |
| `rainalert/present` | Labels, page data, SEO (titles, canonical links, JSON-LD) |
| `rainalert/domain` | Rules only: rain bands, day naming, alerts; imports neither Flask nor `requests` |
| `rainalert/upstream` | The clients for Nominatim, Open-Meteo and OpenWeather |

This keeps the business rules testable with no app and no mocks, and the HTTP surface is documented by hand in `API.md` and `openapi.yaml`.

---

## 4. Infrastructure and DevOps work (the focus)

### 4.1 Container image

`Dockerfile` is a two-stage build designed to be small, boring and safe.

- **Multi-stage.** Stage 1 builds wheels from `requirements.txt`. Stage 2 installs from those wheels with `--no-index`, so the runtime image has **no compiler and no system packages**.
- **Non-root.** Runs as a system user `rainalert` (uid 1001) with no login shell. The app needs no writable path, because it has no database, uploads or instance folder.
- **Self-describing.** `APP_VERSION` and `APP_COMMIT` are build args, baked into both OCI labels (`org.opencontainers.image.version`, `.revision`) and the environment, and rendered in every page footer. The artifact, the registry and the running site all name the same build.
- **Health check.** `HEALTHCHECK` fetches the home page. It was chosen deliberately because that page asks no upstream, so a Nominatim or Open-Meteo outage can never mark a healthy container unhealthy.
- **Port from `$PORT`**, so the same image runs under Compose (8000) and under a platform that assigns its own port.
- **Deterministic clock.** `TZ=UTC`, and weekday names are hard-coded rather than taken from `strftime`, so the image needs no locale data and renders identically on any host.
- **Tuned for the workload.** gunicorn runs **1 worker × 4 threads**. The app is I/O-bound on two APIs, and the per-process geocoding cache stays warm in a single worker, which avoids duplicate Nominatim lookups.

**Problem solved: gunicorn 26 crashing on a non-root user.** The container died on startup with
`Permission denied`. gunicorn opens a control socket under `$HOME/.gunicorn/` or `$XDG_RUNTIME_DIR`, and
a user created without a home directory has neither. The fix was to create `/home/rainalert`
and `/run/rainalert`, own them by uid 1001 and set `XDG_RUNTIME_DIR`, without giving up non-root.

### 4.2 Local environment parity (Docker Compose)

`docker-compose.yml` defines two services from one YAML anchor (`x-image`): the app, and a `tests` service under a profile.
Settings come from `.env`, and the test container deliberately gets none of them, because the suite asserts the app's own defaults.

**Problem solved: a test run that lied.** Compose reuses a local `rainalert:latest` if one exists and never
rebuilds it. A stale image ran **368 of 513** offline tests and still reported `OK`. The fix was `pull_policy: build`
on the shared anchor, so the tested image is always built from the current source. The symptom to
watch for, a test count that does not match the suite, is documented so it is recognisable next time.

### 4.3 CI/CD pipeline (GitHub Actions)

One workflow, `.github/workflows/ci-cd.yml`, with two behaviours:

```
PR / push to main                       push of tag vX.Y[.Z]
────────────────                        ───────────────────
build image (amd64)                     build image (amd64)
offline tests INSIDE the image          offline tests INSIDE the image
browser tests on the runner             browser tests on the runner
done                                    verify tag format + tag is on main
                                        docker login → docker push (same image)
                                        ── deploy job (environment: production) ──
                                        Render deploy hook with imgURL=<exact tag>
                                        smoke test the live domain for "Version X.Y.Z"
```

Design decisions, and why:

| Decision | Reason |
|---|---|
| **Build once, test, then push the same image** | The tested artifact and the shipped artifact are identical. No "passed in CI, different build in prod" |
| **Offline suite runs inside the image** | Tests exercise the real runtime filesystem, user and dependencies |
| **Browser suite runs on the runner, before the push** | The image deliberately installs no system packages, so Chrome cannot be in it. Placing it before the push means a failing browser test means nothing is published |
| **`RAINALERT_REQUIRE_BROWSER=1`** | A skipped suite still reports success. This turns "no browser available" into a failure so the gate cannot pass having tested nothing |
| **Tag format validated** (`^v[0-9]+\.[0-9]+(\.[0-9]+)?$`) | Typos fail before anything is pushed |
| **Tag must be an ancestor of `origin/main`** (`git merge-base --is-ancestor`) | Releases come only from reviewed, merged code |
| **Secrets only on tag runs; `permissions: contents: read`** | PRs, including from forks or Dependabot, can never push or deploy; least-privilege token |
| **`concurrency` group per ref, cancel-in-progress except on tags** | A newer push cancels stale CI, but a release is never killed halfway through a push or deploy |
| **GitHub `production` environment on the deploy job** | A one-click path to add required reviewers for manual approval |
| **Buildx with GitHub Actions layer cache** (`type=gha`, `mode=max`) | Faster builds without a separate cache service |
| **Deploy by hook with an explicit `imgURL`** | See 4.4 |
| **Smoke test greps for the exact version** | Proves *the new build* is live, not merely *a* build. 12 attempts × 15 s covers Render's pull and swap, with `curl --retry-all-errors` |

**Dependency hygiene.** Dependabot opens weekly grouped PRs (Mondays 07:00 Berlin) for three ecosystems:
GitHub Actions, pip and the Docker base image. Each PR runs the same pipeline, so a bump merges only if it is green.

### 4.4 Deployment platform and the "nothing happened" trap

`render.yaml` is a Blueprint for an **image-backed** service (`runtime: image`): Render pulls from Docker Hub and never runs the Dockerfile. A release is therefore a pushed tag, not a merged commit.

Two settings that look minor are load-bearing:

- **`autoDeploy: false`.** If left on, pushing *any* image would redeploy the service with the *stored* fallback tag, which is how an old version silently comes back.
- **`healthCheckPath: /`**, matching the container health check.

**Trap documented and designed around:** saving a new image URL in Render's settings deploys nothing. Auto-deploy applies only to Git-connected services, so the old container keeps serving with no sign anything is wrong. The pipeline calls the deploy hook with the tag, and the smoke test then verifies the result from outside. The three ways to deploy are in the runbook (dashboard, hook, API).

### 4.5 DNS, TLS and domain cutover

- `rainalert.live` is a CNAME to the service's onrender address, with `www` redirected to the apex. Render issues the certificate automatically and redirects HTTP to HTTPS (`301`).
- Checks done on the live domain: every route answers; canonical links, Open Graph tags and JSON-LD all point at `https://rainalert.live`; unknown cities answer `404` and a malformed slug (`/city/---`) answers `404` with no redirect.

**Problem solved: "the site is down" when it was not.** After the cutover, the domain stayed on the old registrar's
URL-forwarding record in a local resolver, and connections timed out in a way that looked exactly like an outage. The
diagnosis was to ask a public resolver (`nslookup rainalert.live 1.1.1.1`), compare with the expected CNAME and IPs,
then flush the local cache. The first release's smoke test failed for the same underlying reason (the deploy succeeded
but the domain was not yet answering), which is why the runbook says to read that failure as "domain not answering the new build", not "deploy broke".

### 4.6 Security hardening

Implemented at the edge of the app in `rainalert/web/security.py`, on every response, and covered by tests:

- **CSP: `default-src 'none'`** and everything else `'self'`, with **no `unsafe-inline`**. The site loads nothing from a third party, so there is no inline `style=`, `<style>` or `<script>`; a test fails if one appears.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **HSTS only when the request was HTTPS** (via `X-Forwarded-Proto` from the platform proxy), without `includeSubDomains` or `preload`, so a misconfiguration cannot lock the domain's other uses.
- **Secrets:** the OpenWeather key is declared `sync: false` in the Blueprint (so it is never in git) and entered in the dashboard. The key travels in a query string, so the code never logs a URL or an exception's text, only the status or the exception class; a test holds this.
- **Fonts self-hosted** (Archivo), so the page makes no third-party requests.
- **Non-root container, no system packages, no database**: a deliberately small attack surface.
- **Machine endpoints** (`/api/alert`, `/calendar.ics`) send `X-Robots-Tag: noindex, nofollow` and are disallowed in `robots.txt`, because each costs two upstream calls.

### 4.7 Operations: reliability and upstream limits

**Incident, 2026-10-29: every live forecast failed (HTTP 503) while the same code worked locally.**
Open-Meteo's free tier limits by IP, and Render's egress IP is shared. Its answer was
`Daily API request limit exceeded`, an allowance the app cannot raise. Response, in layers:

1. **Make the failure visible.** The failure reason is now logged (shipped in 1.1.3), so the next occurrence is diagnosable from logs rather than guesswork.
2. **Reduce upstream calls.** A server-side cache keeps a good forecast for `WEATHER_CACHE_SECONDS` (default 600), keyed by coordinates and unit. Failures and malformed answers are never cached. A crawler or a second visitor costs no upstream call. `robots.txt` adds `Crawl-delay: 10` and blocks SemrushBot.
3. **Add a second source.** When Open-Meteo refuses, an OpenWeather One Call 4.0 client answers. It **translates OpenWeather's response into Open-Meteo's shape**, so the validator, parser and every layer above never learn which service answered. Pages are never mixed across sources, because the probability models differ.
   - It **never raises**; every reason there can be no second source (no key, quota spent, refusal, broken payload) returns `None`, and Open-Meteo's own error is re-raised so logs and the 503 describe the first failure.
   - A **self-imposed daily call budget** (`OPENWEATHER_DAILY_LIMIT`, default 900, per UTC day) guards a provider that bills past its free tier. A forecast that does not fit in the remaining budget is not half-made.
   - **What cannot be provided is left unknown, never invented** (for example, hours of rain per day).
   - Verified against the real API on 2026-10-30, including an observed `/timeline/1day` hang that later recovered.
4. **Degrade honestly.** A broken upstream returns `503`, a missing city `404`, never a `200` that says "not found" (a soft 404). A broken hourly block removes the strip but keeps the week.

**Monitoring.** The runbook specifies an uptime pinger (UptimeRobot, or Better Stack for a 3-minute interval) that targets the **domain's home page**, chosen because it calls no upstream and so never reports a third party's outage as the site's, and because it also proves DNS and certificate. It can also assert on `Version X.Y.Z`. It doubles as a keep-warm for the free tier's idle spin-down.

### 4.8 Release engineering

- **Semantic tags, one image tag per release, never `latest`, never re-pushing a tag.** A tag already on Docker Hub is a release that is already out. A tag that never produced an image can be moved to a fix; a released one cannot.
- **A release is also content.** Each release adds an entry to `rainalert/data/releases.py`, which renders the public `/release-notes` page (dates in UTC, by decision).
- **Service-worker cache versioning.** Changing the shell (CSS, JS, icons, font) requires bumping `CACHE_VERSION`, otherwise installed apps keep serving old styles while the forecast looks correct.
- **Verification-by-snapshot.** `tools/snapshot.py` records every route's response with both upstreams mocked; `diff -r` before/after proves a refactor changed nothing the site serves. Used for splitting the original single `app.py` into the layered package.

---

## 5. The pipeline in practice: the first release took five attempts

This is the most instructive part of the project, because each failure was a missing piece of the pipeline, not an app bug:

| # | Failure | Root cause | Fix |
|---|---|---|---|
| 1 | Docker Hub login | `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` secrets not set | Added secrets |
| 2 | `unauthorized: access token has insufficient scopes` | Token had **Read**; push needs **Read & Write** | Replaced token |
| 3 | Browser test failed | **Flaky test, not an app fault**: waited for `navigator.serviceWorker.controller`, but a page navigated after `clients.claim()` is not controlled until reloaded | Wait for the registration to be *active*, then reload if uncontrolled |
| 4 | `curl: (3) URL rejected: Bad hostname` (image already pushed) | `RENDER_DEPLOY_HOOK_URL` empty | Deployed by hand; set the secret from the service that runs the image (hooks are per-service) |
| 5 | Green end to end | n/a | Smoke test found `Version 1.0` on the live domain |

Lessons recorded in the runbook:

- **"Re-run failed jobs" replays the commit the tag points at.** A fix committed later does not reach a pinned tag run. For a never-published tag, the tag is moved to the fix. For a published one, cut a new version.
- **Blocking on browser and unit tests before the push** is what made attempts 3 and 4 safe: nothing half-released.
- Every release after the first (`v1.0.1`, `v1.1.0`, `v1.1.1`, `v1.1.2` and later) was green on the first attempt.

---

## 6. Application work (the product)

### 6.1 What it does

City search → **Nominatim** geocoding → **Open-Meteo** 7-day forecast → a night-street-themed page with:

- A one-sentence **headline banner** for the first day worth mentioning, judged on the *remaining hours* for today, not the daily maximum.
- A **seven-column week** (a CSS grid over a real `<ol>`), a **three-band scale** (Rain unlikely / possible / likely), and a **day picker** whose panel and 24-hour strip follow the selected day, all rendered server-side for every day and toggled by script, so the page is useful with JavaScript off.
- **Alerts:** a tab title and favicon that change when rain is coming; browser notifications from a poll of `/api/alert`; an **`.ics` calendar export** of the wet days; a user-set personal threshold stored only in `localStorage`.
- **Installable PWA** with a service worker that caches the shell and **never** the forecast.
- **SEO:** one canonical address per city (`/city/<slug>`, 100 curated cities, aliases `301`-redirect to the listed slug), sitemap, robots, structured data, correct `404`/`503` semantics.

### 6.2 Engineering decisions worth noting

| Decision | Why |
|---|---|
| **Three distinct exceptions** (`CityNotFound`, `GeocodingUnavailable`, `WeatherUnavailable`) mapped once in `FAILURES` | A network blip must never tell a user their valid city doesn't exist; messages, status codes and log lines are defined in one place |
| **Explicit timeouts everywhere** | geopy defaults to 1 s (fails against a healthy-but-slow Nominatim); `requests.get` has none by default |
| **`lru_cache` on geocoding, failures uncached** | Nominatim is rate-limited and a name always maps to the same place; a retry must retry |
| **`timezone=auto`, dates never converted to the viewer's zone** | A Tokyo forecast is in Tokyo's days |
| **Temperature conversion asked of the service, not computed** | Hand-rolled conversion rounds differently and would disagree with the service |
| **Hard-coded English weekdays** | `strftime('%A')` follows process locale; no locale data in the image |
| **One alert threshold shared by the banner, ☔ icon, tab title, notification and calendar** | If any two disagree, the page lies to the reader |
| **Stateless server; preferences in the browser** | No database, no accounts, no PII. Every `localStorage` access is wrapped so private-mode browsers lose a feature, not the page |
| **Decisions on the server, delivery in the browser** | The notification and calendar rules live behind the offline test suite instead of inside a JS string |
| **Never invent data** | An unreported day is never counted as dry; the second source leaves unknowns as `None` |

### 6.3 Testing strategy

| Suite | Count | Needs | Gate? |
|---|---|---|---|
| Offline (`tests/offline/`, one file per module, HTTP fully mocked) | 616 | nothing | Yes, runs inside the image |
| Browser (`tests/test_browser.py`, real headless Chrome via Selenium, local server, no network) | 128 | Chrome | Yes, runs on the runner before push |
| Live integration (`tests/test_api.py`) | 7 | both APIs reachable | No, manual (depends on third parties) |

The browser suite measures real layout: no page scroll in a 768 px viewport, hourly numbers not colliding at three widths, baselines and icon heights. Several of the project's trickiest bugs were found there, including `set_window_size` measuring the wrong viewport (fixed by using `Emulation.setDeviceMetricsOverride`) and a Werkzeug server blocking for minutes on close (fixed by shutting down recorded keep-alive connections first).

### 6.4 Selected bugs found and fixed

- A stray literal `\n` in the CSS swallowing the next declaration and silently killing `background-size`.
- A false "city not found" caused by collapsing "geocoder down" and "no match" into one path.
- A flex row aligning on an inline SVG's bottom edge instead of the text baseline, pushing the calendar link above its caption.
- `.title()` corrupting `"st john's"` into `"St John'S"`; banker's rounding turning `8.5` into `8` (a `round_half_up()` helper was added).

---

## 7. Takeaways

1. **Make the artifact the contract.** One image, built once, tested, labelled and stamped with its own version, made every later step (deploy, verify, roll back) simple.
2. **Verify the outcome, not the action.** "The hook returned 200" proved nothing; "the live page says `Version X`" did.
3. **Fail closed.** No secrets on PRs, no release from off-`main`, no passing a gate that tested nothing.
4. **Treat free third parties as unreliable by design.** Cache, fall back, budget and degrade honestly, and log enough to diagnose the next incident.
5. **Write the traps down.** Several of the hardest problems (stale local image, silent non-deploy, pinned re-runs, stale resolver) cost more time than any feature, so the runbook records the symptom as well as the fix.

---

*Facts above come from the repository: `Dockerfile`, `docker-compose.yml`, `render.yaml`, `.github/workflows/ci-cd.yml`, `.github/dependabot.yml`, `DEPLOY.md`, `CLAUDE.md`. Test counts and release dates are as recorded there on 2026-10-31.*
