import { ComponentProps } from 'react';
import { filterLogo } from '@/assets/filter-logo';
import { DropdownMenu as WP_DropdownMenu } from '@wordpress/components';

type Props = Partial<ComponentProps<typeof WP_DropdownMenu>>;

export const DropdownMenu = (props: Props) => {
  return (
    <WP_DropdownMenu
      icon={<img src={filterLogo} alt="Filter AI" />}
      label="Filter AI"
      className="filter-ai-button"
      popoverProps={{
        className: 'filter-ai-components-popover',
      }}
      {...props}
    />
  );
};
