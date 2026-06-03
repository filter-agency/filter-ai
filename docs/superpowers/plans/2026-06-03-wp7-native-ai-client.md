# WordPress 7.0 Native AI Client Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Filter AI use WordPress 7.0's native AI Client + Connectors when available, while continuing to use the `ai-services` plugin on WP < 7.0 — behind a single backend abstraction on each of the PHP and JS sides.

**Architecture:** A `Filter_AI_Provider` interface with two implementations (`…_Native`, `…_AiServices`) selected once by a runtime detector (`function_exists('wp_ai_client_prompt')` vs `function_exists('ai_services')`). PHP batch jobs call the provider directly. The block-editor JS keeps its existing `generateText()`/`generateImage()` signatures but branches on an injected `mode` flag: legacy → `window.aiServices`; native → first-party REST routes (`filter-ai/v1`) that delegate to `wp_ai_client_prompt()` server-side. Credentials on 7.0+ live in core's _Settings → Connectors_.

**Tech Stack:** PHP 7.4+ (WordPress plugin), React/TypeScript (`@wordpress/scripts`), PHPUnit 9 (new), Jest via `wp-scripts test-unit-js` (new), `@wordpress/env` dual harness (WP 7.0 :8888 / WP 6.7 :8889).

**Spec:** `docs/superpowers/specs/2026-06-03-wp7-native-ai-client-design.md`

**Branch:** `feature/wp7-native-ai-client` (already created).

---

## File Structure

**New (PHP):**

- `includes/providers/detection.php` — pure detection logic (`filter_ai_detect_backend()`) + factory (`filter_ai_provider()`).
- `includes/providers/interface-provider.php` — `Filter_AI_Provider` interface.
- `includes/providers/class-provider-aiservices.php` — legacy backend (lifts current `ai_services()` flow).
- `includes/providers/class-provider-native.php` — native backend (`wp_ai_client_prompt()`).
- `includes/providers/slug-map.php` — pure `filter_ai_map_service_slug()` resolver.
- `includes/rest/class-rest-controller.php` — `Filter_AI_REST_Controller` (`filter-ai/v1`).
- `tests/php/bootstrap.php`, `tests/php/DetectionTest.php`, `tests/php/SlugMapTest.php`.
- `phpunit.xml.dist`.

**New (JS):**

- `src/utils/ai/services/nativeClient.ts` — `apiFetch` wrapper for `filter-ai/v1`.
- `src/utils/ai/services/mode.ts` — reads `window.filter_ai_ai`.
- `src/utils/ai/services/generateText.test.ts`, `generateImage.test.ts`.
- `jest.config.js`.

**Modified:**

- `filter-ai.php` — remove `Requires Plugins` header; runtime detection; conditional enqueue; inject `window.filter_ai_ai`; guard `ai_services_request_timeout`; load new includes.
- `includes/batchImageAltText.php`, `includes/batchSEOTitle.php`, `includes/batchSEOMetaDescription.php` — call `filter_ai_provider()`.
- `src/utils/ai/services/generateText.ts`, `generateImage.ts` — mode branch.
- `src/utils/ai/services/useService.ts`, `useServices.ts`, `getService.ts`, `src/utils/useAIPlugin.ts` — native provider enumeration.
- `src/components/aiServiceNotice/index.tsx`, `src/mediaLibrary/tabs/generateImageTab/generateImgTabView.tsx` — native availability gating + Connectors messaging.
- `src/settings/page/apiKeys.tsx` — Connectors info panel on 7.0+.
- `composer.json`, `package.json` — test deps/scripts.
- `readme.txt` — document WP 7.0 native support.

---

## Task 1: Confirm the native API surface against the live WP 7.0 env

No code change — this captures the exact method signatures the Native backend (Tasks 8, 13, 15) is coded against, resolving the §7 "still to verify" items.

**Files:** none (discovery only). Output: paste results into the PR description / a scratch note.

> **STATUS: COMPLETED 2026-06-03. Findings (these are now baked into Tasks 9 & 12):**
>
> - `wp_ai_client_prompt()` returns `WP_AI_Client_Prompt_Builder`, which exposes only
>   `__construct(WordPress\AiClient\Providers\ProviderRegistry $registry, $prompt)`,
>   `using_abilities($abilities)`, and `__call()`. **All fluent methods
>   (`with_file`, `using_model_preference`, `generate_text`, `generate_image`,
>   `is_supported_for_*`) are magic via `__call`** — confirmed callable: a keyless env
>   returns `is_supported_for_text_generation() === false` and
>   `is_supported_for_image_generation() === false` (no error).
> - `wp_get_connectors()` returns an **array** keyed by slug; each value is an array
>   `{ name, description, type, authentication{method,credentials_url,setting_name,constant_name,env_var_name}, plugin{file,is_active} }`.
>   **AI providers have `type === 'ai_provider'`** (`anthropic`, `google`, `openai`);
>   `akismet` is `type === 'spam_filtering'` and must be excluded from provider lists.
> - Provider slugs (`openai`/`anthropic`/`google`) **match ai-services exactly** → the
>   Task 7 slug-map needs no aliases.
> - Provider/model API: `WordPress\AiClient\AiClient::defaultRegistry()` →
>   `ProviderRegistry` with `getRegisteredProviderIds()`, `hasProvider($id)`,
>   `isProviderConfigured($id)`, `findProviderModelsMetadataForSupport($id, $requirements)`,
>   `getProviderModel(...)`. `AiClient::isConfigured()` is the global check. This is the
>   source for Task 12 (replaces the earlier `wp_get_connector()->get_models()` guess).
>   Residual unknown: exact `$requirements` argument shape for
>   `findProviderModelsMetadataForSupport()`.

- [ ] **Step 1: Dump the PromptBuilder + Connectors surface**

Create `/Users/paulhalfpenny/Sites/filter-ai/.wp-probe2.php`:

```php
<?php
$b = wp_ai_client_prompt( 'ping' );
$rc = new ReflectionClass( $b );
echo "PROMPT BUILDER METHODS:\n";
foreach ( $rc->getMethods( ReflectionMethod::IS_PUBLIC ) as $m ) {
	$params = array_map(
		fn( $p ) => ( $p->hasType() ? $p->getType() . ' ' : '' ) . '$' . $p->getName(),
		$m->getParameters()
	);
	echo '  ' . $m->getName() . '(' . implode( ', ', $params ) . ")\n";
}
echo "\nCONNECTORS (wp_get_connectors):\n";
$connectors = function_exists( 'wp_get_connectors' ) ? wp_get_connectors() : array();
foreach ( (array) $connectors as $key => $c ) {
	echo '  ' . ( is_string( $key ) ? $key : '' ) . ' => ' . ( is_object( $c ) ? get_class( $c ) : gettype( $c ) ) . "\n";
	if ( is_object( $c ) ) {
		echo '     methods: ' . implode( ', ', get_class_methods( $c ) ) . "\n";
	}
}
```

- [ ] **Step 2: Run it and record the output**

