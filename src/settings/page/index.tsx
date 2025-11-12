import { ReactNode } from 'react';
import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';
import _ from 'underscore';
import { filterAILogo } from '@/assets/filter-logo';
import { __ } from '@wordpress/i18n';
import AIServiceNotice from '@/components/aiServiceNotice';
import Features from './features';
import APIKeys from './apiKeys';

type Tab = {
  label: string;
  Component: () => ReactNode;
};

type Tabs = Record<string, Tab>;

const baseUrl = '?page=filter_ai';

const tabs: Tabs = {
  features: {
    label: __('Features', 'filter-ai'),
    Component: Features,
  },
  api_keys: {
    label: __('API Keys', 'filter-ai'),
    Component: APIKeys,
  },
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
              <a key={key} href={`${baseUrl}#${key}`} className={`nav-tab ${isActive ? 'nav-tab-active' : ''}`}>
                {tabs[key].label}
              </a>
            );
          })}
        </nav>
      </header>
      <div className="filter-ai-settings-content">
        <AIServiceNotice />
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
