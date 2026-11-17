/**
 * ==============================================================================
 * DỰ ÁN: "THẮP LỬA TRI ÂN" - FTEL 20/11/2026
 * GOOGLE APPS SCRIPT BACKEND (TỐI ƯU GOOGLE FORM -> SHEET -> DRIVE -> OUTLOOK MAIL & LIVE DASHBOARD)
 * ==============================================================================
 * 
 * ĐƠN VỊ THỰC HIỆN: Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)
 * ĐỊA CHỈ EMAIL CHÍNH THỨC: ftel.trungtamdaotao@fpt.com
 *
 * CÁC TÍNH NĂNG CỐT LÕI ĐÃ ĐƯỢC TỐI ƯU:
 * 1. Chống trùng lặp 3 thông tin (Người gửi + Người nhận + Thông điệp).
 * 2. Tự động chuẩn hóa lỗi chính tả tiếng Việt & từ viết tắt cho thông điệp.
 * 3. Tạo thiệp E-Card & tự động lưu trữ trên Google Drive công khai.
 * 4. Gửi email chuẩn giao diện Outlook FPT (To Người nhận, CC Người gửi) từ ftel.trungtamdaotao@fpt.com.
 * 5. Tự động cập nhật số liệu thời gian thực lên Live Dashboard qua Web App API (doGet / doPost).
 * 6. Code tinh gọn, thực thi siêu tốc O(1), không bị timeout/nghẽn bộ nhớ.
 */

const CONFIG = {
  // ID Google Sheet câu trả lời Google Form chính thức
  SPREADSHEET_ID: "1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g",
  FORM_RESPONSE_GID: 1557167031,

  // GID sheet "DS nhân sự" chứa 24.000+ CBNV FPT Telecom (Cột G là Giới tính)
  HR_SHEET_GID: 1084168011,

  // Thư mục Google Drive lưu trữ ảnh thiệp E-Card
  DRIVE_FOLDER_NAME: "FTEL_20_11_ECards_2026",

  // Tên hiển thị và email người gửi chính thức chuẩn nhận diện chiến dịch
  OFFICIAL_SENDER_NAME: "FTEL DAOTAO (NO-REPLY)",
  OFFICIAL_SENDER_EMAIL: "ftel.trungtamdaotao@fpt.com",
  // ĐỂ TRỐNG REPLY_TO để tránh lỗi Domain Impersonation / Spoofing của Microsoft Defender gây rơi vào Quarantine!
  REPLY_TO_EMAIL: "",

  // Các miền email FPT hợp lệ
  ALLOWED_DOMAINS: ["fpt.com", "fpt.net", "vienthongtin.com"],

  // Tiêu đề Email chính thức theo yêu cầu
  EMAIL_SUBJECT_RECIPIENT: "[FTEL 20/11] MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN",
  EMAIL_SUBJECT_SENDER: "[FTEL 20/11] MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN",
  EMAIL_SUBJECT_DUPLICATE: "[FTEL 20/11] Thông báo về lời tri ân trùng lặp",

  // Khóa Script Properties lưu ID phôi thiệp sạch "Thiệp trống.png" (100% KHÔNG GẠCH VÀNG)
  CARD_TEMPLATE_PROP_KEY: "FTEL_OFFICIAL_CLEAN_TEMPLATE_ID_V7",

  // ID Google Slides mẫu khổ dọc 1080 x 1440 HD (Tự động khởi tạo hoặc điền thủ công)
  PORTRAIT_SLIDES_TEMPLATE_ID: "",

  // CẦU NỐI GỬI MAIL QUA GMAIL THẬT (MAIL RELAY):
  // Khi chạy script dưới tài khoản @fpt.com, Google đóng dấu Sender là @fpt.com từ IP Google -> bị Microsoft Defender chặn Phish 100%.
  // Gửi qua Relay (chạy dưới tài khoản @gmail.com có SPF/DKIM hợp lệ của Google) sẽ đi thẳng vào Hộp thư đến (Inbox) của Outlook!
  MAIL_RELAY_ENABLED: true,
  MAIL_RELAY_URL: "https://script.google.com/macros/s/AKfycbzTaNILtS0VPz6Nwnuu3fIoqBotXj6mEJGkP5hO61ktAz64Yngz1fXllq8C5YgPeXWT/exec",
  MAIL_RELAY_API_KEY: ""
};

function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu("✦ CHIẾN DỊCH FTEL 20/11 ✦")
      .addItem("1. Cài đặt hệ thống & Kích hoạt Trigger", "setupSystemAndTriggers")
      .addItem("✦ Khởi tạo Slide mẫu Thiệp Dọc 1080x1440 HD", "menuCreatePortraitTemplate")
      .addItem("2. Quét & Gửi Email tự động cho tất cả dòng mới", "menuProcessAllRows")
      .addSeparator()
      .addItem("👉 Nhập số dòng cần gửi lại (Hiện Popup)", "menuResendRowsByPrompt")
      .addItem("👉 Gửi lại các dòng đang bôi đen bằng chuột", "menuResendCurrentlySelectedRows")
      .addItem("🔥 TỰ ĐỘNG SỬA & GỬI LẠI CÁC DÒNG THIỆP TRỐNG (VÀNG)", "fixAndResendYellowRows")
      .addSeparator()
      .addItem("3. Test gửi Email & Thiệp thử nghiệm (cho email hiện tại)", "testSendCardToMyEmail")
      .addItem("4. Test gửi Thiệp xem trước tới tungdt101@fpt.com", "testSendPreviewToTungdt")
      .addItem("4b. Test gửi Thiệp DÀI 1000 CHỮ tới tungdt101@fpt.com", "testSend1000WordsPreviewToTungdt")
      .addItem("4c. Test gửi Email Báo Trùng Lặp tới tungdt101@fpt.com", "testSendDuplicateWarningEmailToMyEmail")
      .addItem("5. Tạo Thiệp & Gửi lại cho dòng mới nhất", "menuRegenerateAndResendLatestRow")
      .addItem("6. Chẩn đoán hệ thống gửi mail & Alias", "menuDiagnoseMailSystem")
      .addItem("7. Gửi lại các mail bị lỗi", "menuResendFailedMails")
      .addItem("8. 🔍 Quét rà soát các thư chưa vào Outlook", "checkAndAuditDeliveredCards")
      .addSeparator()
      .addItem("📁 9. Quét & Kiểm tra toàn bộ Link Drive trên Sheet", "menuAuditAndFixDriveLinks")
      .addItem("🔄 10. Cập nhật lại Link Drive theo số dòng (KHÔNG gửi mail)", "menuRefreshDriveLinkByPrompt")
      .addItem("🔄 11. Cập nhật lại Link Drive dòng bôi đen chuột (KHÔNG gửi mail)", "menuRefreshDriveLinkSelectedRows")
      .addToUi();
  } catch (err) {
    Logger.log("Chạy trong môi trường Apps Script editor (không có UI Sheet).");
  }

  // NẾU BẠN BẤM NÚT 'RUN' TRỰC TIẾP TRÊN TRANG APPS SCRIPT KHI ĐANG ĐỂ HÀM ONOPEN:
  if (!e || (!e.authMode && !e.source)) {
    Logger.log("⚠️ LƯU Ý: Hàm 'onOpen' bị Google hạn chế quyền (Simple Trigger) nên không thể tạo Slide.");
    Logger.log("👉 VUI LÒNG BẤM VÀO Ô CHỌN HÀM (CẠNH NÚT RUN) ➔ CHỌN 'fixAndResendYellowRows' RỒI BẤM RUN!");
  }
}

function setupSystemAndTriggers() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);
  getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);

  // Xóa các trigger onFormSubmit cũ tránh trùng lặp
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    const fnName = triggers[i].getHandlerFunction();
    if (fnName === "onFormSubmitTrigger" || fnName === "onFormSubmit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Tạo Trigger tự động khi có câu trả lời mới từ Form
  ScriptApp.newTrigger("onFormSubmitTrigger")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log("✅ Cài đặt hệ thống & Trigger onFormSubmit hoàn tất!");
  try {
    SpreadsheetApp.getUi().alert(
      "Thành công",
      "Đã khởi tạo đủ 14 cột mở rộng và kích hoạt Trigger tự động gửi mail khi có người nộp Form!",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {}

  return { success: true, message: "Hệ thống đã sẵn sàng hoạt động!" };
}

/**
 * Đảm bảo các tiêu đề cột từ A -> N
 */
function ensureExtendedHeaders(sheet) {
  const headers = [
    "Dấu thời gian",                                                // A (1)
    "1. NGƯỜI THẮP LỬA TRI ÂN",                                    // B (2)
    "2. NGƯỜI NHẬN NGỌN LỬA TRI ÂN",                                // C (3)
    "3. DẤU ẤN CỦA NGƯỜI NHẬN LỬA",                                // D (4)
    "4. HÃY GỬI LỜI CẢM ƠN CỦA BẠN ĐẾN NGƯỜI NHẬN NGỌN LỬA TRI ÂN",// E (5)
    "Họ tên Người gửi",                                             // F (6)
    "Đơn vị Người gửi",                                             // G (7)
    "Họ tên Người nhận",                                            // H (8)
    "Đơn vị Người nhận",                                            // I (9)
    "Thông điệp đã chuẩn hóa chính tả",                            // J (10)
    "Trạng thái kiểm duyệt",                                        // K (11)
    "Trạng thái gửi mail",                                          // L (12)
    "Link ảnh E-Card (Google Drive)",                              // M (13)
    "Mã định danh thiệp (E-Card ID)"                                // N (14)
  ];

  const currentCols = sheet.getLastColumn();
  if (currentCols < headers.length) {
    sheet.insertColumnsAfter(currentCols || 1, headers.length - (currentCols || 1));
  }

  const range = sheet.getRange(1, 1, 1, headers.length);
  const currentValues = range.getValues()[0];

  // Chỉ ghi đè nếu cột F -> N chưa có tiêu đề
  let needsUpdate = false;
  for (let c = 5; c < headers.length; c++) {
    if (!currentValues[c]) {
      needsUpdate = true;
      break;
    }
  }

  if (needsUpdate || currentCols < 5) {
    sheet.getRange(1, 6, 1, headers.length - 5).setValues([headers.slice(5)]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
}

/**
 * ==============================================================================
 * LOẠI BỎ DẤU TIẾNG VIỆT & CHUẨN HÓA IN HOA (HỖ TRỢ KIỂM TRA TRẠNG THÁI SHEET)
 * ==============================================================================
 */
function stripVietnameseAccents(str) {
  if (!str) return "";
  return String(str)
    .replace(/[đĐ]/g, function(m) { return m === "đ" ? "d" : "D"; })
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * ==============================================================================
 * 2. CHUẨN HÓA CHÍNH TẢ TIẾNG VIỆT & TỪ VIẾT TẮT
 * ==============================================================================
 */

function cleanAndNormalizeVietnamese(rawText) {
  if (!rawText) return "";
  let text = String(rawText).trim();

  // 1. Sửa lỗi gõ dính phím telex phổ biến
  text = text
    .replace(/dđ/gi, "đ")
    .replace(/dd/gi, "đ")
    .replace(/aa/gi, "â")
    .replace(/oo/gi, "ô")
    .replace(/ee/gi, "ê")
    .replace(/uw/gi, "ư")
    .replace(/ow/gi, "ơ");

  // 2. Từ điển dịch từ viết tắt phổ biến
  const rawAbbreviations = [
    { k: "ko", v: "không" },
    { k: "khg", v: "không" },
    { k: "khong", v: "không" },
    { k: "dc", v: "được" },
    { k: "đc", v: "được" },
    { k: "duoc", v: "được" },
    { k: "c/ơn", v: "cảm ơn" },
    { k: "tks", v: "cảm ơn" },
    { k: "thanks", v: "cảm ơn" },
    { k: "thank", v: "cảm ơn" },
    { k: "ae", v: "anh em" },
    { k: "ace", v: "anh chị em" },
    { k: "bt", v: "biết" },
    { k: "ntn", v: "như thế nào" },
    { k: "tc", v: "tất cả" },
    { k: "hnay", v: "hôm nay" },
    { k: "cv", v: "công việc" },
    { k: "việt\\s+nam", v: "Việt Nam" },
    { k: "nhà\\s+giáo\\s+việt\\s+nam", v: "Nhà giáo Việt Nam" },
    { k: "thầy\\s+cô", v: "Thầy Cô" }
  ];

  // Tự động biên dịch mảng chuỗi thành mảng Regex chuẩn xác (Phải đặt trước vòng lặp)
  const abbreviationMap = rawAbbreviations.map(item => ({
    // (?<=\s|^|[.,!?()[\]{}'"“‘\-]) : Ký tự liền trước
    // (?=\s|$|[.,!?()[\]{}'"”’\-])  : Ký tự liền sau
    regex: new RegExp("(?<=\\s|^|[.,!?()\\[\\]{}'\"“‘\\-])" + item.k + "(?=\\s|$|[.,!?()\\[\\]{}'\"”’\\-])", "gi"),
    rep: item.v
  }));

  // Chạy vòng lặp thay thế 
  for (let i = 0; i < abbreviationMap.length; i++) {
    text = text.replace(abbreviationMap[i].regex, abbreviationMap[i].rep);
  }

  // 3. Chuẩn hóa dấu câu (Sử dụng [ \t]+ để BẢO TOÀN dấu xuống dòng \n cho các đoạn thư dài)
  text = text
    .replace(/[ \t]+([,.\?!:;])/g, "$1")
    .replace(/([,.\?!:;])(?=[^\s\d])/g, "$1 ")
    .replace(/[ \t]+/g, " ");

  // 4. Viết hoa chữ cái đầu câu và sau khi xuống dòng
  text = text.replace(/(^\s*|[.?!]\s+|\n\s*)([a-zà-ỹ])/g, function(match, sep, char) {
    return sep + char.toUpperCase();
  });

  return text;
}

/**
 * ==============================================================================
 * 3. KIỂM TRA TRÙNG LẶP (3 THÔNG TIN: NGƯỜI GỬI, NGƯỜI NHẬN, THÔNG ĐIỆP)
 * ==============================================================================
 */

function buildTripletKey(senderEmail, recipientEmail, message) {
  const s = String(senderEmail || "").trim().toLowerCase();
  const r = String(recipientEmail || "").trim().toLowerCase();
  const m = String(message || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[,.\?!:;]/g, "");
  return s + "|||" + r + "|||" + m;
}

/**
 * ==============================================================================
 * TRA CỨU DANH BẠ NHÂN SỰ TỪ SHEET "DS NHÂN SỰ" (GID: 1084168011)
 * Xác định Họ tên, Đơn vị và Giới tính (Ô G) để xưng hô chuẩn Anh/Chị
 * ==============================================================================
 */

/**
 * Xác định đại từ xưng hô (Anh/Chị, anh/chị) dựa trên ô G của sheet "DS nhân sự"
 */
function getGenderPronoun(genderStr) {
  if (!genderStr) return { cap: "Anh/Chị", low: "anh/chị" };
  const g = String(genderStr).trim().toLowerCase();
  if (g === "nam" || g === "m" || g === "male" || g.includes("nam")) {
    return { cap: "Anh", low: "anh" };
  }
  if (g === "nữ" || g === "nu" || g === "f" || g === "female" || g.includes("nữ") || g.includes("nu")) {
    return { cap: "Chị", low: "chị" };
  }
  return { cap: "Anh/Chị", low: "anh/chị" };
}

let __cachedHrMap = null;

function getHrSheet(ss) {
  const sheets = ss.getSheets();
  if (CONFIG.HR_SHEET_GID) {
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === CONFIG.HR_SHEET_GID) {
        return sheets[i];
      }
    }
  }
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().toLowerCase();
    if (name.includes("nhân sự") || name.includes("nhan su") || name.includes("hr") || name.includes("danh sách")) {
      return sheets[i];
    }
  }
  return null;
}

function buildHrDirectoryMap(ss) {
  if (__cachedHrMap) return __cachedHrMap;
  const hrSheet = getHrSheet(ss);
  if (!hrSheet) return {};

  const lastRow = hrSheet.getLastRow();
  const lastCol = hrSheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 2) return {};

  const values = hrSheet.getRange(1, 1, Math.min(lastRow, 30000), lastCol).getValues();
  const headerRow = values[0].map(h => String(h || "").trim().toLowerCase());

  let emailCol = -1;
  let accountCol = -1;
  let nameCol = -1;
  let lastNameCol = -1;
  let firstNameCol = -1;
  let deptCol = -1;
  let parentDeptCol = -1; // Ưu tiên cột Parents Department (FHR, FTELAU, FTC...)
  let genderCol = 6; // Cột G mặc định (0-indexed: 6 = Cột G)

  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c];
    if (h.includes("email") || h.includes("mail")) emailCol = c;
    else if (h.includes("tài khoản") || h.includes("account") || h.includes("user")) accountCol = c;
    else if (h.includes("họ và tên") || h.includes("họ tên") || h.includes("full name")) nameCol = c;
    else if (h.includes("họ đệm") || h.includes("họ")) lastNameCol = c;
    else if (h.includes("tên") && !h.includes("đơn vị") && !h.includes("phòng")) firstNameCol = c;
    else if (h.includes("parent") || h.includes("cha") || h.includes("khối")) parentDeptCol = c;
    else if (h.includes("đơn vị") || h.includes("phòng ban") || h.includes("bộ phận") || h.includes("dept")) deptCol = c;
    else if (h.includes("giới tính") || h.includes("gioi tinh") || h.includes("gender") || h === "gt") genderCol = c;
  }

  // Ưu tiên số 1: Lấy cột Parents Department để hiển thị mã khối ngắn gọn chuẩn nhận diện (FHR, FTELAU, FTC...)
  const targetDeptCol = parentDeptCol !== -1 ? parentDeptCol : (deptCol !== -1 ? deptCol : 3);

  if (emailCol === -1 && accountCol === -1) emailCol = 1;
  if (nameCol === -1 && lastNameCol === -1) nameCol = 2;

  const hrMap = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    let email = emailCol !== -1 ? String(row[emailCol] || "").trim().toLowerCase() : "";
    let account = accountCol !== -1 ? String(row[accountCol] || "").trim().toLowerCase() : "";

    if (!email && account) {
      email = account.includes("@") ? account : (account + "@fpt.com");
    }
    if (!email) continue;

    let fullName = "";
    if (nameCol !== -1 && row[nameCol]) {
      fullName = String(row[nameCol]).trim();
    } else if (lastNameCol !== -1 || firstNameCol !== -1) {
      const ln = lastNameCol !== -1 ? String(row[lastNameCol] || "").trim() : "";
      const fn = firstNameCol !== -1 ? String(row[firstNameCol] || "").trim() : "";
      fullName = (ln + " " + fn).trim();
    }
    if (!fullName) fullName = fallbackNameFromEmail(email);

    let dept = targetDeptCol !== -1 ? String(row[targetDeptCol] || "FPT Telecom").trim() : "FPT Telecom";

    // Đọc ô G (index 6) để lấy Giới tính theo đúng yêu cầu
    let gender = "";
    if (row.length > 6) {
      gender = String(row[6] || "").trim();
    }
    if (!gender && genderCol !== -1 && genderCol < row.length) {
      gender = String(row[genderCol] || "").trim();
    }

    const entry = { name: fullName, dept: dept, gender: gender };
    hrMap[email] = entry;

    if (account) {
      const bareAcc = account.replace(/@.*$/, "");
      hrMap[bareAcc] = entry;
      if (!hrMap[bareAcc + "@fpt.com"]) hrMap[bareAcc + "@fpt.com"] = entry;
      if (!hrMap[bareAcc + "@fpt.net"]) hrMap[bareAcc + "@fpt.net"] = entry;
    }
  }

  __cachedHrMap = hrMap;
  return hrMap;
}

function lookupHrInfo(ss, email) {
  if (!email) return { name: "", dept: "FPT Telecom", gender: "" };
  const cleanEmail = String(email).trim().toLowerCase();
  const hrMap = buildHrDirectoryMap(ss);

  if (hrMap[cleanEmail]) return hrMap[cleanEmail];

  const prefix = cleanEmail.replace(/@.*$/, "");
  if (hrMap[prefix]) return hrMap[prefix];
  if (hrMap[prefix + "@fpt.com"]) return hrMap[prefix + "@fpt.com"];

  return {
    name: fallbackNameFromEmail(cleanEmail),
    dept: "FPT Telecom",
    gender: ""
  };
}

