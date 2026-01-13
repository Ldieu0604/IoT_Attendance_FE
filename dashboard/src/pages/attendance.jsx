// src/pages/attendance.jsx
import React, { useState, useEffect } from 'react';
import './attendance.css';
import { getAttendanceLogs } from '../services/api';

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const formatTime = (isoString) => {
        if (!isoString) return "--:--";
        const date = new Date(isoString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    // Hàm tự tính trạng thái dựa trên giờ vào
    const calculateStatus = (checkInIso) => {
        if (!checkInIso) return "Vắng";
        const timePart = checkInIso.split('T')[1]; // Lấy phần 08:05:00
        if (timePart > "09:00:00") return "Đi muộn";
        return "Đúng giờ";
    };

    useEffect(() => {
        const fetchLogs = async () => {
            if (!currentUser.id) return;

            setLoading(true);
            try {
                // 1. Gọi API lấy dữ liệu theo Tháng/Năm
                const data = await getAttendanceLogs(currentUser.id, selectedMonth, selectedYear);
                
                // 2. Map dữ liệu từ Backend sang format mà Frontend đang dùng
                const formattedData = data.map(item => ({
                    id: item.id,
                    emp_code: currentUser.username, // API history ko trả về mã NV, lấy tạm username
                    full_name: currentUser.full_name || "Bạn", // API history ko trả về tên
                    date: formatDate(item.work_date), // Chuyển YYYY-MM-DD -> DD/MM/YYYY
                    raw_date: item.work_date, // Giữ lại để lọc
                    check_in: formatTime(item.check_in),
                    check_out: formatTime(item.check_out),
                    status: calculateStatus(item.check_in)
                }));

                setLogs(formattedData);
            } catch (error) {
                console.error("Lỗi tải dữ liệu chấm công:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [selectedMonth, selectedYear, currentUser.id, currentUser.username, currentUser.full_name]);

    

    // Hàm lọc dữ liệu theo ngày
    const filteredLogs = filterDate 
        ? logs.filter(log => log.raw_date === filterDate) 
        : logs;

    return (
        <div className="page-container">
            {/* Header & Bộ lọc */}
            <div className="attendance-header">
                <h1>📅 Lịch sử chấm công</h1>
                <div className="filter-toolbar">
                    
                    {/* Nhóm 1: Chọn Tháng/Năm */}
                    <div className="filter-group">
                        <span className="filter-label">Thời gian:</span>
                        <select 
                            className="custom-select" 
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                        </select>

                        <select 
                            className="custom-select" 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(Number(e.target.value))}
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    {/* Nhóm 2: Lọc theo ngày cụ thể */}
                    <div className="filter-group">
                        <span className="filter-label">Tìm ngày cụ thể:</span>
                        <input 
                            type="date" 
                            className="custom-date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                        {filterDate && (
                            <button className="btn-clear" onClick={() => setFilterDate('')}>
                                ✕ Xóa lọc
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="table-wrapper">
                {loading ? (
                    <div style={{padding: '20px', textAlign: 'center'}}>⏳ Đang tải dữ liệu...</div>
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
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td><strong>{log.emp_code}</strong></td>
                                        <td>{log.full_name}</td>
                                        <td>{log.date}</td>
                                        <td style={{color: '#2563eb', fontWeight: 500}}>{log.check_in}</td>
                                        <td style={{color: '#64748b'}}>{log.check_out}</td>
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
                                        Không tìm thấy dữ liệu chấm công nào.
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