import { showNotice } from '@/utils';
import { Button, FlexItem, Panel, PanelBody, PanelHeader } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const { store: aiSettingsStore } = window.aiServices.settings;
const { ApiKeyControl } = window.aiServices.components;

type Service = {
  slug: string;
};

const Control = ({ service }: { service: Service }) => {
  const apiKey = useSelect((select) => {
    // @ts-expect-error
    const { getApiKey } = select(aiSettingsStore) || {};
    return getApiKey?.(service.slug);
  }, []);

  const { setApiKey } = useDispatch(aiSettingsStore);

  // The callback receives the service slug as second parameter.
  const onChangeApiKey = useCallback(
    (newApiKey: string, serviceSlug: string) => setApiKey(serviceSlug, newApiKey),
    [setApiKey]
  );

  return <ApiKeyControl service={service} apiKey={apiKey} onChangeApiKey={onChangeApiKey} />;
};

const APIKeys = () => {
  const services: Record<string, Service> = useSelect((select) => {
    // @ts-expect-error
    const { getServices } = select(aiSettingsStore) || {};
    return getServices?.() || {};
  }, []);

  const { saveSettings } = useDispatch(aiSettingsStore);

  const saveChanges = () => {
    saveSettings()
      .then(() => {
        showNotice({
          title: __('Changes saved!', 'filter-ai'),
          message: __('Your changes have been saved, you can now exit this screen.', 'filter-ai'),
        });
      })
      .catch(() => {
        showNotice({ message: __('There has been an issue saving your changes.', 'filter-ai'), type: 'error' });
      });
  };

  return (
    <>
      <Panel className="filter-ai-settings-panel">
        <PanelHeader>
          <h2>{__('API Keys', 'filter-ai')}</h2>
        </PanelHeader>
        {Object.values(services).map((service) => (
          <PanelBody>
            <Control key={service.slug} service={service} />
          </PanelBody>
        ))}
      </Panel>
      <FlexItem>
        <Button onClick={saveChanges} variant="primary">
          {__('Save Changes', 'filter-ai')}
        </Button>
      </FlexItem>
    </>
  );
};

export default APIKeys;