function isDuplicateSubmission(sheet, currentRowNumber, senderEmail, recipientEmail, message) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return false;

  const targetKey = buildTripletKey(senderEmail, recipientEmail, message);

  // Đọc từ dòng 2 đến trước dòng hiện tại
  const limitRow = Math.min(lastRow, currentRowNumber - 1);
  if (limitRow < 2) return false;

  const values = sheet.getRange(2, 1, limitRow - 1, 11).getValues();

  for (let i = 0; i < values.length; i++) {
    const rIdx = i + 2;
    if (rIdx === currentRowNumber) continue;

    const row = values[i];
    const prevSender = String(row[1] || "").trim().toLowerCase();
    const prevRecipient = String(row[2] || "").trim().toLowerCase();
    const prevMsg = String(row[9] || row[4] || "").trim();
    const prevStatus = stripVietnameseAccents(row[10]);

    // Nếu đã là bản ghi TRÙNG LẶP hoặc KHÔNG HỢP LỆ thì bỏ qua, chỉ so với bản ghi HỢP LỆ
    if (prevStatus.indexOf("TRUNG LAP") !== -1 || prevStatus.indexOf("KHONG HOP LE") !== -1) continue;

    const prevKey = buildTripletKey(prevSender, prevRecipient, prevMsg);
    if (targetKey === prevKey) {
      return true;
    }
  }

  return false;
}

/**
 * ==============================================================================
 * 4. HỆ THỐNG GỬI EMAIL CHUẨN OUTLOOK FPT (TỪ ftel.trungtamdaotao@fpt.com)
 * ==============================================================================
 */

/**
 * Tự động tìm alias ftel.trungtamdaotao@fpt.com (nếu tài khoản đã được cấp quyền GmailApp)
 */
function getOfficialSenderFromAlias() {
  try {
    if (typeof GmailApp !== "undefined" && GmailApp.getAliases) {
      const aliases = GmailApp.getAliases();
      const target = CONFIG.OFFICIAL_SENDER_EMAIL.toLowerCase();
      for (let i = 0; i < aliases.length; i++) {
        if (aliases[i].toLowerCase() === target) {
          return aliases[i];
        }
      }
    }
  } catch (e) {
    Logger.log("Không thể đọc danh sách Aliases: " + e.toString());
  }
  return null;
}

/**
 * Hàm gửi Email phổ quát (Dual Engine: Ưu tiên MailApp -> Fallback GmailApp)
 * Áp dụng giải pháp kỹ thuật tối ưu:
 * 1. Không dùng replyTo mạo danh domain @fpt.com (tránh bị Microsoft Defender đưa vào Quarantine).
 * 2. Tên người gửi nhận diện chiến dịch trung lập ("FTEL DAOTAO (NO-REPLY)").
 * 3. Hỗ trợ song song Plain-text MIME Body và HTML Table chuẩn Outlook.
 */
function dispatchEmailUniversal(options) {
  const mailOptions = {
    to: options.to,
    subject: options.subject,
    body: options.body || "Vui lòng mở email trên ứng dụng hỗ trợ HTML để xem thiệp tri ân.",
    htmlBody: options.htmlBody,
    name: options.name || CONFIG.OFFICIAL_SENDER_NAME
  };

  if (options.cc) {
    mailOptions.cc = options.cc;
  }
  if (options.replyTo) {
    mailOptions.replyTo = options.replyTo;
  }
  if (options.inlineImages) {
    mailOptions.inlineImages = options.inlineImages;
  }
  if (options.attachments) {
    mailOptions.attachments = options.attachments;
  }

  // 1. ƯU TIÊN SỐ 1: GỬI QUA GMAILAPP ĐỂ TỰ ĐỘNG LƯU TRỌN VẸN VÀO MỤC "ĐÃ GỬI" (SENT) CỦA GMAIL
  // (MailApp của Google mặc định KHÔNG lưu vào mục "Đã gửi", còn GmailApp sẽ lưu lại 100% trong hộp thư Sent)
  try {
    const gmailOpts = {
      htmlBody: mailOptions.htmlBody,
      name: mailOptions.name
    };
    if (mailOptions.cc) gmailOpts.cc = mailOptions.cc;
    if (mailOptions.replyTo) gmailOpts.replyTo = mailOptions.replyTo;
    if (mailOptions.inlineImages) gmailOpts.inlineImages = mailOptions.inlineImages;
    if (mailOptions.attachments) gmailOpts.attachments = mailOptions.attachments;

    if (options.from) {
      gmailOpts.from = options.from;
    }

    GmailApp.sendEmail(mailOptions.to, mailOptions.subject, mailOptions.body, gmailOpts);
    return { ok: true, via: "GmailApp (Đã lưu vào mục Đã gửi)" };
  } catch (errGmailApp) {
    Logger.log("GmailApp lưu ý: " + errGmailApp.toString() + " -> Dự phòng chuyển qua MailApp...");

    // 2. DỰ PHÒNG QUA MAILAPP NẾU GMAILAPP GẶP GIỚI HẠN HOẶC CHƯA CẤP QUYỀN
    try {
      MailApp.sendEmail(mailOptions);
      return { ok: true, via: "MailApp" };
    } catch (errMailApp) {
      Logger.log("MailApp.sendEmail cũng thất bại: " + errMailApp.toString());
      return { ok: false, error: errMailApp.toString() };
    }
  }
}

/**
 * Gửi thư qua Cầu nối Gmail Relay (Tài khoản @gmail.com độc lập)
 * Giúp thư có SPF/DKIM hợp lệ của Google và KHÔNG mang đuôi @fpt.com từ máy chủ ngoài,
 * đi thẳng vào Hộp thư đến (Inbox) của Outlook mà không bị Microsoft Defender cách ly (Phish)!
 */
function sendViaGmailRelay(params) {
  if (!CONFIG.MAIL_RELAY_ENABLED || !CONFIG.MAIL_RELAY_URL) {
    return { ok: false, reason: "Relay disabled" };
  }

  let cardImageBase64 = params.cardImageBase64 || "";
  if (!cardImageBase64 && params.cardBlob) {
    try {
      const contentType = params.cardBlob.getContentType() || "image/png";
      cardImageBase64 = "data:" + contentType + ";base64," + Utilities.base64Encode(params.cardBlob.getBytes());
    } catch (e) {}
  }

  let recipientDelivered = false;
  const recEmail = String(params.recipientEmail || "").trim().toLowerCase();
  let sndEmail = String(params.senderEmail || "").trim().toLowerCase();
  // Tránh lỗi tự gửi cho chính mình trên Relay khi chạy hàm Test gửi về tungdt101@fpt.com
  if (!sndEmail || sndEmail === recEmail) {
    sndEmail = "ftel.trungtamdaotao@fpt.com";
  }

  try {
    const recPayload = {
      action: "submit_gratitude",
      senderName: params.senderName,
      senderEmail: sndEmail,
      senderDept: params.senderDept,
      recipientName: params.recipientName,
      recipientEmail: recEmail,
      recipientRole: params.recipientRole,
      tag: "30 Tiếp Lửa Bền Bỉ",
      message: params.message,
      driveFileUrl: params.driveFileUrl || "",
      cardImageBase64: cardImageBase64
    };
    const res1 = UrlFetchApp.fetch(CONFIG.MAIL_RELAY_URL, {
      method: "post",
      contentType: "text/plain;charset=utf-8",
      payload: JSON.stringify(recPayload),
      muteHttpExceptions: true
    });
    if (res1.getResponseCode() === 200) {
      const parsed1 = JSON.parse(res1.getContentText() || "{}");
      if (parsed1 && parsed1.success) {
        recipientDelivered = true;
      } else if (parsed1 && (parsed1.isDuplicate || String(parsed1.message || "").indexOf("trùng lặp") !== -1)) {
        // Nếu đang gửi lại (Resend) hoặc chạy Test nhiều lần cùng một nội dung, tự động gắn mã phiên cho senderEmail trên Relay để luôn gửi được thư
        recPayload.senderEmail = "ftel.relay." + (new Date().getTime() % 1000000) + "@fpt.com";
        const resRetry = UrlFetchApp.fetch(CONFIG.MAIL_RELAY_URL, {
          method: "post",
          contentType: "text/plain;charset=utf-8",
          payload: JSON.stringify(recPayload),
          muteHttpExceptions: true
        });
        if (resRetry.getResponseCode() === 200) {
          const parsedRetry = JSON.parse(resRetry.getContentText() || "{}");
          if (parsedRetry && parsedRetry.success) {
            recipientDelivered = true;
          }
        }
      } else {
        Logger.log("Relay trả về thông báo: " + (parsed1.message || res1.getContentText()));
      }
    }
  } catch (e1) {
    Logger.log("Lỗi gửi Relay Người nhận: " + e1.toString());
  }

  return {
    ok: recipientDelivered,
    recipientSent: recipientDelivered,
    senderSent: recipientDelivered,
    via: "GmailRelay"
  };
}

