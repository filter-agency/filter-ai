import { useSettings } from '@/settings';
import { BlockEditProps } from '@/types';
import { t, showNotice, ai, hideLoadingMessage, showLoadingMessage } from '@/utils';
import { useMemo, useCallback } from '@wordpress/element';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

const altKeys = ['alt', 'mediaAlt'];
const urlKeys = ['url', 'mediaUrl'];

export const useGenerateAltText = ({ attributes, setAttributes }: Props) => {
  const { settings } = useSettings();

  const isEnabled = useMemo(() => {
    return settings?.image_alt_text_enabled && altKeys.some((key) => attributes.hasOwnProperty(key));
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

  const generateAltText = async () => {
    showLoadingMessage(t('Generating alt text'));

    try {
      const url = getAttribute(urlKeys);

      const altText = await ai.getAltTextFromUrl(url, settings?.image_alt_text_prompt);

      if (!altText) {
        throw new Error(t('Sorry, there has been an issue while generating your alt text.'));
      }

      setAttribute(altText, altKeys);

      showNotice(t('Alt text has been updated.'));
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice(error?.message || error);
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
