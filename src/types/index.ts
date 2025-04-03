import { type BlockEditProps as WP_BlockEditProps } from '@wordpress/blocks';

export type BlockEditProps = WP_BlockEditProps<any> & {
  name: string;
};

declare global {
  interface Window {
    wp: any;
    aiServices: any;
    Backbone: any;
  }
}
