import { showNotice } from '@/utils';
import {
  Panel,
  PanelRow,
  PanelBody,
  TextareaControl,
  Button,
  FlexItem,
  FormToggle,
  PanelHeader,
} from '@wordpress/components';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from './useSettings';
import _ from 'underscore';
import { sections } from './sections';
import { filterLogo } from '@/assets/filter-logo';
import { verticalDots } from '@/assets/vertical-dots';
import { __ } from '@wordpress/i18n';

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
          title: __('Changes saved!', 'filter-ai'),
          message: __('Your changes have been saved, you can now exit this screen.', 'filter-ai'),
        });
      })
      .catch(() => {
        showNotice({ message: __('There has been an issue saving your changes.', 'filter-ai'), type: 'error' });
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
        label={__('toggle more options', 'filter-ai')}
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

      const brandVoiceSection = sections.find(section =>
        section.features.some(feature => feature.toggle.key === 'brand_voice_enabled')
      );

      if (!brandVoiceSection) {
        console.log('No brandVoiceSection found');
        return;
      }

      const brandVoiceFeature = brandVoiceSection.features.find(
        feature => feature.toggle.key === 'brand_voice_enabled'
      );

      if (!brandVoiceFeature) {
        console.log('No brandVoiceFeature found');
        return;
      }

      const defaultPrompt = brandVoiceFeature.prompt.defaultValue || '';

      if (
        formData.brand_voice_enabled &&
        (formData.brand_voice_prompt === '' || formData.brand_voice_prompt === defaultPrompt)
      ) {
        setShowExtra((prevState) => ({
          ...prevState,
          [brandVoiceSection.key]: brandVoiceFeature.key,
        }));
      }
    }, [formData.brand_voice_enabled, formData.brand_voice_prompt]);

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
            <h1>{__('Filter AI Plugin Settings', 'filter-ai')}</h1>
            <p>{__('Customise your settings for the Filter AI plugin here.', 'filter-ai')}</p>
          </div>
          <img src={filterLogo} alt={__('Filter AI logo', 'filter-ai')} />
        </div>
      </header>
      <div className="filter-ai-settings-content">
        {sections.map((section) => {
          let isDisabled = false;

          if (window.filter_ai_dependencies?.hasOwnProperty(section.key)) {
            isDisabled = !window.filter_ai_dependencies[section.key];
          }

          return (
            <Panel className={`filter-ai-settings-panel ${isDisabled ? 'disabled' : ''}`}>
              <PanelHeader>
                <h2>
                  {section.header}
                  {isDisabled && <small> ({__('plugin not installed or activated', 'filter-ai')})</small>}
                </h2>
              </PanelHeader>
              {section.features.map((feature) => (
                <PanelBody>
                  <PanelRow className="filter-ai-settings-field">
                    <div className="filter-ai-settings-field-text">
                      <label htmlFor={feature.toggle.key}>{feature.toggle.label}</label>
                      {feature.toggle.help && <div>{feature.toggle.help}</div>}
                    </div>
                    <div style={!feature.prompt ? { marginRight: '34px' } : {}}>
                      <FormToggle
                        onChange={() => {
                          const key = feature.toggle.key;
                          const newValue = !formData?.[key];
                          if (key === 'image_alt_text_enabled' || key === 'auto_alt_text_enabled') {
                            onChange('image_alt_text_enabled', newValue);
                            onChange('auto_alt_text_enabled', newValue);
                          } else {
                            onChange(key, newValue);
                          }
                        }}
                        checked={isDisabled ? false : !!formData?.[feature.toggle.key]}
                        id={feature.toggle.key}
                        disabled={isDisabled}
                      />
                    </div>
                    {feature.prompt && (
                      <ShowButton
                        disabled={!formData?.[feature.toggle.key] || isDisabled}
                        extraKey={section.key}
                        extraValue={feature.key}
                      />
                    )}
                  </PanelRow>
                  {feature.prompt && showExtra[section.key] === feature.key && (
                    <PanelRow>
                      <div style={{ flex: 1 }}>
                        <TextareaControl
                          __nextHasNoMarginBottom
                          label={feature.prompt.label}
                          onChange={(newValue) => {
                            onChange(feature.prompt?.key!, newValue);
                          }}
                          disabled={!formData?.[feature.toggle.key]}
                          placeholder={feature.prompt.placeholder || undefined}
                          value={(() => {
                            const rawValue = formData?.[feature.prompt.key];
                            const hasUserInput = typeof rawValue === 'string' && rawValue.length > 0;

                            if (feature.prompt.placeholder) {
                              return hasUserInput ? rawValue : '';
                            } else {
                              return hasUserInput ? rawValue : feature.prompt.defaultValue || '';
                            }
                          })()}
                        />
                        <Button
                          className="filter-ai-settings-field-reset"
                          variant="link"
                          onClick={() => onChange(feature.prompt?.key!, '')}
                        >
                          {__('Reset to default', 'filter-ai')}
                        </Button>
                      </div>
                    </PanelRow>
                  )}
                </PanelBody>
              ))}
            </Panel>
          );
        })}

        <FlexItem>
          <Button onClick={saveChanges} variant="primary">
            {__('Save Changes', 'filter-ai')}
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
