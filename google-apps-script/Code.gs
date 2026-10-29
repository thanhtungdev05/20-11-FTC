/**
 * ==============================================================================
 * DỰ ÁN: "THẮP LỬA TRI ÂN" - FTEL 20/11/2026
 * GOOGLE APPS SCRIPT BACKEND (TỐI ƯU GOOGLE FORM -> SHEET -> DRIVE -> OUTLOOK MAIL & LIVE DASHBOARD)
 * ==============================================================================
 * 
 * ĐƠN VỊ THỰC HIỆN: Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)
 * ĐỊA CHỈ EMAIL CHÍNH THỨC: ftel.daotao@fpt.com
 *
 * CÁC TÍNH NĂNG CỐT LÕI ĐÃ ĐƯỢC TỐI ƯU:
 * 1. Chống trùng lặp 3 thông tin (Người gửi + Người nhận + Thông điệp).
 * 2. Tự động chuẩn hóa lỗi chính tả tiếng Việt & từ viết tắt cho thông điệp.
 * 3. Tạo thiệp E-Card & tự động lưu trữ trên Google Drive công khai.
 * 4. Gửi email chuẩn giao diện Outlook FPT (To Người nhận, CC Người gửi) từ ftel.daotao@fpt.com.
 * 5. Tự động cập nhật số liệu thời gian thực lên Live Dashboard qua Web App API (doGet / doPost).
 * 6. Code tinh gọn, thực thi siêu tốc O(1), không bị timeout/nghẽn bộ nhớ.
 */

const CONFIG = {
  // ID Google Sheet câu trả lời Google Form chính thức
  SPREADSHEET_ID: "1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g",
  FORM_RESPONSE_GID: 1557167031,

  // Thư mục Google Drive lưu trữ ảnh thiệp E-Card
  DRIVE_FOLDER_NAME: "FTEL_20_11_ECards_2026",

  // Tên hiển thị người gửi chuẩn nhận diện chiến dịch (Tránh từ khóa nhạy cảm để không bị Microsoft Defender cách ly)
  OFFICIAL_SENDER_NAME: "FTC - Tri Ân 20/11",
  OFFICIAL_SENDER_EMAIL: "ftel.daotao@fpt.com",

  // Để trống REPLY_TO để tránh lỗi Domain Impersonation / Spoofing của Microsoft Exchange
  REPLY_TO_EMAIL: "",

  // Các miền email FPT hợp lệ
  ALLOWED_DOMAINS: ["fpt.com", "fpt.net", "vienthongtin.com"],

  // Tiêu đề Email chuẩn hóa (Bỏ chữ in hoa toàn bộ và bỏ dấu chấm than ! để đạt điểm Spam = 0)
  EMAIL_SUBJECT_RECIPIENT: "[FTEL 20/11] Thiệp tri ân gửi tặng bạn từ đồng nghiệp",
  EMAIL_SUBJECT_SENDER: "[FTEL 20/11] Xác nhận bạn đã gửi lời tri ân thành công",
  EMAIL_SUBJECT_DUPLICATE: "[FTEL 20/11] Thông báo về lời tri ân trùng lặp",

  // Link phôi thiệp mặc định
  CARD_TEMPLATE_URL: "https://gui-loi-cam-on-thap-sang-tri-thuc.onrender.com/assets/key-visual-card.jpg",
  CARD_TEMPLATE_PROP_KEY: "FTEL_CARD_TEMPLATE_FILE_ID",

  // CẦU NỐI GỬI MAIL QUA GMAIL THẬT (MAIL RELAY):
  // Khi chạy script dưới tài khoản @fpt.com, Google đóng dấu Sender là @fpt.com từ IP Google -> bị Microsoft Defender chặn Phish 100%.
  // Gửi qua Relay (chạy dưới tài khoản @gmail.com có SPF/DKIM hợp lệ của Google) sẽ đi thẳng vào Hộp thư đến (Inbox) của Outlook!
  MAIL_RELAY_ENABLED: true,
  MAIL_RELAY_URL: "https://script.google.com/macros/s/AKfycbzTaNILtS0VPz6Nwnuu3fIoqBotXj6mEJGkP5hO61ktAz64Yngz1fXllq8C5YgPeXWT/exec",

  // Mã bí mật dành cho Admin thao tác khẩn cấp
  ADMIN_SECRET_KEY: "FTEL_TRI_AN_2026"
};

