import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/customise-text-options-modal-store';

type CustomiseType = 'text' | 'title' | 'excerpt' | 'tags';

type State = {
  options: string[];
  choice: string;
  type?: CustomiseType;
  context?: {
    content: any;
    hasSelection: boolean;
    selectionStart: any;
    selectionEnd: any;
    label: string;
    serviceName?: string;
    feature: string;
    text: string;
    prompt: string;
    service?: string;
  };
};

type Action = {
  type: 'setCustomiseTextOptionsModal';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setCustomiseTextOptionsModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setCustomiseTextOptionsModal: (newState: Partial<State>): Action => {
      return {
        type: 'setCustomiseTextOptionsModal',
        payload: newState,
      };
    },
  },
  selectors: {
    getOptionsModal: (state: State) => state || {},
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useCustomiseTextOptionsModal = (dependencies = []) =>
  useSelect((select) => select(store).getOptionsModal(), dependencies);

export const hideCustomiseTextOptionsModal = () => {
  dispatch(store).setCustomiseTextOptionsModal({ options: [] });
};

export const setCustomiseTextOptionsModal = (newState: Partial<State>) => {
  dispatch(store).setCustomiseTextOptionsModal(newState);
};

export const resetCustomiseTextOptionsModal = () => {
  dispatch(store).setCustomiseTextOptionsModal({ choice: '', options: [], context: undefined, type: undefined });
};
