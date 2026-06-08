# Inline Regenerate Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Regenerate" option to the F-icon block toolbar dropdown and block inspector sidebar dropdown that re-runs the last Generate From Prompt generation without reopening the modal.

**Architecture:** A new Redux store (`paramsStore.ts`) maps `clientId → StreamArgs` in memory. After every successful generation `streamIntoBlock` stores the params against the first resulting block's `clientId`. Both toolbar locations check the store reactively via `useGenerationParams(clientId)` and render the Regenerate item only when params are present. `regenerateBlock(clientId)` reads from the store and calls `streamIntoBlock` directly.

**Tech Stack:** TypeScript, `@wordpress/data` (createReduxStore), React hooks (`useSelect`), existing `streamIntoBlock` + overlay infrastructure.

---

## File Map

| File                                                 | Action                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/utils/generateContentModal/paramsStore.ts`      | **Create** — Redux store + helpers + hook                                                                       |
| `src/blockToolbar/textToolbar/streamIntoBlock.ts`    | **Modify** — `replaceWithParsedBlocks` returns firstClientId; store params on success; export `regenerateBlock` |
| `src/blockToolbar/textToolbar/index.tsx`             | **Modify** — add Regenerate MenuItem to Generate MenuGroup                                                      |
| `src/blockInspectorButton/index.tsx`                 | **Modify** — add Regenerate control to DropdownMenu                                                             |
| `src/utils/generateContentModal/paramsStore.test.ts` | **Create** — Jest unit tests for the store                                                                      |

---

### Task 1: Create `paramsStore.ts` with tests

**Files:**

- Create: `src/utils/generateContentModal/paramsStore.ts`
- Create: `src/utils/generateContentModal/paramsStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/generateContentModal/paramsStore.test.ts`:

```ts
import { storeGenerationParams, clearGenerationParams } from './paramsStore';
import { select } from '@wordpress/data';

// The store registers itself on import. Re-import triggers registration.
jest.mock('@wordpress/data', () => {
  const actual = jest.requireActual('@wordpress/data');
  return actual;
});

const PARAMS = {
  prompt: 'Why slow living matters',
  keywords: ['calm', 'intention'],
  length: '80 words',
  service: 'anthropic',
  blockName: 'core/paragraph',
};

