import { useSettings } from '@/settings';
import { BlockEditProps } from '@/types';
import { showNotice, ai, hideLoadingMessage, showLoadingMessage } from '@/utils';
import { useMemo, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

const maxPixelSize = 2000;
const altTextKeys = ['alt', 'mediaAlt'];
const urlKeys = ['url', 'mediaUrl'];

export const useGenerateAltText = ({ attributes, setAttributes }: Props) => {
  const { settings } = useSettings();

  const isEnabled = useMemo(() => {
    return settings?.image_alt_text_enabled && altTextKeys.some((key) => attributes.hasOwnProperty(key));
  }, [settings, attributes]);

  const isDisabled = useMemo(() => {
    return !urlKeys.some((key) => attributes.hasOwnProperty(key));
  }, [attributes]);

  const getAttribute = useCallback(
    (keys: string[]) => {
      const key = keys.find((key) => attributes.hasOwnProperty(key));
      return key ? attributes[key] : undefined;
    },
    [attributes]
  );

  const setAttribute = useCallback(
    (value: string, keys: string[]) => {
      const key = keys.find((key) => attributes.hasOwnProperty(key));
      if (key) {
        setAttributes({ [key]: value });
      }
    },
    [attributes, setAttributes]
  );

  const getAttachmentUrl = useCallback(async () => {
    let url = getAttribute(urlKeys);

    if (!window.wp?.media?.attachment) {
      return url;
    }

    const attachment = await window.wp.media.attachment(attributes.id).fetch();

    if (attachment?.sizes?.medium?.url) {
      url = attachment.sizes.medium.url;
    } else {
      if (attachment.width > maxPixelSize || attachment.height > maxPixelSize) {
        throw new Error(__('Please choose a smaller image.', 'filter-ai'));
      }
    }

    return url;
  }, []);

  const generateAltText = async () => {
    showLoadingMessage(__('Generating alt text', 'filter-ai'));

    try {
      const url = await getAttachmentUrl();
      const oldAltText = getAttribute(altTextKeys);

      const altText = await ai.getAltTextFromUrl(url, oldAltText, settings?.image_alt_text_prompt);

      if (!altText) {
        throw new Error(__('Sorry, there has been an issue while generating your alt text.', 'filter-ai'));
      }

      setAttribute(altText, altTextKeys);

      showNotice({ message: __('Alt text has been updated.', 'filter-ai') });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!isEnabled) {
    return;
  }

  return {
    title: __('Generate Alt Text', 'filter-ai'),
    onClick: generateAltText,
    isDisabled,
  };
};
