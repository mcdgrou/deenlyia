import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler for debugging blank screen issues
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', { message, source, lineno, colno, error });
  // You could also render a fallback UI here if the root hasn't rendered yet
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.error('Root element not found!');
}
