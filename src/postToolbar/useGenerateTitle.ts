import { useSettings } from '@/settings';
import {
  ai,
  hideLoadingMessage,
  removeWrappingQuotes,
  showLoadingMessage,
  showNotice,
  setCustomiseTextOptionsModal,
} from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_title_prompt');
  const service = useService('post_title_prompt_service');

  const { content, oldTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute?.('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _title = getEditedPostAttribute?.('title');

    return {
      content: _content,
      oldTitle: _title,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Generating Titles', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const titleField = document.getElementById('title') as HTMLInputElement;
      const _oldTitle = oldTitle || titleField?.value;

      const [title1, title2, title3] = await Promise.all([
        ai.getTitleFromContent(_content, _oldTitle, prompt, service?.slug),
        ai.getTitleFromContent(_content, _oldTitle, prompt, service?.slug),
        ai.getTitleFromContent(_content, _oldTitle, prompt, service?.slug),
      ]);

      if (!title1 || !title2 || !title3) {
        throw new Error(__('Sorry, there has been an issue while generating your titles.', 'filter-ai'));
      }

      setCustomiseTextOptionsModal({
        options: [removeWrappingQuotes(title1), removeWrappingQuotes(title2), removeWrappingQuotes(title3)],
        choice: '',
        type: 'title',
        context: {
          content: _content,
          text: _oldTitle,
          prompt,
          service: service?.slug,
          serviceName: service?.metadata.name,
          hasSelection: false,
          selectionStart: null,
          selectionEnd: null,
          label: __('Title', 'filter-ai'),
          feature: 'title',
        },
      });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.post_title_enabled) {
    return;
  }

  return {
    title: __('Generate Title', 'filter-ai'),
    onClick,
  };
};