Run: `wp-env run cli wp eval-file wp-content/plugins/filter-ai/.wp-probe2.php`
Expected: a list of `with_text/with_file/using_model_preference/using_temperature/generate_text/generate_image/is_supported_for_text_generation/...` method names with their parameter types, and the registered connectors (e.g. `openai`, `anthropic`, `google`) with their class + methods.

- [ ] **Step 3: Confirm provider→model resolution path**

Run: `wp-env run cli wp eval 'foreach((array)wp_get_connectors() as $k=>$c){echo $k.": ".(method_exists($c,"get_models")?"has get_models":implode(",",get_class_methods($c)))."\n";}'`
Expected: identifies how to list a provider's model IDs (for Task 12's `using_model_preference()`). Record the slug strings — these feed Task 7's slug map.

- [ ] **Step 4: Clean up**

```bash
rm -f /Users/paulhalfpenny/Sites/filter-ai/.wp-probe2.php
```

---

## Task 2: PHP unit-test harness (PHPUnit, no WordPress)

**Files:**

- Create: `phpunit.xml.dist`
- Create: `tests/php/bootstrap.php`
- Create: `tests/php/SmokeTest.php`
- Modify: `composer.json` (require-dev + script)

- [ ] **Step 1: Add PHPUnit dev dependency + script**

In `composer.json`, add to `require-dev`:

```json
"phpunit/phpunit": "^9.6"
```

And add to `scripts`:

```json
"test-php": [ "@php ./vendor/bin/phpunit" ]
```

- [ ] **Step 2: Create the PHPUnit config**

`phpunit.xml.dist`:

```xml
<?xml version="1.0"?>
<phpunit
	bootstrap="tests/php/bootstrap.php"
	colors="true"
	failOnWarning="true"
	failOnRisky="true">
	<testsuites>
		<testsuite name="unit">
			<directory suffix="Test.php">tests/php</directory>
		</testsuite>
	</testsuites>
</phpunit>
```

- [ ] **Step 3: Create the bootstrap (defines ABSPATH so guarded includes load standalone)**

`tests/php/bootstrap.php`:

```php
<?php
// Allow includes/*.php guards (`if ( ! defined( 'ABSPATH' ) ) exit;`) to pass
// when unit-testing pure-logic files outside WordPress.
define( 'ABSPATH', __DIR__ . '/' );

require_once __DIR__ . '/../../vendor/autoload.php';
```

- [ ] **Step 4: Add a smoke test**

`tests/php/SmokeTest.php`:

```php
<?php
use PHPUnit\Framework\TestCase;

class SmokeTest extends TestCase {
	public function test_bootstrap_defines_abspath(): void {
		$this->assertTrue( defined( 'ABSPATH' ) );
	}
}
```

- [ ] **Step 5: Install and run**

Run: `composer update phpunit/phpunit && composer test-php`
Expected: PASS (1 test, 1 assertion).

- [ ] **Step 6: Commit**

```bash
git add composer.json composer.lock phpunit.xml.dist tests/php/bootstrap.php tests/php/SmokeTest.php
git commit -m "test: add PHPUnit harness for pure-logic unit tests"
```

---

## Task 3: JS unit-test harness (Jest via wp-scripts)

**Files:**

- Create: `jest.config.js`
- Create: `src/utils/ai/services/smoke.test.ts`
- Modify: `package.json` (script)

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add:

```json
"test:js": "wp-scripts test-unit-js --config jest.config.js"
```

- [ ] **Step 2: Create jest config that resolves the `@/` alias**

`jest.config.js`:

```js
const defaultConfig = require('@wordpress/scripts/config/jest-unit.config.js');

module.exports = {
  ...defaultConfig,
  moduleNameMapper: {
    ...(defaultConfig.moduleNameMapper || {}),
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
```

- [ ] **Step 3: Add a smoke test**

`src/utils/ai/services/smoke.test.ts`:

```ts
describe('jest harness', () => {
  it('runs typescript tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm run test:js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json jest.config.js src/utils/ai/services/smoke.test.ts
git commit -m "test: add Jest harness for TS unit tests"
```

---

## Task 4: Backend detection (pure logic, TDD)

**Files:**

- Create: `tests/php/DetectionTest.php`
- Create: `includes/providers/detection.php`

- [ ] **Step 1: Write the failing test**

`tests/php/DetectionTest.php`:

```php
<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/providers/detection.php';

class DetectionTest extends TestCase {
	public function test_prefers_native_when_both_present(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, true ) );
	}
	public function test_native_when_only_native(): void {
		$this->assertSame( 'native', filter_ai_detect_backend( true, false ) );
	}
	public function test_legacy_when_only_legacy(): void {
		$this->assertSame( 'legacy', filter_ai_detect_backend( false, true ) );
	}
	public function test_none_when_neither(): void {
		$this->assertSame( 'none', filter_ai_detect_backend( false, false ) );
	}
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `composer test-php`
Expected: FAIL — "Call to undefined function filter_ai_detect_backend()".

- [ ] **Step 3: Implement the pure detector (factory added in Task 6)**

`includes/providers/detection.php`:

```php
<?php
/**
 * Backend detection + provider factory.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Decide which AI backend to use. Pure function — unit-testable.
 *
 * @param bool $has_native Whether the WP 7.0 native client is present.
 * @param bool $has_legacy Whether the ai-services plugin is present.
 * @return string 'native' | 'legacy' | 'none'.
 */
function filter_ai_detect_backend( $has_native, $has_legacy ) {
	if ( $has_native ) {
		return 'native';
	}
	if ( $has_legacy ) {
		return 'legacy';
	}
	return 'none';
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `composer test-php`
Expected: PASS (DetectionTest: 4 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/php/DetectionTest.php includes/providers/detection.php
git commit -m "feat: add backend detection logic"
```

---

## Task 5: Provider interface

**Files:**

- Create: `includes/providers/interface-provider.php`

- [ ] **Step 1: Define the interface**

`includes/providers/interface-provider.php`:

```php
<?php
/**
 * Contract every AI backend implements. The version branch lives only in the
 * factory (Task 6); callers depend on this interface.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

interface Filter_AI_Provider {

	/**
	 * @param string[]    $capabilities  Capability slugs the feature needs.
	 * @param string|null $provider_slug Stored per-feature provider, or null for auto.
	 */
	public function is_text_supported( array $capabilities, $provider_slug = null );

	/** @param string|null $provider_slug Stored per-feature provider, or null. */
	public function is_image_supported( $provider_slug = null );

	/**
	 * @param string      $prompt        The prompt text.
	 * @param array       $files         Each: [ 'mime_type' => string, 'data' => base64-or-data-uri ].
	 * @param string      $feature       Filter AI feature id (e.g. 'filter-ai-seo-title').
	 * @param string[]    $capabilities  Required capabilities.
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return string|WP_Error Generated text, or WP_Error on failure.
	 */
	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null );

	/**
	 * @param string      $prompt        The prompt text.
	 * @param array       $config        [ 'candidate_count' => int, 'aspect_ratio' => string ].
	 * @param string      $feature       Filter AI feature id.
	 * @param string|null $provider_slug Stored per-feature provider, or null.
	 * @return array|WP_Error List of image data URIs / URLs, or WP_Error.
	 */
	public function generate_image( $prompt, array $config, $feature, $provider_slug = null );

	/**
	 * @return array Map of slug => [ 'label' => string, 'capabilities' => string[] ] for configured providers.
	 */
	public function list_providers();
}
```

- [ ] **Step 2: Lint**

Run: `composer check-cs -- includes/providers/interface-provider.php`
Expected: no errors (warnings about docblocks acceptable).

- [ ] **Step 3: Commit**

```bash
git add includes/providers/interface-provider.php
git commit -m "feat: add Filter_AI_Provider interface"
```

---

## Task 6: Provider factory

**Files:**

- Modify: `includes/providers/detection.php` (append the factory)

- [ ] **Step 1: Append the factory**

Add to the end of `includes/providers/detection.php`:

```php
/**
 * Resolve the active AI backend (cached for the request).
 *
 * @return Filter_AI_Provider|null Null when no backend is available.
 */
