import axios from 'axios';

const API_BASE_URL = 'https://fingerdoorserver-production.up.railway.app';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper: Tự động thêm Token vào header nếu đã đăng nhập
api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem('user')); // Giả sử bạn lưu user + token ở đây
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
// ==========================================

// Lấy danh sách nhân viên
// Lưu ý: Backend cần có API GET /employees. Nếu chưa có, bạn cần bổ sung vào FastAPI.
export const getEmployees = async () => {
    try {
        const response = await api.get('/employees'); 
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
            dob: newEmployee.dob, // YYYY-MM-DD
            position: newEmployee.position,
            phone_number: newEmployee.phoneNumber,
            email: newEmployee.email,
            start_date: newEmployee.startDate || new Date().toISOString().split('T')[0]
        };

        const response = await api.post('/api/v1/users/employees', payload);
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
            email: updateData.email
        };

        const response = await api.put(`/api/v1/users/employees/${empCode}`, payload);
        return { success: true, data: response.data };
    } catch (error) {
        console.error("Lỗi cập nhật NV:", error);
        throw error;
    }
};

// Xóa nhân viên
// Backend: DELETE /employees/{emp_code}
export const deleteEmployee = async (empCode) => {
    try {
        await api.delete(`/api/v1/users/employees/${empCode}`);
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

// Thiết lập vân tay (Enroll)
// Backend: POST /api/v1/devices/devices/{device_id}/fingerprints/enroll
export const setupFingerprint = async (deviceId = "device_01") => {
    try {
        // API này gửi lệnh cho ESP32 bắt đầu quét
        const response = await api.post(`/api/v1/devices/devices/${deviceId}/fingerprints/enroll`);
        return { success: true, message: "Vui lòng đặt tay lên cảm biến...", data: response.data };
    } catch (error) {
        console.error("Lỗi enroll vân tay:", error);
        throw error;
    }
};

// Xóa vân tay
// Backend: DELETE /api/v1/devices/devices/{device_id}/fingerprints/{finger_id}
export const deleteFingerprint = async (fingerId, deviceId = "device_01") => {
    try {
        await api.delete(`/api/v1/devices/devices/${deviceId}/fingerprints/${fingerId}`);
        return { success: true };
    } catch (error) {
        console.error("Lỗi xóa vân tay:", error);
        throw error;
    }
};

// Mở cửa / Đóng cửa
// Backend: POST /api/v1/devices/devices/{device_id}/door/open
export const toggleDoorCommand = async (action, deviceId = "device_01") => {
    if (action !== 'open') return; // API hiện tại chỉ hỗ trợ lệnh open

    try {
        await api.post(`/api/v1/devices/devices/${deviceId}/door/open`);
        return { success: true, status: 'unlocked' };
    } catch (error) {
        console.error("Lỗi mở cửa:", error);
        return { success: false };
    }
};

// ==========================================
// 4. ATTENDANCE (Chấm công)
// ==========================================

// Lấy lịch sử
// Backend: GET /history?user_id=...&month=...&year=...
export const getAttendanceLogs = async (userId, month, year) => {
    try {
        const response = await api.get('/history', {
            params: {
                user_id: userId,
                month: month,
                year: year
            }
        });
        return response.data; // Trả về mảng log thật từ DB
    } catch (error) {
        console.error("Lỗi lấy log chấm công:", error);
        return [];
    }
};
