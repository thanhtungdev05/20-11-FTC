/**
 * ==============================================================================
 * DỰ ÁN: "THẮP LỬA TRI ÂN" - FTEL 20/11/2026
 * GOOGLE APPS SCRIPT BACKEND (TÍCH HỢP GOOGLE FORM -> SHEET -> DRIVE -> OUTLOOK MAIL & LIVE DASHBOARD)
 * ==============================================================================
 *
 * HƯỚNG DẪN CÀI ĐẶT TRÊN GOOGLE SHEET CỦA CHƯƠNG TRÌNH:
 * 1. Mở Google Sheet câu trả lời:
 *    https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit
 * 2. Vào menu Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã nguồn file Code.gs này vào và bấm Lưu (Ctrl + S).
 * 4. Chạy hàm `setupSystemAndTriggers()` 1 lần để:
 *    - Tự động khởi tạo các cột mở rộng trên Sheet câu trả lời Google Form
 *    - Tự động tạo tab `DS_NhanSu` (Danh sách nhân sự: Email, Họ tên, Đơn vị, Ảnh đại diện)
 *    - Tự động gắn Trigger `onFormSubmit` khi có người điền Google Form
 * 5. Bấm Triển khai (Deploy) -> Tùy chọn triển khai mới (New deployment) -> Ứng dụng web (Web app):
 *    - Thực thi dưới dạng (Execute as): Tôi (Me)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 6. Copy URL Web App dán vào cấu hình trên trang Web Dashboard.
 */

const CONFIG = {
  // ID Google Sheet câu trả lời Google Form chính thức
  SPREADSHEET_ID: "1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g",
  FORM_RESPONSE_GID: 1557167031,

  // Link Google Form chính thức
  GOOGLE_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLScj0_gZJpGol1tWVUDGfyCB0s7sgr7AZ6k40VJ16yATluhVBA/viewform",

  // GID & Tên tab Danh sách nhân sự (https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit?gid=1084168011#gid=1084168011)
  HR_SHEET_GID: 1084168011,
  HR_SHEET_NAME: "DS nhân sự",

  // Tên tab lưu trữ từ Web (dự phòng nếu gửi trực tiếp từ Web)
  LEGACY_SHEET_NAME: "DanhSachTriAn",

  // Tên tab cấu hình Admin
  ADMIN_SHEET: "AdminConfig",

  // Tên thư mục Google Drive lưu trữ ảnh thiệp E-Card (1080x1440)
  DRIVE_FOLDER_NAME: "FTEL_20_11_ECards_2026",

  // Phôi thiệp trống mặc định (URL public trên hệ thống Render để Apps Script có thể tải nếu cần)
  CARD_TEMPLATE_URL: "https://gui-loi-cam-on-thap-sang-tri-thuc.onrender.com/assets/key-visual-card.jpg",

  // Mã bí mật dành cho Admin
  ADMIN_SECRET_KEY: "FTEL_TRI_AN_2026",

  // Các miền email hợp lệ theo đúng Regex trên Google Form
  ALLOWED_DOMAINS: ["fpt.com", "fpt.net", "vienthongtin.com"],

  // Tiêu đề email chính thức theo yêu cầu của BTC
  EMAIL_SUBJECT_SUCCESS: "MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN",
  EMAIL_SUBJECT_SENDER: "XÁC NHẬN BẠN ĐÃ THẮP LÊN MỘT NGỌN LỬA TRI ÂN 20/11",
  EMAIL_SUBJECT_DUPLICATE: "[FTEL 20/11] Thông báo: Mỗi tài khoản chỉ gửi 1 lần cho cùng một đồng nghiệp",

  // Cấu hình nội dung email (chế độ "nhẹ" giúp Outlook/Exchange FPT ít chặn hơn)
  // - EMAIL_EMBED_CARD_IMAGE: hiển thị ảnh thiệp ngay trong thân email
  // - EMAIL_ATTACH_CARD_FILE: đính kèm thêm file ảnh thiệp (tắt mặc định để mail nhẹ, chỉ giữ link Drive)
  EMAIL_EMBED_CARD_IMAGE: true,
  EMAIL_ATTACH_CARD_FILE: false,

  // Tên Script Property lưu ID file phôi thiệp trên Google Drive (tự động tạo ở lần tải đầu tiên)
  CARD_TEMPLATE_PROP_KEY: "CARD_TEMPLATE_FILE_ID"
};

/**
 * ==============================================================================
 * 1. CẤU TRÚC CỘT TRÊN SHEET CÂU TRẢ LỜI GOOGLE FORM (1-based index)
 * ==============================================================================
 * Cột A (1): Dấu thời gian (Timestamp - do Google Form tự ghi)
 * Cột B (2): 1. NGƯỜI THẮP LỬA TRI ÂN (Email người gửi - do Google Form tự ghi)
 * Cột C (3): 2. NGƯỜI NHẬN NGỌN LỬA TRI ÂN (Email người nhận - do Google Form tự ghi)
 * Cột D (4): 3. DẤU ẤN CỦA NGƯỜI NHẬN LỬA (Vai trò/Dấu ấn - do Google Form tự ghi)
 * Cột E (5): 4. HÃY GỬI LỜI CẢM ƠN CỦA BẠN ĐẾN NGƯỜI NHẬN NGỌN LỬA TRI ÂN (Thông điệp gốc)
 * --- CÁC CỘT HỆ THỐNG TỰ ĐỘNG ĐIỀN THÊM ---
 * Cột F (6): Họ tên người gửi (Lấy từ DS_NhanSu)
 * Cột G (7): Đơn vị người gửi (Lấy từ DS_NhanSu)
 * Cột H (8): Họ tên người nhận (Lấy từ DS_NhanSu)
 * Cột I (9): Đơn vị người nhận (Lấy từ DS_NhanSu)
 * Cột J (10): Thông điệp chuẩn hóa chính tả
 * Cột K (11): Trạng thái kiểm tra (HỢP LỆ / TRÙNG LẶP)
 * Cột L (12): Trạng thái gửi Mail (ĐÃ GỬI MAIL / CHỜ XUẤT THIỆP / ĐÃ BÁO TRÙNG)
 * Cột M (13): Link Thiệp Google Drive
 * Cột N (14): Mã định danh & Thời gian xử lý
 */

/**
 * Hàm chạy 1 lần để khởi tạo cột, tab DS_NhanSu và Trigger tự động
 */
function setupSystemAndTriggers() {
  const ss = getSpreadsheet();
  const formSheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(formSheet);
  ensureHrDirectorySheet(ss);

  // Xóa trigger cũ (nếu có) để tránh nhân đôi
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "onFormSubmitTrigger") {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Tạo trigger onFormSubmit mới
  ScriptApp.newTrigger("onFormSubmitTrigger")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log("✅ Đã khởi tạo hệ thống, tab DS_NhanSu và Trigger onFormSubmit thành công!");
}

/**
 * Thêm menu tiện ích ngay trên thanh công cụ Google Sheet cho BTC
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🔥 FTC 20/11 - Quản Trị")
      .addItem("1. Khởi tạo cột & Trigger tự động", "setupSystemAndTriggers")
      .addItem("2. Quét & Xử lý các dòng mới từ Google Form", "processAllUnprocessedRows")
      .addItem("3. Gửi thử nghiệm 1 Email về Outlook TungDT101@fpt.com", "testSendMailToTungDT")
      .addSeparator()
      .addItem("4. Chẩn đoán hệ thống gửi mail", "menuDiagnoseMailSystem")
      .addItem("5. Gửi lại tất cả mail bị LỖI", "menuResendFailedMails")
      .addItem("6. Gửi lại mail cho 1 dòng cụ thể", "menuResendMailForRow")
      .addToUi();
  } catch (e) {}
}

/**
 * Hàm kiểm tra nhanh: Bấm Chạy để gửi 1 email thử nghiệm trực tiếp về hộp thư Outlook của bạn
 * (Trả về KẾT QUẢ THẬT: thành công / lỗi cụ thể, không còn báo "thành công" giả)
 */
function testSendMailToTungDT() {
  const activeUser = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  Logger.log("Đang gửi email thử nghiệm từ tài khoản Google: " + activeUser);
  const res = sendGratitudeNotificationEmail({
    recipientEmail: "tungdt101@fpt.com",
    recipientName: "Đặng Thanh Tùng",
    recipientDept: "Trung tâm Đào tạo FTEL (FTC)",
    recipientRole: "Người dẫn dắt – Người truyền cảm hứng",
    senderEmail: "nhanlh10@fpt.com",
    senderName: "Lê Hoàng Nhân (FTC)",
    senderDept: "Trung tâm Đào tạo FTEL (FTC)",
    message: "Cảm ơn Anh Đặng Thanh Tùng đã luôn là ngọn lửa nhiệt huyết truyền cảm hứng, tận tâm chia sẻ tri thức và đồng hành cùng anh em tại Trung tâm Đào tạo FTEL (FTC). Nhân dịp 20/11, chúc Anh luôn dồi dào sức khỏe, hạnh phúc và tiếp tục thắp sáng hành trình tri thức tại FPT Telecom!"
  });
  const summary = res.ok
    ? "✅ Google ĐÃ GỬI mail đi thành công từ tài khoản: " + activeUser +
      "\n\nNếu Outlook vẫn không thấy thư: hãy kiểm tra thẻ 'Khác' (Other), 'Thư rác' (Junk) và khu cách ly https://security.microsoft.com/quarantine. Nếu vẫn không có → hệ thống mail FPT đang chặn thư từ Google, cần nhờ IT cho phép địa chỉ gửi."
    : "❌ GỬI MAIL THẤT BẠI từ tài khoản: " + activeUser + "\n\nLý do: " + buildMailStatusText(res);
  Logger.log(summary + "\nHạn mức mail còn lại hôm nay: " + res.quotaRemaining);
  showAdminAlert("Kết quả gửi mail thử nghiệm", summary + "\n\nHạn mức mail còn lại hôm nay: " + res.quotaRemaining);
  return res;
}

/**
 * Hiển thị hộp thoại trên Google Sheet (bỏ qua nếu chạy từ trình soạn thảo / Web App)
 */
