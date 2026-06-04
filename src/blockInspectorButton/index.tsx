import { createRoot } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { DropdownMenu } from '@/components/dropdownMenu';
import { useSettings } from '@/settings';
import { useService } from '@/utils/ai/services/useService';
import { showGenerateContentModal } from '@/utils/generateContentModal';
import { streamIntoBlock, regenerateBlock } from '@/blockToolbar/textToolbar/streamIntoBlock';
import { useGenerationParams } from '@/utils/generateContentModal/paramsStore';

// Same block scope as the toolbar (TextToolbar). Paragraph/heading/list-item.
const SUPPORTED = ['core/paragraph', 'core/heading', 'core/list-item'];

/**
 * The Filter AI icon rendered into the block inspector's header row (the block
 * card, opposite the block name). Mirrors the post-level F-icon placement.
 *
 * Why a separately-injected component rather than InspectorControls: the block
 * card header has no public slot, and the request is specifically for the icon
 * on the block-name row (not a panel below it). This component is rendered into
 * a DOM node we append to the card via the observer below, reads the selected
 * block reactively, and renders the icon only for supported, enabled blocks.
 */
const BlockInspectorButton = () => {
  const { settings } = useSettings();
  const service = useService('generate_content_prompt_service');

  const selected = useSelect((select) => {
    // @ts-expect-error core/block-editor selectors are untyped in this project
    const block = select('core/block-editor').getSelectedBlock();
    return block ? { clientId: block.clientId as string, name: block.name as string } : null;
  }, []);

  const regenerateParams = useGenerationParams(selected?.clientId);

  if (!settings?.generate_content_enabled || !selected || !SUPPORTED.includes(selected.name)) {
    return null;
  }

  const open = () => {
    showGenerateContentModal({
      blockName: selected.name,
      onSubmit: ({ prompt, keywords, length }) => {
        streamIntoBlock({
          clientId: selected.clientId,
          blockName: selected.name,
          prompt,
          keywords,
          length,
          service: service?.slug,
        });
      },
    });
  };

  return (
    <DropdownMenu
      toggleProps={{ className: 'is-small' }}
      controls={[
        {
          title: __('Generate From Prompt', 'filter-ai'),
          onClick: open,
        },
        ...(regenerateParams && selected
          ? [
              {
                title: __('Regenerate', 'filter-ai'),
                onClick: () => regenerateBlock(selected.clientId),
              },
            ]
          : []),
      ]}
    />
  );
};

const CONTAINER_ID = 'filter-ai-block-inspector-button';

/**
 * Append our container to the block inspector's card header (once) and render
 * the icon into it. The card persists across block selection changes, so the
 * inner component re-renders reactively; if Gutenberg replaces the card node
 * (e.g. closing/reopening the inspector) the observer re-injects. Mirrors the
 * MutationObserver pattern used by src/postToolbar/index.tsx.
 */
const inject = () => {
  const card = document.querySelector('.block-editor-block-inspector .block-editor-block-card');
  if (!card) {
    return;
  }
  // The card lays out as: card > VStack(column) > [ HStack(icon + title), description ].
  // We want the icon on the title row, so append into that first HStack (which is
  // a full-width flex row); margin-left:auto then right-aligns it next to the
  // title. Fall back to the card itself if the structure differs in some WP build.
  const vstack = card.querySelector(':scope > .components-flex');
  const titleRow = vstack ? vstack.querySelector(':scope > .components-h-stack') : null;
  const target = (titleRow as HTMLElement | null) || (card as HTMLElement);
  if (target.querySelector(`#${CONTAINER_ID}`)) {
    return;
  }
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'filter-ai-block-inspector-button';
  target.appendChild(container);
  createRoot(container).render(<BlockInspectorButton />);
};

const observer = new MutationObserver(inject);
observer.observe(document.body, { childList: true, subtree: true });
