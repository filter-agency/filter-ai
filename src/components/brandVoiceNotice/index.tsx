import { Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';
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
export default function BrandVoiceNotice() {
  const bv = window.filter_ai_brand_voice;
  const initial = bv?.status;
  const [locallyDismissed, setLocallyDismissed] = useState(false);

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
