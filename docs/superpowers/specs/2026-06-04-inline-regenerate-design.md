# Inline Regenerate Control — Design Spec

**Date:** 2026-06-04  
**Feature:** Inline regeneration for Generate From Prompt  
**Branch:** feature/wp7-native-ai-client

---

## Overview

After AI generates content into a block via "Generate From Prompt", the user should be able to re-run the same generation without reopening the modal. A "Regenerate" option appears in both the block toolbar F-icon dropdown and the block inspector sidebar dropdown, but only on the block(s) that were produced by the most recent generation.

Storage is in-memory (Redux store, ephemeral per session). Loss on page reload is acceptable — "Generate From Prompt" is always the persistent fallback.

---

## Scope

### In scope

- Store last-used generation params `{ prompt, keywords, length, service, blockName }` against the first resulting block's `clientId` after a successful generation
- Show a "Regenerate" menu item in the **block toolbar F-icon dropdown** (paragraph / heading / list-item) when params exist for the active block
- Show a "Regenerate" control in the **block inspector sidebar dropdown** (`blockInspectorButton`) when params exist for the selected block
- Clicking "Regenerate" in either location runs generation immediately (no modal) using stored params, showing the same blue overlay and producing the same structured block output

### Out of scope

- Persistence across page reloads
- Regenerate on blocks other than the first result of a multi-block replace
- "Undo last generation" / diff view

---

## Data Storage — `paramsStore.ts`

**File:** `src/utils/generateContentModal/paramsStore.ts`  
**Store name:** `filter-ai/generate-params-store`

**State shape:**

```ts
type ParamsMap = Record<string, StreamArgs>; // clientId → params
```

Where `StreamArgs` is the existing type from `streamIntoBlock.ts`:

```ts
{
  prompt, keywords, length, service, blockName;
}
```

**Exports:**

- `storeGenerationParams(clientId: string, params: StreamArgs): void` — writes to store after successful generation
- `clearGenerationParams(clientId: string): void` — removes a stale entry (called for the old clientId when replaceBlock produces new blocks)
- `useGenerationParams(clientId: string): StreamArgs | undefined` — React hook; returns params if the block has stored state, `undefined` otherwise

No React component is mounted — this is a pure data store.

---

## Changes to `streamIntoBlock.ts`

1. `replaceWithParsedBlocks` changes return type from `void` to `string` — returning the first resulting block's `clientId`:

   - Multi-block result: `blocks[0].clientId` from the `pasteHandler` array (blocks are created with clientIds by Gutenberg)
   - Single-block fallback (plain text written via `updateBlockAttributes`): original `clientId`

2. `streamIntoBlock` captures the returned `clientId` and on success calls:

   ```ts
   storeGenerationParams(firstClientId, { prompt, keywords, length, service, blockName });
   if (firstClientId !== clientId) clearGenerationParams(clientId); // remove old entry
   ```

3. New export `regenerateBlock(clientId: string): Promise<void>` — reads params from store, calls `streamIntoBlock` with them. Used by both toolbar locations.

---

## Changes to `textToolbar/index.tsx`

- Import `useGenerationParams` and `regenerateBlock`
- Call `useGenerationParams(clientId)` at component top level
- In the existing `MenuGroup` containing "Generate From Prompt", add a second `MenuItem`:

```tsx
{
  settings?.generate_content_enabled && regenerateParams && (
    <MenuItem
      onClick={() => {
        onClose();
        regenerateBlock(clientId);
      }}
    >
      {__('Regenerate', 'filter-ai')}
    </MenuItem>
  );
}
```

The item sits directly below "Generate From Prompt" in the same group — no extra divider needed.

---

## Changes to `blockInspectorButton/index.tsx`

- Import `useGenerationParams` and `regenerateBlock`
- Call `useGenerationParams(selected.clientId)` inside `BlockInspectorButton`
- Conditionally push a second control into the `controls` array:

```ts
const controls = [
  { title: __('Generate From Prompt', 'filter-ai'), onClick: open },
  ...(regenerateParams
    ? [{ title: __('Regenerate', 'filter-ai'), onClick: () => regenerateBlock(selected.clientId) }]
    : []),
];
```

---

## Data Flow

```
User clicks "Generate From Prompt"
  → modal opens → user fills prompt/keywords/length → clicks Generate
  → streamIntoBlock({ clientId, blockName, prompt, keywords, length, service })
  → blue overlay shown
  → generateTextStream resolves
  → replaceWithParsedBlocks → returns firstClientId
  → storeGenerationParams(firstClientId, params)
  → overlay hidden, blocks appear in editor

User selects the first resulting block
  → TextToolbar renders: useGenerationParams(clientId) → returns params
  → "Regenerate" appears in F-icon dropdown and sidebar dropdown

User clicks "Regenerate"
  → regenerateBlock(clientId)
    → reads params from store
    → calls streamIntoBlock with same params
  → same overlay, same structured output, same storeGenerationParams call after
```

---

## Error Handling

- If `regenerateBlock` is called with a `clientId` that has no stored params (edge case — user could theoretically call it before params are set), it logs a warning and returns without showing the overlay
- Generation errors follow the existing `showNotice` error path in `streamIntoBlock`
- The "Regenerate" entry never appears if `generate_content_enabled` is false

---

## Testing

- `useGenerationParams` returns `undefined` for an unknown `clientId`
- `storeGenerationParams` then `useGenerationParams` round-trips the params correctly
- `clearGenerationParams` removes the entry
- `replaceWithParsedBlocks` returns the first new block's `clientId` on multi-block output and the original `clientId` on single-block / plain-text fallback

No new PHP tests required — this is entirely JS-side.

---

## Files Changed

| File                                              | Change                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/utils/generateContentModal/paramsStore.ts`   | **New**                                                                 |
| `src/blockToolbar/textToolbar/streamIntoBlock.ts` | Modified — return firstClientId, store params, export `regenerateBlock` |
| `src/blockToolbar/textToolbar/index.tsx`          | Modified — add Regenerate menu item                                     |
| `src/blockInspectorButton/index.tsx`              | Modified — add Regenerate control                                       |
