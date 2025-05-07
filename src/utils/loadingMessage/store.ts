import { useSelect } from '@wordpress/data';

const { register, createReduxStore, dispatch } = window.wp?.data || {};

const storeName = 'filter-ai/loading-message-store';

type State = {
  loadingMessage: string;
};

type Action = {
  type: 'setLoadingMessage';
  payload: string;
};

const store = createReduxStore(storeName, {
  reducer: (state: { loadingMessage: '' }, action: Action) => {
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
    setLoadingMessage: (newLoadingMessage: string): Action => {
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
  // @ts-expect-error Property 'getLoadingMessage' does not exist on type '{}'
  useSelect((select) => select(store).getLoadingMessage(), dependencies);

export const showLoadingMessage = (loadingMessage: string) => {
  dispatch(store).setLoadingMessage(loadingMessage);
};

export const hideLoadingMessage = () => {
  dispatch(store).setLoadingMessage('');
};
