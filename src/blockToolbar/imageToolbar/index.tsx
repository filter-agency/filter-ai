import { ToolbarButton } from '@/components/toolbarButton';
import { useGenerateAltText } from './useGenerateAltText';
import { BlockEditProps } from '@/types';
import _ from 'underscore';
import { useSelect } from '@wordpress/data';
import { useSettings } from '@/settings';
import { createInterpolateElement, createRoot, useCallback, useEffect, useMemo } from '@wordpress/element';
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

  const altText = useSelect(
    (select) => {
      if (!dynamicAddAltTextEnabled) {
        return null;
      }
      // @ts-expect-error Type 'never' has no call signatures.
      return select('core').getMedia(attributes.mediaId || attributes.id)?.alt_text;
    },
    [dynamicAddAltTextEnabled]
  );

  const Message = useCallback(
    () => (
      <>
        <ExternalLink href={__('https://www.w3.org/WAI/tutorials/images/decision-tree/')}>
          {__('Describe the purpose of the image.')}
        </ExternalLink>
        <br />
        {createInterpolateElement(
          sprintf(
            __(
              'Missing alt text will be automatically replaced with the current global alt text from the Media Library%s',
              'filter-ai'
            ),
            altText ? `: "<i>${altText}</i>"` : '.'
          ),
          { i: <i /> }
        )}
      </>
    ),
    [altText]
  );

  const addAltTextContainer = useCallback(() => {
    const link = document.querySelector('[href*="https://www.w3.org/WAI/tutorials/images/decision-tree/"]');

    if (!link?.parentElement || document.querySelector('.filter-ai-alt-text-container')) {
      return;
    }

    link.parentElement.classList.add('filter-ai-alt-text-container');

    const container = createRoot(link.parentElement);

    container.render(<Message />);
  }, [Message]);

  useEffect(() => {
    if (!dynamicAddAltTextEnabled) {
      return;
    }

    const tabpanel = document.querySelector('[id^="tabs-"][id$="-edit-post/block-view"]');

    const observer = new MutationObserver(addAltTextContainer);

    if (tabpanel) {
      observer.observe(tabpanel, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
    };
  }, [dynamicAddAltTextEnabled, addAltTextContainer]);

  return <ToolbarButton controls={_.compact([generateAltText])} />;
};
