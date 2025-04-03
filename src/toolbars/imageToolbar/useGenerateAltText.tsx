import { useSettings } from '@/settings';
import { BlockEditProps } from '@/types';
import { t, showNotice, ai, hideLoadingMessage, showLoadingMessage } from '@/utils';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

export const useGenerateAltText = ({ attributes, setAttributes }: Props) => {
  const { settings } = useSettings();

  const generateAltText = async () => {
    showLoadingMessage(t('Generating alt text'));

    try {
      const altText = await ai.getAltTextFromUrl(attributes.url, settings?.image_alt_text_prompt);

      if (!altText) {
        throw new Error(t('Sorry, there has been an issue while generating your alt text.'));
      }

      setAttributes({ alt: altText });

      showNotice(t('Alt text has been updated.'));
    } catch (error) {
      console.error(error);

      // @ts-expect-error
      showNotice(error?.message || error);
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.image_alt_text_enabled) {
    return;
  }

  return {
    title: t('Generate Alt Text'),
    onClick: generateAltText,
    isDisabled: !attributes.url,
  };
};
