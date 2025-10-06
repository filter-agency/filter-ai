import { ComponentProps } from 'react';
import { filterAIIcon } from '@/assets/filter-logo';
import { DropdownMenu as WP_DropdownMenu } from '@wordpress/components';

type Props = Partial<ComponentProps<typeof WP_DropdownMenu>>;

export const DropdownMenu = ({ children, ...props }: Props) => {
  return (
    <WP_DropdownMenu
      icon={<img src={filterAIIcon} alt="Filter AI" />}
      label="Filter AI"
      className="filter-ai-button"
      popoverProps={{
        className: 'filter-ai-components-popover',
        expandOnMobile: true,
      }}
      {...props}
    >
      {children}
    </WP_DropdownMenu>
  );
};
