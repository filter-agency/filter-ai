import { useSelect } from '@wordpress/data';

const { register, createReduxStore, dispatch } = window.wp.data;

const storeName = 'filter-ai/notice-store';

type Notice = {
  message: string;
  title?: string;
  type?: 'error' | 'notice';
};

type State = {
  notice: Notice;
};

type Action = {
  type: 'setNotice';
  payload: Notice;
};

const store = createReduxStore(storeName, {
  reducer: (state: { notice: '' }, action: Action) => {
    switch (action.type) {
      case 'setNotice':
        return {
          ...state,
          notice: action.payload,
        };
      default:
        return state;
    }
  },
  actions: {
    setNotice: (newNotice: Notice): Action => {
      return {
        type: 'setNotice',
        payload: newNotice,
      };
    },
  },
  selectors: {
    getNotice: (state: State) => state?.notice,
  },
});

register(store);

// @ts-expect-error Property 'getNotice' does not exist on type '{}'
export const useNotice = (dependencies = []) => useSelect((select) => select(store).getNotice(), dependencies);

export const showNotice = ({ message, type = 'notice', title }: Notice) => {
  dispatch(store).setNotice({ message, type, title });
};

export const hideNotice = () => {
  dispatch(store).setNotice({ message: '' });
};
