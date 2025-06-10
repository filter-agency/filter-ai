import { createReduxStore, dispatch, register, useSelect } from '@wordpress/data';

const storeName = 'filter-ai/options-modal-store';

type State = {
  options: string[];
  choice: string;
  title: string;
};

type Action = {
  type: 'setOptionsModal';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setOptionsModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setOptionsModal: (newState: Partial<State>): Action => {
      return {
        type: 'setOptionsModal',
        payload: newState,
      };
    },
  },
  selectors: {
    getOptionsModal: (state: State) => state || {},
  },
});

register(store);

export const useOptionsModal = (dependencies = []) =>
  useSelect((select) => select(store).getOptionsModal(), dependencies);

export const hideOptionsModal = () => {
  dispatch(store).setOptionsModal({ options: [] });
};

export const setOptionsModal = (newState: Partial<State>) => {
  dispatch(store).setOptionsModal(newState);
};

export const resetOptionsModal = () => {
  dispatch(store).setOptionsModal({ title: '', choice: '', options: [] });
};
