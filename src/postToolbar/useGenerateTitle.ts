import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, removeWrappingQuotes, showLoadingMessage, showNotice } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { usePrompts } from '@/utils/ai/prompts/usePrompts';

declare var wp: {
  data: any;
  blocks: any;
};

const detectBlockEditor = (): boolean => {
  const hasBlockEditorDOM =
    document.body.classList.contains('block-editor-page') ||
    document.querySelector('.block-editor') !== null ||
    document.querySelector('#editor') !== null;

  const hasBlockEditorGlobals = typeof wp !== 'undefined' && wp.data && wp.blocks;

  return hasBlockEditorDOM && hasBlockEditorGlobals;
};

const getBlockEditorData = (content: string, oldTitle: string) => ({
  content: content || '',
  oldTitle: oldTitle || '',
});

const updateBlockEditorTitle = async (editPost: (post: { title: string }) => void, title: string): Promise<boolean> => {
  try {
    editPost({ title });
    return true;
  } catch (error) {
    return false;
  }
};

const getClassicEditorData = () => {
  let content = '';
  let oldTitle = '';

  if (window.tinymce?.editors?.content) {
    content = window.tinymce.editors.content.getContent();
  } else if (document.getElementById('content')) {
    content = (document.getElementById('content') as HTMLTextAreaElement)?.value || '';
  }

  const titleField = document.getElementById('title') as HTMLInputElement;
  oldTitle = titleField?.value || '';

  return { content, oldTitle };
};

const updateClassicEditorTitle = (title: string): boolean => {
  const titleField = document.getElementById('title') as HTMLInputElement;
  if (!titleField) {
    throw new Error(__('Could not find title field to update.', 'filter-ai'));
  }

  titleField.value = title;
  titleField.dispatchEvent(new Event('input', { bubbles: true }));
  titleField.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

interface BlockEditorData {
  content: string | null;
  oldTitle: string | null;
  editPost: ((post: { title: string }) => void) | null;
}

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const prompt = usePrompts('post_title_prompt');
  const isBlockEditor = detectBlockEditor();

  interface CoreEditorSelectors {
    getEditedPostAttribute: (attribute: 'content' | 'excerpt' | 'title') => any;
    getCurrentPostType: () => string;
    isEditorPanelEnabled: (panelName: string) => boolean;
  }

  const blockEditorData = useSelect(
    (select): BlockEditorData => {
      if (!isBlockEditor) {
        return { content: null, oldTitle: null, editPost: null };
      }

      const { getEditedPostAttribute } = select('core/editor') as unknown as CoreEditorSelectors;
      const dispatch = wp.data.dispatch('core/editor');

      if (!getEditedPostAttribute || !dispatch || typeof dispatch.editPost !== 'function') {
        return { content: null, oldTitle: null, editPost: null };
      }

      try {
        return {
          content: getEditedPostAttribute('content'),
          oldTitle: getEditedPostAttribute('title'),
          editPost: dispatch.editPost,
        };
      } catch (error) {
        console.error('Error in useSelect:', error);
        return { content: null, oldTitle: null, editPost: null };
      }
    },
    [isBlockEditor]
  );

  const onClick = async () => {
    showLoadingMessage(__('Title', 'filter-ai'));

    try {
      let content: string;
      let oldTitle: string;

      if (isBlockEditor && blockEditorData.content !== null) {
        // Correctly handle the potential null values from blockEditorData
        const data = getBlockEditorData(blockEditorData.content, blockEditorData.oldTitle || '');
        content = data.content;
        oldTitle = data.oldTitle;
      } else {
        const data = getClassicEditorData();
        content = data.content;
        oldTitle = data.oldTitle;
      }

      if (!content) {
        throw new Error(__('No content available to generate a title from.', 'filter-ai'));
      }

      const generatedTitle = await ai.getTitleFromContent(content, oldTitle, prompt);
      if (!generatedTitle) {
        throw new Error(__('Sorry, there has been an issue while generating your title.', 'filter-ai'));
      }

      const cleanTitle = removeWrappingQuotes(generatedTitle);
      let updateSuccessful = false;

      if (isBlockEditor && blockEditorData.editPost) {
        updateSuccessful = await updateBlockEditorTitle(blockEditorData.editPost, cleanTitle);
      } else {
        updateSuccessful = updateClassicEditorTitle(cleanTitle);
      }

      if (updateSuccessful) {
        showNotice({ message: __('Title has been updated', 'filter-ai') });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showNotice({
        message: errorMessage,
        type: 'error',
      });
    } finally {
      hideLoadingMessage();
    }
  };

  if (!settings?.post_title_enabled) {
    return null;
  }

  return {
    title: __('Generate Title', 'filter-ai'),
    onClick,
  };
};
