import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';
import { useService } from '@/utils/ai/services/useService';

export const useGenerateExcerpt = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor') || {};

  const prompt = usePrompts('post_excerpt_prompt');
  const service = useService('post_excerpt_prompt_service');

  const { excerptPanelEnabled, content, oldExcerpt } = useSelect((select) => {
    const { getCurrentPostType, isEditorPanelEnabled, getEditedPostAttribute } = select('core/editor') || {};

    // @ts-expect-error Type 'never' has no call signatures.
    const postType = getCurrentPostType?.();

    // check if post type uses excerpt
    // based on logic within https://github.com/WordPress/gutenberg/blob/trunk/packages/editor/src/components/post-excerpt/panel.js
    const _excerptPanelEnabled =
      // @ts-expect-error Type 'never' has no call signatures.
      (!['wp_template', 'wp_template_part', 'wp_block'].includes(postType) && isEditorPanelEnabled?.('post-excerpt')) ||
      !!document.getElementById('excerpt');

    // @ts-expect-error Type 'never' has no call signatures.
    const _content = getEditedPostAttribute?.('content');

    // @ts-expect-error Type 'never' has no call signatures.
    const _oldExcerpt = getEditedPostAttribute?.('excerpt');

    return {
      excerptPanelEnabled: _excerptPanelEnabled,
      content: _content,
      oldExcerpt: _oldExcerpt,
    };
  }, []);

  const onClick = async () => {
    showLoadingMessage(__('Excerpt', 'filter-ai'));

    try {
      const _content = content || window.tinymce?.editors?.content?.getContent();

      const excerptField = document.getElementById('excerpt') as HTMLTextAreaElement;
      const _oldExcerpt = oldExcerpt || excerptField?.value;

      const excerpt = await ai.getExcerptFromContent(_content, _oldExcerpt, prompt, service?.slug);

      if (!excerpt) {
        throw new Error(__('Sorry, there has been an issue while generating your excerpt.', 'filter-ai'));
      }

      if (window.filter_ai_dependencies.block_editor && editPost) {
        editPost({ excerpt });
      } else if (excerptField) {
        excerptField.value = excerpt;
      }

      let message;

      if (service?.metadata.name) {
        message = sprintf(__('Excerpt has been updated using %s', 'filter-ai'), service.metadata.name);
      } else {
        message = __('Excerpt has been updated', 'filter-ai');
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

  if (!excerptPanelEnabled || !settings?.post_excerpt_enabled) {
    return;
  }

  return {
    title: __('Generate Excerpt', 'filter-ai'),
    onClick,
  };
};
