import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { useNavigate } from 'react-router-dom';
import { FaUserFriends, FaUserCheck, FaUserTimes, FaClock, FaWifi, FaLock, FaUnlock, FaDoorOpen } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getEmployees, getDailyAttendance, getDeviceStatus, openDoor, getDashboardStats } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState([]);

  const [doorStatus, setDoorStatus] = useState('LOCKED');
  const [deviceConnected, setDeviceConnected] = useState(false);
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
        const employees = await getEmployees();
        const totalEmp = employees.length || 0;

            //Lấy log chấm công hôm nay
        const today = new Date().toISOString().split('T')[0];
        const logs = await getDailyAttendance(today, null, 0, 500);

            //Xử lý dữ liệu hiển thị
        const processedLogs = logs.map(log => {
              const empInfo = employees.find(e => e.id === log.employee_id) || {};
              const checkInTime = log.check_in || (log.created_at ? log.created_at.split('T')[1].split('.')[0] : null);
                
                return {
                    ...log,
                    full_name: log.full_name || empInfo.full_name || `NV #${log.employee_id}`,
                    date: log.work_date || today,
                    checkIn: checkInTime || '--:--',
                    checkOut: log.check_out || '--:--',
                    status: checkIsLate(checkInTime) ? 'Muộn' : 'Đúng giờ'
                };
            });

            setAttendanceLogs(processedLogs);

            //Tính toán thống kê
            const presentCount = processedLogs.length;
            const lateCount = processedLogs.filter(l => l.status === 'Muộn').length;
            const absentCount = totalEmp > presentCount ? totalEmp - presentCount : 0;

            setStats({
                total: totalEmp,
                present: presentCount,
                absent: absentCount,
                late: lateCount
            });

            const chartRes = await getDashboardStats();
            const rawData = Array.isArray(chartRes) ? chartRes : (chartRes?.data || []);
            console.log("Dữ liệu biểu đồ từ API:", rawData);
            const mappedChartData = rawData.map(item => ({
            // 1. Tạo trường 'name' cho trục X
            // API có thể trả về 'date', 'day', 'work_date'... ta map hết về 'name'
            name: item.name || item.day_name || item.date || item.work_date || 'N/A',
            
            // 2. Ép kiểu về Số (Number) để vẽ cột (tránh lỗi nếu API trả về string "5")
            // Map các trường tương ứng từ API về tên chuẩn: present, late, absent
            present: Number(item.present || item.total_present || item.di_lam || 0),
            late: Number(item.late || item.total_late || item.di_muon || 0),
            absent: Number(item.absent || item.total_absent || item.vang || 0)
        }));

        setChartData(mappedChartData);
            if (chartRes && Array.isArray(chartRes)) {
            setChartData(chartRes);
        } else if (chartRes && chartRes.data && Array.isArray(chartRes.data)) {
            // Trường hợp API trả về dạng { status: 'success', data: [...] }
            setChartData(chartRes.data);
        } else {
            // Nếu API chưa có dữ liệu, dùng mảng rỗng hoặc dữ liệu mẫu tạm thời
            setChartData([]);
        }

            // Lấy trạng thái thiết bị IoT
            const DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0"; 
            const statusData = await getDeviceStatus(DEVICE_ID);
            
            const isOnline = statusData?.status?.toLowerCase() === 'online';
            setDeviceConnected(isOnline);

            if (statusData && statusData.door_state) {
                setDoorStatus(statusData.door_state.toUpperCase());
            } else {
                setDoorStatus('LOCKED');
            }

        } catch (error) {
            console.error("Lỗi cập nhật Dashboard:", error);
            // Nếu lỗi kết nối thiết bị thì đánh dấu offline
            if (error.code === "ERR_NETWORK" || error.response?.status >= 500) {
                 setDeviceConnected(false);
            }
        } finally {
            setLoading(false);
        }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handlePing = async () => {
    const DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0";
    try {
        alert("Đang kiểm tra kết nối tới ESP32...");
        const data = await getDeviceStatus(DEVICE_ID);
        
        const isOnline = data?.status?.toLowerCase() === 'online';
        setDeviceConnected(isOnline);

        if (isOnline) {
            alert("Kết nối ổn định! Thiết bị đang Online.");
            if (data.door_state) setDoorStatus(data.door_state.toUpperCase());
        } else {
            alert("Thiết bị đang offline.");
        }
    } catch (error) {
        console.error("Ping lỗi:", error); // Đã sửa lỗi no-unused-vars
        setDeviceConnected(false);
        alert("Không tìm thấy thiết bị.");
    }
  };

  const handleDoorControl = async () => {
    setDoorLoading(true);
    const DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0"; 
    
    try {
        if (doorStatus === 'LOCKED') {
            // --- QUY TRÌNH 1: MỞ CỬA ---
            // Gọi API thật để mở chốt
            await openDoor(DEVICE_ID); 
            
            // B1: Rút chốt khóa (UNLOCKED)
            setDoorStatus('UNLOCKED');

            // B2: Giả lập 2s sau người dùng đẩy cửa ra (OPEN)
            setTimeout(() => {
                setDoorStatus('OPEN');
                setDoorLoading(false);
            }, 2000);

        } else if (doorStatus === 'OPEN') {
            
            setDoorStatus('LOCKED');
            setDoorLoading(false);
        }
    } catch (error) {
        console.error("Lỗi không kết nối:", error);
        alert("Không thể kết nối tới thiết bị!")
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
            return <div className="door-status-badge unknown" style={{backgroundColor: '#94a3b8', color: 'white'}}>
                <span>⚠️ Mất tín hiệu cửa</span>
            </div>;
    }
  };

  const getButtonText = () => {
      if (doorLoading) return 'Đang xử lý...';
      if (doorStatus === 'LOCKED') return 'Mở khóa cửa';
      if (doorStatus === 'UNLOCKED') return 'Đang mở cửa...';
      if (doorStatus === 'OPEN') return 'Khép cửa lại';
      return 'Không thể điều khiển';
  };

  if (loading) {
    return <div style={{padding: '20px'}}>⏳ Đang tải dữ liệu Dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="page-title">📊 Tổng quan</h1>

      {/* 1. Các thẻ thống kê */}
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
            <BarChart data={chartData}
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
          <div className={`status-indicator ${deviceConnected ? 'online' : 'offline'}`}>
            <FaWifi className="wifi-icon" />
            <span>{deviceConnected ? 'ESP32 Đang Online' : 'Mất kết nối'}</span>
          </div>
          <p className="last-sync">Cập nhật lúc: {new Date().toLocaleTimeString()}</p>
          <button className="btn-ping" onClick={handlePing}>Kiểm tra kết nối</button>
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

      {/* 3. Danh sách hoạt động gần đây */}
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