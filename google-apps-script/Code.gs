/**
 * ==============================================================================
 * DỰ ÁN: WEB APP "THẮP LỬA TRI ÂN" - FTEL 20/11/2026
 * GOOGLE APPS SCRIPT BACKEND (RESTRICTED MODE)
 * ==============================================================================
 * 
 * Hướng dẫn triển khai:
 * 1. Mở Google Sheet lưu trữ dữ liệu tri ân (đặt quyền Restricted - Chỉ tài khoản triển khai có quyền).
 * 2. Vào Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã nguồn này vào tệp Code.gs.
 * 4. Cập nhật các biến cấu hình CONFIG bên dưới.
 * 5. Bấm Triển khai (Deploy) -> Tùy chọn triển khai mới (New deployment) -> Web app:
 *    - Execute as: Me (Tài khoản của bạn)
 *    - Who has access: Anyone (Bất kỳ ai - để Web App có thể gửi POST data lên)
 * 6. Copy Web App URL và dán vào file cấu hình Frontend.
 */

const CONFIG = {
  // ID của Google Sheet đích (https://docs.google.com/spreadsheets/d/1qd6VRcbElM68BhPvcfsWX2BRaaXUypdIznIHYR2YPYA/edit)
  SPREADSHEET_ID: "1qd6VRcbElM68BhPvcfsWX2BRaaXUypdIznIHYR2YPYA",

  // Tên Sheet lưu trữ danh sách lời cảm ơn
  SHEET_NAME: "DanhSachTriAn",
  
  // Tên Sheet lưu trữ cấu hình & danh sách cán bộ quản trị (nếu có)
  ADMIN_SHEET: "AdminConfig",
  
  // Mã bí mật dành cho Admin truy cập Dashboard (hoặc xác thực)
  ADMIN_SECRET_KEY: "FTEL_TRI_AN_2026",
  
  // Các domain email được phép gửi/nhận
  ALLOWED_DOMAINS: ["fpt.net", "fpt.com"],
  
  // Thời gian tối thiểu giữa 2 lần gửi từ cùng một người gửi (giây) - Chống spam
  MIN_SUBMIT_INTERVAL_SECONDS: 30,
  
  // Tiêu đề email gửi tới người nhận
  EMAIL_SUBJECT_PREFIX: "[FTEL 20/11] Bạn nhận được một ngọn lửa tri ân từ "
};

/**
 * Xử lý yêu cầu POST từ Web App
 */
function doPost(e) {
  let payload = {};
  if (e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      payload = e.parameter || {};
    }
  } else {
    payload = e.parameter || {};
  }

  const action = payload.action || "submit_gratitude";

  // Action 1: Gửi lời tri ân (Cần lock để chống ghi đè/xung đột dòng trên Google Sheet)
  if (action === "submit_gratitude") {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
      const result = handleGratitudeSubmission(payload);
      return createJsonResponse(result);
    } catch (error) {
      Logger.log("submit_gratitude Error: " + error.toString());
      return createJsonResponse({
        success: false,
        message: "Lỗi hệ thống khi lưu lời tri ân: " + error.toString()
      });
    } finally {
      lock.releaseLock();
    }
  }

  // TẤT CẢ CÁC ACTION KHÁC (Gửi OTP, Xác thực, Admin) KHÔNG CẦN SHEET LOCK -> XỬ LÝ SIÊU TỐC (<0.5s)
  try {
    // Action 2: Gửi OTP qua email Outlook FTEL (Flash OTP tối ưu)
    if (action === "request_otp") {
      const result = handleRequestOtp(payload);
      return createJsonResponse(result);
    }

    // Action 3: Xác thực mã OTP
    if (action === "verify_otp") {
      const result = handleVerifyOtp(payload);
      return createJsonResponse(result);
    }

    // Action: Lấy cấu hình chế độ đăng nhập (Direct hay OTP)
    if (action === "get_auth_config") {
      const result = handleGetAuthConfig();
      return createJsonResponse(result);
    }

    // Action: Admin bật/tắt yêu cầu mã OTP
    if (action === "admin_toggle_otp") {
      const result = handleAdminToggleOtp(payload);
      return createJsonResponse(result);
    }

    // Action 4: Đăng nhập quản trị viên (Admin Login)
    if (action === "admin_login") {
      const result = handleAdminLogin(payload);
      return createJsonResponse(result);
    }

    // Action 5: Lấy danh sách tài khoản Admin
    if (action === "admin_get_admins") {
      const result = handleAdminGetAdmins(payload);
      return createJsonResponse(result);
    }

    // Action 6: Thêm / Xóa quyền Admin
    if (action === "admin_set_admin") {
      const result = handleAdminSetAdmin(payload);
      return createJsonResponse(result);
    }

    // Action 7: Lấy toàn bộ danh sách lời chúc (Chỉ Admin)
    if (action === "admin_get_all_submissions") {
      const result = handleAdminGetAllSubmissions(payload);
      return createJsonResponse(result);
    }

    // Action 8: Xóa một lời tri ân đã gửi (Chỉ Admin)
    if (action === "admin_delete_submission") {
      const result = handleAdminDeleteSubmission(payload);
      return createJsonResponse(result);
    }

    return createJsonResponse({
      success: false,
      message: "Hành động không hợp lệ."
    });

  } catch (error) {
    Logger.log("doPost Error: " + error.toString());
    return createJsonResponse({
      success: false,
      message: "Lỗi hệ thống: " + error.toString()
    });
  }
}

