# witch-codes - source of truth

Established by the `estate-sot` lane, 16 October 2026. Plan: `C:/Hecate-Umbra/work/source-of-truth-20261015/SOURCE-OF-TRUTH-PLAN.md`.
Decision record: `C:/Hecate-Umbra/estate/decisions/witch-codes.md`.

## What this repo is

The Pages project **`witch-codes` only** — `https://witch-codes.pages.dev/` and the 22
`*.witch.codes` subdomains that resolve directly to it. The ATHENA-framework marketing site.

**It is not `witch.codes`.** See the boundary section below; this is the single most important
fact about this project.

## Confirmed winner

`C:/Hecate-Umbra/WEBSITES/witch.codes/dist/`

Confirmed by byte identity and by the local deployment cache:

1. `WEBSITES/witch.codes/dist/index.html` is **byte-identical** to the live
   `https://witch-codes.pages.dev/` response
   (61,526 B, sha256 `02edecb943910de3b01dae627c10cc90f58eeb7e66c3caf8d67c474a0be3407d`).
2. `dist/.wrangler/` names project `witch-codes`.
3. Every goddess subdirectory byte-matches its live route, e.g.
   `dist/hecate/index.html` (8,203 B) = live `/hecate/`;
   `dist/hera/index.html` (38,394 B) = live `/hera/`;
   `dist/audit/index.html` (16,472 B) = live `/audit/`.

## The boundary: `witch.codes` the apex domain is a different system

`https://witch.codes/` (15,639 B, title "WITCHCRAFT AI · Landing Zone") is **not** this project.
It is served by the **`pbi-edge` Worker**, whose source is
`C:/Hecate-Umbra/runtime/touch-deploy/pbi-edge-20260925/worker.js` +
`deity-pages.mjs`. That Worker hosts 25 goddess pages (`/landing-zone/`, `/site-index/`,
`/theia/`, `/fixing-news/`, `/virtual-worlds/`, …) which exist **only inside the Worker bundle**.

Proof: the live `witch.codes/` home page's first 4,000 characters match the `home` key of
`deity-pages.mjs` after whitespace normalisation (exact-match failed only on the additional
`data-company-link` markup and a footer this Worker injects). The Pages project has no
`theia/`, `landing-zone/` or `site-index/` directory at all.

**Consequence:** `pbi-edge` needs its own sweep pass and its own repo. It is out of scope here.

## Rebuildable status: this winner is NOT rebuildable

Scored against criterion 1 (rebuildable) and it fails:

- No `build.py`, `build.js`, `build.mjs`, `Makefile`, `package.json`, or `wrangler.toml`
  exists anywhere in `WEBSITES/witch.codes/`.
- `src/` holds 8 unrelated files (`f01.html`–`f08.html`) that do not generate `dist/`.
- `dist.bak-20260925/` is a near-duplicate of `dist/` (61,888 B vs 61,526 B index) — a
  **snapshot of the artifact, not its source**. Per the plan this "can never win as source," but
  since no rebuildable candidate exists at all, the byte-exact deployed artifact was committed as
  the baseline. This establishes truth; it does not improve the site.

## Known defects — recorded, not silently repaired

1. **`/thalia/` still exists.** The product canon was corrected on 21 September 2026: Theia is the
   radiology identity, Thalia is retired. `dist/thalia/` is live and still served. The live index
   still contains the string "thalia".
2. **`/theia/` is a phantom on the Pages project.** `https://witch-codes.pages.dev/theia/`
   returns HTTP 200 but serves the **index page** (sha identical to `/`, and identical to
   `/zzz-nonexistent/`). It is a 404-as-200 fallback, not a real route. The genuine Theia page
   lives only in the `pbi-edge` Worker.

## Excluded

- **Media**: `dist/assets/` (3,688,960 B, 5 files) excluded by rule; belongs in R2.
- **`dist.bak-20260925/`** — a stale duplicate artifact, 61,888 B. Excluded.
- **`estate-v1/`** — a separate 3D estate preview (`witch-estate-preview`, three.js), a different
  product. Not this Pages project.
- **`src/`, `worker/dropbox.js`, `_worker.js.disabled`, `test_dropbox.py`, `endpoints_src.html`** —
  not part of the `witch-codes` Pages deployment. Not committed.
- **Forbidden-domain scan**: zero hits across `dist/`. Clean.

## What was NOT verified

- No browser rendering check; HTTP status, byte count and SHA-256 only.
- 8 of 25 served routes were probed; the remaining 17 were not individually confirmed against disk.
- The 22 `*.witch.codes` subdomains all serve the same 61,526 B index (spot-checked 7). The full
  subdomain-to-route binding was not enumerated.
- No subdomain returns a route-specific page: `athena.witch.codes/` and `hera.witch.codes/` both
  serve the same index, so subdomain branding is not implemented. Recorded, not judged.
- `theia.witch.codes` returns **HTTP 522** (origin connection timed out) — left as found, not
  investigated further; it is a Worker-served host.
- Cloudflare read only. Nothing deployed.