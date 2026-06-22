import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { router } from './router';
import { routerFuture } from './router/future';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} future={routerFuture} />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '16px',
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        },
      }}
    />
  </React.StrictMode>,
);
