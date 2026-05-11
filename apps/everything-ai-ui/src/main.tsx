import React from 'react';
import { createRoot } from 'react-dom/client';
import { UserApp } from './UserApp';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <UserApp />
  </React.StrictMode>,
);
