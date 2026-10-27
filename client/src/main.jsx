import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.jsx';
import { SettingsProvider } from './context/SettingsProvider.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Client errors (bad input) will not fix themselves; network and 5xx errors might.
      retry: (failureCount, error) => !(error?.status >= 400 && error?.status < 500) && failureCount < 3,
      retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
