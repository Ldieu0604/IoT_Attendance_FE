import React, { useState } from 'react';
import './login.css';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate cơ bản
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu!');
      setLoading(false);
      return;
    }

    try {
      // 2. Gọi API thực
      // api.js đã xử lý việc gửi POST /api/v1/users/login
      const result = await loginUser({ username, password });
      
      if (result.success) {
        if (result.role !== 'admin' && result.role !== 'Admin') {
            setError('Tài khoản của bạn không có quyền truy cập trang quản trị!');
            setLoading(false);
            return; // Dừng lại, không chuyển trang
        }

        console.log("Đăng nhập Admin thành công:", result);
        navigate('/dashboard');
        
      } else {
        setError(result.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối tới Server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>IoT_Attendance</h1>
          <p>Hệ thống quản lý chấm công</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username"
              className="form-input"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="form-input"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;