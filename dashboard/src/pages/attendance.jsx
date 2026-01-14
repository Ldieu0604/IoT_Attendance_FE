import React, { useState, useEffect } from 'react';
import './attendance.css';
import { getDailyAttendance } from '../services/api';

const Attendance = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Thời gian hiện tại
    const today = new Date();
    // Mặc định chọn ngày 0 (Tức là "Tất cả")
    const [selectedDay, setSelectedDay] = useState(0); 
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Hàm lấy số ngày trong tháng
    const getDaysInMonth = (month, year) => {
        return new Date(year, month, 0).getDate();
    };

    const formatTime = (timeString) => {
        if (!timeString) return "--:--";
        if (timeString.includes('T')) {
             return timeString.split('T')[1].substring(0, 5);
        }
        return timeString.substring(0, 5);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        // dateString có thể là YYYY-MM-DD hoặc YYYY-MM-DDThh:mm:ss
        const justDate = dateString.split('T')[0];
        const [y, m, d] = justDate.split('-');
        return `${d}/${m}/${y}`;
    };

    const calculateStatus = (checkInTime) => {
        if (!checkInTime) return "Vắng";
        const timePart = checkInTime.includes('T') ? checkInTime.split('T')[1] : checkInTime;
        return timePart > "09:00:00" ? "Đi muộn" : "Đúng giờ";
    };

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                let workDate = '';
                
                // LOGIC QUAN TRỌNG:
                // Nếu selectedDay > 0 (người dùng chọn ngày cụ thể) -> Gửi ngày đó
                // Nếu selectedDay == 0 (Chọn tất cả) -> Gửi chuỗi rỗng '' (API sẽ trả về hết)
                if (selectedDay > 0) {
                    const d = String(selectedDay).padStart(2, '0');
                    const m = String(selectedMonth).padStart(2, '0');
                    workDate = `${selectedYear}-${m}-${d}`;
                }

                console.log("Fetching với work_date:", workDate || "ALL");

                // Gọi API (Lấy 1000 bản ghi mới nhất)
                const data = await getDailyAttendance(workDate, null, 0, 1000);

                // Map dữ liệu
                let formattedData = data.map(log => ({
                    id: log.id,
                    emp_code: log.emp_code || `NV${log.employee_id}`,
                    full_name: log.full_name || "---",
                    date: log.work_date || '', // Giữ nguyên dạng YYYY-MM-DD để lọc
                    displayDate: formatDate(log.work_date), // Dạng hiển thị DD/MM/YYYY
                    check_in: formatTime(log.check_in),
                    check_out: formatTime(log.check_out),
                    status: calculateStatus(log.check_in)
                }));

                // (Tùy chọn) Nếu chọn "Tất cả", ta có thể lọc thêm ở Client theo Tháng/Năm 
                // để tránh hiện dữ liệu của tháng cũ quá xa
                if (selectedDay === 0) {
                     const filterPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                     formattedData = formattedData.filter(item => item.date.startsWith(filterPrefix));
                }

                // Sắp xếp ngày mới nhất lên đầu
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
    }, [selectedDay, selectedMonth, selectedYear]);

    return (
        <div className="page-container">
            <div className="attendance-header">
                <h1>📅 Lịch sử chấm công</h1>
                
                <div className="filter-toolbar">
                    <div className="filter-group">
                        <span className="filter-label">Lọc theo:</span>
                        
                        {/* Chọn Ngày: Thêm option "Tất cả" ở đầu */}
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

                        {/* Chọn Tháng */}
                        <select 
                            className="custom-select"
                            value={selectedMonth}
                            onChange={e => {
                                setSelectedMonth(Number(e.target.value));
                                setSelectedDay(0); // Reset về "Tất cả" khi đổi tháng cho tiện
                            }}
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                        </select>

                        <span className="slash">/</span>

                        {/* Chọn Năm */}
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
                                        <td><strong>{log.emp_code}</strong></td>
                                        <td>{log.full_name}</td>
                                        <td>{log.displayDate}</td>
                                        <td style={{color: '#2563eb', fontWeight: 600}}>{log.check_in}</td>
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