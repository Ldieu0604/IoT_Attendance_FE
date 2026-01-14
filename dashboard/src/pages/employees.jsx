import React, { useState, useEffect, useCallback } from 'react';
import './employees.css';
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee, 
    setupFingerprint, 
    deleteFingerprint,
    getFingerprints
} from '../services/api';

const Employees = () => {
  const DEFAULT_DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0";
  
  // --- STATE QUẢN LÝ ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- STATE CHO MODAL FORM ---
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  // Dữ liệu Form
  const [formData, setFormData] = useState({
      id: null,
      emp_code: '',
      full_name: '',
      gender: 'Nam',
      dob: '',
      phone_number: '',
      email: '',
      start_date: '',
      position: 'Dev Mobile',
      active: true
  });

  // --- STATE CHO VÂN TAY (QUAN TRỌNG) ---
  const [fingerList, setFingerList] = useState([]); // Lưu danh sách vân tay của nhân viên đang mở
  const [loadingFinger, setLoadingFinger] = useState(false);
  const [openEmpId, setOpenEmpId] = useState(null); // ID của nhân viên đang mở Popover
  const [scanStep, setScanStep] = useState(0); // 0: Start, 1: Scanning, 2: Success, 3: Fail
  
  // --- 1. HÀM TẢI DỮ LIỆU NHÂN VIÊN ---
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
    return date.toISOString().split('T')[0];
  };

  // --- 2. XỬ LÝ FORM CRUD ---

  const handleOpenAdd = () => {
      setCreatedUser(null);
      setIsEditMode(false);
      setFormData({
          id: null,
          emp_code: '',
          full_name: '',
          gender: 'Nam',
          dob: '',
          phone_number: '',
          email: '',
          start_date: new Date().toISOString().split('T')[0],
          position: 'Dev Mobile',
          active: true
      });
      setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
      setCreatedUser(null);
      setIsEditMode(true);
      const isActive = emp.active !== undefined ? emp.active : true;
      setFormData({
          id: emp.id,
          emp_code: emp.emp_code,
          full_name: emp.full_name,
          gender: emp.gender || 'Nam',
          dob: emp.dob || '',
          phone_number: emp.phone_number || '',
          email: emp.email || '',
          start_date: formatDateForInput(emp.start_date),
          position: emp.position,
          active: isActive
      });
      setShowModal(true);
  };

  const handleSubmit = async (e) => {
      if (e) e.preventDefault();
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          if (isEditMode) {
              await updateEmployee(formData.emp_code, formData);
              alert("Cập nhật thành công!");
          } else {
              const res = await createEmployee(formData);
              const newUser = res.data || res; 
              if (newUser) {
                  setCreatedUser(newUser); 
              } else {
                  alert("Thêm nhân viên thành công!");
              }
          }
          await fetchData();
          if(isEditMode) setShowModal(false); 
          else if(!createdUser) setShowModal(false);
      } catch (error) {
          console.error(error);
          alert("Có lỗi xảy ra: " + (error.response?.data?.message || error.message));
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- 3. XỬ LÝ VÂN TAY (ĐÃ SỬA LOGIC) ---

  // Hàm này gọi API lấy vân tay riêng lẻ
  const fetchFingerprints = async (empId) => {
      setLoadingFinger(true);
      try {
          const data = await getFingerprints(empId);
          setFingerList(Array.isArray(data) ? data : []);
      } catch (error) {
          console.error(error);
          setFingerList([]);
      } finally {
          setLoadingFinger(false);
      }
  };

  // Khi bấm nút "Vân tay" -> Mở Popover VÀ Gọi API ngay lập tức
  const handleToggleFinger = async (id) => {
      if (openEmpId === id) {
          // Đang mở thì đóng lại
          setOpenEmpId(null);
          setFingerList([]); 
      } else {
          // Đang đóng thì mở ra
          setOpenEmpId(id);
          setScanStep(0); 
          // GỌI API LẤY DỮ LIỆU NGAY
          await fetchFingerprints(id);
      }
  };

  const handleStartScan = async (empId) => {
    setScanStep(1); // Đang quét
    try {
      await setupFingerprint(DEFAULT_DEVICE_ID, empId); 
      setScanStep(2); // Thành công
      // Load lại danh sách vân tay ngay lập tức
      await fetchFingerprints(empId);
    } catch (error) {
      console.error(error);
      alert("Lỗi cài đặt vân tay: " + (error.response?.data?.message || error.message));
      setScanStep(3); // Thất bại
    }
  };

  const handleDeleteFinger = async (empId, fingerId) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa vân tay này?")) {
        try {
          await deleteFingerprint(fingerId, DEFAULT_DEVICE_ID);
          // Load lại danh sách vân tay sau khi xóa
          await fetchFingerprints(empId);
        } catch (error) {
          alert("Lỗi xóa vân tay: " + error.message);
        }
      }
  };

  const handleDeleteEmployee = async (empCode) => {
    if (window.confirm("Bạn chắc chắn muốn xóa nhân viên này?")){
    try {
          await deleteEmployee(empCode); 
          await fetchData();
      } catch (error) {
          alert("Lỗi xóa nhân viên: " + error.message);
      }
    }
  };

  // --- RENDER ---
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
              const isActive = emp.active !== false;

              return (
                <tr key={emp.id}>
                  <td>{emp.emp_code}</td>
                  <td><strong>{emp.full_name}</strong></td>
                  <td style={{color: '#64748b'}}>{emp.email || ''}</td>
                  <td>{emp.position}</td>
                  <td><span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>{isActive ? 'Đang làm' : 'Đã nghỉ'}</span></td>
                  
                  <td style={{position: 'relative'}}> 
                    <div className="action-buttons">
                        <button className="btn-action edit" onClick={() => handleOpenEdit(emp)}>Sửa</button>
                        
                        <button 
                            className={`btn-action finger ${isPopoverOpen ? 'active' : ''}`} 
                            onClick={() => handleToggleFinger(emp.id)}
                        >Vân tay</button>

                        <button className="btn-action delete" onClick={() => handleDeleteEmployee(emp.emp_code)} style={{color:'red', background:'#fee2e2'}}>Xóa</button>
                    </div>

                    {/* --- POPOVER VÂN TAY (Đã sửa logic render) --- */}
                    {isPopoverOpen && (
                        <div className="fingerprint-popover">
                            <div className="pop-header">
                                <h4>Danh sách vân tay</h4>
                                <button className="btn-close-pop" onClick={() => setOpenEmpId(null)}>×</button>
                            </div>
                            <div className="pop-body">
                                {loadingFinger ? (
                                    <p className="loading-text">⏳ Đang tải...</p>
                                ) : fingerList.length > 0 ? (
                                    <ul className="finger-list">
                                        {/* SỬA: Map từ fingerList chứ không phải emp.fingerprints */}
                                        {fingerList.map((f, i) => (
                                            <li key={i}>
                                                <span>Ngón ID: {f.finger_id || f.id}</span>
                                                <span className="finger-date">{f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : 'Đã lưu'}</span>
                                                <span className="delete-icon" onClick={() => handleDeleteFinger(emp.id, f.finger_id || f.id)}>Xóa</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="empty-text">Chưa có vân tay nào.</p>}
                            </div>
                            <div className="pop-footer">
                                {scanStep === 0 ? (
                                    <button className="btn-scan-full" onClick={() => handleStartScan(emp.id)}>+ Thêm Vân Tay</button>
                                ) : (
                                    <div className={`scan-status step-${scanStep}`}>
                                        {scanStep === 1 && '📡 Đang quét trên thiết bị...'}
                                        {scanStep === 2 && '✅ Thành công!'}
                                        {scanStep === 3 && '❌ Thất bại.'}
                                        {/* Nút reset để quét lại nếu lỗi */}
                                        {(scanStep === 2 || scanStep === 3) && 
                                            <button className="btn-reset-scan" onClick={() => setScanStep(0)}>Quay lại</button>
                                        }
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

      {/* --- MODAL FORM --- */}
      {showModal && !createdUser && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{isEditMode ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}</h3>
                    <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
                </div>
                <form>
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Họ và Tên <span className="req">*</span></label>
                            <input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Nguyễn Văn A" />
                        </div>

                        {isEditMode && (
                          <div className="form-group">
                                <label>Mã NV</label>
                                <input disabled value={formData.emp_code} style={{background: '#f1f5f9', cursor: 'not-allowed'}}/>
                            </div>
                        )}

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
                                <option>Dev Mobile</option>
                                <option>Intern</option>
                                <option>Junior Developer</option>
                                <option>Manager</option>
                                <option>Marketing</option>
                                <option>Tester</option>
                                <option>Project Manager</option>
                                <option>Senior Developer</option>
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
                        <button 
                            type="button" 
                            onClick={handleSubmit}
                            className="btn-save-modal"
                            disabled={isSubmitting}
                            style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                        >
                             {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- CREDENTIAL POPUP --- */}
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