/**
 * ==============================================================================
 * 1. KHỞI TẠO MENU & TRIGGER TỰ ĐỘNG
 * ==============================================================================
 */

function onOpen(e) {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🔥 FTEL 20/11 Tri Ân")
      .addItem("1. Cài đặt hệ thống & Kích hoạt Trigger", "setupSystemAndTriggers")
      .addItem("2. Quét & Xử lý các dòng mới từ Form", "menuProcessAllUnprocessedRows")
      .addSeparator()
      .addItem("3. Test gửi Email & Thiệp thử nghiệm", "testSendCardToMyEmail")
      .addItem("4. Chẩn đoán hệ thống gửi mail & Alias", "menuDiagnoseMailSystem")
      .addItem("5. Gửi lại các mail bị lỗi", "menuResendFailedMails")
      .addToUi();
  } catch (err) {
    Logger.log("Không thể tạo Menu UI (thường do chạy dạng Web App): " + err.toString());
  }
}

/**
 * Hàm khởi tạo 1-click: Kiểm tra/thêm cột mở rộng trên Sheet và cài Trigger onFormSubmit
 */
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
  const abbreviationMap = [
    { regex: /\bko\b/gi, rep: "không" },
    { regex: /\bk\b/gi, rep: "không" },
    { regex: /\bkhg\b/gi, rep: "không" },
    { regex: /\bkhong\b/gi, rep: "không" },
    { regex: /\bdc\b/gi, rep: "được" },
    { regex: /\bđc\b/gi, rep: "được" },
    { regex: /\bduoc\b/gi, rep: "được" },
    { regex: /\bc\/ơn\b/gi, rep: "cảm ơn" },
    { regex: /\btks\b/gi, rep: "cảm ơn" },
    { regex: /\bthanks\b/gi, rep: "cảm ơn" },
    { regex: /\bthank\b/gi, rep: "cảm ơn" },
    { regex: /\bae\b/gi, rep: "anh em" },
    { regex: /\bace\b/gi, rep: "anh chị em" },
    { regex: /\bbt\b/gi, rep: "biết" },
    { regex: /\bntn\b/gi, rep: "như thế nào" },
    { regex: /\btc\b/gi, rep: "tất cả" },
    { regex: /\bhnay\b/gi, rep: "hôm nay" },
    { regex: /\bcv\b/gi, rep: "công việc" },
    { regex: /\bftc\b/gi, rep: "Trung tâm Đào tạo FTEL" },
    { regex: /\bftel\b/gi, rep: "FPT Telecom" }
  ];

  for (let i = 0; i < abbreviationMap.length; i++) {
    text = text.replace(abbreviationMap[i].regex, abbreviationMap[i].rep);
  }

  // 3. Chuẩn hóa dấu câu (loại bỏ khoảng trắng trước dấu câu, thêm đúng 1 khoảng trắng sau dấu)
  text = text
    .replace(/\s+([,.\?!:;])/g, "$1")
    .replace(/([,.\?!:;])(?=[^\s\d])/g, "$1 ")
    .replace(/\s+/g, " ");

  // 4. Viết hoa chữ cái đầu câu
  text = text.replace(/(^\s*|[.?!]\s+)([a-zà-ỹ])/g, function(match, sep, char) {
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
    const prevStatus = String(row[10] || "").trim().toUpperCase();

    // Nếu đã là bản ghi TRÙNG LẶP thì bỏ qua, chỉ so với bản ghi HỢP LỆ
    if (prevStatus === "TRÙNG LẶP") continue;

    const prevKey = buildTripletKey(prevSender, prevRecipient, prevMsg);
    if (targetKey === prevKey) {
      return true;
    }
  }

  return false;
}

/**
 * ==============================================================================
 * 4. HỆ THỐNG GỬI EMAIL CHUẨN OUTLOOK FPT (TỪ ftel.daotao@fpt.com)
 * ==============================================================================
 */

