🏢 IoT Smart Attendance System
Hệ thống quản lý nhân sự và chấm công thông minh kết hợp IoT (ESP32 + Cảm biến vân tay). Dự án bao gồm Web App quản lý (ReactJS) kết nối với Backend Server (Deploy trên Railway) và thiết bị phần cứng.

🚀 Tính năng chính
1. Quản lý Nhân viên (Employee Management)
- Thêm mới, Cập nhật, Xóa nhân viên.
- Quản lý thông tin chi tiết: Chức vụ, Phòng ban, Lương cơ bản, Hệ số lương.

2. Quản lý Vân tay & IoT (Biometrics & Device)
- Đăng ký vân tay từ xa: Gửi lệnh từ Web xuống thiết bị ESP32 để kích hoạt chế độ đăng ký.
- Cơ chế Polling thông minh: Web tự động kiểm tra trạng thái đăng ký mỗi 2 giây để báo kết quả (Success/Failed/Duplicate) cho người dùng.
- Điều khiển cửa: Mở cửa từ xa qua Web App.

3. Tự động tính Lương (Automated Payroll)
- Dữ liệu động: Lấy cấu hình lương và chấm công trực tiếp từ Database (Backend) theo tháng/năm.
- Tính toán chính xác:
    +  Lương cứng theo chức vụ (Dev Mobile, Intern, Manager...).
    +  Phụ cấp OT (Overtime) tính theo ngày.
    +  Tự động tính tổng thực nhận dựa trên số ngày công thực tế (Backend tracking).
- Xuất báo cáo: Xuất bảng lương ra file PDF chuyên nghiệp.

4. Báo cáo & Thống kê (Dashboard)
Xem lịch sử ra vào chi tiết.

Thống kê nhân sự và trạng thái thiết bị.

🛠 Công nghệ sử dụng
- Frontend: ReactJS
- HTTP Client: Axios (Cấu hình Interceptors cho JWT Token).
- Export: jsPDF, jspdf-autotable (Xuất báo cáo lương).
- Backend API: Python (FastAPI/Django) - Deploy trên Railway.
- Hardware: ESP32, Fingerprint Sensor (AS608/R307).

⚙️ Cài đặt và Chạy dự án
1. Yêu cầu tiên quyết
Node.js (phiên bản 14 trở lên).
NPM hoặc Yarn.

2. Cài đặt
Bash
# Clone dự án về máy
git clone <link-repo-cua-ban>

# Di chuyển vào thư mục dự án
cd iot-attendance-frontend

# Cài đặt các thư viện (dependencies)
npm install
# Hoặc
yarn install
3. Cấu hình môi trường
Mở file src/services/api.js, đảm bảo API_BASE_URL trỏ đúng về Server Backend:

JavaScript
const API_BASE_URL = 'https://fingerdoorserver-production.up.railway.app';
4. Chạy ứng dụng
Bash
npm start
Ứng dụng sẽ chạy tại: http://localhost:3000

📂 Cấu trúc thư mục quan trọng
src/
├── components/        # Các thành phần UI tái sử dụng
├── pages/
│   ├── Employees.jsx  # Quản lý nhân viên & Modal thêm sửa
│   ├── Payroll.jsx    # Bảng lương & Logic tính toán & Xuất PDF
│   ├── Dashboard.jsx  # Trang chủ thống kê
│   └── ...
├── services/
│   └── api.js         # Cấu hình Axios & Các hàm gọi API (Auth, Fingerprint, Salary...)
├── App.js             # Routing chính
└── ...
📝 Hướng dẫn sử dụng tính năng đặc biệt
Tính năng Bảng Lương (Payroll)
-  Truy cập menu Bảng lương.
-  Chọn Tháng và Năm cần xem.
-  Hệ thống sẽ tự động gọi API getSalaryConfigs(year, month) để lấy dữ liệu đã tính toán từ Backend.
-  Nhấn nút Xuất PDF để tải bảng lương về máy.
Lưu ý: Nếu lương hiện 0đ, hãy kiểm tra xem Backend đã có dữ liệu chấm công cho tháng đó chưa.

Tính năng Thêm vân tay (Enroll Fingerprint)
-  Vào menu Nhân viên -> Chọn nhân viên cần thêm -> Bấm Vân tay.
-  Nhấn + Thêm Vân Tay.
-  Hệ thống sẽ gửi lệnh xuống ESP32.
-  Đặt ngón tay lên cảm biến khi đèn sáng.
-  Web sẽ tự động báo "Thành công" hoặc lỗi nếu trùng lặp.

🤝 Đóng góp
- Dự án được phát triển bởi [Tên của bạn]. Mọi đóng góp xin vui lòng tạo Pull Request.

📄 License
MIT License.
