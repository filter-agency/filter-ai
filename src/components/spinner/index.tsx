import { Spinner as WP_Spinner } from '@wordpress/components';

export const Spinner = () => {
  return (
    <WP_Spinner
      style={{ width: '2.5rem', height: '2.5rem', marginLeft: 'auto', marginRight: 'auto', display: 'block' }}
    />
  );
};
