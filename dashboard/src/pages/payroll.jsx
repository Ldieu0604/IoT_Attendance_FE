import React, { useState, useEffect } from 'react';
import './payroll.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEmployees, getDailyAttendance, getSalaryConfigs } from '../services/api';

const Payroll = () => {
  const [payrollList, setPayrollList] = useState([]);
  const [salaryConfigs, setSalaryConfigs] = useState([]); // ✅ State lưu bảng lương từ API
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // --- 1. CÁC HÀM LOGIC ---
  const isValidWorkDay = (inTime, outTime) => inTime && outTime && inTime <= "09:00:00" && outTime >= "17:00:00";
  const isOTDay = (outTime) => outTime && outTime >= "18:00:00";
  const roundToThousand = (num) => Math.round(num / 1000) * 1000;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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


  // --- 3. TÍNH TOÁN DỮ LIỆU ---
  useEffect(() => {
    const calculateSalary = async () => {
        setLoading(true);
        try {
            const [empRes, logRes] = await Promise.all([
                getEmployees(),
                getDailyAttendance(null, null, 0, 3000) 
            ]);

            const employees = Array.isArray(empRes) ? empRes : [];
            const logs = Array.isArray(logRes) ? logRes : [];

            // Lọc log theo tháng
            const currentMonthLogs = logs.filter(log => {
                if (!log.work_date) return false;
                const d = new Date(log.work_date);
                return d.getMonth() + 1 === parseInt(selectedMonth) && 
                       d.getFullYear() === parseInt(selectedYear);
            });

            // Tính toán
            const calculatedData = employees.map(emp => {
                const empLogs = currentMonthLogs.filter(l => l.employee_id === emp.id);
                const validDays = empLogs.filter(log => isValidWorkDay(log.check_in, log.check_out)).length;
                const otDays = empLogs.filter(log => isOTDay(log.check_out)).length;

                // 🔥 LOGIC QUAN TRỌNG NHẤT Ở ĐÂY 🔥
                // Tìm cấu hình lương khớp với chức vụ nhân viên
                const config = salaryConfigs.find(c => c.position === emp.position);

                // Lấy lương từ API (Nếu ko có thì = 0)
                const baseSalary = config ? Number(config.monthly_salary) : 0;
                const otRate = config ? Number(config.bonus_salary) : 0;

                const STANDARD_DAYS = 22; 
                let totalSalary = 0;
                if (STANDARD_DAYS > 0) {
                    const salaryPerDay = baseSalary / STANDARD_DAYS;
                    totalSalary = (validDays * salaryPerDay) + (otDays * otRate);
                }

                return {
                    ...emp,
                    valid_days: validDays,
                    ot_days: otDays,
                    base_salary_display: baseSalary, // Dùng biến này để hiển thị
                    total_salary_final: roundToThousand(totalSalary)
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

    // Chỉ tính khi đã có config lương hoặc load lần đầu
    if (salaryConfigs.length > 0 || loading === false) {
        calculateSalary();
    }
  }, [selectedMonth, selectedYear, salaryConfigs]); // Chạy lại khi config thay đổi

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
              <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>⏳ Đang tính toán...</td></tr>
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

                            {/* HIỂN THỊ LƯƠNG TỪ API */}
                            <td className="text-right">{formatCurrency(emp.base_salary_display)}</td>
                            
                            {/* TỔNG THỰC NHẬN */}
                            <td className="text-right total-cell">
                                {formatCurrency(emp.total_salary_final)}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="7" style={{textAlign:'center', padding: 20}}>Không có dữ liệu.</td></tr>
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;