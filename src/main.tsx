import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import './i18n/config';
import { initSentry } from './lib/sentry';
import App from './App';

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
