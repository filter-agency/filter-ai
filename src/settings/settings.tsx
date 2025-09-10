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
  Dropdown,
  MenuGroup,
  MenuItem,
} from '@wordpress/components';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from './useSettings';
import _ from 'underscore';
import { sections } from './sections';
import { filterLogoWhite } from '@/assets/filter-logo';
import { verticalDots } from '@/assets/vertical-dots';
import { __ } from '@wordpress/i18n';
import AIServiceNotice from '@/components/aiServiceNotice';
import { chevronDown, chevronUp, check } from '@wordpress/icons';

type ShowButtonProps = {
  extraKey: string;
  extraValue: string;
  disabled?: boolean;
};

declare const wp: any;

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

  const AI_PROVIDERS = ['openai', 'anthropic', 'google']
    .filter((slug) => {
      const isAvailable = wp.data.select('ai-services/ai').isServiceAvailable(slug);
      return isAvailable;
    })
    .map((slug) => {
      const service = wp.data.select('ai-services/ai').getAvailableService(slug);

      return {
        slug: service.slug,
        name: service.name,
      };
    });

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
    setFormData((prevState) => {
      const newState = {
        ...prevState,
        [key]: value,
      };
      return newState;
    });

    const section = sections.find((s) => !!s.features.find((f) => f.toggle.key === key));

    if (section) {
      if (value) {
        const featureWithoutDefaultValue = section.features.find(
          (f) => f.toggle.key === key && f.prompt && !f.prompt.defaultValue
        );

        if (featureWithoutDefaultValue) {
          // show extra section if feature doesn't have a default value
          setShowExtra((prevState) => ({
            ...prevState,
            [section.key]: featureWithoutDefaultValue.key,
          }));
        }
      } else {
        // hide extra section when disabling feature
        setShowExtra((prevState) => ({
          ...prevState,
          [section.key]: '',
        }));

        // check for dependants and disable those as well
        const dependants = section.features.filter((f) => f.toggle.dependency === key);

        if (dependants) {
          setFormData((prevState) => ({
            ...prevState,
            ...dependants.reduce((a, d) => ({ ...a, [d.toggle.key]: value }), {}),
          }));
        }
      }
    }
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
          <img src={filterLogoWhite} alt={__('Filter AI logo', 'filter-ai')} />
          <div>
            <h1>{__('Filter AI Plugin Settings', 'filter-ai')}</h1>
            <p>{__('Customise your settings for the Filter AI plugin here.', 'filter-ai')}</p>
          </div>
        </div>
      </header>
      <div className="filter-ai-settings-content">
        <AIServiceNotice />

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
                <PanelBody className={feature?.toggle?.dependency ? 'has-dependency' : ''}>
                  <PanelRow className="filter-ai-settings-field">
                    <div className="filter-ai-settings-field-text">
                      <label htmlFor={feature.toggle.key}>{feature.toggle.label}</label>
                      {feature.toggle.help && <div>{feature.toggle.help}</div>}
                    </div>
                    <div style={!feature.showAiServiceSelector ? { marginRight: '34px' } : {}}>
                      <FormToggle
                        onChange={() => {
                          onChange(feature.toggle.key, !formData?.[feature.toggle.key]);
                        }}
                        checked={isDisabled ? false : !!formData?.[feature.toggle.key]}
                        id={feature.toggle.key}
                        disabled={isDisabled}
                      />
                    </div>
                    {feature.showAiServiceSelector && (
                      <ShowButton
                        disabled={!formData?.[feature.toggle.key] || isDisabled}
                        extraKey={section.key}
                        extraValue={feature.key}
                      />
                    )}
                  </PanelRow>
                  {feature.showAiServiceSelector && showExtra[section.key] === feature.key && (
                    <PanelRow>
                      <div style={{ flex: 1 }}>
                        <div
                          className="filter-ai-label-row"
                          style={
                            feature.key === 'generate_image' ? { display: 'flex', justifyContent: 'flex-end' } : {}
                          }
                        >
                          {feature.prompt && (
                            <label style={{ margin: 0 }} className="filter-ai-label-title">
                              {feature.prompt.label}
                            </label>
                          )}
                          {feature.key !== 'stop_words' && feature.key !== 'brand_voice' && (
                            <Dropdown
                              popoverProps={{ placement: 'bottom-end' }}
                              renderToggle={({ isOpen, onToggle }) => {
                                const serviceKey = (() => {
                                  if (feature.key === 'generate_image' || feature.key === 'generate_image_pre_prompt') {
                                    return 'generate_image_prompt_service';
                                  }
                                  return (feature.prompt?.key || feature.key) + '_service';
                                })();
                                const serviceData = formData?.[serviceKey];
                                const selectedServiceSlug =
                                  typeof serviceData === 'object' && serviceData !== null ? serviceData.service : '';

                                const selectedProvider = AI_PROVIDERS.find((p) => p.slug === selectedServiceSlug);
                                const buttonLabel = selectedProvider
                                  ? `${__('AI Service', 'filter-ai')}: ${selectedProvider.name}`
                                  : __('AI Service', 'filter-ai');

                                return (
                                  <Button
                                    variant="secondary"
                                    onClick={onToggle}
                                    aria-expanded={isOpen}
                                    icon={isOpen ? chevronUp : chevronDown}
                                    iconPosition="right"
                                  >
                                    {buttonLabel}
                                  </Button>
                                );
                              }}
                              renderContent={() => {
                                const serviceKey = (() => {
                                  if (feature.key === 'generate_image' || feature.key === 'generate_image_pre_prompt') {
                                    return 'generate_image_prompt_service';
                                  }
                                  return (feature.prompt?.key || feature.key) + '_service';
                                })();

                                const currentServiceData = formData?.[serviceKey];
                                const currentServiceSlug =
                                  typeof currentServiceData === 'object' && currentServiceData !== null
                                    ? currentServiceData.service
                                    : '';

                                return (
                                  <MenuGroup>
                                    {AI_PROVIDERS.map((provider) => (
                                      <MenuItem
                                        key={provider.slug}
                                        icon={currentServiceSlug === provider.slug ? check : undefined}
                                        onClick={() => {
                                          onChange(serviceKey, {
                                            service: provider.slug,
                                            model: '',
                                            name: provider.name,
                                          });
                                        }}
                                      >
                                        {provider.name}
                                      </MenuItem>
                                    ))}
                                  </MenuGroup>
                                );
                              }}
                            />
                          )}
                        </div>
                        {feature.prompt && (
                          <>
                            <TextareaControl
                              __nextHasNoMarginBottom
                              value={formData?.[feature.prompt.key]?.toString() || feature.prompt.defaultValue}
                              onChange={(newValue) => {
                                onChange(feature.prompt?.key!, newValue);
                              }}
                              disabled={!formData?.[feature.toggle.key]}
                              placeholder={feature.prompt.placeholder}
                            />
                            {feature.prompt.defaultValue && (
                              <Button
                                className="filter-ai-settings-field-reset"
                                variant="link"
                                onClick={() => onChange(feature.prompt!.key, '')}
                              >
                                {__('Reset to default', 'filter-ai')}
                              </Button>
                            )}
                          </>
                        )}
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
