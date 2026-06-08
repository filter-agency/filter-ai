declare module '@wordpress/blocks' {
  export type BlockEditProps<TAttributes = Record<string, unknown>> = {
    attributes: TAttributes;
    setAttributes: (attributes: Partial<TAttributes>) => void;
    clientId: string;
    className?: string;
    context?: Record<string, unknown>;
    isSelected: boolean;
    name: string;
  };

  export function createBlock(name: string, attributes?: Record<string, unknown>, innerBlocks?: unknown[]): unknown;

  export function registerBlockType(name: string, settings: Record<string, unknown>): unknown;

  export function pasteHandler(options: {
    HTML?: string;
    plainText?: string;
    mode?: 'AUTO' | 'INLINE' | 'BLOCKS';
    tagName?: string;
    preserveWhiteSpace?: boolean;
  }): unknown;
}

declare module '@wordpress/block-editor' {
  import type { ComponentType } from 'react';

  type EditorComponent<TProps = Record<string, unknown>> = ComponentType<TProps>;
  type AlignmentToolbarProps = {
    onChange?: (value: any) => void;
    value?: any;
  };
  type RichTextProps = {
    onChange?: (value: any) => void;
    value?: any;
    [key: string]: any;
  };
  type InnerBlocksComponent = EditorComponent & {
    ButtonBlockAppender: EditorComponent;
    Content: EditorComponent;
  };
  type RichTextComponent = EditorComponent<RichTextProps> & {
    Content: EditorComponent;
  };
  type UseBlockProps = {
    (props?: Record<string, unknown>): Record<string, unknown>;
    save: (props?: Record<string, unknown>) => Record<string, unknown>;
  };

  export const AlignmentToolbar: EditorComponent<AlignmentToolbarProps>;
  export const BlockControls: EditorComponent;
  export const InnerBlocks: InnerBlocksComponent;
  export const InspectorControls: EditorComponent;
  export const RichText: RichTextComponent;
  export const useBlockProps: UseBlockProps;
}

declare module '@wordpress/media-utils' {
  export type UploadMediaOptions = {
    additionalData?: Record<string, unknown>;
    filesList: File[];
    onError?: (error: unknown) => void;
    onFileChange?: (attachments: any[]) => void;
  };

  export function uploadMedia(options: UploadMediaOptions): void;
}
