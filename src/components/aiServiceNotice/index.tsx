import { Notice } from '@wordpress/components';
import { createInterpolateElement, useState, useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { useAIPlugin } from '@/utils';
import { waitForAIPlugin } from '@/utils/useAIPlugin';
import { getMode } from '@/utils/ai/services/mode';
import { nativeIsSupported } from '@/utils/ai/services/nativeClient';

export default function AIServiceNotice() {
  const aiPlugin = useAIPlugin();
  const [nativeSupported, setNativeSupported] = useState<boolean | null>(null);
  // Legacy (ai-services) readiness. The ai-services JS loads asynchronously, so
  // useAIPlugin() returns null for the first render(s); during that window the
  // key check below reports "no key" and the error notice flashes red even when
  // a key IS configured. Mirror the native path's "unknown until resolved"
  // approach: render nothing until the plugin is available (or we time out).
  const [legacyReady, setLegacyReady] = useState(false);

  useEffect(() => {
    if (getMode() === 'native') {
      nativeIsSupported('text')
        .then(setNativeSupported)
        .catch(() => setNativeSupported(false));
    } else {
      // Resolve when window.aiServices.ai is present; on timeout still mark
      // ready so a genuinely unconfigured site eventually sees the notice.
      waitForAIPlugin()
        .then(() => setLegacyReady(true))
        .catch(() => setLegacyReady(true));
    }
  }, []);

  // Use the ai-services settings store (live; setApiKey updates it
  // synchronously on every keystroke) rather than ai.store.getAvailableService(),
  // which is memoized and only refreshes on a full page reload — that delay
  // is why the notice used to linger after a key was saved.
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

  if (getMode() === 'native') {
    if (nativeSupported === false) {
      return (
        <Notice status="error" isDismissible={false}>
          {createInterpolateElement(
            __('No AI provider is configured. Add an API key under <a>Settings → Connectors</a>.', 'filter-ai'),
            { a: <a href="/wp-admin/options-connectors.php" /> }
          )}
        </Notice>
      );
    }
    return null;
  }

  // Legacy: don't render anything until the ai-services plugin has loaded, so
  // we never flash the error before we can actually check for a saved key.
  if (!legacyReady) {
    return null;
  }

  if (!hasAnyLegacyKey) {
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
