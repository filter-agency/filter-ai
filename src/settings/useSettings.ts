import { resolveSelect, useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export type FilterAISettings = Record<string, string | boolean>;

const settingsKey = 'filter_ai_settings';

export const useSettings = () => {
  const { settings } = useSelect((select) => {
    const { getEntityRecord } = select('core');

    // @ts-expect-error Property 'useEntityRecord' does not exist on type '{}'
    const record = getEntityRecord('root', 'site') || {};

    return {
      settings: record?.[settingsKey],
    };
  }, []);

  const { saveEntityRecord } = useDispatch('core');

  const saveSettings = async (newSettings: FilterAISettings) => {
    if (!newSettings) {
      return;
    }

    return saveEntityRecord('root', 'site', {
      [settingsKey]: newSettings,
    });
  };

  return { settings, saveSettings };
};

export const getSettings = async () => {
  const settings = (await resolveSelect('core').getEntityRecord('root', 'site'))?.filter_ai_settings;

  if (!settings) {
    throw new Error(__('There is was an issue retrieving the settings.', 'filter-ai'));
  }

  return settings;
};