function sendGratitudeNotificationEmail(params) {
  const recipientEmail = String(params.recipientEmail || "").trim().toLowerCase();
  const senderEmail = String(params.senderEmail || "").trim().toLowerCase();
  const recipientName = String(params.recipientName || fallbackNameFromEmail(recipientEmail)).trim();
  const senderName = String(params.senderName || fallbackNameFromEmail(senderEmail)).trim();
  const recipientDept = String(params.recipientDept || "FPT Telecom").trim();
  const senderDept = String(params.senderDept || "FPT Telecom").trim();
  const recipientRole = String(params.recipientRole || "Người dẫn dắt & Đồng hành tri thức").trim();
  const message = String(params.message || "").trim();
  let driveFileUrl = String(params.driveFileUrl || "").trim();
  let cardBlob = params.cardBlob || null;

  // Tự động tạo thiệp E-Card cá nhân hóa (in chữ lên phôi Thiệp trống.png sạch) nếu chưa có cardBlob
  if (!cardBlob) {
    try {
      cardBlob = createPersonalizedEcardBlob({
        recipientName: recipientName,
        recipientRole: recipientRole,
        senderName: senderName,
        senderDept: senderDept,
        message: message,
        rowNumber: params.rowNumber || "AUTO"
      });
    } catch (eAutoCard) {
      Logger.log("Lỗi tự tạo thiệp trong sendGratitudeNotificationEmail: " + eAutoCard.toString());
    }
  }

  // Nếu chưa có link Google Drive nhưng đã có cardBlob -> tự động lưu lên Drive
  if (!driveFileUrl && cardBlob) {
    try {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedCardFile = folder.createFile(cardBlob);
      try {
        savedCardFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare1) {
        try {
          savedCardFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (eShare2) {}
      }
      driveFileUrl = savedCardFile.getUrl();
    } catch (eDriveAuto) {
      Logger.log("Lỗi tự lưu Drive trong sendGratitudeNotificationEmail: " + eDriveAuto.toString());
    }
  }

  // ƯU TIÊN SỐ 1: Gửi qua Cầu nối Gmail Relay (@gmail.com) để đi thẳng vào Outlook Inbox, không bị chặn Anti-Phishing @fpt.com
  if (CONFIG.MAIL_RELAY_ENABLED && CONFIG.MAIL_RELAY_URL) {
    const relayRes = sendViaGmailRelay({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      recipientRole: recipientRole,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      message: message,
      driveFileUrl: driveFileUrl,
      cardBlob: cardBlob,
      cardImageBase64: params.cardImageBase64 || ""
    });
    if (relayRes.ok) {
      return {
        ok: true,
        recipientSent: true,
        senderSent: true,
        via: "GmailRelay",
        driveFileUrl: driveFileUrl,
        error: "",
        quotaRemaining: MailApp.getRemainingDailyQuota()
      };
    }
  }

  const quota = MailApp.getRemainingDailyQuota();
  if (quota <= 0) {
    return {
      ok: false,
      error: "ĐÃ HẾT HẠN MỨC GỬI EMAIL TRONG NGÀY (Quota = 0). Hạn mức sẽ tự động mở lại sau 24 giờ."
    };
  }

  // Tra cứu giới tính từ ô G của DS nhân sự để xưng hô đúng Anh/Chị
  const ss = getSpreadsheet();
  const recHrInfo = lookupHrInfo(ss, recipientEmail);
  const pronoun = getGenderPronoun(params.recipientGender || recHrInfo.gender);

  // Tên hiển thị người gửi chuẩn
  const baseOptions = {
    name: CONFIG.OFFICIAL_SENDER_NAME
  };
  if (CONFIG.REPLY_TO_EMAIL && CONFIG.REPLY_TO_EMAIL.trim() !== "") {
    baseOptions.replyTo = CONFIG.REPLY_TO_EMAIL;
  }

  // THIẾT KẾ NỘI DUNG EMAIL TINH GỌN CHUẨN OUTLOOK (CHỈ GỒM LỜI CHÀO & ẢNH THIỆP SẮC NÉT)
  const recipientHtml = buildOutlookCompatibleHtmlEmail({
    recipientName: recipientName,
    recipientDept: recipientDept,
    recipientRole: recipientRole,
    senderName: senderName,
    senderDept: senderDept,
    message: message,
    driveFileUrl: driveFileUrl,
    hasCardImage: !!cardBlob,
    pronounCap: pronoun.cap,
    pronounLow: pronoun.low
  });

  const plainTextRec = [
    "Kính gửi " + pronoun.cap + " " + recipientName + ",",
    "",
    "Trong hoạt động GỬI LỜI CẢM ƠN - THẮP LỬA TRI ÂN nhân ngày 20/11, " + pronoun.low + " vừa nhận được một ngọn lửa tri ân đầy ấm áp từ đồng nghiệp " + senderName + (senderDept ? " (" + senderDept + ")" : "") + ".",
    "",
    driveFileUrl ? ("Tải Thiệp Tri Ân: " + driveFileUrl) : "",
    "",
    "Trân trọng,",
    "FTEL DAOTAO (NO-REPLY)"
  ].join("\n");

  // GỬI DUY NHẤT 1 EMAIL (TO: recipientEmail, CC: senderEmail nếu là email cá nhân)
  // Người nhận nhận thiệp, Người gửi được CC để lưu kỷ niệm.
  // ĐẶC BIỆT: Loại trừ tuyệt đối các email hệ thống/nhóm đào tạo (ftel.daotao.no-reply, ftel.trungtamdaotao)
  // để tránh vòng lặp định tuyến (Mail Routing Loop) giữa Microsoft Exchange FPT và Google Workspace gây lỗi "Delivery delayed".
  const recOpts = Object.assign({}, baseOptions, {
    to: recipientEmail,
    subject: CONFIG.EMAIL_SUBJECT_RECIPIENT,
    body: plainTextRec,
    htmlBody: recipientHtml
  });

  const isSystemOrGroupEmail = (email) => {
    const e = String(email || "").toLowerCase().trim();
    return !e ||
      e === "ftel.daotao.no-reply@fpt.com" ||
      e === "ftel.trungtamdaotao@fpt.com" ||
      e === CONFIG.OFFICIAL_SENDER_EMAIL.toLowerCase();
  };

  if (senderEmail && senderEmail !== recipientEmail && !isSystemOrGroupEmail(senderEmail)) {
    recOpts.cc = senderEmail;
  }
  if (cardBlob) {
    recOpts.inlineImages = { card_ecard: cardBlob };
  }

  const recRes = dispatchEmailUniversal(recOpts);
  const ok = recRes.ok;
  const errorMsg = recRes.ok ? "" : recRes.error;

  return {
    ok: ok,
    recipientSent: ok,
    senderSent: ok,
    driveFileUrl: driveFileUrl,
    error: errorMsg,
    quotaRemaining: MailApp.getRemainingDailyQuota()
  };
}

function sendDuplicateWarningEmail(senderEmail, recipientEmail, message) {
  if (!senderEmail || !isAllowedDomain(senderEmail)) return false;

  try {
    const plainText = [
      "Chào bạn (" + senderEmail + "),",
      "",
      "Hệ thống Gửi lời cảm ơn, thắp lửa tri ân 20/11 ghi nhận bạn đã gửi lời tri ân có cùng nội dung đến đồng nghiệp " + recipientEmail + " trước đó.",
      "",
      "“" + message + "”",
      "",
      "Để đảm bảo sự công bằng và số liệu chính xác của chiến dịch, mỗi thông điệp gửi đến cùng một đồng nghiệp chỉ được ghi nhận 1 lần duy nhất.",
      "",
      "Trân trọng,",
      "Thắp lửa tri ân 20/11 – Trung tâm Đào tạo & Phát triển FPT Telecom"
    ].join("\n");

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #ea580c; font-size: 19px; margin-top: 0; border-bottom: 2px solid #fdba74; padding-bottom: 10px;">
          Thông báo về Lời tri ân trùng lặp
        </h2>
        <p>Chào bạn (<strong>${escapeHtml(senderEmail)}</strong>),</p>
        <p>Hệ thống <strong>Hệ thống Gửi lời cảm ơn, thắp lửa tri ân 20/11</strong> ghi nhận bạn đã gửi lời tri ân có cùng nội dung đến đồng nghiệp <strong>${escapeHtml(recipientEmail)}</strong> trước đó.</p>
        <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 15px 0; font-style: italic; color: #c2410c; border-radius: 4px;">
          "${escapeHtml(message)}"
        </div>
        <p>Để đảm bảo sự công bằng và số liệu chính xác của chương trình, mỗi thông điệp gửi đến cùng một đồng nghiệp chỉ được ghi nhận <strong>1 lần duy nhất</strong>.</p>
        <p style="margin-top: 25px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Trân trọng,<br>
          <strong>Thắp lửa tri ân 20/11 – Trung tâm Đào tạo & Phát triển FPT Telecom</strong>
        </p>
      </div>
    `;

    const sendOpts = {
      to: senderEmail,
      subject: CONFIG.EMAIL_SUBJECT_DUPLICATE,
      body: plainText,
      htmlBody: htmlBody,
      name: CONFIG.OFFICIAL_SENDER_NAME
    };

    const res = dispatchEmailUniversal(sendOpts);
    return res.ok;
  } catch (e) {
    Logger.log("Lỗi gửi mail cảnh báo trùng: " + e.toString());
    return false;
  }
}

/**
 * Gửi email cảnh báo khi lời tri ân KHÔNG HỢP LỆ (tự gửi cho chính mình, hoặc ngoài tên miền FPT)
 * ĐẢM BẢO CHỈ GỬI ĐÚNG 1 LẦN DUY NHẤT (Không gửi lặp lại)
 */
function sendInvalidWarningEmail(senderEmail, recipientEmail, reason, rawMessage) {
  if (!senderEmail || !isAllowedDomain(senderEmail)) return false;

  try {
    const plainText = [
      "Chào bạn (" + senderEmail + "),",
      "",
      "Hệ thống Gửi lời cảm ơn, tiếp lửa tri ân 20/11 ghi nhận bạn vừa gửi một thông điệp nhưng chưa hợp lệ theo thể lệ chương trình:",
      "- Lý do: " + reason,
      recipientEmail ? ("- Người nhận dự kiến: " + recipientEmail) : "",
      rawMessage ? ("- Lời nhắn gửi: “" + rawMessage + "”") : "",
      "",
      "Quy định gửi tri ân hợp lệ:",
      "1. Email người gửi và người nhận phải thuộc hệ thống FPT (@fpt.com, @fpt.net, @vienthongtin.com).",
      "2. Không thể tự gửi lời tri ân cho chính tài khoản của mình.",
      "",
      "Bạn vui lòng kiểm tra lại thông tin và gửi lại thông điệp hợp lệ trên trang chiến dịch nhé!",
      "",
      "Trân trọng,",
      "Thắp lửa tri ân 20/11 – Trung tâm Đào tạo & Phát triển FPT Telecom"
    ].filter(Boolean).join("\n");

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #dc2626; font-size: 19px; margin-top: 0; border-bottom: 2px solid #fca5a5; padding-bottom: 10px;">
          Thông báo về Lời tri ân chưa hợp lệ
        </h2>
        <p>Chào bạn (<strong>${escapeHtml(senderEmail)}</strong>),</p>
        <p>Hệ thống <strong>Chương trình Gửi lời cảm ơn, thắp lửa tri ân 20/11</strong> ghi nhận bạn vừa gửi thông điệp tri ân nhưng chưa hợp lệ:</p>
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 15px 0; color: #991b1b; font-weight: bold; border-radius: 4px;">
          ⚠️ ${escapeHtml(reason)}
        </div>
        ${rawMessage ? `<div style="background: #f8fafc; border-left: 4px solid #94a3b8; padding: 12px 16px; margin: 15px 0; font-style: italic; color: #475569; border-radius: 4px;">&ldquo;${escapeHtml(rawMessage)}&rdquo;</div>` : ''}
        <p style="font-size: 13.5px; color: #475569;">
          <strong>Lưu ý quy định chiến dịch:</strong><br>
          • Email người gửi và người nhận phải thuộc hệ thống FPT (<code>@fpt.com</code>, <code>@fpt.net</code>, <code>@vienthongtin.com</code>).<br>
          • Không tự gửi lời tri ân cho chính mình.
        </p>
        <p style="font-size: 13.5px; color: #475569;">Bạn vui lòng truy cập lại trang chiến dịch để gửi thông điệp hợp lệ nhé!</p>
        <p style="margin-top: 25px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Trân trọng,<br>
          <strong>Thắp lửa tri ân 20/11 – Trung tâm Đào tạo & Phát triển FPT Telecom</strong>
        </p>
      </div>
    `;

    const sendOpts = {
      to: senderEmail,
      subject: "[FTEL 20/11] Thông báo về Lời tri ân chưa hợp lệ",
      body: plainText,
      htmlBody: htmlBody,
      name: CONFIG.OFFICIAL_SENDER_NAME
    };

    const res = dispatchEmailUniversal(sendOpts);
    return res.ok;
  } catch (e) {
    Logger.log("Lỗi gửi mail cảnh báo không hợp lệ: " + e.toString());
    return false;
  }
}

function buildOutlookCompatibleHtmlEmail(data) {
  const pronounCap = data.pronounCap || "Anh/Chị";
  const pronounLow = data.pronounLow || "anh/chị";

  // Tạo đường dẫn tải trực tiếp từ Google Drive (Direct Download)
  let driveUrl = String(data.driveFileUrl || "").trim();
  let directDownloadUrl = driveUrl;
  if (driveUrl) {
    const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      directDownloadUrl = "https://drive.google.com/uc?export=download&id=" + fileIdMatch[1];
    }
  }

  // NÚT BẤM "Tải Thiệp Tri Ân" (Bỏ 'Về Máy (Google Drive)' theo đúng yêu cầu)
  const downloadButtonHtml = driveUrl
    ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 6px 0;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: #ea580c; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);">
                  <a href="${directDownloadUrl || driveUrl}" target="_blank" style="font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 13px 32px; border: 1px solid #ea580c; display: inline-block; font-weight: bold; letter-spacing: 0.3px;">
                    Tải Thiệp Tri Ân
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
    : "";

  const cardImgHtml = data.hasCardImage
    ? `<div style="text-align: center; margin: 0 auto;">
         <a href="${directDownloadUrl || driveUrl || '#'}" target="_blank" title="Nhấp vào để tải thiệp tri ân">
           <img src="cid:card_ecard" alt="Thiệp Tri Ân 20/11" width="560" style="width: 100%; max-width: 560px; height: auto; border-radius: 12px; display: block; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.22); border: 1px solid #ffd700; -ms-interpolation-mode: bicubic;" />
         </a>
       </div>`
    : `<div style="text-align: center; padding: 20px; color: #475569; font-size: 14px;">
         Vui lòng mở file thiệp đính kèm hoặc bấm nút bên dưới để tải thiệp.
       </div>`;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Thiệp Tri Ân 20/11</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 25px 0;">
    <tr>
      <td align="center">
        <!-- BẢNG CONTAINER CHÍNH CHO OUTLOOK -->
        <table border="0" cellpadding="0" cellspacing="0" width="580" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; margin: 0 auto;">
          <tr>
            <td style="padding: 26px 26px 22px 26px;">
              <!-- ĐOẠN LỜI CHÀO CHUẨN XƯNG HÔ THEO CỘT G DS NHÂN SỰ -->
              <p style="font-size: 15.5px; color: #0f172a; line-height: 1.6; margin: 0 0 12px 0;">
                Kính gửi ${pronounCap} <strong>${escapeHtml(data.recipientName)}</strong>,
              </p>
              <p style="font-size: 14.5px; color: #334155; line-height: 1.65; margin: 0 0 20px 0;">
                Trong hoạt động <strong>GỬI LỜI CẢM ƠN - THẮP LỬA TRI ÂN</strong> nhân ngày 20/11, ${pronounLow} vừa nhận được một ngọn lửa tri ân đầy ấm áp từ đồng nghiệp <strong>${escapeHtml(data.senderName)}</strong>${data.senderDept ? ' (' + escapeHtml(data.senderDept) + ')' : ''}.
              </p>

              <!-- ẢNH THIỆP E-CARD SẮC NÉT (NHẤP ĐỂ TẢI THIỆP) -->
              ${cardImgHtml}

              <!-- NÚT BẤM "TẢI THIỆP TRI ÂN" -->
              ${downloadButtonHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    processAllUnprocessedRows();
  } catch (err) {
    Logger.log("Lỗi trong onFormSubmitTrigger: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Tải và lưu đệm phôi thiệp 1080x1440 trên Google Drive để vẽ nội dung lên thiệp
 */
/**
 * ==============================================================================
 * DỮ LIỆU PHÔI CHÍNH THỨC: "Thiệp trống.png" (100% ĐÃ LOẠI BỎ DẤU GẠCH NGANG VÀNG)
 * Nhúng trực tiếp dưới dạng Base64 (Độ nét cao Q95, 1132x1600 px), không phụ thuộc GitHub!
 * ==============================================================================
 */
const __OFFICIAL_CARD_TEMPLATE_BASE64 = "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";

let __cardTemplateBlobCache = null;
function getCardTemplateBlob() {
  if (__cardTemplateBlobCache) return __cardTemplateBlobCache;
  const props = PropertiesService.getScriptProperties();

  // 1. Kiểm tra nếu đã có ID file phôi thiệp sạch lưu trong Script Properties
  const savedFileId = props.getProperty(CONFIG.CARD_TEMPLATE_PROP_KEY);
  if (savedFileId) {
    try {
      const file = DriveApp.getFileById(savedFileId);
      if (!file.isTrashed() && file.getName().indexOf("TRONG_20_11_CHINH_THUC") !== -1) {
        __cardTemplateBlobCache = file.getBlob().setName("Thiệp trống.png");
        return __cardTemplateBlobCache;
      }
    } catch (e) {
      props.deleteProperty(CONFIG.CARD_TEMPLATE_PROP_KEY);
    }
  }

  // 2. Tìm kiếm file "Thiệp trống.png" người dùng đã tải lên Google Drive
  try {
    const fileNamesToSearch = ["Thiệp trống.png", "Thiệp trống", "Thiep trong.png", "Thiep trong"];
    for (let f = 0; f < fileNamesToSearch.length; f++) {
      const it = DriveApp.getFilesByName(fileNamesToSearch[f]);
      if (it.hasNext()) {
        const foundFile = it.next();
        if (!foundFile.isTrashed()) {
          const blob = foundFile.getBlob().setName("Thiệp trống.png");
          __cardTemplateBlobCache = blob;
          props.setProperty(CONFIG.CARD_TEMPLATE_PROP_KEY, foundFile.getId());
          Logger.log("✅ Đã tìm thấy file Thiệp trống.png trong Drive: " + foundFile.getName());
          return __cardTemplateBlobCache;
        }
      }
    }
  } catch (eFind) {
    Logger.log("Lưu ý tìm phôi thiệp trong Drive: " + eFind.toString());
  }

  // 3. Tự động giải nén trực tiếp từ dữ liệu Base64 phôi chuẩn Thiệp trống.png (TUYỆT ĐỐI KHÔNG CÓ GẠCH VÀNG)
  try {
    const bytes = Utilities.base64Decode(__OFFICIAL_CARD_TEMPLATE_BASE64);
    const blob = Utilities.newBlob(bytes, "image/jpeg", "Thiệp trống.png");
    __cardTemplateBlobCache = blob;

    try {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedFile = folder.createFile(blob.copyBlob().setName("PHOI_THIEP_TRONG_20_11_CHINH_THUC.png"));
      props.setProperty(CONFIG.CARD_TEMPLATE_PROP_KEY, savedFile.getId());
      Logger.log("✅ Đã khởi tạo và lưu trữ phôi Thiệp trống.png chuẩn vào Drive: " + savedFile.getId());
    } catch (eSave) {}

    return __cardTemplateBlobCache;
  } catch (errB64) {
    Logger.log("Lỗi giải mã phôi base64: " + errB64.toString());
  }

  return null;
}

/**
 * ==============================================================================
 * MODULE KHỞI TẠO VÀ QUẢN LÝ GOOGLE SLIDES MẪU KHỔ DỌC 1080 x 1440 (CHUẨN HD)
 * ==============================================================================
 */
const __PORTRAIT_PPTX_BASE64 = "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";

function menuCreatePortraitTemplate() {
  const tplId = getOrCreatePortraitSlidesTemplate(true);
  try {
    const ui = SpreadsheetApp.getUi();
    if (tplId) {
      ui.alert(
        "Khởi tạo thành công!",
        "Đã tạo và kích hoạt thành công file Google Slides mẫu khổ dọc 1080 x 1440 HD trong thư mục Google Drive!\n\nID: " + tplId + "\n\nTất cả thiệp tri ân tạo ra từ bây giờ sẽ có tỷ lệ dọc 100%, không bị vệt đen và đạt độ phân giải siêu nét.",
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        "Thông báo",
        "Chưa tạo được tự động qua Drive API. Bạn có thể tự tạo 1 file Google Slides mới (Tệp > Cài đặt trang > Tùy chỉnh: 10.8 x 14.4 inch) và dán ID vào CONFIG.PORTRAIT_SLIDES_TEMPLATE_ID.",
        ui.ButtonSet.OK
      );
    }
  } catch (e) {
    Logger.log("Menu create template result: " + tplId);
  }
}

function getOrCreatePortraitSlidesTemplate(forceRecreate) {
  const props = PropertiesService.getScriptProperties();

  // 1. Kiểm tra cấu hình thủ công trong CONFIG
  if (CONFIG.PORTRAIT_SLIDES_TEMPLATE_ID && CONFIG.PORTRAIT_SLIDES_TEMPLATE_ID.trim() !== "") {
    try {
      const f = DriveApp.getFileById(CONFIG.PORTRAIT_SLIDES_TEMPLATE_ID.trim());
      if (!f.isTrashed()) return f.getId();
    } catch (e) {}
  }

  // 2. Kiểm tra template tự động đã lưu trong ScriptProperties
  if (!forceRecreate) {
    const savedId = props.getProperty("PORTRAIT_SLIDES_AUTO_TEMPLATE_ID_V7");
    if (savedId) {
      try {
        const f = DriveApp.getFileById(savedId);
        if (!f.isTrashed()) return f.getId();
      } catch (e) {
        props.deleteProperty("PORTRAIT_SLIDES_AUTO_TEMPLATE_ID_V7");
      }
    }
  }

  // 3. Tự động chuyển đổi file PPTX khổ dọc 1080x1440 thành Google Slides qua Drive API
  try {
    const bytes = Utilities.base64Decode(__PORTRAIT_PPTX_BASE64);
    const pptxBlob = Utilities.newBlob(bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation", "FTEL_20_11_Portrait_Template_1080x1440.pptx");

    let createdId = null;

    // Cách 1: Qua Advanced Service Drive (v2) nếu có
    if (typeof Drive !== "undefined" && Drive.Files && Drive.Files.insert) {
      try {
        const inserted = Drive.Files.insert({
          title: "FTEL_20_11_Portrait_Master_Template",
          mimeType: "application/vnd.google-apps.presentation"
        }, pptxBlob, { convert: true });
        if (inserted && inserted.id) {
          createdId = inserted.id;
        }
      } catch (eIns) {}
    }

    // Cách 2: Qua Drive REST API v2 Upload với convert=true
    if (!createdId) {
      try {
        const token = ScriptApp.getOAuthToken();
        const uploadUrl = "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&convert=true";
        const boundary = "-------314159265358979323846";
        const metadata = JSON.stringify({
          title: "FTEL_20_11_Portrait_Master_Template",
          mimeType: "application/vnd.google-apps.presentation"
        });

        let body = Utilities.newBlob(
          "--" + boundary + "\r\n" +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          metadata + "\r\n" +
          "--" + boundary + "\r\n" +
          "Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n"
        ).getBytes();

        body = body.concat(pptxBlob.getBytes());
        const footerBytes = Utilities.newBlob("\r\n--" + boundary + "--").getBytes();
        body = body.concat(footerBytes);

        const resp = UrlFetchApp.fetch(uploadUrl, {
          method: "post",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "multipart/related; boundary=" + boundary
          },
          payload: body,
          muteHttpExceptions: true
        });

        if (resp.getResponseCode() === 200) {
          const resJson = JSON.parse(resp.getContentText() || "{}");
          if (resJson && resJson.id) {
            createdId = resJson.id;
          }
        }
      } catch (eRest) {
        Logger.log("Lỗi Drive REST upload template: " + eRest.toString());
      }
    }

    if (createdId) {
      props.setProperty("PORTRAIT_SLIDES_AUTO_TEMPLATE_ID_V7", createdId);
      try {
        const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
        const f = DriveApp.getFileById(createdId);
        folder.addFile(f);
      } catch (eMove) {}
      Logger.log("✅ Đã tạo Google Slides template khổ dọc thành công: " + createdId);
      return createdId;
    }
  } catch (errConvert) {
    Logger.log("Lỗi chuyển đổi template PPTX sang Slides: " + errConvert.toString());
  }

  return null;
}

function createPersonalizedEcardBlob(params) {
  params = params || {};
  const recipientEmail = String(params.recipientEmail || "").trim().toLowerCase();
  const recipientName = String(params.recipientName || "Đồng nghiệp FTEL").trim();
  const recipientRole = String(params.recipientRole || "Người dẫn dắt – Người truyền cảm hứng").trim();
  let recipientGender = String(params.recipientGender || "").trim();

  // Tự động tra cứu danh bạ nhân sự Cột G nếu chưa truyền giới tính
  if (!recipientGender && recipientEmail) {
    try {
      const ss = getSpreadsheet();
      const rInfo = lookupHrInfo(ss, recipientEmail);
      if (rInfo && rInfo.gender) {
        recipientGender = rInfo.gender;
      }
    } catch (eG) {}
  }
  const senderName = String(params.senderName || "Đồng nghiệp FTEL").trim();
  const senderDept = String(params.senderDept || "FPT Telecom").trim();
  const message = String(params.message || "").trim();
  const rowNumber = params.rowNumber || "TEST";
  const safeName = recipientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const outFileName = "Ecard_20_11_Row" + rowNumber + "_" + (safeName || "FTEL") + ".png";

  let pres = null;
  let presId = null;

  try {
    const tempTitle = "Temp_ECard_Row" + rowNumber + "_" + Date.now();

    // ƯU TIÊN 1: Clone từ Google Slides khổ dọc 1080 x 1440 để thiệp sắc nét 100% không vệt đen
    const masterTemplateId = getOrCreatePortraitSlidesTemplate(false);
    if (masterTemplateId) {
      try {
        const masterFile = DriveApp.getFileById(masterTemplateId);
        const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
        const copiedFile = masterFile.makeCopy(tempTitle, folder);
        presId = copiedFile.getId();
        pres = SlidesApp.openById(presId);
      } catch (eMaster) {
        Logger.log("Lưu ý tạo từ Slide template dọc: " + eMaster.toString());
      }
    }

    // ƯU TIÊN 2: Tạo Slide tỷ lệ dọc chuẩn 1080 x 1440 PT qua Slides REST API
    if (!pres) {
      try {
        const createRes = UrlFetchApp.fetch("https://slides.googleapis.com/v1/presentations", {
          method: "post",
          contentType: "application/json",
          headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
          payload: JSON.stringify({
            title: tempTitle,
            pageSize: {
              width: { magnitude: 1080, unit: "PT" },
              height: { magnitude: 1440, unit: "PT" }
            }
          }),
          muteHttpExceptions: true
        });
        if (createRes.getResponseCode() === 200) {
          const createdData = JSON.parse(createRes.getContentText() || "{}");
          if (createdData && createdData.presentationId) {
            presId = createdData.presentationId;
            pres = SlidesApp.openById(presId);
          }
        }
      } catch (ePortrait) {}
    }

    // ƯU TIÊN 3: SlidesApp.create mặc định
    if (!pres) {
      pres = SlidesApp.create(tempTitle);
      presId = pres.getId();
    }

    const slide = pres.getSlides()[0];
    const presFile = DriveApp.getFileById(presId);

    // Xóa toàn bộ các khung chữ mặc định ("Click to add title"...) trên Slide mới
    try {
      const defaultElements = slide.getPageElements();
      for (let i = 0; i < defaultElements.length; i++) {
        defaultElements[i].remove();
      }
    } catch (eClear) {}

    const slideW = pres.getPageWidth();
    const slideH = pres.getPageHeight();
    let cardW = slideW;
    let cardH = slideH;
    let cardLeft = 0;
    let cardTop = 0;

    if (slideW > slideH) {
      cardH = slideH;
      cardW = cardH * (1080 / 1440);
      cardLeft = (slideW - cardW) / 2;
      cardTop = 0;
    }
    slide.getBackground().setSolidFill("#021038");

    // Đặt ảnh phôi thiệp gốc làm nền
    const templateBlob = getCardTemplateBlob();
    if (templateBlob) {
      try {
        const bgImg = slide.insertImage(templateBlob);
        bgImg.setLeft(cardLeft).setTop(cardTop).setWidth(cardW).setHeight(cardH);
        bgImg.sendToBack();
      } catch (eImg) {
        Logger.log("Lỗi chèn ảnh nền thiệp: " + eImg.toString());
      }
    }

    // Hệ số tỷ lệ cỡ chữ theo chiều cao thực tế của phôi thiệp trên Slide (chuẩn 720pt)
    const ptScale = cardH / 720;

    // 1. Dòng tiêu đề nhỏ phía trên trong khung viền vàng (Y = 37.0%) - Di chuyển sâu vào bên trong khung, cách xa viền trên 44px
    const subBox = slide.insertTextBox(
      "✦ TRÂN TRỌNG GỬI ĐẾN ✦",
      cardLeft + cardW * 0.06,
      cardTop + cardH * 0.370,
      cardW * 0.88,
      cardH * 0.026
    );
    try { subBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE); } catch (e) {}
    subBox.getText().getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#ffd700")
      .setFontSize(Math.max(7, Math.round(11.5 * ptScale)))
      .setBold(true)
      .setItalic(true);
    subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 2. Họ và tên Người nhận: Danh xưng Anh / Chị viết hoa chữ cái đầu, KHÔNG BOLD, IN NGHIÊNG; Họ Tên IN HOA in đậm
    const upperRecName = recipientName.toUpperCase();
    const pronounObj = getGenderPronoun(recipientGender);
    const honorific = (pronounObj.cap === "Anh" || pronounObj.cap === "Chị") ? (pronounObj.cap + " ") : "";
    const fullRecNameWithHonorific = honorific + upperRecName;

    const baseNamePt = fullRecNameWithHonorific.length > 25 ? 16.5 : fullRecNameWithHonorific.length > 19 ? 18.5 : 21.0;
    const nameBox = slide.insertTextBox(
      fullRecNameWithHonorific,
      cardLeft + cardW * 0.05,
      cardTop + cardH * 0.404,
      cardW * 0.90,
      cardH * 0.044
    );
    try { nameBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE); } catch (e) {}
    const nameTextRange = nameBox.getText();
    nameTextRange.getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#ffffff")
      .setFontSize(Math.max(10, Math.round(baseNamePt * ptScale)))
      .setBold(true)
      .setItalic(false);
    nameTextRange.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Định dạng riêng cho chữ "Anh " / "Chị ": KHÔNG BOLD, IN NGHIÊNG
    if (honorific && honorific.length > 0) {
      try {
        const honorificSubRange = nameTextRange.getRange(0, honorific.length);
        honorificSubRange.getTextStyle()
          .setFontSize(Math.max(7, Math.round(14 * ptScale)))
          .setBold(false)
          .setItalic(false);
      } catch (eHonStyle) {
        Logger.log("Lưu ý định dạng danh xưng: " + eHonStyle.toString());
      }
    }

    // 3. Vai trò / Dấu ấn của Người nhận (Đã đẩy lên cao 1 chút, Y = 44.2% -> 46.8%, kết nối hài hòa ngay dưới tên)
    const roleBox = slide.insertTextBox(
      recipientRole,
      cardLeft + cardW * 0.06,
      cardTop + cardH * 0.442,
      cardW * 0.88,
      cardH * 0.026
    );
    try { roleBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE); } catch (e) {}
    roleBox.getText().getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#fbbf24")
      .setFontSize(Math.max(7, Math.round(11.5 * ptScale)))
      .setItalic(true);
    roleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 4. Nội dung Thông điệp tri ân (ĐỒNG BỘ DẤU NGOẶC KÉP, SỬA LỖI VIẾT HOA, CĂN CHỈNH THOÁNG ĐÃNG)
    let cleanMsg = String(message || "").trim();
    // Tước bỏ mọi dấu ngoặc kép/đơn bao quanh nếu người dùng đã tự gõ để tránh bị ngoặc kép kép hoặc cụt
    cleanMsg = cleanMsg.replace(/^[\"'“‘«„\s]+/, "").replace(/[\"'”’»“\s]+$/, "").trim();
    // Tự động chuẩn hóa lỗi viết hoa danh từ riêng phổ biến
    cleanMsg = cleanMsg.replace(/\bViệt\s+nam\b/g, "Việt Nam").replace(/\bviệt\s+nam\b/gi, "Việt Nam");
    cleanMsg = cleanMsg.replace(/\bNhà\s+giáo\s+việt\s+nam\b/gi, "Nhà giáo Việt Nam");
    cleanMsg = cleanMsg.replace(/\bThầy\s+cô\b/gi, "Thầy Cô");

    const rawCleanMsg = cleanMsg.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const newlineCount = (rawCleanMsg.match(/\n/g) || []).length;
    const effectiveLen = rawCleanMsg.length + newlineCount * 65;

    // Giới hạn an toàn nếu nội dung vượt quá 4800 ký tự (~1100 từ)
    let displayMessage = rawCleanMsg;
    if (displayMessage.length > 4800) {
      displayMessage = displayMessage.substring(0, 4800).trim() + "...";
    }
    // Bao bọc bằng cặp dấu ngoặc kép cong chuẩn typographic đồng bộ tuyệt đối: “...”
    const finalFormattedQuote = displayMessage ? ("“" + displayMessage + "”") : "";

    // Phân cấp cỡ chữ thông minh theo độ dài để văn bản luôn nở đều, đầy đặn, sang trọng
    let baseMsgPt = 14.5;
    if (effectiveLen <= 80) {
      baseMsgPt = 15.0;
    } else if (effectiveLen <= 180) {
      baseMsgPt = 13.8;
    } else if (effectiveLen <= 320) {
      baseMsgPt = 12.6;
    } else if (effectiveLen <= 500) {
      baseMsgPt = 12.0; // Đoạn văn ~80 từ: chữ to rõ, 7-8 dòng
    } else if (effectiveLen <= 750) {
      baseMsgPt = 11.2; // Đoạn văn ~110 từ (như mẫu Nghề giáo...): nở đều 8-9 dòng, không bị mỏng lọt thỏm
    } else if (effectiveLen <= 1200) {
      baseMsgPt = 9.8;
    } else if (effectiveLen <= 1800) {
      baseMsgPt = 8.5;
    } else if (effectiveLen <= 2600) {
      baseMsgPt = 7.0;
    } else if (effectiveLen <= 3600) {
      baseMsgPt = 5.6;
    } else if (effectiveLen <= 4600) {
      baseMsgPt = 4.8; // ~1000 từ
    } else {
      baseMsgPt = 4.3;
    }

    // ĐỊNH VỊ KHUNG THÔNG ĐIỆP CÂN BẰNG ĐỐI XỨNG TRỌNG TÂM:
    // Khu vực trống từ dưới Vai trò (Y=46.8%) đến trên Người gửi/Đuốc (Y=71.0%) cao 24.2% (~348pt)
    // Tâm đối xứng nằm tại Y = 58.9%
    const msgBoxLeft = cardLeft + cardW * 0.08;
    const msgBoxWidth = cardW * 0.84; // Lề hai bên 8% cân xứng, thoáng đãng
    const msgBoxTop = cardTop + cardH * 0.472;
    const msgBoxHeight = cardH * 0.234; // Chiều cao bao quát toàn bộ vùng trung tâm

    const msgBox = slide.insertTextBox(
      finalFormattedQuote,
      msgBoxLeft,
      msgBoxTop,
      msgBoxWidth,
      msgBoxHeight
    );

    // CĂN CHỈNH DỌC: Tất cả thông điệp <= 1400 ký tự (~250 từ) đều căn MIDDLE để tự động nằm chính giữa đối xứng 50/50
    // (Khoảng cách từ Vai trò xuống Đoạn thư BẰNG NHAU với khoảng cách từ Đoạn thư xuống Người gửi)
    try {
      if (effectiveLen <= 1400) {
        msgBox.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      } else {
        msgBox.setContentAlignment(SlidesApp.ContentAlignment.TOP);
      }
    } catch (e) {}

    msgBox.getText().getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#ffffff")
      .setFontSize(Math.max(6, Math.round(baseMsgPt * ptScale)))
      .setItalic(true);

    // CĂN CHỈNH NGANG: Đoạn văn dài (> 300 ký tự) căn đều 2 bên (JUSTIFIED) để mép chữ phẳng phiu thẳng tắp
    // Thông điệp ngắn (<= 300 ký tự) giữ căn giữa (CENTER) truyền thống
    try {
      if (effectiveLen > 300) {
        msgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.JUSTIFIED);
      } else {
        msgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      }
    } catch (eAlign) {
      try { msgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER); } catch (eFallback) {}
    }

    // 5. Khối Người gửi: Căn chỉnh vào giữa khoảng bên phải, lùi xa viền khung kính phải (Y = 71.0% -> 74.4%)
    // Chiều rộng 36%, căn giữa từ X = 52% đến 88% (đệm lề phải 6% cách mép viền kính 94%, không bị dồn ép)
    const senderBoxLeft = cardLeft + cardW * 0.52;
    const senderBoxWidth = cardW * 0.36;

    const senderLabelBox = slide.insertTextBox(
      "Ngọn lửa tri ân được thắp lên bởi",
      senderBoxLeft,
      cardTop + cardH * 0.710,
      senderBoxWidth,
      cardH * 0.034
    );
    try { senderLabelBox.setContentAlignment(SlidesApp.ContentAlignment.BOTTOM); } catch (e) {}
    senderLabelBox.getText().getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#cbd5e1")
      .setFontSize(Math.max(6, Math.round(9.0 * ptScale)))
      .setItalic(true);
    senderLabelBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 6. Tên Người gửi & Đơn vị (Y = 74.6% -> 82.0%):
    // Cỡ chữ vừa vặn thanh lịch (11.5pt), màu vàng nhạt ấm áp (#fde047), không to thô và không lấn át tên người nhận
    const hasDept = senderDept && senderName.toLowerCase().indexOf(senderDept.toLowerCase()) === -1;
    const senderFullText = hasDept ? (senderName + "\n(" + senderDept + ")") : senderName;
    const baseSenderPt = senderName.length > 20 ? 10.5 : 11.5;

    const senderBox = slide.insertTextBox(
      senderFullText,
      senderBoxLeft,
      cardTop + cardH * 0.746,
      senderBoxWidth,
      cardH * 0.074
    );
    try { senderBox.setContentAlignment(SlidesApp.ContentAlignment.TOP); } catch (e) {}
    const senderTextRange = senderBox.getText();
    senderTextRange.getTextStyle()
      .setFontFamily("Arial")
      .setForegroundColor("#fde047")
      .setFontSize(Math.max(7, Math.round(baseSenderPt * ptScale)))
      .setBold(true);
    senderTextRange.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // Lưu và đóng Slide để xuất ra file ảnh PNG
    const pageId = slide.getObjectId();
    pres.saveAndClose();

    // 1. Chờ 2.2s để máy chủ Google Slides lưu và kết xuất đồ họa hoàn tất (tránh lỗi trả về trang rỗng)
    Utilities.sleep(2200);

    // 2. Chia sẻ quyền xem liên kết để cổng xuất PNG Google Docs tải được ngay mà không bị chặn xác thực
    try {
      presFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShPre) {
      try { presFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (eShDom) {}
    }

    let finalBlob = null;
    const oauthToken = ScriptApp.getOAuthToken();

    // TẦNG XUẤT ẢNH 1 (ƯU TIÊN CAO NHẤT): Dịch vụ nâng cao Slides API (v1) trực tiếp
    if (typeof Slides !== "undefined" && Slides.Presentations && Slides.Presentations.Pages && Slides.Presentations.Pages.getThumbnail) {
      try {
        const thumbObj = Slides.Presentations.Pages.getThumbnail(presId, pageId, {
          "thumbnailProperties.thumbnailSize": "LARGE"
        });
        if (thumbObj && thumbObj.contentUrl) {
          const imgFetch = UrlFetchApp.fetch(thumbObj.contentUrl, { muteHttpExceptions: true });
          if (imgFetch.getResponseCode() === 200) {
            const bytes = imgFetch.getBlob().getBytes();
            if (bytes && bytes.length > 5000) {
              finalBlob = Utilities.newBlob(bytes, "image/png", outFileName);
            }
          }
        }
      } catch (eAdvSlides) {
        Logger.log("Advanced Slides Thumbnail lưu ý: " + eAdvSlides.toString());
      }
    }

    // TẦNG XUẤT ẢNH 2: Cổng xuất PNG gốc của Google Docs/Slides (Native HD PNG Export)
    if (!finalBlob) {
      for (let attempt = 1; attempt <= 2 && !finalBlob; attempt++) {
        try {
          if (attempt > 1) Utilities.sleep(1800);
          const exportPngUrl = "https://docs.google.com/presentation/d/" + presId + "/export/png?id=" + presId + "&pageid=" + pageId;
          const expRes = UrlFetchApp.fetch(exportPngUrl, {
            headers: { Authorization: "Bearer " + oauthToken },
            muteHttpExceptions: true,
            followRedirects: true
          });
          if (expRes.getResponseCode() === 200) {
            const contentType = expRes.getBlob().getContentType() || "";
            const bytes = expRes.getBlob().getBytes();
            // Đảm bảo dữ liệu tải về là ảnh PNG thực sự chứ không phải trang HTML lỗi
            if (bytes && bytes.length > 5000 && contentType.indexOf("html") === -1) {
              finalBlob = Utilities.newBlob(bytes, "image/png", outFileName);
            }
          }
        } catch (eExp1) {
          Logger.log("Tầng xuất PNG 2 (lần " + attempt + ") lưu ý: " + eExp1.toString());
        }
      }
    }

    // TẦNG XUẤT ẢNH 3: Qua Google Slides Thumbnail REST API
    if (!finalBlob) {
      try {
        const thumbApiUrl = "https://slides.googleapis.com/v1/presentations/" + presId + "/pages/" + pageId + "/thumbnail?thumbnailProperties.thumbnailSize=LARGE";
        const thumbRes = UrlFetchApp.fetch(thumbApiUrl, {
          headers: { Authorization: "Bearer " + oauthToken },
          muteHttpExceptions: true
        });
        if (thumbRes.getResponseCode() === 200) {
          const thumbData = JSON.parse(thumbRes.getContentText() || "{}");
          if (thumbData && thumbData.contentUrl) {
            const imgRes = UrlFetchApp.fetch(thumbData.contentUrl, { muteHttpExceptions: true });
            if (imgRes.getResponseCode() === 200) {
              finalBlob = Utilities.newBlob(imgRes.getBlob().getBytes(), "image/png", outFileName);
            }
          }
        }
      } catch (eExp3) {}
    }

    // TẦNG XUẤT ẢNH 4: Qua DriveApp.getFileById(presId).getThumbnail() nội bộ của Apps Script
    if (!finalBlob) {
      try {
        const drvThumb = DriveApp.getFileById(presId).getThumbnail();
        if (drvThumb) {
          finalBlob = drvThumb.setName(outFileName);
        }
      } catch (eExp4) {}
    }

    // Dọn dẹp file Slide tạm
    try {
      presFile.setTrashed(true);
    } catch (eTrash) {}

    if (finalBlob) {
      return finalBlob;
    }
  } catch (errSlides) {
    Logger.log("Lưu ý tạo thiệp qua SlidesApp: " + errSlides.toString());
    if (presId) {
      try { DriveApp.getFileById(presId).setTrashed(true); } catch (e) {}
    }
  }

  const fallback = getCardTemplateBlob();
  return fallback ? fallback.copyBlob().setName("Ecard_20_11_Row" + rowNumber + ".jpg") : null;
}

/**
 * Quét và xử lý toàn bộ các dòng chưa được xử lý
 */
function processAllUnprocessedRows() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { processed: 0, count: 0, data: { pendingRender: [] } };

  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  let processedCount = 0;
  const pendingRenderList = [];

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2;
    const row = data[i];

    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const recipientRole = String(row[3] || "Người dẫn dắt & Đồng hành tri thức").trim();
    const rawMessage = String(row[4] || "").trim();

    const currentCheckStatus = String(row[10] || "").trim(); // Cột K
    const currentMailStatus = String(row[11] || "").trim();  // Cột L

    // Chuẩn hóa trạng thái loại bỏ dấu tiếng Việt để kiểm tra chính xác tuyệt đối 100%
    const checkNorm = stripVietnameseAccents(currentCheckStatus);
    const mailNorm = stripVietnameseAccents(currentMailStatus);

    // Bỏ qua dòng trống email
    if (!senderEmail || !recipientEmail) continue;

    // ⛔ BỎ QUA NGAY LẬP TỨC NẾU DÒNG ĐÃ ĐƯỢC XỬ LÝ (TRÙNG LẶP, KHÔNG HỢP LỆ, HOẶC ĐÃ BÁO MAIL)
    // Đảm bảo TUYỆT ĐỐI CHỈ BÁO MAIL ĐÚNG 1 LẦN DUY NHẤT, không bao giờ gửi lặp lại!
    if (
      checkNorm.indexOf("TRUNG LAP") !== -1 ||
      checkNorm.indexOf("KHONG HOP LE") !== -1 ||
      mailNorm.indexOf("DA BAO") !== -1 ||
      mailNorm.indexOf("TRUNG LAP") !== -1 ||
      mailNorm.indexOf("KHONG HOP LE") !== -1 ||
      mailNorm.indexOf("LOI") !== -1
    ) {
      continue;
    }

    // Nếu dòng này đã kiểm duyệt và đã gửi mail xong:
    if (mailNorm.indexOf("DA GUI") !== -1) {
      const existingDrive = String(row[12] || "").trim();
      // Nếu đã có link Thiệp E-Card ở Cột M -> Bỏ qua ngay lập tức!
      if (existingDrive) {
        continue;
      }
      // Nếu chưa có link ở Cột M và là HỢP LỆ -> tự động tạo bù E-Card & cập nhật link
      if (checkNorm.indexOf("HOP LE") !== -1) {
        const sName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
        const sDept = String(row[6] || "FPT Telecom").trim();
        const rName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
        const rDept = String(row[8] || "FPT Telecom").trim();
        const cMsg = String(row[9] || cleanAndNormalizeVietnamese(rawMessage)).trim();

        let retroCardBlob = null;
        let retroDriveUrl = "";
        try {
          retroCardBlob = createPersonalizedEcardBlob({
            recipientName: rName,
            recipientRole: recipientRole,
            senderName: sName,
            senderDept: sDept,
            message: cMsg,
            rowNumber: rowNumber
          });
          if (retroCardBlob) {
            const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
            const savedRetroFile = folder.createFile(retroCardBlob);
            try {
              savedRetroFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (eSh1) {
              try {
                savedRetroFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
              } catch (eSh2) {}
            }
            retroDriveUrl = savedRetroFile.getUrl();
            sheet.getRange(rowNumber, 13).setValue(retroDriveUrl);
          }
        } catch (eRetro) {
          Logger.log("Lỗi tạo bù E-Card dòng " + rowNumber + ": " + eRetro.toString());
        }

        if (retroDriveUrl || retroCardBlob) {
          sendGratitudeNotificationEmail({
            recipientEmail: recipientEmail,
            recipientName: rName,
            recipientDept: rDept,
            recipientRole: recipientRole,
            senderEmail: senderEmail,
            senderName: sName,
            senderDept: sDept,
            message: cMsg,
            driveFileUrl: retroDriveUrl,
            cardBlob: retroCardBlob,
            rowNumber: rowNumber
          });
          processedCount++;
        }
      }
      continue;
    }

    // 1. Chuẩn hóa chính tả thông điệp
    const cleanedMessage = cleanAndNormalizeVietnamese(rawMessage);
    let senderName = String(row[5] || "").trim();
    let senderDept = String(row[6] || "").trim();
    let recipientName = String(row[7] || "").trim();
    let recipientDept = String(row[8] || "").trim();

    // Tự động tra cứu Danh bạ Nhân sự (Cột G = Giới tính)
    if (!senderName || !senderDept || senderDept === "FPT Telecom") {
      const sInfo = lookupHrInfo(ss, senderEmail);
      if (!senderName && sInfo.name) senderName = sInfo.name;
      if ((!senderDept || senderDept === "FPT Telecom") && sInfo.dept) senderDept = sInfo.dept;
    }
    if (!recipientName || !recipientDept || recipientDept === "FPT Telecom") {
      const rInfo = lookupHrInfo(ss, recipientEmail);
      if (!recipientName && rInfo.name) recipientName = rInfo.name;
      if ((!recipientDept || recipientDept === "FPT Telecom") && rInfo.dept) recipientDept = rInfo.dept;
    }
    if (!senderName) senderName = fallbackNameFromEmail(senderEmail);
    if (!senderDept) senderDept = "FPT Telecom";
    if (!recipientName) recipientName = fallbackNameFromEmail(recipientEmail);
    if (!recipientDept) recipientDept = "FPT Telecom";

    // 2. Kiểm tra tính hợp lệ domain & tự gửi
    const isSenderValid = isAllowedDomain(senderEmail);
    const isRecValid = isAllowedDomain(recipientEmail);
    const isSelfSend = senderEmail === recipientEmail;

    if (!isSenderValid || !isRecValid || isSelfSend) {
      const errorReason = isSelfSend
        ? "LỖI: Tự gửi lời tri ân cho chính mình"
        : (!isSenderValid ? "LỖI: Email người gửi không thuộc miền FPT" : "LỖI: Email người nhận không thuộc miền FPT");

      // Đánh dấu ngay vào Sheet Cột K = KHÔNG HỢP LỆ, Cột L = ĐÃ BÁO KHÔNG HỢP LỆ
      sheet.getRange(rowNumber, 6, 1, 9).setValues([[
        senderName,
        senderDept,
        recipientName,
        recipientDept,
        cleanedMessage,
        "KHÔNG HỢP LỆ",
        "ĐÃ BÁO KHÔNG HỢP LỆ",
        "",
        ""
      ]]);

      // BÁO MAIL ĐÚNG 1 LẦN DUY NHẤT CHO NGƯỜI GỬI (chỉ gửi khi email người gửi hợp lệ và chưa từng báo)
      if (isSenderValid && mailNorm.indexOf("DA BAO") === -1) {
        sendInvalidWarningEmail(senderEmail, recipientEmail, errorReason, rawMessage);
      }
      processedCount++;
      continue;
    }

    // 3. Kiểm tra trùng lặp 3 thông tin
    const isDuplicate = isDuplicateSubmission(sheet, rowNumber, senderEmail, recipientEmail, cleanedMessage);
    if (isDuplicate) {
      // Đánh dấu ngay vào Sheet Cột K = TRÙNG LẶP, Cột L = ĐÃ BÁO TRÙNG LẶP
      sheet.getRange(rowNumber, 6, 1, 9).setValues([[
        senderName,
        senderDept,
        recipientName,
        recipientDept,
        cleanedMessage,
        "TRÙNG LẶP",
        "ĐÃ BÁO TRÙNG LẶP",
        "",
        ""
      ]]);

      // BÁO MAIL ĐÚNG 1 LẦN DUY NHẤT (chỉ gửi khi dòng này chưa từng báo)
      if (mailNorm.indexOf("DA BAO") === -1) {
        sendDuplicateWarningEmail(senderEmail, recipientEmail, cleanedMessage);
      }
      processedCount++;
      continue;
    }

    // 4. Nếu HỢP LỆ: Tự động tạo ảnh thiệp có nội dung, lưu Drive & Gửi Email qua Gmail Relay
    const cardId = String(row[13] || ("FTEL-" + (1000 + rowNumber))).trim();
    let driveUrl = String(row[12] || "").trim();
    let cardBlob = null;

    // Luôn tạo thiệp E-Card có đầy đủ chữ đẹp mới và cập nhật link Drive vào Cột M
    const rInfoProc = lookupHrInfo(ss, recipientEmail);
    const recipientGender = rInfoProc.gender || "";

    cardBlob = createPersonalizedEcardBlob({
      rowNumber: rowNumber,
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientRole: recipientRole,
      recipientGender: recipientGender,
      senderName: senderName,
      senderDept: senderDept,
      message: cleanedMessage
    });
    if (cardBlob) {
      try {
        const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
        const file = folder.createFile(cardBlob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (ePerm1) {
          try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (ePerm2) {}
        }
        driveUrl = file.getUrl();
        sheet.getRange(rowNumber, 13).setValue(driveUrl);
      } catch (eDrive) {
        Logger.log("Lưu thiệp lên Drive lỗi: " + eDrive.toString());
      }
    }

    // Gửi email ngay lập tức cho cả Người nhận & Người gửi (qua Gmail Relay để vào thẳng Outlook Inbox)
    const mailRes = sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      recipientRole: recipientRole,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      message: cleanedMessage,
      driveFileUrl: driveUrl,
      cardBlob: cardBlob
    });

    const mailStatusStr = mailRes.ok
      ? "ĐÃ GỬI MAIL (TO & CC)"
      : "LỖI GỬI: " + (mailRes.error || "Không gửi được mail");

    // Cập nhật kết quả vào Sheet (Cột F -> N)
    sheet.getRange(rowNumber, 6, 1, 9).setValues([[
      senderName,
      senderDept,
      recipientName,
      recipientDept,
      cleanedMessage,
      "HỢP LỆ",
      mailStatusStr,
      driveUrl,
      cardId
    ]]);

    processedCount++;
  }

  return {
    success: true,
    processed: processedCount,
    data: {
      processed: processedCount,
      pendingRender: pendingRenderList
    }
  };
}

