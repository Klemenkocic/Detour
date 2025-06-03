// src/routes.tsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';

// lazy-load pages
const TripSetup = lazy(() => import('./pages/TripSetup'));

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/',       element: <div /> }, // placeholder
      { path: '/new',    element: <TripSetup /> }
    ]
  }
]);