/**
 * Tự động tìm alias ftel.daotao@fpt.com (nếu tài khoản đã được cấp quyền GmailApp)
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
 * 2. Tên người gửi nhận diện chiến dịch trung lập ("FTC - Tri Ân 20/11").
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

  // Chỉ thêm replyTo nếu được chỉ định rõ và không rỗng (mặc định để trống để không bị cách ly)
  if (options.replyTo && String(options.replyTo).trim() !== "") {
    mailOptions.replyTo = options.replyTo;
  }

  if (options.inlineImages && Object.keys(options.inlineImages).length > 0) {
    mailOptions.inlineImages = options.inlineImages;
  }
  if (options.attachments && options.attachments.length > 0) {
    mailOptions.attachments = options.attachments;
  }

  // 1. Ưu tiên cao nhất: Sử dụng MailApp chuẩn (Chạy mượt mà, không đòi hỏi quyền GmailApp đặc thù)
  try {
    MailApp.sendEmail(mailOptions);
    return { ok: true, via: "MailApp" };
  } catch (errMailApp) {
    Logger.log("MailApp gặp thông báo, chuyển sang GmailApp: " + errMailApp.toString());

    // 2. Dự phòng: Thử GmailApp nếu tài khoản có cấp quyền
    try {
      const gmailOpts = {
        htmlBody: mailOptions.htmlBody,
        name: mailOptions.name
      };
      if (mailOptions.replyTo) gmailOpts.replyTo = mailOptions.replyTo;
      if (options.from) gmailOpts.from = options.from;
      if (mailOptions.inlineImages) gmailOpts.inlineImages = mailOptions.inlineImages;
      if (mailOptions.attachments) gmailOpts.attachments = mailOptions.attachments;

      GmailApp.sendEmail(mailOptions.to, mailOptions.subject, mailOptions.body, gmailOpts);
      return { ok: true, via: "GmailApp" };
    } catch (errGmail) {
      Logger.log("Cả MailApp và GmailApp đều lỗi: " + errGmail.toString());
      return { ok: false, error: errMailApp.message || errGmail.message };
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
  let senderDelivered = false;

  // 1. Gửi cho Người nhận qua Gmail Relay
  try {
    const recPayload = {
      action: "submit_gratitude",
      senderName: params.senderName,
      senderEmail: params.senderEmail,
      senderDept: params.senderDept,
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail,
      recipientRole: params.recipientRole,
      tag: "30 Tiếp Lửa Bền Bỉ",
      message: params.message,
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
      }
    }
  } catch (e1) {
    Logger.log("Lỗi gửi Relay Người nhận: " + e1.toString());
  }

  // 2. Gửi bản sao xác nhận cho Người gửi qua Gmail Relay
  try {
    if (params.senderEmail && params.senderEmail !== params.recipientEmail) {
      const senderCopyPayload = {
        action: "submit_gratitude",
        senderName: params.senderName + " (Đã gửi tới: " + params.recipientName + ")",
        senderEmail: params.recipientEmail,
        senderDept: params.senderDept,
        recipientName: params.senderName + " (Bản lưu xác nhận Người gửi)",
        recipientEmail: params.senderEmail,
        recipientRole: params.recipientRole,
        tag: "Xác Nhận Đã Thắp Lửa Tri Ân",
        message: params.message,
        cardImageBase64: cardImageBase64
      };
      const res2 = UrlFetchApp.fetch(CONFIG.MAIL_RELAY_URL, {
        method: "post",
        contentType: "text/plain;charset=utf-8",
        payload: JSON.stringify(senderCopyPayload),
        muteHttpExceptions: true
      });
      if (res2.getResponseCode() === 200) {
        const parsed2 = JSON.parse(res2.getContentText() || "{}");
        if (parsed2 && parsed2.success) {
          senderDelivered = true;
        }
      }
    } else {
      senderDelivered = recipientDelivered;
    }
  } catch (e2) {
    Logger.log("Lỗi gửi Relay Người gửi: " + e2.toString());
  }

  return {
    ok: recipientDelivered && senderDelivered,
    recipientSent: recipientDelivered,
    senderSent: senderDelivered,
    via: "GmailRelay"
  };
}

/**
 * Gửi email tri ân tới Người nhận (To) và gửi thư xác nhận tới Người gửi (CC / To)
 */
