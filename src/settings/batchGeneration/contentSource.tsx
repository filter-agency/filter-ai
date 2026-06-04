import { Button, PanelBody, TextControl } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { showNotice } from '@/utils';
import { useSettings } from '../useSettings';

/**
 * Lets a site register custom-field (meta) keys to pull content from when a
 * post stores its main content outside the editor (WooCommerce, ACF, page
 * builders). Saves to the shared `content_custom_fields` setting, which the
 * PHP helper filter_ai_get_post_content() reads. Rendered on the SEO Titles
 * and SEO Meta Descriptions batch tabs (both derive output from post content).
 */
const ContentSource = () => {
  const { settings, saveSettings } = useSettings();
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setValue((settings.content_custom_fields as string) || '');
    }
  }, [settings?.content_custom_fields]);

  const save = async () => {
    setIsSaving(true);
    try {
      await saveSettings({ ...settings, content_custom_fields: value });
      showNotice({ message: __('Content source settings saved.', 'filter-ai') });
    } catch {
      showNotice({ message: __('There was an issue saving your changes.', 'filter-ai'), type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PanelBody title={__('Content source (custom fields)', 'filter-ai')} initialOpen={false}>
      <p>
        {__(
          'If your posts store their main content in custom fields (e.g. WooCommerce or ACF) rather than the main editor, enter the field keys below. Filter AI will use their values when generating, so batch generation works for those post types.',
          'filter-ai'
        )}
      </p>
      <TextControl
        __nextHasNoMarginBottom
        label={__('Custom field keys', 'filter-ai')}
        help={__('Comma-separated list of meta keys, e.g. product_blurb, _custom_body.', 'filter-ai')}
        value={value}
        onChange={setValue}
        placeholder={__('e.g. product_blurb, _custom_body', 'filter-ai')}
      />
      <Button variant="secondary" onClick={save} isBusy={isSaving} disabled={isSaving}>
        {__('Save', 'filter-ai')}
      </Button>
    </PanelBody>
  );
};

export default ContentSource;