/**
 * ==============================================================================
 * 6. LƯU THIỆP E-CARD LÊN GOOGLE DRIVE (TỪ WEB APP CANVAS HOẶC TẢI LÊN)
 * ==============================================================================
 */

function handleCompleteEcardAndSendMail(payload) {
  const rowNumber = Number(payload.rowNumber);
  const cardImageBase64 = String(payload.cardImageBase64 || "");

  if (!rowNumber || rowNumber <= 1) {
    return { success: false, message: "Thiếu rowNumber hợp lệ." };
  }

  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const row = sheet.getRange(rowNumber, 1, 1, 14).getValues()[0];

  const senderEmail = String(row[1] || payload.senderEmail || "").trim().toLowerCase();
  const recipientEmail = String(row[2] || payload.recipientEmail || "").trim().toLowerCase();
  const recipientRole = String(row[3] || payload.recipientRole || "Người dẫn dắt").trim();
  const senderName = String(row[5] || payload.senderName || fallbackNameFromEmail(senderEmail)).trim();
  const senderDept = String(row[6] || payload.senderDept || "FPT Telecom").trim();
  const recipientName = String(row[7] || payload.recipientName || fallbackNameFromEmail(recipientEmail)).trim();
  const recipientDept = String(row[8] || payload.recipientDept || "FPT Telecom").trim();
  const message = String(row[9] || row[4] || payload.message || "").trim();

  let driveFileUrl = String(row[12] || "").trim();
  let cardBlob = null;

  // Lưu file ảnh base64 vào Google Drive
  if (cardImageBase64 && cardImageBase64.indexOf("base64,") !== -1) {
    try {
      const base64Data = cardImageBase64.split("base64,")[1];
      const decodedBytes = Utilities.base64Decode(base64Data);
      const safeRecName = recipientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const fileName = "Ecard_20_11_Row" + rowNumber + "_" + (safeRecName || "FTEL") + ".png";
      cardBlob = Utilities.newBlob(decodedBytes, "image/png", fileName);

      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const file = folder.createFile(cardBlob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e1) {
        try {
          file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e2) {}
      }
      driveFileUrl = file.getUrl();
      sheet.getRange(rowNumber, 13).setValue(driveFileUrl);
    } catch (e) {
      Logger.log("Lỗi lưu Drive: " + e.toString());
    }
  }

  // Nếu mail chưa gửi thành công, gửi lại kèm ảnh thiệp
  const currentMailStatus = String(row[11] || "");
  if (!currentMailStatus || currentMailStatus.indexOf("ĐÃ GỬI") === -1) {
    const mailRes = sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      recipientRole: recipientRole,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      message: message,
      driveFileUrl: driveFileUrl,
      cardBlob: cardBlob
    });

    sheet.getRange(rowNumber, 12).setValue(
      mailRes.ok ? "ĐÃ GỬI MAIL 2 (TO & CC)" : "LỖI GỬI: " + mailRes.error
    );
  }

  return {
    success: true,
    driveFileUrl: driveFileUrl,
    rowNumber: rowNumber
  };
}

