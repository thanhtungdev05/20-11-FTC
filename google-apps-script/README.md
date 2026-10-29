# Hướng Dẫn Triển Khai Backend Google Apps Script & Tích Hợp Google Form 20/11
**Chiến dịch: "Thắp Lửa Tri Ân – Thắp Sáng Tri Thức" (FTEL 20/11/2026)**
*Trung tâm Đào tạo và Phát triển FPT Telecom (FTC) - Email: ftel.daotao@fpt.com*

---

## 1. Luồng Xử Lý Hệ Thống Tối Ưu (Zero-Delay & Outlook Ready)
1. **Người gửi điền Google Form chính thức hoặc gửi từ Web App**:
   - Dữ liệu tự động đổ về Google Sheet tab câu trả lời (gid=1557167031).
2. **Hệ thống check trùng tự động 3 thông tin**:
   - **Người gửi**, **Người nhận**, **Thông điệp đã chuẩn hóa**.
   - **Phát hiện trùng**: Đánh dấu cột K là `TRÙNG LẶP` -> Tự động gửi email cảnh báo người gửi về việc trùng thông điệp -> Đánh dấu cột L là `ĐÃ BÁO TRÙNG LẶP`. Không cộng thêm ngọn lửa, không gửi mail làm phiền người nhận.
   - **Hợp lệ**:
     + Chuẩn hóa chính tả thông điệp (sửa lỗi telex, lỗi dấu, dịch từ viết tắt) ghi vào Cột J.
     + Đánh dấu cột K là `HỢP LỆ`.
     + Tạo mã định danh E-Card ID (Cột N) và link thiệp trên Google Drive (Cột M).
3. **Tự động gửi email chuẩn giao diện Microsoft Outlook từ `ftel.daotao@fpt.com`**:
   - Gửi ngay lập tức qua Trigger `onFormSubmitTrigger` (không có độ trễ).
   - **To (Người nhận)**: Nhận lời tri ân trang trọng + liên kết tải thiệp chất lượng cao.
   - **CC/To (Người gửi)**: Nhận thư xác nhận thắp lửa thành công để lưu giữ kỷ niệm và chống mạo danh.
   - Định dạng HTML Table chuẩn hóa riêng cho Outlook máy tính và điện thoại.
   - Cột L ghi nhận: `ĐÃ GỬI MAIL (TO & CC)`.
4. **Cập nhật Live Dashboard Real-time**:
   - Mở sẵn API Web App (`doGet` / `doPost`) đồng bộ số liệu KPI, Top 30 Tiếp Lửa, Top 100 Sớm nhất và Lan tỏa Đơn vị.

---

## 2. Các Bước Cài Đặt & Kích Hoạt Trên Google Sheet (3 Phút)

### Bước 1: Mở Google Sheet câu trả lời của chương trình
1. Mở trang tính Google Sheet liên kết với Google Form:
   `https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit`
2. Đảm bảo đã có tab `DS nhân sự` (gid=1084168011) chứa danh bạ CBNV (Email, Họ và tên, Đơn vị).

### Bước 2: Dán mã nguồn `Code.gs`
1. Trên thanh menu Google Sheets, chọn **Tiện ích mở rộng (Extensions)** > **Apps Script**.
2. Xóa toàn bộ nội dung cũ trong tệp `Code.gs`.
3. Mở tệp `google-apps-script/Code.gs` trong dự án, copy toàn bộ nội dung và dán vào.
4. Nhấn `Ctrl + S` để lưu lại.

### Bước 3: Chạy khởi tạo hệ thống (1 lần duy nhất)
1. Trong trình soạn thảo Apps Script, tại thanh công cụ chọn hàm `setupSystemAndTriggers` và bấm **Chạy (Run)**.
2. Trình duyệt sẽ yêu cầu cấp quyền: Chọn **Xem xét quyền (Review Permissions)** > Chọn tài khoản Google > **Nâng cao (Advanced)** > **Đi tới dự án (Go to ...)** > Bấm **Cho phép (Allow)**.
3. Hàm này sẽ tự động:
   - Tạo đủ 14 cột mở rộng trên Sheet câu trả lời.
   - Khởi tạo tab `Dashboard_BaoCao` đẹp mắt.
   - Cài đặt Trigger `onFormSubmitTrigger` (khi người dùng nộp Google Form, script sẽ chạy ngay lập tức).

