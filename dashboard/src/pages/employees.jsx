import React, { useState, useEffect, useCallback } from 'react';
import './employees.css';
import { 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee, 
    setupFingerprint, 
    deleteFingerprint,
    getFingerprints,
    checkEnrollStatus
} from '../services/api';

import { useRef } from 'react';


const Employees = () => {
  const DEFAULT_DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0";
  const pollingRef = useRef(null);
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

  // --- STATE CHO VÂN TAY ---
  const [fingerList, setFingerList] = useState([]); 
  const [loadingFinger, setLoadingFinger] = useState(false);
  const [openEmpId, setOpenEmpId] = useState(null); 
  const [scanStep, setScanStep] = useState(0); 
  
  // --- 1. HÀM TẢI DỮ LIỆU ---
  const fetchData = useCallback(async () => {
      setLoading(true);
      try {
          const data = await getEmployees();
          setEmployees(data);
      } catch (error) {
          console.error("Lỗi tải dữ liệu:", error);
      } finally {
          setLoading(false);
      }
  }, []);

  useEffect(() => {
  return () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };
}, []);


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
        if (isEditMode) setShowModal(false);
        else if (!createdUser) setShowModal(false);

    } catch (error) {
        console.error("Lỗi Submit:", error);
        
        // --- ĐOẠN CODE BẮT LỖI THÔNG MINH ---
        if (error.response) {
            const status = error.response.status;
            const msg = error.response.data?.message || "";

            if (status === 500) {
                alert("Lỗi Server (500): Có thể Email hoặc SĐT này ĐÃ TỒN TẠI trong hệ thống.\nVui lòng kiểm tra lại hoặc thử nhập thông tin khác.");
            } else if (status === 422) {
                alert("Lỗi Dữ liệu (422): Bạn đang gửi thừa hoặc thiếu trường thông tin. Hãy kiểm tra lại file api.js.");
            } else {
                alert(`Có lỗi xảy ra (${status}): ${msg}`);
            }
        } else {
            alert("Lỗi kết nối: Không thể gọi đến Server. Hãy kiểm tra mạng hoặc Railway.");
        }
        // ------------------------------------
    } finally {
        setIsSubmitting(false);
    }
};

  // --- 3. XỬ LÝ VÂN TAY ---

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

  const handleToggleFinger = async (id) => {
      if (openEmpId === id) {
  if (pollingRef.current) {
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }
  setScanStep(0);
}
  };

  const startPollingEnrollStatus = (empId, fingerId) => {
  pollingRef.current = setInterval(async () => {
    try {
      const res = await checkEnrollStatus(DEFAULT_DEVICE_ID, fingerId);
      console.log("Enroll status:", res);

      if (res.status === 'pending' || res.status === 'not_found') {
        setScanStep(1); // đang quét
      }

      if (res.status === 'success') {
        clearInterval(pollingRef.current);
        pollingRef.current = null;

        setScanStep(2);
        await fetchFingerprints(empId);
      }

      if (res.status === 'failed' || res.status === 'unknown') {
        clearInterval(pollingRef.current);
        pollingRef.current = null;

        setScanStep(3);
      }

    } catch (err) {
      console.error("Polling error:", err);
    }
  }, 3000);
};


 const handleStartScan = async (empId) => {
  setScanStep(1); // đang quét
  try {
    const res = await setupFingerprint(DEFAULT_DEVICE_ID, empId);

    const fingerId = res?.finger_id || res?.id;
    if (!fingerId) {
      throw new Error("Không lấy được ID vân tay từ Backend");
    }

    startPollingEnrollStatus(empId, fingerId);

  } catch (error) {
    console.error(error);
    setScanStep(3);
    alert(error.response?.data?.message || error.message);
  }
};


  const handleDeleteFinger = async (empId, fingerId) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa vân tay này?")) {
        try {
          await deleteFingerprint(fingerId, DEFAULT_DEVICE_ID);
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
          setOpenEmpId(null); // Đóng popover nếu đang mở đúng nhân viên này
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

                    {isPopoverOpen && (
                        <div className="fingerprint-popover">
                            <div className="pop-header">
                                <h4>Danh sách vân tay</h4>
                                <button className="btn-close-pop" onClick={() => handleToggleFinger(emp.id)}>×</button>
                            </div>
                            <div className="pop-body">
                                {loadingFinger ? (
                                    <p className="loading-text">⏳ Đang tải...</p>
                                ) : fingerList.length > 0 ? (
                                    <ul className="finger-list">
                                        {fingerList.map((f, i) => (
                                            <li key={i}>
                                                <span>Ngón ID #{f.id}</span>
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
                                        {scanStep === 1 && 'Đang quét trên thiết bị...'}
                                        {scanStep === 2 && 'Thành công!'}
                                        {scanStep === 3 && 'Thất bại.'}
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