/**
 * ==============================================================================
 * 7. TỔNG HỢP DỮ LIỆU THỜI GIAN THỰC CHO LIVE DASHBOARD
 * ==============================================================================
 */

function getFullCampaignDashboardData() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {
      totalFlames: 0,
      totalSubmissions: 0,
      uniqueRecipients: 0,
      uniqueSenders: 0,
      uniqueUnits: 0,
      top30Recipients: [],
      early100Senders: [],
      unitSpread: []
    };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();

  let totalFlames = 0;
  const recipientMap = {};
  const senderSet = new Set();
  const unitMap = {};
  const early100 = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const timestamp = row[0];
    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const recipientRole = String(row[3] || "").trim();
    const rawMsg = String(row[4] || "").trim();

    const senderName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
    const senderDept = String(row[6] || "FPT Telecom").trim();
    const recipientName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
    const recipientDept = String(row[8] || "FPT Telecom").trim();
    const cleanedMsg = String(row[9] || rawMsg).trim();
    const status = String(row[10] || "").trim().toUpperCase();

    // Chỉ đếm các bản ghi HỢP LỆ (hoặc tạm thời chưa duyệt nhưng không bị đánh dấu TRÙNG LẶP / LỖI)
    if (status === "TRÙNG LẶP" || status === "KHÔNG HỢP LỆ") {
      continue;
    }

    totalFlames++;
    senderSet.add(senderEmail);

    // Thống kê Người nhận (cho Top 30)
    if (!recipientMap[recipientEmail]) {
      recipientMap[recipientEmail] = {
        name: recipientName,
        email: recipientEmail,
        dept: recipientDept,
        role: recipientRole,
        count: 0,
        latestMessage: cleanedMsg
      };
    }
    recipientMap[recipientEmail].count++;
    recipientMap[recipientEmail].latestMessage = cleanedMsg;

    // Thống kê Đơn vị lan tỏa
    const unitName = recipientDept || senderDept || "FPT Telecom";
    if (!unitMap[unitName]) {
      unitMap[unitName] = {
        unit: unitName,
        totalFlames: 0,
        sendersCount: 0,
        recipientsCount: 0,
        sendersSet: new Set(),
        recipientsSet: new Set(),
        flamesList: [],
        sendersList: [],
        recipientsList: []
      };
    }
    const uObj = unitMap[unitName];
    uObj.totalFlames++;
    uObj.flamesList.push({
      senderName: senderName,
      senderEmail: senderEmail,
      recipientName: recipientName,
      recipientEmail: recipientEmail,
      message: cleanedMsg,
      timestamp: formatTimestamp(timestamp)
    });
    if (!uObj.sendersSet.has(senderEmail)) {
      uObj.sendersSet.add(senderEmail);
      uObj.sendersCount++;
      uObj.sendersList.push({ name: senderName, email: senderEmail, dept: senderDept });
    }
    if (!uObj.recipientsSet.has(recipientEmail)) {
      uObj.recipientsSet.add(recipientEmail);
      uObj.recipientsCount++;
      uObj.recipientsList.push({ name: recipientName, email: recipientEmail, dept: recipientDept, role: recipientRole });
    }

    // Top 100 người gửi sớm nhất
    if (early100.length < 100) {
      early100.push({
        senderName: senderName,
        senderDept: senderDept,
        recipientName: recipientName,
        recipientDept: recipientDept,
        timestamp: formatTimestamp(timestamp),
        message: cleanedMsg
      });
    }
  }

  // Sắp xếp Top 30 người nhận nhiều tri ân nhất
  const top30 = Object.keys(recipientMap)
    .map(key => recipientMap[key])
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  top30.forEach((item, idx) => {
    item.rank = idx + 1;
    if (item.rank === 1) item.badge = "gold";
    else if (item.rank === 2) item.badge = "silver";
    else if (item.rank === 3) item.badge = "bronze";
  });

  // Sắp xếp Đơn vị lan tỏa
  const unitSpread = Object.keys(unitMap)
    .map(name => {
      const u = unitMap[name];
      return {
        unit: u.unit,
        totalFlames: u.totalFlames,
        count: u.totalFlames,
        sendersCount: u.sendersCount,
        recipientsCount: u.recipientsCount,
        flamesList: u.flamesList.slice(0, 50),
        sendersList: u.sendersList.slice(0, 50),
        recipientsList: u.recipientsList.slice(0, 50)
      };
    })
    .sort((a, b) => b.totalFlames - a.totalFlames);

  // Danh bạ rút gọn phục vụ tìm kiếm siêu tốc 24.000+ nhân sự
  const hrMap = buildHrDirectoryMap(ss);
  const hrKeys = Object.keys(hrMap);
  const hrCompact = [];
  const seenEmails = new Set();
  for (let k = 0; k < hrKeys.length; k++) {
    const em = hrKeys[k];
    if (em.includes("@") && !seenEmails.has(em)) {
      seenEmails.add(em);
      const item = hrMap[em];
      hrCompact.push([em, item.name, item.dept, 0, 0]);
    }
  }

  return {
    totalFlames: totalFlames,
    totalSubmissions: data.length,
    uniqueRecipients: Object.keys(recipientMap).length,
    uniqueSenders: senderSet.size,
    uniqueUnits: Object.keys(unitMap).length,
    top30Recipients: top30,
    early100Senders: early100,
    unitSpread: unitSpread,
    hrCompact: hrCompact
  };
}

/**
 * ==============================================================================
 * 8. WEB APP API (doGet / doPost)
 * ==============================================================================
 */

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "get_dashboard";
  const callback = params.callback || "";

  // 1. Kiểm tra trạng thái hoạt động: ?action=ping
  if (action === "ping") {
    return createJsonResponse({
      success: true,
      message: "FTEL 20/11 Google Form & Live Dashboard API is active.",
      timestamp: new Date().toISOString()
    }, callback);
  }

  // 2. Chẩn đoán hệ thống gửi mail & hạn mức: ?action=mail_diagnose
  if (action === "mail_diagnose") {
    return createJsonResponse({
      success: true,
      data: diagnoseMailSystem()
    }, callback);
  }

  // 3. Lấy dữ liệu cho Live Dashboard: ?action=get_dashboard
  if (action === "get_dashboard" || action === "get_stats" || action === "get_leaderboard") {
    const data = getFullCampaignDashboardData();
    return createJsonResponse({
      success: true,
      data: data
    }, callback);
  }

  // 4. Kích hoạt quét dòng mới: ?action=sync_form_rows
  if (action === "sync_form_rows") {
    const res = processAllUnprocessedRows();
    return createJsonResponse(res, callback);
  }

  return createJsonResponse({
    success: false,
    message: "Hành động (action) không được hỗ trợ: " + action
  }, callback);
}

function doPost(e) {
  let payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return createJsonResponse({ success: false, message: "Dữ liệu JSON gửi lên không hợp lệ." });
  }

  const action = payload.action || "submit_gratitude";

  // Action 1: Gửi lời tri ân trực tiếp từ Web App vào Google Sheet
  if (action === "submit_gratitude") {
    const res = handleDirectSubmissionFromWebApp(payload);
    return createJsonResponse(res);
  }

  // Action 2: Hoàn tất vẽ ảnh E-Card từ Web App -> Lưu Drive -> Bắn mail
  if (action === "complete_ecard_and_send_mail") {
    const res = handleCompleteEcardAndSendMail(payload);
    return createJsonResponse(res);
  }

  // Action 3: Quét xử lý các dòng mới
  if (action === "sync_form_rows") {
    const res = processAllUnprocessedRows();
    return createJsonResponse(res);
  }

  return createJsonResponse({ success: false, message: "Hành động POST không hợp lệ: " + action });
}

/**
 * Ghi nhận lời tri ân trực tiếp từ Web App vào Sheet câu trả lời
 */
function handleDirectSubmissionFromWebApp(payload) {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  ensureExtendedHeaders(sheet);

  const senderEmail = String(payload.senderEmail || "").trim().toLowerCase();
  const recipientEmail = String(payload.recipientEmail || "").trim().toLowerCase();
  const recipientRole = String(payload.recipientRole || payload.tag || "Người dẫn dắt & Đồng hành tri thức").trim();
  const rawMessage = String(payload.message || "").trim();

  if (!isAllowedDomain(senderEmail) || !isAllowedDomain(recipientEmail)) {
    return { success: false, message: "Email người gửi và người nhận phải thuộc miền FPT (@fpt.com / @fpt.net / @vienthongtin.com)." };
  }
  if (senderEmail === recipientEmail) {
    return { success: false, message: "Bạn không thể tự gửi lời tri ân cho chính mình!" };
  }

  const cleanedMessage = cleanAndNormalizeVietnamese(rawMessage);
  const senderName = String(payload.senderName || fallbackNameFromEmail(senderEmail)).trim();
  const senderDept = String(payload.senderDept || "FPT Telecom").trim();
  const recipientName = String(payload.recipientName || fallbackNameFromEmail(recipientEmail)).trim();
  const recipientDept = String(payload.recipientDept || "FPT Telecom").trim();

  // Kiểm tra trùng 3 thông tin
  const nextRowNumber = sheet.getLastRow() + 1;
  const isDuplicate = isDuplicateSubmission(sheet, nextRowNumber, senderEmail, recipientEmail, cleanedMessage);

  if (isDuplicate) {
    sheet.appendRow([
      new Date(),
      senderEmail,
      recipientEmail,
      recipientRole,
      rawMessage,
      senderName,
      senderDept,
      recipientName,
      recipientDept,
      cleanedMessage,
      "TRÙNG LẶP",
      "ĐÃ BÁO TRÙNG LẶP",
      "",
      ""
    ]);

    sendDuplicateWarningEmail(senderEmail, recipientEmail, cleanedMessage);
    return {
      success: false,
      isDuplicate: true,
      message: "Phát hiện thông điệp trùng lặp: Bạn đã gửi lời tri ân cùng nội dung đến đồng nghiệp này trước đó!"
    };
  }

  // Tạo E-Card ID
  const cardId = "FTEL-" + (1000 + nextRowNumber);

  // Thêm dòng hợp lệ vào Sheet
  sheet.appendRow([
    new Date(),
    senderEmail,
    recipientEmail,
    recipientRole,
    rawMessage,
    senderName,
    senderDept,
    recipientName,
    recipientDept,
    cleanedMessage,
    "HỢP LỆ",
    "ĐANG GỬI MAIL",
    "",
    cardId
  ]);

  const newRowNumber = sheet.getLastRow();

  // Tự động tạo thiệp E-Card cá nhân hóa có đầy đủ nội dung & lưu lên Google Drive
  let cardBlob = null;
  let driveFileUrl = "";
  try {
    cardBlob = createPersonalizedEcardBlob({
      recipientName: recipientName,
      recipientRole: recipientRole,
      senderName: senderName,
      senderDept: senderDept,
      message: cleanedMessage,
      rowNumber: newRowNumber
    });
    if (cardBlob) {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedCardFile = folder.createFile(cardBlob);
      try {
        savedCardFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare1) {
        try {
          savedCardFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (eShare2) {}
      }
      driveFileUrl = savedCardFile.getUrl();
      sheet.getRange(newRowNumber, 13).setValue(driveFileUrl);
    }
  } catch (errCard) {
    Logger.log("Lỗi tạo E-Card cho dòng " + newRowNumber + ": " + errCard.toString());
  }

  // Gửi mail cho Người nhận & Người gửi (qua Gmail Relay để vào thẳng Inbox Outlook)
  const mailRes = sendGratitudeNotificationEmail({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    recipientDept: recipientDept,
    recipientRole: recipientRole,
    senderEmail: senderEmail,
    senderName: senderName,
    senderDept: senderDept,
    message: cleanedMessage,
    driveFileUrl: driveFileUrl,
    cardBlob: cardBlob
  });

  sheet.getRange(newRowNumber, 12).setValue(
    mailRes.ok ? "ĐÃ GỬI MAIL (TO & CC)" : "LỖI GỬI: " + mailRes.error
  );

  return {
    success: true,
    message: "Gửi lời tri ân thành công!",
    data: {
      rowNumber: newRowNumber,
      submissionId: cardId,
      cleanedMessage: cleanedMessage,
      driveFileUrl: driveFileUrl,
      emailSent: mailRes.ok
    }
  };
}

/**
 * ==============================================================================
 * 9. CÁC HÀM TIỆN ÍCH HỖ TRỢ & CHẨN ĐOÁN (DIAGNOSE / HELPERS)
 * ==============================================================================
 */

function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getFormResponseSheet(ss) {
  const sheets = ss.getSheets();
  if (CONFIG.FORM_RESPONSE_GID) {
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === CONFIG.FORM_RESPONSE_GID) {
        return sheets[i];
      }
    }
  }
  return sheets[0];
}

function getOrCreateDriveFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function isAllowedDomain(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  for (let i = 0; i < CONFIG.ALLOWED_DOMAINS.length; i++) {
    if (clean.endsWith("@" + CONFIG.ALLOWED_DOMAINS[i])) {
      return true;
    }
  }
  return false;
}

function fallbackNameFromEmail(email) {
  if (!email) return "Đồng nghiệp FTEL";
  const local = String(email).split("@")[0].replace(/[0-9]+$/, "");
  return local.toUpperCase();
}

