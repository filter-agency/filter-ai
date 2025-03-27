import { DropdownMenu, ToolbarGroup } from '@wordpress/components';
import { BlockControls } from '@wordpress/block-editor';

type Props = {
  controls: React.ComponentProps<typeof DropdownMenu>['controls'];
};

export const ToolbarButton = ({ controls }: Props) => {
  if (!controls?.length) {
    return null;
  }

  return (
    <BlockControls group="inline">
      <ToolbarGroup>
        <DropdownMenu
          icon={
            <img
              src="data:image/webp;base64,UklGRigBAABXRUJQVlA4TBwBAAAvv8AvAPfBoG0kx+FN5gqA+/7P4Rm1keQ4eNU9EcG9MuO2bSSHLSWZ59677e38x3/8AS3L6FZAAQBRQKFXa1kUkCB6tVgty5hxXRetOSNRFHo1LYUivv8DAZi7KCAA5ox1brQAEFqAlgUAkShasRAglCC0FBJFK1ZCAIUCEAC4tm1bScDuLuxuJey45/+/zLix3+BE9F9h27aNeEXScQDBx/7HxvTYbqRbu1hyy6m0bImWgNIxZ8nXeEcYVO11JXAmAlgdkoSxrRn4f7rDK1n8U2mGKZnsUei1WPxPiSm86qvFf5YX/HMH+18USbfxYPhBf078rudhL90uAPNvWCWTlS3VDpf+G+bVCkXZ8o6A0ut8ki64Enzsf1xMBA=="
              style={{ maxHeight: '80%' }}
              alt="Filter AI"
            />
          }
          label="Filter AI"
          controls={controls}
        />
      </ToolbarGroup>
    </BlockControls>
  );
};
