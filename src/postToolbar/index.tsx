import { DropdownMenu } from '@/components/dropdownMenu';
import { createRoot, useEffect } from '@wordpress/element';
import { useGenerateTitle } from './useGenerateTitle';
import { useGenerateExcerpt } from './useGenerateExcerpt';
import _ from 'underscore';
import { useGenerateTags } from './useGenerateTags';
import { useGenerateSEOTitle } from '../yoast-seo/useGenerateSEOTitle';
import { useGenerateSEOMetaDescription } from '../yoast-seo/useGenerateSEOMetaDescription';
import { useCustomiseTextOptionsModal, resetCustomiseTextOptionsModal, showNotice } from '@/utils';
import { useDispatch, useSelect, resolveSelect, dispatch, select } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { cleanForSlug } from '@wordpress/url';

const PostToolbar = () => {
  const generateTitle = useGenerateTitle();
  const generateExcerpt = useGenerateExcerpt();
  const generateTags = useGenerateTags();
  const generateSEOTitle = useGenerateSEOTitle();
  const generateSEOMetaDescription = useGenerateSEOMetaDescription();

  const { editPost } = useDispatch('core/editor') || {};
  const { choice, type, context } = useCustomiseTextOptionsModal();

  const { currentTagIds } = useSelect((select) => {
    const { getEditedPostAttribute } = select('core/editor') || {};
    // @ts-expect-error
    const _currentTagIds = getEditedPostAttribute?.('tags') || [];

    return {
      currentTagIds: _currentTagIds,
    };
  }, []);

  const controls = _.compact([
    generateTitle,
    generateExcerpt,
    generateTags,
    generateSEOTitle,
    generateSEOMetaDescription,
  ]);

  useEffect(() => {
    if (!choice || !type) return;

    const fieldMap: Record<
      string,
      {
        attr?: 'title' | 'excerpt' | 'tags';
        selector?: string;
        defaultMsg: string;
        handler?: (choice: string) => Promise<void>;
      }
    > = {
      title: {
        attr: 'title',
        selector: 'title',
        defaultMsg: __('Title has been updated', 'filter-ai'),
      },
      excerpt: {
        attr: 'excerpt',
        selector: 'excerpt',
        defaultMsg: __('Excerpt has been updated', 'filter-ai'),
      },
      tags: {
        defaultMsg: __('Tags have been updated', 'filter-ai'),
        handler: async (choice: string) => {
          const tags = choice
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

          if (window.filter_ai_dependencies.block_editor && editPost) {
            const newTagIds = [];

            for (const tag of tags) {
              const existingTag = await resolveSelect('core').getEntityRecords('taxonomy', 'post_tag', {
                slug: cleanForSlug(tag),
              });

              if (existingTag?.[0]?.id) {
                newTagIds.push(existingTag[0].id);
              } else {
                // @ts-expect-error
                const newTag = await dispatch('core')?.saveEntityRecord('taxonomy', 'post_tag', { name: tag });
                if (newTag?.id) newTagIds.push(newTag.id);
              }
            }

            editPost({ tags: [...new Set([...currentTagIds, ...newTagIds])] });
          } else if (window.tagBox) {
            const tagsdiv = document.getElementById('post_tag');
            const tempElement = document.createElement('div');
            tempElement.textContent = choice;
            window.tagBox.flushTags(tagsdiv, tempElement);
          }
        },
      },
    };

    const config = fieldMap[type];
    if (!config) return;

    const handleUpdate = async () => {
      if (config.handler) {
        await config.handler(choice);
      } else if (config.attr) {
        if (window.filter_ai_dependencies.block_editor && editPost) {
          editPost({ [config.attr]: choice });
        } else {
          const field = document.getElementById(config.selector!) as HTMLInputElement | HTMLTextAreaElement;
          if (field) field.value = choice;
        }
      }

      let message = config.defaultMsg;
      if (context?.serviceName) {
        message = sprintf(__('%s using %s', 'filter-ai'), config.defaultMsg, context.serviceName);
      }
      showNotice({ message });
    };

    handleUpdate();

    const timer = setTimeout(resetCustomiseTextOptionsModal, 100);
    return () => clearTimeout(timer);
  }, [choice, type, context, editPost, currentTagIds]);

  return <DropdownMenu controls={controls} toggleProps={{ className: 'is-small' }} />;
};

const addToolbar = () => {
  const id = 'filter-ai-post-toolbar-container';
  const postActionsButton =
    document.documentElement.querySelector('.editor-all-actions-button') ||
    document.documentElement.querySelector('#misc-publishing-actions');

  if (!postActionsButton || document.getElementById(id)) {
    return;
  }

  const container = document.createElement('div');
  container.id = id;

  const root = createRoot(container);

  postActionsButton.before(container);

  root.render(<PostToolbar />);
};

const observer = new MutationObserver(addToolbar);

observer.observe(document.body, { childList: true, subtree: true });
