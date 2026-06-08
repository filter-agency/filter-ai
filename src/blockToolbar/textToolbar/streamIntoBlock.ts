import { dispatch, select } from '@wordpress/data';
import { pasteHandler, createBlock } from '@wordpress/blocks';
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
  /**
   * When regenerating: the full set of block clientIds produced by the previous
   * generation. Providing this causes replaceBlocks() to replace all of them at
   * once, so sibling blocks from the previous generation don't linger after the
   * new content lands. Omit on the first generation (single-block replacement).
   */
  replaceClientIds?: string[];
  /**
   * Append mode: insert the generated blocks AFTER the target block instead of
   * replacing it, leaving the original content intact. Only applies to a first
   * generation — Regenerate always replaces its own previous output, so this is
   * ignored when replaceClientIds is set.
   */
  append?: boolean;
};

const blockEditorDispatch = () =>
  dispatch('core/block-editor') as unknown as {
    updateBlockAttributes: (id: string, attrs: Record<string, unknown>) => void;
    replaceBlock: (id: string, blocks: unknown | unknown[]) => void;
    replaceBlocks: (clientIds: string[], blocks: unknown[]) => void;
    insertBlocks: (blocks: unknown[], index: number, rootClientId?: string) => void;
  };

const blockEditorSelect = () =>
  select('core/block-editor') as unknown as {
    getBlock: (id: string) => { clientId: string } | null | undefined;
    getBlockRootClientId: (id: string) => string | undefined;
    getBlockIndex: (id: string) => number;
  };

const writeContent = (clientId: string, content: string) => {
  blockEditorDispatch().updateBlockAttributes(clientId, { content });
};

/**
 * Parse a streamed markdown response into Gutenberg blocks.
 *
 * Strips any stray code fence the model wrapped the response in, then runs it
 * through pasteHandler (which understands markdown headings/lists, unlike
 * rawHandler). Returns the cleaned text and the parsed blocks (which may be
 * empty if the response was blank or unparseable).
 */
const parseMarkdownToBlocks = (markdown: string): { cleaned: string; blocks: Array<{ clientId: string }> } => {
  const cleaned = (markdown || '')
    .trim()
    .replace(/^```(?:markdown|md)?\s*\n/, '')
    .replace(/\n```\s*$/, '');
  let blocks: Array<{ clientId: string }> = [];
  if (cleaned) {
    try {
      blocks = (pasteHandler({ HTML: '', plainText: cleaned }) as unknown as Array<{ clientId: string }>) || [];
    } catch {
      blocks = [];
    }
  }
  return { cleaned, blocks };
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
 * Convert a markdown response into one or more Gutenberg blocks, replacing the
 * target block(s). Returns the clientIds of all resulting blocks.
 *
 * `replaceIds` is the set of blocks to replace — usually `[clientId]` on a
 * first generation, or all previously generated block clientIds on regeneration.
 * Any ids in `replaceIds` that no longer exist in the editor are silently skipped
 * so that manually-deleted sibling blocks don't cause errors.
 *
 * - Multi-block result: uses replaceBlocks() to atomically swap all replaceIds.
 * - Single-block / empty result: falls back to updateBlockAttributes on the
 *   primary (first) id.
 */
const replaceWithParsedBlocks = (replaceIds: string[], markdown: string): string[] => {
  const primaryId = replaceIds[0];
  const { cleaned, blocks } = parseMarkdownToBlocks(markdown);

  if (!cleaned) {
    writeContent(primaryId, '');
    return [primaryId];
  }

  if (!blocks.length) {
    writeContent(primaryId, cleaned);
    return [primaryId];
  }

  if (replaceIds.length === 1) {
    // Single-block replacement — use the simpler replaceBlock API.
    blockEditorDispatch().replaceBlock(primaryId, blocks as unknown[]);
  } else {
    // Multi-block regeneration: filter to only blocks still present in the
    // editor (user may have deleted some siblings since the last generation).
    const existing = replaceIds.filter((id) => !!blockEditorSelect().getBlock(id));
    const idsToReplace = existing.length > 0 ? existing : [primaryId];
    blockEditorDispatch().replaceBlocks(idsToReplace, blocks as unknown[]);
  }

  return blocks.map((b) => b.clientId);
};

/**
 * Insert the generated blocks immediately AFTER the target block, leaving the
 * target (and its content) untouched. Returns the clientIds of the inserted
 * blocks. Used by append mode.
 */
const appendAfterBlock = (clientId: string, markdown: string): string[] => {
  const { cleaned, blocks } = parseMarkdownToBlocks(markdown);
  if (!cleaned) {
    // Nothing came back — leave the block untouched and report no new blocks.
    return [clientId];
  }

  // Fall back to a single paragraph if the markdown didn't parse into blocks.
  const finalBlocks =
    blocks.length > 0
      ? blocks
      : [createBlock('core/paragraph', { content: cleaned }) as unknown as { clientId: string }];

  const sel = blockEditorSelect();
  const rootClientId = sel.getBlockRootClientId(clientId);
  const index = sel.getBlockIndex(clientId);
  blockEditorDispatch().insertBlocks(finalBlocks as unknown[], index + 1, rootClientId);

  return finalBlocks.map((b) => b.clientId);
};

/**
 * Generate AI text and write it into the block(s), then store the params and
 * all resulting clientIds so the user can regenerate without opening the modal.
 */
export const streamIntoBlock = async ({
  clientId,
  blockName,
  prompt,
  keywords,
  length,
  service,
  replaceClientIds,
  append,
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

    // Three modes:
    // - Regenerate (replaceClientIds set): replace the previous output set.
    //   Append is ignored here — Regenerate always replaces its own output.
    // - Append (first generation, append=true): insert after the target block,
    //   leaving it intact.
    // - Replace (first generation, default): replace the target block.
    const isRegenerate = !!replaceClientIds && replaceClientIds.length > 0;
    let newClientIds: string[];
    let replacedIds: string[] = [];

    if (isRegenerate) {
      replacedIds = replaceClientIds as string[];
      newClientIds = replaceWithParsedBlocks(replacedIds, markdown);
    } else if (append) {
      newClientIds = appendAfterBlock(clientId, markdown);
    } else {
      replacedIds = [clientId];
      newClientIds = replaceWithParsedBlocks(replacedIds, markdown);
    }

    const firstClientId = newClientIds[0];

    // Store params + all new clientIds against the first block so Regenerate
    // can find and atomically replace all of them next time.
    const stored: GenerationParams = {
      prompt,
      keywords,
      length,
      service,
      blockName,
      generatedClientIds: newClientIds,
    };
    storeGenerationParams(firstClientId, stored);

    // Clear stale entries for any replaced blocks that are no longer the key.
    for (const oldId of replacedIds) {
      if (oldId !== firstClientId) {
        clearGenerationParams(oldId);
      }
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
 * Re-run generation for a block using the params from the most recent Generate
 * From Prompt call. No modal is shown. All blocks produced by the previous
 * generation are replaced atomically so nothing lingers.
 */
export const regenerateBlock = async (clientId: string): Promise<void> => {
  const params = getGenerationParams(clientId);
  if (!params) {
    console.warn('[Filter AI] regenerateBlock: no stored params for clientId', clientId);
    return;
  }
  await streamIntoBlock({
    clientId,
    ...params,
    replaceClientIds: params.generatedClientIds,
  });
};
