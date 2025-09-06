import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header';
import AllUsers from '../pages/allUsers'


const MainLayout = () => {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <Header />
      <main className="flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;