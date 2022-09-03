import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { init } from './core';
import './styles.css';

await init();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
