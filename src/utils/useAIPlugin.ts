import { useMemo } from '@wordpress/element';

export const useAIPlugin = () => {
  const plugin = useMemo(
    () => (window.aiServices && window.aiServices.ai ? window.aiServices : null),
    [window.aiServices]
  );

  return plugin;
};

export const waitForAIPlugin: () => Promise<any> = () => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const startTime = Date.now();

    const check = () => {
      try {
        if (window?.aiServices?.ai) {
          resolve(window.aiServices);
          return;
        }
      } finally {
      }

      if (attempts > 50 || Date.now() - startTime > 5000) {
        reject(null);
        return;
      }

      attempts++;
      setTimeout(check, 100);
    };

    check();
  });
};