/**
 * Xử lý yêu cầu GET từ Web App (Lấy thống kê cho Dashboard)
 */
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "get_stats";

    if (action === "get_stats") {
      const stats = getDashboardStatistics();
      return createJsonResponse({
        success: true,
        data: stats
      });
    }

    if (action === "get_leaderboard") {
      const leaderboard = getTop30Mentors();
      return createJsonResponse({
        success: true,
        data: leaderboard
      });
    }

    if (action === "get_auth_config") {
      const authConfig = handleGetAuthConfig();
      return createJsonResponse(authConfig);
    }

    return createJsonResponse({
      success: true,
      message: "FTEL 20/11 Backend API is running."
    });
  } catch (error) {
    Logger.log("doGet Error: " + error.toString());
    return createJsonResponse({
      success: false,
      message: "Lỗi lấy dữ liệu: " + error.toString()
    });
  }
}

/**
 * Xử lý gửi lời tri ân
 */
function handleGratitudeSubmission(data) {
  const senderEmail = (data.senderEmail || "").trim().toLowerCase();
  const senderName = (data.senderName || "").trim();
  const senderDept = (data.senderDept || "").trim();
  const recipientEmail = (data.recipientEmail || "").trim().toLowerCase();
  const recipientName = (data.recipientName || "").trim();
  const recipientRole = (data.recipientRole || "Đồng nghiệp chia sẻ tri thức").trim();
  const message = (data.message || "").trim();
  const tag = (data.tag || "Tiếp lửa bền bỉ").trim();
  const cardStyle = (data.cardStyle || "gold").trim();
  const cardImageBase64 = data.cardImageBase64 || ""; // Ảnh E-Card dạng base64 nếu client gửi kèm

  // 1. Kiểm tra tính hợp lệ của Email
  if (!isFTELDomain(senderEmail)) {
    return {
      success: false,
      message: "Email người gửi không thuộc miền FPT (@fpt.net hoặc @fpt.com)!"
    };
  }

  if (!isFTELDomain(recipientEmail)) {
    return {
      success: false,
      message: "Email người nhận không thuộc miền FPT (@fpt.net hoặc @fpt.com)!"
    };
  }

  if (senderEmail === recipientEmail) {
    return {
      success: false,
      message: "Bạn không thể tự gửi lời cảm ơn cho chính mình!"
    };
  }

  if (!message || message.length < 10) {
    return {
      success: false,
      message: "Nội dung lời cảm ơn cần có ít nhất 10 ký tự!"
    };
  }

  // 2. Mở Sheet
  const sheet = getOrCreateSheet(CONFIG.SHEET_NAME);

  // 3. Kiểm tra chống gửi trùng lặp (Anti-duplicate)
  if (isDuplicateSubmission(sheet, senderEmail, recipientEmail, message)) {
    return {
      success: false,
      message: "Bạn đã gửi một lời cảm ơn có nội dung tương tự cho người này gần đây!"
    };
  }

  // 4. Lưu vào Google Sheet
  const now = new Date();
  const submissionId = "FTEL-" + Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);
  
  let emailSentStatus = "PENDING";
  let emailSentTime = "";

  // 5. Gửi Email thông báo E-Card cho người nhận
  try {
    sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      senderName: senderName,
      senderEmail: senderEmail,
      senderDept: senderDept,
      recipientRole: recipientRole,
      message: message,
      tag: tag,
      cardImageBase64: cardImageBase64
    });
    emailSentStatus = "SENT_SUCCESS";
    emailSentTime = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  } catch (emailErr) {
    Logger.log("Email Send Failed: " + emailErr.toString());
    emailSentStatus = "FAILED: " + emailErr.message;
  }

  // 6. Ghi hàng mới vào Sheet
  sheet.appendRow([
    submissionId,                                                   // A: Mã lượt gửi
    Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"), // B: Thời gian gửi
    senderName,                                                    // C: Người gửi
    senderEmail,                                                   // D: Email người gửi
    senderDept,                                                    // E: Đơn vị/Phòng ban
    recipientName,                                                 // F: Người nhận
    recipientEmail,                                                // G: Email người nhận
    recipientRole,                                                 // H: Vai trò người nhận
    tag,                                                           // I: Chủ đề/Danh hiệu
    message,                                                       // J: Lời cảm ơn
    cardStyle,                                                     // K: Phong cách thiệp
    emailSentStatus,                                               // L: Trạng thái gửi mail
    emailSentTime                                                  // M: Thời gian gửi mail
  ]);

  return {
    success: true,
    message: "Gửi lời tri ân thành công!",
    data: {
      submissionId: submissionId,
      recipientName: recipientName,
      emailSentStatus: emailSentStatus
    }
  };
}