describe('paramsStore', () => {
  it('returns undefined for an unknown clientId', () => {
    const { getGenerationParams } = require('./paramsStore');
    expect(getGenerationParams('unknown-id')).toBeUndefined();
  });

  it('round-trips params via store and clear', () => {
    const { getGenerationParams } = require('./paramsStore');
    storeGenerationParams('abc-123', PARAMS);
    expect(getGenerationParams('abc-123')).toEqual(PARAMS);
    clearGenerationParams('abc-123');
    expect(getGenerationParams('abc-123')).toBeUndefined();
  });

  it('stores multiple clientIds independently', () => {
    const { getGenerationParams } = require('./paramsStore');
    storeGenerationParams('block-1', { ...PARAMS, prompt: 'first' });
    storeGenerationParams('block-2', { ...PARAMS, prompt: 'second' });
    expect(getGenerationParams('block-1')?.prompt).toBe('first');
    expect(getGenerationParams('block-2')?.prompt).toBe('second');
  });

  it('clearGenerationParams on unknown id is a no-op', () => {
    expect(() => clearGenerationParams('does-not-exist')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:js -- --testPathPattern paramsStore
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `paramsStore.ts`**

Create `src/utils/generateContentModal/paramsStore.ts`:

```ts
import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/generate-params-store';

export type StreamArgs = {
  prompt: string;
  keywords: string[];
  length: string;
  service?: string;
  blockName: string;
};

type State = Record<string, StreamArgs>; // clientId → params

type Action =
  | { type: 'STORE_PARAMS'; clientId: string; params: StreamArgs }
  | { type: 'CLEAR_PARAMS'; clientId: string };

const store = createReduxStore(storeName, {
  reducer: (state: State = {}, action: Action): State => {
    switch (action.type) {
      case 'STORE_PARAMS':
        return { ...state, [action.clientId]: action.params };
      case 'CLEAR_PARAMS': {
        const next = { ...state };
        delete next[action.clientId];
        return next;
      }
      default:
        return state;
    }
  },
  actions: {
    storeParams: (clientId: string, params: StreamArgs): Action => ({
      type: 'STORE_PARAMS',
      clientId,
      params,
    }),
    clearParams: (clientId: string): Action => ({
      type: 'CLEAR_PARAMS',
      clientId,
    }),
  },
  selectors: {
    getParams: (state: State, clientId: string): StreamArgs | undefined => state[clientId],
  },
});

if (!resolveSelect(store)) {
  register(store);
}

/** Store generation params for a block after a successful generation. */
export const storeGenerationParams = (clientId: string, params: StreamArgs): void => {
  dispatch(store).storeParams(clientId, params);
};

/** Remove stored params for a block (e.g. when the original block is replaced). */
export const clearGenerationParams = (clientId: string): void => {
  dispatch(store).clearParams(clientId);
};

/** Read params for a block directly (non-reactive, for use in async functions). */
export const getGenerationParams = (clientId: string): StreamArgs | undefined =>
  (select(store) as { getParams: (id: string) => StreamArgs | undefined }).getParams(clientId);

/**
 * React hook — returns params for the given clientId, or undefined if none stored.
 * Re-renders the component whenever the stored params for this clientId change.
 */
export const useGenerationParams = (clientId: string | undefined): StreamArgs | undefined =>
  useSelect(
    (selectFn) => {
      if (!clientId) return undefined;
      return (selectFn(store) as { getParams: (id: string) => StreamArgs | undefined }).getParams(clientId);
    },
    [clientId]
  );
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:js -- --testPathPattern paramsStore
```

Expected: 4 tests pass.

> **Note:** `getGenerationParams` (the sync non-reactive helper used in `regenerateBlock`) needs access to the wp.data registry. The tests cover the store's state transitions via `storeGenerationParams` / `clearGenerationParams` / `getGenerationParams`. If `wp.data` isn't available in the Jest environment, mock it — the observable behaviour (store/clear round-trip) is what matters.

- [ ] **Step 5: Commit**

```bash
git add src/utils/generateContentModal/paramsStore.ts src/utils/generateContentModal/paramsStore.test.ts
git commit -m "feat: add generation params Redux store for inline regenerate"
```

---

### Task 2: Update `streamIntoBlock.ts` — return firstClientId, store params, export `regenerateBlock`

**Files:**

- Modify: `src/blockToolbar/textToolbar/streamIntoBlock.ts`

- [ ] **Step 1: Replace the file contents**

Replace `src/blockToolbar/textToolbar/streamIntoBlock.ts` with:

````ts
import { dispatch, select } from '@wordpress/data';
import { pasteHandler } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { showNotice, showLoadingMessage, hideLoadingMessage } from '@/utils';
import { generateTextStream } from '@/utils/ai/services/generateText';
import {
  storeGenerationParams,
  clearGenerationParams,
  getGenerationParams,
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

const blockEditorSelect = () =>
  select('core/block-editor') as unknown as {
    getBlocks: () => Array<{ clientId: string; name: string }>;
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
    storeGenerationParams(firstClientId, { prompt, keywords, length, service, blockName });

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
````

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: compiled with 2 warnings (pre-existing webpack size warnings only).

- [ ] **Step 4: Commit**

```bash
git add src/blockToolbar/textToolbar/streamIntoBlock.ts
git commit -m "feat: streamIntoBlock returns firstClientId, stores params, exports regenerateBlock"
```

---

### Task 3: Add "Regenerate" to the block toolbar F-icon dropdown

**Files:**

- Modify: `src/blockToolbar/textToolbar/index.tsx`

The `MenuGroup` that wraps "Generate From Prompt" is at around line 436–447 of the current file. Add "Regenerate" as a second `MenuItem` in that group, visible only when `regenerateParams` is set.

- [ ] **Step 1: Add imports at the top of `index.tsx`**

Find the existing import line:

```ts
import { showGenerateContentModal } from '@/utils/generateContentModal';
import { streamIntoBlock } from './streamIntoBlock';
```

Replace with:

```ts
import { showGenerateContentModal } from '@/utils/generateContentModal';
import { streamIntoBlock, regenerateBlock } from './streamIntoBlock';
import { useGenerationParams } from '@/utils/generateContentModal/paramsStore';
```

- [ ] **Step 2: Add `useGenerationParams` hook call**

Inside `TextToolbar`, right after the `generateContentService` line (around line 86 of the current file):

```ts
const generateContentService = useService('generate_content_prompt_service');
```

Add:

```ts
const regenerateParams = useGenerationParams(clientId);
```

- [ ] **Step 3: Add the Regenerate MenuItem**

Find the existing MenuGroup:

```tsx
{
  settings?.generate_content_enabled && (
    <MenuGroup>
      <MenuItem
        onClick={() => {
          onClose();
          onGenerateFromPrompt();
        }}
      >
        {__('Generate From Prompt', 'filter-ai')}
      </MenuItem>
    </MenuGroup>
  );
}
```

Replace with:

```tsx
{
  settings?.generate_content_enabled && (
    <MenuGroup>
      <MenuItem
        onClick={() => {
          onClose();
          onGenerateFromPrompt();
        }}
      >
        {__('Generate From Prompt', 'filter-ai')}
      </MenuItem>
      {regenerateParams && (
        <MenuItem
          onClick={() => {
            onClose();
            regenerateBlock(clientId);
          }}
        >
          {__('Regenerate', 'filter-ai')}
        </MenuItem>
      )}
    </MenuGroup>
  );
}
```

- [ ] **Step 4: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: clean typecheck, build with 2 pre-existing warnings only.

- [ ] **Step 5: Commit**

```bash
git add src/blockToolbar/textToolbar/index.tsx
git commit -m "feat: add Regenerate item to block toolbar F-icon dropdown"
```

---

### Task 4: Add "Regenerate" to the block inspector sidebar dropdown

**Files:**

- Modify: `src/blockInspectorButton/index.tsx`

- [ ] **Step 1: Add imports**

Find:

```ts
import { showGenerateContentModal } from '@/utils/generateContentModal';
import { streamIntoBlock } from '@/blockToolbar/textToolbar/streamIntoBlock';
```

Replace with:

```ts
import { showGenerateContentModal } from '@/utils/generateContentModal';
import { streamIntoBlock, regenerateBlock } from '@/blockToolbar/textToolbar/streamIntoBlock';
import { useGenerationParams } from '@/utils/generateContentModal/paramsStore';
```

- [ ] **Step 2: Add hook + conditional control**

Find inside `BlockInspectorButton`:

```ts
const service = useService('generate_content_prompt_service');
```

Add after it:

```ts
const regenerateParams = useGenerationParams(selected?.clientId);
```

Find the `return` statement:

```tsx
return (
  <DropdownMenu
    toggleProps={{ className: 'is-small' }}
    controls={[
      {
        title: __('Generate From Prompt', 'filter-ai'),
        onClick: open,
      },
    ]}
  />
);
```

Replace with:

```tsx
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
```

- [ ] **Step 3: Typecheck + build**

```bash
npm run typecheck && npm run build
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/blockInspectorButton/index.tsx
git commit -m "feat: add Regenerate control to block inspector sidebar dropdown"
```

---

### Task 5: Full test sweep + manual verification

- [ ] **Step 1: Run all tests**

```bash
composer test-php && npm run test:js
```

Expected:

- PHPUnit: 20 tests, 27 assertions, OK
- Jest: all test suites pass (including the new paramsStore tests)

- [ ] **Step 2: Typecheck + build clean**

```bash
composer check-cs && npm run typecheck && npm run build
```

Expected: all clean.

- [ ] **Step 3: Manual verification on 8889 (legacy — ai-services)**

1. Open `http://localhost:8889/wp-admin/post-new.php`, create a post, add a paragraph block.
2. Click the F icon (or use the block inspector sidebar F icon) → **Generate From Prompt**.
3. Enter prompt: _"Why slow living matters"_, keywords: _calm, intention_, length: _80 words_. Click **Generate**.
4. Blue overlay appears; after generation completes, a mix of heading/paragraph/list blocks appears.
5. Click the **first** resulting block to select it.
6. Open the F-icon dropdown → confirm **"Regenerate"** appears below "Generate From Prompt".
7. Open the block inspector sidebar F icon → confirm **"Regenerate"** appears as a second control.
8. Click **"Regenerate"** (from either location) → blue overlay appears immediately (no modal) → new content replaces the blocks.
9. Select a block that was **not** generated by Filter AI → confirm "Regenerate" does **not** appear.
10. Select the second or third block from the generated set (not the first) → confirm "Regenerate" does **not** appear on it.

- [ ] **Step 4: Manual verification on 8888 (WP 7.0 native)**

Same flow as Step 3. Generation is one-shot (no progressive streaming) but the overlay + structured output + Regenerate button should all behave identically.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: inline regenerate control — Regenerate appears after Generate From Prompt"
```
