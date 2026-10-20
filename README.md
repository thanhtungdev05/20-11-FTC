# 🔥 DỰ ÁN 20/11 - THẮP LỬA TRI ÂN (FTEL & FTC)
> **Ứng dụng Web tương tác 3D Real-time gửi thiệp tri ân Thầy Cô, Giảng viên nội bộ & Mentor FPT Telecom nhân ngày Nhà giáo Việt Nam 20/11.**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/thanhtungdev05/20-11-FTC)
[![Three.js](https://img.shields.io/badge/3D-Three.js-orange?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-purple?logo=vite)](https://vitejs.dev/)
[![FPT Telecom](https://img.shields.io/badge/FTEL-FTC-blue)](https://fpt.vn)

---

## 🌟 Điểm nổi bật & Tính năng chính

1. **Hiệu ứng 3D Ngọn Lửa & Quả Cầu Tri Thức (Three.js WebGL):**
   - Đồ họa 3D thời gian thực tương tác mượt mà với chuột và cảm ứng trên Mobile.
   - Phong cách giao diện **Glassmorphism (Kính mờ)** hiện đại, nền trong suốt khoe trọn không gian 3D viễn tưởng.

2. **Bộ tạo thiệp E-Card 3D Siêu Sắc Nét (Canvas 1080x1440 HD):**
   - Tỷ lệ chuẩn vàng 3:4 (1080x1440px) tối ưu hiển thị trên mọi thiết bị và mạng xã hội.
   - Tích hợp nhận diện thương hiệu **Logo FPT 3 màu chuẩn** và **FTC**.
   - Công nghệ tự động co giãn font chữ thông minh, chống tràn viền tuyệt đối dù lời chúc dài hay ngắn.
   - Hiệu ứng nghiêng 3D (3D Tilt) khi rê chuột.

3. **Xem phóng to (Lightbox Zoom Modal):**
   - Xem thiệp toàn màn hình chuẩn nét từng điểm ảnh không bị thanh cuộn thừa (Zero scrollbar).
   - Nút tải ảnh nhanh một chạm về máy.

4. **Kết nối Google Sheets & Gửi Email tự động (Google Apps Script Backend):**
   - Tự động lưu toàn bộ dữ liệu vào Google Sheet bảo mật (chế độ Restricted Mode).
   - Gửi email thông báo đính kèm E-Card cá nhân hóa trực tiếp đến hộp thư người nhận.
   - Kiểm tra hợp lệ domain `@fpt.net` / `@fpt.com`, chống spam tự động.

5. **Bảng Vinh Danh "30 Tiếp Lửa Bền Bỉ":**
   - Xếp hạng thời gian thực các Giảng viên/Mentor nhận được nhiều lời cảm ơn nhất.
   - Xuất dữ liệu thống kê ra file CSV chuẩn UTF-8.

---

## 📁 Cấu trúc thư mục

```text
├── index.html              # Giao diện chính (HTML5 + Tailwind UI)
├── render.yaml             # Cấu hình triển khai tự động trên Render
├── package.json            # Cấu hình dependencies & scripts
├── public/                 # Tài nguyên tĩnh (Logo FPT, fonts, icons)
├── src/
│   ├── main.js             # Logic điều khiển chính của Web App
│   ├── style.css           # CSS giao diện Glassmorphism & Neon Glow
│   ├── scene3d.js          # Hệ thống đồ họa 3D (Three.js)
│   ├── cardGenerator.js    # Canvas E-Card Generator chuẩn 1080x1440
│   ├── api.js              # Client API kết nối Google Apps Script & Offline fallback
│   └── mockData.js         # Dữ liệu mẫu dự phòng
└── google-apps-script/
    └── Code.gs             # Backend Google Apps Script (doPost/doGet/Email)
```

---

## 🚀 Chạy trên môi trường Local

```bash
# 1. Cài đặt các thư viện
npm install

# 2. Khởi động máy chủ phát triển
npm run dev

# 3. Mở trình duyệt tại:
http://localhost:5173/
```

---

## 🌐 Triển khai lên Render (Static Site)

Dự án đã được tích hợp sẵn file `render.yaml`. Bạn chỉ cần:

1. Đăng nhập [Render.com](https://render.com).
2. Chọn **New +** ➜ **Static Site**.
3. Kết nối với GitHub Repository `thanhtungdev05/20-11-FTC`.
4. Cấu hình triển khai:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. Bấm **Create Static Site** ➜ Render sẽ tự động build và cấp domain HTTPS miễn phí!
