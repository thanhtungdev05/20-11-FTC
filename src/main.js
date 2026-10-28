import { Scene3D } from './scene3d.js';
import { CardGenerator, fptLogoImg, keyVisualImg } from './cardGenerator.js';
import { ApiService, APPS_SCRIPT_URL } from './api.js';
import { DashboardModule } from './dashboard.js';
import {
  lookupEmployeeName,
  cleanAndCorrectVietnameseText
} from './mockData.js';

class App {
  constructor() {
    this.scene3d = null;
    this.dashboard = new DashboardModule();
    this.isSyncing = false;

    this.init();
  }

  async init() {
    // 1. Initialize 3D WebGL Background Scene (Ngọn lửa 3D trung tâm)
    const container = document.getElementById('webgl-canvas-container');
    if (container) {
      this.scene3d = new Scene3D(container);
    }

    // 2. Setup Config & Admin Portal Modals
    this.setupModals();
    this.setupAdminPortal();

    // 3. Setup Campaign Action Bar & Initialize Live Dashboard (Khu vực A - B - C - D)
    this.setupCampaignActionBar();
    await this.dashboard.initInlineDashboard('live-campaign-dashboard');
    await this.updateHeaderCounter();

    // 4. Đảm bảo phôi thiệp trống 1080x1440 & bộ font chữ đã sẵn sàng, sau đó kích hoạt Auto-Worker ngầm
    const startAutoWorker = () => {
      this.runBackgroundGoogleFormSync();
      // Tự động quét Google Sheet mỗi 15 giây để lọc chính tả, xuất thiệp 1080x1440 và bắn mail tự động
      setInterval(() => {
        this.runBackgroundGoogleFormSync();
      }, 15000);
    };

    if (keyVisualImg && !keyVisualImg.complete) {
      keyVisualImg.onload = () => startAutoWorker();
    } else {
      startAutoWorker();
    }
  }

  setupCampaignActionBar() {
    const syncFormBtn = document.getElementById('sync-google-form-btn');
    const adminSyncFormBtn = document.getElementById('admin-sync-form-btn');
    const statusBanner = document.getElementById('google-sync-status-banner');

    const handleManualSync = async (btnEl) => {
      if (this.isSyncing) return;
      this.isSyncing = true;
      const origHtml = btnEl ? btnEl.innerHTML : '';
      try {
        if (btnEl) {
          btnEl.disabled = true;
          btnEl.innerHTML = `<span class="animate-spin">⚙️</span><span>Đang lọc chính tả & xuất thiệp gửi mail...</span>`;
        }
        if (statusBanner) {
          statusBanner.classList.remove('hidden');
          statusBanner.className = 'mt-3 max-w-2xl mx-auto px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-xs text-amber-300 font-medium shadow-xl backdrop-blur-md';
          statusBanner.innerHTML = '⏳ Đang kiểm tra câu trả lời mới từ Google Form, lọc trùng lặp, sửa lỗi chính tả và xuất E-Card 1080x1440 gửi tới Người nhận & Người gửi...';
        }

        const res = await ApiService.syncAndRenderGoogleFormRows(CardGenerator);
        await this.dashboard.refreshData();
        await this.updateHeaderCounter();
        if (this.cachedSubmissions) {
          await this.loadSubmissionsList();
        }

        const processedCount = res?.processed || 0;
        if (statusBanner) {
          statusBanner.className = 'mt-3 max-w-2xl mx-auto px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-xs text-emerald-300 font-medium shadow-xl backdrop-blur-md';
          if (processedCount > 0) {
            statusBanner.innerHTML = `✅ Đã tự động lọc chính tả, xuất <strong>${processedCount}</strong> thiệp E-Card 1080x1440 mới từ Google Form, lưu Google Drive và gửi thẳng email cho Người nhận & Người gửi!`;
          } else {
            statusBanner.innerHTML = `✅ Hệ thống đang đồng bộ thời gian thực! Mọi câu trả lời hợp lệ từ Google Form đều đã được lọc chính tả và gửi thiệp E-Card tới Người nhận & Người gửi.`;
          }
        }
      } catch (err) {
        if (statusBanner) {
          statusBanner.className = 'mt-3 max-w-2xl mx-auto px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-rose-500/40 text-xs text-rose-300 font-medium shadow-xl backdrop-blur-md';
          statusBanner.innerHTML = `⚠️ Thông báo đồng bộ: ${err.message || 'Vui lòng kiểm tra kết nối Google Apps Script.'}`;
        }
      } finally {
        this.isSyncing = false;
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = origHtml;
        }
      }
    };

