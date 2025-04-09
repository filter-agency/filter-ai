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
    <Flex direction="column" gap="6" className="filter-ai-settings">
      <Panel header="Image alt text">
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

      <Panel header="Post Title">
        <PanelBody>
          <PanelRow>{t('Generate a page title based on the post content.')}</PanelRow>
          <PanelRow>
            <ToggleControl
              __nextHasNoMarginBottom
              label={t('Enable feature')}
              onChange={(newValue) => {
                onChange('post_title_enabled', newValue);
              }}
              checked={formData?.post_title_enabled}
            />
          </PanelRow>
          <PanelRow>
            <div style={{ flex: 1 }}>
              <TextareaControl
                __nextHasNoMarginBottom
                label={t('Custom Prompt')}
                value={formData?.post_title_prompt || ''}
                placeholder={ai.prompts.post.title}
                onChange={(newValue) => {
                  onChange('post_title_prompt', newValue);
                }}
                disabled={!formData?.post_title_enabled}
              />
            </div>
          </PanelRow>
        </PanelBody>
      </Panel>

      <Panel header="Post Excerpt">
        <PanelBody>
          <PanelRow>{t('Generate an excerpt based on the post content.')}</PanelRow>
          <PanelRow>
            <ToggleControl
              __nextHasNoMarginBottom
              label={t('Enable feature')}
              onChange={(newValue) => {
                onChange('post_excerpt_enabled', newValue);
              }}
              checked={formData?.post_excerpt_enabled}
            />
          </PanelRow>
          <PanelRow>
            <div style={{ flex: 1 }}>
              <TextareaControl
                __nextHasNoMarginBottom
                label={t('Custom Prompt')}
                value={formData?.post_excerpt_prompt || ''}
                placeholder={ai.prompts.post.excerpt}
                onChange={(newValue) => {
                  onChange('post_excerpt_prompt', newValue);
                }}
                disabled={!formData?.post_excerpt_enabled}
              />
            </div>
          </PanelRow>
        </PanelBody>
      </Panel>

      <Panel header="Post Tags">
        <PanelBody>
          <PanelRow>{t('Generate tags based on the post content.')}</PanelRow>
          <PanelRow>
            <ToggleControl
              __nextHasNoMarginBottom
              label={t('Enable feature')}
              onChange={(newValue) => {
                onChange('post_tags_enabled', newValue);
              }}
              checked={formData?.post_tags_enabled}
            />
          </PanelRow>
          <PanelRow>
            <div style={{ flex: 1 }}>
              <TextareaControl
                __nextHasNoMarginBottom
                label={t('Custom Prompt')}
                value={formData?.post_tags_prompt || ''}
                placeholder={ai.prompts.post.tags}
                onChange={(newValue) => {
                  onChange('post_tags_prompt', newValue);
                }}
                disabled={!formData?.post_tags_enabled}
              />
            </div>
          </PanelRow>
        </PanelBody>
      </Panel>

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
