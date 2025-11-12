import { useSelect, register, createReduxStore, dispatch, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/loading-message-store';

type State = {
  label: string;
  type: 'generating' | 'summarising' | 'customising' | 'importing' | 'checking grammar';
};

type Action = {
  type: 'setLoadingMessage';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setLoadingMessage':
        return {
          ...state,
          type: 'generating',
          label: '',
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setLoadingMessage: (payload: Action['payload']): Action => {
      return {
        type: 'setLoadingMessage',
        payload,
      };
    },
  },
  selectors: {
    getLoadingMessage: (state: State) => state || {},
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useLoadingMessage = (dependencies = []) =>
  useSelect((select) => select(store).getLoadingMessage(), dependencies);

export const showLoadingMessage = (label: State['label'], type: State['type'] = 'generating') => {
  dispatch(store).setLoadingMessage({ label, type });
};

export const hideLoadingMessage = () => {
  dispatch(store).setLoadingMessage({});
};