function filter_ai_provider() {
	static $instance = null;
	static $resolved = false;

	if ( $resolved ) {
		return $instance;
	}
	$resolved = true;

	$backend = filter_ai_detect_backend(
		function_exists( 'wp_ai_client_prompt' ),
		function_exists( 'ai_services' )
	);

	if ( 'native' === $backend ) {
		require_once __DIR__ . '/interface-provider.php';
		require_once __DIR__ . '/slug-map.php';
		require_once __DIR__ . '/class-provider-native.php';
		$instance = new Filter_AI_Provider_Native();
	} elseif ( 'legacy' === $backend ) {
		require_once __DIR__ . '/interface-provider.php';
		require_once __DIR__ . '/class-provider-aiservices.php';
		$instance = new Filter_AI_Provider_AiServices();
	}

	return $instance;
}
```

- [ ] **Step 2: Verify detection test still passes (no regression)**

Run: `composer test-php`
Expected: PASS (the factory references classes built in Tasks 7–8; it is only _called_ at runtime, so the unit test that includes this file must not invoke `filter_ai_provider()` — DetectionTest only calls the pure function. Confirm no fatal on include).

- [ ] **Step 3: Commit**

```bash
git add includes/providers/detection.php
git commit -m "feat: add provider factory with cached backend resolution"
```

---

## Task 7: Slug-map resolver (pure logic, TDD)

**Files:**

- Create: `tests/php/SlugMapTest.php`
- Create: `includes/providers/slug-map.php`

- [ ] **Step 1: Write the failing test**

`tests/php/SlugMapTest.php`:

```php
<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../includes/providers/slug-map.php';

