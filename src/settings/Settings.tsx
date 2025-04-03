import { ai, showNotice, t } from '@/utils';
import { ToggleControl, Panel, PanelRow, PanelBody, TextareaControl, Button } from '@wordpress/components';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from './useSettings';
import _ from 'underscore';

const Settings = () => {
  const [formData, setFormData] = useState<FilterAISettings>({});

  const { settings, isLoading, saveSettings } = useSettings();

  const isMatch = useMemo(() => {
    return _.isMatch(formData, settings);
  }, [formData, settings]);

  const saveChanges = () => {
    saveSettings(formData)
      .then(() => {
        showNotice(t('Settings have been updated.'));
      })
      .catch(() => {
        showNotice(t('There has been an issue saving your changes.'));
      });
  };

  const onChange = (key: keyof FilterAISettings, value: FilterAISettings[keyof FilterAISettings]) => {
    setFormData((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (!isMatch) {
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    const abortController = new AbortController();

    window.addEventListener(
      'beforeunload',
      (e) => {
        if (!isMatch) {
          e.preventDefault();
        }
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, [isMatch]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Panel header="Image alt text" className="filter-ai-settings">
        <PanelBody>
          <PanelRow>
            {t('Generate descriptive text about the selected image for use as the alternative text.')}
          </PanelRow>
          <PanelRow>
            <ToggleControl
              __nextHasNoMarginBottom
              label={t('Enable feature')}
              onChange={(newValue) => {
                onChange('image_alt_text_enabled', newValue);
              }}
              checked={formData?.image_alt_text_enabled}
            />
          </PanelRow>
          <PanelRow>
            <div style={{ flex: 1 }}>
              <TextareaControl
                __nextHasNoMarginBottom
                label={t('Custom Prompt')}
                value={formData?.image_alt_text_prompt || ''}
                placeholder={ai.prompts.image.altText}
                onChange={(newValue) => {
                  onChange('image_alt_text_prompt', newValue);
                }}
                disabled={!formData?.image_alt_text_enabled}
              />
            </div>
          </PanelRow>
        </PanelBody>
      </Panel>
      <Button onClick={saveChanges} variant="primary">
        {t('Save Changes')}
      </Button>
    </>
  );
};

(function () {
  const container = document.getElementById('filter-ai-settings-container');

  if (!container) {
    return;
  }

  const root = createRoot(container);

  root.render(<Settings />);
})();
