# ✈️ StayEasy - Ứng dụng Tìm kiếm và Đặt phòng Trực tuyến

**Môn học:** Thiết kế, Lập trình Front-End | FIT4015  
**Đề tài:** Bài tập lớn 11 - StayEasy  

## 📌 Giới thiệu dự án
StayEasy là một ứng dụng web mô phỏng nền tảng tìm kiếm và đặt phòng lưu trú trực tuyến (khách sạn, homestay) có giao diện chuyên nghiệp tương tự Agoda/Traveloka. 
Dự án được xây dựng 100% bằng HTML, CSS (Bootstrap 5), JavaScript thuần và jQuery, kết hợp với MockAPI để quản lý dữ liệu động.

## 🚀 Công nghệ sử dụng (Đúng chuẩn đề cương)
- **Giao diện:** HTML5, CSS3, Bootstrap 5 (Grid System, Modal, Toast, Card, Form).
- **Xử lý Logic:** Vanilla JavaScript (ES6+), thao tác DOM.
- **Thư viện:** jQuery (Sử dụng cho các hiệu ứng UI và gọi Ajax API).
- **Lưu trữ dữ liệu:** MockAPI.io (Thực hiện đầy đủ 4 thao tác GET, POST, PUT, DELETE).
- **Kiểm tra dữ liệu (Validation):** Thực hiện bằng JavaScript thuần (inline errors).

## 📂 Cấu trúc thư mục
- `/css`: Chứa các tệp định dạng giao diện tùy chỉnh (`style.css`).
- `/js`: Chứa mã nguồn xử lý logic (`main.js` cho trang khách, `admin.js` cho quản trị).
- `/img`: Hình ảnh tĩnh sử dụng trong giao diện.
- `index.html`: Trang Public (Khách hàng xem phòng, tìm kiếm, đặt phòng).
- `admin.html`: Trang Quản trị (Admin thực hiện CRUD phòng và duyệt đơn đặt phòng).

## ⚙️ Hướng dẫn cài đặt và khởi chạy
1. Clone hoặc tải mã nguồn dự án về máy.
2. Thiết lập MockAPI:
   - Tạo resource `rooms` (id, name, price, type, guests, image, description).
   - Tạo resource `bookings` (id, roomId, roomName, customerName, checkIn, checkOut, nights, totalPrice, status).
   - Thay thế `API_URL` trong các file `/js/main.js` và `/js/admin.js` thành Endpoint URL MockAPI của bạn.
3. Mở file `index.html` bằng trình duyệt web bất kỳ (Chrome, Edge, Firefox) hoặc dùng Live Server trên VS Code để trải nghiệm.
4. (Tùy chọn) Truy cập `admin.html` để quản lý hệ thống.

## 🌐 Link Demo (Vercel)
[Cập nhật link Vercel của bạn tại đây sau khi deploy]