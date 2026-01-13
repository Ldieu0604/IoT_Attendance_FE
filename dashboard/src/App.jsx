import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import Sidebar from './components/sideBar';   
import Login from './pages/Login';           
import Employees from './pages/employees';    
import Dashboard from './pages/dashboard'; 
import Attendance from './pages/attendance';

const MainLayout = () => {
  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, background: '#f3f4f6', position: 'relative' }}>
        <Outlet />
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- TRANG LOGIN (Không có Sidebar) --- */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* --- CÁC TRANG CÓ SIDEBAR --- */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;