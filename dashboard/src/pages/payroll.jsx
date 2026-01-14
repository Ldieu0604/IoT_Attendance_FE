import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSalaryStats } from '../services/api'; // 1. Import API

const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Format tiền tệ an toàn (tránh lỗi nếu null/undefined)
  const formatCurrency = (amount) => {
    const value = amount ? Number(amount) : 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // --- 2. GỌI API THẬT ---
  useEffect(() => {
    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            // Gọi API lấy dữ liệu đã tính toán từ Backend
            const data = await getSalaryStats(month, year);
            
            if (Array.isArray(data)) {
                setPayrollList(data);
            } else {
                setPayrollList([]);
            }
        } catch (error) {
            console.error(error);
            setPayrollList([]);
        } finally {
            setLoading(false);
        }
    };

    fetchPayrollData();
  }, [month, year]); // Chạy lại khi đổi tháng/năm

  // Hàm xử lý tiếng Việt cho PDF
  const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  const formatCurrencyPDF = (amount) => {
    return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
  };

  // --- 3. XUẤT PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Bang Luong Thang ${month}/${year}`, 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [['Ma NV', 'Ho Ten', 'Chuc Vu', 'Ngay Cong', 'Tang Ca (h)', 'Luong Cung', 'Thuong', 'Thuc Nhan']],
      body: payrollList.map(emp => [
        emp.emp_code,
        removeVietnameseTones(emp.full_name),
        emp.position,
        `${emp.work_days || 0}/30`,    // Số ngày công
        emp.overtime_hours || 0,       // Số giờ tăng ca
        formatCurrencyPDF(emp.monthly_salary), // Lương cứng (khớp DB)
        formatCurrencyPDF(emp.bonus_salary),   // Thưởng (khớp DB)
        formatCurrencyPDF(emp.total_salary)    // Tổng thực nhận
      ]),
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
    });

    doc.save(`Bang_Luong_T${month}_${year}.pdf`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💰 Bảng Lương (Tháng {month}/{year})</h1>
        
        <div className="filter-group">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
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
              <th className="text-center">Công chuẩn</th>
              <th className="text-center">Tăng ca (h)</th>
              <th className="text-right">Lương cứng</th>
              <th className="text-right">Thưởng</th>
              <th className="text-right">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign:'center', padding: 20}}>⏳ Đang tải dữ liệu từ server...</td></tr>
            ) : (
                payrollList.length > 0 ? (
                    payrollList.map((emp, index) => (
                        <tr key={emp.id || index}>
                            <td>{emp.emp_code}</td>
                            <td><strong>{emp.full_name}</strong></td>
                            
                            {/* Hiển thị chức vụ */}
                            <td><span className={`badge-pos ${emp.position}`}>{emp.position}</span></td>
                            
                            {/* Ngày công */}
                            <td className="text-center">
                                <span style={{fontWeight:'bold', color: (emp.work_days || 0) < 26 ? '#ef4444' : '#10b981'}}>
                                    {emp.work_days || 0}
                                </span>
                                <span style={{color:'#888', fontSize:'0.8em'}}>/30</span>
                            </td>

                            {/* Tăng ca */}
                            <td className="text-center" style={{color: '#d97706', fontWeight:'bold'}}>
                                {(emp.overtime_hours || 0) > 0 ? `+${emp.overtime_hours}h` : '-'}
                            </td>

                            {/* Các cột tiền - Map đúng với tên cột trong DB của bạn */}
                            <td className="text-right">{formatCurrency(emp.monthly_salary)}</td>
                            
                            <td className="text-right" style={{color:'#10b981'}}>
                                {(emp.bonus_salary || 0) > 0 ? `+${formatCurrency(emp.bonus_salary)}` : '0 ₫'}
                            </td>

                            <td className="text-right total-cell">
                                {formatCurrency(emp.total_salary)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="8" style={{textAlign:'center', padding: 20}}>Không có dữ liệu lương tháng này.</td></tr>
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;