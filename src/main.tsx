import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import { listen } from '@tauri-apps/api/event';

await listen('clipboard-hotkey', (event) => {
  console.log('axxx', event); // AXXX
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
