import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSalaryStats } from '../services/api';

const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) => {
    const value = amount ? Number(amount) : 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatMinutesToHours = (minutes) => {
      if (!minutes) return 0;
      return (minutes / 60).toFixed(1); 
  };

  useEffect(() => {
    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            const data = await getSalaryStats(month, year);
            
            // LOGIC MỚI: Dữ liệu nằm trong data.employees
            if (data && Array.isArray(data.employees)) {
                setPayrollList(data.employees);
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
  }, [month, year]);

  // --- XUẤT PDF ---
  const removeVietnameseTones = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  }

  const formatCurrencyPDF = (amount) => {
    return (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Bang Luong Thang ${month}/${year}`, 14, 15);

    autoTable(doc, {
      startY: 20,
      head: [['Ma NV', 'Ho Ten', 'Chuc Vu', 'Ngay Cong', 'Tang Ca (h)', 'Luong Cung', 'Tien OT', 'Thuc Nhan']],
      body: payrollList.map(emp => [
        emp.emp_code,
        removeVietnameseTones(emp.full_name),
        emp.position,
        `${emp.working_days || 0}/30`,    
        formatMinutesToHours(emp.overtime_minutes), // Đổi phút ra giờ
        formatCurrencyPDF(emp.base_salary),         // Lương hợp đồng
        formatCurrencyPDF(emp.overtime_salary),     // Tiền OT (Backend đã tính)
        formatCurrencyPDF(emp.total_salary_estimated) // Tổng thực nhận
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
          {/* ... (Phần Select Tháng/Năm giữ nguyên) ... */}
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
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
              <th className="text-right">Tiền OT</th>
              <th className="text-right">Thực nhận</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign:'center', padding: 20}}>⏳ Đang tính toán lương...</td></tr>
            ) : (
                payrollList.length > 0 ? (
                    payrollList.map((emp, index) => (
                        <tr key={emp.employee_id || index}>
                            <td>{emp.emp_code}</td>
                            <td><strong>{emp.full_name}</strong></td>
                            <td><span className={`badge-pos ${emp.position}`}>{emp.position}</span></td>
                            
                            {/* Ngày công: Backend trả về working_days */}
                            <td className="text-center">
                                <span style={{fontWeight:'bold', color: (emp.working_days || 0) < 26 ? '#ef4444' : '#10b981'}}>
                                    {emp.working_days || 0}
                                </span>
                                <span style={{color:'#888', fontSize:'0.8em'}}>/30</span>
                            </td>

                            {/* Tăng ca: Backend trả về phút -> chia 60 ra giờ */}
                            <td className="text-center" style={{color: '#d97706', fontWeight:'bold'}}>
                                {(emp.overtime_minutes || 0) > 0 ? `+${formatMinutesToHours(emp.overtime_minutes)}h` : '-'}
                            </td>

                            {/* Lương cứng (Hợp đồng): base_salary */}
                            <td className="text-right">{formatCurrency(emp.base_salary)}</td>
                            
                            {/* Tiền OT: overtime_salary */}
                            <td className="text-right" style={{color:'#10b981'}}>
                                {(emp.overtime_salary || 0) > 0 ? `+${formatCurrency(emp.overtime_salary)}` : '-'}
                            </td>

                            {/* Tổng thực nhận: total_salary_estimated */}
                            <td className="text-right total-cell">
                                {formatCurrency(emp.total_salary_estimated)}
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