    if (syncFormBtn) {
      syncFormBtn.addEventListener('click', () => handleManualSync(syncFormBtn));
    }
    if (adminSyncFormBtn) {
      adminSyncFormBtn.addEventListener('click', () => handleManualSync(adminSyncFormBtn));
    }
  }

  async runBackgroundGoogleFormSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await ApiService.syncAndRenderGoogleFormRows(CardGenerator);
      if (res && res.processed > 0) {
        await this.dashboard.refreshData();
        await this.updateHeaderCounter();
      }
    } catch (e) {
      // Silent in background
    } finally {
      this.isSyncing = false;
    }
  }

  setupModals() {
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
        const full = await ApiService.getFullDashboardData();
        counterEl.textContent = (full?.totalFlames || full?.overview?.totalFlames || 265) + '+';
      } catch (e) {
        console.error(e);
      }
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

    const openAdminDashboard = () => {
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
      const isDup = String(item.checkStatus || '').toUpperCase().includes('TRÙNG');
      const statusBadge = isDup
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">TRÙNG LẶP</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">HỢP LỆ</span>`;

      const driveLinkHtml = item.driveCardUrl
        ? `<a href="${item.driveCardUrl}" target="_blank" class="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold">☁️ Drive</a>`
        : '';

      return `
        <tr class="border-b border-white/5 hover:bg-white/[0.03] transition-colors text-xs">
          <td class="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">${idx + 1}</td>
          <td class="py-3 px-3 font-mono text-[11px] text-amber-400/90 whitespace-nowrap">
            <div>${item.submissionId || '--'}</div>
            <div class="mt-1">${statusBadge}</div>
          </td>
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
            <div class="flex items-center justify-center gap-1.5">
              ${driveLinkHtml}
              <button 
                type="button"
                data-export-card-idx="${idx}"
                class="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Tải ảnh Thiệp E-Card 1080x1440 của bản ghi này"
              >
                <span>🖼️</span>
                <span>Thiệp</span>
              </button>
              <button 
                type="button"
                data-delete-id="${item.submissionId}" 
                data-sender="${(item.senderName || item.senderEmail || '').replace(/"/g, '&quot;')}" 
                data-recipient="${(item.recipientName || item.recipientEmail || '').replace(/"/g, '&quot;')}"
                class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🗑️</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="w-full overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr class="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/[0.02]">
              <th class="py-2.5 px-3 text-center w-10">STT</th>
              <th class="py-2.5 px-3">Mã / Trạng Thái</th>
              <th class="py-2.5 px-3">Thời Gian</th>
              <th class="py-2.5 px-3">Người Gửi (CBNV)</th>
              <th class="py-2.5 px-3">Người Nhận (Thầy/Cô)</th>
              <th class="py-2.5 px-3">Lời Chúc (Đã Lọc Chính Tả)</th>
              <th class="py-2.5 px-3 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

    // Gắn sự kiện Xuất Thiệp 1080x1440 cho từng dòng
    container.querySelectorAll('[data-export-card-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-export-card-idx'));
        const item = sorted[idx];
        if (!item) return;
        CardGenerator.downloadCard({
          senderName: item.senderName || lookupEmployeeName(item.senderEmail) || 'Đồng nghiệp FTEL',
          senderEmail: item.senderEmail || '',
          senderDept: item.senderDept || 'FPT Telecom',
          recipientName: item.recipientName || lookupEmployeeName(item.recipientEmail) || 'Người Thầy FTEL',
          recipientEmail: item.recipientEmail || '',
          recipientRole: item.recipientRole || item.tag || 'Giảng viên – Người truyền tri thức',
          message: cleanAndCorrectVietnameseText(item.message || '')
        });
      });
    });

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
          btn.innerHTML = '<span>⏳</span>';
          const res = await ApiService.adminDeleteSubmission(subId);
          if (res.success) {
            alert('✅ ' + (res.message || 'Đã xóa lời tri ân thành công!'));
            await this.loadSubmissionsList();
            if (this.dashboard && this.dashboard.refreshData) {
              this.dashboard.refreshData();
            }
          } else {
            alert('⚠️ Không thể xóa: ' + (res.message || 'Lỗi không xác định'));
            btn.disabled = false;
            btn.innerHTML = '<span>🗑️</span>';
          }
        } catch (err) {
          alert('Lỗi kết nối khi xóa: ' + err.message);
          btn.disabled = false;
          btn.innerHTML = '<span>🗑️</span>';
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
      'Người Nhận', 'Email Người Nhận', 'Đơn Vị Người Nhận', 'Dấu Ấn Người Nhận', 'Lời Cảm Ơn Đã Chuẩn Hóa',
      'Trạng Thái Kiểm Tra', 'Trạng Thái Mail', 'Link Thiệp Google Drive'
    ];
    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach(r => {
      const line = [
        r.submissionId || '',
        r.timestamp || '',
        '"' + (r.senderName || '').replace(/"/g, '""') + '"',
        r.senderEmail || '',
        '"' + (r.senderDept || '').replace(/"/g, '""') + '"',
        '"' + (r.recipientName || '').replace(/"/g, '""') + '"',
        r.recipientEmail || '',
        '"' + (r.recipientDept || '').replace(/"/g, '""') + '"',
        '"' + (r.recipientRole || r.tag || '').replace(/"/g, '""') + '"',
        '"' + (r.message || '').replace(/"/g, '""') + '"',
        r.checkStatus || 'HỢP LỆ',
        r.emailSentStatus || '',
        r.driveCardUrl || ''
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
