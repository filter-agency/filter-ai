import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, removeWrappingQuotes, showLoadingMessage, showNotice, showChoiceModal } from '@/utils';
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

  const update = async (title: string) => {
    try {
      const titleField = document.getElementById('title') as HTMLInputElement;

      if (window.filter_ai_dependencies.block_editor && editPost) {
        editPost({ title: removeWrappingQuotes(title) });
      } else if (titleField) {
        titleField.value = title;
      }

      let message = __('Title has been updated', 'filter-ai');

      if (service?.metadata.name) {
        message = sprintf(__('Title has been updated using %s', 'filter-ai'), service.metadata.name);
      }

      showNotice({ message });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    }
  };

  const regenerate = async (options: string[]) => {
    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();
      const titleField = document.getElementById('title') as HTMLInputElement;
      const _oldTitle = oldTitle || titleField?.value;

      const oldOptions = [_oldTitle, ...options];

      const response = await ai.getTitleFromContent(_content, oldOptions.join(', '), prompt, service?.slug);

      if (!response) {
        throw new Error(__('Sorry, there has been an issue while generating your titles.', 'filter-ai'));
      }

      const newOptions = JSON.parse(response);

      showChoiceModal({ options: newOptions, choice: '' });
    } catch (error) {
      console.error(error);

      // @ts-expect-error Property 'message' does not exist on type '{}'
      showNotice({ message: error?.message || error, type: 'error' });
    }
  };

  const onClick = async () => {
    showLoadingMessage(__('Titles', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const titleField = document.getElementById('title') as HTMLInputElement;
      const _oldTitle = oldTitle || titleField?.value;

      const response = await ai.getTitleFromContent(_content, _oldTitle, prompt, service?.slug);

      if (!response) {
        throw new Error(__('Sorry, there has been an issue while generating your titles.', 'filter-ai'));
      }

      const options = JSON.parse(response);

      showChoiceModal({
        title: __('Select Your AI Generated Title', 'filter-ai'),
        description: __('Choose the title that works best for your content', 'filter-ai'),
        label: __('Choose from these AI generated titles:', 'filter-ai'),
        update,
        regenerate,
        options,
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
