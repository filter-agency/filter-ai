import { ComponentProps } from 'react';
import { ToolbarGroup } from '@wordpress/components';
import { BlockControls } from '@wordpress/block-editor';
import { DropdownMenu } from '@/components/dropdownMenu';

type Props = {
  controls: ComponentProps<typeof DropdownMenu>['controls'];
};

export const ToolbarButton = ({ controls }: Props) => {
  if (!controls?.length) {
    return null;
  }

  return (
    <BlockControls group="inline">
      <ToolbarGroup>
        <DropdownMenu controls={controls} />
      </ToolbarGroup>
    </BlockControls>
  );
};
