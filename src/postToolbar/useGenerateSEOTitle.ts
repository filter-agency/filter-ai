import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
  ai,
  hideLoadingMessage,
  showLoadingMessage,
  showNotice,
  setSeoTitleOptionsModal,
  useSeoTitleOptionsModal,
  resetSeoTitleOptionsModal,
} from '@/utils';
import { useEffect } from '@wordpress/element';
import {usePrompts} from "@/utils/ai/prompts/usePrompts";

export const useGenerateSEOTitle = () => {
  const { settings } = useSettings();

  const { options, choice } = useSeoTitleOptionsModal();

  const prompt = usePrompts('yoast_seo_title_prompt');

  const { content, getSeoTitleTemplate, oldSeoTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor');
    const { getSeoTitleTemplate, getSeoTitle } = select('yoast-seo/editor');

    return {
      // @ts-expect-error Type 'never' has no call signatures.
      content: getEditedPostAttribute('content'),
      // @ts-expect-error Type 'never' has no call signatures.
      getSeoTitleTemplate: getSeoTitleTemplate(),
      // @ts-expect-error Type 'never' has no call signatures.
      oldSeoTitle: getSeoTitle(),
    };
  }, []);

  const scrollToField = () => {
    const field = document.querySelector('#yoast-google-preview-title-metabox');

    field?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const formatTitle = (title: string) => {
    const template = getSeoTitleTemplate;
    const tag = '%%title%%';

    if (getSeoTitleTemplate.indexOf(tag) > -1) {
      return template.replace(tag, title);
    }

    return `${title} ${template}`;
  };

  const updateTitle = (title: string) => {
    window.YoastSEO?.store.dispatch({
      type: 'SNIPPET_EDITOR_UPDATE_DATA',
      data: {
        title: formatTitle(title),
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

    showNotice({ message: __('SEO title has been updated', 'filter-ai') });
  };

  const onClick = async () => {
    showLoadingMessage(__('Generating SEO Title', 'filter-ai'));

    let options = [];

    try {
      const titles = await ai.getSeoTitleFromContent(content, oldSeoTitle, prompt);

      if (!titles) {
        throw new Error(__('Sorry, there has been an issue while generating your SEO title.', 'filter-ai'));
      }

      options = titles.split('||').map((option: string) => option.trim());

      setSeoTitleOptionsModal({ options, choice: '' });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  useEffect(() => {
    if (choice && !options.length) {
      updateTitle(choice);
      resetSeoTitleOptionsModal();
    }
  }, [choice, options]);

  if (!settings?.yoast_seo_title_enabled || !window.YoastSEO) {
    return;
  }

  return {
    title: __('Generate SEO Title', 'filter-ai'),
    onClick,
  };
};
