import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/grammar-check-modal-store';

type State = {
  originalText: string;
  correctedText: string;
  isVisible: boolean;
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

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
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
    getGrammarCheckModal: (state: State) => state || {},
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useGrammarCheckModal = (dependencies = []) =>
  useSelect((select) => select(store).getGrammarCheckModal(), dependencies);

export const showGrammarCheckModal = (newState: Partial<State>) => {
  console.log('showGrammarCheckModal executed');

  dispatch(store).setGrammarCheckModal({ ...newState, isVisible: true });
};

export const hideGrammarCheckModal = () => {
  dispatch(store).setGrammarCheckModal({
    isVisible: false,
    originalText: '',
    correctedText: '',
    context: undefined,
  });
};

export const resetGrammarCheckModal = () => {
  dispatch(store).setGrammarCheckModal({
    originalText: '',
    correctedText: '',
    isVisible: false,
    context: undefined,
  });
};
