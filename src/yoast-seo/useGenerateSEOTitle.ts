import { useSettings } from '@/settings';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
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
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

export const useGenerateSEOTitle = () => {
  const { settings } = useSettings();

  const { options, choice } = useSeoTitleOptionsModal();

  const prompt = usePrompts('yoast_seo_title_prompt');
  const service = useService('yoast_seo_title_prompt_service');

  const { content, getSeoTitleTemplate, oldSeoTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};
    const { getSeoTitleTemplate, getSeoTitle } = select('yoast-seo/editor') || {};

    return {
      // @ts-expect-error Type 'never' has no call signatures.
      content: getEditedPostAttribute?.('content'),
      // @ts-expect-error Type 'never' has no call signatures.
      getSeoTitleTemplate: getSeoTitleTemplate?.(),
      // @ts-expect-error Type 'never' has no call signatures.
      oldSeoTitle: getSeoTitle?.(),
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

    if (getSeoTitleTemplate?.indexOf(tag) > -1) {
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

    let message = __('SEO title has been updated', 'filter-ai');

    if (service?.metadata.name) {
      message = sprintf(__('SEO title has been updated using %s', 'filter-ai'), service.metadata.name);
    }

    showNotice({ message });
  };

  const onClick = async () => {
    showLoadingMessage(__('SEO Title', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const titles = await ai.getSeoTitleFromContent(_content, oldSeoTitle, prompt, service?.slug);

      if (!titles) {
        throw new Error(__('Sorry, there has been an issue while generating your SEO title.', 'filter-ai'));
      }

      const newOptions = titles.split('||').map((option: string) => option.trim());

      setSeoTitleOptionsModal({ options: newOptions, choice: '' });
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

  if (!settings?.yoast_seo_title_enabled || !window.filter_ai_dependencies.yoast_seo || !window.YoastSEO) {
    return;
  }

  return {
    title: __('Generate SEO Title', 'filter-ai'),
    onClick,
  };
};
