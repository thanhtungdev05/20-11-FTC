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

    // 6. Update Counter in Header
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
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
