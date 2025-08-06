import { Notice } from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';

export default function AIServiceNotice() {
  // @ts-expect-error Type 'never' has no call signatures.
  const AIService = useSelect((select) => select(window.aiServices.ai.store)?.getAvailableService(), []);

  if (AIService === null) {
    return (
      <Notice status="error" isDismissible={false}>
        {createInterpolateElement(
          sprintf(
            __(`No AI service is configured. Please add an API key in the %s plugin settings.`, 'filter-ai'),
            `<a>AI Services</a>`
          ),
          {
            a: <a href="/wp-admin/options-general.php?page=ais_services" />,
          }
        )}
      </Notice>
    );
  }

  return null;
}