### Bước 4: Triển khai Web App (Để Web Dashboard đồng bộ số liệu)
1. Bấm nút **Triển khai (Deploy)** ở góc trên bên phải > **Tùy chọn triển khai mới (New deployment)**.
2. Chọn loại: **Ứng dụng web (Web app)**.
   - **Mô tả**: `FTEL 20/11 Tri An API v2`
   - **Thực thi dưới dạng (Execute as)**: `Tôi (Me)`
   - **Ai có quyền truy cập (Who has access)**: `Bất kỳ ai (Anyone)`
3. Bấm **Triển khai (Deploy)**.
4. Copy đường dẫn **URL ứng dụng web (Web app URL)** và dán vào biến `APPS_SCRIPT_URL` trong tệp `src/api.js`.

---

## 3. Cấu Trúc Các Khu Vực Dashboard

### Khu vực A – Header chương trình & Banner Hero
- Logo FPT Telecom & FTC, Bộ đếm ngọn lửa real-time.
- Nút CTA dẫn thẳng vào Google Form chính thức.

### Khu vực B – Tổng quan chiến dịch (4 Thẻ KPI trực quan)
- **Tổng số ngọn lửa**: Tổng số lời cảm ơn hợp lệ đã gửi.
- **Người được tri ân**: Số cá nhân nhận được ít nhất một lời cảm ơn.
- **Người tham gia gửi lời cảm ơn**: Số cá nhân đã gửi lời tri ân.
- **Đơn vị lan tỏa**: Số đơn vị / phòng ban có nhân sự tham gia.

### Khu vực C – Bảng xếp hạng
1. **Bảng “30 NGƯỜI TIẾP LỬA TRI THỨC”**:
   - Vinh danh 30 cá nhân được đồng nghiệp gửi gắm nhiều lời cảm ơn nhất.
   - Top 3 (Hạng 1 Cúp Vàng, Hạng 2 Cúp Bạc, Hạng 3 Cúp Đồng) hiển thị nổi bật dạng bục vinh danh (Podium).
   - Hạng 4 – 30 hiển thị dạng thẻ/bảng xếp hạng gọn gàng, hiển thị Thứ hạng, Họ tên, Đơn vị, Dấu ấn vai trò và Tổng số ngọn lửa.
   - Sắp xếp: Theo tổng số ngọn lửa giảm dần.
2. **Bảng “100 NGƯỜI TIẾP LỬA SỚM NHẤT”**:
   - 100 CBNV gửi lời cảm ơn hợp lệ sớm nhất.
   - Hiển thị: Thứ tự ghi nhận, Họ tên, Đơn vị, Người nhận và Thời gian gửi.
   - Sắp xếp: Theo thời gian gửi hợp lệ tăng dần (sớm nhất lên đầu).
   - Thiết kế dạng dòng thời gian (Timeline) ngọn lửa được thắp lên.

### Khu vực D – Lan tỏa theo đơn vị
- Biểu đồ thanh ngang xếp theo số lượt cảm ơn của từng đơn vị.
- Thống kê chi tiết: Tổng số ngọn lửa, Số người gửi, Số người nhận, Tỷ lệ lan tỏa.
- Bộ lọc theo đơn vị và tính năng xem danh sách chi tiết từng đơn vị.

### Khu vực Tra cứu Danh bạ Nhân sự (Hỗ trợ 24.608+ CBNV)
- Tích hợp tìm kiếm siêu tốc (<2ms) theo Họ tên (có dấu / không dấu) hoặc Email / Account FPT.
- Nút copy email 1 chạm và nút dẫn ngay vào Google Form để tri ân đồng nghiệp.
