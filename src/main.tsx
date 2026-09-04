import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { HemoProvider } from './context/HemoContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Unregister any existing service workers so the app runs as a standard website
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <HemoProvider>
            <App />
          </HemoProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
