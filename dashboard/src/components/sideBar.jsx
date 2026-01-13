import { Link, useLocation, useNavigate } from 'react-router-dom';
import './sideBar.css';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate(); 

  const isActive = (path) => location.pathname === path ? 'active' : '';

  // 3. Hàm xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="logo">IoT_Attendance</div>
      <ul className="menu">
        <li className={isActive('/dashboard')}>
          <Link to="/dashboard">🏠 Tổng quan</Link>
        </li>
        <li className={isActive('/employees')}>
          <Link to="/employees">👥 Nhân viên</Link>
        </li>
        <li className={isActive('/attendance')}>
          <Link to="/attendance">📅 Chấm công</Link>
        </li>
        <li className={isActive('/payroll')}>
          <Link to="/payroll">💰 Bảng lương</Link>
        </li>
        <li style={{ marginTop: 'auto', borderTop: '1px solid #334155' }}>
          <a href="#" onClick={handleLogout} style={{ color: '#ef4444' }}>
            🚪 Đăng xuất
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;