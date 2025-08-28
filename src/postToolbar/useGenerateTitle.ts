import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, removeWrappingQuotes, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_title_prompt');

  const serviceConfig = settings?.post_title_prompt_service;

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
    showLoadingMessage(__('Title', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const titleField = document.getElementById('title') as HTMLInputElement;
      const _oldTitle = oldTitle || titleField?.value;

      const title = await ai.getTitleFromContent(_content, _oldTitle, prompt, serviceConfig);

      if (!title) {
        throw new Error(__('Sorry, there has been an issue while generating your title.', 'filter-ai'));
      }

      if (window.filter_ai_dependencies.block_editor && editPost) {
        editPost({ title: removeWrappingQuotes(title) });
      } else if (titleField) {
        titleField.value = title;
      }

      showNotice({
        message: __(`Title has been updated using ${serviceConfig?.service || 'unknown'}`, 'filter-ai'),
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
