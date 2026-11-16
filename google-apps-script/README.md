# Hướng Dẫn Triển Khai Backend Google Apps Script & Tích Hợp Google Form 20/11
**Chiến dịch: "Tiếp Lửa Tri Ân – 30 Năm Tiếp Lửa Tri Thức" (FTEL 20/11/2026)**  
*Đơn vị thực hiện: FPT Telecom & Trung tâm Đào tạo FTEL (FTC)*  
*Hòm thư gửi thư chính thức: `ftel.daotao.no-reply@fpt.com`*  
*Link Trình chỉnh sửa Apps Script dự án: [Apps Script Editor](https://script.google.com/u/4/home/projects/1D3YsLeq7Udpt37VvKphJnhN7xEiaC9VmM75OQ_dYdmtFvzQkSKLGZv4t/edit)*

---

## 1. Luồng Xử Lý Hệ Thống Theo Đúng Yêu Cầu (File `Tiếp lửa tri ân.docx`)
1. **Người gửi điền Google Form chính thức**:
   - Link Google Form: [Form Gửi Lời Tri Ân](https://docs.google.com/forms/d/1ot14yO0FsBI0jVeySVhs1v4s_QX30e3iNiJg0WveJUI/viewform)
   - Dữ liệu câu trả lời tự động đổ về Google Sheet (tab câu trả lời, `gid=1557167031`).
2. **Hệ thống check trùng tự động 3 thông tin**:
   - Kiểm tra bộ 3: **Người gửi**, **Người nhận**, **Thông điệp**.
   - **Phát hiện trùng**:
     + Đánh dấu Cột K là `TRÙNG LẶP`.
     + Đánh dấu Cột L là `ĐÃ BÁO TRÙNG LẶP`.
     + Tự động gửi email thông báo từ `ftel.daotao.no-reply@fpt.com` đến người nhập form về việc gửi trùng (không làm phiền người nhận và không cộng thêm ngọn lửa).
   - **Hợp lệ**:
     + **Tự động điền Họ tên & Đơn vị**: Tra cứu từ sheet `DS nhân sự` (`gid=1084168011`) để điền Họ tên Người gửi (Cột F), Đơn vị Người gửi (Cột G), Họ tên Người nhận (Cột H), Đơn vị Người nhận (Cột I).
     + **Chuẩn hóa chính tả thông điệp**: Tự động sửa lỗi telex, khoảng trắng và dịch từ viết tắt, ghi vào Cột J.
     + Đánh dấu Cột K là `HỢP LỆ`.
     + **Kích hoạt xuất ảnh E-Card 1080x1440**: Dựa trên mẫu phôi thiệp chính thức `Thiệp trống.png` (không gạch ngang vàng, kèm chữ in hoa họ tên, vai trò, thông điệp cá nhân hóa).
     + **Lưu trữ file thiệp dạng ảnh lên Google Drive**: Tạo liên kết công khai và gắn link Drive vào Cột M.
     + **Tạo mã định danh E-Card ID** ghi vào Cột N.
3. **Tự động gửi email kèm thiệp cho Người nhận, CC Người gửi từ `ftel.trungtamdaotao@fpt.com` (Tên hiển thị: `FTEL DAOTAO (NO-REPLY)`)**:
   - Gửi ngay lập tức qua Trigger `onFormSubmitTrigger` (Dual Engine: MailApp + GmailApp Alias).
   - **To**: Người nhận (nhận email trang trọng, nhúng thiệp inline và đính kèm PNG 1080x1440).
   - **CC**: Người gửi (được CC trực tiếp theo đúng tài liệu Tiếp lửa tri ân để lưu giữ kỷ niệm và xác nhận).
   - Đánh dấu Cột L: `ĐÃ GỬI MAIL (TO & CC)`.
4. **Cập nhật Live Dashboard Real-time**:
   - Cung cấp API Web App (`doGet` / `doPost`) đồng bộ tức thì số liệu KPI, Top 30 Tiếp Lửa, Top 100 Sớm nhất, Thống kê Đơn vị và Tra cứu Danh bạ Nhân sự.

---

## 2. Các Bước Triển Khai Vào Dự Án Apps Script (3 Phút)

### Bước 1: Mở Trình chỉnh sửa Apps Script dự án của bạn
- Truy cập thẳng vào link dự án bạn đã tạo:  
  👉 **[Untitled project - Trình chỉnh sửa dự án - Apps Script](https://script.google.com/u/4/home/projects/1D3YsLeq7Udpt37VvKphJnhN7xEiaC9VmM75OQ_dYdmtFvzQkSKLGZv4t/edit)**

### Bước 2: Dán mã nguồn `Code.gs` và `appsscript.json`
1. Tại tab tệp **`Code.gs`**: Xóa sạch code mặc định, copy toàn bộ nội dung trong file [`google-apps-script/Code.gs`](file:///google-apps-script/Code.gs) dán vào.
2. (Tùy chọn) Bật hiển thị tệp kê khai `appsscript.json` (Vào Cài đặt dự án > Tích chọn *Hiển thị tệp kê khai "appsscript.json" trong trình chỉnh sửa*), copy nội dung từ file [`google-apps-script/appsscript.json`](file:///google-apps-script/appsscript.json) dán vào.
3. Nhấn **`Ctrl + S`** (hoặc biểu tượng Lưu) để lưu dự án.

### Bước 3: Cài đặt Hệ thống & Kích hoạt Trigger 1-Click
1. Tại thanh công cụ của Apps Script, ở ô chọn hàm, chọn **`setupSystemAndTriggers`** và bấm **Chạy (Run)**.
2. Google sẽ hiện hộp thoại yêu cầu cấp quyền:
   - Bấm **Xem xét quyền (Review Permissions)**.
   - Chọn tài khoản của bạn (đảm bảo tài khoản có quyền gửi mail từ `ftel.trungtamdaotao@fpt.com` hoặc có alias này).
   - Bấm **Nâng cao (Advanced)** > Bấm **Đi tới Tiếp Lửa Tri Ân (không an toàn)** > Bấm **Cho phép (Allow)**.
3. Hàm này sẽ tự động:
   - Khởi tạo 14 cột mở rộng chuẩn hoá trên Google Sheet.
   - Tạo thư mục Google Drive `FTEL_20_11_ECards_2026` để lưu trữ ảnh thiệp.
   - Tự động gắn Trigger `onFormSubmit` (khi có người nộp Form, script xử lý ngay lập tức).

### Bước 4: Triển khai Ứng dụng Web (Web App Deployment)
1. Ở góc trên bên phải màn hình Apps Script, bấm **Triển khai (Deploy)** > **Quản lý bản triển khai** hoặc **Tùy chọn triển khai mới (New deployment)**.
2. Chọn loại: **Ứng dụng web (Web app)**:
   - **Mô tả**: `FTEL 20/11 Live Dashboard API`
   - **Thực thi dưới dạng (Execute as)**: `Tôi (Me)`
   - **Ai có quyền truy cập (Who has access)**: `Bất kỳ ai (Anyone)`
3. Bấm **Triển khai (Deploy)**.
4. Copy đường link **URL ứng dụng web (Web app URL)** (dạng `https://script.google.com/macros/s/AKfycb.../exec`).

### Bước 5: Kết nối Live Dashboard với Web App URL
- Bạn có thể dán URL Web App vừa copy vào ô cấu hình trong giao diện Dashboard (bấm nút ⚙️ trên thanh Header hoặc nhấn Quản trị), hoặc cập nhật trực tiếp biến `APPS_SCRIPT_URL` trong file [`src/api.js`](file:///src/api.js).
- Dashboard sẽ tự động hiển thị số liệu trực tiếp 100% thời gian thực từ Google Sheet!
