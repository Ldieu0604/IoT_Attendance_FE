import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- 1. ĐƯA DỮ LIỆU MOCK VÀ HÀM TÍNH TOÁN RA NGOÀI COMPONENT ---
// Việc này giúp chúng trở thành biến tĩnh, React sẽ không bắt bẻ trong useEffect nữa.

const MOCK_DATA = [
    {
      id: 1,
      emp_code: 'NV001',
      full_name: 'Mai Hoàng Minh',
      position: 'Manager',
      monthly_salary: 30000000,
      bonus_salary: 700000,
      overtime_rate: 200000,
      work_days: 30,
      overtime_hours: 10,
    },
    {
      id: 2,
      emp_code: 'NV002',
      full_name: 'Trần Thị Lan',
      position: 'Dev_Mobile',
      monthly_salary: 15000000,
      bonus_salary: 500000,
      overtime_rate: 100000,
      work_days: 28,
      overtime_hours: 5.5,
    },
    {
      id: 3,
      emp_code: 'NV003',
      full_name: 'Vũ Mạnh Hưng',
      position: 'Intern',
      monthly_salary: 5000000,
      bonus_salary: 0,
      overtime_rate: 30000,
      work_days: 20,
      overtime_hours: 0,
    },
    {
      id: 4,
      emp_code: 'NV004',
      full_name: 'Nguyễn Văn A',
      position: 'Tester',
      monthly_salary: 12000000,
      bonus_salary: 100000,
      overtime_rate: 80000,
      work_days: 30,
      overtime_hours: 12,
    }
];

const calculateSalary = (data) => {
    return data.map(emp => {
        const dailyRate = emp.monthly_salary / 30;
        const baseSalaryReceived = dailyRate * emp.work_days;
        const overtimePay = emp.overtime_hours * emp.overtime_rate;
        const total = baseSalaryReceived + overtimePay + emp.bonus_salary;

        return {
            ...emp,
            total_salary: Math.round(total)
        };
    });
};

// --- 2. COMPONENT CHÍNH ---
const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Định dạng tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // useEffect giờ sẽ sạch sẽ, không báo lỗi
  useEffect(() => {
    const fetchPayrollData = async () => {
        setLoading(true);
        
        // Giả lập chờ 0.5 giây
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const calculatedData = calculateSalary(MOCK_DATA);
        setPayrollList(calculatedData);
        setLoading(false);
    };

    fetchPayrollData();
  }, [month, year]);

  const removeVietnameseTones = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
const formatCurrencyPDF = (amount) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " VND";
};
  // --- 3. HÀM XỬ LÝ XUẤT PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Tiêu đề file PDF (Dùng không dấu để tránh lỗi font)
    doc.text(`Bang Luong Thang ${month}/${year}`, 14, 15);

    // Tạo bảng
    autoTable(doc, {
      startY: 20,
      head: [['Ma NV', 'Ho Ten', 'Chuc Vu', 'Ngay Cong', 'Tang Ca (h)', 'Luong Cung', 'Thuong', 'Thuc Nhan']],
      
      // Định nghĩa dữ liệu (Body)
      body: payrollList.map(emp => [
        emp.emp_code,
        removeVietnameseTones(emp.full_name),
        emp.position,
        `${emp.work_days}/30`,
        emp.overtime_hours,
        formatCurrencyPDF(emp.monthly_salary), 
        formatCurrencyPDF(emp.bonus_salary),
        formatCurrencyPDF(emp.total_salary)
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
                <tr><td colSpan="8" style={{textAlign:'center', padding: 20}}>⏳ Đang tính toán...</td></tr>
            ) : (
                payrollList.map((emp) => (
                    <tr key={emp.id}>
                        <td>{emp.emp_code}</td>
                        <td><strong>{emp.full_name}</strong></td>
                        <td><span className={`badge-pos ${emp.position}`}>{emp.position}</span></td>
                        
                        <td className="text-center">
                            <span style={{fontWeight:'bold', color: emp.work_days < 30 ? '#ef4444' : '#10b981'}}>
                                {emp.work_days}
                            </span>
                            <span style={{color:'#888', fontSize:'0.8em'}}>/30</span>
                        </td>

                        <td className="text-center" style={{color: '#d97706', fontWeight:'bold'}}>
                            {emp.overtime_hours > 0 ? `+${emp.overtime_hours}h` : '-'}
                        </td>

                        <td className="text-right">{formatCurrency(emp.monthly_salary)}</td>
                        
                        <td className="text-right" style={{color:'#10b981'}}>
                            {emp.bonus_salary > 0 ? `+${formatCurrency(emp.bonus_salary)}` : '0'}
                        </td>

                        <td className="text-right total-cell">
                            {formatCurrency(emp.total_salary)}
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;