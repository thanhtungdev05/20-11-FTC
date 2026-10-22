import confetti from 'canvas-confetti';
import { Scene3D } from './scene3d.js';
import { CardGenerator, fptLogoImg } from './cardGenerator.js';
import { ApiService, APPS_SCRIPT_URL } from './api.js';
import { DashboardModule } from './dashboard.js';
import { DEPARTMENTS, ROLES, TRIBUTE_TAGS, SAMPLE_WISHES } from './mockData.js';

class App {
  constructor() {
    this.scene3d = null;
    this.dashboard = new DashboardModule();
    this.selectedTag = TRIBUTE_TAGS[0].name;
    this.selectedCardStyle = 'gold';
    this.lastCardData = null;

    this.init();
  }

  async init() {
    // 1. Initialize 3D WebGL Background Scene
    const container = document.getElementById('webgl-canvas-container');
    if (container) {
      this.scene3d = new Scene3D(container);
    }

    // 2. Populate Dropdowns & Tags
    this.populateSelects();
    this.renderTags();

    // 3. Setup Live Card Preview & Form Listeners
    this.setupFormListeners();
    this.setupCard3DTilt();

    // 4. Initial Render of E-Card Preview
    this.updateCardPreview();
    if (fptLogoImg) {
      if (fptLogoImg.complete) {
        this.updateCardPreview();
      } else {
        fptLogoImg.onload = () => this.updateCardPreview();
      }
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.updateCardPreview();
      });
    }

    // 5. Setup Action Modals & Buttons
    this.setupModals();

    // 6. Setup Auth OTP & Admin Portal
    this.setupAuthAndOtp();
    this.setupAdminPortal();

    // 7. Update Counter in Header
    this.updateHeaderCounter();
  }

  populateSelects() {
    const deptSelect = document.getElementById('sender-dept');
    if (deptSelect) {
      DEPARTMENTS.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        deptSelect.appendChild(opt);
      });
      // Default selection for fast testing
      deptSelect.value = DEPARTMENTS[0];
    }

    const roleSelect = document.getElementById('recipient-role');
    if (roleSelect) {
      ROLES.forEach(role => {
        const opt = document.createElement('option');
        opt.value = role;
        opt.textContent = role;
        roleSelect.appendChild(opt);
      });
      roleSelect.value = ROLES[0];
    }
  }

  renderTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    container.innerHTML = '';
    TRIBUTE_TAGS.forEach((tag, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = index === 0;
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
        isSelected
          ? 'bg-gradient-to-r ' + tag.color + ' text-slate-950 border-amber-300 shadow-md shadow-orange-500/20'
          : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
      }`;
      btn.textContent = tag.name;
      btn.addEventListener('click', () => {
        this.selectedTag = tag.name;
        // Update styling
        container.querySelectorAll('button').forEach(b => {
          b.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-slate-300 border-white/10';
        });
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer bg-gradient-to-r ' + tag.color + ' text-slate-950 border-amber-300 shadow-md shadow-orange-500/20';
        this.updateCardPreview();
      });
      container.appendChild(btn);
    });
  }

  setupFormListeners() {
    const form = document.getElementById('tribute-form');
    const senderName = document.getElementById('sender-name');
    const senderEmail = document.getElementById('sender-email');
    const senderDept = document.getElementById('sender-dept');
    const recipientName = document.getElementById('recipient-name');
    const recipientRole = document.getElementById('recipient-role');
    const messageInput = document.getElementById('tribute-message');
    const charCounter = document.getElementById('char-counter');
    const styleRadios = document.querySelectorAll('input[name="card-style"]');
    const suggestBtn = document.getElementById('suggest-wish-btn');

    // Start with clean empty inputs (User requested no pre-filled text)
    if (senderName) senderName.value = "";
    if (senderEmail) senderEmail.value = "";
    if (recipientName) recipientName.value = "";
    if (messageInput) {
      messageInput.value = "";
      if (charCounter) charCounter.textContent = "0/500 ký tự";
    }

    // Input change events to update card preview immediately
    const updateEvents = ['input', 'change'];
    [senderName, senderDept, recipientName, recipientRole].forEach(el => {
      if (el) {
        updateEvents.forEach(evt => el.addEventListener(evt, () => this.updateCardPreview()));
      }
    });

    // Message input + character counter + 3D typing pulse
    if (messageInput) {
      messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCounter.textContent = `${len}/500 ký tự`;
        if (len > 450) {
          charCounter.className = 'text-rose-400 font-bold';
        } else {
          charCounter.className = 'text-slate-400';
        }
        if (this.scene3d) this.scene3d.setTyping(true);
        this.updateCardPreview();
      });

      messageInput.addEventListener('blur', () => {
        if (this.scene3d) this.scene3d.setTyping(false);
      });
    }

    // Style switch
    styleRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedCardStyle = e.target.value;
        this.updateCardPreview();
      });
    });

    // Suggest wish button
    let wishIndex = 0;
    if (suggestBtn) {
      suggestBtn.addEventListener('click', () => {
        wishIndex = (wishIndex + 1) % SAMPLE_WISHES.length;
        messageInput.value = SAMPLE_WISHES[wishIndex];
        charCounter.textContent = `${messageInput.value.length}/500 ký tự`;
        this.updateCardPreview();
      });
    }

    // Quick download preview card / Zoom Card
    const quickDownloadBtn = document.getElementById('quick-download-btn');
    if (quickDownloadBtn) {
      quickDownloadBtn.addEventListener('click', () => {
        if (this.lastCardData) {
          CardGenerator.downloadCard(this.lastCardData);
        }
      });
    }

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  }

  getCurrentFormData(isForPreview = true) {
    const sName = document.getElementById('sender-name')?.value?.trim() || '';
    const sEmail = document.getElementById('sender-email')?.value?.trim() || '';
    const sDept = document.getElementById('sender-dept')?.value || '';
    const sCode = document.getElementById('sender-code')?.value?.trim() || '';
    const rName = document.getElementById('recipient-name')?.value?.trim() || '';
    const rEmail = document.getElementById('recipient-email')?.value?.trim() || '';
    const rRole = document.getElementById('recipient-role')?.value || '';
    const msg = document.getElementById('tribute-message')?.value?.trim() || '';

    if (!isForPreview) {
      return {
        senderName: sName,
        senderEmail: sEmail,
        senderDept: sDept,
        senderCode: sCode,
        recipientName: rName,
        recipientEmail: rEmail,
        recipientRole: rRole,
        tag: this.selectedTag,
        message: msg,
        cardStyle: this.selectedCardStyle
      };
    }

    return {
      senderName: sName || 'Đồng nghiệp FTEL',
      senderEmail: sEmail || 'dongnghiep@fpt.net',
      senderDept: sDept || 'FPT Telecom',
      senderCode: sCode,
      recipientName: rName || 'Người Thầy / Mentor FTEL',
      recipientEmail: rEmail || 'mentor@fpt.net',
      recipientRole: rRole || 'Mentor chia sẻ tri thức',
      tag: this.selectedTag,
      message: msg || 'Cảm ơn Anh/Chị đã luôn tận tâm truyền lửa và thắp sáng tri thức!',
      cardStyle: this.selectedCardStyle
    };
  }

  updateCardPreview() {
    const canvas = document.getElementById('card-preview-canvas');
    if (!canvas) return;

    const data = this.getCurrentFormData(true);
    this.lastCardData = data;

    // Render on preview canvas (chuẩn tỷ lệ 1080x1440 sắc nét)
    CardGenerator.renderToCanvas(canvas, data);

    // Cập nhật cả modal phóng to nếu đang mở
    const zoomModal = document.getElementById('card-zoom-modal');
    const zoomCanvas = document.getElementById('zoom-card-canvas');
    if (zoomModal && !zoomModal.classList.contains('hidden') && zoomCanvas) {
      CardGenerator.renderToCanvas(zoomCanvas, data);
    }
  }

  setupCard3DTilt() {
    const card = document.getElementById('card-3d-wrapper');
    if (!card) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -12;
      const rotateY = ((x - centerX) / centerX) * 12;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-tribute-btn');
    if (submitBtn.disabled) return;

    const data = this.getCurrentFormData(false);

    try {
      // 1. Loading state on button
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="inline-block animate-spin mr-2">⚙️</span>
        <span>ĐANG THẮP SÁNG NGỌN LỬA TRI ÂN...</span>
      `;

      // 2. Generate high-res base64 image of the E-Card
      const cardImageBase64 = CardGenerator.getCardDataUrl(data, { width: 1080, height: 1440 });

      // 3. Trigger 3D ignite animation in the background
      if (this.scene3d) {
        this.scene3d.triggerIgnite();
      }

      // 4. Submit to Google Apps Script API (or local fallback)
      const submitResult = await ApiService.submitGratitude({
        ...data,
        cardImageBase64: cardImageBase64
      });

      // 5. Fire celebratory Confetti
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f37021', '#ffd700', '#ffffff', '#00c6ff']
      });

      // 6. Show Success Celebration Modal
      this.showSuccessModal(data, submitResult);
      this.updateHeaderCounter();

    } catch (err) {
      alert("⚠️ " + (err.message || "Đã có lỗi xảy ra khi gửi. Vui lòng kiểm tra lại!"));
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="text-xl">🔥</span>
        <span>THẮP LỬA TRI ÂN & GỬI THIỆP NGAY</span>
      `;
    }
  }

  showSuccessModal(data, submitResult = null) {
    const modal = document.getElementById('success-modal');
    const recipientNameEl = document.getElementById('success-recipient-name');
    const canvas = document.getElementById('success-card-canvas');
    const syncStatusEl = document.getElementById('success-sync-status');

    if (recipientNameEl) recipientNameEl.textContent = data.recipientName;
    if (canvas) {
      CardGenerator.renderToCanvas(canvas, data);
    }

    if (syncStatusEl) {
      if (submitResult && submitResult.isCloudSaved) {
        syncStatusEl.className = "mb-5 text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300";
        syncStatusEl.innerHTML = `<span>✅</span><span>Dữ liệu đã được lưu trực tiếp vào <strong>Google Sheet</strong> và gửi email thông báo!</span>`;
      } else {
        syncStatusEl.className = "mb-5 text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-300";
        syncStatusEl.innerHTML = `<span>⚠️</span><span>Đã lưu trên máy. <em>Google Sheet chưa nhận được do link Apps Script trả về 401 (cần đặt 'Anyone' khi Deploy).</em></span>`;
      }
    }

    if (modal) {
      modal.classList.remove('hidden');
    }

    // Download button inside modal
    const downloadBtn = document.getElementById('download-success-card-btn');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        CardGenerator.downloadCard(data);
      };
    }

    // Send another button
    const anotherBtn = document.getElementById('send-another-btn');
    if (anotherBtn) {
      anotherBtn.onclick = () => {
        modal.classList.add('hidden');
        const msg = document.getElementById('tribute-message');
        if (msg) msg.value = '';
        const rec = document.getElementById('recipient-name');
        if (rec) rec.value = '';
        const recMail = document.getElementById('recipient-email');
        if (recMail) recMail.value = '';
        this.updateCardPreview();
      };
    }
  }

  setupModals() {
    // Zoom Card Modal (Phóng to xem thiệp chi tiết & siêu nét)
    const zoomBtn = document.getElementById('zoom-card-btn');
    const cardWrapper = document.getElementById('card-3d-wrapper');
    const zoomModal = document.getElementById('card-zoom-modal');
    const closeZoomBtn = document.getElementById('close-zoom-modal-btn');
    const closeZoomBtn2 = document.getElementById('close-zoom-modal-btn-2');
    const zoomCanvas = document.getElementById('zoom-card-canvas');
    const zoomDownloadBtn = document.getElementById('zoom-download-btn');

    const openZoom = (e) => {
      // Ngăn chặn nếu click vào phần tử con không mong muốn
      if (!zoomModal || !zoomCanvas) return;
      const data = this.getCurrentFormData(true);
      CardGenerator.renderToCanvas(zoomCanvas, data);
      zoomModal.classList.remove('hidden');
    };

    const closeZoom = () => {
      if (zoomModal) zoomModal.classList.add('hidden');
    };

    zoomBtn?.addEventListener('click', openZoom);
    cardWrapper?.addEventListener('click', openZoom);
    closeZoomBtn?.addEventListener('click', closeZoom);
    closeZoomBtn2?.addEventListener('click', closeZoom);
    zoomModal?.addEventListener('click', (e) => {
      if (e.target === zoomModal) closeZoom();
    });

    zoomDownloadBtn?.addEventListener('click', () => {
      const data = this.getCurrentFormData(true);
      CardGenerator.downloadCard(data);
    });

    // Leaderboard modal button
    const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
    if (openLeaderboardBtn) {
      openLeaderboardBtn.addEventListener('click', () => {
        this.dashboard.open();
      });
    }

    // Config Google Sheets modal
    const configBtn = document.getElementById('open-config-btn');
    const configModal = document.getElementById('config-modal');
    const closeConfigBtn = document.getElementById('close-config-modal-btn');
    const saveConfigBtn = document.getElementById('save-config-btn');
    const scriptUrlInput = document.getElementById('config-script-url');
    const modeStatus = document.getElementById('current-mode-status');

    const savedUrl = localStorage.getItem('ftel_custom_script_url') || APPS_SCRIPT_URL;
    if (scriptUrlInput) scriptUrlInput.value = savedUrl;

    if (configBtn && configModal) {
      configBtn.addEventListener('click', () => {
        if (modeStatus) {
          const isMock = ApiService.isMockMode();
          modeStatus.textContent = isMock ? 'Mô phỏng ngoại tuyến (Demo Mode)' : 'Kết nối Google Sheets Trực Tiếp';
          modeStatus.className = isMock ? 'font-bold text-amber-400' : 'font-bold text-emerald-400';
        }
        configModal.classList.remove('hidden');
      });

      closeConfigBtn?.addEventListener('click', () => configModal.classList.add('hidden'));
      configModal.addEventListener('click', (e) => {
        if (e.target === configModal) configModal.classList.add('hidden');
      });

      saveConfigBtn?.addEventListener('click', () => {
        const val = scriptUrlInput.value.trim();
        localStorage.setItem('ftel_custom_script_url', val);
        alert("Đã lưu URL kết nối Google Sheets thành công!");
        configModal.classList.add('hidden');
        window.location.reload();
      });
    }
  }

  async updateHeaderCounter() {
    const counterEl = document.getElementById('nav-counter');
    if (counterEl) {
      try {
        const stats = await ApiService.getDashboardStats();
        counterEl.textContent = (stats.totalSubmissions || 265) + '+';
      } catch (e) {
        console.error(e);
      }
    }
  }

  setupAuthAndOtp() {
    const modal = document.getElementById('otp-login-modal');
    const step1 = document.getElementById('otp-step-1');
    const step2 = document.getElementById('otp-step-2');
    const emailInput = document.getElementById('otp-email-input');
    const codeInput = document.getElementById('otp-code-input');
    const requestBtn = document.getElementById('request-otp-btn');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const backBtn = document.getElementById('back-to-step1-btn');
    const resendBtn = document.getElementById('resend-otp-btn');
    const sentToEl = document.getElementById('otp-sent-to-email');
    const timerDisplay = document.getElementById('otp-timer-display');
    const logoutBtn = document.getElementById('user-logout-btn');

    let currentEmail = '';
    let countdownInterval = null;

    const startTimer = () => {
      let timeLeft = 300; // 5 phút
      let resendCooldown = 15; // 15 giây cooldown gửi lại
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = `Gửi lại (${resendCooldown}s)`;
      }

      if (countdownInterval) clearInterval(countdownInterval);
      countdownInterval = setInterval(() => {
        timeLeft--;
        if (resendCooldown > 0) {
          resendCooldown--;
          if (resendBtn) resendBtn.textContent = resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : 'Gửi lại mã';
          if (resendCooldown === 0 && resendBtn) resendBtn.disabled = false;
        }

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          if (timerDisplay) timerDisplay.textContent = 'Mã OTP đã hết hạn';
          if (resendBtn) resendBtn.disabled = false;
        } else {
          const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
          const s = String(timeLeft % 60).padStart(2, '0');
          if (timerDisplay) timerDisplay.textContent = 'Hiệu lực: ' + m + ':' + s;
        }
      }, 1000);
    };

    // Helper: Cập nhật giao diện nút và huy hiệu thông minh theo email đã xác thực
    const updateAuthUIForEmail = (email) => {
      email = (email || '').trim().toLowerCase();
      const statusBadge = document.getElementById('otp-status-badge');
      const helperText = document.getElementById('otp-helper-text');
      const helperIcon = document.getElementById('otp-helper-icon');
      const btnText = document.getElementById('request-otp-btn-text');
      const btnIcon = document.getElementById('request-otp-btn-icon');

      if (!email || (!email.endsWith('@fpt.net') && !email.endsWith('@fpt.com'))) {
        if (statusBadge) {
          statusBadge.className = 'text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition-all';
          statusBadge.textContent = '🔒 Xác thực FTEL';
        }
        if (helperText) helperText.textContent = 'Nhập email công ty để xác thực (Tài khoản đã xác thực sẽ được vào thẳng không cần OTP).';
        if (helperIcon) helperIcon.textContent = '📧';
        if (btnText) btnText.textContent = 'Tiếp Tục';
        if (btnIcon) btnIcon.textContent = '➜';
        return;
      }

      // Kiểm tra xem thiết bị này đã từng xác thực email này chưa (0.001s)
      const isTrusted = ApiService.isTrustedDevice(email);
      if (isTrusted) {
        if (statusBadge) {
          statusBadge.className = 'text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 transition-all';
          statusBadge.textContent = '⚡ Thiết bị tin cậy';
        }
        if (helperText) helperText.textContent = '✓ Thiết bị này đã xác thực trước đó. Bấm để vào thẳng ngay không cần mã OTP!';
        if (helperIcon) helperIcon.textContent = '✅';
        if (btnText) btnText.textContent = '⚡ Đăng Nhập Vào Thẳng Ngay';
        if (btnIcon) btnIcon.textContent = '🔥';
      } else {
        if (statusBadge) {
          statusBadge.className = 'text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition-all';
          statusBadge.textContent = '🔒 Tài khoản mới';
        }
        if (helperText) helperText.textContent = 'Nhập mã OTP xác thực lần đầu (từ lần sau sẽ tự động vào thẳng).';
        if (helperIcon) helperIcon.textContent = '📩';
        if (btnText) btnText.textContent = 'Nhận Mã OTP Qua Outlook';
        if (btnIcon) btnIcon.textContent = '➜';
      }
    };

    // Prefill email đăng nhập gần nhất nếu có
    const lastLoginEmail = ApiService.getLastLoginEmail();
    if (emailInput && lastLoginEmail) {
      emailInput.value = lastLoginEmail;
      updateAuthUIForEmail(lastLoginEmail);
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        updateAuthUIForEmail(emailInput.value);
      });
    }

    // 1. Kiểm tra session hiện tại
    const session = ApiService.getUserSession();
    if (session && session.email) {
      this.applyUserSession(session);
    } else {
      if (modal) modal.classList.remove('hidden');
    }

    // 2. Nút Tiếp tục / Đăng nhập thẳng / Gửi OTP siêu tốc
    if (requestBtn) {
      requestBtn.addEventListener('click', async () => {
        const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        if (!email) {
          alert('Vui lòng nhập email Outlook FTEL của bạn!');
          return;
        }
        if (!email.endsWith('@fpt.net') && !email.endsWith('@fpt.com')) {
          alert('Email phải có đuôi @fpt.net hoặc @fpt.com!');
          return;
        }

        // BƯỚC 1: Nếu thiết bị này đã từng xác thực email này -> VÀO THẲNG NGAY TỨC THÌ (0.001s)!
        if (ApiService.isTrustedDevice(email)) {
          const sessionData = ApiService.quickLogin(email);
          if (modal) modal.classList.add('hidden');
          this.applyUserSession(sessionData);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
          return;
        }

        // BƯỚC 2: Kiểm tra đối chiếu trên hệ thống đám mây (Google Sheet)
        try {
          requestBtn.disabled = true;
          requestBtn.innerHTML = '<span>Đang kiểm tra tài khoản...</span>';

          const status = await ApiService.checkEmailStatus(email);
          if (status && status.isVerified) {
            // Đã từng xác thực trên hệ thống trước đó -> CHO ĐĂNG NHẬP VÀO THẲNG & NHỚ THIẾT BỊ NÀY!
            const sessionData = ApiService.quickLogin(email);
            if (modal) modal.classList.add('hidden');
            this.applyUserSession(sessionData);
            confetti({
              particleCount: 90,
              spread: 70,
              origin: { y: 0.6 }
            });
            return;
          }

          // BƯỚC 3: Nếu chưa từng xác thực trên hệ thống (Người mới) -> GỬI OTP QUA OUTLOOK
          requestBtn.innerHTML = '<span>Đang gửi mã vào Outlook...</span>';
          await ApiService.requestOtp(email);
          currentEmail = email;

          if (sentToEl) sentToEl.textContent = email;
          if (step1) step1.classList.add('hidden');
          if (step2) step2.classList.remove('hidden');
          if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
          }
          startTimer();

        } catch (err) {
          alert('⚠️ ' + (err.message || 'Không thể gửi mã OTP.'));
        } finally {
          requestBtn.disabled = false;
          updateAuthUIForEmail(email);
        }
      });
    }

    // 3. Quay lại bước 1
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (countdownInterval) clearInterval(countdownInterval);
        if (step2) step2.classList.add('hidden');
        if (step1) step1.classList.remove('hidden');
        if (emailInput) updateAuthUIForEmail(emailInput.value);
      });
    }

    // 4. Gửi lại mã OTP
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        if (!currentEmail) return;
        try {
          resendBtn.disabled = true;
          resendBtn.textContent = 'Đang gửi...';
          await ApiService.requestOtp(currentEmail);
          alert('✅ Đã gửi mã OTP mới vào hộp thư Outlook của bạn! Hãy kiểm tra thông báo hoặc hộp thư đến.');
          startTimer();
        } catch (err) {
          alert('⚠️ ' + (err.message || 'Chưa thể gửi lại mã lúc này.'));
          resendBtn.disabled = false;
          resendBtn.textContent = 'Gửi lại mã';
        }
      });
    }

    // 5. Nút Xác thực OTP (Lần đầu tiên -> Sau đó tự nhớ thiết bị vĩnh viễn)
    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        const otp = codeInput ? codeInput.value.trim() : '';
        if (!otp || otp.length < 6) {
          alert('Vui lòng nhập đúng mã OTP 6 chữ số!');
          return;
        }

        try {
          verifyBtn.disabled = true;
          verifyBtn.innerHTML = '<span>Đang xác thực...</span>';

          const sessionData = await ApiService.verifyOtp(currentEmail, otp);
          if (countdownInterval) clearInterval(countdownInterval);

          if (modal) modal.classList.add('hidden');
          this.applyUserSession(sessionData);

          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 }
          });

        } catch (err) {
          alert('⚠️ ' + (err.message || 'Mã OTP không chính xác.'));
        } finally {
          verifyBtn.disabled = false;
          verifyBtn.innerHTML = '<span>Xác Nhận & Vào Thắp Lửa</span><span>🔥</span>';
        }
      });
    }

    // 6. Đăng xuất (Cả desktop và mobile)
    const handleLogout = () => {
      if (confirm('Bạn có chắc muốn đăng xuất khỏi phiên làm việc này?')) {
        ApiService.logout();
        window.location.reload();
      }
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const mobileLogoutBtn = document.getElementById('user-mobile-logout-btn');
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
  }

  applyUserSession(session) {
    const senderEmailInput = document.getElementById('sender-email');
    const verifiedBadge = document.getElementById('sender-email-verified-badge');
    const userBadge = document.getElementById('user-header-badge');
    const displayEmail = document.getElementById('user-display-email');
    const adminHeaderBtn = document.getElementById('open-admin-panel-btn');
    const openConfigBtn = document.getElementById('open-config-btn');

    // Mobile strip elements
    const mobileBar = document.getElementById('user-mobile-bar');
    const mobileEmail = document.getElementById('user-mobile-email');
    const mobileAdminTag = document.getElementById('user-mobile-admin-tag');

    if (session && session.email) {
      if (senderEmailInput) {
        senderEmailInput.value = session.email;
        senderEmailInput.readOnly = true;
        senderEmailInput.classList.add('bg-black/50', 'border-emerald-500/40', 'text-emerald-300', 'cursor-not-allowed');
      }
      if (verifiedBadge) verifiedBadge.classList.remove('hidden');

      // Desktop user badge (visible on desktop via flex; hidden on mobile via CSS)
      if (userBadge) {
        userBadge.classList.remove('hidden');
        userBadge.classList.add('flex');
      }
      if (displayEmail) displayEmail.textContent = session.email;

      // Mobile user sub-bar (visible on mobile via flex; hidden on desktop via CSS)
      if (mobileBar) {
        mobileBar.classList.remove('hidden');
        mobileBar.classList.add('flex');
      }
      if (mobileEmail) mobileEmail.textContent = session.email;
      if (mobileAdminTag) {
        if (session.isAdmin) mobileAdminTag.classList.remove('hidden');
        else mobileAdminTag.classList.add('hidden');
      }

      if (session.isAdmin) {
        if (adminHeaderBtn) {
          adminHeaderBtn.classList.remove('hidden');
          adminHeaderBtn.classList.add('flex');
        }
        if (openConfigBtn) openConfigBtn.classList.remove('hidden');
      }

      this.updateCardPreview();
    }
  }

  setupAdminPortal() {
    const footerAdminLink = document.getElementById('footer-admin-link');
    const adminPanelModal = document.getElementById('admin-panel-modal');
    const closeAdminPanelBtn = document.getElementById('close-admin-panel-btn');
    const openAdminBtn = document.getElementById('open-admin-panel-btn');
    const secretModal = document.getElementById('admin-secret-modal');
    const closeSecretBtn = document.getElementById('close-secret-modal-btn');
    const submitSecretBtn = document.getElementById('submit-secret-key-btn');
    const secretInput = document.getElementById('admin-secret-key-input');

    const tabSubmissions = document.getElementById('admin-tab-submissions');
    const tabUsers = document.getElementById('admin-tab-users');
    const tabConfig = document.getElementById('admin-tab-config');
    const tabExport = document.getElementById('admin-tab-export');

    const viewSubmissions = document.getElementById('admin-view-submissions');
    const viewUsers = document.getElementById('admin-view-users');
    const viewConfig = document.getElementById('admin-view-config');
    const viewExport = document.getElementById('admin-view-export');

    const adminUrlInput = document.getElementById('admin-script-url-input');
    const adminSaveUrlBtn = document.getElementById('admin-save-url-btn');
    const addAdminBtn = document.getElementById('add-admin-btn');
    const newAdminInput = document.getElementById('new-admin-email-input');
    const newAdminRoleSelect = document.getElementById('new-admin-role-select');
    const exportCsvBtn = document.getElementById('admin-export-csv-btn');
    const refreshSubmissionsBtn = document.getElementById('admin-refresh-submissions-btn');
    const searchSubmissionsInput = document.getElementById('admin-search-submissions-input');

    const adminBtnModeDirect = document.getElementById('admin-btn-mode-direct');
    const adminBtnModeOtp = document.getElementById('admin-btn-mode-otp');
    const adminAuthModeBadge = document.getElementById('admin-auth-mode-badge');

    const refreshAdminAuthModeUI = (mode) => {
      const isDirect = mode === 'direct';
      if (adminAuthModeBadge) {
        adminAuthModeBadge.textContent = isDirect ? '⚡ Siêu Tốc (0.1s)' : '🔐 OTP Outlook';
        adminAuthModeBadge.className = isDirect
          ? 'px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
      if (adminBtnModeDirect) {
        adminBtnModeDirect.className = isDirect
          ? 'p-3 rounded-xl border text-left cursor-pointer transition-all bg-amber-500/20 border-amber-500 text-white shadow-md'
          : 'p-3 rounded-xl border text-left cursor-pointer transition-all bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10';
      }
      if (adminBtnModeOtp) {
        adminBtnModeOtp.className = !isDirect
          ? 'p-3 rounded-xl border text-left cursor-pointer transition-all bg-amber-500/20 border-amber-500 text-white shadow-md'
          : 'p-3 rounded-xl border text-left cursor-pointer transition-all bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10';
      }
    };

    if (adminBtnModeDirect) {
      adminBtnModeDirect.addEventListener('click', async () => {
        adminBtnModeDirect.disabled = true;
        await ApiService.adminToggleAuthMode('direct');
        refreshAdminAuthModeUI('direct');
        alert('⚡ Đã chuyển sang chế độ: Xác thực nhanh tức thì (0.1s, không cần mã OTP)!');
        window.location.reload();
      });
    }

    if (adminBtnModeOtp) {
      adminBtnModeOtp.addEventListener('click', async () => {
        adminBtnModeOtp.disabled = true;
        await ApiService.adminToggleAuthMode('otp');
        refreshAdminAuthModeUI('otp');
        alert('🔐 Đã chuyển sang chế độ: Bắt buộc gửi mã OTP qua Outlook!');
        window.location.reload();
      });
    }

    const openAdminDashboard = () => {
      refreshAdminAuthModeUI(ApiService.getAuthMode());
      if (adminUrlInput) adminUrlInput.value = localStorage.getItem('ftel_custom_script_url') || APPS_SCRIPT_URL;
      if (adminPanelModal) adminPanelModal.classList.remove('hidden');
      selectTab(tabSubmissions, viewSubmissions);
      this.loadSubmissionsList();
      this.loadAdminList();
    };

    const handleAdminTrigger = () => {
      const adminSess = ApiService.getAdminSession();
      const userSess = ApiService.getUserSession();
      if ((adminSess && adminSess.isAdmin) || (userSess && userSess.isAdmin)) {
        openAdminDashboard();
      } else {
        if (secretModal) secretModal.classList.remove('hidden');
        if (secretInput) {
          secretInput.value = '';
          secretInput.focus();
        }
      }
    };

    if (footerAdminLink) footerAdminLink.addEventListener('click', handleAdminTrigger);
    if (openAdminBtn) openAdminBtn.addEventListener('click', handleAdminTrigger);
    if (closeAdminPanelBtn) closeAdminPanelBtn.addEventListener('click', () => adminPanelModal && adminPanelModal.classList.add('hidden'));
    if (closeSecretBtn) closeSecretBtn.addEventListener('click', () => secretModal && secretModal.classList.add('hidden'));

    if (submitSecretBtn) {
      submitSecretBtn.addEventListener('click', async () => {
        const key = secretInput ? secretInput.value.trim() : '';
        if (!key) return;
        try {
          submitSecretBtn.disabled = true;
          submitSecretBtn.textContent = 'Đang kiểm tra...';
          await ApiService.adminLogin(key);
          if (secretModal) secretModal.classList.add('hidden');
          
          const cfgBtn = document.getElementById('open-config-btn');
          if (cfgBtn) cfgBtn.classList.remove('hidden');

          const admBtn = document.getElementById('open-admin-panel-btn');
          if (admBtn) {
            admBtn.classList.remove('hidden');
            admBtn.classList.add('flex');
          }

          openAdminDashboard();
        } catch (err) {
          alert('⚠️ ' + (err.message || 'Khóa bí mật không đúng!'));
        } finally {
          submitSecretBtn.disabled = false;
          submitSecretBtn.textContent = 'Vào Quản Trị';
        }
      });
    }

    const selectTab = (activeTab, activeView) => {
      [tabSubmissions, tabUsers, tabConfig, tabExport].forEach(t => {
        if (t) t.className = 'px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer flex items-center gap-1.5 whitespace-nowrap';
      });
      [viewSubmissions, viewUsers, viewConfig, viewExport].forEach(v => v && v.classList.add('hidden'));
      if (activeTab) activeTab.className = 'px-3.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer flex items-center gap-1.5 whitespace-nowrap';
      if (activeView) activeView.classList.remove('hidden');
    };

    if (tabSubmissions) tabSubmissions.addEventListener('click', () => {
      selectTab(tabSubmissions, viewSubmissions);
      this.loadSubmissionsList();
    });
    if (tabUsers) tabUsers.addEventListener('click', () => {
      selectTab(tabUsers, viewUsers);
      this.loadAdminList();
    });
    if (tabConfig) tabConfig.addEventListener('click', () => selectTab(tabConfig, viewConfig));
    if (tabExport) tabExport.addEventListener('click', () => selectTab(tabExport, viewExport));

    if (refreshSubmissionsBtn) {
      refreshSubmissionsBtn.addEventListener('click', () => this.loadSubmissionsList());
    }

    if (searchSubmissionsInput) {
      searchSubmissionsInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        this.filterSubmissions(query);
      });
    }

    if (adminSaveUrlBtn) {
      adminSaveUrlBtn.addEventListener('click', () => {
        const val = adminUrlInput ? adminUrlInput.value.trim() : '';
        if (val) {
          localStorage.setItem('ftel_custom_script_url', val);
          alert('Đã cập nhật URL Google Apps Script thành công!');
          window.location.reload();
        }
      });
    }

    if (addAdminBtn) {
      addAdminBtn.addEventListener('click', async () => {
        const targetEmail = newAdminInput ? newAdminInput.value.trim().toLowerCase() : '';
        const role = newAdminRoleSelect ? newAdminRoleSelect.value : 'Admin Quản Lý';
        if (!targetEmail) {
          alert('Vui lòng nhập email FTEL cần cấp quyền Admin!');
          return;
        }
        try {
          addAdminBtn.disabled = true;
          addAdminBtn.textContent = 'Đang thêm...';
          const res = await ApiService.adminSetAdmin(targetEmail, 'add', role);
          if (res.success) {
            alert('✅ ' + res.message);
            if (newAdminInput) newAdminInput.value = '';
            this.loadAdminList();
          } else {
            alert('⚠️ ' + res.message);
          }
        } catch (e) {
          alert('Lỗi: ' + e.message);
        } finally {
          addAdminBtn.disabled = false;
          addAdminBtn.textContent = '+ Cấp Quyền';
        }
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', async () => {
        try {
          exportCsvBtn.disabled = true;
          exportCsvBtn.textContent = 'Đang trích xuất dữ liệu...';
          const res = await ApiService.adminGetAllSubmissions();
          if (res.success && Array.isArray(res.data)) {
            this.downloadSubmissionsCsv(res.data);
          } else {
            alert('⚠️ ' + (res.message || 'Không thể tải dữ liệu.'));
          }
        } catch (e) {
          alert('Lỗi xuất dữ liệu: ' + e.message);
        } finally {
          exportCsvBtn.disabled = false;
          exportCsvBtn.textContent = '📥 Tải File CSV / Excel Ngay';
        }
      });
    }
  }

  async loadSubmissionsList() {
    const container = document.getElementById('admin-submissions-table-container');
    const countEl = document.getElementById('admin-submissions-count');
    if (!container) return;

    try {
      container.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Đang tải toàn bộ dữ liệu từ Google Sheets...</div>';
      const res = await ApiService.adminGetAllSubmissions();
      if (res.success && Array.isArray(res.data)) {
        this.cachedSubmissions = res.data;
        if (countEl) countEl.textContent = res.data.length;
        this.renderSubmissionsTable(this.cachedSubmissions);
      } else {
        container.innerHTML = '<div class="py-12 text-center text-rose-400 text-xs">Không thể tải dữ liệu: ' + (res.message || 'Lỗi không xác định') + '</div>';
      }
    } catch (err) {
      container.innerHTML = '<div class="py-12 text-center text-rose-400 text-xs">Lỗi kết nối: ' + err.message + '</div>';
    }
  }

  filterSubmissions(query) {
    if (!this.cachedSubmissions) return;
    if (!query) {
      this.renderSubmissionsTable(this.cachedSubmissions);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this.cachedSubmissions.filter(item => {
      return (item.submissionId && String(item.submissionId).toLowerCase().includes(q)) ||
        (item.senderName && String(item.senderName).toLowerCase().includes(q)) ||
        (item.senderEmail && String(item.senderEmail).toLowerCase().includes(q)) ||
        (item.recipientName && String(item.recipientName).toLowerCase().includes(q)) ||
        (item.recipientEmail && String(item.recipientEmail).toLowerCase().includes(q)) ||
        (item.message && String(item.message).toLowerCase().includes(q)) ||
        (item.tag && String(item.tag).toLowerCase().includes(q));
    });
    this.renderSubmissionsTable(filtered);
  }

  renderSubmissionsTable(list) {
    const container = document.getElementById('admin-submissions-table-container');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="py-12 text-center text-slate-500 text-xs">Không tìm thấy lời tri ân nào phù hợp.</div>';
      return;
    }

    const sorted = [...list].reverse();

    const rows = sorted.map((item, idx) => {
      const safeMsg = (item.message || '').replace(/"/g, '&quot;');
      const shortMsg = (item.message || '').length > 60 
        ? (item.message.slice(0, 60) + '...') 
        : (item.message || '');
      
      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition-colors text-xs">
          <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
          <td class="py-3 px-3 font-mono text-[11px] text-amber-400/90 whitespace-nowrap">${item.submissionId || '--'}</td>
          <td class="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">${item.timestamp || '--'}</td>
          <td class="py-3 px-3">
            <div class="font-bold text-white">${item.senderName || '--'}</div>
            <div class="text-[11px] text-slate-400 font-mono">${item.senderEmail || '--'}</div>
            <div class="text-[10px] text-slate-500">${item.senderDept || ''}</div>
          </td>
          <td class="py-3 px-3">
            <div class="font-bold text-orange-300">${item.recipientName || '--'}</div>
            <div class="text-[11px] text-slate-400 font-mono">${item.recipientEmail || '--'}</div>
            <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25">
              ${item.tag || item.recipientRole || 'Tri ân'}
            </span>
          </td>
          <td class="py-3 px-3 max-w-xs">
            <p class="text-slate-300 leading-relaxed text-[11px] line-clamp-2" title="${safeMsg}">
              "${shortMsg}"
            </p>
          </td>
          <td class="py-3 px-3 text-center whitespace-nowrap">
            <button 
              type="button"
              data-delete-id="${item.submissionId}" 
              data-sender="${(item.senderName || item.senderEmail || '').replace(/"/g, '&quot;')}" 
              data-recipient="${(item.recipientName || item.recipientEmail || '').replace(/"/g, '&quot;')}"
              class="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto shadow-sm hover:shadow-rose-500/20"
            >
              <span>🗑️</span>
              <span>Xóa</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="w-full overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/[0.02]">
              <th class="py-2.5 px-3 text-center w-10">STT</th>
              <th class="py-2.5 px-3">Mã Gửi</th>
              <th class="py-2.5 px-3">Thời Gian</th>
              <th class="py-2.5 px-3">Người Gửi (CBNV)</th>
              <th class="py-2.5 px-3">Người Nhận (Thầy/Cô)</th>
              <th class="py-2.5 px-3">Lời Chúc</th>
              <th class="py-2.5 px-3 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    // Gắn sự kiện Xóa
    container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const subId = btn.getAttribute('data-delete-id');
        const sender = btn.getAttribute('data-sender');
        const recipient = btn.getAttribute('data-recipient');

        const confirmMsg = `⚠️ BẠN CÓ CHẮC MUỐN XÓA LỜI CHÚC NÀY?\n\n• Mã gửi: ${subId}\n• Người gửi: ${sender}\n• Người nhận: ${recipient}\n\nDữ liệu sẽ bị xóa vĩnh viễn khỏi Google Sheet và hệ thống Bảng vinh danh!`;

        if (!confirm(confirmMsg)) return;

        try {
          btn.disabled = true;
          btn.innerHTML = '<span>⏳ Đang xóa...</span>';
          const res = await ApiService.adminDeleteSubmission(subId);
          if (res.success) {
            alert('✅ ' + (res.message || 'Đã xóa lời tri ân thành công!'));
            await this.loadSubmissionsList();
            if (this.dashboard && this.dashboard.refresh) {
              this.dashboard.refresh();
            }
          } else {
            alert('⚠️ Không thể xóa: ' + (res.message || 'Lỗi không xác định'));
            btn.disabled = false;
            btn.innerHTML = '<span>🗑️</span><span>Xóa</span>';
          }
        } catch (err) {
          alert('Lỗi kết nối khi xóa: ' + err.message);
          btn.disabled = false;
          btn.innerHTML = '<span>🗑️</span><span>Xóa</span>';
        }
      });
    });
  }

  async loadAdminList() {
    const container = document.getElementById('admin-list-container');
    if (!container) return;
    try {
      container.innerHTML = '<div class="text-xs text-slate-400 py-2">Đang tải danh sách Admin...</div>';
      const res = await ApiService.adminGetAdmins();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        container.innerHTML = res.data.map(admin => {
          const isSuper = admin.role === 'Super Admin';
          return '<div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">' +
            '<div>' +
              '<div class="font-bold text-amber-300 font-mono">' + admin.email + '</div>' +
              '<div class="text-[10px] text-slate-400">Vai trò: ' + admin.role + ' • Cấp ngày: ' + admin.addedDate + '</div>' +
            '</div>' +
            (!isSuper ? 
              '<button data-remove-admin="' + admin.email + '" class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold cursor-pointer">Hủy quyền</button>' : 
              '<span class="text-[10px] text-amber-400/80 px-2 py-0.5 rounded bg-amber-500/10">Toàn quyền</span>') +
          '</div>';
        }).join('');

        container.querySelectorAll('[data-remove-admin]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const target = e.currentTarget.getAttribute('data-remove-admin');
            if (confirm('Bạn có chắc muốn hủy quyền Quản trị của ' + target + '?')) {
              await ApiService.adminSetAdmin(target, 'remove');
              this.loadAdminList();
            }
          });
        });

      } else {
        container.innerHTML = '<div class="text-xs text-slate-500 py-2">Chưa có Admin bổ sung nào.</div>';
      }
    } catch (e) {
      container.innerHTML = '<div class="text-xs text-rose-400 py-2">Không thể tải danh sách Admin: ' + e.message + '</div>';
    }
  }

  downloadSubmissionsCsv(rows) {
    if (!rows || rows.length === 0) {
      alert('Chưa có lời tri ân nào được gửi!');
      return;
    }
    const headers = [
      'Mã Lượt Gửi', 'Thời Gian Gửi', 'Người Gửi', 'Email Người Gửi', 'Đơn Vị Người Gửi',
      'Người Nhận', 'Email Người Nhận', 'Vai Trò Người Nhận', 'Danh Hiệu', 'Lời Cảm Ơn',
      'Phong Cách Thiệp', 'Trạng Thái Mail', 'Thời Gian Mail'
    ];
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(r => {
      const line = [
        r.submissionId, r.timestamp, '"' + (r.senderName || '').replace(/"/g, '""') + '"',
        r.senderEmail, '"' + (r.senderDept || '').replace(/"/g, '""') + '"',
        '"' + (r.recipientName || '').replace(/"/g, '""') + '"', r.recipientEmail,
        '"' + (r.recipientRole || '').replace(/"/g, '""') + '"', '"' + (r.tag || '').replace(/"/g, '""') + '"',
        '"' + (r.message || '').replace(/"/g, '""') + '"', r.cardStyle, r.emailSentStatus, r.emailSentTime
      ];
      csvContent += line.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'FTEL_20_11_DanhSachTriAn_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
