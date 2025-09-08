import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header';
import AllUsers from '../pages/allUsers'


const MainLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>
  <main className="flex-grow overflow-y-auto pt-[160px]">{/* Adjusted padding-top to match header height and prevent overlap */}
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;