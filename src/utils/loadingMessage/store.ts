import { useSelect, register, createReduxStore, dispatch } from '@wordpress/data';

const storeName = 'filter-ai/loading-message-store';

type State = {
  label: string;
  type: 'generating' | 'summarising' | 'customising' | 'uploading';
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

register(store);

export const useLoadingMessage = (dependencies = []) =>
  useSelect((select) => select(store).getLoadingMessage(), dependencies);

export const showLoadingMessage = (label: State['label'], type: State['type'] = 'generating') => {
  dispatch(store).setLoadingMessage({ label, type });
};

export const hideLoadingMessage = () => {
  dispatch(store).setLoadingMessage({});
};
