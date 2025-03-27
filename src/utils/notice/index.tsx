import { useState } from 'react';
import { Animate, Snackbar } from '@wordpress/components';
import { createPortal } from '@wordpress/element';

export const useNotices = () => {
  const [message, setMessage] = useState('');

  const showNotice = (newMessage: string) => {
    setMessage(newMessage);
  };

  const Notice = () => {
    if (!message) {
      return null;
    }

    return createPortal(
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 99999 }}>
        <Animate type="appear" options={{ origin: 'bottom right' }}>
          {({ className }) => (
            <Snackbar className={className} onDismiss={() => setMessage('')}>
              {message}
            </Snackbar>
          )}
        </Animate>
      </div>,
      document.body
    );
  };

  return { showNotice, Notice };
};
