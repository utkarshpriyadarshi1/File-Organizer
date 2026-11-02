import React from 'react';
import ReactDOM from 'react-dom/client';
import './services/FrontendLogger'; // Intercept frontend logs early
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

axios.defaults.timeout = 10000; // 10 seconds timeout to prevent perpetual freeze / hanging requests

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
