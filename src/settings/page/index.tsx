import { ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import _ from 'underscore';
import { filterAILogo } from '@/assets/filter-logo';
import { __ } from '@wordpress/i18n';
import AIServiceNotice from '@/components/aiServiceNotice';
import Features from './features';
import APIKeys from './apiKeys';
import { getMode } from '@/utils/ai/services/mode';

type Tab = {
  label: string;
  Component: () => ReactNode;
};

type Tabs = Record<string, Tab>;

const baseUrl = '?page=filter_ai';

// API keys are managed by WordPress core in Settings → Connectors on WP 7.0+,
// so the API Keys tab is only shown on the legacy (ai-services) backend.
const tabs: Tabs = {
  features: {
    label: __('Features', 'filter-ai'),
    Component: Features,
  },
  ...(getMode() === 'legacy'
    ? {
        api_keys: {
          label: __('API Keys', 'filter-ai'),
          Component: APIKeys,
        },
      }
    : {}),
};

const getKey = () => {
  const key = window.location.hash.replace('#', '');

  if (key in tabs) {
    return key;
  }

  return 'features';
};

const Settings = () => {
  const [currentTabKey, setCurrentTabKey] = useState(getKey());

  const Content = useMemo(() => {
    return tabs[currentTabKey].Component;
  }, [currentTabKey]);

  useEffect(() => {
    const abortController = new AbortController();

    window.addEventListener(
      'hashchange',
      () => {
        setCurrentTabKey(getKey());
      },
      { signal: abortController.signal }
    );

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <div className="filter-ai-settings">
      <header className="filter-ai-settings-header">
        <div className="filter-ai-settings-header-content">
          <img src={filterAILogo} alt={__('Filter AI logo', 'filter-ai')} />
          <div>
            <h1>{__('Filter AI Plugin Settings', 'filter-ai')}</h1>
            <p>{__('Customise your settings for the Filter AI plugin here.', 'filter-ai')}</p>
          </div>
        </div>
        <nav className="nav-tab-wrapper">
          {Object.keys(tabs).map((key) => {
            const isActive = currentTabKey === key;

            return (
              <a
                key={key}
                href={`${baseUrl}#${key}`}
                className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}
                onClick={(e) => {
                  // Modifier-clicks / middle-click / right-click → let the
                  // browser handle the link normally (open in new tab, etc.).
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
                    return;
                  }
                  e.preventDefault();
                  // flushSync makes the tab-content swap happen in the same
                  // frame as the click, eliminating the 1–2 frame window where
                  // the previous tab's content (and its contextual notices)
                  // was visible under the new active-tab indicator.
                  window.history.replaceState(null, '', `${baseUrl}#${key}`);
                  flushSync(() => setCurrentTabKey(key));
                }}
              >
                {tabs[key].label}
              </a>
            );
          })}
        </nav>
      </header>
      <div className="filter-ai-settings-content">
        {currentTabKey !== 'api_keys' && <AIServiceNotice />}
        <Content />
      </div>
    </div>
  );
};

(function () {
  const container = document.getElementById('filter-ai-settings-container');

  if (!container) {
    return;
  }

  const root = createRoot(container);

  root.render(<Settings />);
})();
