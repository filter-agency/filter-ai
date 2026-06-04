import { createReduxStore, dispatch, register, useSelect, resolveSelect } from '@wordpress/data';

const storeName = 'filter-ai/generate-content-modal-store';

export type GenerateContentSubmit = (args: {
  prompt: string;
  keywords: string[];
  length: string;
  append: boolean;
}) => void;

type State = {
  visible: boolean;
  blockName?: string;
  defaultPrompt?: string;
  defaultKeywords?: string[];
  defaultLength?: string;
  onSubmit?: GenerateContentSubmit;
};

type Action = {
  type: 'setGenerateContentModal';
  payload: Partial<State>;
};

const store = createReduxStore(storeName, {
  reducer: (state: State, action: Action) => {
    switch (action.type) {
      case 'setGenerateContentModal':
        return {
          ...state,
          ...action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setGenerateContentModal: (newState: Partial<State>): Action => ({
      type: 'setGenerateContentModal',
      payload: newState,
    }),
  },
  selectors: {
    getGenerateContentModal: (state: State) => state || {},
  },
});

if (!resolveSelect(store)) {
  register(store);
}

export const useGenerateContentModal = (dependencies: unknown[] = []) =>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useSelect((selectFn) => selectFn(store).getGenerateContentModal(), dependencies);

export const hideGenerateContentModal = () => {
  dispatch(store).setGenerateContentModal({
    visible: false,
    blockName: '',
    defaultPrompt: '',
    defaultKeywords: [],
    defaultLength: '',
    onSubmit: undefined,
  });
};

export const showGenerateContentModal = (args: {
  blockName?: string;
  defaultPrompt?: string;
  defaultKeywords?: string[];
  defaultLength?: string;
  onSubmit: GenerateContentSubmit;
}) => {
  dispatch(store).setGenerateContentModal({ ...args, visible: true });
};
