import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEmployees, getDailyAttendance } from '../services/api';

const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  
  // Sửa lỗi 1: Dùng đúng tên biến state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // --- 1. LOGIC TÍNH TOÁN "GẮT GAO" ---

  // Kiểm tra công: Check-in <= 9h và Check-out >= 17h
  const isValidWorkDay = (checkInStr, checkOutStr) => {
      if (!checkInStr || !checkOutStr) return false;
      return checkInStr <= "09:00:00" && checkOutStr >= "17:00:00";
  };

  // Kiểm tra OT: Check-out >= 18h
  const isOTDay = (checkOutStr) => {
      if (!checkOutStr) return false;
      return checkOutStr >= "18:00:00";
  };

  // Format tiền tệ
  const formatCurrency = (amount) => {
    let value = amount ? Number(amount) : 0;
    value = Math.round(value); 
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // --- 2. TÍNH TOÁN DỮ LIỆU ---
  useEffect(() => {
    const calculateSalary = async () => {
        setLoading(true);
        try {
            // Lấy dữ liệu thô để tự tính (Thay vì lấy sẵn từ getSalaryStats)
            const [empRes, logRes] = await Promise.all([
                getEmployees(),
                getDailyAttendance(null, null, 0, 3000) 
            ]);

            const employees = Array.isArray(empRes) ? empRes : [];
            const logs = Array.isArray(logRes) ? logRes : [];

            // Lọc log theo tháng đang chọn
            const currentMonthLogs = logs.filter(log => {
                if (!log.work_date) return false;
                const logDate = new Date(log.work_date);
                return logDate.getMonth() + 1 === parseInt(selectedMonth) && 
                       logDate.getFullYear() === parseInt(selectedYear);
            });

            // Map dữ liệu và Tính tiền
            const calculatedData = employees.map(emp => {
                const empLogs = currentMonthLogs.filter(l => l.employee_id === emp.id);

                // A. Đếm ngày công chuẩn (Logic mới)
                const validDays = empLogs.filter(log => isValidWorkDay(log.check_in, log.check_out)).length;

                // B. Đếm ngày OT (Logic mới)
                const otDays = empLogs.filter(log => isOTDay(log.check_out)).length;

                // C. Tính tiền
                const STANDARD_DAYS = 22; // Công chuẩn
                const baseSalary = Number(emp.base_salary || 5000000);
                const otRateDay = Number(emp.ot_rate || 200000); // Giả sử 200k/ngày OT

                const salaryPerDay = baseSalary / STANDARD_DAYS;
                const totalSalary = (validDays * salaryPerDay) + (otDays * otRateDay);

                return {
                    ...emp,
                    valid_days: validDays,
                    ot_days: otDays,
                    total_salary_estimated: Math.round(totalSalary)
                };
            });

            setPayrollList(calculatedData);
        } catch (error) {
            console.error("Lỗi tính lương:", error);
            setPayrollList([]);
        } finally {
            setLoading(false);
        }
    };

    calculateSalary();
  }, [selectedMonth, selectedYear]); // Chạy lại khi đổi tháng/năm

  // --- 3. XUẤT PDF ---
  const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Bang Luong Thang ${selectedMonth}/${selectedYear}`, 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [['Ma NV', 'Ho Ten', 'Chuc Vu', 'Ngay Cong', 'Ngay OT', 'Luong Cung', 'Thuc Nhan']],
      body: payrollList.map(emp => [
        emp.emp_code,
        removeVietnameseTones(emp.full_name),
        emp.position,
        `${emp.valid_days}/22`,     // Dữ liệu đã tính toán
        `${emp.ot_days} ngay`,      // Dữ liệu đã tính toán
        formatCurrency(emp.base_salary), 
        formatCurrency(emp.total_salary_estimated)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
    });

    doc.save(`Bang_Luong_T${selectedMonth}_${selectedYear}.pdf`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💰 Bảng Lương (Tháng {selectedMonth}/{selectedYear})</h1>
        <div className="filter-group">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <button className="btn-export" onClick={handleExportPDF}>🖨️ Xuất PDF</button>
        </div>
      </div>

      <div className="employee-table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ tên</th>
              <th>Chức vụ</th>
              <th className="text-center">Công chuẩn (22)</th>
              <th className="text-center">Số ngày OT</th>
              <th className="text-right">Lương cứng</th>
              <th className="text-right">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>⏳ Đang tính toán lại lương...</td></tr>
            ) : (
                payrollList.length > 0 ? (
                    payrollList.map((emp, index) => (
                        <tr key={emp.id || index}>
                            <td>{emp.emp_code}</td>
                            <td><strong>{emp.full_name}</strong></td>
                            <td><span className={`badge-pos ${emp.position}`}>{emp.position}</span></td>
                            
                            {/* Ngày công */}
                            <td className="text-center">
                                <span style={{fontWeight:'bold', color: (emp.valid_days) < 22 ? '#ef4444' : '#10b981'}}>
                                    {emp.valid_days}
                                </span>
                                <span style={{color:'#888', fontSize:'0.8em'}}>/22</span>
                            </td>

                            {/* Ngày OT */}
                            <td className="text-center" style={{color: '#d97706', fontWeight:'bold'}}>
                                {emp.ot_days > 0 ? `+${emp.ot_days} ngày` : '-'}
                            </td>

                            {/* Lương cứng */}
                            <td className="text-right">{formatCurrency(emp.base_salary)}</td>
                            
                            {/* Tổng thực nhận */}
                            <td className="text-right total-cell">
                                {formatCurrency(emp.total_salary_estimated)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>Không có dữ liệu chấm công tháng này.</td></tr>
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;