import { BlockEditProps } from '@/types';
import { getBase64Image, getMimeType, supportedMimeTypes, t, ai } from '@/utils';
import { useSelect } from '@wordpress/data';

type Props = {
  showNotice: (newMessage: string) => void;
  setFetchingText: React.Dispatch<React.SetStateAction<string>>;
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

export const useGenerateAltText = ({ showNotice, setFetchingText, attributes, setAttributes }: Props) => {
  const capabilities = [ai.enums.AiCapability.MULTIMODAL_INPUT, ai.enums.AiCapability.TEXT_GENERATION];

  const service = useSelect((select) => select(ai.store).getAvailableService({ capabilities }), []);

  const generateAltText = async () => {
    setFetchingText(t('Generating alt text'));

    try {
      const mimeType = getMimeType(attributes.url);

      if (!mimeType) {
        throw new Error(
          t(
            `Sorry, that image type is not supported. Please use one of the following types: ${supportedMimeTypes.join(', ')}.`
          )
        );
      }

      const base64Image = await getBase64Image(attributes.url);

      const candidates = await service.generateText(
        {
          role: ai.enums.ContentRole.USER,
          parts: [
            {
              text: 'Please generate a short description for the following image that can be used as its alternative text. The description should be clear, succinct, and provide a sense of what the image portrays, ensuring that it is accessible to individuals using screen readers.',
            },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
        {
          feature: 'filter-ai-alt-text',
          capabilities,
        }
      );

      const alt = ai.helpers
        .getTextFromContents(ai.helpers.getCandidateContents(candidates))
        .replaceAll('\n\n\n\n', '\n\n');

      setAttributes({ alt });

      showNotice(t('Alt text has been updated.'));
    } catch (error: unknown) {
      let message = t('Sorry, there has been an issue while generating your alt text.');

      if (typeof error === 'string') {
        message = error;
      } else if (error instanceof Error) {
        message = error.message;
      }

      console.error(message);
      showNotice(message);
    } finally {
      setFetchingText('');
    }
  };

  return {
    title: t('Generate Alt Text'),
    onClick: generateAltText,
    isDisabled: !attributes.url,
  };
};
