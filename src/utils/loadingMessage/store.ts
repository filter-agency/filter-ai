import { useSelect, register, createReduxStore, dispatch } from '@wordpress/data';

const storeName = 'filter-ai/loading-message-store';

type State = {
  loadingMessage: string;
};

type Action = {
  type: 'setLoadingMessage';
  payload: State['loadingMessage'];
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setLoadingMessage':
        return {
          ...state,
          loadingMessage: action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setLoadingMessage: (newLoadingMessage: State['loadingMessage']): Action => {
      return {
        type: 'setLoadingMessage',
        payload: newLoadingMessage,
      };
    },
  },
  selectors: {
    getLoadingMessage: (state: State) => state?.loadingMessage,
  },
});

register(store);

export const useLoadingMessage = (dependencies = []) =>
  useSelect((select) => select(store).getLoadingMessage(), dependencies);

export const showLoadingMessage = (loadingMessage: State['loadingMessage']) => {
  dispatch(store).setLoadingMessage(loadingMessage);
};

export const hideLoadingMessage = () => {
  dispatch(store).setLoadingMessage('');
};