function showAdminAlert(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menu 4: Chẩn đoán hệ thống gửi mail
 */
function menuDiagnoseMailSystem() {
  const info = diagnoseMailSystem();
  const lines = [
    "Tài khoản gửi mail: " + info.effectiveUser,
    "Loại tài khoản: " + info.accountType,
    "Hạn mức mail còn lại hôm nay: " + info.remainingDailyQuota,
    "Quyền truy cập: " + info.authorizationStatus,
    "Trigger tự động Google Form: " + (info.formSubmitTriggerInstalled ? "ĐÃ CÀI" : "CHƯA CÀI"),
    "Phôi thiệp lưu trên Drive: " + (info.cardTemplateFileId ? "CÓ" : "CHƯA (sẽ tự tạo ở lần gửi đầu)")
  ];
  if (info.warnings.length) {
    lines.push("", "⚠️ CẢNH BÁO:");
    info.warnings.forEach(w => lines.push("- " + w));
  } else {
    lines.push("", "✅ Không phát hiện lỗi phía Google Apps Script.");
  }
  Logger.log(lines.join("\n"));
  showAdminAlert("Chẩn đoán hệ thống gửi mail", lines.join("\n"));
  return info;
}

/**
 * Menu 5: Gửi lại tất cả các dòng có trạng thái mail bị LỖI
 */
function menuResendFailedMails() {
  const res = resendFailedMails();
  const msg = "Đã thử gửi lại: " + res.attempted + " dòng\nThành công: " + res.succeeded + "\nVẫn lỗi: " + res.failed +
    (res.details.length ? "\n\nChi tiết:\n" + res.details.slice(0, 15).join("\n") : "");
  Logger.log(msg);
  showAdminAlert("Gửi lại mail bị lỗi", msg);
  return res;
}

/**
 * Menu 6: Gửi lại mail cho 1 dòng cụ thể (dùng cho các dòng cũ bị ghi "ĐÃ GỬI MAIL" nhưng thực tế chưa nhận được)
 */
function menuResendMailForRow() {
  let ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    Logger.log("Chỉ chạy được từ menu Google Sheet.");
    return;
  }
  const answer = ui.prompt("Gửi lại mail cho 1 dòng", "Nhập số dòng trên Sheet câu trả lời (ví dụ: 3):", ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const rowNumber = Number(String(answer.getResponseText() || "").trim());
  const res = resendMailForRow(rowNumber);
  ui.alert("Kết quả gửi lại mail dòng " + rowNumber, res.message, ui.ButtonSet.OK);
  return res;
}

/**
 * Trigger tự động kích hoạt ngay khi có người bấm Gửi trên Google Form
 */
function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    processAllUnprocessedRows();
  } catch (err) {
    Logger.log("onFormSubmitTrigger Error: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * ==============================================================================
 * 2. LUỒNG XỬ LÝ TỰ ĐỘNG: CHECK TRÙNG -> TRA CỨU HR -> SỬA CHÍNH TẢ -> LƯU DRIVE -> GỬI MAIL
 * ==============================================================================
 */
function processAllUnprocessedRows() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { processed: 0, pendingRender: [] };

  const dataRange = sheet.getRange(1, 1, lastRow, 14);
  const values = dataRange.getValues();
  const hrMap = loadHrDirectoryMap(ss);

  // Tập hợp các cặp (senderEmail | recipientEmail) đã hợp lệ trước đó để check trùng (Mỗi người chỉ gửi 1 lần cho 1 đồng nghiệp)
  const seenPairs = new Set();
  let processedCount = 0;
  const pendingRenderList = [];

  for (let i = 1; i < values.length; i++) {
    const rowNumber = i + 1;
    const row = values[i];

    const timestamp = row[0];
    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const recipientRole = String(row[3] || "Giảng viên – Người truyền tri thức").trim();
    const rawMessage = String(row[4] || "").trim();

    if (!senderEmail && !recipientEmail && !rawMessage) continue;

    const currentCheckStatus = String(row[10] || "").trim(); // Cột K: Trạng thái kiểm tra
    const currentMailStatus = String(row[11] || "").trim();  // Cột L: Trạng thái gửi Mail
    const pairKey = buildDuplicateKey(senderEmail, recipientEmail);

    const senderHr = lookupHrByEmail(hrMap, senderEmail) || {
      name: String(row[5] || "").trim() || fallbackNameFromEmail(senderEmail),
      dept: String(row[6] || "").trim() || "FPT Telecom"
    };
    const recipientHr = lookupHrByEmail(hrMap, recipientEmail) || {
      name: String(row[7] || "").trim() || fallbackNameFromEmail(recipientEmail),
      dept: String(row[8] || "").trim() || "FPT Telecom"
    };

    // Nếu dòng này đã được xử lý trước đó:
    if (currentCheckStatus === "HỢP LỆ") {
      seenPairs.add(pairKey);
      // Tự động cập nhật bổ sung Họ tên & Đơn vị từ Sheet DS nhân sự (gid=1084168011) nếu dòng cũ chưa có tên chuẩn
      const existingSName = String(row[5] || "").trim();
      const existingRName = String(row[7] || "").trim();
      if (
        (senderHr.name && existingSName !== senderHr.name) ||
        (recipientHr.name && existingRName !== recipientHr.name)
      ) {
        sheet.getRange(rowNumber, 6, 1, 4).setValues([[
          senderHr.name,
          senderHr.dept,
          recipientHr.name,
          recipientHr.dept
        ]]);
      }

      // Tự động gửi mail cho dòng hợp lệ CHƯA TỪNG GỬI (trống / chờ xuất thiệp).
      // Các dòng "LỖI MAIL" KHÔNG tự gửi lại mỗi lần mở Dashboard (tránh đốt hạn mức) → dùng menu "5. Gửi lại tất cả mail bị LỖI".
      if (currentMailStatus === "" || currentMailStatus === "CHỜ XUẤT THIỆP") {
        const mailRes = sendGratitudeNotificationEmail({
          recipientEmail: recipientEmail,
          recipientName: recipientHr.name || existingRName || fallbackNameFromEmail(recipientEmail),
          recipientDept: recipientHr.dept || String(row[8] || "FPT Telecom"),
          senderEmail: senderEmail,
          senderName: senderHr.name || existingSName || fallbackNameFromEmail(senderEmail),
          senderDept: senderHr.dept || String(row[6] || "FPT Telecom"),
          recipientRole: recipientRole,
          message: String(row[9] || rawMessage),
          cardBlob: null,
          driveFileUrl: String(row[12] || "")
        });
        sheet.getRange(rowNumber, 12).setValue(buildMailStatusText(mailRes));
      }

      // Nếu chưa có ảnh thiệp Drive thì đưa vào danh sách chờ Web Canvas xuất thiệp
      const existingDriveUrl = String(row[12] || "").trim();
      if (!existingDriveUrl) {
        pendingRenderList.push({
          rowNumber: rowNumber,
          timestamp: formatTimestamp(timestamp),
          senderEmail: senderEmail,
          senderName: senderHr.name || existingSName || fallbackNameFromEmail(senderEmail),
          senderDept: senderHr.dept || String(row[6] || "FPT Telecom"),
          recipientEmail: recipientEmail,
          recipientName: recipientHr.name || existingRName || fallbackNameFromEmail(recipientEmail),
          recipientDept: recipientHr.dept || String(row[8] || "FPT Telecom"),
          recipientRole: recipientRole,
          message: String(row[9] || rawMessage)
        });
      }
      continue;
    }

    if (currentCheckStatus === "TRÙNG LẶP") {
      continue;
    }

    // Kiểm tra trùng: Mỗi tài khoản người gửi chỉ được gửi cho mỗi người nhận 1 lần duy nhất trong toàn chiến dịch
    const isDuplicate = seenPairs.has(pairKey);

    if (isDuplicate) {
      const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
      const dupRes = sendDuplicateWarningEmail({
        senderEmail: senderEmail,
        senderName: senderHr.name,
        recipientName: recipientHr.name,
        recipientEmail: recipientEmail,
        message: rawMessage
      });
      const dupMailStatus = dupRes.ok
        ? "ĐÃ BÁO TRÙNG"
        : "LỖI GỬI BÁO TRÙNG: " + truncateText(dupRes.error, 250);

      sheet.getRange(rowNumber, 6, 1, 9).setValues([[
        senderHr.name,
        senderHr.dept,
        recipientHr.name,
        recipientHr.dept,
        rawMessage,
        "TRÙNG LẶP",
        dupMailStatus,
        "",
        "DUP-" + nowStr
      ]]);
      processedCount++;
      continue;
    }

    // Dòng HỢP LỆ -> Ghi nhận vào tập đã thấy
    seenPairs.add(pairKey);

    // Chỉnh sửa chính tả & chuẩn hóa câu chữ tiếng Việt
    const cleanedMessage = cleanAndCorrectVietnameseText(rawMessage);
    const submissionId = "FTEL-" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss") + "-R" + rowNumber;

    // TỰ ĐỘNG GỬI EMAIL NGAY LẬP TỨC CHO CẢ NGƯỜI NHẬN & NGƯỜI GỬI (ĐỘC LẬP TO:, KHÔNG CẦN CHỜ WEB)
    // Ghi TRẠNG THÁI THẬT vào cột L (ĐÃ GỬI MAIL / LỖI MAIL: lý do cụ thể)
    const mailRes = sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientHr.name,
      recipientDept: recipientHr.dept,
      senderEmail: senderEmail,
      senderName: senderHr.name,
      senderDept: senderHr.dept,
      recipientRole: recipientRole,
      message: cleanedMessage,
      cardBlob: null,
      driveFileUrl: ""
    });
    const mailStatus = buildMailStatusText(mailRes);

    // Ghi thông tin HR + chính tả vào cột F -> N
    sheet.getRange(rowNumber, 6, 1, 9).setValues([[
      senderHr.name,
      senderHr.dept,
      recipientHr.name,
      recipientHr.dept,
      cleanedMessage,
      "HỢP LỆ",
      mailStatus,
      "",
      submissionId
    ]]);

    pendingRenderList.push({
      rowNumber: rowNumber,
      submissionId: submissionId,
      timestamp: formatTimestamp(timestamp),
      senderEmail: senderEmail,
      senderName: senderHr.name,
      senderDept: senderHr.dept,
      recipientEmail: recipientEmail,
      recipientName: recipientHr.name,
      recipientDept: recipientHr.dept,
      recipientRole: recipientRole,
      message: cleanedMessage
    });

    processedCount++;
  }

  return {
    processed: processedCount,
    pendingRender: pendingRenderList
  };
}

/**
 * Hoàn tất lưu ảnh E-Card 1080x1440 lên Google Drive, gắn link vào Sheet và gửi Email cho Người nhận (CC Người gửi)
 */
function handleCompleteEcardAndSendMail(payload) {
  const rowNumber = Number(payload.rowNumber);
  const cardImageBase64 = payload.cardImageBase64 || "";
  if (!rowNumber || rowNumber <= 1) {
    return { success: false, message: "Thiếu số thứ tự dòng (rowNumber) hợp lệ." };
  }

  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  const row = sheet.getRange(rowNumber, 1, 1, 14).getValues()[0];
  const senderEmail = String(row[1] || payload.senderEmail || "").trim().toLowerCase();
  const recipientEmail = String(row[2] || payload.recipientEmail || "").trim().toLowerCase();
  const recipientRole = String(row[3] || payload.recipientRole || "Giảng viên – Người truyền tri thức").trim();
  const senderName = String(row[5] || payload.senderName || fallbackNameFromEmail(senderEmail)).trim();
  const senderDept = String(row[6] || payload.senderDept || "FPT Telecom").trim();
  const recipientName = String(row[7] || payload.recipientName || fallbackNameFromEmail(recipientEmail)).trim();
  const recipientDept = String(row[8] || payload.recipientDept || "FPT Telecom").trim();
  const message = String(row[9] || row[4] || payload.message || "").trim();

  // 1. Lưu file ảnh E-Card vào Google Drive và lấy link
  let driveFileUrl = String(row[12] || "").trim();
  let cardBlob = null;

  if (cardImageBase64 && cardImageBase64.indexOf("base64,") !== -1) {
    const base64Data = cardImageBase64.split("base64,")[1];
    const decodedBytes = Utilities.base64Decode(base64Data);
    const safeRecName = recipientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const fileName = "Ecard_20_11_Row" + rowNumber + "_" + (safeRecName || "FTEL") + ".png";
    cardBlob = Utilities.newBlob(decodedBytes, "image/png", fileName);

    try {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const file = folder.createFile(cardBlob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (permErr) {
        // Trong miền Google Workspace nội bộ FPT có thể giới hạn DOMAIN_WITH_LINK
        try {
          file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e2) {}
      }
      driveFileUrl = file.getUrl();
    } catch (driveErr) {
      Logger.log("Lưu Google Drive lỗi: " + driveErr.toString());
    }
  }

  // 2. Kiểm tra trạng thái gửi email:
  // Nếu đã gửi mail thành công ngay từ bước submit Form, chỉ cập nhật link Google Drive (tránh spam mail lần 2).
  // Nếu chưa gửi được mail (hoặc bị lỗi trước đó), thực hiện gửi mail kèm file ảnh Drive.
  let mailStatus = String(row[11] || "").trim();
  const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  if (mailStatus !== "ĐÃ GỬI MAIL") {
    const mailRes = sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      recipientRole: recipientRole,
      message: message,
      cardImageBase64: cardImageBase64,
      cardBlob: cardBlob,
      driveFileUrl: driveFileUrl
    });
    mailStatus = buildMailStatusText(mailRes);
  }

  // 3. Cập nhật Trạng thái gửi mail (Cột L) & Link Google Drive (Cột M) vào Google Sheet
  sheet.getRange(rowNumber, 12, 1, 3).setValues([[
    mailStatus,
    driveFileUrl,
    nowStr
  ]]);

  return {
    success: true,
    rowNumber: rowNumber,
    mailStatus: mailStatus,
    driveFileUrl: driveFileUrl
  };
}

