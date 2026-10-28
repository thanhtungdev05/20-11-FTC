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

  // Tên tab Danh sách nhân sự (để tự động tra cứu Họ tên & Đơn vị từ Email)
  HR_SHEET_NAME: "DS_NhanSu",

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
  EMAIL_SUBJECT_DUPLICATE: "[FTEL 20/11] Thông báo lời cảm ơn bị trùng lặp"
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
      .addToUi();
  } catch (e) {}
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

  // Tập hợp các bộ (senderEmail | recipientEmail | normalizedMsg) đã hợp lệ trước đó để check trùng
  const seenTriplets = new Set();
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
    const tripletKey = buildDuplicateKey(senderEmail, recipientEmail, rawMessage);

    // Nếu dòng này đã được xử lý trước đó:
    if (currentCheckStatus === "HỢP LỆ") {
      seenTriplets.add(tripletKey);
      // Nếu hợp lệ nhưng chưa có ảnh thiệp Drive / chưa gửi mail thì đưa vào danh sách chờ Web Canvas xuất thiệp
      if (currentMailStatus !== "ĐÃ GỬI MAIL") {
        pendingRenderList.push({
          rowNumber: rowNumber,
          timestamp: formatTimestamp(timestamp),
          senderEmail: senderEmail,
          senderName: String(row[5] || fallbackNameFromEmail(senderEmail)),
          senderDept: String(row[6] || "FPT Telecom"),
          recipientEmail: recipientEmail,
          recipientName: String(row[7] || fallbackNameFromEmail(recipientEmail)),
          recipientDept: String(row[8] || "FPT Telecom"),
          recipientRole: recipientRole,
          message: String(row[9] || rawMessage)
        });
      }
      continue;
    }

    if (currentCheckStatus === "TRÙNG LẶP") {
      continue;
    }

    // --- XỬ LÝ DÒNG MỚI CHƯA KIỂM TRA ---
    const senderHr = hrMap[senderEmail] || {
      name: String(row[5] || "").trim() || fallbackNameFromEmail(senderEmail),
      dept: String(row[6] || "").trim() || "FPT Telecom"
    };
    const recipientHr = hrMap[recipientEmail] || {
      name: String(row[7] || "").trim() || fallbackNameFromEmail(recipientEmail),
      dept: String(row[8] || "").trim() || "FPT Telecom"
    };

    // Kiểm tra trùng 3 thông tin: Người gửi + Người nhận + Thông điệp
    const isDuplicate = seenTriplets.has(tripletKey);

    if (isDuplicate) {
      const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
      let dupMailStatus = "ĐÃ BÁO TRÙNG";
      try {
        sendDuplicateWarningEmail({
          senderEmail: senderEmail,
          senderName: senderHr.name,
          recipientName: recipientHr.name,
          recipientEmail: recipientEmail,
          message: rawMessage
        });
      } catch (mailErr) {
        dupMailStatus = "LỖI GỬI BÁO TRÙNG: " + mailErr.message;
      }

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
    seenTriplets.add(tripletKey);

    // Chỉnh sửa chính tả & chuẩn hóa câu chữ tiếng Việt
    const cleanedMessage = cleanAndCorrectVietnameseText(rawMessage);
    const submissionId = "FTEL-" + Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "yyyyMMdd-HHmmss") + "-R" + rowNumber;

    // Ghi thông tin HR + chính tả vào cột F -> N
    sheet.getRange(rowNumber, 6, 1, 9).setValues([[
      senderHr.name,
      senderHr.dept,
      recipientHr.name,
      recipientHr.dept,
      cleanedMessage,
      "HỢP LỆ",
      "CHỜ XUẤT THIỆP",
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

  // 2. Gửi Email kèm thiệp cho Người nhận, CC Người gửi với tiêu đề chuẩn:
  // "MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN"
  let mailStatus = "ĐÃ GỬI MAIL";
  const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  try {
    sendGratitudeNotificationEmail({
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
  } catch (mailErr) {
    mailStatus = "LỖI MAIL: " + mailErr.message;
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

  // Sửa các từ viết tắt phổ biến và lỗi gõ phím hay gặp trong tiếng Việt (chỉ khớp nguyên từ)
  const replacements = [
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
    [/\bcam on\b/gi, "cảm ơn"],
    [/\bcám ơn\b/gi, "cảm ơn"],
    [/\btruyền lữa\b/gi, "truyền lửa"],
    [/\bnhiệt huyểt\b/gi, "nhiệt huyết"],
    [/\bsức khoẻ\b/gi, "sức khỏe"]
  ];

  replacements.forEach(([regex, target]) => {
    s = s.replace(regex, target);
  });

  // Viết hoa chữ cái đầu câu và sau dấu chấm/chấm than/chấm hỏi
  s = s.charAt(0).toUpperCase() + s.slice(1);
  s = s.replace(/([.!?]\s+)([a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/g, (m, p1, p2) => {
    return p1 + p2.toUpperCase();
  });

  // Tầng 2: Nếu BTC cấu hình GEMINI_API_KEY trong Script Properties thì gọi AI rà soát lỗi chính tả
  try {
    const geminiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (geminiKey && s.length >= 10) {
      const aiFixed = callGeminiSpellCheck(s, geminiKey);
      if (aiFixed && aiFixed.length >= s.length * 0.7) {
        return aiFixed;
      }
    }
  } catch (e) {}

  return s;
}

function callGeminiSpellCheck(text, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  const prompt = "Hãy sửa lỗi chính tả tiếng Việt và lỗi gõ phím cho đoạn lời chúc 20/11 sau đây. QUY TẮC BẮT BUỘC: Giữ nguyên 100% văn phong, từ ngữ, cách xưng hô và cảm xúc của người viết, chỉ sửa từ sai chính tả hoặc viết tắt, chỉ trả về đúng nội dung đã sửa, không giải thích gì thêm:\n\n" + text;
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
    const out = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (out) return out.trim().replace(/^["“]|["”]$/g, "");
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

  if (lastRow <= 1) {
    return {
      totalFlames: 0,
      uniqueRecipients: 0,
      uniqueSenders: 0,
      uniqueUnits: 0,
      top30Recipients: [],
      early100Senders: [],
      unitSpread: [],
      pendingRender: []
    };
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  const seenTriplets = new Set();

  let totalFlames = 0;
  const recipientSet = new Set();
  const senderSet = new Set();
  const unitSet = new Set();

  // Map thống kê Top 30 người nhận
  const recipientStatsMap = {};
  // Danh sách lời cảm ơn hợp lệ theo thứ tự thời gian để lọc Top 100 người gửi sớm nhất
  const validChronologicalList = [];
  // Map thống kê theo đơn vị (Khu vực D)
  const unitStatsMap = {};

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

    // Quy tắc dữ liệu: Mỗi bộ (người gửi, người nhận, thông điệp) chỉ tính 1 lần
    const dupKey = buildDuplicateKey(senderEmail, recipientEmail, rawMessage);
    if (seenTriplets.has(dupKey)) return;
    seenTriplets.add(dupKey);

    const senderHr = hrMap[senderEmail] || {};
    const recipientHr = hrMap[recipientEmail] || {};

    const senderName = String(row[5] || senderHr.name || fallbackNameFromEmail(senderEmail)).trim();
    const senderDept = String(row[6] || senderHr.dept || "FPT Telecom").trim();
    const recipientName = String(row[7] || recipientHr.name || fallbackNameFromEmail(recipientEmail)).trim();
    const recipientDept = String(row[8] || recipientHr.dept || "FPT Telecom").trim();
    const recipientAvatar = recipientHr.avatar || "";
    const cleanedMsg = String(row[9] || rawMessage).trim();
    const driveUrl = String(row[12] || "").trim();

    totalFlames++;
    recipientSet.add(recipientEmail);
    senderSet.add(senderEmail);
    if (senderDept) unitSet.add(senderDept);
    if (recipientDept) unitSet.add(recipientDept);

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
      timestamp: formatTimestamp(timestamp),
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

    // 3. Thống kê theo Đơn vị (Khu vực D)
    const unitKey = recipientDept || senderDept || "FPT Telecom";
    if (!unitStatsMap[unitKey]) {
      unitStatsMap[unitKey] = {
        unit: unitKey,
        totalFlames: 0,
        senders: new Set(),
        recipients: new Set()
      };
    }
    unitStatsMap[unitKey].totalFlames++;
    unitStatsMap[unitKey].senders.add(senderEmail);
    unitStatsMap[unitKey].recipients.add(recipientEmail);

    if (senderDept && senderDept !== unitKey) {
      if (!unitStatsMap[senderDept]) {
        unitStatsMap[senderDept] = {
          unit: senderDept,
          totalFlames: 0,
          senders: new Set(),
          recipients: new Set()
        };
      }
      unitStatsMap[senderDept].senders.add(senderEmail);
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
    // Ghi nhận theo thứ tự lượt gửi hợp lệ sớm nhất (mỗi CBNV gửi sớm)
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

  // Sắp xếp Khu vực D: Lan tỏa theo đơn vị (Giảm dần theo totalFlames)
  const unitSpread = Object.values(unitStatsMap)
    .map(u => ({
      unit: u.unit,
      totalFlames: u.totalFlames,
      senderCount: u.senders.size,
      recipientCount: u.recipients.size
    }))
    .sort((a, b) => b.totalFlames - a.totalFlames || b.senderCount - a.senderCount);

  return {
    totalFlames: totalFlames,
    totalSubmissions: totalFlames,
    uniqueRecipients: recipientSet.size,
    uniqueSenders: senderSet.size,
    uniqueUnits: unitSet.size || unitSpread.length,
    top30Recipients: top30Recipients,
    early100Senders: early100Senders,
    unitSpread: unitSpread,
    recentTributes: validChronologicalList.slice(-20).reverse(),
    pendingRender: syncInfo.pendingRender || []
  };
}

/**
 * ==============================================================================
 * 5. GỬI EMAIL OUTLOOK (EMAIL KÈM THIỆP + CC NGƯỜI GỬI & EMAIL BÁO TRÙNG)
 * ==============================================================================
 */
function sendGratitudeNotificationEmail(params) {
  // Tiêu đề chính thức theo yêu cầu: MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN
  const subject = CONFIG.EMAIL_SUBJECT_SUCCESS;

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

  if (cardImageBlob) {
    inlineImages.tributeCard = cardImageBlob;
    hasCardImage = true;
  }

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 660px; margin: 0 auto; background: #071226; color: #ffffff; border-radius: 18px; overflow: hidden; border: 2px solid #f37021; box-shadow: 0 12px 35px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%); padding: 24px 20px; text-align: center;">
        <div style="color: #ffd700; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
          Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)
        </div>
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
          🔥 MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN 🔥
        </h1>
      </div>

      <div style="padding: 28px 24px; line-height: 1.65; color: #e2e8f0;">
        <p style="font-size: 17px; color: #ffffff; margin-top: 0;">
          Kính gửi Anh/Chị <strong style="color: #ffd700;">${escapeHtml(params.recipientName)}</strong>,
        </p>
        <p style="font-size: 15px;">
          Nhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11 – Chiến dịch <strong>"Gửi lời cảm ơn – Thắp sáng tri thức"</strong>, Anh/Chị vừa nhận được một ngọn lửa tri ân ấm áp từ đồng nghiệp <strong style="color: #f37021;">${escapeHtml(params.senderName)}</strong> (${escapeHtml(params.senderDept || "FPT Telecom")}) với dấu ấn <em>"${escapeHtml(params.recipientRole)}"</em>:
        </p>

        ${hasCardImage ? `
        <div style="text-align: center; margin: 24px 0;">
          <img src="cid:tributeCard" alt="Thiệp Tri Ân 20/11" style="width: 100%; max-width: 540px; height: auto; border-radius: 14px; border: 1px solid rgba(255,215,0,0.5); box-shadow: 0 10px 30px rgba(0,0,0,0.6);" />
        </div>
        ` : `
        <div style="background: rgba(255,255,255,0.06); border-left: 4px solid #ffd700; padding: 18px 20px; border-radius: 10px; margin: 20px 0; font-style: italic; font-size: 16px; color: #ffffff;">
          "${escapeHtml(params.message)}"
        </div>
        `}

        ${params.driveFileUrl ? `
        <div style="text-align: center; margin: 18px 0;">
          <a href="${params.driveFileUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f37021, #ffd700); color: #080c18; font-weight: 800; text-decoration: none; border-radius: 10px; font-size: 14px;">
            📥 Xem & Tải Thiệp Độ Phân Giải Cao (Google Drive)
          </a>
        </div>
        ` : ``}

        <p style="font-size: 14px; color: #cbd5e1; margin-top: 20px;">
          Cảm ơn Anh/Chị vì đã luôn là ngọn lửa truyền cảm hứng, sẻ chia tri thức và đồng hành cùng đồng nghiệp trên hành trình phát triển tại FPT Telecom!
        </p>
      </div>

      <div style="background: #040914; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.08);">
        © 2026 Trung tâm Đào tạo và Phát triển FPT Telecom • Chiến dịch Thắp Lửa Tri Ân 20/11
      </div>
    </div>
  `;

  const mailOptions = {
    to: params.recipientEmail,
    cc: params.senderEmail,
    subject: subject,
    htmlBody: htmlBody,
    name: "FTC - Thắp Lửa Tri Ân 20/11"
  };

  if (Object.keys(inlineImages).length > 0) {
    mailOptions.inlineImages = inlineImages;
  }
  if (cardImageBlob) {
    mailOptions.attachments = [cardImageBlob];
  }

  MailApp.sendEmail(mailOptions);
}

/**
 * Gửi email thông báo cho Người gửi khi phát hiện gửi trùng 3 thông tin (Người gửi + Người nhận + Thông điệp)
 */
function sendDuplicateWarningEmail(params) {
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c1427; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f59e0b;">
      <div style="background: linear-gradient(135deg, #002d62 0%, #d97706 100%); padding: 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 18px;">THÔNG BÁO LỜI CẢM ƠN TRÙNG LẶP</h2>
      </div>
      <div style="padding: 24px; line-height: 1.6; color: #e2e8f0; font-size: 14px;">
        <p>Chào Anh/Chị <strong>${escapeHtml(params.senderName)}</strong>,</p>
        <p>Hệ thống ghi nhận Anh/Chị vừa gửi một lời cảm ơn đến <strong>${escapeHtml(params.recipientName)} (${escapeHtml(params.recipientEmail)})</strong> với nội dung:</p>
        <blockquote style="background: rgba(255,255,255,0.06); border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 14px 0; font-style: italic;">
          "${escapeHtml(params.message)}"
        </blockquote>
        <p>Nội dung này <strong>trùng khớp với một lời cảm ơn Anh/Chị đã gửi trước đó</strong> cho cùng người nhận. Để đảm bảo tính chính xác của dữ liệu chương trình, bản ghi trùng lặp này sẽ không được tính thêm một lần nữa.</p>
        <p>Nếu Anh/Chị muốn gửi lời cảm ơn mới, vui lòng chia sẻ một thông điệp khác hoặc gửi tới một đồng nghiệp khác nhé!</p>
        <p style="margin-top: 18px; color: #94a3b8;">Trân trọng,<br/><strong>Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)</strong></p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: params.senderEmail,
    subject: CONFIG.EMAIL_SUBJECT_DUPLICATE,
    htmlBody: htmlBody,
    name: "FTC - Thắp Lửa Tri Ân 20/11"
  });
}

/**
 * ==============================================================================
 * 6. API WEB APP ENTRY POINTS (doGet / doPost)
 * ==============================================================================
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "get_dashboard";

    if (action === "get_dashboard" || action === "get_stats" || action === "get_leaderboard") {
      const data = getFullCampaignDashboardData();
      return createJsonResponse({
        success: true,
        data: data
      });
    }

    if (action === "get_pending_renders") {
      const syncInfo = processAllUnprocessedRows();
      return createJsonResponse({
        success: true,
        data: syncInfo.pendingRender || []
      });
    }

    return createJsonResponse({
      success: true,
      message: "FTEL 20/11 Google Form & Live Dashboard API is active."
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: err.toString()
    });
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
        message: "Lời cảm ơn bị trùng lặp (cùng người gửi, người nhận và thông điệp). Hệ thống đã gửi email thông báo trùng lặp."
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

function ensureHrDirectorySheet(ss) {
  let hrSheet = ss.getSheetByName(CONFIG.HR_SHEET_NAME);
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
  const hrSheet = ss.getSheetByName(CONFIG.HR_SHEET_NAME);
  if (!hrSheet || hrSheet.getLastRow() <= 1) return map;

  const rows = hrSheet.getRange(2, 1, hrSheet.getLastRow() - 1, 4).getValues();
  rows.forEach(r => {
    const email = String(r[0] || "").trim().toLowerCase();
    if (email) {
      map[email] = {
        name: String(r[1] || "").trim(),
        dept: String(r[2] || "FPT Telecom").trim(),
        avatar: String(r[3] || "").trim()
      };
    }
  });
  return map;
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

function buildDuplicateKey(senderEmail, recipientEmail, message) {
  const normSender = String(senderEmail || "").trim().toLowerCase();
  const normRec = String(recipientEmail || "").trim().toLowerCase();
  const normMsg = String(message || "").trim().toLowerCase().replace(/\s+/g, " ");
  return normSender + "|||" + normRec + "|||" + normMsg;
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

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
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
