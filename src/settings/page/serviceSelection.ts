import { FilterAISettings } from '../useSettings';

export const selectServiceOption = (
  currentSlug: FilterAISettings[keyof FilterAISettings],
  nextSlug: string,
  serviceKey: keyof FilterAISettings,
  onChange: (key: keyof FilterAISettings, value: FilterAISettings[keyof FilterAISettings]) => void,
  onClose: () => void
) => {
  onChange(serviceKey, currentSlug !== nextSlug ? nextSlug : '');
  onClose();
};
