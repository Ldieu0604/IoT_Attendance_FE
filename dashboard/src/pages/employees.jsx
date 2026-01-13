import React, { useState, useEffect, useCallback } from 'react';
import './employees.css';
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee, 
    setupFingerprint, 
    deleteFingerprint
} from '../services/api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true); 
  
  // --- STATE CHO MODAL FORM (THAY VÌ INLINE EDIT) ---
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [createdUser, setCreatedUser] = useState(null); // Lưu thông tin acc vừa tạo để hiển thị

  // Dữ liệu Form
  const [formData, setFormData] = useState({
      id: null,
      full_name: '',
      gender: 'Nam',
      dob: '',
      phone_number: '',
      email: '',
      start_date: '',
      position: 'Kỹ thuật',
      active: true
  });

  // --- STATE CHO VÂN TAY ---
  const [openEmpId, setOpenEmpId] = useState(null); 
  const [scanStep, setScanStep] = useState(0);
  
  // --- 1. HÀM TẢI DỮ LIỆU (Dùng useCallback để tái sử dụng) ---
  const fetchData = useCallback(async () => {
      setLoading(true);
      try {
          const data = await getEmployees();
          setEmployees(data);
      } catch (error) {
          console.error("Lỗi tải dữ liệu:", error);
          alert("Không thể tải danh sách nhân viên.");
      } finally {
          setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDateForInput = (isoDateString) => {
    if (!isoDateString) return '';
    const date = new Date(isoDateString);
    // Lấy YYYY-MM-DD
    return date.toISOString().split('T')[0];
  };

  // --- 2. CÁC HÀM ĐIỀU KHIỂN TRẠNG THÁI (Mutual Exclusion) ---

  const handleOpenAdd = () => {
      setCreatedUser(null);
      setIsEditMode(false);
      setFormData({
          id: null,
          full_name: '',
          gender: 'Nam',
          dob: '',
          phone_number: '',
          email: '',
          start_date: new Date().toISOString().split('T')[0], // Mặc định hôm nay
          position: 'Kỹ thuật',
          active: true
      });
      setShowModal(true);
  };

  // Mở form sửa
  const handleOpenEdit = (emp) => {
      setCreatedUser(null);
      setIsEditMode(true);
      setFormData({
          id: emp.id,
          full_name: emp.full_name,
          gender: emp.gender || 'Nam',
          dob: emp.dob || '',
          phone_number: emp.phone_number || '',
          email: emp.email || '',
          start_date: formatDateForInput(emp.start_date),
          position: emp.position,
          active: emp.active
      });
      setShowModal(true);
  };

  // Submit form (Chung cho cả Thêm và Sửa)
  const handleSubmit = async (e) => {
      e.preventDefault();
      try {
          if (isEditMode) {
              // --- UPDATE ---
              await updateEmployee(formData.id, formData);
              alert("Cập nhật thành công!");
          } else {
              // --- CREATE ---
              const res = await createEmployee(formData);
              // Giả sử API trả về: { data: { username: '...', password: '...', emp_code: '...' } }
              const newUser = res.data || res; 

              if (newUser) {
                  setCreatedUser(newUser); 
              }
          }
          await fetchData();
          setShowModal(false);
      } catch (error) {
          console.error(error);
          alert("Có lỗi xảy ra, vui lòng thử lại." + (error.response?.data?.message || error.message));
      }
  };

  // --- 3. XỬ LÝ VÂN TAY ---
  const handleToggleFinger = (id) => {
      if (openEmpId === id) {
          setOpenEmpId(null);
      } else {
          setOpenEmpId(id);
          setScanStep(0); 
      }
  };

  const handleStartScan = async (empId) => {
    setScanStep(1); 
    try {
      await setupFingerprint(empId); 
      setScanStep(2); 
      await fetchData(); 
    } catch (error) {
      console.error(error);
      alert("Lỗi cài đặt vân tay: " + (error.response?.data?.message || error.message));
      setScanStep(3); 
    }
  };

  const handleDeleteFinger = async (empId, fingerId) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa vân tay này?")) {
        try {
          await deleteFingerprint(empId, fingerId);
          await fetchData(); // Load lại list
        } catch (error) {
          alert("Lỗi xóa vân tay: " + error.message);
        }
      }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("Bạn chắc chắn muốn xóa nhân viên này?")){
    try {
          await deleteEmployee(id); 
          await fetchData();
      } catch (error) {
          alert("Lỗi xóa nhân viên: " + error.message);
      }
    }
  };

  if (loading) {
      return <div className="page-container" style={{textAlign: 'center', paddingTop: '50px'}}>⏳ Đang tải dữ liệu nhân viên...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Quản lý Nhân viên</h1>
        <button className="btn-add" onClick={handleOpenAdd}>+ Thêm nhân viên</button>
      </div>

      <div className="employee-table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th style={{width:'10%'}}>Mã NV</th>
              <th style={{width:'20%'}}>Họ và Tên</th>
              <th style={{width:'20%'}}>Email</th>
              <th style={{width:'15%'}}>Chức vụ</th>
              <th style={{width:'10%'}}>Trạng thái</th>
              <th style={{width:'25%'}}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? employees.map((emp) => {
              const isPopoverOpen = openEmpId === emp.id;

              return (
                <tr key={emp.id}>
                  <td>{emp.emp_code}</td>
                  <td><strong>{emp.full_name}</strong></td>
                  <td style={{color: '#64748b'}}>{emp.email || ''}</td>
                  <td>{emp.position}</td>
                  <td><span className={`status-badge ${emp.active ? 'active' : 'inactive'}`}>{emp.active ? 'Đang làm' : 'Đã nghỉ'}</span></td>
                  
                  <td style={{position: 'relative'}}> {/* Quan trọng cho Popover */}
                    <div className="action-buttons">
                        <button className="btn-action edit" onClick={() => handleOpenEdit(emp)}>Sửa</button>
                        
                        <button 
                            className={`btn-action finger ${isPopoverOpen ? 'active' : ''}`} 
                            onClick={() => handleToggleFinger(emp.id)}
                        >Vân tay</button>

                        <button className="btn-action delete" onClick={() => handleDeleteEmployee(emp.id)} style={{color:'red', background:'#fee2e2'}}>Xóa</button>
                    </div>

                    {/* --- POPOVER VÂN TAY--- */}
                    {isPopoverOpen && (
                        <div className="fingerprint-popover">
                            <div className="pop-header">
                                <h4>Danh sách vân tay</h4>
                                <button className="btn-close-pop" onClick={() => setOpenEmpId(null)}>×</button>
                            </div>
                            <div className="pop-body">
                                {emp.fingerprints?.length > 0 ? (
                                    <ul className="finger-list">
                                        {emp.fingerprints.map((f, i) => (
                                            <li key={i}>
                                                <span>Ngón #{f.finger_id}</span>
                                                <span className="finger-date">{f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : 'Mới tạo'}</span>
                                                <span className="delete-icon" onClick={() => handleDeleteFinger(emp.id, f.finger_id)}>Xóa</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="empty-text">Chưa có vân tay</p>}
                            </div>
                            <div className="pop-footer">
                                {scanStep === 0 ? (
                                    <button className="btn-scan-full" onClick={() => handleStartScan(emp.id)}>+ Thêm Vân Tay</button>
                                ) : (
                                    <div className={`scan-status step-${scanStep}`}>
                                        {scanStep === 1 && 'Đang kết nối...'}
                                        {scanStep === 2 && 'Thành công!'}
                                        {scanStep === 3 && 'Thất bại.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                  </td>
                </tr>
              );
            }) : (
                <tr>
                    <td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Không có dữ liệu nhân viên.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div> 

      {/* --- MODAL FORM THÊM / SỬA --- */}
      {showModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{isEditMode ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}</h3>
                    <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Họ và Tên <span className="req">*</span></label>
                            <input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Nguyễn Văn A" />
                        </div>
                        
                        <div className="form-group">
                            <label>Giới tính <span className="req">*</span></label>
                            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Ngày sinh <span className="req">*</span></label>
                            <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>Số điện thoại <span className="req">*</span></label>
                            <input type="tel" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="09xxxxxxxx" />
                        </div>

                        <div className="form-group">
                            <label>Email <span className="req">*</span></label>
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="abc@email.com" />
                        </div>

                        <div className="form-group">
                            <label>Ngày bắt đầu làm</label>
                            <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label>Chức vụ <span className="req">*</span> </label>
                            <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                                <option>Kỹ thuật</option>
                                <option>Kế toán</option>
                                <option>Nhân sự</option>
                                <option>Bảo vệ</option>
                                <option>Marketing</option>
                            </select>
                        </div>

                        {isEditMode && (
                            <div className="form-group full-width">
                                <label>Trạng thái</label>
                                <select value={formData.active} onChange={e => setFormData({...formData, active: e.target.value === 'true'})}>
                                    <option value="true">Đang làm việc</option>
                                    <option value="false">Đã nghỉ việc</option>
                                </select>
                            </div>
                        )}
                    </div>
                    
                    <div className="modal-footer">
                        <button type="button" className="btn-cancel-modal" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                        <button type="submit" className="btn-save-modal">Lưu thông tin</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- CREDENTIAL POPUP (HIỆN SAU KHI TẠO THÀNH CÔNG) --- */}
      {createdUser && (
          <div className="modal-overlay">
              <div className="credential-card">
                  <div className="cred-icon">✅</div>
                  <h3>Tạo thành công!</h3>
                  <div className="cred-box">
                      <div className="cred-row"><span>Mã NV:</span><strong>{createdUser.emp_code}</strong></div>
                      <div className="cred-row"><span>Username:</span><strong>{createdUser.username}</strong></div>
                      <div className="cred-row"><span>Password:</span><strong className="text-highlight">{createdUser.password}</strong></div>
                  </div>
                  <p style={{fontSize:'0.9rem', color:'#666', marginTop:'10px'}}>Vui lòng lưu lại thông tin này.</p>
                  <button className="btn-done" onClick={() => setCreatedUser(null)}>Đã lưu & Đóng</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default Employees;