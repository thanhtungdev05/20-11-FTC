import { Scene3D } from './scene3d.js';
import { CardGenerator, fptLogoImg, keyVisualImg } from './cardGenerator.js';
import { ApiService, APPS_SCRIPT_URL } from './api.js';
import { DashboardModule } from './dashboard.js';
import * as XLSX from 'xlsx';
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
    // 1. Setup Modals, Navigation & Render Live Dashboard tức thì (0ms First Paint)
    this.setupModals();
    this.setupAdminPortal();
    this.setupBackToTopButton();
    this.setupCampaignActionBar();
    this.dashboard.initInlineDashboard('live-campaign-dashboard');

    // 2. Khởi tạo 3D WebGL Background Scene ngay sau nhịp vẽ giao diện đầu tiên để không chặn hiển thị bảng
    const container = document.getElementById('webgl-canvas-container');
    if (container) {
      requestAnimationFrame(() => {
        this.scene3d = new Scene3D(container);
      });
    }

    // 3. Cập nhật số liệu Live Dashboard định kỳ (mỗi 30 giây, dùng chung 1 request duy nhất)
    setInterval(() => {
      this.dashboard.refreshData();
    }, 30000);
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

  setupBackToTopButton() {
    const floatingBtn = document.getElementById('back-to-top-floating-btn');
    const footerBtn = document.getElementById('footer-back-to-top-btn');

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (footerBtn) {
      footerBtn.addEventListener('click', scrollToTop);
    }

    if (floatingBtn) {
      floatingBtn.addEventListener('click', scrollToTop);
      const handleScroll = () => {
        if (window.scrollY > 260) {
          floatingBtn.classList.remove('hidden');
          floatingBtn.classList.add('flex');
        } else {
          floatingBtn.classList.add('hidden');
          floatingBtn.classList.remove('flex');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
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
    if (tabExport) tabExport.addEventListener('click', () => {
      selectTab(tabExport, viewExport);
      this.ensureExportDataset(false);
    });

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

    const exportTop30Btn = document.getElementById('admin-export-top30-btn');
    const exportTop30WishesBtn = document.getElementById('admin-export-top30-wishes-btn');
    const exportTop100EarlyBtn = document.getElementById('admin-export-top100-early-btn');
    const exportTop100RecBtn = document.getElementById('admin-export-top100-recipients-btn');
    const exportPersonBtn = document.getElementById('admin-export-person-btn');
    const exportPersonSearch = document.getElementById('admin-export-person-search');
    const exportPersonSelect = document.getElementById('admin-export-person-select');
    const exportReloadBtn = document.getElementById('admin-export-reload-btn');
    const exportUploadBtn = document.getElementById('admin-export-csv-upload-btn');
    const exportUploadInput = document.getElementById('admin-export-csv-upload-input');

    const runExportAction = async (btn, loadingText, defaultText, handler) => {
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = loadingText;
        }
        const dataset = await this.ensureExportDataset(false);
        if (!dataset) {
          alert('⚠️ Chưa tải được dữ liệu để xuất. Vui lòng thử bấm Làm mới hoặc nạp file CSV từ Google Sheet.');
          return;
        }
        handler(dataset);
      } catch (e) {
        alert('Lỗi xuất dữ liệu: ' + e.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = defaultText;
        }
      }
    };

    if (exportReloadBtn) {
      exportReloadBtn.addEventListener('click', () => this.ensureExportDataset(true));
    }

    if (exportUploadBtn && exportUploadInput) {
      exportUploadBtn.addEventListener('click', () => exportUploadInput.click());
      exportUploadInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            let parsed;
            if (isExcel) {
              const wb = XLSX.read(ev.target.result, { type: 'array' });
              const firstSheet = wb.Sheets[wb.SheetNames[0]];
              const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
              parsed = ApiService.buildExportDatasetFromRawRows(rows, `csv_upload:${file.name}`);
              if (!parsed || parsed.submissions.length === 0) {
                throw new Error('File Excel không có dữ liệu lời tri ân hợp lệ.');
              }
            } else {
              const text = String(ev.target?.result || '');
              parsed = ApiService.parseUploadedCsvForExport(text, file.name);
            }
            this.exportDataset = parsed;
            this.renderExportDatasetStatus();
            this.populateExportPersonOptions(exportPersonSearch ? exportPersonSearch.value : '');
            alert(`✅ Đã nạp thành công ${parsed.totalSubmissions} lời tri ân hợp lệ từ file "${file.name}" (đầy đủ 100% nội dung lời chúc)!`);
          } catch (err) {
            alert('⚠️ Không thể đọc file: ' + err.message);
          } finally {
            exportUploadInput.value = '';
          }
        };
        reader.onerror = () => {
          alert('⚠️ Lỗi đọc file từ máy tính.');
          exportUploadInput.value = '';
        };
        if (isExcel) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file, 'UTF-8');
        }
      });
    }

    if (exportPersonSearch) {
      exportPersonSearch.addEventListener('input', (e) => {
        this.populateExportPersonOptions(e.target.value);
      });
    }

    if (exportPersonSelect) {
      exportPersonSelect.addEventListener('change', () => {
        this.updateExportPersonSummary();
      });
    }

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () =>
        runExportAction(exportCsvBtn, 'Đang xuất file Excel...', '📥 Tải Toàn Bộ Danh Sách (Excel .xlsx)', (ds) => {
          this.downloadSubmissionsCsv(ds.submissions);
        })
      );
    }

    if (exportTop30Btn) {
      exportTop30Btn.addEventListener('click', () =>
        runExportAction(exportTop30Btn, 'Đang xuất Top 30...', '🏆 Xuất Bảng Xếp Hạng TOP 30 (Excel .xlsx)', (ds) => {
          this.downloadTopRecipientsCsv(ds.topRecipients.slice(0, 30), 30);
        })
      );
    }

    if (exportTop30WishesBtn) {
      exportTop30WishesBtn.addEventListener('click', () =>
        runExportAction(exportTop30WishesBtn, 'Đang tổng hợp lời chúc Top 30...', '💌 Xuất Tất Cả Lời Chúc Gửi Tới TOP 30 (.xlsx)', (ds) => {
          this.downloadTop30WishesCsv(ds);
        })
      );
    }

    if (exportTop100EarlyBtn) {
      exportTop100EarlyBtn.addEventListener('click', () =>
        runExportAction(exportTop100EarlyBtn, 'Đang xuất Top 100...', '⚡ Xuất TOP 100 Gửi Sớm Nhất (Excel .xlsx)', (ds) => {
          this.downloadTop100EarlySendersCsv(ds.early100Senders);
        })
      );
    }

    if (exportTop100RecBtn) {
      exportTop100RecBtn.addEventListener('click', () =>
        runExportAction(exportTop100RecBtn, 'Đang xuất Top 100...', '🔥 Xuất TOP 100 Người Nhận (Excel .xlsx)', (ds) => {
          this.downloadTopRecipientsCsv(ds.topRecipients.slice(0, 100), 100);
        })
      );
    }

    if (exportPersonBtn) {
      exportPersonBtn.addEventListener('click', () =>
        runExportAction(exportPersonBtn, 'Đang xuất file Excel...', '📥 Xuất Lời Chúc Của Người Này (Excel .xlsx)', (ds) => {
          const selectedEmail = exportPersonSelect ? exportPersonSelect.value.trim().toLowerCase() : '';
          if (!selectedEmail) {
            alert('⚠️ Vui lòng chọn một người nhận trong danh sách trước khi xuất!');
            return;
          }
          this.downloadPersonWishesCsv(ds, selectedEmail);
        })
      );
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

  async ensureExportDataset(forceReload = false) {
    if (!forceReload && this.exportDataset) {
      this.renderExportDatasetStatus();
      return this.exportDataset;
    }

    const badgeEl = document.getElementById('admin-export-source-badge');
    const textEl = document.getElementById('admin-export-status-text');
    const selectEl = document.getElementById('admin-export-person-select');
    if (badgeEl) badgeEl.textContent = '⏳ Đang tải dữ liệu...';
    if (selectEl && !this.exportDataset) {
      selectEl.innerHTML = '<option value="">-- Đang tải danh sách người nhận... --</option>';
    }

    try {
      const preloadedDash = this.dashboard?.data || null;
      const ds = await ApiService.fetchExportDataset(preloadedDash);
      this.exportDataset = ds;
      this.renderExportDatasetStatus();
      const searchEl = document.getElementById('admin-export-person-search');
      this.populateExportPersonOptions(searchEl ? searchEl.value : '');
      return ds;
    } catch (err) {
      if (badgeEl) badgeEl.textContent = '⚠️ Lỗi tải dữ liệu';
      if (textEl) textEl.textContent = 'Không thể tải dữ liệu tự động: ' + err.message + '. Bạn có thể dùng nút "📂 Nạp CSV từ Sheet".';
      return null;
    }
  }

  renderExportDatasetStatus() {
    const ds = this.exportDataset;
    const badgeEl = document.getElementById('admin-export-source-badge');
    const textEl = document.getElementById('admin-export-status-text');
    if (!ds || !badgeEl || !textEl) return;

    const totalSub = ds.totalSubmissions || ds.submissions.length || 0;
    const totalRec = ds.topRecipients ? ds.topRecipients.length : 0;

    if (ds.source && ds.source.startsWith('csv_upload:')) {
      const fname = ds.source.replace('csv_upload:', '');
      badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35';
      badgeEl.textContent = `✅ File CSV: ${totalSub} lượt (Đủ 100% lời chúc)`;
      textEl.textContent = `Đang sử dụng dữ liệu đầy đủ từ file "${fname}" (${totalRec} người nhận). Tất cả các nút xuất đều có đủ 100% nội dung lời chúc.`;
    } else if (ds.source === 'google_sheet_live' || ds.hasFullMessages) {
      badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35';
      badgeEl.textContent = `✅ Google Sheet Live: ${totalSub} lượt (Đủ 100% lời chúc)`;
      textEl.textContent = `Đã đồng bộ trực tiếp toàn bộ ${totalSub} lượt hợp lệ (${totalRec} người nhận) kèm đầy đủ nội dung lời chúc & link Drive.`;
    } else {
      badgeEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35';
      badgeEl.textContent = `⚡ API Trực Tuyến: ${totalSub} lượt • ${totalRec} người nhận`;
      textEl.innerHTML = `Sẵn sàng xuất tức thì <strong>Top 30</strong>, <strong>Top 100</strong> và danh sách <strong>${totalSub} lượt gửi</strong>. Nếu cần xuất đủ 100% văn bản lời chúc cũ của từng người, hãy bấm <strong>📂 Nạp CSV từ Sheet</strong>.`;
    }
  }

  populateExportPersonOptions(query = '') {
    const ds = this.exportDataset;
    const selectEl = document.getElementById('admin-export-person-select');
    if (!ds || !selectEl) return;

    const normalize = (s) => String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .trim();

    const qNorm = normalize(query);
    const list = (ds.topRecipients || []).filter(rec => {
      if (!qNorm) return true;
      return (
        normalize(rec.name).includes(qNorm) ||
        normalize(rec.email).includes(qNorm) ||
        normalize(rec.dept).includes(qNorm)
      );
    });

    const prevVal = selectEl.value;
    if (list.length === 0) {
      selectEl.innerHTML = '<option value="">-- Không tìm thấy người nhận phù hợp --</option>';
      this.updateExportPersonSummary();
      return;
    }

    selectEl.innerHTML = list.map(rec => {
      const label = `#${rec.rank} ${rec.name} (${rec.email}) — ${rec.dept} • ${rec.count} ngọn lửa`;
      return `<option value="${rec.email.replace(/"/g, '&quot;')}">${label.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`;
    }).join('');

    if (prevVal && list.some(r => r.email === prevVal)) {
      selectEl.value = prevVal;
    } else {
      selectEl.selectedIndex = 0;
    }
    this.updateExportPersonSummary();
  }

  updateExportPersonSummary() {
    const ds = this.exportDataset;
    const selectEl = document.getElementById('admin-export-person-select');
    const pillEl = document.getElementById('admin-export-person-count-pill');
    const summaryEl = document.getElementById('admin-export-person-summary');
    if (!ds || !selectEl) return;

    const email = (selectEl.value || '').trim().toLowerCase();
    const person = (ds.topRecipients || []).find(r => r.email === email);
    if (!person) {
      if (pillEl) pillEl.textContent = 'Chưa chọn người nhận';
      return;
    }

    const matchedRows = (ds.submissions || []).filter(s => (s.recipientEmail || '').trim().toLowerCase() === email);
    const msgCount = matchedRows.filter(s => s.message && s.message.trim().length > 0).length;

    if (pillEl) {
      pillEl.textContent = `Hạng #${person.rank} • ${matchedRows.length || person.count} ngọn lửa`;
    }
    if (summaryEl) {
      if (ds.hasFullMessages || msgCount >= matchedRows.length) {
        summaryEl.innerHTML = `Đã chọn: <strong class="text-white">${person.name}</strong> (${person.dept}) — <strong class="text-emerald-300">${matchedRows.length} lời chúc đầy đủ nội dung</strong> sẵn sàng xuất CSV.`;
      } else {
        summaryEl.innerHTML = `Đã chọn: <strong class="text-white">${person.name}</strong> (${person.dept}) — <strong class="text-amber-300">${matchedRows.length} lượt gửi</strong> (${msgCount} lượt có sẵn lời chúc từ API). Bấm <strong>📂 Nạp CSV từ Sheet</strong> nếu cần đủ 100% nội dung văn bản.`;
      }
    }
  }

  triggerExcelDownload(headers, dataRows, filename, sheetName = 'DanhSach') {
    const aoa = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Tự động căn độ rộng từng cột vừa vặn, mở Excel ra nhìn đẹp ngay
    ws['!cols'] = headers.map((h, colIdx) => {
      let maxLen = String(h || '').length;
      for (let i = 0; i < dataRows.length; i++) {
        const cellVal = dataRows[i][colIdx];
        const cellStr = String(cellVal == null ? '' : cellVal);
        const longestLine = cellStr.split(/\r?\n/).reduce((m, l) => Math.max(m, l.length), 0);
        if (longestLine > maxLen) maxLen = longestLine;
      }
      return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
    });

    const wb = XLSX.utils.book_new();
    const safeSheetName = String(sheetName || 'DanhSach').replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'DanhSach';
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    const finalName = filename.endsWith('.xlsx') ? filename : filename.replace(/\.csv$/i, '') + '.xlsx';
    XLSX.writeFile(wb, finalName);
  }

  downloadSubmissionsCsv(rows) {
    if (!rows || rows.length === 0) {
      alert('Chưa có lời tri ân nào được gửi!');
      return;
    }
    const headers = [
      'STT', 'Mã Lượt Gửi', 'Thời Gian Gửi', 'Người Gửi', 'Email Người Gửi', 'Đơn Vị Người Gửi',
      'Người Nhận', 'Email Người Nhận', 'Đơn Vị Người Nhận', 'Dấu Ấn Người Nhận', 'Lời Cảm Ơn Đã Chuẩn Hóa',
      'Trạng Thái Kiểm Tra', 'Trạng Thái Mail', 'Link Thiệp Google Drive'
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.submissionId || '',
      r.timestamp || '',
      r.senderName || '',
      r.senderEmail || '',
      r.senderDept || '',
      r.recipientName || '',
      r.recipientEmail || '',
      r.recipientDept || '',
      r.recipientRole || r.tag || '',
      r.message || '',
      r.checkStatus || 'HỢP LỆ',
      r.emailSentStatus || '',
      r.driveCardUrl || r.driveUrl || ''
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerExcelDownload(headers, dataRows, `FTEL_20_11_ToanBoLoiTriAn_${dateStr}.xlsx`, 'Toan Bo Loi Tri An');
  }

  downloadTopRecipientsCsv(topList, topN = 30) {
    if (!topList || topList.length === 0) {
      alert(`Chưa có dữ liệu Top ${topN} để xuất!`);
      return;
    }
    const headers = [
      'Thứ hạng', 'Họ và tên', 'Đơn vị / Phòng ban', 'Email', 'Dấu ấn / Vai trò', 'Số ngọn lửa'
    ];
    const dataRows = topList.map((item, idx) => [
      Number(item.rank || (idx + 1)),
      item.name || '',
      item.dept || 'FPT Telecom',
      item.email || '',
      item.role || '',
      Number(item.count || 0)
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerExcelDownload(headers, dataRows, `FTEL_20_11_Top${topN}_NguoiNhanNhieuLua_${dateStr}.xlsx`, `Top ${topN} Nguoi Nhan`);
  }

  downloadTop30WishesCsv(ds) {
    const top30 = (ds.topRecipients || []).slice(0, 30);
    if (top30.length === 0) {
      alert('Chưa có dữ liệu Top 30!');
      return;
    }
    const rankMap = new Map();
    top30.forEach((item, idx) => rankMap.set(item.email.toLowerCase(), { rank: item.rank || (idx + 1), totalCount: item.count }));

    const matched = (ds.submissions || [])
      .filter(s => rankMap.has((s.recipientEmail || '').trim().toLowerCase()))
      .sort((a, b) => {
        const ra = rankMap.get((a.recipientEmail || '').trim().toLowerCase())?.rank || 999;
        const rb = rankMap.get((b.recipientEmail || '').trim().toLowerCase())?.rank || 999;
        return ra - rb;
      });

    if (matched.length === 0) {
      alert('Chưa tìm thấy danh sách lời chúc chi tiết của Top 30!');
      return;
    }

    const headers = [
      'Hạng Top 30', 'Tổng Ngọn Lửa Người Nhận', 'Người Nhận', 'Email Người Nhận', 'Đơn Vị Nhận',
      'Thời Gian Gửi', 'Người Gửi', 'Email Người Gửi', 'Đơn Vị Gửi', 'Dấu Ấn', 'Lời Chúc Tri Ân', 'Link Thiệp Drive'
    ];
    const dataRows = matched.map(s => {
      const info = rankMap.get((s.recipientEmail || '').trim().toLowerCase()) || {};
      return [
        Number(info.rank || 0),
        Number(info.totalCount || 0),
        s.recipientName || '',
        s.recipientEmail || '',
        s.recipientDept || '',
        s.timestamp || '',
        s.senderName || '',
        s.senderEmail || '',
        s.senderDept || '',
        s.recipientRole || '',
        s.message || '',
        s.driveCardUrl || s.driveUrl || ''
      ];
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerExcelDownload(headers, dataRows, `FTEL_20_11_Top30_TatCaLoiChuc_${dateStr}.xlsx`, 'Loi Chuc Top 30');
  }

  downloadTop100EarlySendersCsv(earlyList) {
    if (!earlyList || earlyList.length === 0) {
      alert('Chưa có dữ liệu Top 100 người gửi sớm nhất!');
      return;
    }
    const headers = [
      'STT', 'Thời Gian Gửi', 'Họ Tên Người Gửi', 'Email Người Gửi', 'Đơn Vị Người Gửi',
      'Gửi Tới Người Nhận', 'Đơn Vị Người Nhận', 'Lời Cảm Ơn'
    ];
    const dataRows = earlyList.slice(0, 100).map((item, idx) => [
      Number(item.order || (idx + 1)),
      item.timestamp || '',
      item.name || item.senderName || '',
      item.email || item.senderEmail || '',
      item.dept || item.senderDept || 'FPT Telecom',
      item.recipientName || '',
      item.recipientDept || '',
      item.message || ''
    ]);
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerExcelDownload(headers, dataRows, `FTEL_20_11_Top100_NguoiGuiSomNhat_${dateStr}.xlsx`, 'Top 100 Gui Som');
  }

  downloadPersonWishesCsv(ds, recipientEmail) {
    const cleanEmail = String(recipientEmail || '').trim().toLowerCase();
    const person = (ds.topRecipients || []).find(r => r.email === cleanEmail);
    const matched = (ds.submissions || []).filter(s => (s.recipientEmail || '').trim().toLowerCase() === cleanEmail);

    if (matched.length === 0) {
      alert('Không tìm thấy lời chúc nào gửi tới người nhận này!');
      return;
    }

    const headers = [
      'STT', 'Thời Gian Gửi', 'Họ Tên Người Gửi', 'Email Người Gửi', 'Đơn Vị Người Gửi',
      'Người Nhận', 'Email Người Nhận', 'Đơn Vị Người Nhận', 'Dấu Ấn / Vai Trò', 'Nội Dung Lời Chúc', 'Link Thiệp Google Drive'
    ];
    const dataRows = matched.map((s, idx) => [
      idx + 1,
      s.timestamp || '',
      s.senderName || '',
      s.senderEmail || '',
      s.senderDept || '',
      s.recipientName || person?.name || '',
      s.recipientEmail || cleanEmail,
      s.recipientDept || person?.dept || '',
      s.recipientRole || person?.role || '',
      s.message || '',
      s.driveCardUrl || s.driveUrl || ''
    ]);

    const safePersonName = String(person?.name || cleanEmail.split('@')[0])
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'NguoiNhan';
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerExcelDownload(headers, dataRows, `FTEL_20_11_LoiChuc_${safePersonName}_${dateStr}.xlsx`, `Loi Chuc ${safePersonName}`);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
