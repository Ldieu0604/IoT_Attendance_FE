import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEmployees, getSalaryConfigs } from '../services/api';

const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  const [salaryConfigs, setSalaryConfigs] = useState([]); 
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // --- 1. CÁC HÀM HỖ TRỢ ---
  const roundToThousand = (num) => Math.round(num / 1000) * 1000;
  
  const formatCurrency = (amount) => {
    const value = (amount && !isNaN(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // --- 2. GỌI API LẤY BẢNG LƯƠNG ---
  useEffect(() => {
      const fetchConfigs = async () => {
          const data = await getSalaryConfigs(selectedYear, selectedMonth);
          if (Array.isArray(data)) {
              setSalaryConfigs(data);
          } else {
              setSalaryConfigs([]);
          }
      };
      fetchConfigs();
  }, [selectedMonth, selectedYear]);

  // --- 3. TÍNH TOÁN HIỂN THỊ ---
  useEffect(() => {
    const calculateSalary = async () => {
        setLoading(true);
        try {
            // Chỉ cần lấy danh sách nhân viên để hiện tên
            const empRes = await getEmployees();
            const employees = Array.isArray(empRes) ? empRes : [];

            // Map dữ liệu từ API Lương (salaryConfigs) vào nhân viên
            const calculatedData = employees.map(emp => {
                
                // Tìm dữ liệu lương của NV này (So khớp bằng Mã NV)
                const salaryData = salaryConfigs.find(s => s.emp_code === emp.emp_code);

                let baseSalary = 0;
                let totalSalary = 0;
                let validDays = 0;
                let otDays = 0;

                // Nếu Backend có trả về dữ liệu lương cho nhân viên này
                if (salaryData) {
                    baseSalary = Number(salaryData.base_salary_fix) || 0;
                    totalSalary = Number(salaryData.total_salary_estimated) || 0;
                    validDays = Number(salaryData.working_days) || 0;
                    otDays = Number(salaryData.overtime_days) || 0;
                }

                return {
                    ...emp,
                    valid_days: validDays,
                    ot_days: otDays,
                    base_salary_display: baseSalary,
                    total_salary_final: roundToThousand(totalSalary)
                };
            });

            setPayrollList(calculatedData);
        } catch (error) {
            console.error("Lỗi xử lý dữ liệu:", error);
            setPayrollList([]);
        } finally {
            setLoading(false);
        }
    };

        calculateSalary();
  }, [selectedMonth, selectedYear, salaryConfigs]);

  // --- 4. XUẤT PDF ---
  const removeVietnameseTones = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D') : '';

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Bang Luong Thang ${selectedMonth}/${selectedYear}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Ma NV', 'Ho Ten', 'Chuc Vu', 'Cong', 'OT', 'Luong Cung', 'Thuc Nhan']],
      body: payrollList.map(emp => [
        emp.emp_code,
        removeVietnameseTones(emp.full_name),
        emp.position,
        `${emp.valid_days}/22`,     
        `${emp.ot_days}`,      
        formatCurrency(emp.base_salary_display), 
        formatCurrency(emp.total_salary_final)
      ]),
      theme: 'grid',
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
              <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>⏳ Đang tải dữ liệu...</td></tr>
            ) : (
                payrollList.length > 0 ? (
                    payrollList.map((emp, index) => (
                        <tr key={index}>
                            <td>{emp.emp_code}</td>
                            <td><strong>{emp.full_name}</strong></td>
                            <td><span className={`badge-pos ${emp.position?.replace(/\s/g, '')}`}>{emp.position}</span></td>
                            
                            <td className="text-center">
                                <span style={{fontWeight:'bold', color: (emp.valid_days) < 22 ? '#ef4444' : '#10b981'}}>
                                    {emp.valid_days}
                                </span>
                                <span style={{color:'#888', fontSize:'0.8em'}}>/22</span>
                            </td>

                            <td className="text-center" style={{color: '#d97706', fontWeight:'bold'}}>
                                {emp.ot_days > 0 ? `+${emp.ot_days}` : '-'}
                            </td>

                            <td className="text-right">{formatCurrency(emp.base_salary_display)}</td>
                            
                            <td className="text-right total-cell">
                                {formatCurrency(emp.total_salary_final)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>Chưa có dữ liệu.</td></tr>
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;