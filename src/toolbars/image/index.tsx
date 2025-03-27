import { useState } from 'react';
import { ToolbarButton } from '@/components/toolbarButton';
import { useNotices } from '@/utils';
import { Modal } from '@wordpress/components';
import { Spinner } from '@/components/spinner';
import { useGenerateAltText } from './useGenerateAltText';
import { BlockEditProps } from '@/types';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

export const ImageToolbar = ({ attributes, setAttributes }: Props) => {
  const [fetchingText, setFetchingText] = useState('');

  const { showNotice, Notice } = useNotices();

  const generateAltText = useGenerateAltText({ showNotice, setFetchingText, attributes, setAttributes });

  return (
    <>
      <ToolbarButton controls={[generateAltText]} />
      {fetchingText && (
        <Modal
          isDismissible={false}
          shouldCloseOnClickOutside={false}
          shouldCloseOnEsc={false}
          onRequestClose={() => {}}
          size="small"
          style={{ textAlign: 'center' }}
          __experimentalHideHeader
        >
          <p style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1em' }}>{fetchingText}</p>
          <Spinner />
        </Modal>
      )}
      <Notice />
    </>
  );
};
