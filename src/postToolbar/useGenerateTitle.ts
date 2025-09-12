import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, removeWrappingQuotes, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor');

  const prompt = usePrompts('post_title_prompt');
  const service = useService('post_title_prompt_service');

  const { content, oldTitle } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor');

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _title = getEditedPostAttribute('title');

    return {
      content: _content,
      oldTitle: _title,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Title', 'filter-ai'));

    try {
      const title = await ai.getTitleFromContent(content, oldTitle, prompt, service?.slug);

      if (!title) {
        throw new Error(__('Sorry, there has been an issue while generating your title.', 'filter-ai'));
      }

      editPost({ title: removeWrappingQuotes(title) });

      let message = __('Title has been updated', 'filter-ai');

      if (service?.metadata.name) {
        message = sprintf(__('Title has been updated using %s', 'filter-ai'), service.metadata.name);
      }

      showNotice({ message });
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
