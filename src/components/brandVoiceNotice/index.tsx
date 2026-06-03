import { Notice } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { dispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

type BrandVoiceStatusValue = 'pending_key' | 'queued' | 'running' | 'complete' | 'failed' | 'skipped';

declare global {
  interface Window {
    filter_ai_brand_voice?: {
      regenerate_url?: string;
      retry_url?: string;
      status?: {
        status?: BrandVoiceStatusValue;
        notice_dismissed?: boolean;
        error_message?: string | null;
      } | null;
      dismiss_nonce?: string;
      ajax_url?: string;
      settings_url?: string;
    };
  }
}

/**
 * React mirror of the PHP brand voice admin notice. Rendered on the Filter AI
 * pages where the page callback hides div.wrap (and with it all admin notices),
 * so PHP-side notices are invisible. The PHP renderer suppresses itself on
 * those screens; this component takes over.
 *
 * pending_key + skipped: not rendered here. AIServiceNotice / the existing
 * settings UI already convey "no provider configured" on these screens; the
 * brand voice pending state would be redundant.
 */
type BrandVoiceStatus = NonNullable<NonNullable<Window['filter_ai_brand_voice']>['status']>;

const isLive = (s?: string) => s === 'queued' || s === 'running';

export default function BrandVoiceNotice() {
  const bv = window.filter_ai_brand_voice;
  const [state, setState] = useState<BrandVoiceStatus | null | undefined>(bv?.status);
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  // Poll the REST endpoint while a scan is in progress so the notice
  // transitions live from queued/running → complete/failed without a
  // manual page reload. When the scan completes we also invalidate the
  // core/site settings entity, which causes useSettings() to re-fetch
  // so the new brand voice prompt appears in the textarea.
  useEffect(() => {
    if (!isLive(state?.status)) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (cancelled) return;
      try {
        const fresh = await apiFetch<BrandVoiceStatus>({ path: '/filter-ai/v1/brand-voice/status' });
        if (cancelled) return;
        setState((prev) => {
          if (isLive(prev?.status) && fresh.status === 'complete') {
            // refresh the Filter AI settings entity so the textarea picks up
            // the freshly-written brand_voice_prompt without a page reload.
            // @ts-expect-error invalidateResolution exists on core/site dispatch
            dispatch('core').invalidateResolution('getEntityRecord', ['root', 'site']);
          }
          return fresh;
        });
        if (isLive(fresh.status)) {
          timeoutId = setTimeout(poll, 1500);
        }
      } catch {
        // Stop polling on error to avoid a request storm; user can still reload.
      }
    };
    timeoutId = setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // Intentionally mount-only: we only need to start polling based on the
    // initial bootstrap state. Status transitions are handled inside the poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initial = state;

  if (!initial?.status || locallyDismissed || initial.notice_dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setLocallyDismissed(true);
    if (bv?.ajax_url && bv?.dismiss_nonce && typeof window.fetch === 'function') {
      const fd = new FormData();
      fd.append('action', 'filter_ai_brand_voice_dismiss');
      fd.append('_wpnonce', bv.dismiss_nonce);
      fetch(bv.ajax_url, { method: 'POST', body: fd, credentials: 'same-origin' });
    }
  };

  if (initial.status === 'queued' || initial.status === 'running') {
    return (
      <Notice status="info" isDismissible onRemove={handleDismiss}>
        {__(
          'Filter AI is analysing your site to generate a brand voice. This usually takes under a minute.',
          'filter-ai'
        )}
      </Notice>
    );
  }

  if (initial.status === 'complete') {
    return (
      <Notice status="success" isDismissible onRemove={handleDismiss}>
        {__('Filter AI generated a brand voice from your site content.', 'filter-ai')}{' '}
        {bv?.settings_url && <a href={bv.settings_url}>{__('Review or edit', 'filter-ai')}</a>}
      </Notice>
    );
  }

  if (initial.status === 'failed') {
    const detail = initial.error_message ? ` (${initial.error_message})` : '';
    return (
      <Notice status="error" isDismissible onRemove={handleDismiss}>
        {__('Filter AI could not auto-generate a brand voice from your site content.', 'filter-ai')}
        {detail} {bv?.retry_url && <a href={bv.retry_url}>{__('Try again', 'filter-ai')}</a>}
      </Notice>
    );
  }

  return null;
}
