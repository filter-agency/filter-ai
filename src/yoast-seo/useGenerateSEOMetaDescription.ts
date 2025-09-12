import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

export const useGenerateSEOMetaDescription = () => {
  const { settings } = useSettings();

  const prompt = usePrompts('yoast_seo_meta_description_prompt');
  const service = useService('yoast_seo_meta_description_prompt_service');

  const { content, oldDescription } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};
    const { getDescription } = select('yoast-seo/editor') || {};

    return {
      // @ts-expect-error Type 'never' has no call signatures.
      content: getEditedPostAttribute?.('content'),
      // @ts-expect-error Type 'never' has no call signatures.
      oldDescription: getDescription?.(),
    };
  }, []);

  const scrollToField = () => {
    const field = document
      .querySelectorAll('section')?.[2]
      ?.querySelectorAll('.yst-replacevar')?.[1]
      ?.querySelector('.yst-replacevar__label');

    field?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const updateDescription = (description: string) => {
    window.YoastSEO?.store.dispatch({
      type: 'SNIPPET_EDITOR_UPDATE_DATA',
      data: {
        description,
      },
    });

    const yoastSeoSearchAppearanceButton = document.querySelector('#yoast-snippet-editor-metabox') as HTMLButtonElement;

    if (!yoastSeoSearchAppearanceButton) {
      return;
    }

    if (yoastSeoSearchAppearanceButton.getAttribute('aria-expanded') === 'false') {
      yoastSeoSearchAppearanceButton.click();
      setTimeout(() => scrollToField(), 100);
    } else {
      scrollToField();
    }

    let message = __('SEO meta description has been updated', 'filter-ai');

    if (service?.metadata.name) {
      message = sprintf(__('SEO meta description has been updated using %s', 'filter-ai'), service.metadata.name);
    }

    showNotice({ message });
  };

  const onClick = async () => {
    showLoadingMessage(__('SEO Meta Description', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const description = await ai.getSeoMetaDescriptionFromContent(_content, oldDescription, prompt, service?.slug);

      if (!description) {
        throw new Error(__('Sorry, there has been an issue while generating your SEO meta description.', 'filter-ai'));
      }

      updateDescription(description);
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.yoast_seo_meta_description_enabled || !window.filter_ai_dependencies.yoast_seo || !window.YoastSEO) {
    return;
  }

  return {
    title: __('Generate SEO Meta Description', 'filter-ai'),
    onClick,
  };
};
