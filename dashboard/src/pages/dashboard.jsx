import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { useNavigate } from 'react-router-dom';
import { FaUserFriends, FaUserCheck, FaUserTimes, FaClock, FaWifi, FaLock, FaUnlock, FaDoorOpen } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getEmployees, toggleDoorCommand } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [doorStatus, setDoorStatus] = useState('LOCKED'); // 'locked' hoặc 'unlocked'
  const [doorLoading, setDoorLoading] = useState(false);

  const [stats, setStats] = useState({
        total: 0,
        present: 0,
        absent: 0,
        late: 0
      });

  const checkIsLate = (timeString) => {
    if (!timeString) return false;
    return timeString > "09:00:00";
  };

  // Gọi API khi mở trang Dashboard
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
        
        // Nếu chưa đăng nhập HOẶC không phải admin -> Đuổi về trang login
        if (!user || (user.role !== 'admin' && user.role !== 'Admin')) {
            alert("Bạn không có quyền truy cập trang này!");
            navigate('/'); // Hoặc '/login'
            return; // Dừng hàm, không gọi API bên dưới nữa
        }
    const fetchData = async () => {
      try {
        const empData = await getEmployees();
        const todayDate = new Date().toLocaleDateString('vi-VN');

        // Map dữ liệu nhân viên sang dữ liệu hiển thị Dashboard
        // (Nếu API chưa trả về giờ check-in, ta giả lập ở đây để test logic > 9:00)
        const processedData = empData.map((emp, index) => {
            // GIẢ LẬP GIỜ CHECK-IN ĐỂ TEST LOGIC (Xóa đoạn này nếu API đã trả về field checkIn thực tế)
            // Logic giả lập: Người thứ 3, 7, 10... sẽ đi muộn (checkin sau 9h)
            const isSimulatedLate = index % 3 === 0 && index !== 0; 
            
            // Nếu muộn: random từ 09:01 đến 09:30. Nếu sớm: 07:30 - 08:59
            const hour = isSimulatedLate ? 9 : 7 + Math.floor(Math.random() * 2); 
            const minute = isSimulatedLate ? Math.floor(Math.random() * 30) + 1 : Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);

            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
            
            // --- LOGIC CHÍNH: SO SÁNH THỜI GIAN ---
            const isLate = checkIsLate(timeString);

            return {
                ...emp, // Giữ lại id, full_name, etc từ API
                date: todayDate,
                checkIn: timeString, // Giờ check-in
                checkOut: '17:00:00', // Giả định giờ về
                status: isLate ? 'Muộn' : 'Đúng giờ', // Set trạng thái dựa trên giờ
                isAbsent: false // Giả sử đi làm đầy đủ
            };
        });

        setAttendanceLogs(processedData);

        // --- TÍNH TOÁN THỐNG KÊ DỰA TRÊN DỮ LIỆU ĐÃ XỬ LÝ ---
        const total = empData.length;
        const present = Math.floor(total * 0.8);
        const late = Math.floor(present * 0.1);
        const absent = total - present;
        setStats({ total, present, absent, late });
      } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Dữ liệu trạng thái thiết bị (Vẫn fix cứng vì chưa có API cho ESP32)
  const deviceStatus = {
    isConnected: true, 
    lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  // Dữ liệu biểu đồ (Vẫn giữ cố định hoặc update sau nếu có API thống kê tuần)
  const dataChart = [
    { name: 'T2', present: 20, absent: 5, late: 2 },
    { name: 'T3', present: 22, absent: 3, late: 1 },
    { name: 'T4', present: 18, absent: 7, late: 3 },
    { name: 'T5', present: 24, absent: 1, late: 0 },
    { name: 'T6', present: 21, absent: 4, late: 2 },
    { name: 'T7', present: 15, absent: 10, late: 5 },
  ];

  const handleDoorControl = async () => {
    setDoorLoading(true);
    
    try {
        if (doorStatus === 'LOCKED') {
            // --- QUY TRÌNH 1: MỞ CỬA ---
            await toggleDoorCommand('open'); 
            
            // B1: Rút chốt khóa (UNLOCKED)
            setDoorStatus('UNLOCKED');

            // B2: Giả lập 2s sau người dùng đẩy cửa ra (OPEN)
            setTimeout(() => {
                setDoorStatus('OPEN');
                setDoorLoading(false);
            }, 2000);

        } else if (doorStatus === 'OPEN') {
            // --- QUY TRÌNH 2: NGƯỜI DÙNG KHÉP CỬA LẠI ---
            // Ở đây nút bấm đóng vai trò là "Cảm biến cửa" (Door Sensor)
            // Khi người dùng khép cửa, cảm biến chạm nhau -> Kích hoạt chốt khóa ngay lập tức
            
            await toggleDoorCommand('close'); // Gửi lệnh chốt khóa tới ESP32
            
            setDoorStatus('LOCKED'); // Khóa ngay lập tức
            setDoorLoading(false);
        }
    } catch (error) {
        alert("Không thể kết nối tới thiết bị!", error);
    } finally {
        setDoorLoading(false);
    }
  };

  const renderDoorBadge = () => {
    switch (doorStatus) {
        case 'LOCKED':
            return <div className="door-status-badge locked"><FaLock /> <span>Cửa Đang Khóa</span></div>;
        case 'UNLOCKED':
            return <div className="door-status-badge unlocked"><FaUnlock /> <span>Đã Mở Khóa</span></div>;
        case 'OPEN':
            return <div className="door-status-badge open"><FaDoorOpen /> <span>Cửa Đang Mở</span></div>;
        default:
            return null;
    }
  };

  const getButtonText = () => {
      if (doorLoading) return 'Đang xử lý...';
      if (doorStatus === 'LOCKED') return 'Mở khóa cửa';
      if (doorStatus === 'UNLOCKED') return 'Đang mở cửa...';
      if (doorStatus === 'OPEN') return 'Khép cửa lại';
  };

  if (loading) {
    return <div style={{padding: '20px'}}>⏳ Đang tải dữ liệu Dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="page-title">📊 Tổng quan</h1>

      {/* 1. Các thẻ thống kê (Dữ liệu đã tính toán từ Mock API) */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon"><FaUserFriends /></div>
          <div className="stat-info">
            <h3>Tổng nhân viên</h3>
            {/* Hiển thị số lượng thật từ API */}
            <p>{stats.total}</p> 
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FaUserCheck /></div>
          <div className="stat-info">
            <h3>Đi làm</h3>
            <p>{stats.present}</p>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><FaUserTimes /></div>
          <div className="stat-info">
            <h3>Vắng</h3>
            <p>{stats.absent}</p>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><FaClock /></div>
          <div className="stat-info">
            <h3>Đi muộn</h3>
            <p>{stats.late}</p>
          </div>
        </div>
      </div>

      {/* 2. Phần giữa: Biểu đồ và Trạng thái thiết bị */}
      <div className="middle-section">
        {/* Biểu đồ bên trái */}
        <div className="chart-container">
          <h3>📈 Thống kê điểm danh tuần qua</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataChart}
                margin={{
                top: 40,
                right: 30,
                left: 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10}/>
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="present" name="Đi làm" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="late" name="Đi muộn" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="absent" name="Vắng" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trạng thái thiết bị bên phải */}
        <div className="device-status-card">
          <h3>📡 Trạng thái thiết bị</h3>
          <div className={`status-indicator ${deviceStatus.isConnected ? 'online' : 'offline'}`}>
            <FaWifi className="wifi-icon" />
            <span>{deviceStatus.isConnected ? 'ESP32 Đang Online' : 'Mất kết nối'}</span>
          </div>
          <p className="last-sync">Cập nhật lần cuối: {deviceStatus.lastSync}</p>
          <button className="btn-ping" onClick={() => alert("Đang Ping tới ESP32...")}>Kiểm tra kết nối</button>

          <div className="door-control-section">
            {renderDoorBadge()}
            <button 
                className={`btn-door-toggle ${doorStatus === 'LOCKED' ? 'btn-open' : 'btn-lock'}`}
                onClick={handleDoorControl}
                disabled={doorLoading || doorStatus !== 'LOCKED'}
                style={{ opacity: doorStatus !== 'LOCKED' ? 0.6 : 1, cursor: doorStatus !== 'LOCKED' ? 'not-allowed' : 'pointer' }}
            >
              {getButtonText()}
            </button>
            
            {doorStatus === 'UNLOCKED' && <p className="door-info-text" style={{color: '#b45309'}}>Vui lòng đẩy cửa vào...</p>}
            {doorStatus === 'OPEN' && (<p className="door-info-text" style={{color: '#64748b'}}>Xin vui lòng đóng cửa lại</p>)}
          </div>
        </div>
      </div>

      {/* 3. Danh sách hoạt động gần đây (Dữ liệu mapped từ Employees) */}
      <div className="recent-activity">
        <h3>⏱️ Hoạt động gần đây</h3>
        {attendanceLogs.length > 0 ? (
            <table className="log-table">
            <thead>
                <tr>
                <th>Nhân viên</th>
                <th>Ngày</th>
                <th>Giờ check-in</th>
                <th>Giờ check-out</th>
                <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                {attendanceLogs.slice(0, 10).map((log, index) => (
                <tr key={index}>
                    <td><strong>{log.full_name}</strong></td>
                    <td>{log.date}</td>
                    {/* Tô đậm nếu đi muộn */}
                    <td style={{ fontWeight: log.status === 'Muộn' ? 'bold' : 'normal', color: log.status === 'Muộn' ? '#d97706' : 'inherit' }}>
                        {log.checkIn}
                    </td>
                    <td style={{color: '#666'}}>{log.checkOut}</td>
                    <td>
                    <span className={`badge ${log.status === 'Muộn' ? 'warning' : 'success'}`}>
                        {log.status}
                    </span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        ) : (
            <p style={{padding: 20, color: '#666'}}>Chưa có dữ liệu chấm công nào.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;