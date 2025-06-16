import { createReduxStore, dispatch, register, useSelect } from '@wordpress/data';

const storeName = 'filter-ai/seo-title-options-modal-store';

type State = {
  options: string[];
  choice: string;
};

type Action = {
  type: 'setSeoTitleOptionsModal';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setSeoTitleOptionsModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setSeoTitleOptionsModal: (newState: Partial<State>): Action => {
      return {
        type: 'setSeoTitleOptionsModal',
        payload: newState,
      };
    },
  },
  selectors: {
    getOptionsModal: (state: State) => state || {},
  },
});

register(store);

export const useSeoTitleOptionsModal = (dependencies = []) =>
  useSelect((select) => select(store).getOptionsModal(), dependencies);

export const hideSeoTitleOptionsModal = () => {
  dispatch(store).setSeoTitleOptionsModal({ options: [] });
};

export const setSeoTitleOptionsModal = (newState: Partial<State>) => {
  dispatch(store).setSeoTitleOptionsModal(newState);
};

export const resetSeoTitleOptionsModal = () => {
  dispatch(store).setSeoTitleOptionsModal({ choice: '', options: [] });
};
