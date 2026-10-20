# Hướng Dẫn Triển Khai Backend Google Sheets & Apps Script
**Chiến dịch: "Thắp Lửa Tri Ân – Thắp Sáng Tri Thức" (FTEL 20/11/2026)**

---

## 1. Cơ chế hoạt động & Đảm bảo an toàn thông tin
- **Không chia sẻ quyền Google Sheet cho CBNV**: Toàn bộ CBNV chỉ tương tác với giao diện Web App.
- **Tài khoản triển khai độc lập**: Web App chạy thông qua Google Apps Script Web App dưới quyền của tài khoản Admin/BTC. Google Sheet được đặt chế độ **Restricted** (Chỉ những email được phân quyền quản trị trong BTC mới xem được).
- **Phân tách hoàn toàn**: CBNV chỉ có quyền `GỬI (Write-Only)`, không có bất kỳ API nào lộ ra danh sách tổng hợp lời cảm ơn của người khác.

---

## 2. Các bước cài đặt nhanh trong 3 phút

### Bước 1: Tạo Google Sheet mới
1. Truy cập [Google Sheets](https://sheets.new) bằng tài khoản email FPT của BTC.
2. Đổi tên trang tính thành: `FTEL_20_11_2026_DanhSachTriAn`.
3. Kiểm tra nút **Share (Chia sẻ)** ở góc trên bên phải: Đảm bảo chọn chế độ **Hạn chế (Restricted)**, không bật quyền xem công khai.

### Bước 2: Dán mã nguồn Apps Script
1. Trên thanh menu Google Sheets, chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.
2. Xóa toàn bộ nội dung mặc định trong tệp `Code.gs`.
3. Mở tệp `google-apps-script/Code.gs` trong dự án này, copy toàn bộ nội dung và dán vào Apps Script.
4. Nhấn tổ hợp phím `Ctrl + S` (hoặc biểu tượng Đĩa mềm) để lưu lại.

### Bước 3: Triển khai thành Web App
1. Nhấn nút màu xanh **Triển khai (Deploy)** ở góc trên bên phải > chọn **Tùy chọn triển khai mới (New deployment)**.
2. Chọn loại: biểu tượng bánh răng ⚙️ > chọn **Web app**.
3. Cấu hình thông số:
   - **Description (Mô tả)**: `FTEL 20/11 Tri Ân API v1`
   - **Execute as (Thực thi dưới dạng)**: `Me (Địa chỉ email của bạn)`
   - **Who has access (Ai có quyền truy cập)**: `Anyone (Bất kỳ ai)` *(Lưu ý: Bắt buộc chọn Anyone để Web App frontend có thể gửi yêu cầu POST mà không bị chặn phân quyền trình duyệt)*.
4. Nhấn **Deploy (Triển khai)**.
5. Cấp quyền (Authorize Access): Đăng nhập tài khoản Google của bạn, chọn *Advanced (Nâng cao)* > *Go to ... (unsafe)* > Cho phép gửi email và ghi Sheet.
6. Copy đường link **Web App URL** (Dạng: `https://script.google.com/macros/s/AKfycb.../exec`).

### Bước 4: Cấu hình vào Web App Frontend
Mở tệp `src/api.js` trong thư mục dự án và dán link vừa copy vào biến:
```javascript
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

---

## 3. Các tính năng tự động hóa được tích hợp sẵn
1. **Kiểm tra tính hợp lệ của Domain**: Chỉ chấp nhận `@fpt.net` và `@fpt.com`.
2. **Chống spam & Gửi trùng lặp (Anti-duplicate)**: Tự động phát hiện và chặn nếu một nhân viên gửi cùng nội dung cho cùng một người nhận trong thời gian ngắn.
3. **Tự động gửi email kèm E-Card**: Ngay khi dữ liệu được ghi vào Sheet, hệ thống tự động kích hoạt `GmailApp` gửi email HTML nhận diện thương hiệu FTEL sang trọng kèm ảnh ECard đính kèm tới hòm thư người nhận.
4. **API Tổng hợp phục vụ giải "30 Tiếp lửa bền bỉ"**: Tự động tính toán số lượt cảm ơn cho từng Mentor/Coach để hiển thị bảng vinh danh thời gian thực.
