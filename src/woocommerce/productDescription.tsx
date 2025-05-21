import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';
import _ from 'underscore';

const useProductDescription = () => {
  const { settings } = useSettings();

  const updateContent = (newValue: string) => {
    const content = document.getElementById('content') as HTMLTextAreaElement;

    if (!content) {
      return;
    }

    content.value = newValue;
    content.dispatchEvent(new Event('change'));

    window.tinymce?.get('content')?.setContent(newValue);
  };

  const onClick = async () => {
    showLoadingMessage(t('Generating product description'));

    try {
      const promptPrefix = settings?.wc_product_description_prompt || ai.prompts.wc_product_description_prompt;

      const promptSuffix = window.prompt('Please provide some information about the product');

      if (!promptSuffix) {
        return;
      }

      const prompt = `${promptPrefix} ${promptSuffix}`;

      const content = await ai.generateText({
        feature: 'filter-ai-wc-product-description',
        prompt,
      });

      if (!content) {
        throw new Error(t('Sorry, there has been an issue while generating your product description.'));
      }

      updateContent(content);

      showNotice({ message: t('Product description has been updated') });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.wc_product_description_enabled) {
    return;
  }

  return {
    title: t('Generate description'),
    onClick,
  };
};

export const ProductDescriptionToolbar = () => {
  const content = useProductDescription();

  const controls = _.compact([content]);

  return <DropdownMenu controls={controls} toggleProps={{ className: 'is-small' }} />;
};
