import { dispatch } from '@wordpress/data';
import { pasteHandler } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { showNotice, showLoadingMessage, hideLoadingMessage } from '@/utils';
import { generateTextStream } from '@/utils/ai/services/generateText';
import {
  storeGenerationParams,
  clearGenerationParams,
  getGenerationParams,
  type GenerationParams,
} from '@/utils/generateContentModal/paramsStore';

export type StreamArgs = {
  clientId: string;
  blockName: string;
  prompt: string;
  keywords: string[];
  length: string;
  service?: string;
};

const blockEditorDispatch = () =>
  dispatch('core/block-editor') as unknown as {
    updateBlockAttributes: (id: string, attrs: Record<string, unknown>) => void;
    replaceBlock: (id: string, blocks: unknown | unknown[]) => void;
  };

const writeContent = (clientId: string, content: string) => {
  blockEditorDispatch().updateBlockAttributes(clientId, { content });
};

/** Human-readable block name used in the loading overlay copy. */
const labelForBlock = (name: string): string => {
  switch (name) {
    case 'core/heading':
      return __('heading', 'filter-ai');
    case 'core/list-item':
      return __('list item', 'filter-ai');
    case 'core/paragraph':
    default:
      return __('paragraph', 'filter-ai');
  }
};

/**
 * Convert a markdown response into one or more Gutenberg blocks and replace the
 * target block. Returns the clientId of the first resulting block so the caller
 * can store generation params against it.
 *
 * - Multi-block result: returns blocks[0].clientId from the pasteHandler array.
 * - Single-block fallback (plain text): returns the original clientId unchanged.
 */
const replaceWithParsedBlocks = (clientId: string, markdown: string): string => {
  const trimmed = (markdown || '').trim();
  if (!trimmed) {
    writeContent(clientId, '');
    return clientId;
  }

  // Strip any code fence the model wrapped the response in despite the prompt.
  const cleaned = trimmed.replace(/^```(?:markdown|md)?\s*\n/, '').replace(/\n```\s*$/, '');

  let blocks: Array<{ clientId: string }> = [];
  try {
    blocks = (pasteHandler({ HTML: '', plainText: cleaned }) as unknown as Array<{ clientId: string }>) || [];
  } catch {
    blocks = [];
  }

  if (!blocks.length) {
    writeContent(clientId, cleaned);
    return clientId;
  }

  blockEditorDispatch().replaceBlock(clientId, blocks as unknown[]);
  return blocks[0].clientId;
};

/**
 * Generate AI text and write it into the block, then store the params used so
 * the user can regenerate without reopening the modal.
 */
export const streamIntoBlock = async ({
  clientId,
  blockName,
  prompt,
  keywords,
  length,
  service,
}: StreamArgs): Promise<void> => {
  if (!clientId) return;

  showLoadingMessage(labelForBlock(blockName), 'generating content');

  const featureSlug = blockName.replace(/^core\//, '').replace(/[^a-z0-9]+/gi, '-');
  const feature = `filter-ai-generate-content-${featureSlug}`;

  try {
    const markdown = await generateTextStream(
      { prompt, keywords, length, feature, capabilities: ['text_generation'], service },
      () => undefined
    );

    const firstClientId = replaceWithParsedBlocks(clientId, markdown);

    // Store params against the first resulting block so "Regenerate" can find them.
    const stored: GenerationParams = { prompt, keywords, length, service, blockName };
    storeGenerationParams(firstClientId, stored);

    // If replaceBlock created new blocks, the original clientId no longer exists —
    // remove any stale entry for it so the Regenerate item doesn't ghost on
    // unrelated blocks that happen to reuse the same slot.
    if (firstClientId !== clientId) {
      clearGenerationParams(clientId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showNotice({
      message: message || __('There was an issue generating content. Please try again.', 'filter-ai'),
      type: 'error',
    });
  } finally {
    hideLoadingMessage();
  }
};

/**
 * Re-run generation for a block using the params from the most recent
 * Generate From Prompt call. No modal is shown — the same blue overlay
 * appears and the same structured output is written on completion.
 *
 * If no params are stored for this clientId (e.g. the block hasn't been
 * generated into yet), logs a warning and returns without doing anything.
 */
export const regenerateBlock = async (clientId: string): Promise<void> => {
  const params = getGenerationParams(clientId);
  if (!params) {
    console.warn('[Filter AI] regenerateBlock: no stored params for clientId', clientId);
    return;
  }
  await streamIntoBlock({ clientId, ...params });
};
