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

  if (!Object.keys(formData).length) {
    return null;
  }

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
                    <FormToggle
                      onChange={() => {
                        onChange(feature.toggle.key, !formData?.[feature.toggle.key]);
                      }}
                      checked={isDisabled ? false : !!formData?.[feature.toggle.key]}
                      id={feature.toggle.key}
                      disabled={isDisabled}
                    />
                    <ShowButton
                      disabled={!formData?.[feature.toggle.key] || isDisabled}
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
                          value={formData?.[feature.prompt.key]?.toString() || feature.prompt.placeholder}
                          onChange={(newValue) => {
                            onChange(feature.prompt.key, newValue);
                          }}
                          disabled={!formData?.[feature.toggle.key]}
                        />
                        <Button
                          className="filter-ai-settings-field-reset"
                          variant="link"
                          onClick={() => onChange(feature.prompt.key, '')}
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
