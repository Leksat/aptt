import './index.css';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { ipcRenderer } from 'electron'

ReactDOM.render(<App />, document.getElementById('root'));

ipcRenderer.on('bob', (event, message) => {console.log(message)})
