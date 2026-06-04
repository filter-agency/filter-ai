import { createReduxStore, dispatch, register, useSelect, select } from '@wordpress/data';

const storeName = 'filter-ai/generate-params-store';

/**
 * Generation params stored per block. Named GenerationParams (not GenerationParams)
 * to avoid confusion with the GenerationParams type in streamIntoBlock.ts, which
 * additionally includes `clientId`.
 */
export type GenerationParams = {
  prompt: string;
  keywords: string[];
  length: string;
  service?: string;
  blockName: string;
  /**
   * All clientIds produced by the last generation (first + any siblings from a
   * multi-block result). Stored so that Regenerate can replace the entire
   * previous generation — not just the first block — via replaceBlocks().
   */
  generatedClientIds: string[];
};

type State = Record<string, GenerationParams>; // clientId → params

type Action =
  | { type: 'STORE_PARAMS'; clientId: string; params: GenerationParams }
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
    storeParams: (clientId: string, params: GenerationParams): Action => ({
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
    getParams: (state: State, clientId: string): GenerationParams | undefined => state[clientId],
  },
});

// Guard against double-registration in HMR / multi-import scenarios.
// `select(storeName)` returns undefined when the store hasn't been registered yet.
if (!select(storeName)) {
  register(store);
}

/** Store generation params for a block after a successful generation. */
export const storeGenerationParams = (clientId: string, params: GenerationParams): void => {
  dispatch(store).storeParams(clientId, params);
};

/** Remove stored params for a block (e.g. when the original block is replaced). */
export const clearGenerationParams = (clientId: string): void => {
  dispatch(store).clearParams(clientId);
};

// Narrow selector type derived from the selectors object — avoids repeated inline casts.
type ParamsSelectors = { getParams: (clientId: string) => GenerationParams | undefined };

/** Read params for a block directly (non-reactive, for use in async functions). */
export const getGenerationParams = (clientId: string): GenerationParams | undefined =>
  (select(store) as unknown as ParamsSelectors).getParams(clientId);

/**
 * React hook — returns params for the given clientId, or undefined if none stored.
 * Re-renders the component whenever the stored params for this clientId change.
 */
export const useGenerationParams = (clientId: string | undefined): GenerationParams | undefined =>
  useSelect(
    (selectFn) => {
      if (!clientId) return undefined;
      return (selectFn(store) as unknown as ParamsSelectors).getParams(clientId);
    },
    [clientId]
  );
