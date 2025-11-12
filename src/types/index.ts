import { type BlockEditProps as WP_BlockEditProps } from '@wordpress/blocks';

export type BlockEditProps = WP_BlockEditProps<any> & {
  name: string;
};

declare global {
  interface Window {
    wp: any;
    aiServices: any;
    Backbone: any;
    filter_ai_api: any;
    filter_ai_dependencies: any;
    filter_ai_default_settings: any;
    tinymce: any;
    YoastSEO: any;
    tagBox: any;
    jQuery: any;
  }
}
