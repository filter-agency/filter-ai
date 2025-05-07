import { showNotice, t } from '@/utils';
import { Panel, PanelRow, PanelBody, TextareaControl, Button, FlexItem, FormToggle } from '@wordpress/components';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from './useSettings';
import _ from 'underscore';
import { sections } from './sections';
import { filterLogo } from '@/assets/filter-logo';
import { verticalDots } from '@/assets/vertical-dots';

type ShowButtonProps = {
  extraKey: string;
  extraValue: string;
  disabled?: boolean;
};

const Settings = () => {
  const [showExtra, setShowExtra] = useState<{ [key: string]: string }>(
    sections.reduce(
      (previous, current) => ({
        ...previous,
        [current.key]: '',
      }),
      {}
    )
  );
  const [formData, setFormData] = useState<FilterAISettings>({});

  const { settings, saveSettings } = useSettings();

  const isMatch = useMemo(() => {
    return _.isMatch(formData, settings);
  }, [formData, settings]);

  const saveChanges = () => {
    saveSettings(formData)
      .then(() => {
        showNotice({
          title: t('Changes saved!'),
          message: t('Your changes have been saved, you can now exit this screen.'),
        });
      })
      .catch(() => {
        showNotice({ message: t('There has been an issue saving your changes.'), type: 'error' });
      });
  };

  const onChange = (key: keyof FilterAISettings, value: FilterAISettings[keyof FilterAISettings]) => {
    setFormData((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  const ShowButton = ({ extraKey, extraValue, disabled }: ShowButtonProps) => {
    return (
      <Button
        icon={() => <img src={verticalDots} alt="" />}
        label={t('toggle more options')}
        disabled={disabled}
        onClick={() => {
          setShowExtra((prevState) => ({
            ...prevState,
            [extraKey]: showExtra[extraKey] !== extraValue ? extraValue : '',
          }));
        }}
        className="filter-ai-settings-toggle-options"
      />
    );
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

  return (
    <div className="filter-ai-settings">
      <header className="filter-ai-settings-header">
        <div className="filter-ai-settings-header-content">
          <div>
            <h1>{t('Filter AI Plugin Settings')}</h1>
            <p>Customise your settings for the Filter AI plugin here.</p>
          </div>
          <img src={filterLogo} alt={t('Filter AI logo')} />
        </div>
      </header>
      <div className="filter-ai-settings-content">
        {sections.map((section) => (
          <Panel header={section.header} className="filter-ai-settings-panel">
            {section.features.map((feature) => (
              <PanelBody>
                <PanelRow className="filter-ai-settings-field">
                  <div className="filter-ai-settings-field-text">
                    <label htmlFor={feature.toggle.key}>{feature.toggle.label}</label>
                    {feature.toggle.help && <div>{feature.toggle.help}</div>}
                  </div>
                  <FormToggle
                    onChange={() => {
                      onChange(feature.toggle.key, !formData?.[feature.toggle.key]);
                    }}
                    checked={!!formData?.[feature.toggle.key]}
                    id={feature.toggle.key}
                  />
                  <ShowButton
                    disabled={!formData?.[feature.toggle.key]}
                    extraKey={section.key}
                    extraValue={feature.key}
                  />
                </PanelRow>
                {showExtra[section.key] === feature.key && (
                  <PanelRow>
                    <div style={{ flex: 1 }}>
                      <TextareaControl
                        __nextHasNoMarginBottom
                        label={feature.prompt.label}
                        value={formData?.[feature.prompt.key]?.toString() || ''}
                        placeholder={feature.prompt.placeholder}
                        onChange={(newValue) => {
                          onChange(feature.prompt.key, newValue);
                        }}
                        disabled={!formData?.[feature.toggle.key]}
                      />
                    </div>
                  </PanelRow>
                )}
              </PanelBody>
            ))}
          </Panel>
        ))}

        <FlexItem>
          <Button onClick={saveChanges} variant="primary">
            {t('Save Changes')}
          </Button>
        </FlexItem>
      </div>
    </div>
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
