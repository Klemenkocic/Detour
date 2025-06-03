// src/layouts/AppLayout.tsx
import { Outlet } from 'react-router-dom';
import Map from '../components/Map';

export default function AppLayout() {
  return (
    <>
      <Map />    {/*  background map  */}
      <Outlet /> {/*  nested pages mount here  */}
    </>
  );
}