import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice, t } from '@/utils';
import _ from 'underscore';

const useProductExcerpt = () => {
  const { settings } = useSettings();

  const updateExcerpt = (newValue: string) => {
    const excerpt = document.getElementById('excerpt') as HTMLTextAreaElement;

    if (!excerpt) {
      return;
    }

    excerpt.value = newValue;
    excerpt.dispatchEvent(new Event('change'));

    window.tinymce?.get('excerpt')?.setContent(newValue);
  };

  const onClick = async () => {
    showLoadingMessage(t('Generating product short description'));

    try {
      const promptPrefix = settings?.wc_product_excerpt_prompt || ai.prompts.wc_product_excerpt_prompt;

      const promptSuffix = window.prompt('Please provide some information about the product');

      if (!promptSuffix) {
        return;
      }

      const prompt = `${promptPrefix} ${promptSuffix}`;

      const excerpt = await ai.generateText({
        feature: 'filter-ai-wc-product-excerpt',
        prompt,
      });

      if (!excerpt) {
        throw new Error(t('Sorry, there has been an issue while generating your product short description.'));
      }

      updateExcerpt(excerpt);

      showNotice({ message: t('Product short description has been updated') });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.wc_product_excerpt_enabled) {
    return;
  }

  return {
    title: t('Generate short description'),
    onClick,
  };
};

export const ProductExcerptToolbar = () => {
  const excerpt = useProductExcerpt();

  const controls = _.compact([excerpt]);

  return <DropdownMenu controls={controls} toggleProps={{ className: 'is-small' }} />;
};