/**
 * Gửi email thông báo E-Card cá nhân hóa
 */
/**
 * Gửi email thông báo E-Card cá nhân hóa (Nhúng trực tiếp Thiệp 3D vào thân email)
 */
function sendGratitudeNotificationEmail(params) {
  const subject = CONFIG.EMAIL_SUBJECT_PREFIX + params.senderName + " (" + params.senderDept + ")";
  
  const logoBlob = getFptLogoBlob();
  const inlineImages = {};
  if (logoBlob) {
    inlineImages.fptLogo = logoBlob;
  }

  let cardImageBlob = null;
  let hasCardImage = false;

  // Xử lý ảnh thiệp 3D cá nhân hóa do người gửi thiết kế
  if (params.cardImageBase64 && params.cardImageBase64.indexOf("base64,") !== -1) {
    try {
      const base64Data = params.cardImageBase64.split("base64,")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const safeName = (params.recipientName || "FTEL").replace(/[^a-zA-Z0-9_-]/g, "_");
      cardImageBlob = Utilities.newBlob(decodedBytes, "image/png", "Thiep_Tri_An_" + safeName + ".png");
      inlineImages.tributeCard = cardImageBlob;
      hasCardImage = true;
    } catch (attachErr) {
      Logger.log("Decode cardImageBase64 error: " + attachErr.toString());
    }
  }

  // HTML Template email sang trọng với màu sắc nhận diện FPT
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid #f37021;">
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 25px 20px; text-align: center;">
        <img src="cid:fptLogo" alt="FPT Telecom" height="46" style="display:block; margin: 0 auto 10px auto; border: 0; outline: none; background: transparent;" />
        <h3 style="color: #ffd700; margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Trung tâm Đào tạo FTEL (FTC)</h3>
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">THẮP LỬA TRI ÂN – THẮP SÁNG TRI THỨC</h1>
      </div>
      
      <!-- Content Body -->
      <div style="padding: 30px 25px; line-height: 1.6; color: #e2e8f0;">
        <p style="font-size: 18px; color: #ffffff; margin-top: 0;">
          Kính gửi Anh/Chị <strong>${escapeHtml(params.recipientName)}</strong>,
        </p>
        <p style="font-size: 15px;">
          Nhân dịp ngày Nhà giáo & Tôn vinh Người chia sẻ tri thức 20/11, bạn vừa nhận được một ngọn lửa tri ân đầy ấm áp cùng tấm thiệp thiết kế riêng từ đồng nghiệp 
          <strong style="color: #f37021;">${escapeHtml(params.senderName)}</strong> (${escapeHtml(params.senderDept)}):
        </p>
        
        ${hasCardImage ? `
          <!-- HIỂN THỊ TRỰC TIẾP TẤM THIỆP 3D DO NGƯỜI GỬI THIẾT KẾ -->
          <div style="text-align: center; margin: 25px 0;">
            <img src="cid:tributeCard" alt="Thiệp Tri Ân 20/11" style="width: 100%; max-width: 520px; height: auto; border-radius: 16px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); border: 2px solid #ffd700; display: block; margin: 0 auto;" />
            <p style="font-size: 12px; color: #94a3b8; margin-top: 10px; font-style: italic;">
              ✦ Tấm thiệp tri ân cá nhân hóa thiết kế riêng cho Anh/Chị (ảnh đính kèm độ phân giải cao).
            </p>
          </div>
        ` : `
          <!-- Message Card Box Fallback -->
          <div style="background: rgba(255, 255, 255, 0.05); border-left: 4px solid #ffd700; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <div style="display: inline-block; background: #f37021; color: #fff; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px;">
              ✦ ${escapeHtml(params.tag)}
            </div>
            <p style="font-style: italic; font-size: 16px; color: #fff; margin: 0; line-height: 1.8;">
              "${escapeHtml(params.message)}"
            </p>
            <p style="text-align: right; margin: 15px 0 0 0; font-size: 14px; color: #94a3b8;">
              — Gửi từ: <strong>${escapeHtml(params.senderName)}</strong>
            </p>
          </div>
        `}

        <div style="text-align: center; margin: 28px 0 12px 0;">
          <a href="https://gui-loi-cam-on-thap-sang-tri-thuc.onrender.com/" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f37021 0%, #ff8c00 100%); color: #ffffff; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 24px; font-size: 14px; box-shadow: 0 4px 15px rgba(243, 112, 33, 0.4);">
            🔥 Xem Tường Lửa Tri Ân FTEL 20/11 ➜
          </a>
        </div>

        <p style="font-size: 13px; color: #cbd5e1; text-align: center; margin-top: 18px;">
          Cảm ơn bạn đã luôn là ngọn lửa kiên định, tận tâm đồng hành và trao truyền tri thức quý giá cho người FPT!
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #080d1a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
        <p style="margin: 0 0 5px 0;">Chiến dịch "Thắp Lửa Tri Ân - 20/11/2026" | FPT Telecom</p>
        <p style="margin: 0;">Email này được gửi tự động từ hệ thống Web App Tri Ân FTC.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    to: params.recipientEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: "FTC - Trung tâm Đào tạo FPT Telecom",
    inlineImages: inlineImages
  };

  if (cardImageBlob) {
    mailOptions.attachments = [cardImageBlob];
  }

  GmailApp.sendEmail(params.recipientEmail, subject, "", mailOptions);
}

