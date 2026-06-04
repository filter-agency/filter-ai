import { createReduxStore, dispatch, register, useSelect, resolveSelect, select } from '@wordpress/data';

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
