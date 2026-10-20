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
  const lock = LockService.getScriptLock();
  try {
    // Khóa tránh ghi đè đồng thời (concurrency control)
    lock.waitLock(15000);
    
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

    // Action 1: Gửi lời tri ân
    if (action === "submit_gratitude") {
      const result = handleGratitudeSubmission(payload);
      return createJsonResponse(result);
    }
    
    // Action 2: Xác thực email / Gửi OTP (nếu chọn chế độ OTP)
    if (action === "request_otp") {
      const result = handleRequestOtp(payload);
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
  } finally {
    lock.releaseLock();
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
