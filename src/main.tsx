// src/main.tsx
import { StrictMode } from 'react';
import { createRoot }  from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import { router } from './routes';   //  <-- the router tree you added
import './index.css';                //  global styles / Tailwind reset

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);