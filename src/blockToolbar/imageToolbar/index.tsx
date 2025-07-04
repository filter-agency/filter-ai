import { ToolbarButton } from '@/components/toolbarButton';
import { useGenerateAltText } from './useGenerateAltText';
import { BlockEditProps } from '@/types';
import _ from 'underscore';
import { useCallback, useEffect, useMemo } from 'react';
import { useSelect } from '@wordpress/data';
import { useSettings } from '@/settings';
import { createRoot } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { ExternalLink } from '@wordpress/components';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
  isSelected: BlockEditProps['isSelected'];
};

export const ImageToolbar = ({ attributes, setAttributes, isSelected }: Props) => {
  const generateAltText = useGenerateAltText({ attributes, setAttributes });

  const { settings } = useSettings();

  const dynamicAddAltTextEnabled = useMemo(() => {
    return (isSelected && settings?.dynamic_add_alt_text_enabled && (attributes?.mediaId || attributes?.id)) || false;
  }, [attributes, isSelected, settings]);

  const alt_text = useSelect(
    (select) => {
      if (!dynamicAddAltTextEnabled) {
        return null;
      }
      // @ts-expect-error Type 'never' has no call signatures.
      return select('core').getMedia(attributes.mediaId || attributes.id)?.alt_text;
    },
    [dynamicAddAltTextEnabled]
  );

  const addAltTextMessage = useCallback(() => {
    const link = document.querySelector('[href*="https://www.w3.org/WAI/tutorials/images/decision-tree/"]');

    if (!link?.parentElement || link.parentElement.classList.contains('filter-ai-alt-text-help')) {
      return;
    }

    link.parentElement.classList.add('filter-ai-alt-text-help');

    const container = createRoot(link.parentElement);

    const Message = () => (
      <>
        <ExternalLink href={__('https://www.w3.org/WAI/tutorials/images/decision-tree/')}>
          {__('Describe the purpose of the image.')}
        </ExternalLink>
        <br />
        {sprintf(
          __('Missing alt text will be automatically replaced with the current global alt text: "%s"', 'filter-ai'),
          alt_text
        )}
      </>
    );

    container.render(<Message />);
  }, [alt_text]);

  useEffect(() => {
    if (!dynamicAddAltTextEnabled) {
      return;
    }

    const tabpanel = document.querySelector('[id^="tabs-"][id$="-edit-post/block-view"]');

    const observer = new MutationObserver(addAltTextMessage);

    if (tabpanel) {
      observer.observe(tabpanel, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [dynamicAddAltTextEnabled]);

  return <ToolbarButton controls={_.compact([generateAltText])} />;
};
