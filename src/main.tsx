import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App.js';

const root = document.getElementById('root');
if (root) {
  const rootEl = ReactDOM.createRoot(root);
  rootEl.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}