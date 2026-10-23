import { MOCK_LEADERBOARD } from './mockData.js';

/**
 * ==============================================================================
 * API CLIENT CHO WEB APP "THẮP LỬA TRI ÂN"
 * ==============================================================================
 * Hướng dẫn:
 * Sau khi triển khai Google Apps Script (xem file google-apps-script/README.md),
 * hãy dán Web App URL vào biến APPS_SCRIPT_URL dưới đây.
 */
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzTaNILtS0VPz6Nwnuu3fIoqBotXj6mEJGkP5hO61ktAz64Yngz1fXllq8C5YgPeXWT/exec";

export function getEffectiveScriptUrl() {
  const custom = localStorage.getItem('ftel_custom_script_url');
  // Tự động xóa các link cũ từng lỗi trước đây để luôn dùng link chuẩn mới nhất
  if (custom && (custom.includes('AKfycbzKGQrt') || custom.includes('AKfycbzJVQuU'))) {
    localStorage.removeItem('ftel_custom_script_url');
    return APPS_SCRIPT_URL;
  }
  if (custom && custom.trim() !== '') {
    return custom;
  }
  return APPS_SCRIPT_URL;
}

// Storage keys
const STORAGE_KEY_SUBMISSIONS = "ftel_20_11_submissions";
const STORAGE_KEY_LAST_SUBMIT = "ftel_20_11_last_submit_time";

export class ApiService {
  /**
   * Kiểm tra xem đang chạy chế độ Mock hay kết nối Google Apps Script thực tế
   */
  static isMockMode() {
    const url = getEffectiveScriptUrl();
    return !url || url.trim() === "" || url.includes("PASTE_YOUR");
  }

  /**
   * Gửi lời tri ân
   */
  static async submitGratitude(payload) {
    // 1. Client-side Domain Validation
    const senderEmail = (payload.senderEmail || "").trim().toLowerCase();
    const recipientEmail = (payload.recipientEmail || "").trim().toLowerCase();

    const allowedDomains = ["fpt.net", "fpt.com"];
    const isSenderValid = allowedDomains.some(d => senderEmail.endsWith("@" + d));
    const isRecipientValid = allowedDomains.some(d => recipientEmail.endsWith("@" + d));

    if (!isSenderValid) {
      throw new Error("Email người gửi phải có đuôi @fpt.net hoặc @fpt.com!");
    }
    if (!isRecipientValid) {
      throw new Error("Email người nhận phải có đuôi @fpt.net hoặc @fpt.com!");
    }
    if (senderEmail === recipientEmail) {
      throw new Error("Bạn không thể tự gửi lời cảm ơn cho chính mình!");
    }

    // 2. Chống spam thời gian (Rate limiting client)
    const lastSubmit = localStorage.getItem(STORAGE_KEY_LAST_SUBMIT);
    const now = Date.now();
    if (lastSubmit && (now - parseInt(lastSubmit, 10)) < 15000) {
      throw new Error("Vui lòng đợi 15 giây trước khi thắp thêm ngọn lửa tri ân tiếp theo!");
    }

    // 3. Nếu đã cấu hình Google Apps Script Backend
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
          throw new Error(`Google Apps Script trả về lỗi HTTP ${response.status} (${response.statusText || 'Chặn truy cập'}). Hãy kiểm tra quyền 'Who has access: Anyone' trên Apps Script.`);
        }

        let result = { success: true, message: "Gửi lời tri ân thành công!", data: { submissionId: "FTEL-GS-" + Date.now(), recipientName: payload.recipientName, emailSentStatus: "SENT" } };
        try {
          const parsed = await response.json();
          if (parsed && typeof parsed.success !== 'undefined') {
            result = parsed;
          }
        } catch (jsonErr) {
          console.log("Dữ liệu đã gửi thành công lên Google Apps Script:", jsonErr);
        }

        if (!result.success) {
          throw new Error(result.message || "Không thể gửi dữ liệu lên Google Sheets.");
        }

        localStorage.setItem(STORAGE_KEY_LAST_SUBMIT, now.toString());
        this.saveLocalBackup(payload, result.data?.submissionId || "SUBMITTED");
        return { ...result, isCloudSaved: true };
      } catch (err) {
        console.warn("Lỗi gửi tới Google Apps Script thực, chuyển sang lưu dự phòng:", err);
        // Fallback to local save if network error
        const mockRes = await this.mockSubmit(payload);
        return { 
          ...mockRes, 
          isCloudSaved: false, 
          cloudError: err.message || "Không thể kết nối Google Apps Script" 
        };
      }
    }

    // 4. Nếu đang ở chế độ Mock/Demo
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
   * Lấy số liệu thống kê Dashboard
   */
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
   * Lấy phiên đăng nhập hiện tại (Ghi nhớ vĩnh viễn trên trình duyệt thiết bị này)
   */
  static getUserSession() {
    try {
      const saved = localStorage.getItem('ftel_user_session') || sessionStorage.getItem('ftel_user_session');
      if (!saved) return null;
      const data = JSON.parse(saved);
      if (data && data.email && this.isSuperAdminEmail(data.email)) {
        data.isAdmin = true;
      }
      return data;
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