/**
 * Kiểm tra domain email có thuộc FPT không
 */
function isFTELDomain(email) {
  if (!email || typeof email !== "string") return false;
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return false;
  return CONFIG.ALLOWED_DOMAINS.indexOf(parts[1]) !== -1;
}

/**
 * Kiểm tra xem có gửi lặp trong khoảng thời gian ngắn không
 */
function isDuplicateSubmission(sheet, senderEmail, recipientEmail, message) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  // Lấy 50 hàng gần nhất để kiểm tra
  const checkRows = Math.min(50, lastRow - 1);
  const startRow = lastRow - checkRows + 1;
  const values = sheet.getRange(startRow, 1, checkRows, 10).getValues();

  const cleanMsg = message.replace(/\s+/g, "").toLowerCase();

  for (let i = values.length - 1; i >= 0; i--) {
    const rowSender = String(values[i][3]).toLowerCase().trim();
    const rowRecipient = String(values[i][6]).toLowerCase().trim();
    const rowMsg = String(values[i][9]).replace(/\s+/g, "").toLowerCase();

    // Nếu cùng người gửi, cùng người nhận và nội dung tương đồng
    if (rowSender === senderEmail && rowRecipient === recipientEmail && rowMsg === cleanMsg) {
      return true;
    }
  }

  return false;
}

/**
 * Thống kê dữ liệu Dashboard
 */
function getDashboardStatistics() {
  const sheet = getOrCreateSheet(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return {
      totalSubmissions: 0,
      uniqueSenders: 0,
      uniqueRecipients: 0,
      departmentStats: {},
      topTags: {}
    };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const senders = new Set();
  const recipients = new Set();
  const departmentStats = {};
  const topTags = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const sEmail = String(row[3]).trim().toLowerCase();
    const dDept = String(row[4]).trim() || "Chưa xác định";
    const rEmail = String(row[6]).trim().toLowerCase();
    const tag = String(row[8]).trim() || "Chung";

    if (sEmail) senders.add(sEmail);
    if (rEmail) recipients.add(rEmail);

    departmentStats[dDept] = (departmentStats[dDept] || 0) + 1;
    topTags[tag] = (topTags[tag] || 0) + 1;
  }

  return {
    totalSubmissions: data.length,
    uniqueSenders: senders.size,
    uniqueRecipients: recipients.size,
    departmentStats: departmentStats,
    topTags: topTags
  };
}

/**
 * Lấy Top 30 Mentor/Coach nhận được nhiều lời cảm ơn nhất ("30 Tiếp lửa bền bỉ")
 */
function getTop30Mentors() {
  const sheet = getOrCreateSheet(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 6, lastRow - 1, 3).getValues(); // F: Name, G: Email, H: Role
  const mentorCounts = {};

  for (let i = 0; i < data.length; i++) {
    const name = String(data[i][0]).trim();
    const email = String(data[i][1]).trim().toLowerCase();
    const role = String(data[i][2]).trim() || "Mentor";

    if (!email) continue;

    if (!mentorCounts[email]) {
      mentorCounts[email] = {
        name: name,
        email: email,
        role: role,
        count: 0
      };
    }
    mentorCounts[email].count += 1;
  }

  const list = Object.keys(mentorCounts).map(function(k) {
    return mentorCounts[k];
  });

  // Sắp xếp giảm dần theo số lượt cảm ơn
  list.sort(function(a, b) {
    return b.count - a.count;
  });

  return list.slice(0, 30);
}

/**
 * Tạo hoặc lấy Sheet theo tên và định dạng tiêu đề cột
 */
function getOrCreateSheet(sheetName) {
  let ss = null;
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    } catch (err) {
      Logger.log("openById error: " + err.toString());
    }
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      Logger.log("getActiveSpreadsheet error: " + err.toString());
    }
  }
  if (!ss) {
    throw new Error("Không thể mở Google Spreadsheet. Vui lòng kiểm tra CONFIG.SPREADSHEET_ID hoặc mở script từ Tiện ích mở rộng của Google Sheet!");
  }
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Tạo hàng tiêu đề
    const headers = [
      "Mã Lượt Gửi",
      "Thời Gian Gửi",
      "Người Gửi",
      "Email Người Gửi",
      "Đơn Vị Người Gửi",
      "Người Nhận",
      "Email Người Nhận",
      "Vai Trò Người Nhận",
      "Danh Hiệu/Chủ Đề",
      "Lời Cảm Ơn",
      "Phong Cách Thiệp",
      "Trạng Thái Gửi Mail",
      "Thời Gian Mail"
    ];
    sheet.appendRow(headers);
    
    // Format hàng tiêu đề
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#002D62");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // Đặt độ rộng cột phù hợp
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 160);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 150);
    sheet.setColumnWidth(6, 160);
    sheet.setColumnWidth(7, 200);
    sheet.setColumnWidth(8, 160);
    sheet.setColumnWidth(9, 160);
    sheet.setColumnWidth(10, 350);
    sheet.setColumnWidth(11, 130);
    sheet.setColumnWidth(12, 150);
    sheet.setColumnWidth(13, 160);
  }

  return sheet;
}

