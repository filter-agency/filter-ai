import { ToolbarButton } from '@/components/toolbarButton';
import { useGenerateAltText } from './useGenerateAltText';
import { BlockEditProps } from '@/types';
import _ from 'underscore';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

export const ImageToolbar = ({ attributes, setAttributes }: Props) => {
  const generateAltText = useGenerateAltText({ attributes, setAttributes });

  return <ToolbarButton controls={_.compact([generateAltText])} />;
};
