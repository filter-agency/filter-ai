import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';

export const useGenerateSEOMetaDescription = () => {
  const { settings } = useSettings();

  const { content, oldDescription } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor');
    const { getDescription } = select('yoast-seo/editor');

    return {
      // @ts-expect-error Type 'never' has no call signatures.
      content: getEditedPostAttribute('content'),
      // @ts-expect-error Type 'never' has no call signatures.
      oldDescription: getDescription(),
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

    showNotice({ message: __('SEO meta description has been updated', 'filter-ai') });
  };

  const onClick = async () => {
    showLoadingMessage(__('Generating SEO Meta Description', 'filter-ai'));

    try {
      const description = await ai.getSeoMetaDescriptionFromContent(
        content,
        oldDescription,
        settings?.yoast_seo_meta_description_prompt
      );

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

  if (!settings?.yoast_seo_meta_description_enabled || !window.YoastSEO) {
    return;
  }

  return {
    title: __('Generate SEO Meta Description', 'filter-ai'),
    onClick,
  };
};
