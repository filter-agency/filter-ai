# Design: WordPress 7.0 native AI Client integration for Filter AI

**Date:** 2026-06-03
**Status:** Approved design — ready for implementation plan
**Plugin version at time of writing:** 1.6.0

## 1. Overview

WordPress 7.0 ships a native, provider-agnostic **AI Client** plus a **Connectors API**
for managing AI provider credentials. Filter AI currently depends on a third-party
plugin — Felix Arntz's **`ai-services`** — to link API keys and route AI requests.

This design makes Filter AI use the **native WordPress functionality when running on
WP 7.0+**, while **continuing to use `ai-services` on WP < 7.0** (kept indefinitely
for backwards compatibility). The version branch is isolated behind a single
abstraction on each of the PHP and JavaScript sides, so individual features never
know which backend is active.

## 2. Goals / Non-goals

### Goals

- On WP 7.0+, route all AI requests through core's native AI Client and use
  _Settings → Connectors_ for credential management — no dependency on `ai-services`.
- On WP < 7.0, behave exactly as today via `ai-services`.
- Preserve all existing features and the per-feature provider-selection UX.
- Keep all request security first-party (capability + nonce), matching the 1.6.0
  AJAX hardening.

### Non-goals

- Sunsetting the `ai-services` path (it stays indefinitely).
- Encrypting credentials (owned by core's Connectors API; we only point users to it).
- Changing prompt content, feature set, or batch/Action Scheduler architecture.
- Adding new AI providers beyond what each backend already exposes.

## 3. The pivotal constraint

**WordPress 7.0 core ships only the _PHP_ AI Client and the Connectors API. There is
no JavaScript or REST API in core.**

Per `wp-ai-client`'s `UPGRADE.md`: on 7.0+ the package disables its own PHP SDK (core
handles it natively), but its REST endpoints (`/wp-ai/v1/generate`,
`/wp-ai/v1/is-supported`) and the `wp.aiClient` JS API remain package-provided —
"not yet in core". The Trac ticket to add a JS client to core ([#64873]) is still open.

Filter AI does most of its work **client-side in the block editor** (`window.aiServices`).
Because core exposes no JS/REST surface, the browser cannot call the native client
directly. **Decision: Filter AI exposes its own REST layer** that calls
`wp_ai_client_prompt()` server-side; the editor JS talks to those first-party routes.
This avoids any third-party runtime dependency on 7.0+.

Sources:

- Introducing the AI Client in WordPress 7.0 — make.wordpress.org/core/2026/03/24/
- Introducing the Connectors API in WordPress 7.0 — make.wordpress.org/core/2026/03/18/
- wp-ai-client UPGRADE.md — github.com/WordPress/wp-ai-client
- [#64873]: core.trac.wordpress.org/ticket/64873

## 4. Locked decisions

| #   | Decision                               | Choice                                                                                                                  |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Client-side AI on 7.0+                 | Filter AI's **own REST layer** calling `wp_ai_client_prompt()` (no third-party dep on 7.0+)                             |
| 2   | Per-feature provider selection on 7.0+ | **Keep it** — map stored `*_prompt_service` to the native client's provider/model preference, populated from Connectors |
| 3   | Dual-path lifetime                     | Native on 7.0+, `ai-services` on <7.0; **legacy path kept indefinitely**                                                |
| 4   | New-endpoint transport                 | **REST** (`apiFetch` + `X-WP-Nonce`), not admin-ajax                                                                    |

## 5. Current architecture (baseline)

- **Hard dependency:** `Requires Plugins: ai-services` header (`filter-ai.php:14`);
  runtime gate `function_exists( 'ai_services' )` (`filter-ai.php:178`).
- **PHP (batch jobs):** `includes/batch*.php` call
  `ai_services()->has_available_services()` → `get_available_service()` →
  `$service->get_model()` → `$model->generate_text()` / image, using
  `Felix_Arntz\AI_Services\…\{Content,Parts,Content_Role,AI_Capability,Helpers}`.
  Canonical example: `includes/batchImageAltText.php:234-303` (multimodal alt text —
  text prompt + base64 image data part).
- **JS (editor/UI):** `src/utils/ai/services/generateText.ts:20` and
  `generateImage.ts:13` call `window.aiServices` via
  `waitForAIPlugin()` (`src/utils/useAIPlugin.ts`),
  `select(aiPlugin.ai.store).getAvailableService()`, then
  `resolvedService.generateText()` / `getModel().generateImage()`.
- **Credentials & provider choice:** keys owned by `ai-services`; the API Keys page
  delegates to its `ApiKeyControl` (`src/settings/page/apiKeys.tsx:31-35`). Per-feature
  provider is stored as `*_prompt_service` slugs in `filter_ai_settings`
  (`includes/settings.php:32-106`); empty = "auto".
- **Asset wiring:** enqueue force-adds `ais-ai`, `ais-settings`, `ais-components`
  script deps (`filter-ai.php:183`); injects `window.filter_ai_api`
  (admin-ajax url + nonce), `filter_ai_dependencies`, and settings
  (`filter-ai.php:200-235`).
- **Security:** every AJAX handler calls `filter_ai_check_api_request()` —
  `check_ajax_referer('filter_ai_api')` + `current_user_can('manage_options')`
  (`includes/batch.php:20-26`).

## 6. Target architecture

### 6.1 Runtime backend detection (one place per side)

```
if ( function_exists( 'wp_ai_client_prompt' ) )   → Native backend (WP 7.0+)
elseif ( function_exists( 'ai_services' ) )        → Legacy backend (ai-services)
else                                               → no backend → admin notice, features hidden
```

Native is preferred when both are present. The detector result also drives a JS mode
flag (`window.filter_ai_ai.mode = 'native' | 'legacy'`).

### 6.2 PHP backend abstraction

Interface `Filter_AI_Provider` (new, e.g. `includes/providers/`):

- `is_text_supported( array $capabilities, ?string $provider_slug ) : bool`
- `is_image_supported( ?string $provider_slug ) : bool`
- `generate_text( string $prompt, array $files, string $feature, array $capabilities, ?string $provider_slug ) : string|WP_Error`
- `generate_image( string $prompt, array $config, string $feature, ?string $provider_slug ) : array|WP_Error`
- `list_providers() : array` // slug → { label, capabilities }

Implementations:

- **`Filter_AI_Provider_AiServices`** — lifts today's exact flow verbatim
  (`includes/batchImageAltText.php:252-293`), including `Content`/`Parts` multimodal
  assembly and `Helpers::get_text_from_contents()`.
- **`Filter_AI_Provider_Native`** — wraps `wp_ai_client_prompt()` (returns a
  `WP_AI_Client_Prompt_Builder`): `->with_file()` for multimodal input,
  `->using_model_preference()` for the per-feature provider,
  `->is_supported_for_text_generation()` / `_image_generation()` guards,
  `->generate_text()` / `->generate_image()` returning `WP_Error` on failure.
  Underlying SDK types live under the **`WordPress\AiClient\…`** namespace (camelCase,
  e.g. `WordPress\AiClient\Messages\Enums\ModalityEnum`,
  `WordPress\AiClient\Files\DTO\File`) — all confirmed present on a live WP 7.0 install
  (see §7).

Factory `filter_ai_provider()` performs §6.1 detection and caches the instance.
The `includes/batch*.php` files change inline `ai_services()` calls to
`filter_ai_provider()->generate_text(...)` / `->generate_image(...)`.

### 6.3 JavaScript backend abstraction

`generateText()` and `generateImage()` **keep identical public signatures** so no
feature component changes. Internally they branch on `window.filter_ai_ai.mode`:

- **legacy** → existing `window.aiServices` path, untouched.
- **native** → `apiFetch` to the first-party REST routes (§6.4).

`useAIPlugin` / `useService` / `useServices` gain native equivalents behind the same
hook names (native provider list comes from `GET /providers`).

### 6.4 First-party REST layer (7.0+ only)

`Filter_AI_REST_Controller` registering `filter-ai/v1`:

- `POST /generate-text` — body `{ feature, prompt, parts, capabilities, provider }`
  (`parts`/files carry multimodal input, e.g. the image for alt-text)
- `POST /generate-image` — body `{ feature, prompt, candidateCount, aspectRatio, provider }`
- `GET  /providers` — providers configured in _Settings → Connectors_ (slug, label, capabilities)
- `GET  /is-supported?capability=text|image` — capability-parameterised support check

Each route delegates to `filter_ai_provider()`. `permission_callback` =
`current_user_can( 'manage_options' )`; nonce via `apiFetch`'s `X-WP-Nonce`. This
reuses the existing security posture. (The new generate calls use REST, not the
existing admin-ajax batch transport; the batch endpoints stay on admin-ajax.)

**Why four routes are sufficient — coverage matrix.** Every AI interaction in the
plugin is one of four operations. Code inventory confirms there are no others (no
streaming, embeddings, speech, TTS, or video usage anywhere):

| Plugin operation                                                                                                                      | Call sites (today)                                                                                                                         | Native route                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Generate text (SEO title/meta, post title/excerpt/tags/summary, FAQs, grammar fix, 4× customise-text, WC product description/excerpt) | `src/utils/ai/get*FromContent.ts`, `customiseText.ts`, `fixTextGrammar.ts`, `woocommerce/ProductToolbar.tsx:88` → all via `generateText()` | `POST /generate-text`                      |
| Generate text **with image input** (alt text from URL)                                                                                | `getAltTextFromUrl.ts:37` (`MULTIMODAL_INPUT` + `TEXT_GENERATION`) → `generateText()` w/ `parts`                                           | `POST /generate-text` (multimodal `parts`) |
| Generate image                                                                                                                        | `getGeneratedImages.ts`, media-library tab → `generateImage()`                                                                             | `POST /generate-image`                     |
| List configured providers (settings dropdowns + per-feature resolution)                                                               | `useService.ts`, `useServices.ts`, `getService.ts` (`getServices()`)                                                                       | `GET /providers`                           |
| Is a provider/capability available (UI gating)                                                                                        | `aiServiceNotice/index.tsx:11`, `generateImageTab/…:36` (`getAvailableService()`)                                                          | `GET /is-supported`                        |

Two operations deliberately **do not** get a Filter AI route:

- **Saving a generated image to the Media Library** uses core's existing
  `POST wp/v2/media` (via `@wordpress/media-utils`), exactly as today. On native we
  return the image data URI from `/generate-image`; the existing client-side upload is
  unchanged.
- **Batch jobs** (alt text, SEO title, meta description) run server-side under Action
  Scheduler and call `filter_ai_provider()` directly in PHP — they never use REST.

(`/is-supported` could be folded into `/providers` by deriving support from each
provider's advertised capabilities; kept separate so the notice components can do a
cheap authoritative boolean check rather than fetch the full list.)

### 6.5 Provider-selection mapping

`*_prompt_service` settings stay as-is (`includes/settings.php`). A resolver converts
a stored slug + required capability into the native client's model/provider preference,
using the **confirmed** Connectors functions `wp_get_connectors()` / `wp_get_connector()`
/ `wp_is_connector_registered()` to enumerate configured providers (this is also what
`GET /providers` returns). Empty slug = "auto" in both backends. Core already wires
Connector-stored keys into the AI client automatically (verified internal
`_wp_connectors_pass_default_keys_to_ai_client`), so Filter AI never handles keys on
7.0+. A small slug mapping table reconciles ai-services slugs (`openai`/`anthropic`/`google`)
with Connectors slugs — to be finalised once a Connector is configured on the test env.

### 6.6 Bootstrap & detection changes (`filter-ai.php`)

- **Remove `Requires Plugins: ai-services`** (line 14). The header cannot express
  "ai-services OR WP ≥ 7.0", so it would block activation on a 7.0-only site.
  Detection moves to runtime (§6.1) with a friendly admin notice when no backend exists.
- **Enqueue gate** (line 178): load when _either_ backend exists. Only force the
  `ais-*` script deps (line 183) on the legacy path.
- **Inject** `window.filter_ai_ai = { mode, restUrl, nonce }` for the native path.
- **Guard** the `ai_services_request_timeout` filter (line 240) to the legacy path.

### 6.7 Credential UX

- **< 7.0:** API Keys page unchanged (delegates to `ai-services` `ApiKeyControl`).
- **7.0+:** keys live in core's _Settings → Connectors_; replace that page with an
  info panel + link there, and generalise the "no service configured" notice
  (`src/components/aiServiceNotice`) to point at Connectors.

## 7. Spike results (verified on a live WP 7.0 install)

Run on 2026-06-03 against `wp-env` WP 7.0 (dev) and WP 6.7 (tests) — see §11.

**Confirmed present on WP 7.0 core (fresh install, no provider configured):**

- `wp_ai_client_prompt()` — **YES** (function exists).
- `WP_AI_Client_Prompt_Builder` — **YES**.
- `WordPress\AiClient\AiClient`, `WordPress\AiClient\Messages\Enums\ModalityEnum`,
  `WordPress\AiClient\Files\DTO\File` — **YES** (namespace is `WordPress\AiClient\…`,
  camelCase).
- Connectors API — **YES**: public `wp_get_connectors()`, `wp_get_connector()`,
  `wp_is_connector_registered()`, plus a full `wp_register_options_connectors_*` /
  `wp_get_options_connectors_*` admin family, and internals
  `_wp_connectors_register_default_ai_providers`,
  `_wp_connectors_pass_default_keys_to_ai_client`, `_wp_connectors_is_ai_api_key_valid`,
  `_wp_connectors_mask_api_key`.
- On WP 6.7: none of the above exist; `ai_services()` exists. Confirms clean detection
  via `function_exists('wp_ai_client_prompt')` vs `function_exists('ai_services')`.

**Finding that affects design — `prompt_ai` capability:** on a fresh WP 7.0,
`user_can( $admin, 'prompt_ai' )` returned **false**. So `prompt_ai` is _not_
auto-granted to administrators. This **validates gating our REST routes on
`current_user_can('manage_options')`** (gating on `prompt_ai` would 403 even admins).
TODO during build: confirm how/when core grants `prompt_ai` (map_meta_cap? requires a
configured provider?) and decide whether to additionally honour it.

**Still to verify (needs a Connector key on the test env — cheap, no code):**

- Exact `using_model_preference()` / `with_file()` signatures and image-generation
  return shape (data URI vs `File` → Media Library save path).
- Connector provider **slugs** (to finalise the ai-services ↔ Connectors mapping table).

## 8. Testing & verification

- Both PHP backends exercised; `phpcs` (`composer check-cs`); `tsc` (`npm run typecheck`);
  `npm run build`.
- Manual matrix: legacy on WP < 7.0 + ai-services; native on WP 7.0 + a Connectors key.
- **Final local "test it yourself" handoff:** start the site and log in as admin on a
  WP 7.0 environment with a Connector configured, so every feature can be driven in the
  browser before sign-off. (Per project standard.)

## 9. File-change map (indicative)

- `filter-ai.php` — detection, enqueue gate, JS mode injection, remove `Requires Plugins`.
- `includes/providers/` (new) — `Filter_AI_Provider` interface + AiServices/Native impls + `filter_ai_provider()` factory.
- `includes/rest/` (new) — `Filter_AI_REST_Controller` (`filter-ai/v1`).
- `includes/batchImageAltText.php`, `batchSEOTitle.php`, `batchSEOMetaDescription.php`,
  and other AI-calling includes — swap inline `ai_services()` for `filter_ai_provider()`.
- `src/utils/ai/services/generateText.ts`, `generateImage.ts` — mode branch + native apiFetch path.
- `src/utils/ai/services/useService.ts`, `useServices.ts`, `getService.ts` — native provider enumeration via `GET /providers`.
- `src/utils/useAIPlugin.ts` — native availability/accessor equivalent.
- `src/settings/page/apiKeys.tsx` — 7.0+ Connectors info panel.
- `src/components/aiServiceNotice/*`, `src/mediaLibrary/tabs/generateImageTab/*` — gate via `GET /is-supported`; generalise messaging per backend.
- `readme.txt` — document WP 7.0 native support & Connectors.

## 10. Open questions

None blocking. All architectural decisions resolved (see §4). Remaining unknowns are
the implementation details listed under §7 ("still to verify"), unblocked once a
Connector key is added on the test env.

## 11. Local test harness (`wp-env`)

A Dockerised dual-version harness is scaffolded via `@wordpress/env` (v11.7.0).
Config: `.wp-env.json` in the plugin root.

- **dev → `http://localhost:8888` (WP 7.0):** the **native** target. Filter AI is
  mounted via `mappings` but left **inactive** (`plugins: []`) because the current
  `Requires Plugins: ai-services` header (§6.6) blocks activation here until that change
  lands. This is intentional — it keeps `wp-env start` clean and reflects that the
  native path has no code yet.
- **tests → `http://localhost:8889` (WP 6.7):** the **legacy** path. `ai-services`
  (0.7.4) + Filter AI both auto-activated (ai-services listed first so the dependency
  header is satisfied).

Commands: `wp-env start` (both), `wp-env stop`, `wp-env run cli wp …` (dev),
`wp-env run tests-cli wp …` (legacy), `wp-env clean all`, `wp-env destroy`.
Admin login on each: user `admin` / password `password` at `/wp-admin`.

**Note (config style):** the single-file `env: { development, tests }` shape is
_deprecated_ in wp-env 11.7.0 (still fully functional; removal slated for "a future
version"). It was kept over the recommended `--config` split because `--config` can key
the instance off the working directory and clobber the 7.0 instance with the 6.7 one.
Migration path when wp-env removes `env`: separate config files in **separate
directories** (guaranteed instance isolation), each mapping the plugin via a relative
path.

**Prerequisite for full native testing:** add a provider key in _Settings → Connectors_
on the 7.0 env (a real key; small cost). Detection/routing/settings can be tested
without it.