class SlugMapTest extends TestCase {
	public function test_empty_stored_slug_means_auto(): void {
		$this->assertNull( filter_ai_map_service_slug( '', array( 'openai', 'anthropic' ) ) );
	}
	public function test_returns_slug_when_available(): void {
		$this->assertSame( 'openai', filter_ai_map_service_slug( 'openai', array( 'openai', 'google' ) ) );
	}
	public function test_falls_back_to_auto_when_unavailable(): void {
		$this->assertNull( filter_ai_map_service_slug( 'cohere', array( 'openai', 'google' ) ) );
	}
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `composer test-php`
Expected: FAIL — "Call to undefined function filter_ai_map_service_slug()".

- [ ] **Step 3: Implement**

`includes/providers/slug-map.php`:

```php
<?php
/**
 * Reconcile a stored per-feature provider slug with the providers actually
 * available on the active backend.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @param string   $stored_slug The saved *_prompt_service value ('' = auto).
 * @param string[] $available   Slugs currently configured/available.
 * @return string|null The slug to prefer, or null for automatic selection.
 */
function filter_ai_map_service_slug( $stored_slug, array $available ) {
	if ( '' === $stored_slug ) {
		return null;
	}
	// ai-services and Connectors both use 'openai' / 'anthropic' / 'google'
	// (confirmed in Task 1). Extend this alias map only if Task 1 shows drift.
	$aliases    = array();
	$normalised = isset( $aliases[ $stored_slug ] ) ? $aliases[ $stored_slug ] : $stored_slug;

	return in_array( $normalised, $available, true ) ? $normalised : null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `composer test-php`
Expected: PASS (SlugMapTest: 3 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/php/SlugMapTest.php includes/providers/slug-map.php
git commit -m "feat: add provider slug-map resolver"
```

---

## Task 8: Legacy backend (ai-services)

Lifts the existing `ai_services()` flow (`includes/batchImageAltText.php:234-293`) into a class with no behaviour change.

**Files:**

- Create: `includes/providers/class-provider-aiservices.php`

- [ ] **Step 1: Implement the legacy backend**

`includes/providers/class-provider-aiservices.php`:

```php
<?php
/**
 * Legacy backend — delegates to the ai-services plugin (WP < 7.0).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Felix_Arntz\AI_Services\Services\API\Enums\Content_Role;
use Felix_Arntz\AI_Services\Services\API\Types\Content;
use Felix_Arntz\AI_Services\Services\API\Types\Parts;
use Felix_Arntz\AI_Services\Services\API\Helpers;

class Filter_AI_Provider_AiServices implements Filter_AI_Provider {

	private function filter( array $capabilities, $provider_slug ) {
		$filter = array( 'capabilities' => $capabilities );
		if ( ! empty( $provider_slug ) ) {
			$filter['slugs'] = array( $provider_slug );
		}
		return $filter;
	}

	public function is_text_supported( array $capabilities, $provider_slug = null ) {
		return ai_services()->has_available_services( $this->filter( $capabilities, $provider_slug ) );
	}

	public function is_image_supported( $provider_slug = null ) {
		return ai_services()->has_available_services(
			$this->filter( array( 'image_generation' ), $provider_slug )
		);
	}

	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null ) {
		if ( ! $this->is_text_supported( $capabilities, $provider_slug ) ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'AI service not available', 'filter-ai' ) );
		}

		$service = empty( $provider_slug )
			? ai_services()->get_available_service( array( 'capabilities' => $capabilities ) )
			: ai_services()->get_available_service( $provider_slug );

		$parts = new Parts();
		$parts->add_text_part( $prompt );
		foreach ( $files as $file ) {
			$data = 0 === strpos( $file['data'], 'data:' )
				? $file['data']
				: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
			$parts->add_file_data_part( $file['mime_type'], $data );
		}

		$content    = new Content( Content_Role::USER, $parts );
		$model      = $service->get_model( array_merge( array( 'feature' => $feature ), array( 'capabilities' => $capabilities ) ) );
		$candidates = $model->generate_text( $content );

		return Helpers::get_text_from_contents( Helpers::get_candidate_contents( $candidates ) );
	}

	public function generate_image( $prompt, array $config, $feature, $provider_slug = null ) {
		if ( ! $this->is_image_supported( $provider_slug ) ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'AI image service not available', 'filter-ai' ) );
		}

		$service = empty( $provider_slug )
			? ai_services()->get_available_service( array( 'capabilities' => array( 'image_generation' ) ) )
			: ai_services()->get_available_service( $provider_slug );

		$model      = $service->get_model(
			array(
				'feature'          => $feature,
				'capabilities'     => array( 'image_generation' ),
				'generationConfig' => array(
					'candidateCount' => isset( $config['candidate_count'] ) ? $config['candidate_count'] : 1,
					'aspectRatio'    => isset( $config['aspect_ratio'] ) ? $config['aspect_ratio'] : null,
				),
			)
		);
		$candidates = $model->generate_image( $prompt );

		$urls = array();
		foreach ( $candidates as $candidate ) {
			foreach ( $candidate->get_content()->get_parts() as $part ) {
				$data = method_exists( $part, 'get_inline_data' ) ? $part->get_inline_data() : null;
				if ( $data ) {
					$urls[] = $data;
					break;
				}
			}
		}
		return $urls;
	}

	public function list_providers() {
		$out = array();
		foreach ( ai_services()->get_available_services() as $slug => $service ) {
			$out[ $slug ] = array(
				'label'        => method_exists( $service, 'get_service_metadata' ) ? $service->get_service_metadata()->get_name() : $slug,
				'capabilities' => array(),
			);
		}
		return $out;
	}
}
```

- [ ] **Step 2: PHP lint**

Run: `composer check-cs -- includes/providers/class-provider-aiservices.php`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add includes/providers/class-provider-aiservices.php
git commit -m "feat: add ai-services (legacy) backend"
```

---

## Task 9: Native backend (auto model selection)

Implements the confirmed `wp_ai_client_prompt()` path. Provider _preference_ (per-feature slug) is layered on in Task 12 once Task 1 confirms the connector→model API; until then it auto-selects.

**Files:**

- Create: `includes/providers/class-provider-native.php`

- [ ] **Step 1: Implement the native backend**

`includes/providers/class-provider-native.php` (adjust method names only if Task 1 output differs):

```php
<?php
/**
 * Native backend — WordPress 7.0+ AI Client (`wp_ai_client_prompt()`).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Filter_AI_Provider_Native implements Filter_AI_Provider {

	private function builder( $prompt, array $files = array() ) {
		$builder = wp_ai_client_prompt( $prompt );
		foreach ( $files as $file ) {
			$data = 0 === strpos( $file['data'], 'data:' )
				? $file['data']
				: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
			$builder = $builder->with_file( $data );
		}
		return $builder;
	}

	public function is_text_supported( array $capabilities, $provider_slug = null ) {
		return $this->builder( 'capability check' )->is_supported_for_text_generation();
	}

	public function is_image_supported( $provider_slug = null ) {
		return $this->builder( 'capability check' )->is_supported_for_image_generation();
	}

	public function generate_text( $prompt, array $files, $feature, array $capabilities, $provider_slug = null ) {
		$builder = $this->builder( $prompt, $files );
		if ( ! $builder->is_supported_for_text_generation() ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for text generation.', 'filter-ai' ) );
		}
		return $builder->generate_text(); // string|WP_Error
	}

	public function generate_image( $prompt, array $config, $feature, $provider_slug = null ) {
		$builder = $this->builder( $prompt );
		if ( ! $builder->is_supported_for_image_generation() ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI provider is configured for image generation.', 'filter-ai' ) );
		}
		$file = $builder->generate_image();
		if ( is_wp_error( $file ) ) {
			return $file;
		}
		return array( $file->getDataUri() );
	}

	public function list_providers() {
		$out = array();
		if ( ! function_exists( 'wp_get_connectors' ) ) {
			return $out;
		}
		$registry = class_exists( 'WordPress\\AiClient\\AiClient' ) ? WordPress\AiClient\AiClient::defaultRegistry() : null;
		foreach ( (array) wp_get_connectors() as $slug => $connector ) {
			// Connectors are arrays; only AI providers (type 'ai_provider') belong here
			// — e.g. 'akismet' is type 'spam_filtering' and must be excluded (Task 1).
			if ( ! is_string( $slug ) || ! is_array( $connector ) || 'ai_provider' !== ( $connector['type'] ?? '' ) ) {
				continue;
			}
			$out[ $slug ] = array(
				'label'        => isset( $connector['name'] ) ? $connector['name'] : $slug,
				'capabilities' => array(),
				'is_available' => $registry ? (bool) $registry->isProviderConfigured( $slug ) : false,
			);
		}
		return $out;
	}
}
```

- [ ] **Step 2: Reconcile against Task 1 output**

Compare each builder method name above (`with_file`, `is_supported_for_text_generation`, `is_supported_for_image_generation`, `generate_text`, `generate_image`, `getDataUri`) to the Task 1 reflection dump. Fix any mismatched name/signature inline.

- [ ] **Step 3: PHP lint**

Run: `composer check-cs -- includes/providers/class-provider-native.php`
Expected: no errors.

- [ ] **Step 4: Smoke-test on the live WP 7.0 env (no key required for the unsupported branch)**

Run: `wp-env run cli wp eval 'require "wp-content/plugins/filter-ai/includes/providers/interface-provider.php"; require "wp-content/plugins/filter-ai/includes/providers/class-provider-native.php"; $p=new Filter_AI_Provider_Native(); var_dump($p->is_text_supported(array("text_generation")));'`
Expected: `bool(false)` on a fresh env with no Connector key (proves the class loads and the builder resolves). After a key is added it returns `bool(true)`.

- [ ] **Step 5: Commit**

```bash
git add includes/providers/class-provider-native.php
git commit -m "feat: add native WP 7.0 AI Client backend (auto model selection)"
```

---

## Task 10: Route batch jobs through the provider

Replaces inline `ai_services()` calls in the three batch files. Behaviour on WP 6.7 is unchanged (legacy backend produces identical calls).

**Files:**

- Modify: `includes/batchImageAltText.php:234-293`
- Modify: `includes/batchSEOTitle.php:99-145`
- Modify: `includes/batchSEOMetaDescription.php` (mirror of SEO title)
- Modify: `filter-ai.php` (load the provider files — done in Task 16; for now require at top of each batch file)

- [ ] **Step 1: Refactor `batchImageAltText.php`**

Replace lines 234-293 (the `$required_capabilities` block through the `$text = Helpers::...` assignment) with:

```php
		$provider = filter_ai_provider();
		if ( null === $provider ) {
			throw new Exception( esc_html__( 'AI service not available', 'filter-ai' ) );
		}

		wp_set_current_user( $user_id );

		$prompt = filter_ai_get_prompt( 'image_alt_text_prompt' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$image_data = file_get_contents( $image_path );

		$text = $provider->generate_text(
			$prompt,
			array(
				array(
					'mime_type' => $image_mime_type,
					// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
					'data'      => base64_encode( $image_data ),
				),
			),
			'filter-ai-image-alt-text',
			array( 'multimodal_input', 'text_generation' ),
			$service_slug
		);

		if ( is_wp_error( $text ) || empty( $text ) ) {
			throw new Exception( esc_html__( 'Issue generating alt text', 'filter-ai' ) );
		}
```

Add at the top of the file (after the existing `require_once` lines): `require_once __DIR__ . '/providers/detection.php';`

- [ ] **Step 2: Refactor `batchSEOTitle.php`**

Replace lines 99-149 (the `$required_capabilities` block through the SEO-title `empty( $text )` check) with:

```php
		$provider = filter_ai_provider();
		if ( null === $provider ) {
			throw new Exception( esc_html__( 'AI service not available', 'filter-ai' ) );
		}

		wp_set_current_user( $user_id );

		$prompt = filter_ai_get_prompt( 'yoast_seo_title_prompt' );

		$text = $provider->generate_text(
			$prompt . ' ' . $post_content,
			array(),
			'filter-ai-seo-title',
			array( 'text_generation' ),
			$service_slug
		);

		if ( is_wp_error( $text ) || empty( $text ) ) {
			throw new Exception( esc_html__( 'Issue generating SEO title', 'filter-ai' ) );
		}
```

Add at top of file (after existing requires): `require_once __DIR__ . '/providers/detection.php';`. Leave the `wpseo_titles` formatting block (lines 151-162) intact below this.

- [ ] **Step 3: Refactor `batchSEOMetaDescription.php`**

Apply the same shape as Step 2: replace its capability/service/model block with:

```php
		$provider = filter_ai_provider();
		if ( null === $provider ) {
			throw new Exception( esc_html__( 'AI service not available', 'filter-ai' ) );
		}

		wp_set_current_user( $user_id );

		$prompt = filter_ai_get_prompt( 'yoast_seo_meta_description_prompt' );

		$text = $provider->generate_text(
			$prompt . ' ' . $post_content,
			array(),
			'filter-ai-seo-meta-description',
			array( 'text_generation' ),
			$service_slug
		);

		if ( is_wp_error( $text ) || empty( $text ) ) {
			throw new Exception( esc_html__( 'Issue generating meta description', 'filter-ai' ) );
		}
```

Add at top of file (after existing requires): `require_once __DIR__ . '/providers/detection.php';`. Remove the now-unused `use Felix_Arntz\…` imports from all three files **only if** no other code in the file references them (the `update_option( 'filter_ai_last_*_service', … )` lines used `$service->get_service_slug()` — delete those lines too, since the provider abstraction no longer exposes the resolved slug; they only fed the deleted last-service display).

- [ ] **Step 4: Verify legacy path still works end-to-end on WP 6.7**

This needs an `ai-services` API key. Set one in the browser at http://localhost:8889/wp-admin (Filter AI → API Keys), then:
Run: `wp-env run tests-cli wp eval 'do_action("filter_ai_batch_seo_title", array("post_id"=>1,"user_id"=>1));' ` (or trigger Batch Generation in the UI on a draft post).
Expected: no fatal; `_yoast_wpseo_title` populated on the target post. If no key is set, expect the "AI service not available" exception (also acceptable proof the path is wired).

- [ ] **Step 5: PHP lint + commit**

Run: `composer check-cs`
Expected: no errors.

```bash
git add includes/batchImageAltText.php includes/batchSEOTitle.php includes/batchSEOMetaDescription.php
git commit -m "refactor: route batch jobs through Filter_AI_Provider"
```

---

## Task 11: REST controller — registration + permission

**Files:**

- Create: `includes/rest/class-rest-controller.php`

- [ ] **Step 1: Implement route registration + permission + /providers + /is-supported**

`includes/rest/class-rest-controller.php`:

```php
<?php
/**
 * First-party REST layer for the block-editor JS on WP 7.0+ (`filter-ai/v1`).
 * Each route delegates to the active Filter_AI_Provider.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Filter_AI_REST_Controller {

	const NAMESPACE = 'filter-ai/v1';

	public static function register() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function permission() {
		return current_user_can( 'manage_options' );
	}

	public static function register_routes() {
		register_rest_route(
			self::NAMESPACE,
			'/providers',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'providers' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/is-supported',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'is_supported' ),
				'args'                => array(
					'capability' => array( 'type' => 'string', 'default' => 'text' ),
				),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/generate-text',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'generate_text' ),
			)
		);
		register_rest_route(
			self::NAMESPACE,
			'/generate-image',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'permission' ),
				'callback'            => array( __CLASS__, 'generate_image' ),
			)
		);
	}

	public static function providers( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		return rest_ensure_response( $provider ? $provider->list_providers() : array() );
	}

	public static function is_supported( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return rest_ensure_response( array( 'supported' => false ) );
		}
		$supported = 'image' === $request['capability']
			? $provider->is_image_supported()
			: $provider->is_text_supported( array( 'text_generation' ) );
		return rest_ensure_response( array( 'supported' => (bool) $supported ) );
	}

	public static function generate_text( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI backend available.', 'filter-ai' ), array( 'status' => 503 ) );
		}
		$result = $provider->generate_text(
			(string) $request['prompt'],
			self::normalise_files( $request['parts'] ),
			(string) $request['feature'],
			is_array( $request['capabilities'] ) ? $request['capabilities'] : array( 'text_generation' ),
			$request['provider'] ? (string) $request['provider'] : null
		);
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		return rest_ensure_response( array( 'text' => $result ) );
	}

	public static function generate_image( WP_REST_Request $request ) {
		$provider = filter_ai_provider();
		if ( ! $provider ) {
			return new WP_Error( 'filter_ai_unavailable', __( 'No AI backend available.', 'filter-ai' ), array( 'status' => 503 ) );
		}
		$result = $provider->generate_image(
			(string) $request['prompt'],
			array(
				'candidate_count' => (int) ( $request['candidateCount'] ?? 1 ),
				'aspect_ratio'    => $request['aspectRatio'] ? (string) $request['aspectRatio'] : null,
			),
			(string) $request['feature'],
			$request['provider'] ? (string) $request['provider'] : null
		);
		if ( is_wp_error( $result ) ) {
			$result->add_data( array( 'status' => 502 ) );
			return $result;
		}
		return rest_ensure_response( array( 'images' => $result ) );
	}

	private static function normalise_files( $parts ) {
		$files = array();
		foreach ( (array) $parts as $part ) {
			if ( isset( $part['inlineData']['data'] ) ) {
				$files[] = array(
					'mime_type' => isset( $part['inlineData']['mimeType'] ) ? $part['inlineData']['mimeType'] : '',
					'data'      => $part['inlineData']['data'],
				);
			}
		}
		return $files;
	}
}
```

- [ ] **Step 2: Verify routes register + permission denies anonymous (on WP 7.0 env)**

After Task 16 wires `Filter_AI_REST_Controller::register()` into bootstrap, run:
Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8888/wp-json/filter-ai/v1/is-supported`
Expected: `401` (no auth). Authenticated admin returns `200` with `{"supported":false}` until a Connector key is set.

- [ ] **Step 3: PHP lint + commit**

Run: `composer check-cs -- includes/rest/class-rest-controller.php`

```bash
git add includes/rest/class-rest-controller.php
git commit -m "feat: add filter-ai/v1 REST controller"
```

---

## Task 12: Native provider preference (completes decision #2)

Layers per-feature provider preference onto the native backend, using the connector→model resolution confirmed in Task 1.

**Files:**

- Modify: `includes/providers/class-provider-native.php`

- [ ] **Step 1: Add provider→model resolution to the builder**

In `class-provider-native.php`, replace the `builder()` method and add a resolver. Use the model-listing call confirmed in Task 1 (shown here as `get_models()`; adjust to the real method):

```php
	private function builder( $prompt, array $files = array(), $provider_slug = null, array $capabilities = array() ) {
		$builder = wp_ai_client_prompt( $prompt );
		foreach ( $files as $file ) {
			$data = 0 === strpos( $file['data'], 'data:' )
				? $file['data']
				: 'data:' . $file['mime_type'] . ';base64,' . $file['data'];
			$builder = $builder->with_file( $data );
		}
		$model = $this->preferred_model( $provider_slug, $capabilities );
		if ( $model ) {
			$builder = $builder->using_model_preference( $model );
		}
		return $builder;
	}

	private function preferred_model( $provider_slug, array $capabilities ) {
		if ( empty( $provider_slug ) || ! class_exists( 'WordPress\\AiClient\\AiClient' ) ) {
			return null;
		}
		$available = array_keys( $this->list_providers() );
		require_once __DIR__ . '/slug-map.php';
		$slug = filter_ai_map_service_slug( $provider_slug, $available );
		if ( null === $slug ) {
			return null;
		}
		$registry = WordPress\AiClient\AiClient::defaultRegistry();
		if ( ! $registry->isProviderConfigured( $slug ) ) {
			return null; // not configured → fall back to automatic selection
		}
		// Task 1 confirmed this is the model-lookup API. Confirm the $requirements
		// argument shape during implementation (the method exists; its arg object
		// was not dumped). Returns model metadata; take the first id.
		$models = $registry->findProviderModelsMetadataForSupport( $slug, $capabilities );
		$first  = is_array( $models ) ? reset( $models ) : $models;
		return ( is_object( $first ) && method_exists( $first, 'getId' ) ) ? $first->getId() : null;
	}
```

Then pass `$provider_slug` through from `generate_text()`/`generate_image()` (`$this->builder( $prompt, $files, $provider_slug, $capabilities )`).

- [ ] **Step 2: Verify against Task 1**

Confirm `using_model_preference()` accepts a single model-id string (per Task 1). If it takes a fallback list, pass `array( $model )` or splat — adjust inline.

- [ ] **Step 3: Smoke-test with a Connector key set on :8888**

Run: `wp-env run cli wp eval 'echo wp_ai_client_prompt("Say hi in 3 words")->generate_text();'`
Expected: a short string (proves a configured provider responds). Then re-run the Task 9 Step 4 check → `bool(true)`.

- [ ] **Step 4: PHP lint + commit**

```bash
git add includes/providers/class-provider-native.php
git commit -m "feat: honour per-feature provider preference on native backend"
```

---

## Task 13: JS — mode helper + native client

**Files:**

- Create: `src/utils/ai/services/mode.ts`
- Create: `src/utils/ai/services/nativeClient.ts`

- [ ] **Step 1: Mode helper**

`src/utils/ai/services/mode.ts`:

```ts
type FilterAiMode = { mode: 'native' | 'legacy'; restUrl: string; nonce: string };

declare global {
  interface Window {
    filter_ai_ai?: FilterAiMode;
  }
}

export const getMode = (): 'native' | 'legacy' => window.filter_ai_ai?.mode ?? 'legacy';
```

- [ ] **Step 2: Native REST client**

`src/utils/ai/services/nativeClient.ts`:

```ts
import apiFetch from '@wordpress/api-fetch';

type GenerateTextArgs = {
  prompt: string;
  feature: string;
  capabilities: string[];
  parts: unknown[];
  service?: string;
};

export const nativeGenerateText = async (args: GenerateTextArgs): Promise<string> => {
  const res = await apiFetch<{ text: string }>({
    path: '/filter-ai/v1/generate-text',
    method: 'POST',
    data: {
      prompt: args.prompt,
      feature: args.feature,
      capabilities: args.capabilities,
      parts: args.parts,
      provider: args.service ?? '',
    },
  });
  return res.text;
};

export const nativeGenerateImage = async (args: {
  prompt: string;
  feature: string;
  candidateCount?: number;
  aspectRatio?: string;
  service?: string;
}): Promise<string[]> => {
  const res = await apiFetch<{ images: string[] }>({
    path: '/filter-ai/v1/generate-image',
    method: 'POST',
    data: {
      prompt: args.prompt,
      feature: args.feature,
      candidateCount: args.candidateCount ?? 1,
      aspectRatio: args.aspectRatio ?? '',
      provider: args.service ?? '',
    },
  });
  return res.images;
};

export const nativeListProviders = async (): Promise<Record<string, { label: string; capabilities: string[] }>> =>
  apiFetch({ path: '/filter-ai/v1/providers' });

export const nativeIsSupported = async (capability: 'text' | 'image'): Promise<boolean> => {
  const res = await apiFetch<{ supported: boolean }>({
    path: `/filter-ai/v1/is-supported?capability=${capability}`,
  });
  return res.supported;
};
```

- [ ] **Step 3: Type-check + commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/utils/ai/services/mode.ts src/utils/ai/services/nativeClient.ts
git commit -m "feat: add JS mode helper + native REST client"
```

---

## Task 14: JS — branch generateText (TDD)

**Files:**

- Create: `src/utils/ai/services/generateText.test.ts`
- Modify: `src/utils/ai/services/generateText.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/ai/services/generateText.test.ts`:

```ts
import { generateText } from './generateText';
import * as nativeClient from './nativeClient';

jest.mock('./nativeClient');

describe('generateText (native mode)', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'native', restUrl: '/wp-json/', nonce: 'x' };
    (nativeClient.nativeGenerateText as jest.Mock).mockResolvedValue('hello world');
  });

  it('routes to the native REST client and returns its text', async () => {
    const result = await generateText({
      prompt: 'p',
      feature: 'filter-ai-seo-title',
      capabilities: ['text_generation'],
    });
    expect(nativeClient.nativeGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'p', feature: 'filter-ai-seo-title' })
    );
    expect(result).toBe('hello world');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:js -- generateText`
Expected: FAIL — native path not yet branched (current code calls `waitForAIPlugin`).

- [ ] **Step 3: Add the native branch at the top of `generateText`**

In `src/utils/ai/services/generateText.ts`, add imports and branch before the existing `waitForAIPlugin()` logic:

```ts
import { getMode } from './mode';
import { nativeGenerateText } from './nativeClient';
```

Insert at the very start of the `generateText` function body (before `const aiPlugin = await waitForAIPlugin();`):

```ts
if (getMode() === 'native') {
  if (!prompt || !feature) {
    return null;
  }
  const caps = capabilities.length ? capabilities : ['text_generation'];
  return nativeGenerateText({ prompt, feature, capabilities: caps, parts, service });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:js -- generateText`
Expected: PASS.

- [ ] **Step 5: Type-check + commit**

Run: `npm run typecheck`

```bash
git add src/utils/ai/services/generateText.ts src/utils/ai/services/generateText.test.ts
git commit -m "feat: branch generateText to native REST in native mode"
```

---

## Task 15: JS — branch generateImage (TDD)

**Files:**

- Create: `src/utils/ai/services/generateImage.test.ts`
- Modify: `src/utils/ai/services/generateImage.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/ai/services/generateImage.test.ts`:

```ts
import { generateImage } from './generateImage';
import * as nativeClient from './nativeClient';

jest.mock('./nativeClient');

describe('generateImage (native mode)', () => {
  beforeEach(() => {
    window.filter_ai_ai = { mode: 'native', restUrl: '/wp-json/', nonce: 'x' };
    (nativeClient.nativeGenerateImage as jest.Mock).mockResolvedValue(['data:image/png;base64,AAA']);
  });

  it('routes to the native REST client and returns image URLs', async () => {
    const result = await generateImage({ prompt: 'cat', feature: 'generate-ai-img-feature' });
    expect(nativeClient.nativeGenerateImage).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'cat', feature: 'generate-ai-img-feature' })
    );
    expect(result).toEqual(['data:image/png;base64,AAA']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:js -- generateImage`
Expected: FAIL.

- [ ] **Step 3: Add the native branch at the top of `generateImage`**

In `src/utils/ai/services/generateImage.ts`, add imports:

```ts
import { getMode } from './mode';
import { nativeGenerateImage } from './nativeClient';
```

Insert at the start of the `generateImage` function body (before `const aiPlugin = await waitForAIPlugin();`):

```ts
if (getMode() === 'native') {
  if (!prompt || !feature) {
    return [];
  }
  return nativeGenerateImage({ prompt, feature, candidateCount, aspectRatio, service });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:js -- generateImage`
Expected: PASS.

- [ ] **Step 5: Type-check + commit**

Run: `npm run typecheck`

```bash
git add src/utils/ai/services/generateImage.ts src/utils/ai/services/generateImage.test.ts
git commit -m "feat: branch generateImage to native REST in native mode"
```

---

## Task 16: Bootstrap wiring (`filter-ai.php`)

Enables the plugin on WP 7.0 without ai-services, loads the new includes, registers REST, conditionally enqueues, and injects the JS mode flag.

**Files:**

- Modify: `filter-ai.php`

- [ ] **Step 1: Remove the hard dependency header**

Delete line 14: ` * Requires Plugins: ai-services`.

- [ ] **Step 2: Load providers + REST and register REST**

After the existing `require_once … 'includes/settings.php';` block (around line 42-47), add:

```php
require_once plugin_dir_path( __FILE__ ) . 'includes/providers/detection.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/rest/class-rest-controller.php';
Filter_AI_REST_Controller::register();
```

- [ ] **Step 3: Replace the enqueue gate (line 178) with backend-aware logic**

Replace:

```php
	if ( ! function_exists( 'ai_services' ) ) {
		return;
	}
```

with:

```php
	$backend = filter_ai_detect_backend(
		function_exists( 'wp_ai_client_prompt' ),
		function_exists( 'ai_services' )
	);
	if ( 'none' === $backend ) {
		return;
	}
```

- [ ] **Step 4: Make the ais-\* script deps conditional (line 183)**

Replace:

```php
	array_push( $asset_metadata['dependencies'], 'ais-ai', 'ais-settings', 'ais-components', 'underscore', 'wp-block-editor', 'wp-core-data', 'wp-i18n' );
```

with:

```php
	array_push( $asset_metadata['dependencies'], 'underscore', 'wp-block-editor', 'wp-core-data', 'wp-i18n', 'wp-api-fetch' );
	if ( 'legacy' === $backend ) {
		array_push( $asset_metadata['dependencies'], 'ais-ai', 'ais-settings', 'ais-components' );
	}
```

- [ ] **Step 5: Inject the mode flag (add near the other `wp_add_inline_script` calls, ~line 200)**

```php
	wp_add_inline_script(
		'filter-ai-script',
		'window.filter_ai_ai = ' . wp_json_encode(
			array(
				'mode'    => 'native' === $backend ? 'native' : 'legacy',
				'restUrl' => esc_url_raw( rest_url( 'filter-ai/v1' ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
			)
		) . ';',
		'before'
	);
```

- [ ] **Step 6: Guard the ai-services timeout filter (line 240)**

Wrap the `add_filter( 'ai_services_request_timeout', … )` registration in `if ( function_exists( 'ai_services' ) ) { … }`.

- [ ] **Step 7: Activate Filter AI on the WP 7.0 env and confirm it loads**

```bash
wp-env run cli wp plugin activate filter-ai
wp-env run cli wp eval 'echo wp_remote_retrieve_response_code( wp_remote_get( rest_url( "filter-ai/v1/is-supported" ) ) );'
```

Expected: `filter-ai` activates **without** the previous Requires-Plugins block; the REST probe returns `401` (anonymous) — proving routes are registered and protected.

- [ ] **Step 8: PHP lint + commit**

Run: `composer check-cs -- filter-ai.php`

```bash
git add filter-ai.php
git commit -m "feat: detect backend at runtime, drop ai-services hard dependency, wire REST"
```

---

## Task 17: JS provider hooks + availability gating (native)

**Files:**

- Modify: `src/utils/ai/services/useServices.ts`
- Modify: `src/utils/ai/services/useService.ts`
- Modify: `src/components/aiServiceNotice/index.tsx`
- Modify: `src/mediaLibrary/tabs/generateImageTab/generateImgTabView.tsx`

- [ ] **Step 1: `useServices` — native provider list**

Replace the body of `src/utils/ai/services/useServices.ts` with a mode branch:

```ts
import { useAIPlugin } from '@/utils/useAIPlugin';
import { AIService } from './types';
import { useSelect } from '@wordpress/data';
import { useState, useEffect } from '@wordpress/element';
import { getMode } from './mode';
import { nativeListProviders } from './nativeClient';

type UseServices = () => Record<string, AIService>;

export const useServices: UseServices = () => {
  const aiPlugin = useAIPlugin();
  const [nativeServices, setNativeServices] = useState<Record<string, AIService>>({});

  useEffect(() => {
    if (getMode() === 'native') {
      nativeListProviders().then((providers) => {
        const mapped: Record<string, AIService> = {};
        Object.entries(providers).forEach(([slug, p]) => {
          mapped[slug] = { slug, name: p.label, is_available: true } as AIService;
        });
        setNativeServices(mapped);
      });
    }
  }, []);

  const legacyServices = useSelect(
    (select) => {
      if (getMode() === 'native') return {};
      // @ts-expect-error Type 'never' has no call signatures.
      const { getServices } = select(aiPlugin?.ai.store) || {};
      return (getServices?.() || {}) as Record<string, AIService>;
    },
    [aiPlugin]
  );

  return getMode() === 'native' ? nativeServices : legacyServices;
};
```

- [ ] **Step 2: `useService` — resolve from `useServices`**

Replace `src/utils/ai/services/useService.ts` body so it derives from `useServices()` (works in both modes):

```ts
import { useSettings } from '@/settings';
import { AIService } from './types';
import { useServices } from './useServices';

type UseService = (key: string) => AIService | undefined;

export const useService: UseService = (key) => {
  const { settings } = useSettings();
  const services = useServices();
  const serviceSlug = settings?.[key];
  return Object.values(services).find((s) => s.slug === serviceSlug && s.is_available);
};
```

- [ ] **Step 3: `aiServiceNotice` — native gating + Connectors link**

Replace `src/components/aiServiceNotice/index.tsx` body:

```tsx
import { Notice } from '@wordpress/components';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useAIPlugin } from '@/utils';
import { getMode } from '@/utils/ai/services/mode';
import { nativeIsSupported } from '@/utils/ai/services/nativeClient';

export default function AIServiceNotice() {
  const aiPlugin = useAIPlugin();
  const [nativeSupported, setNativeSupported] = useState<boolean | null>(null);

  useEffect(() => {
    if (getMode() === 'native') {
      nativeIsSupported('text').then(setNativeSupported);
    }
  }, []);

  // @ts-expect-error Type 'never' has no call signatures.
  const legacyService = useSelect((select) => select(aiPlugin?.ai?.store)?.getAvailableService(), [aiPlugin]);

  if (getMode() === 'native') {
    if (nativeSupported === false) {
      return (
        <Notice status="error" isDismissible={false}>
          {createInterpolateElement(
            __('No AI provider is configured. Add an API key under <a>Settings → Connectors</a>.', 'filter-ai'),
            { a: <a href="/wp-admin/options-general.php?page=connectors" /> }
          )}
        </Notice>
      );
    }
    return null;
  }

  if (legacyService === null) {
    return (
      <Notice status="error" isDismissible={false}>
        {createInterpolateElement(
          sprintf(
            __(`No AI service is configured. Please add an API key in the %s plugin settings.`, 'filter-ai'),
            `<a>Filter AI</a>`
          ),
          { a: <a href="/wp-admin/admin.php?page=filter_ai#api_keys" /> }
        )}
      </Notice>
    );
  }
  return null;
}
```

(Confirm the Connectors admin URL — `options-general.php?page=connectors` — against Task 1's `wp_get_options_connectors_*` output; adjust the slug if different.)

- [ ] **Step 4: `generateImgTabView` — native image-support gating**

In `src/mediaLibrary/tabs/generateImageTab/generateImgTabView.tsx:36`, replace the single `getAvailableService()` `useSelect` with a mode-aware check: in native mode use `nativeIsSupported('image')` (via `useState`/`useEffect` as in Step 3); in legacy mode keep the existing `getAvailableService()` call. Gate the tab UI on the resulting boolean.

- [ ] **Step 5: Type-check + commit**

Run: `npm run typecheck`

```bash
git add src/utils/ai/services/useServices.ts src/utils/ai/services/useService.ts src/components/aiServiceNotice/index.tsx src/mediaLibrary/tabs/generateImageTab/generateImgTabView.tsx
git commit -m "feat: native provider enumeration + availability gating"
```

---

## Task 18: API Keys settings page — Connectors panel on 7.0+

**Files:**

- Modify: `src/settings/page/apiKeys.tsx`

- [ ] **Step 1: Branch the page on mode**

Wrap the existing `APIKeys` component so that in native mode it renders a Connectors info panel instead of the `ai-services` `ApiKeyControl`. Add at the top of the default export:

```tsx
import { getMode } from '@/utils/ai/services/mode';
import { Panel, PanelBody, PanelHeader, ExternalLink } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
```

And early-return inside `APIKeys` before the existing legacy markup:

```tsx
if (getMode() === 'native') {
  return (
    <Panel className="filter-ai-settings-panel">
      <PanelHeader>
        <h2>{__('API Keys', 'filter-ai')}</h2>
      </PanelHeader>
      <PanelBody>
        <p>{__('On WordPress 7.0+, AI provider keys are managed by WordPress itself.', 'filter-ai')}</p>
        <ExternalLink href="/wp-admin/options-general.php?page=connectors">
          {__('Open Settings → Connectors', 'filter-ai')}
        </ExternalLink>
      </PanelBody>
    </Panel>
  );
}
```

- [ ] **Step 2: Type-check + build + commit**

Run: `npm run typecheck && npm run build`
Expected: clean build.

```bash
git add src/settings/page/apiKeys.tsx
git commit -m "feat: show Connectors panel on the API Keys page in native mode"
```

---

## Task 19: Full verification matrix + local handoff

**Files:** none (verification).

- [ ] **Step 1: Rebuild and sync both envs**

Run: `npm run build && wp-env start`
Expected: build succeeds; both envs running.

- [ ] **Step 2: Legacy path (WP 6.7, :8889)**

In the browser at http://localhost:8889/wp-admin (admin/password): set an `ai-services` API key, open a draft post, and exercise: generate title, excerpt, tags, alt text, rewrite/expand/condense tone, FAQs, image generation, and a Batch Generation run. Confirm each produces output.

- [ ] **Step 3: Native path (WP 7.0, :8888)**

In the browser at http://localhost:8888/wp-admin: confirm Filter AI is active; go to _Settings → Connectors_ and add a provider key; then repeat the same feature exercises as Step 2. Confirm the API Keys page shows the Connectors panel (not key fields), and the "no provider" notice links to Connectors when no key is set.

- [ ] **Step 4: Detection edge case**

Run: `wp-env run cli wp eval 'echo filter_ai_detect_backend(function_exists("wp_ai_client_prompt"), function_exists("ai_services"));'`
Expected: `native` on :8888. On :8889: `wp-env run tests-cli wp eval '…'` → `legacy`.

- [ ] **Step 5: Run all automated checks**

Run: `composer test-php && npm run test:js && npm run typecheck && composer check-cs`
Expected: all pass.

- [ ] **Step 6: "Test it yourself" handoff (project standard)**

Leave both envs running and hand the user the URLs + admin/password for hands-on sign-off:

- Native: http://localhost:8888/wp-admin (WP 7.0 + Connectors)
- Legacy: http://localhost:8889/wp-admin (WP 6.7 + ai-services)

---

## Task 20: Update readme.txt + changelog

**Files:**

- Modify: `readme.txt`

- [ ] **Step 1: Document native support**

Add to the Description (provider section) that on WordPress 7.0+ Filter AI uses the built-in AI Client and _Settings → Connectors_ for keys, and on older versions it uses the `ai-services` plugin. Add a changelog entry under a new `1.7.0` heading and bump `Stable tag`. Note in the FAQ that `ai-services` is no longer required on WP 7.0+.

- [ ] **Step 2: Commit**

```bash
git add readme.txt
git commit -m "docs: document WP 7.0 native AI Client support"
```

---

## Self-review notes (author)

- **Spec coverage:** §6.1 detection → Tasks 4, 6, 16; §6.2 PHP backends → Tasks 8, 9, 12; §6.3 JS abstraction → Tasks 13–15, 17; §6.4 REST (4 routes) → Task 11; §6.5 slug mapping → Tasks 7, 12; §6.6 bootstrap → Task 16; §6.7 credential UX → Tasks 17, 18; §8 verification → Task 19; readme → Task 20. All covered.
- **Sequencing risk:** Task 6's factory references classes created in Tasks 8–9; it is only _invoked_ at runtime (Task 10+), so the include is safe earlier. The native API names in Tasks 9/12/13 are pinned by Task 1 before they're written.
- **Known soft spots (intentional, gated on the harness):** exact `using_model_preference()` arity, connector→model listing method, and the Connectors admin page slug — each has an explicit "reconcile against Task 1 / confirm URL" step rather than an assumption.
