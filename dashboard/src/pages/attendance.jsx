import React, { useState, useEffect } from 'react';
import './attendance.css';
import { getDailyAttendance, getEmployees } from '../services/api'; // Thêm getEmployees

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [employees, setEmployees] = useState([]); // List dùng để tra cứu tên
    const [loading, setLoading] = useState(false);

    // Thời gian hiện tại
    const today = new Date();
    // Mặc định chọn "Tất cả các ngày"
    const [selectedDay, setSelectedDay] = useState(0); 
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // 1. Lấy danh sách nhân viên để tra cứu tên/mã
    useEffect(() => {
        const fetchEmpList = async () => {
            try {
                const list = await getEmployees();
                setEmployees(list);
            } catch (error) {
                console.error("Lỗi lấy DS nhân viên:", error);
            }
        };
        fetchEmpList();
    }, []);

    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    const formatTime = (timeString) => {
        if (!timeString) return "--:--:--";
        
        if (timeString.includes('T')) {
             return timeString.split('T')[1].split('.')[0];
        }
    
        if (timeString.length === 5) return timeString + ":00";
        
        return timeString;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const justDate = dateString.split('T')[0];
        const [y, m, d] = justDate.split('-');
        return `${d}/${m}/${y}`;
    };

    const calculateStatus = (checkInTime) => {
        if (!checkInTime) return "Vắng";
        const timePart = checkInTime.includes('T') ? checkInTime.split('T')[1] : checkInTime;
        return timePart > "09:00:00" ? "Đi muộn" : "Đúng giờ";
    };

    // 2. Gọi API chấm công
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                let workDate = '';
                if (selectedDay > 0) {
                    const d = String(selectedDay).padStart(2, '0');
                    const m = String(selectedMonth).padStart(2, '0');
                    workDate = `${selectedYear}-${m}-${d}`;
                }

                const data = await getDailyAttendance(workDate, null, 0, 1000);

                // --- MAP DỮ LIỆU & TRA CỨU TÊN ---
                let formattedData = data.map(log => {
                    // Tìm thông tin nhân viên trong list employees dựa vào ID
                    const empInfo = employees.find(e => e.id === log.employee_id) || {};

                    return {
                        id: log.id,
                        emp_code: empInfo.emp_code || log.emp_code || `ID:${log.employee_id}`,
                        full_name: empInfo.full_name || log.full_name || "Không xác định",
                        
                        date: log.work_date || '',
                        displayDate: formatDate(log.work_date),
                        check_in: formatTime(log.check_in),
                        check_out: formatTime(log.check_out),
                        status: calculateStatus(log.check_in)
                    };
                });

                if (selectedDay === 0) {
                     const filterPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                     formattedData = formattedData.filter(item => item.date.startsWith(filterPrefix));
                }
                formattedData.sort((a, b) => new Date(b.date) - new Date(a.date));

                setLogs(formattedData);
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        
    }, [selectedDay, selectedMonth, selectedYear, employees]);

    return (
        <div className="page-container">
            <div className="attendance-header">
                <h1>📅 Lịch sử chấm công</h1>
                
                <div className="filter-toolbar">
                    <div className="filter-group">
                        <span className="filter-label">Lọc theo:</span>
                        
                        <select 
                            className="custom-select"
                            value={selectedDay}
                            onChange={e => setSelectedDay(Number(e.target.value))}
                            style={{fontWeight: selectedDay === 0 ? 'bold' : 'normal'}}
                        >
                            <option value={0}>-- Tất cả các ngày --</option>
                            {[...Array(getDaysInMonth(selectedMonth, selectedYear))].map((_, i) => (
                                <option key={i} value={i + 1}>Ngày {i + 1}</option>
                            ))}
                        </select>

                        <span className="slash">/</span>

                        <select 
                            className="custom-select"
                            value={selectedMonth}
                            onChange={e => {
                                setSelectedMonth(Number(e.target.value));
                                setSelectedDay(0);
                            }}
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                        </select>

                        <span className="slash">/</span>

                        <select 
                            className="custom-select"
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                        >
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div style={{padding: '40px', textAlign: 'center'}}>⏳ Đang tải dữ liệu...</div>
                ) : (
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Mã NV</th>
                                <th>Họ và Tên</th>
                                <th>Ngày</th>
                                <th>Giờ vào</th>
                                <th>Giờ ra</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length > 0 ? (
                                logs.map((log, index) => (
                                    <tr key={index}>
                                        {/* Hiển thị Mã NV chuẩn từ Database */}
                                        <td><strong>{log.emp_code}</strong></td>
                                        
                                        {/* Hiển thị Tên chuẩn từ Database */}
                                        <td>{log.full_name}</td>
                                        
                                        <td>{log.displayDate}</td>
                                        
                                        {/* Giờ có cả giây */}
                                        <td style={{color: '#2563eb', fontWeight: 600, fontFamily: 'monospace'}}>
                                            {log.check_in}
                                        </td>
                                        
                                        <td style={{color: '#64748b', fontFamily: 'monospace'}}>
                                            {log.check_out}
                                        </td>
                                        
                                        <td>
                                            <span className={`status-tag ${log.status === 'Đúng giờ' ? 'ok' : 'late'}`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>
                                        Không tìm thấy dữ liệu nào trong tháng {selectedMonth}/{selectedYear}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Attendance;