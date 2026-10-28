import {
  GOOGLE_SHEET_ID,
  GOOGLE_SHEET_GID,
  GOOGLE_HR_SHEET_GID,
  MOCK_LEADERBOARD,
  MOCK_EARLY_100,
  MOCK_UNIT_SPREAD,
  MOCK_HR_DIRECTORY,
  cleanAndCorrectVietnameseText,
  lookupEmployeeInfo,
  saveEmployeeNameCache,
  registerBulkEmployeesInMemory
} from './mockData.js';

/**
 * ==============================================================================
 * API CLIENT CHO WEB APP "THẮP LỬA TRI ÂN"
 * ==============================================================================
 * Hướng dẫn:
 * Sau khi triển khai Google Apps Script (xem file google-apps-script/README.md),
 * hãy dán Web App URL vào biến APPS_SCRIPT_URL dưới đây.
 */
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwijCKIOiXC0Efk2B7VR4TcVB1W4JoaziGzZIfO3KooFOchP3mgHJ2FR_uRru18DlKaDA/exec";

export function getEffectiveScriptUrl() {
  const custom = localStorage.getItem('ftel_custom_script_url');
  // Tự động xóa các link cũ từng triển khai trước đây để luôn dùng link chuẩn mới nhất
  if (custom && (custom.includes('AKfycbzh') || custom.includes('AKfycbzKGQrt') || custom.includes('AKfycbzJVQuU') || custom.includes('AKfycbzTaNIL') || custom.includes('AKfycbyZFhem') || custom.includes('library/d/'))) {
    localStorage.removeItem('ftel_custom_script_url');
    return APPS_SCRIPT_URL;
  }
  if (custom && custom.trim() !== '') {
    return custom;
  }
  return APPS_SCRIPT_URL;
}

/**
 * Tự động chuẩn hóa URL Google Apps Script (hỗ trợ cả /a/macros/fpt.com/s/... và /macros/s/...)
 * để gọi API trình duyệt mượt mà không bị lỗi CORS domain redirect
 */
async function fetchAppsScript(rawUrl, options = {}) {
  const publicUrl = rawUrl.replace('/a/macros/fpt.com/s/', '/macros/s/');
  try {
    const res = await fetch(publicUrl, options);
    if (res.ok) return res;
  } catch (e) {
    // Fallback sang rawUrl nếu publicUrl gặp lỗi mạng
  }
  return fetch(rawUrl, options);
}

// Storage keys & IndexedDB (Hỗ trợ lưu trữ bền vững 24.608+ nhân sự vượt giới hạn 5MB của localStorage)
const STORAGE_KEY_SUBMISSIONS = "ftel_20_11_submissions";
const STORAGE_KEY_LAST_SUBMIT = "ftel_20_11_last_submit_time";
const STORAGE_KEY_CUSTOM_HR = "ftel_custom_hr_list";
const IDB_NAME = "ftel_20_11_hr_db";
const IDB_STORE = "hr_directory_store";
const IDB_KEY = "full_hr_24608";

let __inMemoryCustomHrList = null;

function openHrIndexedDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

async function saveHrListToStorage(list) {
  if (!Array.isArray(list) || list.length === 0) return;
  __inMemoryCustomHrList = list;
  registerBulkEmployeesInMemory(list);
  try {
    const db = await openHrIndexedDB();
    if (db) {
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(list, IDB_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
  } catch (e) {}
  try {
    if (list.length <= 5000) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_HR, JSON.stringify(list));
    } else {
      localStorage.setItem("ftel_custom_hr_count", String(list.length));
    }
  } catch (e) {}
}

async function loadHrListFromStorage() {
  if (Array.isArray(__inMemoryCustomHrList) && __inMemoryCustomHrList.length > 0) {
    return __inMemoryCustomHrList;
  }
  try {
    const db = await openHrIndexedDB();
    if (db) {
      const idbData = await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const getReq = tx.objectStore(IDB_STORE).get(IDB_KEY);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      });
      if (Array.isArray(idbData) && idbData.length > 0) {
        __inMemoryCustomHrList = idbData;
        registerBulkEmployeesInMemory(idbData);
        return idbData;
      }
    }
  } catch (e) {}
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_HR) || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      __inMemoryCustomHrList = parsed;
      registerBulkEmployeesInMemory(parsed);
      return parsed;
    }
  } catch (e) {}
  return [];
}

/**
 * Đọc trực tiếp dữ liệu từ tab bất kỳ của Google Sheet thông qua Google Visualization JSONP (không bị chặn CORS)
 */
