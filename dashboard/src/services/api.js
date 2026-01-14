import axios from 'axios';

const API_BASE_URL = 'https://fingerdoorserver-production.up.railway.app';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.access_token) {
        config.headers.Authorization = `Bearer ${user.access_token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// ==========================================
// 1. AUTHENTICATION (Đăng nhập)
// ==========================================
export const loginUser = async (credentials) => {
    try {
        // Swagger: POST /api/v1/users/login
        const response = await api.post('/api/v1/users/login', {
            username: credentials.username,
            password: credentials.password
        });
        
        if (response.data) {
             localStorage.setItem('user', JSON.stringify(response.data));
        }
        return { success: true, ...response.data };
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        return { success: false, message: error.response?.data?.detail || "Lỗi kết nối" };
    }
};
// ==========================================
// 2. EMPLOYEE MANAGEMENT (Quản lý nhân viên)
// =========================================

// Lấy danh sách nhân viên
export const getEmployees = async () => {
    try {
        const response = await api.get(`/api/v1/employees/`); 
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy danh sách NV:", error);
        return [];
    }
};

export const createEmployee = async (newEmployee) => {
    try {
        // Mapping dữ liệu frontend sang backend (snake_case)
        const payload = {
            emp_code: newEmployee.empCode,
            full_name: newEmployee.fullName,
            gender: newEmployee.gender,
            dob: newEmployee.dob,
            position: newEmployee.position,
            phone_number: newEmployee.phoneNumber,
            email: newEmployee.email,
            start_date: newEmployee.startDate || new Date().toISOString().split('T')[0]
        };

        const response = await api.post('/api/v1/employees/', payload);
        return response.data;
    } catch (error) {
        console.error("Lỗi tạo NV:", error);
        throw error;
    }
};


// Cập nhật nhân viên
export const updateEmployee = async (empCode, updateData) => {
    try {
        // Swagger: PUT /api/v1/users/employees/{emp_code}
        const payload = {
            full_name: updateData.full_name || updateData.fullName,
            gender: updateData.gender,
            dob: updateData.dob, // YYYY-MM-DD
            position: updateData.position,
            phone_number: updateData.phone_number || updateData.phoneNumber,
            email: updateData.email,
            active: updateData.active
        };

        const response = await api.put(`/api/v1/users/employees/${empCode}/`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        console.error("Lỗi cập nhật NV:", error);
        throw error;
    }
};

// Xóa nhân viên
export const deleteEmployee = async (empCode) => {
    try {
        await api.delete(`/api/v1/users/employees/${empCode}/`);
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa NV:", error);
        throw error;
    }
};

// Lấy Profile
export const getProfile = async (userId) => {
    try {
        // Swagger: GET /api/v1/users/profile/{user_id}
        const response = await api.get(`/api/v1/users/profile/${userId}`);
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy profile:", error);
        throw error;
    }
};

// ==========================================
// 3. DEVICES & FINGERPRINTS (Vân tay & Cửa)
// ==========================================

const DEFAULT_DEVICE_ID = "esp32-EC:E3:34:BF:CD:C0";
// Lấy trạng thái cửa
export const getDeviceStatus = async (deviceId = DEFAULT_DEVICE_ID) => {
    try {
        const response = await api.get(`/api/v1/devices/${deviceId}/status`);
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy trạng thái cửa:", error);
        throw error;
    }
};
export const openDoor = async (deviceId = DEFAULT_DEVICE_ID) => {
    try {
        const response = await api.post(`/api/v1/devices/${deviceId}/door/open`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error("Lỗi mở cửa:", error);
        throw error;
    }
};
//check trạng thái enroll
export const checkEnrollStatus = async (deviceId, fingerprintId) => {
    try {
        // Lưu ý: Đường dẫn theo yêu cầu của bạn: /api/v1/devices/{deviceId}/...
        const response = await api.get(`/api/v1/devices/${deviceId}/fingerprints/${fingerprintId}/enroll-status`);
        return response.data;
    } catch (error) {
        console.error("Lỗi check status:", error);
        return { status: 'failed', message: error.message };
    }
};

// Thiết lập vân tay
export const setupFingerprint = async (deviceId = DEFAULT_DEVICE_ID, empId) => {
    try {
        
        const response = await api.post(`/api/v1/devices/${deviceId}/fingerprints/enroll`, {
            employee_id: empId
        });
        const fingerId = response.data.finger_id || response.data.id; 

        if (!fingerId) {
            throw new Error("Không lấy được ID vân tay từ Backend.");
        }

        console.log("Bắt đầu quét cho Finger ID:", fingerId);
        const maxRetries = 30;
        for (let i = 0; i < maxRetries; i++) {
            // Chờ 1 giây trước mỗi lần gọi
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusRes = await checkEnrollStatus(deviceId, fingerId);
            const status = statusRes.status; // Giả sử backend trả về trường 'status'

            console.log(`Lần ${i+1}: Trạng thái ${status}`);

            if (status === 'success' || status === 'ok' || status === 'completed') {
                return { success: true, message: "Đăng ký vân tay thành công!", data: statusRes };
            }

            if (status === 'failed' || status === 'error' || status === 'timeout') {
                throw new Error(statusRes.message || "Quét vân tay thất bại.");
            }
        }
        throw new Error("Quá thời gian chờ. Vui lòng thử lại.");
    } catch (error) {
        console.error("Lỗi quy trình vân tay:", error);
        throw error;
    }
};

// Xóa vân tay
export const deleteFingerprint = async (fingerId, deviceId = DEFAULT_DEVICE_ID) => {
    try {
        await api.delete(`/api/v1/devices/${deviceId}/fingerprints/${fingerId}`);
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa vân tay:", error);
        throw error;
    }
};


// ==========================================
// 4. ATTENDANCE (Chấm công)
// ==========================================

// Lấy lịch sử chấm công
export const getDailyAttendance = async (workDate = '', employeeId = null, skip = 0, limit = 1000) => {
    try {
        // Tạo object params
        const params = {
          skip: skip,
          limit: limit
        };
        
        // Chỉ thêm vào params nếu có dữ liệu thực sự
        if (workDate) params.work_date = workDate;
        if (employeeId) params.employee_id = employeeId;

        const response = await api.get('/api/v1/employees/daily-attendance', {
            params: params 
        });
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy log chấm công:", error);
        return [];
    }
};

export const getHistory = async (userId, month, year) => {
    try {
        const response = await api.get('/api/v1/users/history', {
            params: {
                user_id: userId,
                month: month,
                year: year
            }
        });
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy lịch sử:", error);
        return [];
    }
};
export default api;
