import { useSettings } from '@/settings';
import { BlockEditProps } from '@/types';
import { t, showNotice, ai, hideLoadingMessage, showLoadingMessage } from '@/utils';
import { useMemo, useCallback } from '@wordpress/element';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

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
    }

    return url;
  }, []);

  const generateAltText = async () => {
    showLoadingMessage(t('Generating alt text'));

    try {
      const url = await getAttachmentUrl();
      const oldAltText = getAttribute(altTextKeys);

      const altText = await ai.getAltTextFromUrl(url, oldAltText, settings?.image_alt_text_prompt);

      if (!altText) {
        throw new Error(t('Sorry, there has been an issue while generating your alt text.'));
      }

      setAttribute(altText, altTextKeys);

      showNotice({ message: t('Alt text has been updated.') });
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
    title: t('Generate Alt Text'),
    onClick: generateAltText,
    isDisabled,
  };
};