function loadSheetViaGvizJsonp(sheetId, gid, timeoutMs = 4500) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const cbName = "__ftelGvizCb_" + gid + "_" + Math.floor(Math.random() * 1000000);
    let settled = false;
    const script = document.createElement("script");

    const cleanup = () => {
      try {
        delete window[cbName];
      } catch (e) {
        window[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    window[cbName] = (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (!response || response.status !== "ok" || !response.table) {
        resolve(null);
        return;
      }
      const cols = (response.table.cols || []).map(c => String(c?.label || "").trim());
      const rows = (response.table.rows || []).map(r =>
        (r?.c || []).map(cell => (cell && cell.f ? String(cell.f).trim() : cell && cell.v !== null && typeof cell.v !== "undefined" ? String(cell.v).trim() : ""))
      );
      const allRows = cols.some(Boolean) ? [cols, ...rows] : rows;
      resolve(allRows);
    };

    script.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(null);
      }
    };

    script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&tqx=out:json;responseHandler:${cbName}&_ts=${Date.now()}`;
    document.head.appendChild(script);
  });
}

/**
 * Tự động nhận diện cột Email/Account, Họ tên, Đơn vị từ bảng 2 chiều của Sheet DS Nhân sự (gid=1084168011)
 * Hỗ trợ chính xác cả khi tìm theo Họ tên (có dấu / không dấu) lẫn Email / Account cho quy mô 24.608+ nhân sự
 */
export function parseRowsIntoHrDirectory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const firstRow = rows[0].map(c => String(c || "").trim().toLowerCase());
  const hasHeader = firstRow.some(h =>
    h.includes("email") || h.includes("mail") || h.includes("họ") || h.includes("tên") || h.includes("name") || h.includes("đơn vị") || h.includes("phòng") || h.includes("account") || h.includes("stt") || h.includes("mã") || h.includes("bộ phận") || h.includes("chi nhánh")
  );

  let emailCol = -1;
  let accountCol = -1;
  let nameCol = -1;
  let lastNameCol = -1;
  let firstNameCol = -1;
  let deptCol = -1;
  let roleCol = -1;
  const ignoredCols = new Set();

  if (hasHeader) {
    for (let c = 0; c < firstRow.length; c++) {
      const h = firstRow[c];
      if (!h) continue;

      const isCodeOrIndex = h === "stt" || h === "no" || h === "id" || h.includes("mã ") || h.startsWith("mã") || h.includes("msnv") || h.includes("empid");
      const isDeptHeader = h.includes("đơn vị") || h.includes("phòng ban") || h.includes("bộ phận") || h.includes("chi nhánh") || h.includes("trung tâm") || h.includes("khối") || h.includes("vùng") || h.includes("miền") || h.includes("dept") || h.includes("department") || h.includes("unit") || h.includes("branch") || h.includes("ban ");
      const isEmailHeader = h.includes("email") || h.includes("e-mail") || h.includes("mail") || h.includes("thư điện tử");
      const isAccountHeader = h.includes("account") || h.includes("tài khoản") || h.includes("username") || h.includes("user name") || h === "acc" || h === "user";
      const isRoleHeader = h.includes("chức danh") || h.includes("chức vụ") || h.includes("vị trí") || h.includes("vai trò") || h.includes("role") || h.includes("title");

      if (isCodeOrIndex) {
        ignoredCols.add(c);
        continue;
      }
      if (deptCol === -1 && isDeptHeader) {
        deptCol = c;
        continue;
      }
      if (emailCol === -1 && isEmailHeader) {
        emailCol = c;
        continue;
      }
      if (accountCol === -1 && isAccountHeader) {
        accountCol = c;
        continue;
      }
      if (roleCol === -1 && isRoleHeader) {
        roleCol = c;
        continue;
      }

      // Nhận diện Họ và tên đầy đủ hoặc cột Họ / Tên tách rời (không nhầm với Tên đơn vị / Mã CBNV)
      if (nameCol === -1 && (h.includes("họ và tên") || h.includes("họ tên") || h.includes("full name") || h.includes("fullname") || h.includes("tên nhân viên") || h.includes("tên nhân sự") || h.includes("tên cbnv") || h.includes("họ tên cbnv") || h.includes("người lao động"))) {
        nameCol = c;
      } else if (lastNameCol === -1 && (h === "họ" || h.includes("họ đệm") || h.includes("họ và tên đệm") || h === "last name")) {
        lastNameCol = c;
      } else if (firstNameCol === -1 && (h === "tên" || h === "first name" || h === "name" || h === "nhân sự" || h === "cbnv")) {
        firstNameCol = c;
      }
    }
  }

  if (nameCol === -1 && firstNameCol !== -1 && lastNameCol === -1) {
    nameCol = firstNameCol;
  }
  if (emailCol === -1 && accountCol !== -1) {
    emailCol = accountCol;
  }

  const startIdx = hasHeader ? 1 : 0;
  const sampleLimit = Math.min(rows.length, startIdx + 35);
  const maxCols = rows.slice(0, sampleLimit).reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);

  // Kiểm chứng bằng dữ liệu thực tế trên 35 dòng đầu tiên để đảm bảo chính xác 100%
  if (rows.length > startIdx && maxCols > 0) {
    let bestAtCol = -1;
    let bestAtCount = 0;

    for (let c = 0; c < maxCols; c++) {
      let atCount = 0;
      for (let r = startIdx; r < sampleLimit; r++) {
        const val = String((rows[r] && rows[r][c]) || "").trim();
        if (val.includes("@")) atCount++;
      }
      if (atCount > bestAtCount) {
        bestAtCount = atCount;
        bestAtCol = c;
      }
    }
    if (bestAtCol !== -1 && bestAtCount >= 1) {
      emailCol = bestAtCol;
    }

    // Kiểm tra xem nameCol đã trỏ đúng vào cột Họ tên người chưa (tránh cột STT số hoặc cột trống)
    const isLikelyPersonNameCol = (colIdx) => {
      if (colIdx < 0 || colIdx >= maxCols || colIdx === emailCol) return false;
      let validNameCells = 0;
      let nonEmptyCells = 0;
      for (let r = startIdx; r < sampleLimit; r++) {
        const val = String((rows[r] && rows[r][colIdx]) || "").trim();
        if (!val) continue;
        nonEmptyCells++;
        if (!val.includes("@") && !/^\d+$/.test(val) && /[a-zA-ZÀ-ỹ]/.test(val)) {
          validNameCells++;
        }
      }
      return nonEmptyCells > 0 && validNameCells / nonEmptyCells >= 0.5;
    };

    if (!isLikelyPersonNameCol(nameCol) && !(lastNameCol !== -1 && firstNameCol !== -1)) {
      let bestNameCol = -1;
      let bestNameScore = -1;

      for (let c = 0; c < maxCols; c++) {
        if (c === emailCol || c === deptCol || c === accountCol || ignoredCols.has(c)) continue;
        let multiWordCount = 0;
        let alphaCount = 0;
        let numericCount = 0;
        const uniqueVals = new Set();

        for (let r = startIdx; r < sampleLimit; r++) {
          const val = String((rows[r] && rows[r][c]) || "").trim();
          if (!val) continue;
          if (/^\d+$/.test(val)) {
            numericCount++;
            continue;
          }
          if (val.includes("@")) continue;
          if (/[a-zA-ZÀ-ỹ]/.test(val)) {
            alphaCount++;
            uniqueVals.add(val.toLowerCase());
            const words = val.split(/\s+/);
            if (words.length >= 2 && words.length <= 6) {
              multiWordCount++;
            }
          }
        }

        if (alphaCount > numericCount && alphaCount > 0) {
          // Ưu tiên cột có nhiều từ (Họ + Tên đệm + Tên) và độ đa dạng cao giữa các dòng
          const score = multiWordCount * 3 + uniqueVals.size * 2 + alphaCount;
          if (score > bestNameScore) {
            bestNameScore = score;
            bestNameCol = c;
          }
        }
      }

      if (bestNameCol !== -1) {
        nameCol = bestNameCol;
      }
    }

    // Nếu chưa xác định được deptCol, chọn cột văn bản còn lại (không phải STT, email, name)
    if (deptCol === -1 || deptCol === emailCol || deptCol === nameCol) {
      for (let c = 0; c < maxCols; c++) {
        if (c === emailCol || c === nameCol || c === accountCol || c === lastNameCol || c === firstNameCol || ignoredCols.has(c)) continue;
        if (isLikelyPersonNameCol(c)) {
          deptCol = c;
          break;
        }
      }
    }
  }

  if (emailCol === -1) emailCol = 0;
  if (nameCol === -1) nameCol = emailCol === 0 ? 1 : 0;
  if (deptCol === -1) deptCol = Math.max(emailCol, nameCol) + 1;

  const list = [];
  const seenEmails = new Set();

  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.every(cell => !String(cell || "").trim())) continue;

    // 1. Lấy Email / Account
    let rawEmail = String(row[emailCol] || "").trim().toLowerCase();
    if (!rawEmail.includes("@")) {
      const foundAtIdx = row.findIndex(cell => String(cell || "").includes("@"));
      if (foundAtIdx !== -1) {
        rawEmail = String(row[foundAtIdx]).trim().toLowerCase();
      } else if (accountCol !== -1 && row[accountCol]) {
        rawEmail = String(row[accountCol]).trim().toLowerCase();
      }
    }

    // 2. Lấy Họ và tên đầy đủ (Hỗ trợ cả cột gộp lẫn cột Họ + Tên tách rời)
    let fullName = "";
    if (lastNameCol !== -1 && firstNameCol !== -1) {
      fullName = `${String(row[lastNameCol] || "").trim()} ${String(row[firstNameCol] || "").trim()}`.trim();
    }
    if (!fullName && nameCol >= 0 && nameCol < row.length) {
      fullName = String(row[nameCol] || "").trim();
    }

    // Nếu ô tên đang bị trống, chứa '@' hoặc chỉ là số STT -> tìm ô có chứa tên người trong dòng
    if (!fullName || fullName.includes("@") || /^\d+$/.test(fullName)) {
      for (let c = 0; c < row.length; c++) {
        if (c === emailCol || c === deptCol || c === accountCol || ignoredCols.has(c)) continue;
        const candidate = String(row[c] || "").trim();
        if (candidate && !candidate.includes("@") && !/^\d+$/.test(candidate) && /[a-zA-ZÀ-ỹ]/.test(candidate)) {
          fullName = candidate;
          break;
        }
      }
    }

    const deptName = (deptCol >= 0 && deptCol < row.length ? String(row[deptCol] || "").trim() : "") || "FPT Telecom";
    const roleName = (roleCol !== -1 && roleCol < row.length ? String(row[roleCol] || "").trim() : "") || "CBNV FPT Telecom";

    if (!rawEmail && !fullName) continue;
    // Không biến một chuỗi có khoảng trắng (Họ tên) thành email
    if (!rawEmail && fullName.includes(" ")) continue;

    const cleanRawEmail = rawEmail.replace(/\s+/g, "");
    const email = cleanRawEmail.includes("@") ? cleanRawEmail : (cleanRawEmail ? `${cleanRawEmail}@fpt.com` : "");
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    if (!fullName || /^\d+$/.test(fullName) || fullName.toLowerCase() === email) {
      const known = lookupEmployeeInfo(email);
      fullName = (known && known.name) ? known.name : email.split("@")[0].toUpperCase();
    }

    // Lưu thêm toàn bộ các ô chữ trong dòng vào keywords để tìm kiếm bất kỳ cột nào cũng khớp
    const extraParts = [];
    for (let c = 0; c < row.length; c++) {
      const cellStr = String(row[c] || "").trim();
      if (cellStr && cellStr !== fullName && cellStr !== email && cellStr !== deptName) {
        extraParts.push(cellStr);
      }
    }

    list.push({
      name: fullName,
      email: email,
      dept: deptName,
      role: roleName,
      keywords: extraParts.join(" "),
      sentCount: 0,
      receivedCount: 0
    });
  }

  registerBulkEmployeesInMemory(list);
  return list;
}

/**
 * Gọi Google Apps Script thông qua thẻ <script> JSONP (hỗ trợ cả /a/macros/fpt.com/s/... khi có cookie đăng nhập)
 */
function loadAppsScriptViaJsonp(rawUrl, action = "get_dashboard", timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !rawUrl) {
      resolve(null);
      return;
    }
    const cbName = "__ftelGasCb_" + Math.floor(Math.random() * 1000000);
    let settled = false;
    const script = document.createElement("script");

    const cleanup = () => {
      try {
        delete window[cbName];
      } catch (e) {
        window[cbName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    window[cbName] = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(res || null);
    };

    script.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        cleanup();
        resolve(null);
      }
    };

    const delimiter = rawUrl.includes("?") ? "&" : "?";
    script.src = `${rawUrl}${delimiter}action=${encodeURIComponent(action)}&callback=${cbName}&_ts=${Date.now()}`;
    document.head.appendChild(script);
  });
}

export class ApiService {
  /**
   * Kiểm tra xem đang chạy chế độ Mock hay kết nối Google Apps Script thực tế
   */
  static isMockMode() {
    const url = getEffectiveScriptUrl();
    return !url || url.trim() === "" || url.includes("PASTE_YOUR");
  }

  /**
   * Kiểm tra trùng lặp: Mỗi tài khoản người gửi chỉ được gửi cho mỗi người nhận 1 lần duy nhất trong toàn chiến dịch
   */
  static isDuplicatePair(senderEmail, recipientEmail) {
    try {
      const s = String(senderEmail || "").trim().toLowerCase();
      const r = String(recipientEmail || "").trim().toLowerCase();
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || "[]");
      return existing.some(item => {
        const isSameSender = String(item.senderEmail || "").trim().toLowerCase() === s;
        const isSameRec = String(item.recipientEmail || "").trim().toLowerCase() === r;
        return isSameSender && isSameRec;
      });
    } catch (e) {
      return false;
    }
  }

  static isDuplicateTriplet(senderEmail, recipientEmail, message) {
    return this.isDuplicatePair(senderEmail, recipientEmail);
  }

  /**
   * Gửi lời tri ân (kèm kiểm tra trùng theo cặp người gửi - người nhận & chuẩn hóa chính tả tự động)
   */
  static async submitGratitude(payload) {
    // 1. Client-side Domain Validation
    const senderEmail = (payload.senderEmail || "").trim().toLowerCase();
    const recipientEmail = (payload.recipientEmail || "").trim().toLowerCase();
    const rawMessage = (payload.message || "").trim();

    const allowedDomains = ["fpt.net", "fpt.com", "vienthongtin.com"];
    const isSenderValid = allowedDomains.some(d => senderEmail.endsWith("@" + d));
    const isRecipientValid = allowedDomains.some(d => recipientEmail.endsWith("@" + d));

    if (!isSenderValid) {
      throw new Error("Email người gửi phải thuộc miền FPT (@fpt.com / @fpt.net / @vienthongtin.com)!");
    }
    if (!isRecipientValid) {
      throw new Error("Email người nhận phải thuộc miền FPT (@fpt.com / @fpt.net / @vienthongtin.com)!");
    }
    if (senderEmail === recipientEmail) {
      throw new Error("Bạn không thể tự gửi lời cảm ơn cho chính mình!");
    }

    // 2. Kiểm tra trùng: Mỗi tài khoản chỉ được gửi cho 1 đồng nghiệp 1 lần duy nhất để tránh spam
    if (this.isDuplicatePair(senderEmail, recipientEmail)) {
      throw new Error("Phát hiện trùng lặp: Bạn đã gửi lời tri ân đến đồng nghiệp này rồi. Theo thể lệ chương trình, mỗi người chỉ gửi 1 lần cho cùng một đồng nghiệp để tránh spam!");
    }

    // 3. Tự động điền thêm thông tin từ DS nhân sự & chuẩn hóa chính tả
    const senderHr = lookupEmployeeInfo(senderEmail);
    const recipientHr = lookupEmployeeInfo(recipientEmail);
    const cleanedMessage = cleanAndCorrectVietnameseText(rawMessage);

    payload = {
      ...payload,
      senderName: payload.senderName || senderHr.name || senderEmail.split("@")[0].toUpperCase(),
      senderDept: payload.senderDept || senderHr.dept || "FPT Telecom",
      recipientName: payload.recipientName || recipientHr.name || recipientEmail.split("@")[0].toUpperCase(),
      recipientDept: payload.recipientDept || recipientHr.dept || "FPT Telecom",
      rawMessage: rawMessage,
      message: cleanedMessage
    };

    const now = Date.now();

    // 4. Nếu đã cấu hình Google Apps Script Backend
    if (!this.isMockMode()) {
      try {
        const scriptUrl = getEffectiveScriptUrl();
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "submit_gratitude",
            ...payload
          })
        });

        if (!response.ok) {
          throw new Error(`Google Apps Script trả về lỗi HTTP ${response.status}`);
        }

        let result = { success: true, message: "Gửi lời tri ân thành công!", data: { submissionId: "FTEL-GS-" + Date.now(), recipientName: payload.recipientName, emailSentStatus: "SENT" } };
        try {
          const parsed = await response.json();
          if (parsed && typeof parsed.success !== 'undefined') {
            result = parsed;
          }
        } catch (jsonErr) {}

        if (!result.success) {
          throw new Error(result.message || "Không thể gửi dữ liệu lên Google Sheets.");
        }

        localStorage.setItem(STORAGE_KEY_LAST_SUBMIT, now.toString());
        this.saveLocalBackup(payload, result.data?.submissionId || "SUBMITTED");
        this.updateMockLeaderboard(payload);
        return { ...result, isCloudSaved: true, cleanedMessage };
      } catch (err) {
        if (err.message && err.message.includes("trùng lặp")) {
          throw err;
        }
        console.warn("Lỗi gửi tới Google Apps Script thực, chuyển sang lưu dự phòng:", err);
        const mockRes = await this.mockSubmit(payload);
        return { 
          ...mockRes, 
          isCloudSaved: false, 
          cleanedMessage,
          cloudError: err.message || "Không thể kết nối Google Apps Script" 
        };
      }
    }

    // 5. Nếu đang ở chế độ Mock/Demo
    return this.mockSubmit(payload);
  }

  /**
   * Giả lập gửi khi chưa kết nối Google Sheet
   */
  static async mockSubmit(payload) {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulating network latency
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY_LAST_SUBMIT, now.toString());

    const submissionId = "FTEL-DEMO-" + Math.floor(Math.random() * 100000);
    this.saveLocalBackup(payload, submissionId);

    // Update mock leaderboard
    this.updateMockLeaderboard(payload);

    return {
      success: true,
      message: "Gửi lời tri ân thành công!",
      data: {
        submissionId: submissionId,
        recipientName: payload.recipientName,
        emailSentStatus: "SENT_MOCK"
      }
    };
  }

  /**
   * Lưu bản sao lưu vào LocalStorage
   */
  static saveLocalBackup(payload, submissionId) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || "[]");
      existing.unshift({
        id: submissionId,
        timestamp: new Date().toISOString(),
        ...payload
      });
      localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(existing));
    } catch (e) {
      console.error("Local backup error:", e);
    }
  }

  /**
   * Cập nhật danh sách vinh danh mock
   */
  static updateMockLeaderboard(payload) {
    try {
      const customBoard = JSON.parse(localStorage.getItem("ftel_mock_board") || JSON.stringify(MOCK_LEADERBOARD));
      const targetEmail = payload.recipientEmail.toLowerCase();
      const existingMentor = customBoard.find(m => m.email === targetEmail);

      if (existingMentor) {
        existingMentor.count += 1;
      } else {
        customBoard.push({
          name: payload.recipientName,
          email: payload.recipientEmail,
          dept: payload.recipientDept || "FPT Telecom",
          role: payload.recipientRole || "Mentor",
          count: 1
        });
      }

      customBoard.sort((a, b) => b.count - a.count);
      customBoard.forEach((m, idx) => {
        m.rank = idx + 1;
        if (m.rank === 1) m.badge = "gold";
        else if (m.rank === 2) m.badge = "silver";
        else if (m.rank === 3) m.badge = "bronze";
        else delete m.badge;
      });

      localStorage.setItem("ftel_mock_board", JSON.stringify(customBoard));
    } catch (e) {
      console.error("Leaderboard update error:", e);
    }
  }

  /**
   * Lấy danh sách nhân sự đã được đồng bộ / dán từ Sheet DS nhân sự (gid=1084168011 - hỗ trợ 24.608+ nhân sự qua IndexedDB)
   */
  static async getStoredCustomHrListAsync() {
    return await loadHrListFromStorage();
  }

  static getStoredCustomHrList() {
    if (Array.isArray(__inMemoryCustomHrList) && __inMemoryCustomHrList.length > 0) {
      return __inMemoryCustomHrList;
    }
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM_HR) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Đồng bộ trực tiếp từ Sheet DS Nhân sự (gid=1084168011) thông qua Google Visualization JSONP
   */
  static async syncHrDirectoryFromGoogleSheet() {
    try {
      const rows = await loadSheetViaGvizJsonp(GOOGLE_SHEET_ID, GOOGLE_HR_SHEET_GID, 6500);
      if (Array.isArray(rows) && rows.length > 0) {
        const parsedList = parseRowsIntoHrDirectory(rows);
        if (parsedList.length > 0) {
          await saveHrListToStorage(parsedList);
          return { success: true, count: parsedList.length, list: parsedList, source: "google_sheet_gviz" };
        }
      }
    } catch (e) {
      console.warn("GVIZ sync warning:", e);
    }
    return { success: false, count: 0, list: [] };
  }

  /**
   * Đọc trực tiếp tab Câu trả lời Google Form (gid=1557167031) qua GVIZ JSONP và tổng hợp số liệu Real-time
   */
  static async syncFormResponsesFromGoogleSheet(hrList = []) {
    try {
      const rows = await loadSheetViaGvizJsonp(GOOGLE_SHEET_ID, GOOGLE_SHEET_GID, 4500);
      if (!Array.isArray(rows) || rows.length <= 1) return null;

      // Tạo map tra cứu nhanh HR từ DS nhân sự (gid=1084168011)
      const hrMap = new Map();
      (hrList || []).forEach(emp => {
        if (!emp || !emp.email) return;
        const emailLower = String(emp.email).trim().toLowerCase();
        const local = emailLower.split("@")[0];
        hrMap.set(emailLower, emp);
        if (local) {
          hrMap.set(local, emp);
          hrMap.set(`${local}@fpt.com`, emp);
          hrMap.set(`${local}@fpt.net`, emp);
        }
      });

      const resolvePerson = (rawEmail, fallbackName, fallbackDept) => {
        const clean = String(rawEmail || "").trim().toLowerCase();
        const local = clean.split("@")[0];
        const found = hrMap.get(clean) || (local ? hrMap.get(local) : null) || lookupEmployeeInfo(clean);
        return {
          email: clean || (local ? `${local}@fpt.com` : ""),
          name: (found && found.name) || fallbackName || (local ? local.toUpperCase() : "Đồng nghiệp FTEL"),
          dept: (found && found.dept && found.dept !== "FPT Telecom" ? found.dept : "") || fallbackDept || "FPT Telecom"
        };
      };

      const seenTriplets = new Set();
      let totalFlames = 0;
      const recipientSet = new Set();
      const senderSet = new Set();
      const unitSet = new Set();
      const recipientStatsMap = {};
      const early100Senders = [];
      const seenEarlySenders = new Set();
      const unitStatsMap = {};

      const ensureUnit = (uName) => {
        const key = String(uName || "FPT Telecom").trim() || "FPT Telecom";
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

      (hrList || []).forEach(emp => {
        const uObj = ensureUnit(emp.dept);
        uObj.membersMap[emp.email] = { ...emp, sentCount: 0, receivedCount: 0 };
      });

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!Array.isArray(r) || r.length < 3) continue;
        const timestamp = String(r[0] || "").trim();
        const rawSender = String(r[1] || "").trim().toLowerCase();
        const rawRec = String(r[2] || "").trim().toLowerCase();
        const role = String(r[3] || "Giảng viên – Người truyền tri thức").trim();
        const rawMsg = String(r[4] || "").trim();
        const checkStatus = String(r[10] || "").trim();

        if (!rawSender || !rawRec || !rawMsg) continue;
        if (checkStatus === "TRÙNG LẶP") continue;

        const dupKey = `${rawSender}|||${rawRec}|||${rawMsg.toLowerCase().replace(/\s+/g, " ")}`;
        if (seenTriplets.has(dupKey)) continue;
        seenTriplets.add(dupKey);

        const sInfo = resolvePerson(rawSender, r[5], r[6]);
        const rInfo = resolvePerson(rawRec, r[7], r[8]);

        totalFlames++;
        recipientSet.add(rInfo.email);
        senderSet.add(sInfo.email);
        unitSet.add(sInfo.dept);
        unitSet.add(rInfo.dept);

        if (!recipientStatsMap[rInfo.email]) {
          recipientStatsMap[rInfo.email] = {
            name: rInfo.name,
            email: rInfo.email,
            dept: rInfo.dept,
            role: role,
            count: 0
          };
        }
        recipientStatsMap[rInfo.email].count++;

        if (!seenEarlySenders.has(sInfo.email) && early100Senders.length < 100) {
          seenEarlySenders.add(sInfo.email);
          early100Senders.push({
            order: early100Senders.length + 1,
            name: sInfo.name,
            email: sInfo.email,
            dept: sInfo.dept,
            recipientName: rInfo.name,
            timestamp: timestamp
          });
        }

        const recU = ensureUnit(rInfo.dept);
        recU.totalFlames++;
        recU.flamesList.push({
          senderName: sInfo.name,
          senderEmail: sInfo.email,
          senderDept: sInfo.dept,
          recipientName: rInfo.name,
          recipientEmail: rInfo.email,
          recipientDept: rInfo.dept,
          role: role,
          timestamp: timestamp
        });
        if (!recU.recipientsMap[rInfo.email]) {
          recU.recipientsMap[rInfo.email] = { name: rInfo.name, email: rInfo.email, dept: rInfo.dept, role, count: 0 };
        }
        recU.recipientsMap[rInfo.email].count++;

        const sndU = ensureUnit(sInfo.dept);
        if (!sndU.sendersMap[sInfo.email]) {
          sndU.sendersMap[sInfo.email] = { name: sInfo.name, email: sInfo.email, dept: sInfo.dept, count: 0, latestTimestamp: timestamp };
        }
        sndU.sendersMap[sInfo.email].count++;
        sndU.sendersMap[sInfo.email].latestTimestamp = timestamp;
      }

      if (totalFlames === 0) return null;

      const top30Recipients = Object.values(recipientStatsMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30)
        .map((item, idx) => ({
          rank: idx + 1,
          ...item,
          badge: idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : ""
        }));

      const unitSpread = Object.values(unitStatsMap)
        .map(u => {
          const sendersList = Object.values(u.sendersMap).sort((a, b) => b.count - a.count);
          const recipientsList = Object.values(u.recipientsMap).sort((a, b) => b.count - a.count);
          const membersList = Object.values(u.membersMap);
          return {
            unit: u.unit,
            totalFlames: u.totalFlames,
            senderCount: sendersList.length,
            recipientCount: recipientsList.length,
            memberCount: membersList.length,
            flamesList: u.flamesList.slice().reverse(),
            sendersList,
            recipientsList,
            membersList
          };
        })
        .sort((a, b) => b.totalFlames - a.totalFlames || b.memberCount - a.memberCount);

      return {
        overview: {
          totalFlames,
          uniqueRecipients: recipientSet.size,
          uniqueSenders: senderSet.size,
          uniqueUnits: unitSet.size || unitSpread.length
        },
        totalFlames,
        uniqueRecipients: recipientSet.size,
        uniqueSenders: senderSet.size,
        uniqueUnits: unitSet.size || unitSpread.length,
        top30Recipients,
        early100Senders,
        unitSpread,
        hrDirectory: hrList.length > 0 ? hrList : MOCK_HR_DIRECTORY,
        pendingRender: [],
        isLiveSheet: true,
        hrSyncSource: "google_sheet_gviz"
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Nhập nhanh danh sách nhân sự (hỗ trợ 24.608+ nhân sự qua Copy-Paste hoặc File CSV/TSV)
   */
  static async importHrDirectoryFromText(rawText) {
    if (!rawText || !String(rawText).trim()) {
      throw new Error("Vui lòng dán nội dung hoặc chọn file CSV/TSV từ Sheet DS Nhân sự!");
    }
    const lines = String(rawText)
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    const rows = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("\t")) {
        rows[i] = line.split("\t").map(c => c.trim());
      } else if (line.includes(";")) {
        rows[i] = line.split(";").map(c => c.trim());
      } else {
        rows[i] = line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
      }
    }

    const parsedList = parseRowsIntoHrDirectory(rows);
    if (parsedList.length === 0) {
      throw new Error("Không nhận diện được dòng nhân sự hợp lệ. Hãy đảm bảo dữ liệu có chứa cột Email (@fpt.com / @fpt.net) và Họ tên!");
    }

    // Nếu người dùng nạp danh sách lớn (> 500 nhân sự, VD 24.608 nhân sự), dùng nguyên danh sách mới để khớp chính xác 100% số lượng với Sheet
    let finalList = parsedList;
    if (parsedList.length < 500) {
      const existing = await this.getStoredCustomHrListAsync();
      const mergedMap = new Map();
      for (let i = 0; i < existing.length; i++) {
        const emp = existing[i];
        if (emp && emp.email) mergedMap.set(String(emp.email).trim().toLowerCase(), emp);
      }
      for (let i = 0; i < parsedList.length; i++) {
        const emp = parsedList[i];
        if (emp && emp.email) mergedMap.set(String(emp.email).trim().toLowerCase(), emp);
      }
      finalList = Array.from(mergedMap.values());
    }

    await saveHrListToStorage(finalList);

    return {
      success: true,
      importedCount: parsedList.length,
      totalCount: finalList.length,
      list: finalList
    };
  }

  /**
   * Hợp nhất Danh sách Nhân sự O(N) siêu tốc (hỗ trợ 24.608+ nhân sự không bị lag) và cập nhật lại Thống kê Đơn vị
   */
  static mergeHrDirectoryIntoDashboard(baseData, extraHrLists = []) {
    const empByAccount = new Map();
    const hasLargeRealHr = extraHrLists.some(list => Array.isArray(list) && list.length > 300) ||
      (Array.isArray(baseData.hrDirectory) && baseData.hrDirectory.length > 300);

    const addEmp = (emp, isPriority = false) => {
      if (!emp || (!emp.email && !emp.name)) return;
      const cleanEmail = String(emp.email || "").trim().toLowerCase();
      const localPart = cleanEmail.split("@")[0] || String(emp.name || "").trim().toLowerCase();
      if (!localPart) return;

      let candidateName = String(emp.name || "").trim();
      if (!candidateName || /^\d+$/.test(candidateName) || candidateName.toLowerCase() === localPart || candidateName.toLowerCase() === cleanEmail) {
        const known = lookupEmployeeInfo(cleanEmail || localPart);
        if (known && known.name && !/^\d+$/.test(known.name)) {
          candidateName = known.name;
        }
      }

      const existing = empByAccount.get(localPart);
      if (!existing) {
        empByAccount.set(localPart, {
          name: candidateName || localPart.toUpperCase(),
          email: cleanEmail || `${localPart}@fpt.com`,
          dept: emp.dept || "FPT Telecom",
          role: emp.role || "CBNV FPT Telecom",
          avatar: emp.avatar || "",
          keywords: emp.keywords || "",
          sentCount: Number(emp.sentCount || 0),
          receivedCount: Number(emp.receivedCount || 0)
        });
      } else {
        const isBetterName = candidateName && !/^\d+$/.test(candidateName) && (candidateName.includes(" ") || existing.name.toLowerCase() === localPart || /^\d+$/.test(existing.name));
        if ((isPriority && candidateName && !/^\d+$/.test(candidateName)) || isBetterName) {
          existing.name = candidateName;
        }
        if (isPriority && emp.dept && emp.dept !== "FPT Telecom") existing.dept = emp.dept;
        if (isPriority && cleanEmail) existing.email = cleanEmail;
        if (emp.avatar && !existing.avatar) existing.avatar = emp.avatar;
        if (emp.keywords && !existing.keywords) existing.keywords = emp.keywords;
        existing.sentCount = Math.max(existing.sentCount || 0, Number(emp.sentCount || 0));
        existing.receivedCount = Math.max(existing.receivedCount || 0, Number(emp.receivedCount || 0));
      }
    };

    // 1. Nếu chưa có danh sách thực > 300 người mới nạp danh sách mẫu 295 người; nếu đã có DS 24.608 nhân sự thực thì lấy đúng số lượng thực!
    if (!hasLargeRealHr) {
      (baseData.hrDirectory || MOCK_HR_DIRECTORY).forEach(e => addEmp(e, false));
    } else if (Array.isArray(baseData.hrDirectory) && baseData.hrDirectory.length > 300) {
      baseData.hrDirectory.forEach(e => addEmp(e, true));
    }

    // 2. Nạp danh sách từ Sheet gid=1084168011 / IndexedDB
    extraHrLists.forEach(list => {
      if (Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          addEmp(list[i], true);
        }
      }
    });

    const mergedHrDirectory = Array.from(empByAccount.values());
    registerBulkEmployeesInMemory(mergedHrDirectory);

    // Cập nhật lại membersList của từng Đơn vị trong unitSpread với độ phức tạp O(N) bằng Set
    const unitMap = new Map();
    const unitMemberKeySets = new Map();

    (baseData.unitSpread || MOCK_UNIT_SPREAD).forEach(u => {
      const mList = hasLargeRealHr ? [] : (Array.isArray(u.membersList) ? [...u.membersList] : []);
      const keySet = new Set();
      for (let i = 0; i < mList.length; i++) {
        const k = String(mList[i].email || "").toLowerCase().split("@")[0];
        if (k) keySet.add(k);
      }
      unitMemberKeySets.set(u.unit, keySet);
      unitMap.set(u.unit, {
        ...u,
        flamesList: Array.isArray(u.flamesList) ? u.flamesList : [],
        sendersList: Array.isArray(u.sendersList) ? u.sendersList : [],
        recipientsList: Array.isArray(u.recipientsList) ? u.recipientsList : [],
        membersList: mList
      });
    });

    for (let i = 0; i < mergedHrDirectory.length; i++) {
      const emp = mergedHrDirectory[i];
      const unitName = emp.dept || "FPT Telecom";
      if (!unitMap.has(unitName)) {
        unitMemberKeySets.set(unitName, new Set());
        unitMap.set(unitName, {
          unit: unitName,
          totalFlames: emp.receivedCount || 0,
          senderCount: emp.sentCount > 0 ? 1 : 0,
          recipientCount: emp.receivedCount > 0 ? 1 : 0,
          memberCount: 0,
          flamesList: [],
          sendersList: [],
          recipientsList: [],
          membersList: []
        });
      }
      const uObj = unitMap.get(unitName);
      const keySet = unitMemberKeySets.get(unitName);
      const localKey = emp.email.split("@")[0];
      if (!keySet.has(localKey)) {
        keySet.add(localKey);
        uObj.membersList.push(emp);
      }
      uObj.memberCount = uObj.membersList.length;
    }

    const finalUnits = Array.from(unitMap.values()).sort(
      (a, b) => (b.totalFlames || 0) - (a.totalFlames || 0) || (b.memberCount || 0) - (a.memberCount || 0)
    );

    return {
      ...baseData,
      uniqueUnits: Math.max(baseData.uniqueUnits || 0, finalUnits.length),
      unitSpread: finalUnits,
      hrDirectory: mergedHrDirectory
    };
  }

  /**
   * Lấy toàn bộ dữ liệu Live Dashboard (Khu vực B - C - D) từ Google Sheet (hoặc Mock kết hợp Local)
   */
  static async getFullDashboardData() {
    // 1. Thử đồng bộ trực tiếp tab DS Nhân sự (gid=1084168011) qua Google Visualization JSONP + IndexedDB
    const gvizHrSync = await this.syncHrDirectoryFromGoogleSheet();
    const customHrList = await this.getStoredCustomHrListAsync();
    const activeHrList = gvizHrSync.list.length > 0 ? gvizHrSync.list : customHrList;

    // 2. Thử đọc trực tiếp cả tab Câu trả lời Google Form (gid=1557167031) qua GVIZ JSONP
    const directFormSheetData = await this.syncFormResponsesFromGoogleSheet(activeHrList);
    if (directFormSheetData) {
      return this.mergeHrDirectoryIntoDashboard(directFormSheetData, [gvizHrSync.list, customHrList]);
    }

    if (!this.isMockMode()) {
      try {
        const scriptUrl = getEffectiveScriptUrl();
        const delimiter = scriptUrl.includes('?') ? '&' : '?';
        let result = null;
        try {
          const response = await fetchAppsScript(`${scriptUrl}${delimiter}action=get_dashboard`);
          const text = await response.text();
          if (text && text.trim().startsWith("{")) {
            result = JSON.parse(text);
          }
        } catch (fetchErr) {
          // Nếu fetch bị chặn CORS bởi domain /a/macros/fpt.com, thử gọi qua thẻ <script> JSONP
        }

        if (!result) {
          result = await loadAppsScriptViaJsonp(scriptUrl, "get_dashboard", 5500);
        }

        if (result && result.success && result.data) {
          const d = result.data;
          // Giải nén hrCompact (24.608+ nhân sự) nếu được trả về từ Code.gs mới
          let unpackedHr = Array.isArray(d.hrDirectory) ? d.hrDirectory : [];
          if (Array.isArray(d.hrCompact) && d.hrCompact.length > 0) {
            unpackedHr = d.hrCompact.map(item => ({
              email: item[0] || "",
              name: item[1] || "",
              dept: item[2] || "FPT Telecom",
              role: "CBNV FPT Telecom",
              sentCount: Number(item[3] || 0),
              receivedCount: Number(item[4] || 0)
            }));
            await saveHrListToStorage(unpackedHr);
          }

          if (typeof d.totalFlames !== 'undefined' && Array.isArray(d.top30Recipients)) {
            const totalFlames = d.totalFlames || d.totalSubmissions || 0;
            const uniqueRecipients = d.uniqueRecipients || 0;
            const uniqueSenders = d.uniqueSenders || 0;
            const uniqueUnits = d.uniqueUnits || 0;
            const rawUnitSpread = Array.isArray(d.unitSpread) && d.unitSpread.length > 0 ? d.unitSpread : MOCK_UNIT_SPREAD;
            const enrichedUnitSpread = rawUnitSpread.map(u => {
              const fallbackMock = MOCK_UNIT_SPREAD.find(m => m.unit === u.unit) || {};
              return {
                ...fallbackMock,
                ...u,
                flamesList: Array.isArray(u.flamesList) && u.flamesList.length > 0 ? u.flamesList : (fallbackMock.flamesList || []),
                sendersList: Array.isArray(u.sendersList) && u.sendersList.length > 0 ? u.sendersList : (fallbackMock.sendersList || []),
                recipientsList: Array.isArray(u.recipientsList) && u.recipientsList.length > 0 ? u.recipientsList : (fallbackMock.recipientsList || []),
                membersList: Array.isArray(u.membersList) && u.membersList.length > 0 ? u.membersList : (fallbackMock.membersList || [])
              };
            });
            const liveBase = {
              overview: { totalFlames, uniqueRecipients, uniqueSenders, uniqueUnits },
              totalFlames,
              uniqueRecipients,
              uniqueSenders,
              uniqueUnits,
              top30Recipients: d.top30Recipients.length > 0 ? d.top30Recipients : MOCK_LEADERBOARD,
              early100Senders: Array.isArray(d.early100Senders) && d.early100Senders.length > 0 ? d.early100Senders : MOCK_EARLY_100,
              unitSpread: enrichedUnitSpread,
              hrDirectory: unpackedHr.length > 0 ? unpackedHr : MOCK_HR_DIRECTORY,
              pendingRender: d.pendingRender || [],
              isLiveSheet: true,
              hrSyncSource: gvizHrSync.success ? "google_sheet_gviz" : "apps_script"
            };
            return this.mergeHrDirectoryIntoDashboard(liveBase, [unpackedHr, gvizHrSync.list, customHrList]);
          }
        }
      } catch (err) {
        console.warn("Đang dùng dữ liệu Dashboard tổng hợp (Local/Demo):", err);
      }
    }

    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || "[]");
    const board = JSON.parse(localStorage.getItem("ftel_mock_board") || JSON.stringify(MOCK_LEADERBOARD));
    const earlyList = [...MOCK_EARLY_100];

    submissions.slice().reverse().forEach(sub => {
      if (!earlyList.some(e => e.email === sub.senderEmail)) {
        earlyList.push({
          order: earlyList.length + 1,
          name: sub.senderName || "Đồng nghiệp FTEL",
          email: sub.senderEmail || "",
          dept: sub.senderDept || "FPT Telecom",
          recipientName: sub.recipientName || "",
          timestamp: new Date(sub.timestamp || Date.now()).toLocaleString("vi-VN")
        });
      }
    });

    const totalFlames = 313 + submissions.length;
    const uniqueRecipients = board.length;
    const uniqueSenders = 227 + submissions.length;
    const uniqueUnits = MOCK_UNIT_SPREAD.length;

    const fallbackBase = {
      overview: { totalFlames, uniqueRecipients, uniqueSenders, uniqueUnits },
      totalFlames,
      uniqueRecipients,
      uniqueSenders,
      uniqueUnits,
      top30Recipients: board.slice(0, 30),
      early100Senders: earlyList.slice(0, 100),
      unitSpread: MOCK_UNIT_SPREAD,
      hrDirectory: MOCK_HR_DIRECTORY,
      pendingRender: [],
      isLiveSheet: gvizHrSync.success,
      hrSyncSource: gvizHrSync.success ? "google_sheet_gviz" : (customHrList.length > 0 ? "custom_imported" : "baseline")
    };
    return this.mergeHrDirectoryIntoDashboard(fallbackBase, [gvizHrSync.list, customHrList]);
  }

  /**
   * Tự động quét các dòng mới từ Google Form trên Google Sheet, lọc chính tả,
   * xuất ảnh E-Card 1080x1440, lưu vào Google Drive, gắn link vào Sheet
   * và gửi thẳng email cho người nhận & người gửi (CC)
   */
  static async syncAndRenderGoogleFormRows(CardGenerator) {
    if (this.isMockMode() || !CardGenerator) return { synced: 0, processed: 0 };
    try {
      const scriptUrl = getEffectiveScriptUrl();
      const response = await fetchAppsScript(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "sync_form_rows" })
      });
      if (!response.ok) return { synced: 0, processed: 0 };
      const res = await response.json();
      const pendingList = res?.data?.pendingRender || [];
      let completedCount = 0;

      for (const item of pendingList) {
        const senderHr = lookupEmployeeInfo(item.senderEmail);
        const recipientHr = lookupEmployeeInfo(item.recipientEmail);
        const cleanedMessage = cleanAndCorrectVietnameseText(item.message || "");

        const cardData = {
          senderName: item.senderName || senderHr.name || "Đồng nghiệp FTEL",
          senderEmail: item.senderEmail,
          senderDept: item.senderDept || senderHr.unit || "FPT Telecom",
          recipientName: item.recipientName || recipientHr.name || "Người Thầy FTEL",
          recipientEmail: item.recipientEmail,
          recipientRole: item.recipientRole || "Giảng viên – Người truyền tri thức",
          message: cleanedMessage,
          cardStyle: "kv"
        };
        const cardImageBase64 = CardGenerator.getCardDataUrl(cardData, { width: 1080, height: 1440 });
        await fetchAppsScript(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "complete_ecard_and_send_mail",
            rowNumber: item.rowNumber,
            cardImageBase64: cardImageBase64,
            ...item,
            senderName: cardData.senderName,
            senderDept: cardData.senderDept,
            recipientName: cardData.recipientName,
            message: cleanedMessage
          })
        });
        completedCount++;
      }

      return { synced: completedCount, processed: completedCount, totalPending: pendingList.length };
    } catch (e) {
      console.warn("Auto-sync Google Form rows warning:", e);
      return { synced: 0, processed: 0 };
    }
  }

  /**
   * Gửi Thiệp Tri Ân thử nghiệm (kèm ảnh 1080x1440 chuẩn Key Visual) về thẳng Outlook TungDT101@fpt.com
   * CHỈ GỬI EMAIL KIỂM TRA (Người nhận & Người gửi) - KHÔNG lưu kết quả vào Google Sheet chính thức
   */
  static async sendTestEcardToOutlook(CardGenerator, targetEmail = "tungdt101@fpt.com") {
    const cleanTarget = String(targetEmail || "tungdt101@fpt.com").trim().toLowerCase();
    const uniqueSuffix = new Date().toLocaleTimeString("vi-VN");
    const testCardData = {
      senderName: "Trung tâm Đào tạo FTEL (FTC)",
      senderEmail: "ftel.daotao@fpt.com",
      senderDept: "Trung tâm Đào tạo FTEL (FTC)",
      recipientName: "Đặng Thanh Tùng",
      recipientEmail: cleanTarget,
      recipientDept: "Trung tâm Đào tạo FTEL (FTC)",
      recipientRole: "Người dẫn dắt – Người truyền cảm hứng (Trung tâm Đào tạo FTEL - FTC)",
      message: `Cảm ơn Anh Đặng Thanh Tùng đã luôn là ngọn lửa nhiệt huyết truyền cảm hứng, tận tâm chia sẻ tri thức và đồng hành cùng anh em tại Trung tâm Đào tạo FTEL (FTC). Nhân dịp 20/11, chúc Anh luôn dồi dào sức khỏe, hạnh phúc và tiếp tục thắp sáng hành trình tri thức tại FPT Telecom! (${uniqueSuffix})`,
      cardStyle: "kv"
    };

    const cardImageBase64 = CardGenerator ? CardGenerator.getCardDataUrl(testCardData, { width: 1080, height: 1440 }) : "";
    const scriptUrl = getEffectiveScriptUrl();

    // CHỈ gọi action 'send_test_email_only' (bắn mail cho Người nhận & Người gửi, KHÔNG ghi vào Google Sheet chính thức)
    // và đọc KẾT QUẢ THẬT từ Apps Script (thành công / lý do lỗi / hạn mức còn lại).
    let fetchDelivered = false;
    let serverResult = null;
    try {
      const res = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "send_test_email_only",
          ...testCardData,
          cardImageBase64
        })
      });
      serverResult = await res.json().catch(() => null);
      fetchDelivered = !!(serverResult && serverResult.success);
      if (serverResult && !serverResult.success) {
        console.warn("Gửi mail thử nghiệm thất bại:", serverResult.message);
      }
    } catch (e) {
      console.warn("Không gọi được Apps Script để gửi mail thử nghiệm:", e);
    }

    return {
      success: fetchDelivered,
      delivered: fetchDelivered,
      message: serverResult ? serverResult.message : "Không kết nối được Google Apps Script",
      sentFrom: serverResult ? serverResult.sentFrom : "",
      quotaRemaining: serverResult ? serverResult.quotaRemaining : null,
      savedToOfficialSheet: false,
      cardData: testCardData,
      cardImageBase64,
      subject: "[FTEL 20/11] Bạn vừa nhận được một Ngọn Lửa Tri Ân từ đồng nghiệp!"
    };
  }
  static async getDashboardStats() {
    if (!this.isMockMode()) {
      try {
        const scriptUrl = getEffectiveScriptUrl();
        const response = await fetch(`${scriptUrl}?action=get_stats`);
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        }
      } catch (err) {
        console.warn("Lỗi lấy stats từ Google Apps Script, dùng mock:", err);
      }
    }

    // Mock stats
    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBMISSIONS) || "[]");
    const board = JSON.parse(localStorage.getItem("ftel_mock_board") || JSON.stringify(MOCK_LEADERBOARD));
    const totalCount = 265 + submissions.length;

    return {
      totalSubmissions: totalCount,
      uniqueSenders: 198 + submissions.length,
      uniqueRecipients: board.length,
      topMentorsCount: 30,
      departmentsActive: 13
    };
  }

  /**
   * Lấy danh sách Top 30 Tiếp Lửa Bền Bỉ
   */
  static async getLeaderboard() {
    if (!this.isMockMode()) {
      try {
        const scriptUrl = getEffectiveScriptUrl();
        const response = await fetch(`${scriptUrl}?action=get_leaderboard`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
      } catch (err) {
        console.warn("Lỗi lấy leaderboard từ Apps Script, dùng mock:", err);
      }
    }

    return JSON.parse(localStorage.getItem("ftel_mock_board") || JSON.stringify(MOCK_LEADERBOARD));
  }

  /**
   * Yêu cầu gửi mã OTP tới email Outlook FTEL
   */
  static async requestOtp(email) {
    email = (email || '').trim().toLowerCase();
    if (!email.endsWith('@fpt.net') && !email.endsWith('@fpt.com')) {
      throw new Error('Email phải có đuôi @fpt.net hoặc @fpt.com!');
    }

    // Kiểm tra danh sách email đã từng xác thực vĩnh viễn trên thiết bị này
    try {
      const localVerifiedList = JSON.parse(localStorage.getItem('ftel_verified_emails') || '[]');
      if (Array.isArray(localVerifiedList) && localVerifiedList.includes(email)) {
        const sessionData = {
          email: email,
          isAdmin: this.isSuperAdminEmail(email),
          verifiedAt: Date.now()
        };
        this.setUserSession(sessionData);
        return {
          success: true,
          alreadyVerified: true,
          data: sessionData
        };
      }
    } catch (e) {}

    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'request_otp', email: email })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Không thể gửi mã OTP.');
    }

    // Nếu email này đã từng xác thực trước đó trên thiết bị khác (Cross-Device Remember)
    if (result.alreadyVerified) {
      const sessionData = result.data || {
        email: email,
        isAdmin: this.isSuperAdminEmail(email)
      };
      this.setUserSession(sessionData);
    }

    return result;
  }

  /**
   * Lấy chế độ xác thực người dùng:
   * - 'direct': Xác thực nhanh tức thì 0.1s (Khuyên dùng - không cần chờ mã OTP)
   * - 'otp': Bắt buộc nhận mã OTP 6 số qua Outlook
   */
  static getAuthMode() {
    return localStorage.getItem('ftel_auth_mode') || 'direct';
  }

  static setLocalAuthMode(mode) {
    const validMode = mode === 'otp' ? 'otp' : 'direct';
    localStorage.setItem('ftel_auth_mode', validMode);
    return validMode;
  }

  /**
   * Đồng bộ cấu hình xác thực từ Google Apps Script
   */
  static async getCloudAuthMode() {
    if (this.isMockMode()) return this.getAuthMode();
    try {
      const scriptUrl = getEffectiveScriptUrl();
      const delimiter = scriptUrl.includes('?') ? '&' : '?';
      const response = await fetch(scriptUrl + delimiter + 'action=get_auth_config');
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.requireOtp !== 'undefined') {
          const mode = data.requireOtp ? 'otp' : 'direct';
          this.setLocalAuthMode(mode);
          return mode;
        }
      }
    } catch (e) {
      console.warn("Could not sync auth config from cloud, using cached:", e);
    }
    return this.getAuthMode();
  }

  /**
   * Admin bật/tắt chế độ OTP trên toàn hệ thống
   */
  static async adminToggleAuthMode(mode) {
    const targetMode = mode === 'otp' ? 'otp' : 'direct';
    this.setLocalAuthMode(targetMode);

    const adminSess = this.getAdminSession();
    const scriptUrl = getEffectiveScriptUrl();
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'admin_toggle_otp',
          requireOtp: targetMode === 'otp',
          secretKey: adminSess?.secretKey || 'FTEL_TRI_AN_2026'
        })
      });
      return await res.json();
    } catch (err) {
      console.warn("Failed to push auth toggle to cloud:", err);
      return { success: true, mode: targetMode };
    }
  }

  /**
   * Kiểm tra email có quyền Super Admin toàn hệ thống hay không
   */
  static isSuperAdminEmail(email) {
    if (!email) return false;
    email = email.trim().toLowerCase();
    const superAdmins = [
      'tungdt101@fpt.com',
      'tungdt101@fpt.net',
      'dtung2788@gmail.com'
    ];
    return superAdmins.includes(email);
  }

  /**
   * Lưu phiên đăng nhập an toàn vào LocalStorage (Ghi nhớ vĩnh viễn trên thiết bị)
   */
  static setUserSession(sessionData) {
    if (!sessionData || !sessionData.email) return;
    const normalizedEmail = sessionData.email.trim().toLowerCase();
    sessionData.email = normalizedEmail;
    if (this.isSuperAdminEmail(normalizedEmail)) {
      sessionData.isAdmin = true;
    }
    try {
      localStorage.setItem('ftel_user_session', JSON.stringify(sessionData));
      sessionStorage.setItem('ftel_user_session', JSON.stringify(sessionData));
      localStorage.setItem('ftel_remembered_email', normalizedEmail);
      sessionStorage.removeItem('ftel_just_logged_out');
      document.cookie = `ftel_user_email=${encodeURIComponent(normalizedEmail)}; path=/; max-age=31536000; SameSite=Lax`;

      // Ghi nhớ vĩnh viễn email đã xác thực (chỉ cần xác thực OTP 1 lần duy nhất)
      const verifiedList = JSON.parse(localStorage.getItem('ftel_verified_emails') || '[]');
      if (Array.isArray(verifiedList) && !verifiedList.includes(normalizedEmail)) {
        verifiedList.push(normalizedEmail);
        localStorage.setItem('ftel_verified_emails', JSON.stringify(verifiedList));
      }

      if (sessionData.isAdmin) {
        const adminData = {
          isAdmin: true,
          secretKey: 'FTEL_TRI_AN_2026',
          email: sessionData.email,
          role: 'Super Admin'
        };
        localStorage.setItem('ftel_admin_session', JSON.stringify(adminData));
        sessionStorage.setItem('ftel_admin_session', JSON.stringify(adminData));
      }
    } catch (e) {
      console.warn("Lưu session thất bại:", e);
    }
  }

  /**
   * Xác thực nhanh trực tiếp cho email FTEL (0.1 giây, tức thì không cần chờ OTP)
   */
  static directLogin(email) {
    email = (email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('Vui lòng nhập email Outlook FTEL của bạn!');
    }
    if (!email.endsWith('@fpt.net') && !email.endsWith('@fpt.com')) {
      throw new Error('Email phải có đuôi @fpt.net hoặc @fpt.com!');
    }

    const isAdmin = this.isSuperAdminEmail(email);
    const sessionData = {
      email: email,
      verifiedAt: Date.now(),
      mode: 'direct',
      isAdmin: isAdmin
    };

    this.setUserSession(sessionData);
    return sessionData;
  }

  /**
   * Xác thực mã OTP
   */
  static async verifyOtp(email, otp) {
    email = (email || '').trim().toLowerCase();
    otp = (otp || '').trim();

    if (!email || !otp) {
      throw new Error('Vui lòng nhập đầy đủ email và mã OTP!');
    }

    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verify_otp', email: email, otp: otp })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    // Tự động cấp quyền Admin cho tài khoản Super Admin
    if (this.isSuperAdminEmail(email)) {
      result.data.isAdmin = true;
    }

    // Lưu session đăng nhập vĩnh viễn trên thiết bị
    this.setUserSession(result.data);
    return result.data;
  }

  /**
   * Lấy phiên đăng nhập hiện tại (Ghi nhớ vĩnh viễn & tự động khôi phục trên trình duyệt thiết bị này)
   */
  static getUserSession() {
    try {
      const saved = localStorage.getItem('ftel_user_session') || sessionStorage.getItem('ftel_user_session');
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.email) {
          if (this.isSuperAdminEmail(data.email)) data.isAdmin = true;
          return data;
        }
      }

      // Nếu người dùng vừa chủ động bấm nút Đăng xuất/Đổi email ở lượt load này thì cho phép hiện bảng nhập email
      if (sessionStorage.getItem('ftel_just_logged_out') === '1') {
        sessionStorage.removeItem('ftel_just_logged_out');
        return null;
      }

      // Tự động khôi phục phiên từ email đã xác thực trước đó trên thiết bị này
      let fallbackEmail = (localStorage.getItem('ftel_remembered_email') || '').trim().toLowerCase();

      if (!fallbackEmail) {
        try {
          const verifiedList = JSON.parse(localStorage.getItem('ftel_verified_emails') || '[]');
          if (Array.isArray(verifiedList) && verifiedList.length > 0) {
            fallbackEmail = String(verifiedList[verifiedList.length - 1] || '').trim().toLowerCase();
          }
        } catch (e) {}
      }

      if (!fallbackEmail && typeof document !== 'undefined' && document.cookie) {
        const match = document.cookie.match(/(?:^|;\s*)ftel_user_email=([^;]+)/);
        if (match && match[1]) {
          fallbackEmail = decodeURIComponent(match[1]).trim().toLowerCase();
        }
      }

      if (!fallbackEmail) {
        try {
          const subs = JSON.parse(localStorage.getItem('ftel_tribute_submissions_v1') || '[]');
          if (Array.isArray(subs)) {
            for (const item of subs) {
              const em = String(item?.senderEmail || '').trim().toLowerCase();
              if (em && (em.endsWith('@fpt.com') || em.endsWith('@fpt.net'))) {
                fallbackEmail = em;
                break;
              }
            }
          }
        } catch (e) {}
      }

      if (fallbackEmail && (fallbackEmail.endsWith('@fpt.com') || fallbackEmail.endsWith('@fpt.net'))) {
        const restoredSession = {
          email: fallbackEmail,
          isAdmin: this.isSuperAdminEmail(fallbackEmail),
          verifiedAt: Date.now()
        };
        this.setUserSession(restoredSession);
        return restoredSession;
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Đăng xuất khỏi thiết bị này
   */
  static logout() {
    localStorage.removeItem('ftel_user_session');
    localStorage.removeItem('ftel_admin_session');
    sessionStorage.removeItem('ftel_user_session');
    sessionStorage.removeItem('ftel_admin_session');
    sessionStorage.setItem('ftel_just_logged_out', '1');
  }

  /**
   * Đăng nhập Admin
   */
  static async adminLogin(secretKey, email = '') {
    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'admin_login', secretKey, email })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Sai khóa bảo mật quản trị!');
    }

    const adminData = { isAdmin: true, secretKey };
    localStorage.setItem('ftel_admin_session', JSON.stringify(adminData));
    sessionStorage.setItem('ftel_admin_session', JSON.stringify(adminData));
    return result.data;
  }

  static getAdminSession() {
    try {
      const user = this.getUserSession();
      if (user && (user.isAdmin || this.isSuperAdminEmail(user.email))) {
        return { 
          isAdmin: true, 
          secretKey: 'FTEL_TRI_AN_2026', 
          email: user.email,
          role: 'Super Admin'
        };
      }
      const saved = localStorage.getItem('ftel_admin_session') || sessionStorage.getItem('ftel_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Lấy danh sách tài khoản Admin
   */
  static async adminGetAdmins() {
    const adminSess = this.getAdminSession();
    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'admin_get_admins',
        secretKey: adminSess?.secretKey || 'FTEL_TRI_AN_2026',
        callerEmail: this.getUserSession()?.email || ''
      })
    });
    return response.json();
  }

  /**
   * Thêm/Xóa tài khoản Admin
   */
  static async adminSetAdmin(targetEmail, operation = 'add', role = 'Admin Quản Lý') {
    const adminSess = this.getAdminSession();
    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'admin_set_admin',
        targetEmail,
        operation,
        role,
        secretKey: adminSess?.secretKey || 'FTEL_TRI_AN_2026',
        callerEmail: this.getUserSession()?.email || ''
      })
    });
    return response.json();
  }

  /**
   * Lấy toàn bộ danh sách gửi tri ân (Chỉ Admin)
   */
  static async adminGetAllSubmissions() {
    const adminSess = this.getAdminSession();
    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'admin_get_all_submissions',
        secretKey: adminSess?.secretKey || 'FTEL_TRI_AN_2026',
        callerEmail: this.getUserSession()?.email || adminSess?.email || ''
      })
    });
    return response.json();
  }

  /**
   * Xóa một lời tri ân đã gửi (Chỉ Admin)
   */
  static async adminDeleteSubmission(submissionId) {
    const adminSess = this.getAdminSession();
    const scriptUrl = getEffectiveScriptUrl();
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'admin_delete_submission',
        submissionId: submissionId,
        secretKey: adminSess?.secretKey || 'FTEL_TRI_AN_2026',
        callerEmail: this.getUserSession()?.email || adminSess?.email || ''
      })
    });
    return response.json();
  }
}
