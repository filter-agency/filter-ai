// @ts-expect-error Property 'aiServices' does not exist on type 'Window & typeof globalThis'.
const { enums, store, helpers } = window.aiServices.ai;

export const ai = {
  enums,
  store,
  helpers,
};
