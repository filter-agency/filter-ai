import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/choice-modal-store';

type State = {
  visible: boolean;
  title?: string;
  description?: string;
  label?: string;
  options: string[];
  choice?: string;
  update?: (newValue: string) => Promise<void>;
  regenerate?: (options: string[]) => Promise<void>;
};

type Action = {
  type: 'setChoiceModal';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setChoiceModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setChoiceModal: (newState: Partial<State>): Action => {
      return {
        type: 'setChoiceModal',
        payload: newState,
      };
    },
  },
  selectors: {
    getChoiceModal: (state: State) => state || {},
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useChoiceModal = (dependencies = []) =>
  useSelect((select) => select(store).getChoiceModal(), dependencies);

export const hideChoiceModal = () => {
  dispatch(store).setChoiceModal({
    visible: false,
    title: '',
    description: '',
    label: '',
    options: [],
    choice: '',
    update: async () => {},
    regenerate: async () => {},
  });
};

export const showChoiceModal = (newState: Partial<State>) => {
  dispatch(store).setChoiceModal({ ...newState, visible: true });
};
