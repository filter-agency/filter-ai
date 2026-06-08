import { Notice } from '@wordpress/components';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useAIPlugin } from '@/utils';
import { getMode } from '@/utils/ai/services/mode';
import { nativeIsSupported } from '@/utils/ai/services/nativeClient';

export default function AIServiceNotice() {
  const aiPlugin = useAIPlugin();

  // Authoritative "is text generation available?" check. The
  // /filter-ai/v1/is-supported route resolves server-side via the active
  // provider, so it works for BOTH the native (WP 7.0) and legacy
  // (ai-services) backends. We start from `null` (unknown) and render nothing
  // until it resolves — that's what prevents the red error from flashing on
  // load before we actually know whether a key is configured. The previous
  // approaches inferred availability from the ai-services JS store, which
  // populates asynchronously and so reported "no key" for the first frames.
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    nativeIsSupported('text')
      .then(setSupported)
      .catch(() => setSupported(false));
  }, []);

  // Legacy only: when a key is typed on the API Keys tab the ai-services store
  // updates synchronously, so we can hide the notice immediately without
  // waiting for another server round-trip. (The initial render is still gated
  // on `supported` above, so this never causes a flash on load.)
  const hasAnyLegacyKey = useSelect(
    (select) => {
      if (getMode() === 'native' || !aiPlugin?.settings?.store) {
        return false;
      }
      // @ts-expect-error Type 'never' has no call signatures.
      const { getServices, getApiKey } = select(aiPlugin.settings.store) || {};
      const services = getServices?.() || {};
      return Object.keys(services).some((slug: string) => !!getApiKey?.(slug));
    },
    [aiPlugin]
  );

  // Unknown until the support check resolves — render nothing (no flash).
  if (supported === null) {
    return null;
  }

  // A configured/working provider, or a key just entered on the legacy backend.
  if (supported || (getMode() !== 'native' && hasAnyLegacyKey)) {
    return null;
  }

  if (getMode() === 'native') {
    return (
      <Notice status="error" isDismissible={false}>
        {createInterpolateElement(
          __('No AI provider is configured. Add an API key under <a>Settings → Connectors</a>.', 'filter-ai'),
          { a: <a href="options-connectors.php" /> }
        )}
      </Notice>
    );
  }

  return (
    <Notice status="error" isDismissible={false}>
      {createInterpolateElement(
        sprintf(
          __(`No AI service is configured. Please add an API key in the %s plugin settings.`, 'filter-ai'),
          `<a>Filter AI</a>`
        ),
        { a: <a href="admin.php?page=filter_ai#api_keys" /> }
      )}
    </Notice>
  );
}
