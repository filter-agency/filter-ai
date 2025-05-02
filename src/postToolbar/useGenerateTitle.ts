import { useSettings } from '@/settings';
import { ai, hideLoadingMessage, removeWrappingQuotes, showLoadingMessage, showNotice, t } from '@/utils';
import { useDispatch, useSelect } from '@wordpress/data';

export const useGenerateTitle = () => {
  const { settings } = useSettings();
  const { editPost } = useDispatch('core/editor');

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
    showLoadingMessage(t('Generating title'));

    try {
      const title = await ai.getTitleFromContent(content, oldTitle, settings?.post_title_prompt);

      if (!title) {
        throw new Error(t('Sorry, there has been an issue while generating your title.'));
      }

      editPost({ title: removeWrappingQuotes(title) });

      showNotice({ message: t('Title has been updated') });
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
    title: t('Generate Title'),
    onClick,
  };
};
