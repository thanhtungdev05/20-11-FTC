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
function sendGratitudeNotificationEmail(params) {
  const subject = CONFIG.EMAIL_SUBJECT_PREFIX + params.senderName + " (" + params.senderDept + ")";
  
  // HTML Template email sang trọng với màu sắc nhận diện FPT
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #f37021;">
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 30px 20px; text-align: center;">
        <img src="https://ftc-gialapthietbi.onrender.com/assets/logoFPT.png" alt="FPT Logo" height="42" style="display:block; margin: 0 auto 12px auto;" />
        <h3 style="color: #ffd700; margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Trung tâm Đào tạo FTEL (FTC)</h3>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">THẮP LỬA TRI ÂN – THẮP SÁNG TRI THỨC</h1>
      </div>
      
      <!-- Content Body -->
      <div style="padding: 30px 25px; line-height: 1.6; color: #e2e8f0;">
        <p style="font-size: 18px; color: #ffffff; margin-top: 0;">
          Xin chào <strong>${escapeHtml(params.recipientName)}</strong>,
        </p>
        <p style="font-size: 15px;">
          Nhân dịp ngày Nhà giáo & Tôn vinh Người chia sẻ tri thức 20/11, bạn vừa nhận được một ngọn lửa tri ân đầy ấm áp từ đồng nghiệp 
          <strong style="color: #f37021;">${escapeHtml(params.senderName)}</strong> (${escapeHtml(params.senderDept)}):
        </p>
        
        <!-- Message Card Box -->
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

        <p style="font-size: 14px; color: #cbd5e1; text-align: center;">
          Cảm ơn bạn đã luôn là ngọn lửa kiên định, tận tâm đồng hành và trao truyền tri thức quý giá cho người FPT!
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #080d1a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
        <p style="margin: 0 0 5px 0;">Chiến dịch "Thắp Lửa Tri Ân - 20/11/2026" | FPT Telecom</p>
        <p style="margin: 0;">Email này được gửi tự động từ hệ thống Web App Tri Ân.</p>
      </div>
    </div>
  `;

  const mailOptions = {
    to: params.recipientEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: "FTC - Trung tâm Đào tạo FPT Telecom"
  };

  // Nếu có ảnh Base64 của E-Card, đính kèm vào Email
  if (params.cardImageBase64 && params.cardImageBase64.indexOf("base64,") !== -1) {
    try {
      const base64Data = params.cardImageBase64.split("base64,")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const blob = Utilities.newBlob(decodedBytes, "image/png", "Thiệp_Tri_Ân_" + params.recipientName + ".png");
      mailOptions.attachments = [blob];
    } catch (attachErr) {
      Logger.log("Attach image error: " + attachErr.toString());
    }
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
function handleRequestOtp(data) {
  const email = (data.email || "").trim().toLowerCase();
  
  if (!isFTELDomain(email)) {
    return {
      success: false,
      message: "Email phải thuộc miền FPT (@fpt.net hoặc @fpt.com)!"
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
    const subject = "[FTC 20/11] Mã xác thực OTP thắp lửa tri ân: " + code;
    const plainText = "Xin chào thành viên FPT Telecom,\n\nMã xác thực OTP thắp lửa tri ân 20/11 của bạn là: " + code + "\n(Mã có hiệu lực trong 5 phút).\n\nFTC - Trung tâm Đào tạo FPT Telecom.";
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f37021; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 22px 20px; text-align: center;">
          <img src="https://ftc-gialapthietbi.onrender.com/assets/logoFPT.png" alt="FPT Logo" height="34" style="display:block; margin: 0 auto 8px auto;" />
          <h3 style="color: #ffd700; margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Trung tâm Đào tạo FTEL (FTC)</h3>
          <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: bold;">MÃ XÁC THỰC TÀI KHOẢN FTEL</h2>
        </div>
        <div style="padding: 25px 20px; line-height: 1.6; color: #e2e8f0; text-align: center;">
          <p style="font-size: 15px; color: #ffffff; margin: 0 0 12px 0;">
            Xin chào thành viên <strong>FPT Telecom</strong>,
          </p>
          <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 20px;">
            Bạn đang đăng nhập vào cổng <strong>"Thắp Lửa Tri Ân 20/11"</strong>. Dưới đây là mã OTP dùng một lần của bạn:
          </p>
          <div style="background: rgba(243, 112, 33, 0.15); border: 2px dashed #f37021; padding: 14px 22px; border-radius: 12px; display: inline-block; margin: 0 auto 20px auto;">
            <span style="font-family: monospace; font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #ffd700;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">
            ⏳ Mã có hiệu lực trong vòng <strong>5 phút</strong>.
          </p>
        </div>
        <div style="background: #080d1a; padding: 12px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          <p style="margin: 0;">FTEL 20/11 • Trung tâm Đào tạo FPT Telecom (FTC)</p>
        </div>
      </div>
    `;

    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: plainText,
        htmlBody: htmlBody,
        name: "FTC - Thắp Lửa Tri Ân"
      });
    } catch (mailAppErr) {
      // Fallback qua GmailApp nếu MailApp gặp hạn mức riêng
      GmailApp.sendEmail(email, subject, plainText, {
        htmlBody: htmlBody,
        name: "FTC - Thắp Lửa Tri Ân"
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

  // OTP chính xác -> Kiểm tra quyền Admin
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

  // 2. Mở Sheet AdminConfig
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

    // Thêm Admin mặc định
    sheet.appendRow([
      "dtung2788@gmail.com",
      "Super Admin",
      Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"),
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
  if (lastRow <= 1) {
    return {
      success: true,
      data: []
    };
  }

  const dataRows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const list = dataRows.map(row => ({
    email: String(row[0]).trim(),
    role: String(row[1]).trim(),
    addedDate: String(row[2]).trim(),
    grantedBy: String(row[3]).trim()
  })).filter(item => item.email !== "");

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
      message: "Đã cấp quyền Quản trị viên thành công cho " + targetEmail + "!"
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
