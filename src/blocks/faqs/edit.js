import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

const faqsEdit = ({ attributes, setAttributes }) => {
  const { faqsState } = attributes;

  const handleChange = (key, value) => {
    setAttributes({ [key]: value });
  };

  const getInspectorControls = () => (
    <InspectorControls>
      <PanelBody title={__('FAQs Settings', 'filter-scaffold')}>
        <SelectControl
          label="FAQs state"
          value={faqsState}
          options={[
            { label: 'All items open', value: 'open' },
            { label: 'First item open', value: 'first' },
            { label: 'All items closed', value: 'closed' },
          ]}
          onChange={(value) => handleChange('faqsState', value)}
        />
      </PanelBody>
    </InspectorControls>
  );

  const blockProps = useBlockProps({
    className: 'filter-ai-faqs-container filter-ai-faqs-js',
  });

  const MY_TEMPLATE = [
    ['core/paragraph', {}, [['core/paragraph', {}]]],
    ['core/paragraph', {}, [['core/paragraph', {}]]],
    ['core/paragraph', {}, [['core/paragraph', {}]]],
  ];

  const ALLOWED_BLOCKS = ['core/paragraph'];

  return [
    getInspectorControls(),
    <div {...blockProps} data-filter-ai-faqs-items-initial-state={faqsState}>
      <InnerBlocks
        template={MY_TEMPLATE}
        templateLock={false}
        allowedBlocks={ALLOWED_BLOCKS}
        renderAppender={InnerBlocks.ButtonBlockAppender}
      />
    </div>,
  ];
};

export default faqsEdit;
