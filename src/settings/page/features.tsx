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
import { useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from '../useSettings';
import _ from 'underscore';
import { sections } from './sections';
import { verticalDots } from '@/assets/vertical-dots';
import { __ } from '@wordpress/i18n';
// Window.filter_ai_brand_voice is declared in @/components/brandVoiceNotice.
import { chevronDown, check } from '@wordpress/icons';
import { useServices } from '@/utils/ai/services/useServices';
import { filterServicesByCapabilities, getServiceDisplayName } from '@/utils/ai/services/options';
import { selectServiceOption } from './serviceSelection';
import { isFeatureProviderSupported } from './featureAvailability';

type ShowButtonProps = {
  extraKey: string;
  extraValue: string;
  disabled?: boolean;
};

const Features = () => {
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

  const services = useServices();

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

  // Open a feature's prompt editor when the URL hash matches its key
  // (e.g. #brand_voice from the brand voice success notice). Listens for
  // hashchange too so clicking the link while already on the page opens
  // the panel without a full reload.
  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      for (const section of sections) {
        const feature = section.features.find((f) => f.key === hash);
        if (feature) {
          setShowExtra({ [section.key]: feature.key });
          return;
        }
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

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
    <>
      {sections.map((section) => {
        let isDisabled = false;

        if (window.filter_ai_dependencies?.hasOwnProperty(section.key)) {
          isDisabled = !window.filter_ai_dependencies[section.key];
        }

        return (
          <Panel key={section.key} className={`filter-ai-settings-panel ${isDisabled ? 'disabled' : ''}`}>
            <PanelHeader>
              <h2>
                {section.header}
                {isDisabled && <small> ({__('plugin not installed or activated', 'filter-ai')})</small>}
              </h2>
            </PanelHeader>
            {section.features.map((feature) => {
              const featureCapabilities = feature.serviceCapabilities || [];
              const featureServices = filterServicesByCapabilities(services, featureCapabilities);
              const isProviderSupported = isFeatureProviderSupported(
                services,
                !!feature.serviceKey,
                featureCapabilities
              );
              const isFeatureDisabled = isDisabled || !isProviderSupported;
              const isFeatureOn = isFeatureDisabled ? false : !!formData?.[feature.toggle.key];

              return (
                <PanelBody
                  key={feature.key}
                  className={`${feature?.toggle?.dependency ? 'has-dependency' : ''}${
                    !isProviderSupported ? ' has-provider-warning' : ''
                  }`}
                >
                  <PanelRow className="filter-ai-settings-field">
                    <div className="filter-ai-settings-field-text">
                      <label htmlFor={feature.toggle.key}>{feature.toggle.label}</label>
                      {feature.toggle.help && <div>{feature.toggle.help}</div>}
                      {!isProviderSupported && (
                        <div className="filter-ai-settings-field-warning">
                          {__('No configured AI provider supports this feature.', 'filter-ai')}
                        </div>
                      )}
                    </div>
                    <div style={!feature.serviceKey && !feature.prompt ? { marginRight: '34px' } : {}}>
                      <FormToggle
                        onChange={() => {
                          onChange(feature.toggle.key, !formData?.[feature.toggle.key]);
                        }}
                        checked={isFeatureOn}
                        id={feature.toggle.key}
                        disabled={isFeatureDisabled}
                      />
                    </div>
                    {(!!feature.serviceKey || !!feature.prompt) && (
                      <ShowButton
                        disabled={!isFeatureOn || isFeatureDisabled}
                        extraKey={section.key}
                        extraValue={feature.key}
                      />
                    )}
                  </PanelRow>
                  {(!!feature.serviceKey || !!feature.prompt) && showExtra[section.key] === feature.key && (
                    <PanelRow>
                      <div style={{ flex: 1 }}>
                        <div
                          className="filter-ai-label-row"
                          style={!feature.prompt ? { display: 'flex', justifyContent: 'flex-end' } : {}}
                        >
                          {feature.prompt && <label className="filter-ai-label-title">{feature.prompt.label}</label>}
                          {!!feature.serviceKey && (
                            <Dropdown
                              popoverProps={{ placement: 'bottom-end', className: 'filter-ai-selector-menu' }}
                              renderToggle={({ isOpen, onToggle }) => {
                                const serviceSlug = formData?.[feature.serviceKey!] as string;
                                const service = getServiceDisplayName(featureServices, serviceSlug);
                                const buttonLabel = __('AI Provider / Model', 'filter-ai');

                                return (
                                  <Button
                                    onClick={onToggle}
                                    aria-expanded={isOpen}
                                    icon={chevronDown}
                                    iconPosition="right"
                                    className="filter-ai-selector-button"
                                    disabled={!isProviderSupported}
                                  >
                                    {buttonLabel}
                                    {service ? `: ${service}` : ''}
                                  </Button>
                                );
                              }}
                              renderContent={({ onClose }) => {
                                const serviceSlug = formData?.[feature.serviceKey!];

                                return (
                                  <MenuGroup>
                                    {Object.values(featureServices).map((service) => (
                                      <MenuItem
                                        key={service.slug}
                                        icon={serviceSlug === service.slug ? check : undefined}
                                        disabled={!service.is_available}
                                        onClick={() => {
                                          selectServiceOption(
                                            serviceSlug,
                                            service.slug,
                                            feature.serviceKey!,
                                            onChange,
                                            onClose
                                          );
                                        }}
                                      >
                                        {service.metadata.name}
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
                              disabled={!isFeatureOn}
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
                            {feature.key === 'brand_voice' &&
                              window.filter_ai_brand_voice?.regenerate_url &&
                              !!formData?.[feature.prompt.key] && (
                                <Button
                                  className="filter-ai-settings-field-reset"
                                  variant="link"
                                  href={window.filter_ai_brand_voice.regenerate_url}
                                  onClick={(e: React.MouseEvent) => {
                                    if (
                                      !window.confirm(
                                        __(
                                          'This will replace the current brand voice with a new one generated from your latest site content. Continue?',
                                          'filter-ai'
                                        )
                                      )
                                    ) {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  {__('Regenerate from site content', 'filter-ai')}
                                </Button>
                              )}
                          </>
                        )}
                      </div>
                    </PanelRow>
                  )}
                </PanelBody>
              );
            })}
          </Panel>
        );
      })}

      <FlexItem>
        <Button onClick={saveChanges} variant="primary">
          {__('Save Changes', 'filter-ai')}
        </Button>
      </FlexItem>
    </>
  );
};

export default Features;