/**
 * Trả về phản hồi dạng JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Escape ký tự HTML để phòng chống XSS trong Email
 */
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * ==============================================================================
 * HỆ THỐNG XÁC THỰC (FLASH OTP & XÁC THỰC NHANH FTEL) & PHÂN QUYỀN ADMIN
 * ==============================================================================
 */

/**
 * Lấy trạng thái chế độ xác thực hệ thống
 * Mặc định: requireOtp = false (Chế độ xác thực nhanh tức thì 0.1s không cần chờ OTP)
 */
function handleGetAuthConfig() {
  try {
    const props = PropertiesService.getScriptProperties();
    const requireOtp = props.getProperty("AUTH_REQUIRE_OTP") === "true";
    return {
      success: true,
      requireOtp: requireOtp,
      mode: requireOtp ? "otp" : "direct"
    };
  } catch (e) {
    return {
      success: true,
      requireOtp: false,
      mode: "direct"
    };
  }
}

/**
 * Admin bật/tắt yêu cầu mã OTP toàn hệ thống
 */
function handleAdminToggleOtp(data) {
  const secretKey = (data.secretKey || "").trim();
  const requireOtp = data.requireOtp === true || data.requireOtp === "true";

  if (secretKey !== CONFIG.ADMIN_SECRET_KEY) {
    return {
      success: false,
      message: "Khóa bảo mật quản trị không chính xác!"
    };
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty("AUTH_REQUIRE_OTP", requireOtp ? "true" : "false");

  return {
    success: true,
    requireOtp: requireOtp,
    message: requireOtp 
      ? "Đã chuyển sang chế độ: Bắt buộc xác thực mã OTP qua Outlook." 
      : "Đã chuyển sang chế độ: Xác thực nhanh tức thì (0.1s, không cần chờ OTP)."
  };
}

/**
 * Xử lý gửi OTP qua email Outlook FTEL (Flash OTP - Tối ưu siêu tốc <1s bằng CacheService & MailApp)
 */


// ==============================================================================
// LOGO FPT TELECOM CHÍNH THỨC DẠNG BASE64 TỰ THÂN (KHÔNG CẦN TẢI QUA MẠNG)
// ==============================================================================
const FPT_LOGO_BASE64 = "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";

let _cachedFptLogoBlob = null;
function getFptLogoBlob() {
  if (_cachedFptLogoBlob) return _cachedFptLogoBlob;
  try {
    _cachedFptLogoBlob = Utilities.newBlob(Utilities.base64Decode(FPT_LOGO_BASE64), "image/jpeg", "logoFPT.jpg");
    return _cachedFptLogoBlob;
  } catch (err) {
    Logger.log("getFptLogoBlob error: " + err.toString());
    return null;
  }
}

/**
 * Kiểm tra xem email này đã từng xác thực OTP thành công trên hệ thống hay chưa
 */
function isEmailAlreadyVerified(email) {
  if (!email) return false;
  email = email.trim().toLowerCase();

  // Super Admin luôn được xem là đã xác thực
  if (checkIsAdminEmail(email)) return true;

  const cache = CacheService.getScriptCache();
  const cached = cache.get("VERIFIED_" + email);
  if (cached === "1") return true;

  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty("VERIFIED_" + email);
  if (stored) {
    cache.put("VERIFIED_" + email, "1", 21600); // Lưu cache 6 tiếng
    return true;
  }
  return false;
}

/**
 * Đánh dấu email đã xác thực chính chủ vĩnh viễn trên hệ thống (dùng cho mọi thiết bị)
 */
function setVerifiedEmail(email) {
  if (!email) return;
  email = email.trim().toLowerCase();
  
  const cache = CacheService.getScriptCache();
  cache.put("VERIFIED_" + email, "1", 21600);
  
  const props = PropertiesService.getScriptProperties();
  try {
    props.setProperty("VERIFIED_" + email, String(Date.now()));
  } catch (err) {
    Logger.log("Error setProperty VERIFIED_: " + err.toString());
  }
}

function handleRequestOtp(data) {
  const email = (data.email || "").trim().toLowerCase();
  
  if (!isFTELDomain(email)) {
    return {
      success: false,
      message: "Email phải thuộc miền FPT (@fpt.net hoặc @fpt.com)!"
    };
  }

  // KIỂM TRA ĐẶC BIỆT: Nếu email này ĐÃ XÁC THỰC TRƯỚC ĐÓ (ví dụ trên Laptop)
  // thì khi sang Điện thoại hoặc thiết bị mới: TỰ ĐỘNG BỎ QUA OTP VÀ ĐĂNG NHẬP NGAY!
  if (isEmailAlreadyVerified(email)) {
    const isAdmin = checkIsAdminEmail(email);
    return {
      success: true,
      alreadyVerified: true,
      message: "Email này đã được xác thực trước đó trên hệ thống! Tự động đăng nhập thành công.",
      data: {
        email: email,
        isAdmin: isAdmin
      }
    };
  }

  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();

  // Chống spam yêu cầu OTP (Rút ngắn thời gian chờ còn 15s)
  const lastReqKey = "REQ_" + email;
  if (cache.get(lastReqKey)) {
    return {
      success: false,
      message: "Vui lòng đợi 15 giây trước khi yêu cầu mã OTP mới!"
    };
  }

  // Sinh mã 6 số
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expireAt = now + (5 * 60 * 1000); // 5 phút

  // Lưu vào RAM Cache siêu tốc (<15ms)
  cache.put("OTP_" + email, code, 300); // 300 giây = 5 phút
  cache.put(lastReqKey, "1", 15);        // 15 giây chống spam

  // Dự phòng ghi vào Script Properties
  try {
    props.setProperty("OTP_" + email, code + "_" + expireAt);
  } catch (propErr) {
    Logger.log("Props write fallback warning: " + propErr.toString());
  }

  // Gửi email siêu nhẹ với MailApp (Direct SMTP Google) để Outlook nhận ngay tức thì
  try {
    const subject = "[MÃ OTP: " + code + "] Xác thực Thắp Lửa Tri Ân FTEL";
    const plainText = "Xin chào CBNV FPT Telecom,\n\nMã xác thực OTP của bạn là: " + code + "\n(Mã có hiệu lực trong 5 phút).\n\nFTC - Trung tâm Đào tạo FPT Telecom.";
    
    // Đính kèm logo nội dòng CID để Outlook hiển thị tức thì, KHÔNG BỊ CHẶN ẢNH
    const logoBlob = getFptLogoBlob();
    const logoSrc = logoBlob ? "cid:fptLogo" : "https://raw.githubusercontent.com/thanhtungdev05/20-11-FTC/main/public/assets/logoFPT.png";
    
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; border: 2px solid #f37021; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center;">
        <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 20px 16px;">
          <img src="cid:fptLogo" alt="FPT Telecom" height="46" style="display:block; margin: 0 auto 10px auto; border: 0; outline: none; background: transparent;" />
          <div style="color: #ffffff; font-weight: 900; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;">FPT TELECOM • FTC</div>
          <div style="color: #ffd700; font-size: 11px; margin-top: 3px; font-weight: bold; letter-spacing: 1px;">CHIẾN DỊCH 20/11 - THẮP LỬA TRI ÂN</div>
        </div>
        <div style="padding: 24px 18px; line-height: 1.6; color: #e2e8f0;">
          <p style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0;">
            Xin chào thành viên <strong>FPT Telecom</strong>,
          </p>
          <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 18px;">
            Mã xác thực OTP dùng một lần của bạn để tham gia gửi lời cảm ơn là:
          </p>
          <div style="background: rgba(243, 112, 33, 0.15); border: 2px dashed #f37021; padding: 14px 20px; border-radius: 12px; display: inline-block; margin: 0 auto 18px auto;">
            <span style="font-family: 'Courier New', monospace, sans-serif; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffd700;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
            • Mã có hiệu lực trong vòng <strong>5 phút</strong>.
          </p>
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            (Mã OTP hiển thị trực tiếp ngay trên tiêu đề thông báo của Outlook)
          </p>
        </div>
        <div style="background: #080d1a; padding: 10px; font-size: 10px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          FTEL 20/11 • Trung tâm Đào tạo FPT Telecom (FTC)
        </div>
      </div>
    `;
    
    const mailOptions = {
      to: email,
      subject: subject,
      body: plainText,
      htmlBody: htmlBody,
      name: "FTC - Thắp Lửa Tri Ân",
      noReply: true
    };
    
    if (logoBlob) {
      mailOptions.inlineImages = {
        fptLogo: logoBlob
      };
    }
    
    try {
      MailApp.sendEmail(mailOptions);
    } catch (mailAppErr) {
      GmailApp.sendEmail(email, subject, plainText, {
        htmlBody: htmlBody,
        name: "FTC - Thắp Lửa Tri Ân",
        inlineImages: logoBlob ? { fptLogo: logoBlob } : {}
      });
    }

    return {
      success: true,
      message: "Mã OTP đã được gửi đến hộp thư Outlook của bạn!"
    };
  } catch (err) {
    Logger.log("sendOtp Error: " + err.toString());
    return {
      success: false,
      message: "Lỗi gửi email OTP: " + err.message
    };
  }
}

/**
 * Xử lý kiểm tra mã OTP (Tối ưu kiểm tra RAM CacheService trước)
 */
function handleVerifyOtp(data) {
  const email = (data.email || "").trim().toLowerCase();
  const inputOtp = (data.otp || "").trim();

  if (!email || !inputOtp) {
    return {
      success: false,
      message: "Vui lòng nhập đầy đủ email và mã OTP!"
    };
  }

  const cache = CacheService.getScriptCache();
  const cachedOtp = cache.get("OTP_" + email);
  let isMatch = false;

  if (cachedOtp) {
    if (cachedOtp === inputOtp) {
      isMatch = true;
      cache.remove("OTP_" + email);
    }
  } else {
    // Fallback: Kiểm tra PropertiesService
    const props = PropertiesService.getScriptProperties();
    const stored = props.getProperty("OTP_" + email);
    if (stored) {
      const parts = stored.split("_");
      const validCode = parts[0];
      const expireAt = parseInt(parts[1], 10);
      if (Date.now() <= expireAt && inputOtp === validCode) {
        isMatch = true;
      }
      props.deleteProperty("OTP_" + email);
    }
  }

  if (!isMatch) {
    return {
      success: false,
      message: "Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại!"
    };
  }

  // OTP chính xác -> Đánh dấu email đã xác thực chính chủ trên toàn hệ thống (mọi thiết bị khác tự động bỏ qua OTP)
  setVerifiedEmail(email);

  // Kiểm tra quyền Admin
  const isAdmin = checkIsAdminEmail(email);

  return {
    success: true,
    message: "Xác thực thành công!",
    data: {
      email: email,
      isAdmin: isAdmin
    }
  };
}

/**
 * Kiểm tra xem email có thuộc danh sách Admin hay không
 */
function checkIsAdminEmail(email) {
  if (!email) return false;
  email = email.trim().toLowerCase();

  // 1. Kiểm tra tài khoản deployer mặc định
  try {
    const activeUser = Session.getActiveUser().getEmail().toLowerCase();
    if (activeUser && activeUser === email) return true;
  } catch (e) {}

  // 2. Tài khoản Super Admin cố định hệ thống (Toàn quyền quản trị)
  const superAdmins = [
    "tungdt101@fpt.com",
    "tungdt101@fpt.net",
    "dtung2788@gmail.com"
  ];
  if (superAdmins.indexOf(email) !== -1) {
    return true;
  }

  // 3. Mở Sheet AdminConfig kiểm tra danh sách động
  const adminSheet = getOrCreateAdminSheet();
  const lastRow = adminSheet.getLastRow();
  if (lastRow <= 1) return false;

  const data = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === email) {
      return true;
    }
  }

  return false;
}

/**
 * Tạo hoặc lấy Sheet AdminConfig
 */
function getOrCreateAdminSheet() {
  let ss = null;
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID.trim());
    } catch (err) {}
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {}
  }
  if (!ss) {
    throw new Error("Không thể mở Google Spreadsheet!");
  }

  let sheet = ss.getSheetByName(CONFIG.ADMIN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ADMIN_SHEET);
    const headers = ["Email Quản Trị", "Vai Trò", "Ngày Thêm", "Người Cấp Quyền"];
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#B8860B");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 250);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 180);
    sheet.setColumnWidth(4, 200);

    // Thêm Super Admin mặc định
    const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([
      "tungdt101@fpt.com",
      "Super Admin",
      nowStr,
      "System Master"
    ]);
    sheet.appendRow([
      "dtung2788@gmail.com",
      "Super Admin",
      nowStr,
      "System Master"
    ]);
  }

  return sheet;
}

/**
 * Đăng nhập Admin bằng Secret Key
 */
function handleAdminLogin(data) {
  const secretKey = (data.secretKey || "").trim();
  const email = (data.email || "").trim().toLowerCase();

  const isKeyValid = (secretKey === CONFIG.ADMIN_SECRET_KEY);
  const isEmailAdmin = email ? checkIsAdminEmail(email) : false;

  if (isKeyValid || isEmailAdmin) {
    return {
      success: true,
      message: "Đăng nhập quyền Quản trị thành công!",
      data: {
        isAdmin: true,
        secretKey: CONFIG.ADMIN_SECRET_KEY
      }
    };
  }

  return {
    success: false,
    message: "Khóa bảo mật quản trị (Secret Key) hoặc tài khoản không hợp lệ!"
  };
}

/**
 * Lấy danh sách tài khoản Admin
 */
function handleAdminGetAdmins(data) {
  const secretKey = (data.secretKey || "").trim();
  const callerEmail = (data.callerEmail || "").trim().toLowerCase();

  if (secretKey !== CONFIG.ADMIN_SECRET_KEY && !checkIsAdminEmail(callerEmail)) {
    return {
      success: false,
      message: "Từ chối truy cập: Bạn không có quyền xem cấu hình Admin!"
    };
  }

  const sheet = getOrCreateAdminSheet();
  const lastRow = sheet.getLastRow();
  let list = [];
  if (lastRow > 1) {
    const dataRows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    list = dataRows.map(row => ({
      email: String(row[0]).trim(),
      role: String(row[1]).trim(),
      addedDate: String(row[2]).trim(),
      grantedBy: String(row[3]).trim()
    })).filter(item => item.email !== "");
  }

  // Tự động kiểm tra và đảm bảo tungdt101@fpt.com luôn có mặt trong danh sách Super Admin
  const hasTung = list.some(a => a.email.toLowerCase() === "tungdt101@fpt.com");
  if (!hasTung) {
    const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow(["tungdt101@fpt.com", "Super Admin", nowStr, "System Master"]);
    list.unshift({
      email: "tungdt101@fpt.com",
      role: "Super Admin",
      addedDate: nowStr,
      grantedBy: "System Master"
    });
  }

  return {
    success: true,
    data: list
  };
}

/**
 * Thêm hoặc xóa tài khoản Admin
 */
function handleAdminSetAdmin(data) {
  const secretKey = (data.secretKey || "").trim();
  const callerEmail = (data.callerEmail || "").trim().toLowerCase();
  const targetEmail = (data.targetEmail || "").trim().toLowerCase();
  const op = data.operation || "add"; // "add" | "remove"
  const role = (data.role || "Admin Quản Lý").trim();

  if (secretKey !== CONFIG.ADMIN_SECRET_KEY && !checkIsAdminEmail(callerEmail)) {
    return {
      success: false,
      message: "Từ chối truy cập: Bạn không có quyền phân quyền Quản trị viên!"
    };
  }

  // Chống xóa tài khoản Super Admin chính
  if (op === "remove" && (targetEmail === "tungdt101@fpt.com" || targetEmail === "tungdt101@fpt.net")) {
    return {
      success: false,
      message: "Không thể hủy quyền của Super Admin hệ thống!"
    };
  }

  if (!isFTELDomain(targetEmail) && !targetEmail.endsWith("@gmail.com")) {
    return {
      success: false,
      message: "Email phân quyền phải là email FTEL (@fpt.net / @fpt.com)!"
    };
  }

  const sheet = getOrCreateAdminSheet();
  const lastRow = sheet.getLastRow();
  const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  if (op === "add") {
    // Kiểm tra trùng
    if (lastRow > 1) {
      const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existing.length; i++) {
        if (String(existing[i][0]).trim().toLowerCase() === targetEmail) {
          return {
            success: false,
            message: "Tài khoản này đã có quyền Quản trị viên trước đó!"
          };
        }
      }
    }

    sheet.appendRow([targetEmail, role, nowStr, callerEmail || "Super Admin"]);
    return {
      success: true,
      message: "Đã cấp quyền " + role + " thành công cho " + targetEmail + "!"
    };
  }

  if (op === "remove") {
    if (lastRow <= 1) {
      return { success: false, message: "Danh sách Admin trống." };
    }

    const existing = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).trim().toLowerCase() === targetEmail) {
        sheet.deleteRow(i + 2);
        return {
          success: true,
          message: "Đã hủy quyền Quản trị của " + targetEmail + "!"
        };
      }
    }

    return {
      success: false,
      message: "Không tìm thấy tài khoản trong danh sách Admin."
    };
  }

  return {
    success: false,
    message: "Hành động phân quyền không hợp lệ."
  };
}

/**
 * Lấy toàn bộ danh sách gửi tri ân (Chỉ Admin)
 */
function handleAdminGetAllSubmissions(data) {
  const secretKey = (data.secretKey || "").trim();
  const callerEmail = (data.callerEmail || "").trim().toLowerCase();

  if (secretKey !== CONFIG.ADMIN_SECRET_KEY && !checkIsAdminEmail(callerEmail)) {
    return {
      success: false,
      message: "Từ chối truy cập: Dữ liệu này được bảo vệ ở chế độ Restricted!"
    };
  }

  const sheet = getOrCreateSheet(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      success: true,
      data: []
    };
  }

  const rawValues = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  const list = rawValues.map(r => ({
    submissionId: r[0],
    timestamp: r[1],
    senderName: r[2],
    senderEmail: r[3],
    senderDept: r[4],
    recipientName: r[5],
    recipientEmail: r[6],
    recipientRole: r[7],
    tag: r[8],
    message: r[9],
    cardStyle: r[10],
    emailSentStatus: r[11],
    emailSentTime: r[12]
  }));

  return {
    success: true,
    data: list
  };
}

/**
 * Xóa một lượt gửi tri ân (Chỉ dành cho Admin)
 */
function handleAdminDeleteSubmission(data) {
  const secretKey = (data.secretKey || "").trim();
  const callerEmail = (data.callerEmail || "").trim().toLowerCase();
  const submissionId = (data.submissionId || "").trim();

  if (secretKey !== CONFIG.ADMIN_SECRET_KEY && !checkIsAdminEmail(callerEmail)) {
    return {
      success: false,
      message: "Từ chối truy cập: Bạn không có quyền xóa lời tri ân!"
    };
  }

  if (!submissionId) {
    return {
      success: false,
      message: "Vui lòng cung cấp mã lượt gửi (submissionId) cần xóa!"
    };
  }

  const sheet = getOrCreateSheet(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return {
      success: false,
      message: "Danh sách lời tri ân đang trống."
    };
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === submissionId) {
      sheet.deleteRow(i + 2);
      return {
        success: true,
        message: "Đã xóa thành công lời tri ân có mã " + submissionId + "!"
      };
    }
  }

  return {
    success: false,
    message: "Không tìm thấy lời tri ân với mã: " + submissionId
  };
}
