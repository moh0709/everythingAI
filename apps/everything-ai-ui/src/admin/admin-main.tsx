import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminAppV2 } from './AdminAppV2';
import '../styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AdminAppV2 />
  </React.StrictMode>,
);
