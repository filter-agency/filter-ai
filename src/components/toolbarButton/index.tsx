import { ComponentProps } from 'react';
import { ToolbarGroup } from '@wordpress/components';
import { BlockControls } from '@wordpress/block-editor';
import { DropdownMenu } from '@/components/dropdownMenu';
import { isFunction } from 'underscore';

type Props = Partial<ComponentProps<typeof DropdownMenu>>;

export const ToolbarButton = ({ controls, children }: Props) => {
  if (!controls?.length && !isFunction(children)) {
    return null;
  }

  return (
    <BlockControls group="inline">
      <ToolbarGroup>
        <DropdownMenu controls={controls}>{children}</DropdownMenu>
      </ToolbarGroup>
    </BlockControls>
  );
};