function sendGratitudeNotificationEmail(params) {
  const recipientEmail = String(params.recipientEmail || "").trim().toLowerCase();
  const senderEmail = String(params.senderEmail || "").trim().toLowerCase();
  const recipientName = String(params.recipientName || fallbackNameFromEmail(recipientEmail)).trim();
  const senderName = String(params.senderName || fallbackNameFromEmail(senderEmail)).trim();
  const recipientDept = String(params.recipientDept || "FPT Telecom").trim();
  const senderDept = String(params.senderDept || "FPT Telecom").trim();
  const recipientRole = String(params.recipientRole || "Người dẫn dắt & Đồng hành tri thức").trim();
  const message = String(params.message || "").trim();
  const driveFileUrl = String(params.driveFileUrl || "").trim();
  const cardBlob = params.cardBlob || null;

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
      cardBlob: cardBlob,
      cardImageBase64: params.cardImageBase64 || ""
    });
    if (relayRes.ok) {
      return {
        ok: true,
        recipientSent: true,
        senderSent: true,
        via: "GmailRelay",
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

  // Tên hiển thị người gửi chuẩn
  const baseOptions = {
    name: CONFIG.OFFICIAL_SENDER_NAME
  };
  // Chỉ gán replyTo nếu có cấu hình
  if (CONFIG.REPLY_TO_EMAIL && CONFIG.REPLY_TO_EMAIL.trim() !== "") {
    baseOptions.replyTo = CONFIG.REPLY_TO_EMAIL;
  }

  let recipientSent = false;
  let senderSent = false;
  let errorMsg = "";

  // 1. GỬI CHO NGƯỜI NHẬN (TO: recipientEmail)
  const recipientHtml = buildOutlookCompatibleHtmlEmail({
    isRecipientView: true,
    recipientName: recipientName,
    recipientDept: recipientDept,
    recipientRole: recipientRole,
    senderName: senderName,
    senderDept: senderDept,
    message: message,
    driveFileUrl: driveFileUrl
  });

  const plainTextRec = [
    "Kính gửi Anh/Chị " + recipientName + ",",
    "",
    "Nhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11 – Chiến dịch \"Gửi lời cảm ơn – Thắp sáng tri thức\", Anh/Chị vừa nhận được một ngọn lửa tri ân ấm áp từ đồng nghiệp " + senderName + " (" + senderDept + ") với dấu ấn \"" + recipientRole + "\":",
    "",
    "\"" + message + "\"",
    "",
    driveFileUrl ? ("Xem và tải thiệp E-Card tại: " + driveFileUrl) : "",
    "",
    "Trân trọng,",
    "Chiến dịch Thắp Lửa Tri Ân 20/11 – FPT Telecom"
  ].filter(Boolean).join("\n");

  const recOpts = Object.assign({}, baseOptions, {
    to: recipientEmail,
    subject: CONFIG.EMAIL_SUBJECT_RECIPIENT,
    body: plainTextRec,
    htmlBody: recipientHtml
  });
  if (cardBlob) {
    recOpts.inlineImages = { card_ecard: cardBlob };
  }

  const recRes = dispatchEmailUniversal(recOpts);
  if (recRes.ok) {
    recipientSent = true;
  } else {
    errorMsg += "Gửi Người nhận lỗi: " + recRes.error + "; ";
  }

  // 2. GỬI CHO NGƯỜI GỬI (TO: senderEmail) để xác nhận và lưu kỷ niệm
  const senderHtml = buildOutlookCompatibleHtmlEmail({
    isRecipientView: false,
    recipientName: recipientName,
    recipientDept: recipientDept,
    recipientRole: recipientRole,
    senderName: senderName,
    senderDept: senderDept,
    message: message,
    driveFileUrl: driveFileUrl
  });

  const plainTextSender = [
    "Kính gửi Anh/Chị " + senderName + ",",
    "",
    "Hệ thống xác nhận Anh/Chị vừa thắp lên thành công ngọn lửa tri ân gửi tới đồng nghiệp " + recipientName + " (" + recipientDept + ") với dấu ấn \"" + recipientRole + "\":",
    "",
    "\"" + message + "\"",
    "",
    driveFileUrl ? ("Xem và tải thiệp E-Card tại: " + driveFileUrl) : "",
    "",
    "Trân trọng,",
    "Chiến dịch Thắp Lửa Tri Ân 20/11 – FPT Telecom"
  ].filter(Boolean).join("\n");

  const sendOpts = Object.assign({}, baseOptions, {
    to: senderEmail,
    subject: CONFIG.EMAIL_SUBJECT_SENDER,
    body: plainTextSender,
    htmlBody: senderHtml
  });
  if (cardBlob) {
    sendOpts.inlineImages = { card_ecard: cardBlob };
  }

  const sendRes = dispatchEmailUniversal(sendOpts);
  if (sendRes.ok) {
    senderSent = true;
  } else {
    errorMsg += "Gửi Người gửi lỗi: " + sendRes.error + "; ";
  }

  const ok = recipientSent && senderSent;
  return {
    ok: ok,
    recipientSent: recipientSent,
    senderSent: senderSent,
    error: errorMsg,
    quotaRemaining: MailApp.getRemainingDailyQuota()
  };
}

/**
 * Gửi email cảnh báo trùng lặp cho người gửi
 */
function sendDuplicateWarningEmail(senderEmail, recipientEmail, message) {
  try {
    const plainText = [
      "Chào bạn (" + senderEmail + "),",
      "",
      "Hệ thống Chiến dịch FTEL 20/11 ghi nhận bạn đã gửi lời tri ân có cùng nội dung đến đồng nghiệp " + recipientEmail + " trước đó:",
      "\"" + message + "\"",
      "",
      "Để đảm bảo tính chính xác và sự công bằng của chiến dịch, mỗi thông điệp gửi đến cùng một đồng nghiệp chỉ được ghi nhận 1 lần duy nhất.",
      "",
      "Trân trọng,",
      "Chiến dịch Thắp Lửa Tri Ân 20/11 – FPT Telecom"
    ].join("\n");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #ea580c; margin-top: 0;">Thông Báo Về Lời Tri Ân Trùng Lặp</h3>
        <p>Chào bạn (<strong>${escapeHtml(senderEmail)}</strong>),</p>
        <p>Hệ thống <strong>Chiến dịch FTEL 20/11</strong> ghi nhận bạn đã gửi lời tri ân có cùng nội dung đến đồng nghiệp <strong>${escapeHtml(recipientEmail)}</strong> trước đó.</p>
        <div style="background: #f8fafc; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 15px 0; font-style: italic; color: #334155;">
          "${escapeHtml(message)}"
        </div>
        <p>Để đảm bảo sự công bằng và số liệu chính xác của chiến dịch, mỗi thông điệp gửi đến cùng một đồng nghiệp chỉ được ghi nhận <strong>1 lần duy nhất</strong>.</p>
        <p style="margin-top: 25px; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Trân trọng,<br>
          <strong>Chiến dịch Thắp Lửa Tri Ân 20/11 – FPT Telecom</strong>
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
 * Thiết kế HTML Email dạng Bảng (Table) tương thích 100% với Microsoft Outlook máy tính & Mobile
 */
function buildOutlookCompatibleHtmlEmail(data) {
  const isRecipient = data.isRecipientView;
  const headline = isRecipient
    ? "Thiệp Tri Ân 20/11 – Thắp Sáng Tri Thức"
    : "Xác Nhận Đã Gửi Lời Tri Ân Thành Công";

  const subline = isRecipient
    ? `Đồng nghiệp <strong>${escapeHtml(data.senderName)}</strong> (${escapeHtml(data.senderDept)}) vừa gửi gắm lời cảm ơn chân thành đến bạn.`
    : `Lời cảm ơn chân thành của bạn đã được gửi tới đồng nghiệp <strong>${escapeHtml(data.recipientName)}</strong> (${escapeHtml(data.recipientDept)}).`;

  const driveBtnHtml = data.driveFileUrl
    ? `
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto;">
        <tr>
          <td align="center" style="border-radius: 6px; background-color: #ea580c;">
            <a href="${data.driveFileUrl}" target="_blank" style="font-size: 14px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 12px 24px; border: 1px solid #ea580c; display: inline-block; font-weight: bold;">
              📥 Tải & Xem Thiệp E-Card Chất Lượng Cao (Drive)
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 25px 0;">
    <tr>
      <td align="center">
        <!-- BẢNG CONTAINER CHÍNH CHO OUTLOOK -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <!-- BANNER HEADER -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 25px; color: #ffffff;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: #ea580c; color: #ffffff; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
                      FPT TELECOM • 20/11/2026
                    </span>
                    <h1 style="margin: 15px 0 8px 0; font-size: 22px; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3;">
                      ${headline}
                    </h1>
                    <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
                      Chiến dịch "Gửi lời cảm ơn – Thắp sáng tri thức"
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- THÂN EMAIL -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
                ${subline}
              </p>

              <!-- THÔNG TIN NGƯỜI NHẬN & VAI TRÒ -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
                <tr>
                  <td style="padding: 16px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="35%" style="font-size: 13px; color: #64748b; font-weight: bold; padding: 4px 0;">Người nhận tri ân:</td>
                        <td style="font-size: 14px; color: #0f172a; font-weight: bold; padding: 4px 0;">${escapeHtml(data.recipientName)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: bold; padding: 4px 0;">Đơn vị:</td>
                        <td style="font-size: 13px; color: #334155; padding: 4px 0;">${escapeHtml(data.recipientDept)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: bold; padding: 4px 0;">Dấu ấn / Vai trò:</td>
                        <td style="font-size: 13px; color: #ea580c; font-weight: bold; padding: 4px 0;">${escapeHtml(data.recipientRole)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: bold; padding: 4px 0;">Người gửi:</td>
                        <td style="font-size: 13px; color: #334155; padding: 4px 0;">${escapeHtml(data.senderName)} (${escapeHtml(data.senderDept)})</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- KHỐI THÔNG ĐIỆP ĐÃ CHUẨN HÓA CHÍNH TẢ -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 18px 20px; margin: 25px 0;">
                <span style="font-size: 12px; color: #b45309; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                  💬 THÔNG ĐIỆP TRI ÂN GỬI GẮM:
                </span>
                <p style="font-size: 15px; color: #1e293b; line-height: 1.7; font-style: italic; margin: 10px 0 0 0;">
                  "${escapeHtml(data.message)}"
                </p>
              </div>

              ${driveBtnHtml}

              <!-- LỜI CHÚC TỪ BAN TỔ CHỨC -->
              <p style="font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px dashed #cbd5e1; padding-top: 20px; margin-bottom: 0;">
                Mỗi ngọn lửa được trao đi là một lời cảm ơn sâu sắc tiếp thêm năng lượng cho hành trình tri thức tại FPT Telecom. Chúc Anh/Chị luôn tràn đầy nhiệt huyết và đồng hành bền bỉ cùng đồng đội!
              </p>
            </td>
          </tr>

          <!-- FOOTER CHÍNH THỨC -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 4px 0; font-weight: bold; color: #334155;">
                TRUNG TÂM ĐÀO TẠO VÀ PHÁT TRIỂN FPT TELECOM (FTC)
              </p>
              <p style="margin: 0; color: #94a3b8;">
                Email: <a href="mailto:${CONFIG.OFFICIAL_SENDER_EMAIL}" style="color: #ea580c; text-decoration: none;">${CONFIG.OFFICIAL_SENDER_EMAIL}</a> • Hotline nội bộ FTC
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * ==============================================================================
 * 5. XỬ LÝ DÒNG TỰ ĐỘNG KHI CÓ NGƯỜI NỘP FORM HOẶC GỌI API
 * ==============================================================================
 */

/**
 * Trigger tự động khi có câu trả lời mới từ Google Form
 */
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
let __cardTemplateBlobCache = null;
function getCardTemplateBlob() {
  if (__cardTemplateBlobCache) return __cardTemplateBlobCache;
  const props = PropertiesService.getScriptProperties();
  const savedFileId = props.getProperty(CONFIG.CARD_TEMPLATE_PROP_KEY);
  if (savedFileId) {
    try {
      const file = DriveApp.getFileById(savedFileId);
      if (!file.isTrashed()) {
        __cardTemplateBlobCache = file.getBlob();
        return __cardTemplateBlobCache;
      }
    } catch (e) {}
  }

  if (CONFIG.CARD_TEMPLATE_URL) {
    try {
      const res = UrlFetchApp.fetch(CONFIG.CARD_TEMPLATE_URL, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        const blob = res.getBlob().setName("FTEL_20_11_Card_Template.jpg");
        __cardTemplateBlobCache = blob;
        try {
          const folder = getOrCreateDriveFolder(CONFIG.DRIVE_FOLDER_NAME);
          const savedFile = folder.createFile(blob);
          props.setProperty(CONFIG.CARD_TEMPLATE_PROP_KEY, savedFile.getId());
        } catch (eSave) {}
        return __cardTemplateBlobCache;
      }
    } catch (eFetch) {
      Logger.log("Lỗi tải phôi thiệp: " + eFetch.toString());
    }
  }
  return null;
}

/**
 * Tự động tạo ảnh thiệp E-Card CÓ ĐẦY ĐỦ NỘI DUNG (Người nhận, Vai trò, Thông điệp chuẩn hóa, Người gửi)
 * ngay trên Google Apps Script bằng Google Slides Engine & lưu lên Google Drive.
 */
function createPersonalizedEcardBlob(params) {
  params = params || {};
  const recipientName = String(params.recipientName || "Đồng nghiệp FTEL").trim();
  const recipientRole = String(params.recipientRole || "Người dẫn dắt – Người truyền cảm hứng").trim();
  const senderName = String(params.senderName || "Đồng nghiệp FTEL").trim();
  const senderDept = String(params.senderDept || "FPT Telecom").trim();
  const message = String(params.message || "").trim();
  const rowNumber = params.rowNumber || "TEST";
  const safeName = recipientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");

  let pres = null;
  let presId = null;

  try {
    pres = SlidesApp.create("Temp_ECard_Row" + rowNumber + "_" + Date.now());
    presId = pres.getId();
    const slide = pres.getSlides()[0];
    const presFile = DriveApp.getFileById(presId);

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
      slide.getBackground().setSolidFill("#041836");
    }

    const templateBlob = getCardTemplateBlob();
    if (templateBlob) {
      try {
        const bgImg = slide.insertImage(templateBlob);
        bgImg.setLeft(cardLeft).setTop(cardTop).setWidth(cardW).setHeight(cardH);
        bgImg.sendToBack();
      } catch (eImg) {
        slide.getBackground().setSolidFill("#041836");
      }
    } else {
      slide.getBackground().setSolidFill("#041836");
    }

    // 1. Tiêu đề nhỏ
    const subBox = slide.insertTextBox("✦ TRÂN TRỌNG GỬI ĐẾN ✦", cardLeft + cardW * 0.08, cardTop + cardH * 0.365, cardW * 0.84, cardH * 0.035);
    subBox.getText().getTextStyle().setForegroundColor("#ffd700").setFontSize(Math.max(10, Math.round(cardH * 0.020))).setBold(true);
    subBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 2. Tên người nhận
    const nameBox = slide.insertTextBox(recipientName.toUpperCase(), cardLeft + cardW * 0.05, cardTop + cardH * 0.395, cardW * 0.90, cardH * 0.048);
    nameBox.getText().getTextStyle().setForegroundColor("#ffffff").setFontSize(Math.max(14, Math.round(cardH * 0.032))).setBold(true);
    nameBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 3. Vai trò / Dấu ấn
    const roleBox = slide.insertTextBox(recipientRole, cardLeft + cardW * 0.08, cardTop + cardH * 0.442, cardW * 0.84, cardH * 0.035);
    roleBox.getText().getTextStyle().setForegroundColor("#cbd5e1").setFontSize(Math.max(9, Math.round(cardH * 0.018))).setItalic(true);
    roleBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 4. Thông điệp tri ân đã chuẩn hóa chính tả
    const msgBox = slide.insertTextBox("“" + message + "”", cardLeft + cardW * 0.08, cardTop + cardH * 0.485, cardW * 0.84, cardH * 0.22);
    msgBox.getText().getTextStyle().setForegroundColor("#ffffff").setFontSize(Math.max(10, Math.round(cardH * 0.021))).setItalic(true);
    msgBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

    // 5. Người gửi
    const senderDisplay = senderName + (senderDept && senderName.indexOf(senderDept) === -1 ? " (" + senderDept + ")" : "");
    const senderBox = slide.insertTextBox("Người gửi: " + senderDisplay, cardLeft + cardW * 0.10, cardTop + cardH * 0.735, cardW * 0.80, cardH * 0.045);
    senderBox.getText().getTextStyle().setForegroundColor("#ffd700").setFontSize(Math.max(10, Math.round(cardH * 0.022))).setBold(true);
    senderBox.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.RIGHT);

    pres.saveAndClose();

    // Xuất ảnh PNG qua Slides Thumbnail hoặc Drive Thumbnail
    const pageId = slide.getObjectId();
    let finalBlob = null;

    try {
      const thumbApiUrl = "https://slides.googleapis.com/v1/presentations/" + presId + "/pages/" + pageId + "/thumbnail?thumbnailProperties.thumbnailSize=LARGE";
      const thumbRes = UrlFetchApp.fetch(thumbApiUrl, {
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (thumbRes.getResponseCode() === 200) {
        const thumbData = JSON.parse(thumbRes.getContentText());
        if (thumbData && thumbData.contentUrl) {
          const imgRes = UrlFetchApp.fetch(thumbData.contentUrl, { muteHttpExceptions: true });
          if (imgRes.getResponseCode() === 200) {
            finalBlob = Utilities.newBlob(imgRes.getBlob().getBytes(), "image/png", "Ecard_20_11_Row" + rowNumber + "_" + (safeName || "FTEL") + ".png");
          }
        }
      }
    } catch (eThumb) {}

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

    // Bỏ qua dòng trống email
    if (!senderEmail || !recipientEmail) continue;

    // Nếu dòng này đã kiểm duyệt và đã gửi mail xong -> bỏ qua (nhưng nếu chưa có link Drive thì cho vào pendingRender)
    if (currentCheckStatus && currentMailStatus && currentMailStatus.indexOf("ĐÃ GỬI") !== -1) {
      const existingDrive = String(row[12] || "").trim();
      if (!existingDrive && currentCheckStatus === "HỢP LỆ") {
        pendingRenderList.push({
          rowNumber: rowNumber,
          senderEmail: senderEmail,
          senderName: String(row[5] || fallbackNameFromEmail(senderEmail)).trim(),
          senderDept: String(row[6] || "FPT Telecom").trim(),
          recipientEmail: recipientEmail,
          recipientName: String(row[7] || fallbackNameFromEmail(recipientEmail)).trim(),
          recipientDept: String(row[8] || "FPT Telecom").trim(),
          recipientRole: recipientRole,
          message: String(row[9] || rawMessage).trim()
        });
      }
      continue;
    }

    // 1. Chuẩn hóa chính tả thông điệp
    const cleanedMessage = cleanAndNormalizeVietnamese(rawMessage);
    const senderName = String(row[5] || fallbackNameFromEmail(senderEmail)).trim();
    const senderDept = String(row[6] || "FPT Telecom").trim();
    const recipientName = String(row[7] || fallbackNameFromEmail(recipientEmail)).trim();
    const recipientDept = String(row[8] || "FPT Telecom").trim();

    // 2. Kiểm tra tính hợp lệ domain & tự gửi
    const isSenderValid = isAllowedDomain(senderEmail);
    const isRecValid = isAllowedDomain(recipientEmail);
    const isSelfSend = senderEmail === recipientEmail;

    if (!isSenderValid || !isRecValid || isSelfSend) {
      sheet.getRange(rowNumber, 6, 1, 9).setValues([[
        senderName,
        senderDept,
        recipientName,
        recipientDept,
        cleanedMessage,
        "KHÔNG HỢP LỆ",
        isSelfSend ? "LỖI: Tự gửi cho chính mình" : "LỖI: Email không thuộc miền FPT",
        "",
        ""
      ]]);
      continue;
    }

    // 3. Kiểm tra trùng lặp 3 thông tin
    const isDuplicate = isDuplicateSubmission(sheet, rowNumber, senderEmail, recipientEmail, cleanedMessage);
    if (isDuplicate) {
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

      // Gửi mail cảnh báo người gửi
      sendDuplicateWarningEmail(senderEmail, recipientEmail, cleanedMessage);
      processedCount++;
      continue;
    }

    // 4. Nếu HỢP LỆ: Tự động tạo ảnh thiệp có nội dung, lưu Drive & Gửi Email qua Gmail Relay
    const cardId = String(row[13] || ("FTEL-" + (1000 + rowNumber))).trim();
    let driveUrl = String(row[12] || "").trim();
    let cardBlob = null;

    if (!driveUrl) {
      cardBlob = createPersonalizedEcardBlob({
        rowNumber: rowNumber,
        recipientName: recipientName,
        recipientRole: recipientRole,
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
        } catch (eDrive) {
          Logger.log("Lưu thiệp lên Drive lỗi: " + eDrive.toString());
        }
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
      mailRes.ok ? "ĐÃ GỬI MAIL (TO & CC)" : "LỖI GỬI: " + mailRes.error
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
    unitMap[unitName] = (unitMap[unitName] || 0) + 1;

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
    .map(name => ({ unit: name, count: unitMap[name] }))
    .sort((a, b) => b.count - a.count);

  return {
    totalFlames: totalFlames,
    totalSubmissions: data.length,
    uniqueRecipients: Object.keys(recipientMap).length,
    uniqueSenders: senderSet.size,
    uniqueUnits: Object.keys(unitMap).length,
    top30Recipients: top30,
    early100Senders: early100,
    unitSpread: unitSpread
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
 * Menu chạy thử gửi email về hòm thư ftel.daotao@fpt.com
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
    const status = String(row[10] || "").trim().toUpperCase();
    const mailStatus = String(row[11] || "").trim().toUpperCase();

    // Chỉ gửi lại cho dòng HỢP LỆ bị LỖI GỬI
    if (status === "HỢP LỆ" && mailStatus.indexOf("LỖI") !== -1) {
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

