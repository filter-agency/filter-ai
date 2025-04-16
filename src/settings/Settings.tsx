import { ai, showNotice, t } from '@/utils';
import {
  ToggleControl,
  Panel,
  PanelRow,
  PanelBody,
  TextareaControl,
  Button,
  Flex,
  FlexItem,
} from '@wordpress/components';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import { FilterAISettings, useSettings } from './useSettings';
import _ from 'underscore';
import { sections } from './sections';
import { filterLogo } from '@/assets/filter-logo';

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

  const ShowButton = ({ extraKey, extraValue, disabled }: ShowButtonProps) => {
    if (showExtra[extraKey] === extraValue) {
      return (
        <Button
          icon="no-alt"
          iconSize={24}
          label={t('close extra options')}
          onClick={() => {
            setShowExtra((prevState) => ({ ...prevState, [extraKey]: '' }));
          }}
        />
      );
    }

    return (
      <Button
        icon="admin-generic"
        label={t('show more options')}
        disabled={disabled}
        onClick={() => {
          setShowExtra((prevState) => ({ ...prevState, [extraKey]: extraValue }));
        }}
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

  if (isLoading) {
    return null;
  }

  return (
    <Flex direction="column" gap="6" className="filter-ai-settings">
      <Flex justify="flex-start">
        <img src={filterLogo} alt="Filter AI logo" style={{ width: '30px', marginLeft: '8px' }} />
        <h1 style={{ margin: 0 }}>Filter AI Settings</h1>
      </Flex>
      {sections.map((section) => (
        <Panel header={section.header}>
          {section.features.map((feature) => (
            <PanelBody>
              <PanelRow>
                <ToggleControl
                  __nextHasNoMarginBottom
                  label={feature.toggle.label}
                  help={feature.toggle.help}
                  onChange={(newValue) => {
                    onChange(feature.toggle.key, newValue);
                  }}
                  checked={!!formData?.[feature.toggle.key]}
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
    </Flex>
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
