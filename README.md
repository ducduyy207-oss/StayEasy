# StayEasy - Ứng dụng Quản lý Đặt Phòng Trực Tuyến

## Giới thiệu
StayEasy là dự án website quản lý phòng khách sạn/homestay dành cho Front-End. Giao diện được thiết kế hiện đại, lấy cảm hứng từ UI/UX của Agoda và Traveloka.

## Công nghệ sử dụng
- **HTML5 / CSS3**
- **Bootstrap 5** (Grid system, Card, Modal, Badge...)
- **Vanilla JavaScript** (Logic tính toán, Fetch API)
- **jQuery** (Xử lý DOM, sự kiện, hiệu ứng fadeIn/slideDown)
- **MockAPI.io** (Lưu trữ và giả lập RESTful API)

## Chức năng
### Giao diện Khách (Public)
- Xem danh sách phòng (Card layout).
- Lọc phòng theo loại (Standard, VIP, Deluxe...).
- Form đặt phòng có Validate dữ liệu (tên, ngày tháng hợp lệ).
- Tự động tính số đêm và tổng tiền bằng JavaScript.

### Giao diện Admin
- Quản lý Phòng (CRUD: Thêm, Xem, Sửa, Xóa).
- Quản lý Đặt phòng (Xem danh sách, Cập nhật trạng thái Duyệt/Từ chối).