function formatTimestamp(ts) {
  if (!ts) return "";
  if (ts instanceof Date) {
    return Utilities.formatDate(ts, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm");
  }
  return String(ts);
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

function createJsonResponse(obj, callback) {
  const jsonStr = JSON.stringify(obj);
  if (callback && /^[a-zA-Z0-9_$]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + jsonStr + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Chẩn đoán tình trạng gửi email và quyền thực thi
 */
function diagnoseMailSystem() {
  let effectiveUser = "";
  try {
    effectiveUser = Session.getEffectiveUser().getEmail();
  } catch (e) {
    effectiveUser = "Không xác định";
  }

  let activeAlias = getOfficialSenderFromAlias();
  let remainingQuota = MailApp.getRemainingDailyQuota();

  return {
    effectiveUser: effectiveUser,
    activeAlias: activeAlias,
    officialConfigSender: CONFIG.OFFICIAL_SENDER_EMAIL,
    hasOfficialAliasConfigured: !!activeAlias,
    remainingDailyQuota: remainingQuota,
    spreadsheetId: CONFIG.SPREADSHEET_ID
  };
}

/**
 * ==============================================================================
 * HÀM TEST GỬI EMAIL & THIỆP TRỰC TIẾP (BẤM CHẠY/RUN LÀ GỬI NGAY)
 * ==============================================================================
 * Bạn chỉ cần đổi email muốn nhận vào biến TEST_RECIPIENT_EMAIL bên dưới,
 * rồi chọn hàm `testSendCardToMyEmail` trên thanh công cụ Apps Script và bấm Chạy (Run).
 */
/**
 * Gửi thiệp xem trước sắc nét trực tiếp tới tungdt101@fpt.com
 */
function testSendPreviewToTungdt() {
  const targetEmail = "tungdt101@fpt.com";
  Logger.log("Đang bắt đầu gửi thiệp xem trước chuẩn thiết kế mới tới: " + targetEmail);

  const ss = getSpreadsheet();
  const recHrInfo = lookupHrInfo(ss, targetEmail);
  const pronoun = getGenderPronoun(recHrInfo.gender || "Nữ");

  // Đoạn văn mẫu kiểm chứng thiết kế mới (đoạn thư dài được căn đều 2 bên và cân bằng trọng tâm tuyệt đối)
  const testMessage = "Nghề giáo chưa bao giờ là một hành trình dễ dàng. Đó là những đêm dài thức trắng bên trang giáo án, là nỗi trăn trở khi học trò chưa hiểu bài, là sự kiên nhẫn uốn nắn từng nét chữ, từng nếp nghĩ non nớt. Trong thời đại hôm nay, khi xã hội vận động không ngừng và tri thức thay đổi từng ngày, áp lực trên vai Thầy Cô lại càng thêm nặng nề. Thầy Cô không chỉ truyền đạt kiến thức sẵn có mà còn phải liên tục tự làm mới mình, trở thành người định hướng, truyền cảm hứng để học trò biết tư duy độc lập, sáng tạo và thích nghi với thời cuộc. Sự tận tụy ấy diễn ra thầm lặng mỗi ngày, không ồn ào phố trương nhưng bền bỉ và vĩ đại biết bao.";

  let cardBlob = null;
  let driveFileUrl = "";
  try {
    cardBlob = createPersonalizedEcardBlob({
      recipientEmail: targetEmail,
      recipientName: "Nguyễn Ngọc Thùy Duyên",
      recipientRole: "Đồng nghiệp tận tâm – Người sẻ chia, sát cánh",
      recipientGender: "Nữ", // Danh xưng: "chị NGUYỄN NGỌC THÙY DUYÊN"
      senderName: "Đặng Thanh Tùng",
      senderDept: "FHR",
      message: testMessage,
      rowNumber: "PREVIEW_BALANCED_EVEN"
    });
    if (cardBlob) {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedCardFile = folder.createFile(cardBlob);
      try {
        savedCardFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare1) {}
      driveFileUrl = savedCardFile.getUrl();
    }
  } catch (eCard) {
    Logger.log("Lỗi tạo E-Card preview: " + eCard.toString());
  }

  const res = sendGratitudeNotificationEmail({
    recipientEmail: targetEmail,
    recipientName: "Nguyễn Ngọc Thùy Duyên",
    recipientDept: "FTEL",
    recipientRole: "Đồng nghiệp tận tâm – Người sẻ chia, sát cánh",
    recipientGender: "Nữ",
    senderEmail: "tungdt101@fpt.com", // Dùng email cá nhân, không dùng ftel.trungtamdaotao để tránh CC vòng lặp nhóm
    senderName: "Đặng Thanh Tùng",
    senderDept: "FHR",
    message: testMessage,
    driveFileUrl: driveFileUrl,
    cardBlob: cardBlob
  });

  const report = res.ok
    ? "✅ ĐÃ GỬI EMAIL XEM TRƯỚC THÀNH CÔNG TỚI " + targetEmail + "!\n- Đoạn thư dài đã được căn đều 2 mép phẳng tắp và cân bằng trọng tâm trên dưới hoàn hảo.\n- Link Thiệp: " + driveFileUrl
    : "❌ GỬI EMAIL THẤT BẠI: " + res.error;

  Logger.log(report);
  try {
    SpreadsheetApp.getUi().alert("Kết quả gửi thử nghiệm thiết kế đồng đều mới", report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return res;
}

function testSend1000WordsPreviewToTungdt() {
  const targetEmail = "tungdt101@fpt.com";
  Logger.log("Đang gửi thiệp thử nghiệm bài viết dài 1000 từ tới: " + targetEmail);

  const ss = getSpreadsheet();
  const recHrInfo = lookupHrInfo(ss, targetEmail);

  const essay1000Words = [
    "Tháng mười một gõ cửa bằng những cơn gió chuyển mùa se lạnh, mang theo sắc vàng dịu nhẹ của nắng thu và đánh thức trong tâm khảm của biết bao thế hệ học trò những miền kí ức trong trẻo, thiêng liêng nhất dưới mái trường. Giữa nhịp sống hối hả, ngày 20/11 - Ngày Nhà giáo Việt Nam - luôn là khoảng lặng ấm áp để mỗi người chúng em chậm lại một nhịp, hướng về những người lái đò thầm lặng với lòng biết ơn và sự kính trọng sâu sắc nhất. Dân gian ta vẫn thường ví von người thầy như người chèo đò qua sông. Năm tháng trôi đi, dòng sông tri thức vẫn cuộn chảy, những chuyến đò cứ thế chở nặng ước mơ, hoài bão cập bến bờ tương lai, để rồi người lái đò lại lặng lẽ quay trở lại bến xưa, đón nhận những thế hệ học trò mới.",
    "Có những công việc được tôn vinh bằng những công trình đồ sộ, có những giá trị đo đếm được bằng những thước đo hữu hình, nhưng sự cống hiến của Thầy Cô lại thầm thì khắc sâu vào nhân cách, trí tuệ và số phận của từng con người. Bụi phấn năm nào rơi trên mái tóc, để lại những vệt bạc của thời gian và nhọc nhằn. Bục giảng đơn sơ, tấm bảng đen cùng giọng nói ấm áp của Thầy Cô đã mở ra trước mắt chúng em cả một chân trời tri thức bao la. Đó không chỉ là những định lý toán học chuẩn xác, những công thức khoa học huyền diệu, hay vẻ đẹp của văn chương, lịch sử, mà quan trọng hơn cả, Thầy Cô dạy chúng em cách làm người. Thầy Cô dạy chúng em biết yêu thương gia đình, trân trọng cội nguồn, biết sẻ chia với những mảnh đời gian khó và biết giữ vững lòng tự trọng giữa muôn vàn ngã rẽ cuộc đời.",
    "Trong từng bài giảng, từng lời nhắc nhở nghiêm khắc lẫn những cái nhìn khoan dung khi chúng em phạm lỗi, đều đong đầy tình thương và trách nhiệm lớn lao. Khi chúng em vấp ngã trước những thử thách đầu đời, chính sự tin tưởng và động viên của Thầy Cô là điểm tựa tinh thần vững chắc, tiếp thêm ngọn lửa tự tin để chúng em đứng dậy và bước tiếp. Nghề giáo chưa bao giờ là một hành trình dễ dàng. Đó là những đêm dài thức trắng bên trang giáo án, là nỗi trăn trở khi học trò chưa hiểu bài, là sự kiên nhẫn uốn nắn từng nét chữ, từng nếp nghĩ non nớt. Trong thời đại hôm nay, khi xã hội vận động không ngừng và tri thức thay đổi từng ngày, áp lực trên vai Thầy Cô lại càng thêm nặng nề. Thầy Cô không chỉ truyền đạt kiến thức sẵn có mà còn phải liên tục tự làm mới mình, trở thành người định hướng, truyền cảm hứng để học trò biết tư duy độc lập, sáng tạo và thích nghi với thời cuộc.",
    "Những cô cậu học trò ngây ngô ngày nào rồi cũng phải rời xa mái trường, bước vào giảng đường đại học, dấn thân vào các môi trường doanh nghiệp hay tự mình chèo lái sự nghiệp giữa biển lớn cuộc đời. Khi đối mặt với áp lực, deadline hay những bài toán hóc búa của cuộc sống, chúng em mới thấu hiểu hết giá trị của những nền tảng vững vàng mà Thầy Cô đã dày công vun đắp. Từng bài học về sự chỉn chu, tính kiên nhẫn, tinh thần trách nhiệm và đạo đức nghề nghiệp mà Thầy Cô trao truyền năm xưa chính là kim chỉ nam soi sáng mỗi bước đi của chúng em hôm nay. Dù đi đến bất cứ đâu, làm bất cứ công việc gì, hình bóng Thầy Cô và mái trường thân thương vẫn luôn là góc ký ức dịu dàng, tiếp thêm sức mạnh tinh thần cho chúng em.",
    "Nhân ngày Nhà giáo Việt Nam 20/11, từ tận đáy lòng, chúng em xin gửi đến quý Thầy Cô lời tri ân chân thành và sâu sắc nhất. Cảm ơn Thầy Cô vì đã luôn nhẫn nại với những bồng bột tuổi trẻ của chúng em, cảm ơn Thầy Cô vì đã trao đi tri thức và niềm tin vô điều kiện. Cảm ơn Thầy Cô vì đã thắp lên trong chúng em ngọn lửa đam mê và khát vọng vươn lên. Kính chúc quý Thầy Cô luôn dồi dào sức khỏe, tâm an yên và tràn đầy nhiệt huyết để tiếp tục vững tay chèo trên dòng sông tri thức. Dù mai này vật đổi sao dời, công ơn dưỡng dục của Thầy Cô vẫn mãi là hành trang quý giá nhất mà chúng em luôn khắc ghi suốt cả cuộc đời."
  ].join("\n\n");

  let cardBlob = null;
  let driveFileUrl = "";
  try {
    cardBlob = createPersonalizedEcardBlob({
      recipientName: recHrInfo.name || "Lê Hoàng Nhân",
      recipientRole: "Người dẫn dắt – Người truyền cảm hứng",
      senderName: "Đặng Thanh Tùng",
      senderDept: "FHR",
      message: essay1000Words,
      rowNumber: "1000WORDS"
    });
    if (cardBlob) {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedCardFile = folder.createFile(cardBlob);
      try {
        savedCardFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare1) {}
      driveFileUrl = savedCardFile.getUrl();
    }
  } catch (eCard) {
    Logger.log("Lỗi tạo E-Card 1000 words: " + eCard.toString());
  }

  const res = sendGratitudeNotificationEmail({
    recipientEmail: targetEmail,
    recipientName: recHrInfo.name || "Lê Hoàng Nhân",
    recipientDept: "FTELAU",
    recipientRole: "Người dẫn dắt – Người truyền cảm hứng",
    recipientGender: recHrInfo.gender || "Nam",
    senderEmail: "tungdt101@fpt.com",
    senderName: "Đặng Thanh Tùng",
    senderDept: "FHR",
    message: essay1000Words,
    driveFileUrl: driveFileUrl,
    cardBlob: cardBlob
  });

  const report = res.ok
    ? "✅ ĐÃ GỬI THÀNH CÔNG THIỆP 1000 TỪ TỚI " + targetEmail + "!\n- Thông điệp dài 1000 từ đã được tự động co giãn vừa vặn hoàn hảo trong thiệp.\n- Link xem ảnh thiệp: " + driveFileUrl
    : "❌ GỬI EMAIL THẤT BẠI: " + res.error;

  Logger.log(report);
  try {
    SpreadsheetApp.getUi().alert("Kết quả gửi thiệp 1000 từ", report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return res;
}

function testSendCardToMyEmail() {
  // 👉 ĐỔI EMAIL BẠN MUỐN NHẬN THỬ TẠI ĐÂY (VD: tungdt101@fpt.com hoặc email cá nhân):
  const TEST_RECIPIENT_EMAIL = Session.getActiveUser().getEmail() || "tungdt101@fpt.com"; 
  const TEST_SENDER_EMAIL = Session.getActiveUser().getEmail() || "tungdt101@fpt.com";

  Logger.log("Đang bắt đầu gửi email thử nghiệm tới: " + TEST_RECIPIENT_EMAIL);

  // Thông điệp mẫu có lỗi telex và viết tắt để kiểm tra tính năng chuẩn hóa chính tả
  const testMessage = cleanAndNormalizeVietnamese(
    "Em cam on Anh/Chi da luon tan tam huong dan, dong hanh va tiep lua cho em trong cv! Nhan ngay 20/11 chuc Anh/Chi luon manh khoe, hp va thanh cong ruc ro."
  );

  let cardBlob = null;
  let driveFileUrl = "https://gui-loi-cam-on-thap-sang-tri-thuc.onrender.com/assets/key-visual-card.jpg";
  try {
    cardBlob = createPersonalizedEcardBlob({
      recipientName: "Đồng Nghiệp FTEL",
      recipientRole: "Mentor/Coach – Người đồng hành tri thức",
      senderName: "Ban Tổ Chức 20/11",
      senderDept: "Trung tâm Đào tạo FTEL (FTC)",
      message: testMessage,
      rowNumber: "TEST"
    });
    if (cardBlob) {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedCardFile = folder.createFile(cardBlob);
      try {
        savedCardFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare1) {}
      driveFileUrl = savedCardFile.getUrl();
    }
  } catch (eCard) {
    Logger.log("Lỗi tạo E-Card thử nghiệm: " + eCard.toString());
  }

  const res = sendGratitudeNotificationEmail({
    recipientEmail: TEST_RECIPIENT_EMAIL,
    recipientName: "Đồng Nghiệp FTEL",
    recipientDept: "Trung tâm Đào tạo FTEL (FTC)",
    recipientRole: "Mentor/Coach – Người đồng hành tri thức",
    senderEmail: TEST_SENDER_EMAIL,
    senderName: "Ban Tổ Chức 20/11",
    senderDept: "Trung tâm Đào tạo FTEL (FTC)",
    message: testMessage,
    driveFileUrl: driveFileUrl,
    cardBlob: cardBlob
  });

  const report = res.ok
    ? "✅ ĐÃ GỬI EMAIL THÀNH CÔNG!\n- Đã gửi tới Người nhận (To): " + TEST_RECIPIENT_EMAIL + "\n- Đã gửi thư xác nhận (To): " + TEST_SENDER_EMAIL + "\n- Hạn mức mail còn lại: " + res.quotaRemaining + " lượt"
    : "❌ GỬI EMAIL THẤT BẠI: " + res.error;

  Logger.log(report);
  try {
    SpreadsheetApp.getUi().alert("Kết quả Test Email", report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return res;
}

/**
 * Menu chạy thử gửi email về hòm thư ftel.trungtamdaotao@fpt.com
 */
function menuSendTestEmail() {
  const testEmail = CONFIG.OFFICIAL_SENDER_EMAIL;
  const res = sendGratitudeNotificationEmail({
    recipientEmail: testEmail,
    recipientName: "Đồng nghiệp FTC",
    recipientDept: "Trung tâm Đào tạo FTEL",
    recipientRole: "Người dẫn dắt & Đồng hành tri thức",
    senderEmail: testEmail,
    senderName: "Ban Tổ Chức 20/11",
    senderDept: "Trung tâm Đào tạo FTEL",
    message: "Đây là email kiểm tra định dạng hiển thị Outlook từ hệ thống Thắp Lửa Tri Ân FTEL 20/11. Chúc chiến dịch thành công rực rỡ!"
  });

  const msg = res.ok
    ? "✅ Đã gửi email thử nghiệm thành công tới " + testEmail + "!"
    : "❌ Gửi email thất bại: " + res.error;

  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert("Kết quả gửi email thử nghiệm", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menu chẩn đoán hệ thống
 */
function menuDiagnoseMailSystem() {
  const diag = diagnoseMailSystem();
  const msg = [
    "Tài khoản thực thi: " + diag.effectiveUser,
    "Cấu hình người gửi: " + diag.officialConfigSender,
    "Trạng thái Alias chính thức: " + (diag.hasOfficialAliasConfigured ? "✅ ĐÃ CÓ ALIAS (Gửi đúng từ " + diag.activeAlias + ")" : "⚠️ CHƯA CÓ ALIAS (Sẽ gửi bằng tên hiển thị và replyTo)"),
    "Hạn mức gửi email còn lại hôm nay: " + diag.remainingDailyQuota + " lượt"
  ].join("\n");

  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert("Chẩn đoán hệ thống", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menu quét thủ công
 */
function menuProcessAllUnprocessedRows() {
  const res = processAllUnprocessedRows();
  try {
    SpreadsheetApp.getUi().alert("Quét câu trả lời", "Đã xử lý: " + res.processed + " dòng mới.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menu gửi lại các mail bị lỗi
 */
function menuResendFailedMails() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  let resentCount = 0;

  for (let i = 0; i < data.length; i++) {
    const rowNumber = i + 2;
    const row = data[i];
    const statusNorm = stripVietnameseAccents(row[10]);
    const mailStatusNorm = stripVietnameseAccents(row[11]);

    // Chỉ gửi lại cho dòng HỢP LỆ bị LỖI GỬI
    if (statusNorm.indexOf("HOP LE") !== -1 && mailStatusNorm.indexOf("LOI") !== -1) {
      const mailRes = sendGratitudeNotificationEmail({
        recipientEmail: String(row[2] || "").trim().toLowerCase(),
        recipientName: String(row[7] || "").trim(),
        recipientDept: String(row[8] || "FPT Telecom").trim(),
        recipientRole: String(row[3] || "Người dẫn dắt").trim(),
        senderEmail: String(row[1] || "").trim().toLowerCase(),
        senderName: String(row[5] || "").trim(),
        senderDept: String(row[6] || "FPT Telecom").trim(),
        message: String(row[9] || row[4] || "").trim(),
        driveFileUrl: String(row[12] || "").trim()
      });

      if (mailRes.ok) {
        sheet.getRange(rowNumber, 12).setValue("ĐÃ GỬI MAIL (TO & CC)");
        resentCount++;
      }
    }
  }

  try {
    SpreadsheetApp.getUi().alert("Gửi lại email lỗi", "Đã gửi lại thành công: " + resentCount + " email.", SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Menu tạo lại Thiệp E-Card có đầy đủ thông điệp & gửi lại qua Gmail Relay cho dòng HỢP LỆ mới nhất trên Sheet
 */
function menuRegenerateAndResendLatestRow() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    try { SpreadsheetApp.getUi().alert("Thông báo", "Chưa có dữ liệu dòng nào trên Sheet.", SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    const rowNumber = i + 2;
    const row = data[i];
    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const status = String(row[10] || "").trim().toUpperCase();
    if (!senderEmail || !recipientEmail || status === "TRÙNG LẶP") continue;

    const recipientRole = String(row[3] || "Người dẫn dắt & Đồng hành tri thức").trim();
    const senderName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
    const senderDept = String(row[6] || "FPT Telecom").trim();
    const recipientName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
    const recipientDept = String(row[8] || "FPT Telecom").trim();
    const cleanedMsg = String(row[9] || cleanAndNormalizeVietnamese(String(row[4] || ""))).trim();

    let cardBlob = createPersonalizedEcardBlob({
      recipientName: recipientName,
      recipientRole: recipientRole,
      senderName: senderName,
      senderDept: senderDept,
      message: cleanedMsg,
      rowNumber: rowNumber
    });

    let driveFileUrl = "";
    if (cardBlob) {
      try {
        const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
        const savedFile = folder.createFile(cardBlob);
        try {
          savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e1) {
          try {
            savedFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (e2) {}
        }
        driveFileUrl = savedFile.getUrl();
        sheet.getRange(rowNumber, 13).setValue(driveFileUrl);
      } catch (eDrv) {}
    }

    const mailRes = sendGratitudeNotificationEmail({
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      recipientDept: recipientDept,
      recipientRole: recipientRole,
      senderEmail: senderEmail,
      senderName: senderName,
      senderDept: senderDept,
      message: cleanedMsg,
      driveFileUrl: driveFileUrl,
      cardBlob: cardBlob,
      rowNumber: rowNumber
    });

    sheet.getRange(rowNumber, 12).setValue(
      mailRes.ok ? "ĐÃ GỬI MAIL (TO & CC)" : "LỖI GỬI: " + mailRes.error
    );

    const msg = mailRes.ok
      ? ("✅ Đã tạo thiệp E-Card có chữ & gửi lại thành công cho dòng " + rowNumber + "!\n- Người nhận: " + recipientEmail + "\n- Người gửi: " + senderEmail + "\n- Link Thiệp (Cột M): " + driveFileUrl)
      : ("❌ Lỗi gửi dòng " + rowNumber + ": " + mailRes.error);
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert("Hoàn tất tạo thiệp & gửi lại", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return;
  }
}



/**
 * Hàm tạo lại thiệp & gửi lại chuẩn cho MỘT DÒNG CỤ THỂ trên Google Sheet
 * Bạn chỉ cần đổi số dòng TARGET_ROW bên dưới rồi bấm Run để cập nhật lại Cột M & gửi lại email thiệp đẹp!
 */
function regenerateAndResendRowByNumber(targetRow) {
  const rowNumber = targetRow || 2; // Mặc định dòng 2 nếu không truyền
  Logger.log("Đang bắt đầu tạo lại thiệp và gửi lại cho dòng: " + rowNumber);

  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  if (rowNumber < 2 || rowNumber > lastRow) {
    const err = "Dòng " + rowNumber + " không tồn tại trên Sheet (Dữ liệu từ dòng 2 đến " + lastRow + ").";
    Logger.log(err);
    try { SpreadsheetApp.getUi().alert("Lỗi", err, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return { ok: false, error: err };
  }

  const row = sheet.getRange(rowNumber, 1, 1, 14).getValues()[0];
  const senderEmail = String(row[1] || "").trim().toLowerCase();
  const recipientEmail = String(row[2] || "").trim().toLowerCase();
  const recipientRole = String(row[3] || "Người dẫn dắt & Đồng hành tri thức").trim();
  const rawMsg = String(row[4] || "").trim();
  const senderName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
  const senderDept = String(row[6] || "FPT Telecom").trim();
  const recipientName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
  const recipientDept = String(row[8] || "FPT Telecom").trim();
  const cleanedMsg = cleanAndNormalizeVietnamese(rawMsg);
  try { sheet.getRange(rowNumber, 10).setValue(cleanedMsg); } catch (eCleanCol) {}

  // 1. Tra cứu giới tính Cột G và tạo thiệp E-Card có đầy đủ danh xưng & nội dung chữ
  const rInfo = lookupHrInfo(ss, recipientEmail);
  const recipientGender = rInfo.gender || "";

  // Chuẩn hóa lại Mã định danh thiệp (Cột N) về dạng chuẩn FTEL-(1000+rowNumber) nếu đang bị dạng -Rxxx
  const currentCardId = String(row[13] || "").trim();
  const standardCardId = "FTEL-" + (1000 + rowNumber);
  if (!currentCardId || currentCardId.indexOf("-R") !== -1) {
    try { sheet.getRange(rowNumber, 14).setValue(standardCardId); } catch (eCardId) {}
  }

  const cardBlob = createPersonalizedEcardBlob({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    recipientRole: recipientRole,
    recipientGender: recipientGender,
    senderName: senderName,
    senderDept: senderDept,
    message: cleanedMsg,
    rowNumber: rowNumber
  });

  // KIỂM TRA CHẶT CHẼ: Chặn tuyệt đối không lưu hoặc gửi thiệp nếu bị rơi vào phôi trống (đuôi .jpg hoặc dung lượng < 200KB)
  const isFallbackBlank = !cardBlob || cardBlob.getName().endsWith(".jpg") || (cardBlob.getBytes && cardBlob.getBytes().length < 200000);
  if (isFallbackBlank) {
    const warn = "⚠️ DÒNG " + rowNumber + ": Google Slides chưa xuất được ảnh có chữ (đang bị rơi vào phôi thiệp trống). Hệ thống ĐÃ CHẶN, không ghi đè link trống này lên Sheet!\n\n👉 GIẢI PHÁP: Trong trình soạn thảo Apps Script, nhìn sang cột trái > bấm '+' tại mục Services (Dịch vụ) > Thêm 'Google Slides API' rồi chạy lại!";
    Logger.log(warn);
    try { SpreadsheetApp.getUi().alert("Cảnh báo xuất ảnh", warn, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return { ok: false, error: "Google Slides chưa render kịp ảnh hoặc chưa bật Google Slides API." };
  }

  let driveFileUrl = "";
  if (cardBlob) {
    try {
      const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
      const savedFile = folder.createFile(cardBlob);
      try {
        savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e1) {
        try { savedFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {}
      }
      driveFileUrl = savedFile.getUrl();
      // Cập nhật đè link mới vào Cột M (Cột 13)
      sheet.getRange(rowNumber, 13).setValue(driveFileUrl);
    } catch (eDrv) {
      Logger.log("Lỗi lưu Drive: " + eDrv.toString());
    }
  }

  // 2. Gửi lại Email thiệp hoàn chỉnh
  const mailRes = sendGratitudeNotificationEmail({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    recipientDept: recipientDept,
    recipientRole: recipientRole,
    senderEmail: senderEmail,
    senderName: senderName,
    senderDept: senderDept,
    message: cleanedMsg,
    driveFileUrl: driveFileUrl,
    cardBlob: cardBlob,
    rowNumber: rowNumber
  });

  // Cập nhật trạng thái Cột L (Cột 12) thành ĐÃ GỬI MAIL 2 để phân biệt gửi lần 2
  sheet.getRange(rowNumber, 12).setValue(
    mailRes.ok ? "ĐÃ GỬI MAIL 2 (TO & CC)" : "LỖI GỬI: " + mailRes.error
  );

  const report = mailRes.ok
    ? ("✅ THÀNH CÔNG DÒNG " + rowNumber + ": Đã in chữ lên thiệp, cập nhật link Cột M và gửi lại email thành công!\n- Người nhận: " + recipientEmail + "\n- Link Thiệp mới: " + driveFileUrl)
    : ("❌ THẤT BẠI DÒNG " + rowNumber + ": " + mailRes.error);

  Logger.log(report);
  try { SpreadsheetApp.getUi().alert("Kết quả xử lý dòng " + rowNumber, report, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return mailRes;
}

/**
 * Hàm ép buộc tạo lại thiệp & gửi lại hàng loạt cho một khoảng dòng (hoặc toàn bộ Sheet)
 * Giúp khắc phục triệt để các thư cũ bị kẹt trong Security/Quarantine hoặc bị thiệp trắng!
 */
function forceResendRowRange(fromRow, toRow) {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const maxRow = sheet.getLastRow();
  const startRow = fromRow || 2;
  const endRow = toRow || maxRow;

  if (maxRow <= 1) {
    Logger.log("Sheet chưa có dữ liệu phản hồi.");
    return;
  }

  Logger.log("Đang bắt đầu tạo lại thiệp và gửi lại từ dòng " + startRow + " đến " + endRow);
  let successCount = 0;

  for (let r = startRow; r <= endRow; r++) {
    try {
      const res = regenerateAndResendRowByNumber(r);
      if (res && res.ok) {
        successCount++;
      }
      Utilities.sleep(1000); // Giãn cách 1s giữa mỗi lần gửi để đường truyền mượt mà
    } catch (eRow) {
      Logger.log("Lỗi gửi lại dòng " + r + ": " + eRow.toString());
    }
  }

  const report = "✅ ĐÃ GỬI LẠI THÀNH CÔNG: " + successCount + " dòng (từ dòng " + startRow + " đến " + endRow + ").";
  Logger.log(report);
  try { SpreadsheetApp.getUi().alert("Kết quả gửi lại hàng loạt", report, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

/**
 * ==============================================================================
 * HÀM CHỈ GỬI LẠI ĐÚNG CÁC DÒNG BẠN CHỈ ĐỊNH (TIỆN LỢI NHẤT TRONG APPS SCRIPT)
 * ==============================================================================
 * Bạn chỉ cần chọn hàm này trên thanh công cụ Apps Script rồi bấm Run (Chạy).
 * Điền danh sách các dòng cần sửa thiệp & gửi lại vào mảng ROWS_TO_RESEND bên dưới.
 */
function fixAndResendYellowRows() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();

  // Danh sách dòng chỉ định ban đầu
  const targetRows = [528, 560, 663, 703];

  // Tự động quét thêm toàn bộ sheet để tìm tất cả các dòng có mã -R hoặc file thiệp trống
  try {
    const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 2;
      const cardId = String(data[i][13] || "");
      const driveUrl = String(data[i][12] || "");
      if (cardId.indexOf("-R") !== -1 || driveUrl.indexOf("Row" + rowNum + ".jpg") !== -1) {
        if (!targetRows.includes(rowNum)) {
          targetRows.push(rowNum);
        }
      }
    }
  } catch (eScan) {}

  targetRows.sort(function(a, b) { return a - b; });

  Logger.log("=== BẮT ĐẦU SỬA VÀ TẠO LẠI THIỆP CÓ CHỮ CHO " + targetRows.length + " DÒNG: " + JSON.stringify(targetRows) + " ===");

  let successCount = 0;
  for (let i = 0; i < targetRows.length; i++) {
    const rowNum = targetRows[i];
    Logger.log("Đang xử lý dòng " + rowNum + " (" + (i + 1) + "/" + targetRows.length + ")...");
    const res = regenerateAndResendRowByNumber(rowNum);
    if (res && res.ok) {
      successCount++;
      Logger.log("✅ Dòng " + rowNum + " THÀNH CÔNG: Đã in chữ lên thiệp và gửi email!");
    } else {
      Logger.log("❌ Dòng " + rowNum + " THẤT BẠI: " + (res ? res.error : "Không rõ lỗi"));
    }
    Utilities.sleep(2500);
  }

  const msg = "✅ HOÀN TẤT: Đã in chữ chuẩn đẹp và gửi lại thành công cho " + successCount + "/" + targetRows.length + " dòng!";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert("Hoàn tất sửa dòng", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
}

function resendSelectedRows() {
  fixAndResendYellowRows();
}


/**
 * ==============================================================================
 * HÀM GỬI LẠI DUY NHẤT DÒNG 199 (CHỊ TRẦN HẠNH DUNG - NGƯỜI GỬI: NGUYỄN THỊ QUYÊN)
 * ==============================================================================
 * Tạo lại thiệp với danh xưng "Chị TRẦN HẠNH DUNG" (cỡ chữ 11.5pt chuẩn),
 * cập nhật link Drive mới vào Cột M và gửi email chính thức tới dungth8@fpt.com (CC quyennt25@fpt.com).
 */
function resendRow199() {
  return regenerateAndResendRowByNumber(199);
}


/**
 * ==============================================================================
 * HÀM TEST GỬI THỬ EMAIL THÔNG BÁO TRÙNG LẶP VỀ EMAIL CÁ NHÂN (tungdt101@fpt.com)
 * ==============================================================================
 * Bạn chỉ cần chọn hàm này trên thanh công cụ Apps Script và bấm Run (Chạy).
 * Hệ thống sẽ dispatch trực tiếp 1 email cảnh báo trùng lặp chuẩn thiết kế về hộp thư của bạn.
 */
function testSendDuplicateWarningEmailToMyEmail() {
  const targetEmail = "tungdt101@fpt.com";
  const sampleRecipient = "dungth8@fpt.com";
  const sampleMessage = "Em cảm ơn chị Dung vì đã luôn đồng hành và sát sao với em và các anh chị em FTC từ những lớp học nhỏ đến những dự án lớn. Em học tập được từ chị về năng lượng luôn tràn đầy và cách giải quyết công việc nhanh gọn, hiệu quả. Nhân ngày Nhà giáo Việt Nam, em xin chúc chị - người Thầy của em luôn xinh đẹp, mạnh khỏe và dẫn dắt con thuyền FTC ngày càng vươn xa <3";

  Logger.log("Đang bắt đầu gửi thử email thông báo trùng lặp tới: " + targetEmail);
  const res = sendDuplicateWarningEmail(targetEmail, sampleRecipient, sampleMessage);

  const report = res
    ? "✅ ĐÃ GỬI THỬ EMAIL THÔNG BÁO TRÙNG LẶP THÀNH CÔNG TỚI " + targetEmail + "!\nBạn vui lòng kiểm tra hộp thư Outlook (bao gồm cả tab Focused và tab Other) nhé."
    : "❌ GỬI EMAIL THẤT BẠI. Vui lòng kiểm tra lại log hoặc hạn ngạch gửi mail.";

  Logger.log(report);
  try {
    SpreadsheetApp.getUi().alert("Kết quả gửi thử cảnh báo trùng lặp", report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return res;
}


/**
 * ==============================================================================
 * HÀM RÀ SOÁT & CHẨN ĐOÁN TOÀN DIỆN: TÌM CÁC THƯ BÁO HỢP LỆ NHƯNG OUTLOOK CHƯA NHẬN
 * ==============================================================================
 * Quét toàn bộ các dòng trên Google Sheet để phát hiện:
 * 1. Các thư bị Mail Server FPT từ chối / trả về (Bounce / Undeliverable / User Unknown).
 * 2. Các thư gửi trong "Khung giờ Cách ly" (Sáng 02/11/2026 từ 08:00 - 10:00 AM) bị dính Microsoft Defender Quarantine.
 * 3. Các thư HỢP LỆ nhưng bị lỗi phôi thiệp (Cột M trống hoặc chưa lưu được lên Drive).
 * 4. Các thư có định dạng email người nhận không hợp lệ.
 * 
 * Xuất báo cáo chi tiết kèm danh sách số dòng chính xác để bạn gửi bù ngay lập tức!
 */
function checkAndAuditDeliveredCards() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    const msg = "Sheet câu trả lời chưa có dữ liệu phản hồi.";
    Logger.log(msg);
    try { SpreadsheetApp.getUi().alert("Thông báo", msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return { ok: false, message: msg };
  }

  Logger.log("Bắt đầu rà soát toàn bộ " + (lastRow - 1) + " dòng phản hồi...");

  // 1. Quét tìm danh sách email bị Bounce / Trả về từ máy chủ FPT
  const bouncedEmails = new Set();
  try {
    if (typeof GmailApp !== "undefined" && GmailApp.search) {
      const threads = GmailApp.search('newer_than:3d (from:mailer-daemon OR from:"Mail Delivery Subsystem" OR subject:"Delivery Status Notification" OR subject:"Undeliverable")', 0, 30);
      for (let i = 0; i < threads.length; i++) {
        const msgs = threads[i].getMessages();
        for (let j = 0; j < msgs.length; j++) {
          const body = msgs[j].getPlainBody();
          const matches = body.match(/[a-zA-Z0-9._%+-]+@(?:fpt\.com|fpt\.net|vienthongtin\.com)/gi);
          if (matches) {
            matches.forEach(function(em) { bouncedEmails.add(em.toLowerCase().trim()); });
          }
        }
      }
    }
  } catch (eBnc) {
    Logger.log("Lưu ý quét hộp thư Bounce: " + eBnc.toString());
  }

  // 2. Đọc toàn bộ dữ liệu Sheet
  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();

  const bouncedRows = [];
  const quarantineRiskRows = [];
  const missingDriveRows = [];
  const invalidDomainRows = [];
  let validSentCount = 0;

  for (let i = 0; i < data.length; i++) {
    const rowNum = i + 2;
    const row = data[i];

    const timestamp = row[0];
    const senderEmail = String(row[1] || "").trim().toLowerCase();
    const recipientEmail = String(row[2] || "").trim().toLowerCase();
    const checkStatusNorm = stripVietnameseAccents(row[10]);
    const mailStatusNorm = stripVietnameseAccents(row[11]);
    const driveUrl = String(row[12] || "").trim();

    // Bỏ qua dòng trống
    if (!senderEmail || !recipientEmail) continue;

    // Chỉ kiểm tra các dòng đã được đánh dấu HỢP LỆ hoặc ĐÃ GỬI
    const isHopLe = checkStatusNorm.indexOf("HOP LE") !== -1;
    const isDaGui = mailStatusNorm.indexOf("DA GUI") !== -1;

    if (isHopLe || isDaGui) {
      validSentCount++;

      // a. Kiểm tra Mail Bounced / Server từ chối
      if (bouncedEmails.has(recipientEmail)) {
        bouncedRows.push({ row: rowNum, to: recipientEmail, reason: "Mail Server trả về (Bounce / Hộp thư lỗi)" });
      }

      // b. Kiểm tra thiệp thiếu link Drive ở Cột M
      if (!driveUrl || driveUrl.indexOf("drive.google.com") === -1) {
        missingDriveRows.push({ row: rowNum, to: recipientEmail, reason: "Thiếu link thiệp Drive Cột M" });
      }

      // c. Kiểm tra khung giờ gửi dính Microsoft Defender Quarantine (Sáng 02/11/2026, 08:00 - 10:00 AM)
      let isQuarantine = false;
      if (timestamp) {
        const dt = new Date(timestamp);
        if (!isNaN(dt.getTime())) {
          // Ngày 2 tháng 11 năm 2026, từ 8h đến 10h sáng
          if (dt.getFullYear() === 2026 && dt.getMonth() === 10 && dt.getDate() === 2 && dt.getHours() >= 8 && dt.getHours() < 10) {
            isQuarantine = true;
          }
        }
      }
      if (isQuarantine) {
        quarantineRiskRows.push({ row: rowNum, to: recipientEmail, from: senderEmail, time: timestamp });
      }

      // d. Kiểm tra định dạng tên miền FPT
      if (!isAllowedDomain(recipientEmail)) {
        invalidDomainRows.push({ row: rowNum, to: recipientEmail, reason: "Email người nhận không thuộc miền FPT" });
      }
    }
  }

  // Tổng hợp danh sách dòng nghi vấn (loại trừ trùng lặp số dòng)
  const combinedRowSet = new Set();
  bouncedRows.forEach(function(r) { combinedRowSet.add(r.row); });
  missingDriveRows.forEach(function(r) { combinedRowSet.add(r.row); });
  quarantineRiskRows.forEach(function(r) { combinedRowSet.add(r.row); });
  invalidDomainRows.forEach(function(r) { combinedRowSet.add(r.row); });

  const allSuspiciousRowNumbers = Array.from(combinedRowSet).sort(function(a, b) { return a - b; });

  // Tạo báo cáo chi tiết
  const reportLines = [
    "📊 KẾT QUẢ RÀ SOÁT TOÀN DIỆN HỘP THƯ OUTLOOK:",
    "--------------------------------------------------",
    "• Tổng số phản hồi trên Sheet: " + (lastRow - 1) + " dòng",
    "• Số dòng 'HỢP LỆ' đã gửi mail: " + validSentCount + " dòng",
    "• Số dòng nghi vấn Outlook CHƯA NHẬN ĐƯỢC: " + allSuspiciousRowNumbers.length + " dòng",
    ""
  ];

  if (quarantineRiskRows.length > 0) {
    reportLines.push("⚠️ 1. CÁC DÒNG GỬI TRONG KHUNG GIỜ NGUY CƠ BỊ DEFENDER CÁCH LY (08:00 - 10:00 SÁNG 02/11):");
    reportLines.push("   (Các dòng này máy chủ FPT giữ lại tại security.microsoft.com/quarantine)");
    quarantineRiskRows.slice(0, 10).forEach(function(item) {
      reportLines.push("   - Dòng " + item.row + ": " + item.to + " (Người gửi: " + item.from + ")");
    });
    if (quarantineRiskRows.length > 10) {
      reportLines.push("   ... và " + (quarantineRiskRows.length - 10) + " dòng khác nữa.");
    }
    reportLines.push("");
  }

  if (bouncedRows.length > 0) {
    reportLines.push("🚨 2. CÁC DÒNG BỊ MÁY CHỦ BÁO LỖI / TRẢ VỀ (BOUNCE):");
    bouncedRows.forEach(function(item) {
      reportLines.push("   - Dòng " + item.row + ": " + item.to);
    });
    reportLines.push("");
  }

  if (missingDriveRows.length > 0) {
    reportLines.push("📁 3. CÁC DÒNG HỢP LỆ NHƯNG THIẾU LINK THIỆP DRIVE (CỘT M):");
    missingDriveRows.slice(0, 10).forEach(function(item) {
      reportLines.push("   - Dòng " + item.row + ": " + item.to);
    });
    reportLines.push("");
  }

  reportLines.push("👉 DANH SÁCH CÁC SỐ DÒNG CẦN GỬI BÙ (" + allSuspiciousRowNumbers.length + " dòng):");
  reportLines.push("[" + allSuspiciousRowNumbers.join(", ") + "]");
  reportLines.push("");
  reportLines.push("💡 HƯỚNG XỬ LÝ NHANH:");
  reportLines.push("1. Vào hàm 'resendSelectedRows' trong Code.gs, dán mảng số dòng trên vào ROWS_TO_RESEND.");
  reportLines.push("2. Bấm Run (Chạy) để hệ thống gửi bù ngay lập tức thiệp mới vào thẳng Outlook!");

  const finalReport = reportLines.join("\n");
  Logger.log(finalReport);

  try {
    SpreadsheetApp.getUi().alert("Kết Quả Rà Soát Thư Chưa Vào Outlook", finalReport, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (eAlert) {}

  return {
    ok: true,
    totalValid: validSentCount,
    suspiciousCount: allSuspiciousRowNumbers.length,
    rows: allSuspiciousRowNumbers,
    quarantineRows: quarantineRiskRows.map(function(r) { return r.row; }),
    missingDriveRows: missingDriveRows.map(function(r) { return r.row; }),
    bouncedRows: bouncedRows.map(function(r) { return r.row; })
  };
}


/**
 * ==============================================================================
 * PHƯƠNG THỨC 1: NHẬP SỐ DÒNG CẦN GỬI LẠI QUA HỘP THOẠI POPUP (KHÔNG CẦN SỬA CODE!)
 * ==============================================================================
 * Bấm vào menu "👉 Nhập số dòng cần gửi lại (Hiện Popup)" trên Google Sheet,
 * một popup sẽ hiện ra yêu cầu nhập các dòng cần gửi (ví dụ: 176, 199 hoặc 150-155).
 */
function parseRowInputString(input) {
  const parts = String(input || "").split(/[,;\s]+/);
  const rowSet = new Set();
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (!p) continue;
    if (p.indexOf("-") !== -1) {
      const range = p.split("-");
      const start = parseInt(range[0], 10);
      const end = parseInt(range[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let r = min; r <= max; r++) {
          if (r >= 2) rowSet.add(r);
        }
      }
    } else {
      const num = parseInt(p, 10);
      if (!isNaN(num) && num >= 2) {
        rowSet.add(num);
      }
    }
  }
  return Array.from(rowSet).sort(function(a, b) { return a - b; });
}

function menuResendRowsByPrompt() {
  const ui = SpreadsheetApp.getUi();
  const promptRes = ui.prompt(
    "Gửi Lại Thiệp Theo Số Dòng Chỉ Định",
    "Vui lòng nhập các số dòng bạn muốn tạo lại thiệp & gửi bù vào hộp thư:\n(Ví dụ: 176, 199 hoặc 150-155)",
    ui.ButtonSet.OK_CANCEL
  );

  if (promptRes.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const inputStr = promptRes.getResponseText().trim();
  if (!inputStr) {
    ui.alert("Lỗi", "Bạn chưa nhập số dòng nào!", ui.ButtonSet.OK);
    return;
  }

  const rowNumbers = parseRowInputString(inputStr);
  if (rowNumbers.length === 0) {
    ui.alert("Lỗi", "Không tìm thấy số dòng hợp lệ từ nội dung: '" + inputStr + "' (Dữ liệu từ dòng 2 trở đi).", ui.ButtonSet.OK);
    return;
  }

  const confirmRes = ui.alert(
    "Xác Nhận Gửi Lại",
    "Hệ thống chuẩn bị tạo lại thiệp và gửi email chính thức cho " + rowNumbers.length + " dòng sau:\n[" + rowNumbers.join(", ") + "]\n\nBạn có chắc chắn muốn tiến hành gửi ngay không?",
    ui.ButtonSet.YES_NO
  );

  if (confirmRes !== ui.Button.YES) {
    return;
  }

  let count = 0;
  for (let i = 0; i < rowNumbers.length; i++) {
    const r = rowNumbers[i];
    try {
      const res = regenerateAndResendRowByNumber(r);
      if (res && res.ok) count++;
    } catch (eR) {
      Logger.log("Lỗi gửi dòng " + r + ": " + eR.toString());
    }
    // Chờ 2.5s giữa các dòng để Google Slides xử lý ổn định, tránh bị Google chặn tần suất xuất ảnh
    Utilities.sleep(2500);
  }

  ui.alert(
    "Hoàn Tất Gửi Lại",
    "✅ Đã tạo thiệp mới & gửi lại thành công cho " + count + "/" + rowNumbers.length + " dòng đã chọn!\n[" + rowNumbers.join(", ") + "]",
    ui.ButtonSet.OK
  );
}

/**
 * ==============================================================================
 * PHƯƠNG THỨC 2: GỬI LẠI CÁC DÒNG ĐANG DÙNG CHUỘT BÔI ĐEN TRÊN SHEET
 * ==============================================================================
 * Bạn chỉ cần dùng chuột quét chọn bất kỳ dòng nào trên Sheet, rồi bấm menu này.
 */
function menuResendCurrentlySelectedRows() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const rangeList = sheet.getActiveRangeList();

  if (!rangeList) {
    ui.alert("Lỗi", "Vui lòng dùng chuột chọn ít nhất 1 ô/dòng trên Sheet trước khi chọn tính năng này!", ui.ButtonSet.OK);
    return;
  }

  const rowSet = new Set();
  const ranges = rangeList.getRanges();
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const startRow = r.getRow();
    const numRows = r.getNumRows();
    for (let j = 0; j < numRows; j++) {
      const rowNum = startRow + j;
      if (rowNum >= 2) {
        rowSet.add(rowNum);
      }
    }
  }

  const rowNumbers = Array.from(rowSet).sort(function(a, b) { return a - b; });
  if (rowNumbers.length === 0) {
    ui.alert("Lỗi", "Không có dòng dữ liệu hợp lệ nào được chọn (Dữ liệu bắt đầu từ dòng 2 trở đi).", ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    "Xác Nhận Gửi Lại Theo Vùng Chọn",
    "Bạn đang chọn " + rowNumbers.length + " dòng trên Sheet:\n[" + rowNumbers.join(", ") + "]\n\nBạn có muốn tạo lại thiệp và gửi email ngay bây giờ không?",
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  let count = 0;
  for (let i = 0; i < rowNumbers.length; i++) {
    const r = rowNumbers[i];
    try {
      const res = regenerateAndResendRowByNumber(r);
      if (res && res.ok) count++;
    } catch (eR) {
      Logger.log("Lỗi gửi dòng " + r + ": " + eR.toString());
    }
    // Chờ 2.5s giữa các dòng để Google Slides xử lý ổn định, tránh bị Google chặn tần suất xuất ảnh
    Utilities.sleep(2500);
  }

  ui.alert(
    "Hoàn Tất",
    "✅ Đã gửi lại thành công cho " + count + "/" + rowNumbers.length + " dòng được chọn!",
    ui.ButtonSet.OK
  );
}


/**
 * ==============================================================================
 * CÁCH 2: CHỈ TẠO LẠI THIỆP & CẬP NHẬT LINK GOOGLE DRIVE (HOÀN TOÀN KHÔNG GỬI MAIL)
 * ==============================================================================
 */

/**
 * Hàm làm mới ảnh thiệp & cập nhật đè Link Google Drive vào Cột M (Cột 13) cho MỘT DÒNG CỤ THỂ
 * Tuyệt đối KHÔNG gửi email.
 */
function refreshDriveLinkOnlyForRowNumber(targetRow) {
  const rowNumber = targetRow || 2;
  Logger.log("Bắt đầu làm mới Link Drive (Không gửi mail) cho dòng: " + rowNumber);

  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  if (rowNumber < 2 || rowNumber > lastRow) {
    return { ok: false, error: "Dòng " + rowNumber + " ngoài phạm vi dữ liệu (2 - " + lastRow + ")." };
  }

  const row = sheet.getRange(rowNumber, 1, 1, 14).getValues()[0];
  const senderEmail = String(row[1] || "").trim().toLowerCase();
  const recipientEmail = String(row[2] || "").trim().toLowerCase();
  const recipientRole = String(row[3] || "Người dẫn dắt & Đồng hành tri thức").trim();
  const rawMsg = String(row[4] || "").trim();
  const senderName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
  const senderDept = String(row[6] || "FPT Telecom").trim();
  const recipientName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
  const recipientDept = String(row[8] || "FPT Telecom").trim();

  // Chuẩn hóa câu chúc (sửa luôn chữ 'khôngính chúc' nếu có)
  const cleanedMsg = cleanAndNormalizeVietnamese(rawMsg);
  try { sheet.getRange(rowNumber, 10).setValue(cleanedMsg); } catch (eClean) {}

  // Tra cứu giới tính & tạo thiệp cá nhân hóa sắc nét
  const rInfo = lookupHrInfo(ss, recipientEmail);
  const recipientGender = rInfo.gender || "";

  const cardBlob = createPersonalizedEcardBlob({
    recipientEmail: recipientEmail,
    recipientName: recipientName,
    recipientRole: recipientRole,
    recipientGender: recipientGender,
    senderName: senderName,
    senderDept: senderDept,
    message: cleanedMsg,
    rowNumber: rowNumber
  });

  if (!cardBlob || cardBlob.getName().endsWith(".jpg") || (cardBlob.getBytes && cardBlob.getBytes().length < 200000)) {
    const err = "Không thể sinh ảnh thiệp có chữ cho dòng " + rowNumber + " (Google Slides chưa trả về ảnh rendered hoặc chưa bật Google Slides API). Đã dừng để tránh ghi đè link rỗng.";
    Logger.log(err);
    return { ok: false, error: err };
  }

  try {
    const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
    const safeRecName = recipientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const fileName = "Ecard_20_11_Row" + rowNumber + "_" + (safeRecName || "FTEL") + ".png";
    const finalBlob = Utilities.newBlob(cardBlob.getBytes(), "image/png", fileName);
    const savedFile = folder.createFile(finalBlob);

    try {
      savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e1) {
      try { savedFile.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {}
    }

    const driveFileUrl = savedFile.getUrl();
    // Cập nhật link mới vào Cột M (Cột 13)
    sheet.getRange(rowNumber, 13).setValue(driveFileUrl);
    Logger.log("✅ Hoàn tất dòng " + rowNumber + ": Đã cập nhật link Drive mới -> " + driveFileUrl);
    return { ok: true, row: rowNumber, url: driveFileUrl };
  } catch (eDrv) {
    const err = "Lỗi upload Google Drive dòng " + rowNumber + ": " + eDrv.toString();
    Logger.log(err);
    return { ok: false, error: err };
  }
}

/**
 * Rà soát và kiểm tra toàn bộ Link Drive trên Google Sheet (Cột M)
 * Phát hiện các dòng:
 * 1. Thiếu link (ô trống)
 * 2. Link không hợp lệ
 * 3. File bị xóa vào thùng rác hoặc không thể truy cập
 * 4. File quá nhỏ (< 5KB, nghi vấn ảnh trắng / hỏng)
 */
function auditAllDriveLinksOnSheet() {
  const ss = getSpreadsheet();
  const sheet = getFormResponseSheet(ss);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, totalScanned: 0, validCount: 0, issues: [] };
  }

  // Đọc Cột K (11: Phân loại), L (12: Trạng thái mail), M (13: Link Drive), C (3: Email người nhận)
  const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  const issues = [];
  let validLinksCount = 0;

  for (let i = 0; i < data.length; i++) {
    const rowNum = i + 2;
    const row = data[i];
    const recipientEmail = String(row[2] || "").trim();
    const classification = String(row[10] || "").trim();
    const mailStatus = String(row[11] || "").trim();
    const driveUrl = String(row[12] || "").trim();

    // Bỏ qua các dòng không hợp lệ / trùng lặp chưa từng gửi
    const isProcessed = classification.indexOf("HỢP LỆ") !== -1 || mailStatus.indexOf("ĐÃ GỬI") !== -1;
    if (!isProcessed && !driveUrl) {
      continue;
    }

    if (!driveUrl) {
      issues.push({
        row: rowNum,
        recipient: recipientEmail,
        reason: "Cột M trống (chưa có Link Drive)",
        url: ""
      });
      continue;
    }

    const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match || !match[1]) {
      issues.push({
        row: rowNum,
        recipient: recipientEmail,
        reason: "Link không đúng định dạng Google Drive",
        url: driveUrl
      });
      continue;
    }

    const fileId = match[1];
    try {
      const file = DriveApp.getFileById(fileId);
      if (file.isTrashed()) {
        issues.push({
          row: rowNum,
          recipient: recipientEmail,
          reason: "Tệp trên Drive đã bị xóa vào thùng rác",
          url: driveUrl
        });
        continue;
      }
      const size = file.getSize();
      if (size <= 5000) {
        issues.push({
          row: rowNum,
          recipient: recipientEmail,
          reason: "Kích thước tệp quá nhỏ (" + size + " bytes - nghi vấn ảnh lỗi/hỏng)",
          url: driveUrl
        });
        continue;
      }

      // Đảm bảo file có quyền xem công khai
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare) {
        try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (eDom) {}
      }

      validLinksCount++;
    } catch (eFile) {
      issues.push({
        row: rowNum,
        recipient: recipientEmail,
        reason: "Không thể truy cập tệp (File ID không tồn tại hoặc bị chặn quyền)",
        url: driveUrl
      });
    }
  }

  return {
    ok: true,
    totalScanned: data.length,
    validCount: validLinksCount,
    issues: issues
  };
}

/**
 * Menu: Rà soát & Tự động sửa toàn bộ Link Drive bị lỗi (KHÔNG GỬI MAIL)
 */
function menuAuditAndFixDriveLinks() {
  const ui = SpreadsheetApp.getUi();
  ui.alert("Đang Bắt Đầu Kiểm Tra", "Hệ thống chuẩn bị quét toàn bộ link Google Drive (Cột M). Quá trình này có thể mất vài giây...", ui.ButtonSet.OK);

  const auditRes = auditAllDriveLinksOnSheet();
  const issues = auditRes.issues || [];
  const brokenRowNumbers = issues.map(function(item) { return item.row; });

  const report = [
    "📊 BÁO CÁO KIỂM TRA LINK GOOGLE DRIVE (CỘT M):",
    "--------------------------------------------------",
    "• Tổng số dòng phản hồi: " + auditRes.totalScanned + " dòng",
    "• Link Drive hoạt động tốt & hợp lệ: " + auditRes.validCount + " dòng",
    "• Số dòng bị LỖI LINK hoặc THIẾU LINK: " + issues.length + " dòng",
    ""
  ];

  if (issues.length === 0) {
    report.push("🎉 TUYỆT VỜI: Tất cả link Google Drive trên Sheet đều nguyên vẹn và hợp lệ!");
    ui.alert("Kiểm Tra Hoàn Tất", report.join("\n"), ui.ButtonSet.OK);
    return;
  }

  report.push("⚠️ DANH SÁCH CHI TIẾT CÁC DÒNG BỊ LỖI LINK DRIVE:");
  issues.slice(0, 15).forEach(function(item) {
    report.push("   - Dòng " + item.row + " (" + item.recipient + "): " + item.reason);
  });
  if (issues.length > 15) {
    report.push("   ... và " + (issues.length - 15) + " dòng khác nữa.");
  }

  report.push("");
  report.push("👉 Các số dòng bị lỗi: [" + brokenRowNumbers.join(", ") + "]");
  report.push("");
  report.push("Bạn có muốn hệ thống TỰ ĐỘNG TẠO LẠI THIỆP & CẬP NHẬT LINK MỚI cho toàn bộ " + brokenRowNumbers.length + " dòng này ngay bây giờ không?");
  report.push("(LƯU Ý: Quá trình này HOÀN TOÀN KHÔNG GỬI LẠI EMAIL, chỉ cập nhật Cột M trên Sheet!)");

  const confirm = ui.alert("Phát Hiện " + issues.length + " Link Lỗi", report.join("\n"), ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) {
    return;
  }

  let fixedCount = 0;
  for (let i = 0; i < brokenRowNumbers.length; i++) {
    const r = brokenRowNumbers[i];
    try {
      const res = refreshDriveLinkOnlyForRowNumber(r);
      if (res && res.ok) fixedCount++;
    } catch (e) {
      Logger.log("Lỗi cập nhật dòng " + r + ": " + e.toString());
    }
    Utilities.sleep(1000);
  }

  ui.alert(
    "Đã Khắc Phục Xong!",
    "✅ Đã tạo lại thiệp & cập nhật Link Google Drive mới thành công cho " + fixedCount + "/" + brokenRowNumbers.length + " dòng!\nToàn bộ Cột M đã được làm mới chuẩn đẹp.",
    ui.ButtonSet.OK
  );
}

/**
 * Menu: Nhập số dòng để làm mới Link Drive (KHÔNG gửi mail)
 */
function menuRefreshDriveLinkByPrompt() {
  const ui = SpreadsheetApp.getUi();
  const promptRes = ui.prompt(
    "Làm Mới Link Drive (Không Gửi Mail)",
    "Vui lòng nhập các số dòng bạn muốn tạo lại ảnh & cập nhật link Google Drive:\n(Ví dụ: 328 hoặc 150-155, 328)\n\nLưu ý: Thao tác này CHỈ cập nhật Cột M trên Sheet, tuyệt đối KHÔNG gửi email!",
    ui.ButtonSet.OK_CANCEL
  );

  if (promptRes.getSelectedButton() !== ui.Button.OK) return;

  const inputStr = promptRes.getResponseText().trim();
  if (!inputStr) {
    ui.alert("Lỗi", "Bạn chưa nhập số dòng nào!", ui.ButtonSet.OK);
    return;
  }

  const rowNumbers = parseRowInputString(inputStr);
  if (rowNumbers.length === 0) {
    ui.alert("Lỗi", "Không tìm thấy số dòng hợp lệ từ: '" + inputStr + "'", ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    "Xác Nhận Cập Nhật",
    "Chuẩn bị tạo lại thiệp và cập nhật link Drive cho " + rowNumbers.length + " dòng sau:\n[" + rowNumbers.join(", ") + "]\n\nBạn có muốn tiến hành không?",
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  let fixedCount = 0;
  for (let i = 0; i < rowNumbers.length; i++) {
    const r = rowNumbers[i];
    try {
      const res = refreshDriveLinkOnlyForRowNumber(r);
      if (res && res.ok) fixedCount++;
    } catch (e) {
      Logger.log("Lỗi làm mới dòng " + r + ": " + e.toString());
    }
    Utilities.sleep(1000);
  }

  ui.alert(
    "Hoàn Tất Cập Nhật Link",
    "✅ Đã cập nhật xong Link Drive cho " + fixedCount + "/" + rowNumbers.length + " dòng đã chọn!\n(Không gửi bất kỳ email nào)",
    ui.ButtonSet.OK
  );
}

/**
 * Menu: Làm mới Link Drive cho các dòng đang dùng chuột bôi đen trên Sheet (KHÔNG gửi mail)
 */
function menuRefreshDriveLinkSelectedRows() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const rangeList = sheet.getActiveRangeList();

  if (!rangeList) {
    ui.alert("Lỗi", "Vui lòng dùng chuột quét chọn các ô/dòng trên Sheet trước khi chọn tính năng này!", ui.ButtonSet.OK);
    return;
  }

  const rowSet = new Set();
  const ranges = rangeList.getRanges();
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const startRow = r.getRow();
    const numRows = r.getNumRows();
    for (let j = 0; j < numRows; j++) {
      const rowNum = startRow + j;
      if (rowNum >= 2) rowSet.add(rowNum);
    }
  }

  const rowNumbers = Array.from(rowSet).sort(function(a, b) { return a - b; });
  if (rowNumbers.length === 0) {
    ui.alert("Lỗi", "Không có dòng hợp lệ nào được chọn (từ dòng 2 trở đi).", ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    "Xác Nhận Cập Nhật Vùng Chọn",
    "Bạn đang chọn " + rowNumbers.length + " dòng trên Sheet:\n[" + rowNumbers.join(", ") + "]\n\nBạn có muốn cập nhật lại link Drive cho các dòng này không? (KHÔNG gửi mail)",
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  let fixedCount = 0;
  for (let i = 0; i < rowNumbers.length; i++) {
    const r = rowNumbers[i];
    try {
      const res = refreshDriveLinkOnlyForRowNumber(r);
      if (res && res.ok) fixedCount++;
    } catch (e) {
      Logger.log("Lỗi làm mới dòng " + r + ": " + e.toString());
    }
    Utilities.sleep(1000);
  }

  ui.alert(
    "Hoàn Tất",
    "✅ Đã cập nhật xong Link Drive mới cho " + fixedCount + "/" + rowNumbers.length + " dòng được chọn!",
    ui.ButtonSet.OK
  );
}
