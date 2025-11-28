import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/grammar-check-modal-store';

type State = {
  originalText: string;
  correctedText: string;
  choice: string;
  context?: {
    content: any;
    hasSelection: boolean;
    selectionStart: any;
    selectionEnd: any;
    serviceName?: string;
  };
};

type Action = {
  type: 'setGrammarCheckModal';
  payload: Partial<State>;
};

const defaultState: State = {
  originalText: '',
  correctedText: '',
  choice: '',
  context: undefined,
};

const store = createReduxStore(storeName, {
  reducer: (state: State = defaultState, action: Action) => {
    switch (action.type) {
      case 'setGrammarCheckModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setGrammarCheckModal: (newState: Partial<State>): Action => {
      return {
        type: 'setGrammarCheckModal',
        payload: newState,
      };
    },
  },
  selectors: {
    getGrammarCheckModal: (state: State) => state || defaultState,
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useGrammarCheckModal = (dependencies = []) =>
  useSelect((select) => select(store).getGrammarCheckModal(), dependencies);

export const setGrammarCheckModal = (newState: Partial<State>) => {
  dispatch(store).setGrammarCheckModal(newState);
};

export const showGrammarCheckModal = (newState: Partial<State>) => {
  dispatch(store).setGrammarCheckModal({
    ...newState,
    choice: '',
  });
};

export const hideGrammarCheckModal = () => {
  dispatch(store).setGrammarCheckModal({
    originalText: '',
    correctedText: '',
  });
};

export const resetGrammarCheckModal = () => {
  dispatch(store).setGrammarCheckModal({
    originalText: '',
    correctedText: '',
    choice: '',
    context: undefined,
  });
};
