import { ToolbarButton } from '@/components/toolbarButton';
import { useGenerateAltText } from './useGenerateAltText';
import { BlockEditProps } from '@/types';

type Props = {
  attributes: BlockEditProps['attributes'];
  setAttributes: BlockEditProps['setAttributes'];
};

export const ImageToolbar = ({ attributes, setAttributes }: Props) => {
  const generateAltText = useGenerateAltText({ attributes, setAttributes });

  return <ToolbarButton controls={[generateAltText]} />;
};
