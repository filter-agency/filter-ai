import { Button, Flex, Modal, RadioControl } from '@wordpress/components';
import { useOptionsModal, hideOptionsModal, setOptionsModal } from './store';
import { createRoot, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const OptionsModalContainer = () => {
  const [choice, setChoice] = useState('');

  const { title, options } = useOptionsModal();

  const onClose = (altChoice?: string) => {
    hideOptionsModal();
    setOptionsModal({ choice: altChoice ? altChoice : choice });
    setChoice('');
  };

  if (!options?.length) {
    return null;
  }

  return (
    <Modal title={title} onRequestClose={() => onClose('')} className="filter-ai-options-modal" size="medium">
      <div>{__('Choose from one of the following:', 'filter-ai')}</div>
      <RadioControl
        selected={choice}
        onChange={setChoice}
        label={__('Generated options', 'filter-ai')}
        options={options.map((option) => ({ label: option, value: option }))}
        hideLabelFromVision
      />
      <Flex gap={4} justify="flex-end">
        <Button variant="primary" disabled={choice === ''} onClick={() => onClose()}>
          {__('Continue', 'filter-ai')}
        </Button>
      </Flex>
    </Modal>
  );
};

const container = document.createElement('div');
container.id = 'filter-ai-options-modal-container';

document.body.appendChild(container);

const root = createRoot(container);

root.render(<OptionsModalContainer />);