/**
 * ==============================================================================
 * 3. BỘ KIỂM TRA & CHỈNH SỬA CHÍNH TẢ TIẾNG VIỆT TỰ ĐỘNG (2 TẦNG)
 * ==============================================================================
 */
function cleanAndCorrectVietnameseText(text) {
  if (!text) return "";
  let s = String(text).trim();

  // Tầng 1: Chuẩn hóa khoảng trắng và dấu câu
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\s+([,.;!?])/g, "$1");
  s = s.replace(/([,.;!?])([^\s"”’)\]])/g, "$1 $2");
  s = s.replace(/\n{3,}/g, "\n\n");

  // Sửa các từ viết tắt phổ biến và lỗi gõ phím hay gặp trong tiếng Việt (Cụm từ ghép và từ đồng âm sai ngữ cảnh)
  const replacements = [
    // 1. Cụm từ và ngữ cảnh dễ gõ sai phụ âm cuối / dấu hỏi ngã
    [/\bchút mừng\b/gi, "chúc mừng"],
    [/\bchút anh\b/gi, "chúc anh"],
    [/\bchút chị\b/gi, "chúc chị"],
    [/\bchút bạn\b/gi, "chúc bạn"],
    [/\bchút thầy\b/gi, "chúc thầy"],
    [/\bchút cô\b/gi, "chúc cô"],
    [/\bchút em\b/gi, "chúc em"],
    [/\bchút cbnv\b/gi, "chúc CBNV"],
    [/\bngọn lữa\b/gi, "ngọn lửa"],
    [/\btruyền lữa\b/gi, "truyền lửa"],
    [/\bthắp lữa\b/gi, "thắp lửa"],
    [/\bchia sẽ\b/gi, "chia sẻ"],
    [/\bsẻ chia\b/gi, "sẻ chia"],
    [/\bchi ân\b/gi, "tri ân"],
    [/\bdồi giàu\b/gi, "dồi dào"],
    [/\bdồi dào\b/gi, "dồi dào"],
    [/\bnhiệt huyểt\b/gi, "nhiệt huyết"],
    [/\bsức khoẻ\b/gi, "sức khỏe"],
    [/\bthắp xáng\b/gi, "thắp sáng"],
    [/\bgiản viên\b/gi, "giảng viên"],
    [/\bđòng nghiệp\b/gi, "đồng nghiệp"],
    [/\bchúc mưng\b/gi, "chúc mừng"],
    [/\bchuc mung\b/gi, "chúc mừng"],

    // 2. Viết tắt và telex thông dụng
    [/\bko\b/gi, "không"],
    [/\bkhg\b/gi, "không"],
    [/\bhok\b/gi, "không"],
    [/\bk\b/gi, "không"],
    [/\bdc\b/gi, "được"],
    [/\bđc\b/gi, "được"],
    [/\bđk\b/gi, "được"],
    [/\ba\/c\b/gi, "Anh/Chị"],
    [/\bac\b/gi, "Anh/Chị"],
    [/\bmn\b/gi, "mọi người"],
    [/\bmng\b/gi, "mọi người"],
    [/\bnv\b/gi, "nhân viên"],
    [/\bcv\b/gi, "công việc"],
    [/\bgđ\b/gi, "gia đình"],
    [/\bae\b/gi, "anh em"],
    [/\ba e\b/gi, "anh em"],
    [/\bcty\b/gi, "công ty"],
    [/\btg\b/gi, "thời gian"],
    [/\btgian\b/gi, "thời gian"],
    [/\bmik\b/gi, "mình"],
    [/\bmk\b/gi, "mình"],
    [/\bblđ\b/gi, "Ban Lãnh đạo"],
    [/\bcbnv\b/gi, "CBNV"],
    [/\bcbcnv\b/gi, "CBNV"],
    [/\bftel\b/gi, "FTEL"],
    [/\bfpt\b/gi, "FPT"],
    [/\bftc\b/gi, "FTC"],
    [/\bhp\b/gi, "hạnh phúc"],
    [/\bsk\b/gi, "sức khỏe"],
    [/\btc\b/gi, "thành công"],
    [/\bcam on\b/gi, "cảm ơn"],
    [/\bcám ơn\b/gi, "cảm ơn"]
  ];

  replacements.forEach(([regex, target]) => {
    s = s.replace(regex, target);
  });

  // Viết hoa chữ cái đầu câu và sau dấu chấm/chấm than/chấm hỏi
  s = s.charAt(0).toUpperCase() + s.slice(1);
  s = s.replace(/([.!?]\s+)([a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/g, (m, p1, p2) => {
    return p1 + p2.toUpperCase();
  });

  // Tầng 2: Nếu BTC cấu hình GEMINI_API_KEY trong Script Properties thì gọi AI Gemini 1.5 Flash sửa chính tả theo ngữ cảnh toàn câu
  try {
    const geminiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (geminiKey && geminiKey.trim() && s.length >= 6) {
      const aiFixed = callGeminiSpellCheck(s, geminiKey.trim());
      if (aiFixed && aiFixed.length >= s.length * 0.7) {
        return aiFixed;
      }
    }
  } catch (e) {
    Logger.log("Gemini Spell Check bypass error: " + e.toString());
  }

  return s;
}

function callGeminiSpellCheck(text, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  const prompt = "Hãy đọc lời tri ân 20/11 sau đây và sửa tất cả các lỗi chính tả tiếng Việt, lỗi gõ Telex/VNI, từ đồng âm sai ngữ cảnh (ví dụ: 'chút mừng' -> 'chúc mừng', 'ngọn lữa' -> 'ngọn lửa', 'chia sẽ' -> 'chia sẻ', 'chi ân' -> 'tri ân', 'dồi giàu' -> 'dồi dào').\n\nQUY TẮC BẮT BUỘC:\n1. Giữ nguyên 100% văn phong, cách xưng hô, cảm xúc của người viết và các từ viết tắt nội bộ (FTC, FTEL, FPT, NOC, TIN, PNC, FTI...).\n2. Chỉ trả về duy nhất đoạn văn bản đã sửa hoàn chỉnh, KHÔNG viết thêm lời giải thích, KHÔNG đặt trong dấu ngoặc kép hay code block.\n\nVăn bản:\n" + text;
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() === 200) {
    const json = JSON.parse(res.getContentText());
    let out = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (out) {
      out = out.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim().replace(/^["“]|["”]$/g, "").trim();
      if (out) return out;
    }
  }
  return text;
}

/**
 * ==============================================================================
 * 4. THỐNG KÊ REAL-TIME CHO DASHBOARD 4 KHU VỰC (A - B - C - D)
 * ==============================================================================
 */
function getFullCampaignDashboardData() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  // Tự động quét và chuẩn hóa các dòng mới từ Google Form trước khi trả số liệu
  const syncInfo = processAllUnprocessedRows();

  const lastRow = sheet.getLastRow();
  const hrMap = loadHrDirectoryMap(ss);
  const hrUniqueList = hrMap.__uniqueEmployees || [];

  // Khởi tạo danh bạ nhân sự (kèm bộ đếm số ngọn lửa đã gửi / đã nhận) và khởi tạo các Đơn vị từ DS nhân sự (gid=1084168011)
  const hrEmployeesByEmail = {};
  const unitStatsMap = {};

  const ensureUnitEntry = (unitName) => {
    const key = String(unitName || "FPT Telecom").trim() || "FPT Telecom";
    if (!unitStatsMap[key]) {
      unitStatsMap[key] = {
        unit: key,
        totalFlames: 0,
        sendersMap: {},
        recipientsMap: {},
        membersMap: {},
        flamesList: []
      };
    }
    return unitStatsMap[key];
  };

  hrUniqueList.forEach(emp => {
    const emailKey = String(emp.email || "").trim().toLowerCase();
    if (!emailKey) return;
    const empObj = {
      name: emp.name || fallbackNameFromEmail(emailKey),
      email: emailKey,
      dept: emp.dept || "FPT Telecom",
      avatar: emp.avatar || "",
      sentCount: 0,
      receivedCount: 0
    };
    hrEmployeesByEmail[emailKey] = empObj;
    const uEntry = ensureUnitEntry(empObj.dept);
    uEntry.membersMap[emailKey] = empObj;
  });

  if (lastRow <= 1) {
    const allHrArr = Object.values(hrEmployeesByEmail);
    const hrCompact = allHrArr.map(e => [e.email, e.name, e.dept, e.sentCount || 0, e.receivedCount || 0]);
    const emptyUnits = Object.values(unitStatsMap).map(u => {
      const mList = Object.values(u.membersMap);
      return {
        unit: u.unit,
        totalFlames: 0,
        senderCount: 0,
        recipientCount: 0,
        memberCount: mList.length,
        flamesList: [],
        sendersList: [],
        recipientsList: [],
        membersList: mList.slice(0, 60)
      };
    });
    return {
      totalFlames: 0,
      uniqueRecipients: 0,
      uniqueSenders: 0,
      uniqueUnits: emptyUnits.length,
      totalHrCount: allHrArr.length,
      top30Recipients: [],
      early100Senders: [],
      unitSpread: emptyUnits,
      hrCompact: hrCompact,
      pendingRender: []
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  const seenPairs = new Set();

  let totalFlames = 0;
  const recipientSet = new Set();
  const senderSet = new Set();
  const unitSet = new Set();

  // Map thống kê Top 30 người nhận
  const recipientStatsMap = {};
  // Danh sách lời cảm ơn hợp lệ theo thứ tự thời gian để lọc Top 100 người gửi sớm nhất
  const validChronologicalList = [];

  values.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const timestamp = row[0];
    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const recipientRole = String(row[3] || "Giảng viên – Người truyền tri thức").trim();
    const rawMessage = String(row[4] || "").trim();
    const checkStatus = String(row[10] || "").trim();

    if (!senderEmail || !recipientEmail || !rawMessage) return;

    // Bỏ qua bản ghi bị đánh dấu TRÙNG LẶP
    if (checkStatus === "TRÙNG LẶP") return;

    // Quy tắc dữ liệu: Mỗi cặp (người gửi, người nhận) chỉ tính 1 lần duy nhất trong toàn chiến dịch
    const dupKey = buildDuplicateKey(senderEmail, recipientEmail);
    if (seenPairs.has(dupKey)) return;
    seenPairs.add(dupKey);

    const senderHr = lookupHrByEmail(hrMap, senderEmail) || {};
    const recipientHr = lookupHrByEmail(hrMap, recipientEmail) || {};

    const senderName = String(senderHr.name || row[5] || fallbackNameFromEmail(senderEmail)).trim();
    const senderDept = String(senderHr.dept || row[6] || "FPT Telecom").trim();
    const recipientName = String(recipientHr.name || row[7] || fallbackNameFromEmail(recipientEmail)).trim();
    const recipientDept = String(recipientHr.dept || row[8] || "FPT Telecom").trim();
    const recipientAvatar = recipientHr.avatar || "";
    const cleanedMsg = String(row[9] || rawMessage).trim();
    const driveUrl = String(row[12] || "").trim();
    const formattedTs = formatTimestamp(timestamp);

    totalFlames++;
    recipientSet.add(recipientEmail);
    senderSet.add(senderEmail);
    if (senderDept) unitSet.add(senderDept);
    if (recipientDept) unitSet.add(recipientDept);

    // Cập nhật bộ đếm vào Danh sách nhân sự
    if (!hrEmployeesByEmail[senderEmail]) {
      hrEmployeesByEmail[senderEmail] = {
        name: senderName,
        email: senderEmail,
        dept: senderDept,
        avatar: senderHr.avatar || "",
        sentCount: 0,
        receivedCount: 0
      };
    }
    hrEmployeesByEmail[senderEmail].sentCount++;

    if (!hrEmployeesByEmail[recipientEmail]) {
      hrEmployeesByEmail[recipientEmail] = {
        name: recipientName,
        email: recipientEmail,
        dept: recipientDept,
        avatar: recipientAvatar,
        sentCount: 0,
        receivedCount: 0
      };
    }
    hrEmployeesByEmail[recipientEmail].receivedCount++;

    // 1. Cộng dồn cho Người nhận (Bảng Top 30 Người Tiếp Lửa Tri Thức)
    if (!recipientStatsMap[recipientEmail]) {
      recipientStatsMap[recipientEmail] = {
        email: recipientEmail,
        name: recipientName,
        dept: recipientDept,
        role: recipientRole,
        avatar: recipientAvatar,
        count: 0,
        latestMessage: cleanedMsg
      };
    }
    recipientStatsMap[recipientEmail].count++;

    // 2. Lưu vào danh sách theo thời gian gửi (Bảng 100 Người Tiếp Lửa Sớm Nhất)
    const timeMs = timestamp instanceof Date ? timestamp.getTime() : (Date.parse(timestamp) || idx);
    validChronologicalList.push({
      rowNumber: rowNumber,
      timeMs: timeMs,
      timestamp: formattedTs,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      recipientRole: recipientRole,
      message: cleanedMsg,
      driveUrl: driveUrl
    });

    // 3. Thống kê chi tiết theo Đơn vị (Khu vực D: Ngọn lửa, Người gửi, Người nhận, Thành viên)
    const recUnitObj = ensureUnitEntry(recipientDept);
    recUnitObj.totalFlames++;
    recUnitObj.membersMap[recipientEmail] = hrEmployeesByEmail[recipientEmail];
    recUnitObj.flamesList.push({
      senderName: senderName,
      senderEmail: senderEmail,
      senderDept: senderDept,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      recipientDept: recipientDept,
      role: recipientRole,
      timestamp: formattedTs
    });

    if (!recUnitObj.recipientsMap[recipientEmail]) {
      recUnitObj.recipientsMap[recipientEmail] = {
        name: recipientName,
        email: recipientEmail,
        dept: recipientDept,
        role: recipientRole,
        count: 0
      };
    }
    recUnitObj.recipientsMap[recipientEmail].count++;

    const sendUnitObj = ensureUnitEntry(senderDept);
    sendUnitObj.membersMap[senderEmail] = hrEmployeesByEmail[senderEmail];
    if (!sendUnitObj.sendersMap[senderEmail]) {
      sendUnitObj.sendersMap[senderEmail] = {
        name: senderName,
        email: senderEmail,
        dept: senderDept,
        count: 0,
        latestTimestamp: formattedTs
      };
    }
    sendUnitObj.sendersMap[senderEmail].count++;
    sendUnitObj.sendersMap[senderEmail].latestTimestamp = formattedTs;

    // Nếu người gửi khác đơn vị nhưng gửi vào đơn vị này, vẫn ghi nhận người gửi cho đơn vị nhận nếu chưa có
    if (!recUnitObj.sendersMap[senderEmail]) {
      recUnitObj.sendersMap[senderEmail] = {
        name: senderName,
        email: senderEmail,
        dept: senderDept,
        count: 0,
        latestTimestamp: formattedTs
      };
    }
    if (senderDept !== recipientDept) {
      recUnitObj.sendersMap[senderEmail].count++;
    }
  });

  // Sắp xếp Bảng 1: Top 30 Người Tiếp Lửa Tri Thức (Giảm dần theo count)
  const top30Recipients = Object.values(recipientStatsMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map((item, idx) => ({
      rank: idx + 1,
      ...item,
      badge: idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : ""
    }));

  // Sắp xếp Bảng 2: 100 Người Tiếp Lửa Sớm Nhất (Tăng dần theo thời gian gửi hợp lệ sớm nhất)
  validChronologicalList.sort((a, b) => a.timeMs - b.timeMs);
  const early100Senders = [];
  const seenEarlySenders = new Set();
  for (const item of validChronologicalList) {
    if (!seenEarlySenders.has(item.senderEmail)) {
      seenEarlySenders.add(item.senderEmail);
      early100Senders.push({
        order: early100Senders.length + 1,
        name: item.senderName,
        email: item.senderEmail,
        dept: item.senderDept,
        recipientName: item.recipientName,
        timestamp: item.timestamp
      });
      if (early100Senders.length >= 100) break;
    }
  }

  // Sắp xếp Khu vực D: Lan tỏa theo đơn vị (Giảm dần theo totalFlames, tối ưu tải cho quy mô 24.608+ nhân sự)
  const unitSpread = Object.values(unitStatsMap)
    .map(u => {
      const sendersList = Object.values(u.sendersMap).sort((a, b) => b.count - a.count);
      const recipientsList = Object.values(u.recipientsMap).sort((a, b) => b.count - a.count);
      const allMembers = Object.values(u.membersMap);
      return {
        unit: u.unit,
        totalFlames: u.totalFlames,
        senderCount: sendersList.length,
        recipientCount: recipientsList.length,
        memberCount: allMembers.length,
        flamesList: u.flamesList.slice().reverse(),
        sendersList: sendersList,
        recipientsList: recipientsList,
        membersList: allMembers.slice(0, 60)
      };
    })
    .sort((a, b) => b.totalFlames - a.totalFlames || b.senderCount - a.senderCount || b.memberCount - a.memberCount);

  const allHrValues = Object.values(hrEmployeesByEmail);
  const hrCompact = allHrValues.map(e => [e.email, e.name, e.dept, e.sentCount || 0, e.receivedCount || 0]);

  return {
    totalFlames: totalFlames,
    totalSubmissions: totalFlames,
    uniqueRecipients: recipientSet.size,
    uniqueSenders: senderSet.size,
    uniqueUnits: unitSet.size || unitSpread.length,
    totalHrCount: allHrValues.length,
    top30Recipients: top30Recipients,
    early100Senders: early100Senders,
    unitSpread: unitSpread,
    hrCompact: hrCompact,
    recentTributes: validChronologicalList.slice(-20).reverse(),
    pendingRender: syncInfo.pendingRender || []
  };
}

/**
 * ==============================================================================
 * 5. GỬI EMAIL OUTLOOK (GỬI ĐỘC LẬP TRỰC TIẾP CHO CẢ NGƯỜI NHẬN & NGƯỜI GỬI, NO CC)
 * ==============================================================================
 */
function sendGratitudeNotificationEmail(params) {
  const googleFormUrl = CONFIG.GOOGLE_FORM_URL || "https://docs.google.com/forms/d/e/1FAIpQLScj0_gZJpGol1tWVUDGfyCB0s7sgr7AZ6k40VJ16yATluhVBA/viewform";

  const inlineImages = {};
  let cardImageBlob = params.cardBlob || null;
  let hasCardImage = false;

  if (!cardImageBlob && params.cardImageBase64 && params.cardImageBase64.indexOf("base64,") !== -1) {
    try {
      const base64Data = params.cardImageBase64.split("base64,")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const safeName = (params.recipientName || "FTEL").replace(/[^a-zA-Z0-9_-]/g, "_");
      cardImageBlob = Utilities.newBlob(decodedBytes, "image/png", "Thiep_Tri_An_" + safeName + ".png");
    } catch (e) {}
  }

  // Lấy phôi thiệp Key Visual chuẩn (ưu tiên bản lưu trên Google Drive, không phụ thuộc Render đang "ngủ")
  if (!cardImageBlob && CONFIG.EMAIL_EMBED_CARD_IMAGE) {
    cardImageBlob = getCardTemplateBlob();
  }

  if (cardImageBlob && CONFIG.EMAIL_EMBED_CARD_IMAGE) {
    inlineImages.tributeCard = cardImageBlob;
    hasCardImage = true;
  }
  // Chế độ mail nhẹ: chỉ đính kèm file khi bật cấu hình EMAIL_ATTACH_CARD_FILE
  const mailAttachments = (cardImageBlob && CONFIG.EMAIL_ATTACH_CARD_FILE) ? [cardImageBlob] : [];

  const quotaBefore = getRemainingMailQuota();
  const result = {
    ok: false,
    recipient: null,
    sender: null,
    quotaBefore: quotaBefore,
    quotaRemaining: quotaBefore,
    effectiveUser: getEffectiveUserEmail()
  };

  // EMAIL 1: GỬI TRỰC TIẾP CHO NGƯỜI NHẬN (to: params.recipientEmail - KHÔNG DÙNG CC)
  if (params.recipientEmail) {
    const recipientHtmlBody = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 660px; margin: 0 auto; background: #071226; color: #ffffff; border-radius: 18px; overflow: hidden; border: 2px solid #f37021; box-shadow: 0 12px 35px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 24px 20px; text-align: center;">
          <div style="color: #ffd700; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
            Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
            &#128293; MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN &#128293;
          </h1>
        </div>

        <div style="padding: 28px 24px; line-height: 1.65; color: #e2e8f0;">
          <p style="font-size: 17px; color: #ffffff; margin-top: 0;">
            Kính gửi Anh/Chị <strong style="color: #ffd700;">${escapeHtml(params.recipientName)}</strong>,
          </p>
          <p style="font-size: 15px;">
            Nhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11 – Chiến dịch <strong>"Gửi lời cảm ơn – Thắp sáng tri thức"</strong>, Anh/Chị vừa nhận được một ngọn lửa tri ân ấm áp từ đồng nghiệp <strong style="color: #f37021;">${escapeHtml(params.senderName)}</strong> (${escapeHtml(params.senderDept || "FPT Telecom")}) với dấu ấn <em>"${escapeHtml(params.recipientRole)}"</em>:
          </p>

          <!-- Khung thông điệp tri ân sang trọng -->
          <div style="background: linear-gradient(135deg, rgba(243,112,33,0.15) 0%, rgba(255,215,0,0.1) 100%); border: 1px solid rgba(243,112,33,0.45); border-left: 5px solid #f37021; padding: 18px 20px; border-radius: 12px; margin: 20px 0;">
            <div style="font-size: 13px; color: #ffd700; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              &#128293; Lời tri ân gửi gắm:
            </div>
            <div style="font-size: 16px; font-style: italic; color: #ffffff; line-height: 1.7;">
              "${escapeHtml(params.message)}"
            </div>
          </div>

          ${hasCardImage ? `
          <div style="text-align: center; margin: 24px 0;">
            <img src="cid:tributeCard" alt="Thiệp Tri Ân 20/11" style="width: 100%; max-width: 540px; height: auto; border-radius: 14px; border: 1px solid rgba(255,215,0,0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.6);" />
          </div>
          ` : ``}

          ${params.driveFileUrl ? `
          <div style="text-align: center; margin: 18px 0;">
            <a href="${params.driveFileUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f37021, #ffd700); color: #080c18; font-weight: 800; text-decoration: none; border-radius: 10px; font-size: 14px;">
              &#128229; Xem &amp; Tải Thiệp Độ Phân Giải Cao (Google Drive)
            </a>
          </div>
          ` : ``}

          <div style="text-align: center; margin: 28px 0 14px 0;">
            <a href="${googleFormUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f37021 0%, #ff8c00 100%); color: #ffffff; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 24px; font-size: 14px; box-shadow: 0 4px 15px rgba(243, 112, 33, 0.45);">
              &#10022; [20/11] GỬI LỜI CẢM ƠN, THẮP LỬA TRI ÂN &#10140;
            </a>
            <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0 0;">
              (Bấm vào nút trên để gửi lời chúc đáp lại hoặc tiếp tục thắp lửa tri ân tới đồng nghiệp khác)
            </p>
          </div>

          <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px; text-align: center;">
            Cảm ơn Anh/Chị vì đã luôn là ngọn lửa truyền cảm hứng, sẻ chia tri thức và đồng hành cùng đồng nghiệp trên hành trình phát triển tại FPT Telecom!
          </p>
        </div>

        <div style="background: #040914; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          © 2026 Trung tâm Đào tạo và Phát triển FPT Telecom • Chiến dịch Thắp Lửa Tri Ân 20/11
        </div>
      </div>
    `;

    const plainTextRec = `Kính gửi Anh/Chị ${params.recipientName},\n\nNhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11 – Chiến dịch "Gửi lời cảm ơn – Thắp sáng tri thức", Anh/Chị vừa nhận được một ngọn lửa tri ân ấm áp từ đồng nghiệp ${params.senderName} (${params.senderDept || "FPT Telecom"}) với dấu ấn "${params.recipientRole}":\n\n"${params.message}"\n\nGửi tiếp lời tri ân tại: ${googleFormUrl}\n\nTrung tâm Đào tạo và Phát triển FPT Telecom (FTC)`;

    result.recipient = deliverMail({
      to: params.recipientEmail,
      subject: CONFIG.EMAIL_SUBJECT_SUCCESS,
      body: plainTextRec,
      htmlBody: recipientHtmlBody,
      name: "FTC - Thắp Lửa Tri Ân 20/11",
      inlineImages: inlineImages,
      attachments: mailAttachments
    });
  }

  // EMAIL 2: GỬI TRỰC TIẾP CHO NGƯỜI GỬI (to: params.senderEmail - KHÔNG DÙNG CC, BẬT THÔNG BÁO TING TING HỘP THƯ ĐẾN)
  if (params.senderEmail && params.senderEmail !== params.recipientEmail) {
    const senderHtmlBody = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 660px; margin: 0 auto; background: #071226; color: #ffffff; border-radius: 18px; overflow: hidden; border: 2px solid #ffd700; box-shadow: 0 12px 35px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #002d62 0%, #1e3a8a 50%, #f37021 100%); padding: 24px 20px; text-align: center;">
          <div style="color: #ffd700; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
            Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
            &#128293; XÁC NHẬN THẮP SÁNG NGỌN LỬA TRI ÂN THÀNH CÔNG &#128293;
          </h1>
        </div>

        <div style="padding: 28px 24px; line-height: 1.65; color: #e2e8f0;">
          <p style="font-size: 17px; color: #ffffff; margin-top: 0;">
            Kính gửi Anh/Chị <strong style="color: #ffd700;">${escapeHtml(params.senderName)}</strong>,
          </p>
          <p style="font-size: 15px;">
            Hệ thống xác nhận Anh/Chị vừa thắp lên thành công một ngọn lửa tri ân ấm áp gửi tới đồng nghiệp <strong style="color: #f37021;">${escapeHtml(params.recipientName)}</strong> (${escapeHtml(params.recipientDept || "FPT Telecom")}) với dấu ấn <em>"${escapeHtml(params.recipientRole)}"</em>:
          </p>

          <div style="background: rgba(30, 58, 138, 0.35); border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #bfdbfe;">
            &#9989; Tấm thiệp Tri Ân dưới đây đã được chuyển phát thành công tới hộp thư Outlook của đồng nghiệp <strong>${escapeHtml(params.recipientName)}</strong> (<em>${escapeHtml(params.recipientEmail)}</em>).
          </div>

          <!-- Khung thông điệp tri ân sang trọng -->
          <div style="background: linear-gradient(135deg, rgba(243,112,33,0.15) 0%, rgba(255,215,0,0.1) 100%); border: 1px solid rgba(243,112,33,0.45); border-left: 5px solid #ffd700; padding: 18px 20px; border-radius: 12px; margin: 20px 0;">
            <div style="font-size: 13px; color: #ffd700; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              &#128293; Lời tri ân đã gửi:
            </div>
            <div style="font-size: 16px; font-style: italic; color: #ffffff; line-height: 1.7;">
              "${escapeHtml(params.message)}"
            </div>
          </div>

          ${hasCardImage ? `
          <div style="text-align: center; margin: 24px 0;">
            <img src="cid:tributeCard" alt="Thiệp Tri Ân 20/11" style="width: 100%; max-width: 540px; height: auto; border-radius: 14px; border: 1px solid rgba(255,215,0,0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.6);" />
          </div>
          ` : ``}

          ${params.driveFileUrl ? `
          <div style="text-align: center; margin: 18px 0;">
            <a href="${params.driveFileUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f37021, #ffd700); color: #080c18; font-weight: 800; text-decoration: none; border-radius: 10px; font-size: 14px;">
              &#128229; Xem &amp; Tải Thiệp Độ Phân Giải Cao (Google Drive)
            </a>
          </div>
          ` : ``}

          <div style="text-align: center; margin: 28px 0 14px 0;">
            <a href="${googleFormUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f37021 0%, #ff8c00 100%); color: #ffffff; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 24px; font-size: 14px; box-shadow: 0 4px 15px rgba(243, 112, 33, 0.45);">
              &#10022; [20/11] GỬI LỜI CẢM ƠN, THẮP LỬA TRI ÂN &#10140;
            </a>
            <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0 0;">
              (Bấm vào nút trên để tiếp tục thắp lửa tri ân cho những người thầy và đồng nghiệp khác nhé)
            </p>
          </div>

          <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px; text-align: center;">
            Cảm ơn Anh/Chị đã lan tỏa năng lượng tích cực và sự tri ân trong đại gia đình FPT Telecom!
          </p>
        </div>

        <div style="background: #040914; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
          © 2026 Trung tâm Đào tạo và Phát triển FPT Telecom • Chiến dịch Thắp Lửa Tri Ân 20/11
        </div>
      </div>
    `;

    const plainTextSender = `Kính gửi Anh/Chị ${params.senderName},\n\nHệ thống xác nhận Anh/Chị vừa thắp lên thành công ngọn lửa tri ân gửi tới đồng nghiệp ${params.recipientName} (${params.recipientDept || "FPT Telecom"}) với dấu ấn "${params.recipientRole}":\n\n"${params.message}"\n\nTấm thiệp đã được chuyển phát thành công tới hộp thư Outlook của đồng nghiệp.\n\nGửi tiếp lời tri ân tại: ${googleFormUrl}\n\nTrung tâm Đào tạo và Phát triển FPT Telecom (FTC)`;

    result.sender = deliverMail({
      to: params.senderEmail,
      subject: CONFIG.EMAIL_SUBJECT_SENDER || "XÁC NHẬN BẠN ĐÃ THẮP LÊN MỘT NGỌN LỬA TRI ÂN 20/11",
      body: plainTextSender,
      htmlBody: senderHtmlBody,
      name: "FTC - Thắp Lửa Tri Ân 20/11",
      inlineImages: inlineImages,
      attachments: mailAttachments
    });
  }

  result.ok = !!(result.recipient && result.recipient.ok) && (!result.sender || result.sender.ok);
  result.quotaRemaining = getRemainingMailQuota();
  return result;
}

/**
 * Gửi email thông báo cho Người gửi khi phát hiện gửi trùng (Mỗi tài khoản chỉ gửi 1 lần cho cùng 1 đồng nghiệp)
 */
function sendDuplicateWarningEmail(params) {
  const googleFormUrl = CONFIG.GOOGLE_FORM_URL || "https://docs.google.com/forms/d/e/1FAIpQLScj0_gZJpGol1tWVUDGfyCB0s7sgr7AZ6k40VJ16yATluhVBA/viewform";
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f59e0b;">
      <div style="background: linear-gradient(135deg, #002d62 0%, #d97706 100%); padding: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 18px;">THÔNG BÁO: MỖI TÀI KHOẢN CHỈ GỬI 1 LẦN CHO CÙNG MỘT ĐỒNG NGHIỆP</h2>
      </div>
      <div style="padding: 24px; line-height: 1.6; color: #e2e8f0; font-size: 14px;">
        <p>Chào Anh/Chị <strong>${escapeHtml(params.senderName)}</strong>,</p>
        <p>Hệ thống ghi nhận Anh/Chị vừa gửi thêm một lời tri ân đến đồng nghiệp <strong>${escapeHtml(params.recipientName)} (${escapeHtml(params.recipientEmail)})</strong> với nội dung:</p>
        <blockquote style="background: rgba(255,255,255,0.06); border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 14px 0; font-style: italic;">
          "${escapeHtml(params.message)}"
        </blockquote>
        <p>Theo thể lệ của Chiến dịch <strong>"Gửi lời cảm ơn – Thắp sáng tri thức" (FTEL 20/11)</strong>, nhằm đảm bảo sự trân trọng và tránh tình trạng gửi trùng lặp/spam, <strong>mỗi tài khoản chỉ được thắp một ngọn lửa tri ân duy nhất cho cùng một đồng nghiệp</strong> trong suốt chương trình.</p>
        <p>Ngọn lửa tri ân đầu tiên của Anh/Chị dành cho <strong>${escapeHtml(params.recipientName)}</strong> đã được ghi nhận và chuyển phát thành công trước đó. Do đó, lượt gửi thêm này được hệ thống đánh dấu là <strong>TRÙNG LẶP</strong> và không tính thêm ngọn lửa mới.</p>
        <p>Anh/Chị có thể bấm vào nút dưới đây để tiếp tục thắp sáng ngọn lửa tri ân cho những người thầy và đồng nghiệp khác nhé:</p>
        <div style="text-align: center; margin: 22px 0;">
          <a href="${googleFormUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f37021 0%, #ff8c00 100%); color: #ffffff; font-weight: 800; text-decoration: none; padding: 12px 24px; border-radius: 24px; font-size: 14px;">
            &#10022; [20/11] GỬI LỜI CẢM ƠN, THẮP LỬA TRI ÂN &#10140;
          </a>
        </div>
        <p style="margin-top: 18px; color: #94a3b8;">Trân trọng,<br/><strong>Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)</strong></p>
      </div>
    </div>
  `;

  const plainText = `Chào Anh/Chị ${params.senderName},\n\nHệ thống ghi nhận Anh/Chị vừa gửi thêm một lời tri ân đến đồng nghiệp ${params.recipientName} (${params.recipientEmail}):\n"${params.message}"\n\nTheo thể lệ chương trình, mỗi tài khoản chỉ được gửi 1 lần duy nhất cho cùng một đồng nghiệp để tránh trùng lặp/spam. Ngọn lửa tri ân đầu tiên của bạn đã được ghi nhận thành công trước đó.\n\nTiếp tục gửi lời tri ân tới đồng nghiệp khác tại: ${googleFormUrl}\n\nTrung tâm Đào tạo và Phát triển FPT Telecom (FTC)`;

  return deliverMail({
    to: params.senderEmail,
    subject: CONFIG.EMAIL_SUBJECT_DUPLICATE,
    body: plainText,
    htmlBody: htmlBody,
    name: "FTC - Thắp Lửa Tri Ân 20/11"
  });
}

/**
 * ==============================================================================
 * 5b. BỘ CÔNG CỤ GỬI MAIL CÓ BÁO LỖI THẬT + CHẨN ĐOÁN + GỬI LẠI
 * ==============================================================================
 */

/**
 * Gửi 1 email (MailApp → dự phòng GmailApp). KHÔNG nuốt lỗi: luôn trả về { ok, via, error }.
 */
function deliverMail(opts) {
  const result = { to: opts.to, ok: false, via: "", error: "" };
  if (!opts.to) {
    result.error = "Thiếu địa chỉ người nhận";
    return result;
  }

  const quota = getRemainingMailQuota();
  if (quota === 0) {
    result.error = "HẾT HẠN MỨC GỬI MAIL HÔM NAY của tài khoản " + getEffectiveUserEmail() +
      " (Gmail cá nhân ~100 người nhận/ngày, Google Workspace ~1.500/ngày). Hạn mức sẽ được làm mới sau 24 giờ.";
    Logger.log("❌ " + opts.to + ": " + result.error);
    return result;
  }

  const inlineImages = opts.inlineImages && Object.keys(opts.inlineImages).length ? opts.inlineImages : null;
  const attachments = opts.attachments && opts.attachments.length ? opts.attachments : null;
  const errors = [];

  try {
    const mailOptions = {
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      htmlBody: opts.htmlBody,
      name: opts.name
    };
    if (inlineImages) mailOptions.inlineImages = inlineImages;
    if (attachments) mailOptions.attachments = attachments;
    MailApp.sendEmail(mailOptions);
    result.ok = true;
    result.via = "MailApp";
    Logger.log("✅ Đã gửi mail tới " + opts.to + " qua MailApp");
    return result;
  } catch (e1) {
    errors.push("MailApp: " + (e1 && e1.message ? e1.message : e1));
  }

  try {
    const gmailOptions = { htmlBody: opts.htmlBody, name: opts.name };
    if (inlineImages) gmailOptions.inlineImages = inlineImages;
    if (attachments) gmailOptions.attachments = attachments;
    GmailApp.sendEmail(opts.to, opts.subject, opts.body, gmailOptions);
    result.ok = true;
    result.via = "GmailApp";
    Logger.log("✅ Đã gửi mail tới " + opts.to + " qua GmailApp (MailApp lỗi: " + errors.join(" | ") + ")");
    return result;
  } catch (e2) {
    errors.push("GmailApp: " + (e2 && e2.message ? e2.message : e2));
  }

  result.error = errors.join(" | ");
  Logger.log("❌ Gửi mail tới " + opts.to + " THẤT BẠI: " + result.error);
  return result;
}

/**
 * Chuyển kết quả gửi mail thành chuỗi trạng thái ghi vào cột L
 */
function buildMailStatusText(mailRes) {
  if (!mailRes) return "LỖI MAIL: Không có kết quả gửi";
  if (mailRes.ok) return "ĐÃ GỬI MAIL";
  const parts = [];
  if (mailRes.recipient && !mailRes.recipient.ok) parts.push("Người nhận (" + mailRes.recipient.to + "): " + mailRes.recipient.error);
  if (mailRes.sender && !mailRes.sender.ok) parts.push("Người gửi (" + mailRes.sender.to + "): " + mailRes.sender.error);
  if (!mailRes.recipient) parts.push("Thiếu email người nhận");
  return "LỖI MAIL: " + truncateText(parts.join(" || "), 400);
}

function truncateText(text, maxLen) {
  const s = String(text || "");
  return s.length > maxLen ? s.substring(0, maxLen - 3) + "..." : s;
}

function getRemainingMailQuota() {
  try {
    return MailApp.getRemainingDailyQuota();
  } catch (e) {
    return -1; // Không đọc được hạn mức (thiếu quyền)
  }
}

function getEffectiveUserEmail() {
  try {
    return Session.getEffectiveUser().getEmail() || "(không xác định)";
  } catch (e) {
    return "(không xác định)";
  }
}

/**
 * Lấy ảnh phôi thiệp: ưu tiên file đã lưu trên Google Drive (nhanh, ổn định).
 * Lần đầu tiên sẽ tải từ CONFIG.CARD_TEMPLATE_URL rồi lưu lại vào Drive để dùng cho các lần sau.
 */
let __cardTemplateBlobCache = null;
function getCardTemplateBlob() {
  if (__cardTemplateBlobCache) return __cardTemplateBlobCache;
  const props = PropertiesService.getScriptProperties();

  const fileId = props.getProperty(CONFIG.CARD_TEMPLATE_PROP_KEY);
  if (fileId) {
    try {
      __cardTemplateBlobCache = DriveApp.getFileById(fileId).getBlob().setName("Thiep_Tri_An_20_11.jpg");
      return __cardTemplateBlobCache;
    } catch (e) {
      Logger.log("Không đọc được phôi thiệp trên Drive (" + fileId + "), sẽ tải lại: " + e);
      props.deleteProperty(CONFIG.CARD_TEMPLATE_PROP_KEY);
    }
  }

  if (!CONFIG.CARD_TEMPLATE_URL) return null;
  try {
    const resp = UrlFetchApp.fetch(CONFIG.CARD_TEMPLATE_URL, { muteHttpExceptions: true, followRedirects: true });
    if (resp.getResponseCode() !== 200) {
      Logger.log("Tải phôi thiệp lỗi HTTP " + resp.getResponseCode());
      return null;
    }
    const blob = resp.getBlob().setName("Thiep_Tri_An_20_11.jpg");
    try {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const file = folder.createFile(blob.copyBlob().setName("PHOI_THIEP_KEY_VISUAL_20_11.jpg"));
      props.setProperty(CONFIG.CARD_TEMPLATE_PROP_KEY, file.getId());
    } catch (saveErr) {
      Logger.log("Không lưu được phôi thiệp lên Drive: " + saveErr);
    }
    __cardTemplateBlobCache = blob;
    return blob;
  } catch (e) {
    Logger.log("Tải phôi thiệp từ " + CONFIG.CARD_TEMPLATE_URL + " lỗi: " + e);
    return null;
  }
}

/**
 * Chẩn đoán toàn bộ hệ thống gửi mail (tài khoản gửi, hạn mức, quyền, trigger, phôi thiệp)
 */
function diagnoseMailSystem() {
  const warnings = [];
  const effectiveUser = getEffectiveUserEmail();
  const domain = (effectiveUser.split("@")[1] || "").toLowerCase();

  let accountType;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    accountType = "Gmail cá nhân (hạn mức ~100 người nhận/ngày)";
    warnings.push("Mail được gửi từ địa chỉ Gmail cá nhân " + effectiveUser + ". Hệ thống mail FPT (Microsoft 365) có thể đưa vào Thư rác/khu cách ly. Hãy nhờ IT FPT cho phép (allowlist) địa chỉ này.");
  } else if (CONFIG.ALLOWED_DOMAINS.indexOf(domain) !== -1) {
    accountType = "Tài khoản Google dùng email FPT (" + domain + ")";
    warnings.push("Tài khoản Google " + effectiveUser + " dùng email FPT nhưng mail lại đi từ máy chủ Google → bộ kiểm tra danh tính email (SPF/DMARC) của " + domain + " sẽ báo lỗi và Outlook FPT dễ từ chối hoặc cách ly thư. Nên dùng một tài khoản Gmail riêng làm chủ script, hoặc gửi qua Power Automate/Outlook nội bộ.");
  } else {
    accountType = "Google Workspace (" + domain + ") – hạn mức ~1.500 người nhận/ngày";
  }

  const quota = getRemainingMailQuota();
  if (quota === 0) warnings.push("ĐÃ HẾT hạn mức gửi mail hôm nay. Phải chờ 24 giờ hoặc đổi tài khoản chủ script.");
  else if (quota === -1) warnings.push("Không đọc được hạn mức mail → script có thể chưa được cấp quyền gửi mail. Hãy chạy hàm testSendMailToTungDT trong trình soạn thảo để cấp quyền.");
  else if (quota < 10) warnings.push("Hạn mức mail hôm nay sắp hết (còn " + quota + ").");

  let authorizationStatus = "Không xác định";
  try {
    const status = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationStatus();
    authorizationStatus = status === ScriptApp.AuthorizationStatus.REQUIRED ? "CẦN CẤP THÊM QUYỀN" : "Đã đủ quyền";
    if (status === ScriptApp.AuthorizationStatus.REQUIRED) {
      warnings.push("Script cần cấp thêm quyền (Gmail/Drive/UrlFetch). Mở Apps Script → chạy hàm testSendMailToTungDT → bấm Cho phép, sau đó Triển khai lại phiên bản mới.");
    }
  } catch (e) {
    authorizationStatus = "Lỗi kiểm tra: " + e;
  }

  let formSubmitTriggerInstalled = false;
  try {
    formSubmitTriggerInstalled = ScriptApp.getProjectTriggers().some(t =>
      t.getHandlerFunction() === "onFormSubmitTrigger" && t.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
    );
  } catch (e) {}
  if (!formSubmitTriggerInstalled) {
    warnings.push("CHƯA cài Trigger tự động khi nộp Google Form → mail chỉ được gửi khi có người mở Dashboard. Vào menu 🔥 FTC 20/11 - Quản Trị → 1. Khởi tạo cột & Trigger tự động.");
  }

  let cardTemplateFileId = "";
  try {
    cardTemplateFileId = PropertiesService.getScriptProperties().getProperty(CONFIG.CARD_TEMPLATE_PROP_KEY) || "";
  } catch (e) {}

  return {
    effectiveUser: effectiveUser,
    accountType: accountType,
    remainingDailyQuota: quota,
    authorizationStatus: authorizationStatus,
    formSubmitTriggerInstalled: formSubmitTriggerInstalled,
    cardTemplateFileId: cardTemplateFileId,
    emailEmbedCardImage: CONFIG.EMAIL_EMBED_CARD_IMAGE,
    emailAttachCardFile: CONFIG.EMAIL_ATTACH_CARD_FILE,
    warnings: warnings
  };
}

/**
 * Gửi lại mail cho 1 dòng hợp lệ trên Sheet câu trả lời (bất kể trạng thái cũ)
 */
function resendMailForRow(rowNumber) {
  rowNumber = Number(rowNumber);
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  if (!rowNumber || rowNumber <= 1 || rowNumber > sheet.getLastRow()) {
    return { success: false, message: "Số dòng không hợp lệ: " + rowNumber };
  }
  const row = sheet.getRange(rowNumber, 1, 1, 14).getValues()[0];
  const checkStatus = String(row[10] || "").trim();
  if (checkStatus !== "HỢP LỆ") {
    return { success: false, message: "Dòng " + rowNumber + " không ở trạng thái HỢP LỆ (hiện tại: '" + checkStatus + "')." };
  }
  const senderEmail = String(row[1] || "").trim().toLowerCase();
  const recipientEmail = String(row[2] || "").trim().toLowerCase();
  const mailRes = sendGratitudeNotificationEmail({
    recipientEmail: recipientEmail,
    recipientName: String(row[7] || fallbackNameFromEmail(recipientEmail)).trim(),
    recipientDept: String(row[8] || "FPT Telecom").trim(),
    senderEmail: senderEmail,
    senderName: String(row[5] || fallbackNameFromEmail(senderEmail)).trim(),
    senderDept: String(row[6] || "FPT Telecom").trim(),
    recipientRole: String(row[3] || "Giảng viên – Người truyền tri thức").trim(),
    message: String(row[9] || row[4] || "").trim(),
    cardBlob: null,
    driveFileUrl: String(row[12] || "").trim()
  });
  const status = buildMailStatusText(mailRes);
  sheet.getRange(rowNumber, 12).setValue(status);
  return {
    success: mailRes.ok,
    rowNumber: rowNumber,
    status: status,
    quotaRemaining: mailRes.quotaRemaining,
    message: (mailRes.ok ? "✅ " : "❌ ") + status + "\nHạn mức mail còn lại hôm nay: " + mailRes.quotaRemaining
  };
}

/**
 * Gửi lại mail cho tất cả các dòng HỢP LỆ đang có trạng thái "LỖI MAIL..."
 */
function resendFailedMails() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  const summary = { attempted: 0, succeeded: 0, failed: 0, details: [] };
  if (lastRow <= 1) return summary;

  const values = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    const checkStatus = String(values[i][10] || "").trim();
    const mailStatus = String(values[i][11] || "").trim();
    if (checkStatus !== "HỢP LỆ" || mailStatus.indexOf("LỖI") !== 0) continue;

    const rowNumber = i + 2;
    const res = resendMailForRow(rowNumber);
    summary.attempted++;
    if (res.success) summary.succeeded++;
    else summary.failed++;
    summary.details.push("Dòng " + rowNumber + ": " + res.status);

    // Dừng sớm nếu đã hết hạn mức để không ghi lỗi hàng loạt
    if (res.quotaRemaining === 0) {
      summary.details.push("⛔ Đã hết hạn mức gửi mail hôm nay, dừng gửi lại.");
      break;
    }
  }
  return summary;
}

/**
 * ==============================================================================
 * 6. API WEB APP ENTRY POINTS (doGet / doPost)
 * ==============================================================================
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = params.callback || "";
  try {
    const action = params.action || "get_dashboard";

    if (action === "get_dashboard" || action === "get_stats" || action === "get_leaderboard") {
      const data = getFullCampaignDashboardData();
      return createJsonResponse({
        success: true,
        data: data
      }, callback);
    }

    if (action === "get_pending_renders") {
      const syncInfo = processAllUnprocessedRows();
      return createJsonResponse({
        success: true,
        data: syncInfo.pendingRender || []
      }, callback);
    }

    if (action === "send_test_mail") {
      const targetEmail = String(params.to || "tungdt101@fpt.com").trim().toLowerCase();
      const senderEmail = String(params.cc || "nhanlh10@fpt.com").trim().toLowerCase();
      const mailRes = sendGratitudeNotificationEmail({
        recipientEmail: targetEmail,
        recipientName: params.recipientName || "Đặng Thanh Tùng",
        recipientDept: params.recipientDept || "Trung tâm Đào tạo FTEL (FTC)",
        recipientRole: params.recipientRole || "Người dẫn dắt – Người truyền cảm hứng",
        senderEmail: senderEmail,
        senderName: params.senderName || "Lê Hoàng Nhân",
        senderDept: params.senderDept || "Trung tâm Đào tạo FTEL (FTC)",
        message: params.message || "Cảm ơn Anh Đặng Thanh Tùng đã luôn là ngọn lửa nhiệt huyết truyền cảm hứng, tận tâm chia sẻ tri thức và đồng hành cùng anh em tại Trung tâm Đào tạo FTEL (FTC). Nhân dịp 20/11, chúc Anh luôn dồi dào sức khỏe, hạnh phúc và tiếp tục thắp sáng hành trình tri thức tại FPT Telecom!"
      });
      return createJsonResponse({
        success: mailRes.ok,
        message: mailRes.ok
          ? "Google đã gửi mail đi thành công tới " + targetEmail + " (và " + senderEmail + "). Nếu Outlook không thấy, thư đang bị hệ thống mail FPT chặn/cách ly."
          : buildMailStatusText(mailRes),
        sentFrom: mailRes.effectiveUser,
        quotaRemaining: mailRes.quotaRemaining,
        recipient: mailRes.recipient,
        sender: mailRes.sender
      }, callback);
    }

    // Chẩn đoán hệ thống gửi mail: ...exec?action=mail_diagnose
    if (action === "mail_diagnose") {
      return createJsonResponse({
        success: true,
        data: diagnoseMailSystem()
      }, callback);
    }

    // Gửi lại mail (yêu cầu mã Admin): ...exec?action=resend_failed_mails&key=...  hoặc  &row=3
    if (action === "resend_failed_mails") {
      if (String(params.key || "") !== CONFIG.ADMIN_SECRET_KEY) {
        return createJsonResponse({ success: false, message: "Sai mã Admin (key)." }, callback);
      }
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        const data = params.row ? resendMailForRow(params.row) : resendFailedMails();
        return createJsonResponse({ success: true, data: data }, callback);
      } finally {
        lock.releaseLock();
      }
    }

    return createJsonResponse({
      success: true,
      message: "FTEL 20/11 Google Form & Live Dashboard API is active."
    }, callback);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: err.toString()
    }, callback);
  }
}

function doPost(e) {
  let payload = {};
  if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (err) {
      payload = (e && e.parameter) || {};
    }
  } else {
    payload = (e && e.parameter) || {};
  }
  if (payload && typeof payload.payload === "string") {
    try {
      payload = JSON.parse(payload.payload);
    } catch (parseErr) {}
  }

  const action = payload.action || "sync_form_rows";

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    // Action 1: Web App hoàn tất vẽ ảnh E-Card 1080x1440 -> Lưu Google Drive -> Gắn link Sheet -> Bắn mail
    if (action === "complete_ecard_and_send_mail") {
      const res = handleCompleteEcardAndSendMail(payload);
      return createJsonResponse(res);
    }

    // Action 2: Quét và xử lý các dòng Google Form mới
    if (action === "sync_form_rows") {
      const res = processAllUnprocessedRows();
      return createJsonResponse({
        success: true,
        data: res
      });
    }

    // Action 3: Gửi lời cảm ơn trực tiếp vào đúng Sheet câu trả lời Google Form
    if (action === "submit_gratitude") {
      const res = handleDirectSubmissionToFormSheet(payload);
      return createJsonResponse(res);
    }

    // Action 3b: Chỉ gửi Email Thiệp thử nghiệm (KHÔNG lưu kết quả vào Google Sheet chính thức)
    if (action === "send_test_email_only") {
      const mailRes = sendGratitudeNotificationEmail({
        recipientEmail: String(payload.recipientEmail || "tungdt101@fpt.com").trim().toLowerCase(),
        recipientName: payload.recipientName || "Đặng Thanh Tùng",
        recipientDept: payload.recipientDept || "Trung tâm Đào tạo FTEL (FTC)",
        recipientRole: payload.recipientRole || "Người dẫn dắt – Người truyền cảm hứng",
        senderEmail: String(payload.senderEmail || "nhanlh10@fpt.com").trim().toLowerCase(),
        senderName: payload.senderName || "Lê Hoàng Nhân (FTC)",
        senderDept: payload.senderDept || "Trung tâm Đào tạo FTEL (FTC)",
        message: payload.message || "",
        cardImageBase64: payload.cardImageBase64 || ""
      });
      return createJsonResponse({
        success: mailRes.ok,
        savedToSheet: false,
        emailSentStatus: mailRes.ok ? "SENT_SUCCESS" : "SEND_FAILED",
        message: mailRes.ok ? "Đã gửi email thử nghiệm (không lưu vào Google Sheet)." : buildMailStatusText(mailRes),
        sentFrom: mailRes.effectiveUser,
        quotaRemaining: mailRes.quotaRemaining
      });
    }

    // Action 4: Cập nhật danh sách nhân sự hàng loạt (HR Directory)
    if (action === "upload_hr_directory") {
      const res = handleUploadHrDirectory(payload);
      return createJsonResponse(res);
    }

    // Action 5: Lấy toàn bộ danh sách cho Admin
    if (action === "admin_get_all_submissions") {
      const data = getFullCampaignDashboardData();
      return createJsonResponse({
        success: true,
        data: data.recentTributes || [],
        dashboard: data
      });
    }

    return createJsonResponse({
      success: false,
      message: "Action không hợp lệ: " + action
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Hỗ trợ ghi trực tiếp vào Sheet Google Form nếu người dùng/Admin tạo thiệp từ Web
 */
function handleDirectSubmissionToFormSheet(data) {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  const now = new Date();
  const senderEmail = String(data.senderEmail || "").trim().toLowerCase();
  const recipientEmail = String(data.recipientEmail || "").trim().toLowerCase();
  const recipientRole = String(data.recipientRole || "Giảng viên – Người truyền tri thức").trim();
  const rawMessage = String(data.message || "").trim();

  sheet.appendRow([
    now,
    senderEmail,
    recipientEmail,
    recipientRole,
    rawMessage,
    data.senderName || "",
    data.senderDept || "",
    data.recipientName || "",
    data.recipientDept || "",
    "",
    "",
    "",
    "",
    ""
  ]);

  const rowNumber = sheet.getLastRow();
  const syncRes = processAllUnprocessedRows();

  // Nếu có sẵn ảnh E-Card Base64 gửi kèm thì lưu Drive và bắn mail ngay lập tức!
  if (data.cardImageBase64) {
    const checkStatus = String(sheet.getRange(rowNumber, 11).getValue() || "").trim();
    if (checkStatus === "HỢP LỆ") {
      const mailRes = handleCompleteEcardAndSendMail({
        rowNumber: rowNumber,
        cardImageBase64: data.cardImageBase64,
        senderEmail: senderEmail,
        senderName: data.senderName,
        senderDept: data.senderDept,
        recipientEmail: recipientEmail,
        recipientName: data.recipientName,
        recipientRole: recipientRole,
        message: rawMessage
      });
      return {
        success: true,
        isDuplicate: false,
        data: mailRes
      };
    } else {
      return {
        success: false,
        isDuplicate: true,
        message: "Lời cảm ơn bị trùng lặp (theo thể lệ chương trình, mỗi tài khoản chỉ được gửi 1 lần cho cùng một đồng nghiệp). Hệ thống đã gửi email thông báo trùng lặp."
      };
    }
  }

  return {
    success: true,
    data: syncRes
  };
}

/**
 * ==============================================================================
 * 7. HELPER FUNCTIONS (SPREADSHEET, DRIVE, HR DIRECTORY)
 * ==============================================================================
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getFormResponseSheet(ss) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === CONFIG.FORM_RESPONSE_GID) {
      return sheets[i];
    }
  }
  return sheets[0];
}

function ensureExtendedHeaders(sheet) {
  const headers = [
    "Dấu thời gian",
    "1. NGƯỜI THẮP LỬA TRI ÂN",
    "2. NGƯỜI NHẬN NGỌN LỬA TRI ÂN",
    "3. DẤU ẤN CỦA NGƯỜI NHẬN LỬA",
    "4. HÃY GỬI LỜI CẢM ƠN CỦA BẠN ĐẾN NGƯỜI NHẬN NGỌN LỬA TRI ÂN",
    "Họ tên người gửi",
    "Đơn vị người gửi",
    "Họ tên người nhận",
    "Đơn vị người nhận",
    "Thông điệp đã chuẩn hóa chính tả",
    "Trạng thái kiểm tra",
    "Trạng thái gửi Mail",
    "Link Thiệp Google Drive",
    "Mã xử lý / Thời gian"
  ];

  const currentFirstRow = sheet.getRange(1, 1, 1, 14).getValues()[0];
  let needsUpdate = false;
  for (let c = 5; c < 14; c++) {
    if (!currentFirstRow[c]) {
      currentFirstRow[c] = headers[c];
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    sheet.getRange(1, 1, 1, 14).setValues([currentFirstRow]);
  }
}

function getHrDirectorySheet(ss) {
  const sheets = ss.getSheets();
  // 1. Tìm chính xác theo GID (gid = 1084168011) mà bạn vừa bổ sung
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === CONFIG.HR_SHEET_GID) {
      return sheets[i];
    }
  }
  // 2. Dự phòng tìm theo tên tab phổ biến (DS nhân sự, DS_NhanSu, Danh sách nhân sự...)
  const candidateNames = [
    CONFIG.HR_SHEET_NAME,
    "DS nhân sự",
    "DS Nhân sự",
    "DS_NhanSu",
    "Danh sách nhân sự",
    "Danh sach nhan su",
    "NhanSu",
    "HR"
  ];
  for (let i = 0; i < candidateNames.length; i++) {
    const found = ss.getSheetByName(candidateNames[i]);
    if (found) return found;
  }
  for (let i = 0; i < sheets.length; i++) {
    const nameLower = sheets[i].getName().toLowerCase();
    if (nameLower.indexOf("nhân sự") !== -1 || nameLower.indexOf("nhan su") !== -1) {
      return sheets[i];
    }
  }
  return null;
}

function ensureHrDirectorySheet(ss) {
  let hrSheet = getHrDirectorySheet(ss);
  if (!hrSheet) {
    hrSheet = ss.insertSheet(CONFIG.HR_SHEET_NAME);
    hrSheet.appendRow(["Email", "Họ và tên", "Đơn vị", "Ảnh đại diện (URL)"]);
    hrSheet.appendRow(["tungdt101@fpt.com", "Đặng Thanh Tùng", "Trung tâm Đào tạo FTEL (FTC)", ""]);
    hrSheet.appendRow(["duyennnt3@fpt.com", "Nguyễn Ngọc Thảo Duyên", "Trung tâm Đào tạo FTEL (FTC)", ""]);
  }
  return hrSheet;
}

function loadHrDirectoryMap(ss) {
  const map = {};
  const hrSheet = getHrDirectorySheet(ss);
  if (!hrSheet || hrSheet.getLastRow() <= 1) return map;

  const data = hrSheet.getDataRange().getValues();
  if (!data || data.length <= 1) return map;

  const headers = data[0].map(h => String(h || "").trim().toLowerCase());

  // Tự động nhận diện vị trí cột Email, Họ và tên, Đơn vị, Ảnh đại diện trên Sheet gid=1084168011
  let emailCol = -1;
  let accountCol = -1;
  let nameCol = -1;
  let deptCol = -1;
  let avatarCol = -1;
  const ignoredCols = {};

  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (!h) continue;
    if (h === "stt" || h === "no" || h === "id" || h.indexOf("mã ") !== -1 || h.indexOf("mã") === 0 || h.indexOf("msnv") !== -1) {
      ignoredCols[c] = true;
      continue;
    }
    if (deptCol === -1 && (h.indexOf("đơn vị") !== -1 || h.indexOf("phòng ban") !== -1 || h.indexOf("bộ phận") !== -1 || h.indexOf("chi nhánh") !== -1 || h.indexOf("trung tâm") !== -1 || h.indexOf("khối") !== -1 || h.indexOf("ban") !== -1 || h.indexOf("vùng") !== -1 || h.indexOf("miền") !== -1 || h.indexOf("dept") !== -1 || h.indexOf("unit") !== -1)) {
      deptCol = c;
    } else if (emailCol === -1 && (h.indexOf("email") !== -1 || h.indexOf("mail") !== -1)) {
      emailCol = c;
    } else if (accountCol === -1 && (h.indexOf("account") !== -1 || h.indexOf("tài khoản") !== -1 || h.indexOf("user") !== -1)) {
      accountCol = c;
    } else if (nameCol === -1 && (h.indexOf("họ và tên") !== -1 || h.indexOf("họ tên") !== -1 || h.indexOf("full name") !== -1 || h.indexOf("fullname") !== -1 || h.indexOf("tên nhân viên") !== -1 || h.indexOf("tên nhân sự") !== -1 || h.indexOf("tên cbnv") !== -1 || h === "tên" || h === "name" || h === "nhân sự" || h === "cbnv")) {
      nameCol = c;
    } else if (avatarCol === -1 && (h.indexOf("ảnh") !== -1 || h.indexOf("avatar") !== -1 || h.indexOf("hình") !== -1)) {
      avatarCol = c;
    }
  }

  if (emailCol === -1 && accountCol !== -1) {
    emailCol = accountCol;
  }

  // Quét dòng dữ liệu mẫu để xác nhận chính xác cột chứa "@" (Email) và cột chứa Họ tên
  const sampleLimit = Math.min(data.length, 30);
  if (data.length > 1) {
    for (let r = 1; r < sampleLimit; r++) {
      for (let c = 0; c < data[r].length; c++) {
        if (String(data[r][c] || "").indexOf("@") !== -1) {
          emailCol = c;
          break;
        }
      }
      if (emailCol !== -1 && String(data[1][emailCol] || "").indexOf("@") !== -1) break;
    }

    if (nameCol === -1 || nameCol === emailCol || nameCol === deptCol || ignoredCols[nameCol]) {
      let bestCol = -1;
      let bestScore = -1;
      const numCols = data[0].length;
      for (let c = 0; c < numCols; c++) {
        if (c === emailCol || c === deptCol || c === accountCol || ignoredCols[c]) continue;
        let score = 0;
        for (let r = 1; r < sampleLimit; r++) {
          const v = String(data[r][c] || "").trim();
          if (v && v.indexOf("@") === -1 && !/^\d+$/.test(v)) {
            score += v.indexOf(" ") !== -1 ? 3 : 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestCol = c;
        }
      }
      if (bestCol !== -1 && bestScore > 0) {
        nameCol = bestCol;
      }
    }
  }

  // Mặc định chuẩn nếu vẫn chưa xác định được cột
  if (emailCol === -1) emailCol = 0;
  if (nameCol === -1) nameCol = emailCol === 0 ? 1 : 0;
  if (deptCol === -1) deptCol = Math.max(emailCol, nameCol) + 1;

  const uniqueEmployees = [];
  const seenAccounts = new Set();

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const rawEmail = String(row[emailCol] || "").trim().toLowerCase();
    const fullName = String(row[nameCol] || "").trim();
    const deptName = (deptCol < row.length ? String(row[deptCol] || "").trim() : "") || "FPT Telecom";
    const avatarUrl = avatarCol !== -1 && avatarCol < row.length ? String(row[avatarCol] || "").trim() : "";

    if (!rawEmail && !fullName) continue;

    const canonicalEmail = rawEmail.indexOf("@") !== -1 ? rawEmail : (rawEmail ? rawEmail + "@fpt.com" : "");
    const record = {
      email: canonicalEmail,
      name: fullName,
      dept: deptName,
      avatar: avatarUrl
    };

    if (rawEmail) {
      map[rawEmail] = record;
      const localPart = rawEmail.split("@")[0].trim();
      if (localPart) {
        if (!seenAccounts.has(localPart)) {
          seenAccounts.add(localPart);
          uniqueEmployees.push(record);
        }
        if (!map[localPart]) map[localPart] = record;
        if (!map[localPart + "@fpt.com"]) map[localPart + "@fpt.com"] = record;
        if (!map[localPart + "@fpt.net"]) map[localPart + "@fpt.net"] = record;
        if (!map[localPart + "@vienthongtin.com"]) map[localPart + "@vienthongtin.com"] = record;
      }
    }
  }

  map.__uniqueEmployees = uniqueEmployees;
  return map;
}

function lookupHrByEmail(hrMap, email) {
  if (!hrMap || !email) return null;
  const clean = String(email).trim().toLowerCase();
  if (hrMap[clean]) return hrMap[clean];
  const localPart = clean.split("@")[0];
  if (localPart && hrMap[localPart]) return hrMap[localPart];
  return null;
}

function handleUploadHrDirectory(payload) {
  const list = payload.employees || [];
  if (!Array.isArray(list) || list.length === 0) {
    return { success: false, message: "Danh sách nhân sự trống." };
  }
  const ss = getSpreadsheet();
  const hrSheet = ensureHrDirectorySheet(ss);
  const rows = list.map(item => [
    String(item.email || "").trim().toLowerCase(),
    String(item.name || "").trim(),
    String(item.dept || "FPT Telecom").trim(),
    String(item.avatar || "").trim()
  ]);
  hrSheet.getRange(hrSheet.getLastRow() + 1, 1, rows.length, 4).setValues(rows);
  return { success: true, count: rows.length };
}

function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function buildDuplicateKey(senderEmail, recipientEmail) {
  const normSender = String(senderEmail || "").trim().toLowerCase();
  const normRec = String(recipientEmail || "").trim().toLowerCase();
  return normSender + "|||" + normRec;
}

function fallbackNameFromEmail(email) {
  if (!email) return "Đồng nghiệp FTEL";
  const local = String(email).split("@")[0].replace(/[0-9]+$/, "");
  return local.toUpperCase();
}

function formatTimestamp(ts) {
  if (!ts) return "";
  if (ts instanceof Date) {
    return Utilities.formatDate(ts, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
  }
  return String(ts);
}

function createJsonResponse(obj, callback) {
  const jsonStr = JSON.stringify(obj);
  if (callback && /^[a-zA-Z0-9_$]+$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + jsonStr + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
