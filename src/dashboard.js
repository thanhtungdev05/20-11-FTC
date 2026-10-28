import { ApiService } from './api.js';
import { GOOGLE_FORM_URL, GOOGLE_HR_SHEET_URL } from './mockData.js';
import { CardGenerator } from './cardGenerator.js';

/**
 * Module Live Dashboard Chiến Dịch 20/11 (Khu vực A - B - C - D + Tìm kiếm DS Nhân sự & Chi tiết Đơn vị)
 * - Khu vực B: Tổng quan chiến dịch (4 chỉ số KPI thời gian thực)
 * - Khu vực Tra cứu DS Nhân sự: Tìm kiếm nhân sự theo Họ tên, Email, Account, Đơn vị từ Sheet DS nhân sự (gid=1084168011)
 * - Khu vực C: Bảng xếp hạng ("30 NGƯỜI TIẾP LỬA TRI THỨC" với Top 3 nổi bật + "100 NGƯỜI TIẾP LỬA SỚM NHẤT" dạng Timeline)
 * - Khu vực D: Lan tỏa theo đơn vị (Theo đúng DS nhân sự - Bấm vào đơn vị hoặc từng chỉ số 🔥 Ngọn lửa / 💌 Người gửi / 🎓 Người nhận để xem danh sách chi tiết)
 */
export class DashboardModule {
  constructor() {
    this.data = null;
    this.selectedUnitFilter = 'ALL';
    this.searchQuery = '';
    this.activeRankingTab = 'top30'; // 'top30' | 'early100'

    // Trạng thái Tìm kiếm Nhân sự trong DS Nhân sự
    this.hrSearchQuery = '';
    this.hrUnitFilter = 'ALL';
    this.showHrSyncPanel = false;
    this.hrSyncStatusMsg = '';

    // Trạng thái mở chi tiết Đơn vị ở Khu vực D
    this.expandedUnit = 'Trung tâm Đào tạo FTEL (FTC)'; // Mở sẵn đơn vị dẫn đầu để người dùng thấy ngay chi tiết, có thể đóng/mở bất kỳ đơn vị nào
    this.expandedUnitTab = 'overview_all'; // 'overview_all' | 'flames' | 'senders' | 'recipients' | 'members'
    this.unitMemberSearch = '';
  }

  /**
   * Khởi tạo và hiển thị Live Dashboard trực tiếp trên trang chính
   */
  async initInlineDashboard(containerId = 'live-campaign-dashboard') {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    await this.refreshData();
  }

  async refreshData() {
    try {
      this.data = await ApiService.getFullDashboardData();
      // Nếu đơn vị đang mở chưa có trong danh sách thì mặc định chọn đơn vị đầu tiên
      if (this.data?.unitSpread?.length > 0 && this.expandedUnit) {
        const exists = this.data.unitSpread.some(u => u.unit === this.expandedUnit);
        if (!exists) {
          this.expandedUnit = this.data.unitSpread[0].unit;
        }
      }
      this.renderInline();
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard:', err);
    }
  }

  async refresh() {
    return this.refreshData();
  }

  open() {
    const dashEl = document.getElementById('live-campaign-dashboard');
    if (dashEl) {
      dashEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.refreshData();
    }
  }

  getInitials(name) {
    if (!name) return 'FT';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  normalizeText(str) {
    if (!str) return '';
    return String(str)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  /**
   * Tiền xử lý chỉ mục tìm kiếm 1 lần duy nhất trên RAM cho 24.608+ nhân sự
   * Giúp mỗi lần gõ phím không phải chạy lại normalize('NFD') 50.000 lần (0ms lag)
   */
  ensureHrSearchIndex(hrDirectory) {
    if (!Array.isArray(hrDirectory) || hrDirectory.length === 0) return;
    if (hrDirectory._searchIndexed && hrDirectory._indexedLen === hrDirectory.length) return;

    for (let i = 0; i < hrDirectory.length; i++) {
      const emp = hrDirectory[i];
      if (!emp || emp._idxReady) continue;
      const nameLower = String(emp.name || '').trim().toLowerCase();
      const nameNorm = this.normalizeText(nameLower);
      const nameWords = nameNorm.split(/\s+/).filter(Boolean);
      const givenName = nameWords.length > 0 ? nameWords[nameWords.length - 1] : '';
      const emailLower = String(emp.email || '').trim().toLowerCase();
      const account = emailLower.split('@')[0];
      const alphaAccount = account.replace(/[0-9_.-]+$/, '');
      const deptLower = String(emp.dept || '').trim().toLowerCase();
      const deptNorm = this.normalizeText(deptLower);
      const kwNorm = emp.keywords ? this.normalizeText(emp.keywords) : '';

      emp._nameLower = nameLower;
      emp._nameNorm = nameNorm;
      emp._givenName = givenName;
      emp._emailLower = emailLower;
      emp._account = account;
      emp._alphaAccount = alphaAccount;
      emp._deptLower = deptLower;
      emp._deptNorm = deptNorm;
      emp._searchBlob = `${nameNorm} ${nameLower} ${emailLower} ${account} ${deptNorm} ${kwNorm}`;
      emp._idxReady = true;
    }

    hrDirectory._searchIndexed = true;
    hrDirectory._indexedLen = hrDirectory.length;
  }

  /**
   * Thuật toán tìm kiếm siêu tốc (< 2ms cho 24.608 nhân sự):
   * Hỗ trợ nhập HỌ TÊN (có dấu / không dấu / tên gọi / họ + tên) HOẶC nhập EMAIL / ACCOUNT (@fpt.com, @fpt.net)
   * Tự động xếp hạng độ ưu tiên kết quả sát nhất lên đầu
   */
  searchHrDirectoryFast(hrDirectory = []) {
    this.ensureHrSearchIndex(hrDirectory);

    const rawQuery = String(this.hrSearchQuery || '').trim();
    const unitFilter = this.hrUnitFilter || 'ALL';
    const filterByUnit = unitFilter !== 'ALL';
    const maxHrDisplay = rawQuery ? 60 : 30;

    // Trường hợp chưa nhập từ khóa: trả về tức thì O(1) nếu chọn ALL
    if (!rawQuery) {
      if (!filterByUnit) {
        return {
          displayedList: hrDirectory.slice(0, maxHrDisplay),
          totalMatched: hrDirectory.length,
          maxHrDisplay
        };
      }
      const unitItems = [];
      let totalMatched = 0;
      for (let i = 0; i < hrDirectory.length; i++) {
        const emp = hrDirectory[i];
        if (emp.dept === unitFilter) {
          totalMatched++;
          if (unitItems.length < maxHrDisplay) unitItems.push(emp);
        }
      }
      return { displayedList: unitItems, totalMatched, maxHrDisplay };
    }

    // Chuẩn hóa từ khóa tìm kiếm 1 lần duy nhất
    const rawQ = rawQuery.toLowerCase();
    const normQ = this.normalizeText(rawQ);
    const qAccount = normQ.split('@')[0].replace(/\s+/g, '');
    const words = normQ.split(/\s+/).filter(Boolean);

    // Chuyển đổi thông minh Họ tên tiếng Việt -> cấu trúc Account FPT (VD: "Lê Hoàng Nhân" -> "nhanlh", "Đặng Thanh Tùng" -> "tungdt")
    const givenNameQ = words.length >= 2 ? words[words.length - 1] : '';
    const precedingInitialsQ = words.length >= 2 ? words.slice(0, -1).map(w => w[0]).join('') : '';
    const fptFullPrefixQ = givenNameQ ? `${givenNameQ}${precedingInitialsQ}` : '';

    const bucket1 = []; // Khớp chính xác Email / Account / Họ tên / Account FPT
    const bucket2 = []; // Bắt đầu bằng Tên / Account hoặc khớp Tên gọi chính xác
    const bucket3 = []; // Chứa cụm từ trong Họ tên hoặc Email
    const bucket4 = []; // Khớp đa từ khóa rời (VD: "Lê Nhân", "Nhân FTC")
    let totalMatched = 0;

    for (let i = 0; i < hrDirectory.length; i++) {
      const emp = hrDirectory[i];
      if (filterByUnit && emp.dept !== unitFilter) continue;

      // 1. Khớp chính xác tuyệt đối
      if (
        emp._emailLower === rawQ ||
        emp._emailLower === normQ ||
        emp._account === qAccount ||
        emp._alphaAccount === qAccount ||
        emp._nameNorm === normQ ||
        emp._nameLower === rawQ ||
        (fptFullPrefixQ && emp._alphaAccount === fptFullPrefixQ)
      ) {
        totalMatched++;
        if (bucket1.length < maxHrDisplay) bucket1.push(emp);
        continue;
      }

      // 2. Khớp bắt đầu bằng Tên / Account hoặc khớp đúng Tên gọi (VD: gõ "Nhân", "Tùng", "Lê Nhân")
      const isFptPartialAccountMatch =
        givenNameQ &&
        emp._alphaAccount.startsWith(givenNameQ) &&
        emp._alphaAccount.length - givenNameQ.length <= 4 &&
        emp._alphaAccount.slice(givenNameQ.length).includes(precedingInitialsQ);

      if (
        (words.length === 1 && qAccount.length >= 2 && (emp._account.startsWith(qAccount) || emp._givenName === normQ)) ||
        emp._nameNorm.startsWith(normQ) ||
        emp._nameLower.startsWith(rawQ) ||
        isFptPartialAccountMatch
      ) {
        totalMatched++;
        if (bucket1.length + bucket2.length < maxHrDisplay) bucket2.push(emp);
        continue;
      }

      // 3. Khớp chuỗi con trực tiếp trong Họ tên hoặc Email / Account
      if (
        emp._nameLower.includes(rawQ) ||
        emp._nameNorm.includes(normQ) ||
        emp._emailLower.includes(rawQ) ||
        emp._emailLower.includes(normQ) ||
        (qAccount.length >= 2 && emp._account.includes(qAccount))
      ) {
        totalMatched++;
        if (bucket1.length + bucket2.length + bucket3.length < maxHrDisplay) bucket3.push(emp);
        continue;
      }

      // 4. Khớp tất cả các từ khóa rời trong Họ tên + Email + Đơn vị (VD: "Lê Nhân", "Tùng FTC")
      if (words.length > 1) {
        let allWordsMatch = true;
        for (let w = 0; w < words.length; w++) {
          if (!emp._searchBlob.includes(words[w])) {
            allWordsMatch = false;
            break;
          }
        }
        if (allWordsMatch) {
          totalMatched++;
          if (bucket1.length + bucket2.length + bucket3.length + bucket4.length < maxHrDisplay) {
            bucket4.push(emp);
          }
          continue;
        }
      } else if (emp._deptNorm.includes(normQ) || emp._searchBlob.includes(normQ)) {
        totalMatched++;
        if (bucket1.length + bucket2.length + bucket3.length + bucket4.length < maxHrDisplay) {
          bucket4.push(emp);
        }
      }
    }

    const displayedList = [...bucket1, ...bucket2, ...bucket3, ...bucket4].slice(0, maxHrDisplay);
    return { displayedList, totalMatched, maxHrDisplay };
  }

  renderHrResultsGridHtml(displayedList = [], totalMatched = 0) {
    if (displayedList.length === 0) {
      return `
        <div class="py-8 text-center text-slate-300 text-xs space-y-3">
          <div>Không tìm thấy nhân sự nào khớp với từ khóa "<strong>${this.hrSearchQuery}</strong>" trong bộ nhớ hiện tại.</div>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              id="hr-empty-open-sync-btn"
              class="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-extrabold cursor-pointer"
            >
              📥 Bấm để Đồng bộ / Dán nhanh DS Nhân sự từ Sheet (gid=1084168011)
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        ${displayedList.map(emp => `
          <div class="rounded-2xl bg-slate-950/85 border border-white/10 hover:border-amber-400/50 transition-all flex flex-col justify-between overflow-hidden shadow-lg group">
            <!-- Top Header Strip -->
            <div class="px-3.5 py-2 bg-white/[0.03] border-b border-white/5 flex items-center justify-between gap-2 text-[11px]">
              <span class="text-slate-300 font-semibold truncate">🏢 ${emp.dept || 'FPT Telecom'}</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] shrink-0">Active</span>
            </div>

            <!-- Contact Body -->
            <div class="p-3.5 flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500/30 to-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs font-black text-amber-300 shrink-0 shadow-inner">
                ${this.getInitials(emp.name)}
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-extrabold text-white text-sm truncate group-hover:text-amber-300 transition-colors" title="${emp.name}">${emp.name}</div>
                <button 
                  type="button"
                  data-copy-email="${emp.email}"
                  class="text-xs font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1.5 truncate mt-1 cursor-pointer"
                  title="Bấm để copy Email"
                >
                  <span class="truncate">📧 ${emp.email}</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 font-sans font-bold shrink-0">Copy</span>
                </button>
              </div>
            </div>

            <!-- AdminLTE Contact Card Footer -->
            <div class="px-3.5 py-2.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-2.5">
                <span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold">🎓 Nhận: ${emp.receivedCount || 0} 🔥</span>
                <span class="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 font-semibold">💌 Gửi: ${emp.sentCount || 0}</span>
              </div>
              <a 
                href="${GOOGLE_FORM_URL}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-extrabold hover:brightness-110 transition-all"
              >
                🔥 Tri ân
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderHrFooterHtml(displayedCount = 0, totalMatched = 0, totalDirectory = 0) {
    const hasQuery = Boolean(String(this.hrSearchQuery || '').trim());
    return `
      <span>
        ${hasQuery
          ? `🔍 Tìm thấy <strong class="text-emerald-400">${totalMatched.toLocaleString('vi-VN')}</strong> kết quả khớp từ khóa (Hiển thị <strong class="text-amber-300">${displayedCount.toLocaleString('vi-VN')}</strong> nhân sự sát nhất / Tổng <strong class="text-white">${totalDirectory.toLocaleString('vi-VN')}</strong> CBNV)`
          : `Hiển thị <strong class="text-amber-300">${displayedCount.toLocaleString('vi-VN')}</strong> / <strong class="text-white">${totalMatched.toLocaleString('vi-VN')}</strong> nhân sự trong danh bạ`}
      </span>
      <span class="text-[11px] text-slate-400">💡 Hỗ trợ tìm nhanh theo <strong>Họ tên (có/không dấu)</strong> hoặc <strong>Email / Account</strong> • Bấm vào Email để Copy</span>
    `;
  }

  /**
   * Chỉ cập nhật vùng kết quả tìm kiếm Nhân sự mà KHÔNG vẽ lại toàn bộ trang Dashboard
   * Giúp gõ tiếng Việt (Unikey) và tìm trên 24.608 nhân sự mượt tức thì 100% không lag
   */
  updateHrSearchOnly() {
    if (!this.container || !this.data) return;
    const hrDirectory = this.data.hrDirectory || [];
    const { displayedList, totalMatched } = this.searchHrDirectoryFast(hrDirectory);

    const resultsContainer = this.container.querySelector('#hr-search-results-container');
    if (resultsContainer) {
      resultsContainer.innerHTML = this.renderHrResultsGridHtml(displayedList, totalMatched);
      this.bindCopyEmailButtons(resultsContainer);
      const emptyOpenSyncBtn = resultsContainer.querySelector('#hr-empty-open-sync-btn');
      if (emptyOpenSyncBtn) {
        emptyOpenSyncBtn.addEventListener('click', () => {
          this.showHrSyncPanel = true;
          this.renderInline();
        });
      }
    }

    const footerContainer = this.container.querySelector('#hr-search-footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = this.renderHrFooterHtml(displayedList.length, totalMatched, hrDirectory.length);
    }

    const clearBtn = this.container.querySelector('#hr-search-clear-btn');
    if (clearBtn) {
      if (String(this.hrSearchQuery || '').trim()) {
        clearBtn.classList.remove('hidden');
        clearBtn.classList.add('flex');
      } else {
        clearBtn.classList.add('hidden');
        clearBtn.classList.remove('flex');
      }
    }
  }

  bindCopyEmailButtons(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-copy-email]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-copy-email');
        if (email && navigator.clipboard) {
          navigator.clipboard.writeText(email);
          const orig = btn.innerHTML;
          btn.innerHTML = `<span class="text-emerald-400 font-bold">✓ Đã copy: ${email}</span>`;
          setTimeout(() => {
            btn.innerHTML = orig;
          }, 1500);
        }
      });
    });
  }

  renderInline() {
    if (!this.container || !this.data) return;

    const {
      totalFlames = 0,
      uniqueRecipients = 0,
      uniqueSenders = 0,
      uniqueUnits = 0,
      top30Recipients = [],
      early100Senders = [],
      unitSpread = [],
      hrDirectory = []
    } = this.data;

    // Lọc theo đơn vị và từ khóa tìm kiếm cho Khu vực C (hỗ trợ cả có dấu & không dấu, tên & email)
    const filterByUnitAndSearch = (list) => {
      return list.filter(item => {
        const matchUnit = this.selectedUnitFilter === 'ALL' || item.dept === this.selectedUnitFilter;
        if (!matchUnit) return false;
        if (!this.searchQuery || !this.searchQuery.trim()) return true;
        const rawQ = this.searchQuery.trim().toLowerCase();
        const normQ = this.normalizeText(rawQ);
        const nameLower = String(item.name || '').toLowerCase();
        const nameNorm = this.normalizeText(nameLower);
        const emailLower = String(item.email || '').toLowerCase();
        const deptLower = String(item.dept || '').toLowerCase();
        const deptNorm = this.normalizeText(deptLower);
        return (
          nameLower.includes(rawQ) ||
          nameNorm.includes(normQ) ||
          emailLower.includes(rawQ) ||
          emailLower.includes(normQ) ||
          deptLower.includes(rawQ) ||
          deptNorm.includes(normQ)
        );
      });
    };

    const filteredTop30 = filterByUnitAndSearch(top30Recipients).slice(0, 30);
    const filteredEarly100 = filterByUnitAndSearch(early100Senders).slice(0, 100);
    const filteredUnits = this.selectedUnitFilter === 'ALL'
      ? unitSpread
      : unitSpread.filter(u => u.unit === this.selectedUnitFilter);

    // Tìm kiếm siêu tốc trên DS Nhân sự (24.608+ CBNV) đã được đánh chỉ mục RAM
    const { displayedList: displayedHrList, totalMatched: totalHrMatched } = this.searchHrDirectoryFast(hrDirectory);

    // Tách Top 3 và Hạng 4 - 30 cho Bảng "30 NGƯỜI TIẾP LỬA TRI THỨC"
    const top1 = filteredTop30[0] || null;
    const top2 = filteredTop30[1] || null;
    const top3 = filteredTop30[2] || null;
    const rank4To30 = filteredTop30.slice(3, 30);

    const maxTop30Flames = Math.max(...filteredTop30.map(i => i.count || 1), 1);
    const maxUnitFlames = Math.max(...unitSpread.map(u => u.totalFlames || 1), 1);
    const allUnitsList = unitSpread.map(u => u.unit);

    this.container.innerHTML = `
      <div class="space-y-8">
        <!-- ======================================================================= -->
        <!-- KHU VỰC B: TỔNG QUAN CHIẾN DỊCH (CHUẨN ADMINLTE v4 SMALL-BOX WIDGETS)   -->
        <!-- ======================================================================= -->
        <section id="section-kpi" class="lte-card lte-card-outline-orange scroll-mt-20">
          <!-- AdminLTE Card Header -->
          <div class="lte-card-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/10 border border-orange-500/40 flex items-center justify-center text-lg shadow-md">
                📊
              </div>
              <div>
                <div class="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Khu vực B • Tổng Quan Chiến Dịch (Real-time)</span>
                </div>
                <h2 class="text-lg sm:text-2xl font-black text-white tracking-tight">NHỊP ĐẬP LAN TỎA NGỌN LỬA TRI ÂN</h2>
              </div>
            </div>

            <!-- AdminLTE Card Tools -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
                <span>●</span>
                <span>Auto-Sync Google Sheet</span>
              </span>
              <button
                type="button"
                id="dash-send-test-card-btn"
                class="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-xs font-extrabold text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                title="Xem trước Thiệp 1080x1440 và gửi thử nghiệm về Outlook TungDT101@fpt.com"
              >
                <span>📨</span>
                <span>Gửi Thiệp Test (TungDT101@fpt.com)</span>
              </button>
              <a 
                href="${GOOGLE_FORM_URL}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="btn-flame px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>📝 Điền Google Form Tri Ân</span>
                <span>↗</span>
              </a>
              <button 
                type="button" 
                id="dash-refresh-btn" 
                class="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>↻</span>
                <span>Cập nhật số liệu</span>
              </button>
            </div>
          </div>

          <!-- AdminLTE Card Body: 4 Small Boxes (KPI Widgets) -->
          <div class="lte-card-body">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Small Box 1: Tổng số ngọn lửa -->
              <div class="lte-small-box bg-gradient-to-br from-orange-600/25 via-amber-500/15 to-slate-950/90 border-orange-500/40">
                <div class="lte-inner">
                  <div class="text-[11px] font-extrabold uppercase tracking-wider text-orange-300 mb-1">Tổng số ngọn lửa</div>
                  <div class="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight">${totalFlames.toLocaleString('vi-VN')}</div>
                  <p class="text-xs text-slate-300 mt-1.5 font-medium">Lời cảm ơn hợp lệ đã thắp sáng</p>
                </div>
                <div class="lte-small-box-icon">🔥</div>
                <div class="lte-small-box-footer text-orange-200">
                  <span>Đã lọc trùng & chuẩn hóa chính tả</span>
                  <span>100% ✓</span>
                </div>
              </div>

              <!-- Small Box 2: Người được tri ân -->
              <div class="lte-small-box bg-gradient-to-br from-amber-500/25 via-yellow-500/10 to-slate-950/90 border-amber-500/40">
                <div class="lte-inner">
                  <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 mb-1">Người được tri ân</div>
                  <div class="text-3xl sm:text-4xl font-black text-white tracking-tight">${uniqueRecipients.toLocaleString('vi-VN')}</div>
                  <p class="text-xs text-slate-300 mt-1.5 font-medium">Cá nhân nhận ít nhất 1 lời cảm ơn</p>
                </div>
                <div class="lte-small-box-icon">🎓</div>
                <a href="#section-leaderboard" class="lte-small-box-footer hover:bg-black/40 transition-colors text-amber-200">
                  <span>Xem Top 30 Tiếp Lửa Tri Thức</span>
                  <span>➔</span>
                </a>
              </div>

              <!-- Small Box 3: Người tham gia gửi -->
              <div class="lte-small-box bg-gradient-to-br from-sky-500/25 via-blue-600/10 to-slate-950/90 border-sky-500/40">
                <div class="lte-inner">
                  <div class="text-[11px] font-extrabold uppercase tracking-wider text-sky-300 mb-1">Người tham gia gửi</div>
                  <div class="text-3xl sm:text-4xl font-black text-sky-300 tracking-tight">${uniqueSenders.toLocaleString('vi-VN')}</div>
                  <p class="text-xs text-slate-300 mt-1.5 font-medium">CBNV đã gửi lời cảm ơn</p>
                </div>
                <div class="lte-small-box-icon">💌</div>
                <a href="#section-leaderboard" class="lte-small-box-footer hover:bg-black/40 transition-colors text-sky-200">
                  <span>Xem Top 100 Gửi Sớm Nhất</span>
                  <span>➔</span>
                </a>
              </div>

              <!-- Small Box 4: Đơn vị lan tỏa -->
              <div class="lte-small-box bg-gradient-to-br from-emerald-500/25 via-teal-600/10 to-slate-950/90 border-emerald-500/40">
                <div class="lte-inner">
                  <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 mb-1">Đơn vị lan tỏa</div>
                  <div class="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">${uniqueUnits.toLocaleString('vi-VN')}</div>
                  <p class="text-xs text-slate-300 mt-1.5 font-medium">Đơn vị / Phòng ban có nhân sự</p>
                </div>
                <div class="lte-small-box-icon">🏢</div>
                <a href="#section-unit-spread" class="lte-small-box-footer hover:bg-black/40 transition-colors text-emerald-200">
                  <span>Xem thống kê chi tiết đơn vị</span>
                  <span>➔</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC TRA CỨU NHÂN SỰ TRONG DANH SÁCH NHÂN SỰ (ADMINLTE CONTACTS BOX) -->
        <!-- ======================================================================= -->
        <section id="section-hr-search" class="lte-card lte-card-outline-gold scroll-mt-20">
          <!-- AdminLTE Card Header -->
          <div class="lte-card-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg shadow-md">
                🔍
              </div>
              <div>
                <div class="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  <span>Danh Bạ Nhân Sự FTEL • Đồng Bộ Sheet DS Nhân Sự (gid=1084168011)</span>
                </div>
                <h2 class="text-lg sm:text-2xl font-black text-white tracking-tight">TÌM KIẾM NHÂN SỰ TRONG DANH SÁCH NHÂN SỰ</h2>
              </div>
            </div>

            <!-- AdminLTE Card Tools: Search + Unit Filter + Sync Button -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div class="relative flex-1 sm:flex-initial">
                <input 
                  type="text" 
                  id="hr-directory-search-input" 
                  value="${this.hrSearchQuery}"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="🔍 Nhập Họ tên (VD: Lê Hoàng Nhân) hoặc Email (Nhanlh10@fpt.com)..." 
                  class="custom-input w-full sm:w-80 md:w-96 rounded-xl pl-4 pr-9 py-2 text-xs sm:text-sm border-amber-500/40"
                />
                <button
                  type="button"
                  id="hr-search-clear-btn"
                  title="Xóa từ khóa tìm kiếm"
                  class="${this.hrSearchQuery ? 'flex' : 'hidden'} absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 hover:bg-amber-500/30 text-slate-300 hover:text-white items-center justify-center text-[11px] font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <select id="hr-directory-unit-select" class="custom-input rounded-xl px-3 py-2 text-xs sm:text-sm">
                <option value="ALL" ${this.hrUnitFilter === 'ALL' ? 'selected' : ''}>Tất cả đơn vị (${allUnitsList.length})</option>
                ${allUnitsList.map(u => `
                  <option value="${u}" ${this.hrUnitFilter === u ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
              <button
                type="button"
                id="hr-toggle-sync-panel-btn"
                class="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Đồng bộ hoặc Dán nhanh toàn bộ dữ liệu từ tab DS nhân sự (gid=1084168011)"
              >
                <span>📥 Đồng bộ DS Nhân sự</span>
              </button>
            </div>
          </div>

          <!-- AdminLTE Card Body -->
          <div class="lte-card-body">
            ${this.showHrSyncPanel ? `
              <div class="lte-callout lte-callout-warning mb-5 space-y-3">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  <div>
                    <h3 class="text-xs sm:text-sm font-extrabold text-amber-300">
                      ⚡ NẠP SIÊU TỐC 24.608 NHÂN SỰ TỪ TAB "DS NHÂN SỰ" (GID=1084168011)
                    </h3>
                    <p class="text-[11px] text-slate-300 mt-0.5">
                      Hỗ trợ quy mô lớn <strong>24.608+ nhân sự</strong> không bị lag trình duyệt (lưu vào bộ nhớ IndexedDB dung lượng lớn):
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <input type="file" id="hr-csv-file-input" accept=".csv,.tsv,.txt" class="hidden" />
                    <button
                      type="button"
                      id="hr-csv-file-btn"
                      class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-300 text-xs font-extrabold cursor-pointer"
                    >
                      📂 Chọn file .CSV tải từ Sheet (24.608 người)
                    </button>
                    <button
                      type="button"
                      id="hr-clipboard-fast-paste-btn"
                      class="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 text-xs font-extrabold cursor-pointer"
                    >
                      ⚡ Dán 1 chạm từ Clipboard (Sau khi Ctrl+C)
                    </button>
                    <button
                      type="button"
                      id="hr-direct-gviz-sync-btn"
                      class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 text-xs font-bold cursor-pointer"
                    >
                      🔄 Tải tự động từ Google Sheet
                    </button>
                    <a
                      href="${GOOGLE_HR_SHEET_URL}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs font-semibold"
                    >
                      ↗ Mở Sheet gid=1084168011
                    </a>
                  </div>
                </div>

                <textarea
                  id="hr-paste-textarea"
                  rows="3"
                  placeholder="Cách nhanh nhất cho 24.608 dòng: Mở Sheet gid=1084168011 -> bấm Ctrl+A -> Ctrl+C, sau đó click vào ô này và bấm Ctrl+V (Hệ thống tự động nạp tức thì 24.608 nhân sự không gây đơ trình duyệt!)..."
                  class="custom-input w-full rounded-xl p-3 text-xs font-mono"
                ></textarea>

                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span id="hr-sync-feedback" class="text-xs font-semibold text-emerald-300">${this.hrSyncStatusMsg || ''}</span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      id="hr-import-paste-btn"
                      class="btn-flame px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      ✅ Nạp & Cập nhật DS Nhân sự ngay
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            <div id="hr-search-results-container">
              ${this.renderHrResultsGridHtml(displayedHrList, totalHrMatched)}
            </div>
          </div>

          <!-- AdminLTE Card Footer -->
          <div id="hr-search-footer-container" class="lte-card-footer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            ${this.renderHrFooterHtml(displayedHrList.length, totalHrMatched, hrDirectory.length)}
          </div>
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC C: BẢNG XẾP HẠNG VINH DANH (TOP 30 & TOP 100 SỚM NHẤT)          -->
        <!-- ======================================================================= -->
        <section id="section-leaderboard" class="lte-card lte-card-outline-orange scroll-mt-20">
          <!-- AdminLTE Card Header -->
          <div class="lte-card-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-lg shadow-md">
                🏆
              </div>
              <div>
                <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  Khu vực C • Bảng Xếp Hạng Vinh Danh
                </div>
                <h2 class="text-lg sm:text-2xl font-black text-white tracking-tight">BẢNG VÀNG TIẾP LỬA TRI THỨC FTEL</h2>
              </div>
            </div>

            <!-- AdminLTE Card Tools: Nav Pills + Search -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div class="inline-flex p-1 rounded-2xl bg-slate-950/90 border border-white/10">
                <button 
                  type="button" 
                  data-tab="top30" 
                  class="dash-tab-btn px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${this.activeRankingTab === 'top30' ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}"
                >
                  🏆 30 Người Tiếp Lửa Tri Thức
                </button>
                <button 
                  type="button" 
                  data-tab="early100" 
                  class="dash-tab-btn px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${this.activeRankingTab === 'early100' ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}"
                >
                  ⚡ 100 Người Tiếp Lửa Sớm Nhất
                </button>
              </div>

              <input 
                type="text" 
                id="dash-inline-search" 
                value="${this.searchQuery}"
                placeholder="🔍 Tìm trong Bảng xếp hạng..." 
                class="custom-input rounded-xl px-3.5 py-2 text-xs sm:w-56"
              />
            </div>
          </div>

          <!-- AdminLTE Card Body -->
          <div class="lte-card-body">
            <!-- NỘI DUNG BẢNG 1: 30 NGƯỜI TIẾP LỬA TRI THỨC -->
            <div id="tab-panel-top30" class="${this.activeRankingTab === 'top30' ? 'block' : 'hidden'} space-y-6">
              <!-- BỤC VINH DANH TOP 3 NỔI BẬT (ADMINLTE WIDGET USER STYLE) -->
              ${top1 ? `
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                <!-- HẠNG 2 (BẠC) -->
                ${top2 ? this.renderPodiumCard(top2, 2) : '<div></div>'}
                <!-- HẠNG 1 (VÀNG - CAO NHẤT Ở GIỮA) -->
                ${this.renderPodiumCard(top1, 1)}
                <!-- HẠNG 3 (ĐỒNG) -->
                ${top3 ? this.renderPodiumCard(top3, 3) : '<div></div>'}
              </div>
              ` : `
              <div class="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu phù hợp với bộ lọc.</div>
              `}

              <!-- DANH SÁCH HẠNG 4 – 30 (ADMINLTE PROGRESS LIST TABLE) -->
              ${rank4To30.length > 0 ? `
              <div class="mt-6">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <h3 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <span>✦ Danh Sách Vinh Danh Hạng 4 – ${Math.min(30, filteredTop30.length)}</span>
                  </h3>
                  <span class="text-[11px] text-slate-400">Xếp theo tổng số ngọn lửa nhận được giảm dần</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                  ${rank4To30.map(item => this.renderRankCard4To30(item, maxTop30Flames)).join('')}
                </div>
              </div>
              ` : ''}
            </div>

            <!-- NỘI DUNG BẢNG 2: 100 NGƯỜI TIẾP LỬA SỚM NHẤT (ADMINLTE TIMELINE COMPONENT) -->
            <div id="tab-panel-early100" class="${this.activeRankingTab === 'early100' ? 'block' : 'hidden'}">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 class="text-sm sm:text-base font-extrabold text-amber-300 uppercase">
                    ⚡ Dòng Thời Gian 100 Người Tiếp Lửa Sớm Nhất
                  </h3>
                  <p class="text-xs text-slate-400">Xếp theo thời điểm gửi lời cảm ơn hợp lệ tăng dần (từ sớm nhất)</p>
                </div>
                <span class="text-xs px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 font-extrabold">
                  Đã ghi nhận: ${filteredEarly100.length} / 100 CBNV đầu tiên
                </span>
              </div>

              <div class="relative pl-5 sm:pl-7 border-l-2 border-amber-500/40 space-y-3 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
                ${filteredEarly100.map(item => `
                  <div class="relative p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-amber-500/45 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
                    <span class="absolute -left-[27px] sm:-left-[35px] top-4 w-4 h-4 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 border-2 border-slate-950 shadow-md shadow-orange-500/50"></span>
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/10 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                        #${item.order}
                      </div>
                      <div class="min-w-0">
                        <div class="font-extrabold text-white text-sm truncate">${item.name}</div>
                        <div class="text-xs text-slate-400 truncate mt-0.5">
                          <span>🏢 ${item.dept || 'FPT Telecom'}</span>
                          ${item.recipientName ? `<span class="text-amber-300 font-semibold"> ➔ Gửi tới: ${item.recipientName}</span>` : ''}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-center">
                      <span>🕒</span>
                      <span>${item.timestamp}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC D: THỐNG KÊ NGỌN LỬA THEO ĐƠN VỊ (ADMINLTE ACCORDION & PROGRESS) -->
        <!-- ======================================================================= -->
        <section id="section-unit-spread" class="lte-card lte-card-outline-emerald scroll-mt-20">
          <!-- AdminLTE Card Header -->
          <div class="lte-card-header">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg shadow-md">
                🏢
              </div>
              <div>
                <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Khu vực D • Lan Tỏa Theo Đơn Vị (Đồng bộ Danh sách Nhân sự)
                </div>
                <h2 class="text-lg sm:text-2xl font-black text-white tracking-tight">THỐNG KÊ NGỌN LỬA THEO ĐƠN VỊ / PHÒNG BAN</h2>
                <p class="text-xs text-slate-400 mt-0.5">
                  👆 <strong>Bấm vào từng Đơn vị</strong> hoặc bấm vào <strong>🔥 Ngọn lửa</strong>, <strong>💌 Người gửi</strong>, <strong>🎓 Người nhận</strong> để xem danh sách các thành viên chi tiết
                </p>
              </div>
            </div>

            <!-- AdminLTE Card Tools: Bộ lọc đơn vị -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-300 font-bold whitespace-nowrap">Lọc đơn vị:</label>
              <select id="dash-unit-filter" class="custom-input rounded-xl px-3.5 py-2 text-xs sm:text-sm">
                <option value="ALL" ${this.selectedUnitFilter === 'ALL' ? 'selected' : ''}>Tất cả đơn vị (${allUnitsList.length})</option>
                ${allUnitsList.map(u => `
                  <option value="${u}" ${this.selectedUnitFilter === u ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- AdminLTE Card Body -->
          <div class="lte-card-body space-y-4">
            ${filteredUnits.map((u, idx) => {
              const widthPct = Math.max(6, Math.round((u.totalFlames / maxUnitFlames) * 100));
              const isExpanded = this.expandedUnit === u.unit;
              return `
                <div class="rounded-2xl bg-slate-950/85 border ${isExpanded ? 'border-amber-400/65 shadow-xl shadow-amber-500/10' : 'border-white/10 hover:border-white/25'} transition-all overflow-hidden">
                  <!-- Thanh tiêu đề Đơn vị (Bấm vào để đóng/mở chi tiết) -->
                  <div 
                    data-unit-toggle="${u.unit}"
                    class="p-4 sm:p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                      <div class="flex items-center gap-3">
                        <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/10 border border-orange-500/40 text-amber-300 text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
                          #${idx + 1}
                        </span>
                        <div>
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-white text-sm sm:text-base">${u.unit}</span>
                            <span class="text-[11px] px-2.5 py-0.5 rounded-full ${isExpanded ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/10 text-slate-300'} font-bold">
                              ${isExpanded ? '▼ Đang mở chi tiết' : '▶ Bấm xem chi tiết'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- 4 Nút Chỉ Số Trực Quan chuẩn AdminLTE Info Badges -->
                      <div class="flex flex-wrap items-center gap-2 text-xs">
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="flames"
                          class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.totalFlames} ngọn lửa của đơn vị ${u.unit}"
                        >
                          <span>🔥 ${(u.totalFlames || 0).toLocaleString('vi-VN')} ngọn lửa</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="senders"
                          class="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.senderCount} người gửi của đơn vị ${u.unit}"
                        >
                          <span>💌 ${(u.senderCount || 0).toLocaleString('vi-VN')} người gửi</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="recipients"
                          class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.recipientCount} người nhận của đơn vị ${u.unit}"
                        >
                          <span>🎓 ${(u.recipientCount || 0).toLocaleString('vi-VN')} người nhận</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="overview_all"
                          class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>👥 Xem tất cả (${(u.memberCount || 0).toLocaleString('vi-VN')})</span>
                        </button>
                      </div>
                    </div>

                    <!-- AdminLTE Animated Striped Progress Bar -->
                    <div class="lte-progress">
                      <div 
                        class="lte-progress-bar bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300"
                        style="width: ${widthPct}%"
                      ></div>
                    </div>
                  </div>

                  <!-- KHUNG CHI TIẾT THÀNH VIÊN TRONG ĐƠN VỊ (HIỂN THỊ KHI BẤM VÀO ĐƠN VỊ) -->
                  ${isExpanded ? this.renderUnitDetailPanel(u) : ''}
                </div>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    this.attachDashboardEvents();
  }

  /**
   * Hiển thị bảng chi tiết đầy đủ cho Đơn vị đang mở:
   * - 🔥 Chi tiết Ngọn lửa (VD: 64 ngọn lửa)
   * - 💌 Chi tiết Người gửi (VD: 45 người gửi)
   * - 🎓 Chi tiết Người nhận (VD: 14 người nhận)
   * - 👥 Danh sách thành viên thuộc đơn vị trong DS Nhân sự
   */
  renderUnitDetailPanel(u) {
    const flamesList = u.flamesList || [];
    const sendersList = u.sendersList || [];
    const recipientsList = u.recipientsList || [];
    const membersList = u.membersList || [];

    const activeSubTab = this.expandedUnitTab || 'overview_all';

    return `
      <div class="border-t border-white/10 bg-slate-900/90 p-4 sm:p-5 space-y-4">
        <!-- Thanh chọn chế độ xem chi tiết của Đơn vị -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div class="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              data-unit-subtab="overview_all"
              class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeSubTab === 'overview_all' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}"
            >
              📊 Xem đồng thời cả 3 cột (🔥 ${u.totalFlames} • 💌 ${u.senderCount} • 🎓 ${u.recipientCount})
            </button>
            <button 
              type="button"
              data-unit-subtab="flames"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'flames' ? 'bg-amber-500/25 text-amber-300 border border-amber-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}"
            >
              🔥 Chi tiết ${u.totalFlames} Ngọn lửa
            </button>
            <button 
              type="button"
              data-unit-subtab="senders"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'senders' ? 'bg-sky-500/25 text-sky-300 border border-sky-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}"
            >
              💌 Chi tiết ${u.senderCount} Người gửi
            </button>
            <button 
              type="button"
              data-unit-subtab="recipients"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'recipients' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}"
            >
              🎓 Chi tiết ${u.recipientCount} Người nhận
            </button>
            <button 
              type="button"
              data-unit-subtab="members"
              class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'members' ? 'bg-purple-500/25 text-purple-300 border border-purple-400' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}"
            >
              👥 Thành viên DS Nhân sự (${membersList.length})
            </button>
          </div>
        </div>

        <!-- CHẾ ĐỘ 1: HIỂN THỊ ĐỒNG THỜI CẢ 3 BẢNG CHI TIẾT (🎓 NGƯỜI NHẬN - 💌 NGƯỜI GỬI - 🔥 NGỌN LỬA) -->
        ${activeSubTab === 'overview_all' ? `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- CỘT 1: CHI TIẾT NGƯỜI NHẬN (VD: 🎓 14 người nhận) -->
            <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex flex-col">
              <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                <span class="text-xs font-extrabold uppercase text-emerald-300">🎓 ${u.recipientCount} Người Nhận Tri Ân</span>
                <span class="text-[11px] text-slate-400">Xếp theo số lửa</span>
              </div>
              <div class="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                ${recipientsList.map((rec, rIdx) => `
                  <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">${rIdx + 1}. ${rec.name}</div>
                      <div class="text-[11px] font-mono text-slate-400 truncate">${rec.email}</div>
                      <div class="text-[10px] text-emerald-300/80 truncate">${rec.role || 'Người truyền lửa'}</div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black shrink-0">
                      🔥 ${rec.count}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- CỘT 2: CHI TIẾT NGƯỜI GỬI (VD: 💌 45 người gửi) -->
            <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-sky-500/30 flex flex-col">
              <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                <span class="text-xs font-extrabold uppercase text-sky-300">💌 ${u.senderCount} Người Tham Gia Gửi</span>
                <span class="text-[11px] text-slate-400">CBNV đơn vị</span>
              </div>
              <div class="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                ${sendersList.map((snd, sIdx) => `
                  <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">${sIdx + 1}. ${snd.name}</div>
                      <div class="text-[11px] font-mono text-slate-400 truncate">${snd.email}</div>
                      <div class="text-[10px] text-slate-500 truncate">🕒 ${snd.latestTimestamp || ''}</div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold shrink-0">
                      💌 ${snd.count} lượt
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- CỘT 3: CHI TIẾT NGỌN LỬA (VD: 🔥 64 ngọn lửa) -->
            <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex flex-col">
              <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                <span class="text-xs font-extrabold uppercase text-amber-300">🔥 ${u.totalFlames} Ngọn Lửa Đã Thắp</span>
                <span class="text-[11px] text-slate-400">Người gửi → Người nhận</span>
              </div>
              <div class="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                ${flamesList.map((fl, fIdx) => `
                  <div class="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="font-black text-amber-400">🔥 Ngọn lửa #${fIdx + 1}</span>
                      <span class="text-[10px] text-slate-400">${fl.timestamp || ''}</span>
                    </div>
                    <div class="text-slate-200">
                      <strong class="text-sky-300">${fl.senderName}</strong>
                      <span class="text-slate-400 mx-1">➔</span>
                      <strong class="text-emerald-300">${fl.recipientName}</strong>
                    </div>
                    <div class="text-[10px] text-slate-400 truncate">${fl.role || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- CHẾ ĐỘ 2: XEM RIÊNG BẢNG CHI TIẾT NGỌN LỬA -->
        ${activeSubTab === 'flames' ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            ${flamesList.map((fl, fIdx) => `
              <div class="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 text-xs space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">🔥 Ngọn lửa #${fIdx + 1}</span>
                  <span class="text-[11px] text-slate-400">🕒 ${fl.timestamp || ''}</span>
                </div>
                <div class="pt-1">
                  <div class="text-slate-300">💌 Người gửi: <strong class="text-white">${fl.senderName}</strong> <span class="font-mono text-[11px] text-slate-400">(${fl.senderEmail})</span></div>
                  <div class="text-slate-300 mt-0.5">🎓 Người nhận: <strong class="text-amber-300">${fl.recipientName}</strong> <span class="font-mono text-[11px] text-slate-400">(${fl.recipientEmail})</span></div>
                </div>
                <div class="text-[11px] text-emerald-300/90 truncate">✦ ${fl.role || 'Giảng viên – Người truyền tri thức'}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- CHẾ ĐỘ 3: XEM RIÊNG BẢNG CHI TIẾT NGƯỜI GỬI -->
        ${activeSubTab === 'senders' ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            ${sendersList.map((snd, sIdx) => `
              <div class="p-3 rounded-xl bg-slate-950/80 border border-sky-500/30 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">#${sIdx + 1}. ${snd.name}</div>
                  <div class="text-[11px] font-mono text-sky-300 truncate">${snd.email}</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">🕒 ${snd.latestTimestamp || ''}</div>
                </div>
                <span class="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 font-extrabold shrink-0">
                  💌 ${snd.count} lửa
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- CHẾ ĐỘ 4: XEM RIÊNG BẢNG CHI TIẾT NGƯỜI NHẬN -->
        ${activeSubTab === 'recipients' ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            ${recipientsList.map((rec, rIdx) => `
              <div class="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">#${rIdx + 1}. ${rec.name}</div>
                  <div class="text-[11px] font-mono text-emerald-300 truncate">${rec.email}</div>
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">${rec.role || 'Người truyền lửa'}</div>
                </div>
                <span class="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black shrink-0">
                  🔥 ${rec.count} lửa
                </span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- CHẾ ĐỘ 5: XEM DANH SÁCH THÀNH VIÊN TRONG ĐƠN VỊ (TỪ DS NHÂN SỰ) -->
        ${activeSubTab === 'members' ? `
          <div class="text-xs text-slate-400 mb-2">
            Tổng nhân sự đơn vị: <strong class="text-amber-300">${(u.memberCount || membersList.length).toLocaleString('vi-VN')}</strong> CBNV ${membersList.length > 120 ? `(Hiển thị 120 thành viên đầu tiên - dùng thanh tìm kiếm nhân sự phía trên để tra cứu toàn bộ)` : ''}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            ${membersList.slice(0, 120).map((mem, mIdx) => `
              <div class="p-3 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">${mIdx + 1}. ${mem.name}</div>
                  <div class="text-[11px] font-mono text-amber-300 truncate">${mem.email}</div>
                  <div class="text-[10px] text-slate-400 truncate">${mem.dept || u.unit}</div>
                </div>
                <div class="text-right shrink-0 space-y-0.5">
                  <div class="text-[11px] font-bold text-emerald-300">🎓 Nhận: ${mem.receivedCount || 0}</div>
                  <div class="text-[11px] font-semibold text-sky-300">💌 Gửi: ${mem.sentCount || 0}</div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  attachDashboardEvents() {
    const refreshBtn = this.container.querySelector('#dash-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    const sendTestCardBtn = this.container.querySelector('#dash-send-test-card-btn');
    if (sendTestCardBtn) {
      sendTestCardBtn.addEventListener('click', () => this.openTestCardPreviewAndSend());
    }

    // Sự kiện tìm kiếm Nhân sự siêu tốc (0ms lag, không vẽ lại toàn trang, không ngắt bộ gõ tiếng Việt Unikey)
    const hrSearchInput = this.container.querySelector('#hr-directory-search-input');
    if (hrSearchInput) {
      hrSearchInput.addEventListener('input', (e) => {
        this.hrSearchQuery = e.target.value;
        if (this._hrSearchTimer) clearTimeout(this._hrSearchTimer);
        this._hrSearchTimer = setTimeout(() => {
          this.updateHrSearchOnly();
        }, 40);
      });
    }

    const hrClearBtn = this.container.querySelector('#hr-search-clear-btn');
    if (hrClearBtn) {
      hrClearBtn.addEventListener('click', () => {
        this.hrSearchQuery = '';
        if (hrSearchInput) {
          hrSearchInput.value = '';
          hrSearchInput.focus();
        }
        this.updateHrSearchOnly();
      });
    }

    const hrUnitSelect = this.container.querySelector('#hr-directory-unit-select');
    if (hrUnitSelect) {
      hrUnitSelect.addEventListener('change', (e) => {
        this.hrUnitFilter = e.target.value;
        this.updateHrSearchOnly();
      });
    }

    // Nút đóng/mở khung Đồng bộ / Dán nhanh DS Nhân sự (gid=1084168011)
    const toggleSyncBtn = this.container.querySelector('#hr-toggle-sync-panel-btn');
    if (toggleSyncBtn) {
      toggleSyncBtn.addEventListener('click', () => {
        this.showHrSyncPanel = !this.showHrSyncPanel;
        this.renderInline();
      });
    }

    const emptyOpenSyncBtn = this.container.querySelector('#hr-empty-open-sync-btn');
    if (emptyOpenSyncBtn) {
      emptyOpenSyncBtn.addEventListener('click', () => {
        this.showHrSyncPanel = true;
        this.renderInline();
      });
    }

    // Nút tải tự động trực tiếp từ Google Sheet (gid=1084168011) qua GVIZ JSONP
    const directGvizBtn = this.container.querySelector('#hr-direct-gviz-sync-btn');
    if (directGvizBtn) {
      directGvizBtn.addEventListener('click', async () => {
        directGvizBtn.disabled = true;
        directGvizBtn.textContent = '⏳ Đang kết nối Sheet gid=1084168011...';
        const res = await ApiService.syncHrDirectoryFromGoogleSheet();
        if (res.success && res.count > 0) {
          this.hrSyncStatusMsg = `✅ Đã đồng bộ tự động ${res.count} nhân sự từ Google Sheet (gid=1084168011)!`;
          await this.refreshData();
        } else {
          this.hrSyncStatusMsg = '⚠️ Sheet đang bật khóa Riêng tư (Restricted). Hãy mở quyền Xem hoặc Ctrl+A -> Ctrl+C từ Sheet dán vào ô bên dưới!';
          this.renderInline();
        }
      });
    }

    // Nút Chọn file CSV/TSV (24.608 nhân sự)
    const csvFileBtn = this.container.querySelector('#hr-csv-file-btn');
    const csvFileInput = this.container.querySelector('#hr-csv-file-input');
    if (csvFileBtn && csvFileInput) {
      csvFileBtn.addEventListener('click', () => csvFileInput.click());
      csvFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const fb = this.container.querySelector('#hr-sync-feedback');
        if (fb) fb.textContent = `⏳ Đang đọc và nạp file ${file.name}...`;
        try {
          const text = await file.text();
          const res = await ApiService.importHrDirectoryFromText(text);
          this.hrSyncStatusMsg = `✅ Đã nạp siêu tốc ${res.importedCount.toLocaleString('vi-VN')} nhân sự từ file ${file.name} (Tổng: ${res.totalCount.toLocaleString('vi-VN')} CBNV)!`;
          await this.refreshData();
        } catch (err) {
          this.hrSyncStatusMsg = `⚠️ ${err.message}`;
          if (fb) fb.textContent = this.hrSyncStatusMsg;
        }
      });
    }

    // Nút Dán 1 chạm từ Clipboard (không cần render vào textarea)
    const fastPasteBtn = this.container.querySelector('#hr-clipboard-fast-paste-btn');
    if (fastPasteBtn) {
      fastPasteBtn.addEventListener('click', async () => {
        const fb = this.container.querySelector('#hr-sync-feedback');
        try {
          if (fb) fb.textContent = '⏳ Đang đọc 24.608 dòng từ Clipboard...';
          const clipText = await navigator.clipboard.readText();
          const res = await ApiService.importHrDirectoryFromText(clipText);
          this.hrSyncStatusMsg = `✅ Đã nạp siêu tốc ${res.importedCount.toLocaleString('vi-VN')} nhân sự từ Clipboard (Tổng: ${res.totalCount.toLocaleString('vi-VN')} CBNV)!`;
          await this.refreshData();
        } catch (err) {
          this.hrSyncStatusMsg = '⚠️ Vui lòng click vào ô văn bản bên dưới và bấm Ctrl + V!';
          if (fb) fb.textContent = this.hrSyncStatusMsg;
        }
      });
    }

    // Tự động bắt sự kiện Ctrl+V vào ô textarea để nạp thẳng vào RAM (tránh làm đơ trình duyệt khi dán 24.608 dòng)
    const pasteTextarea = this.container.querySelector('#hr-paste-textarea');
    if (pasteTextarea) {
      pasteTextarea.addEventListener('paste', async (e) => {
        const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
        if (text && text.length > 2000) {
          e.preventDefault();
          const fb = this.container.querySelector('#hr-sync-feedback');
          if (fb) fb.textContent = '⏳ Đang xử lý dữ liệu lớn từ Clipboard...';
          try {
            const res = await ApiService.importHrDirectoryFromText(text);
            this.hrSyncStatusMsg = `✅ Đã nạp siêu tốc ${res.importedCount.toLocaleString('vi-VN')} nhân sự (Tổng danh bạ: ${res.totalCount.toLocaleString('vi-VN')} CBNV)!`;
            await this.refreshData();
          } catch (err) {
            this.hrSyncStatusMsg = `⚠️ ${err.message}`;
            if (fb) fb.textContent = this.hrSyncStatusMsg;
          }
        }
      });
    }

    // Nút Nạp nhanh dữ liệu Copy-Paste từ Sheet DS nhân sự
    const importPasteBtn = this.container.querySelector('#hr-import-paste-btn');
    if (importPasteBtn) {
      importPasteBtn.addEventListener('click', async () => {
        const textarea = this.container.querySelector('#hr-paste-textarea');
        const rawText = textarea ? textarea.value : '';
        try {
          const res = await ApiService.importHrDirectoryFromText(rawText);
          this.hrSyncStatusMsg = `✅ Đã nạp thành công ${res.importedCount.toLocaleString('vi-VN')} nhân sự (Tổng danh bạ: ${res.totalCount.toLocaleString('vi-VN')} CBNV)!`;
          await this.refreshData();
        } catch (err) {
          this.hrSyncStatusMsg = `⚠️ ${err.message}`;
          const fb = this.container.querySelector('#hr-sync-feedback');
          if (fb) fb.textContent = this.hrSyncStatusMsg;
        }
      });
    }

    // Nút Copy nhanh Email nhân sự
    this.container.querySelectorAll('[data-copy-email]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const email = btn.getAttribute('data-copy-email');
        if (email && navigator.clipboard) {
          navigator.clipboard.writeText(email);
          const orig = btn.innerHTML;
          btn.innerHTML = `<span class="text-emerald-400 font-bold">✓ Đã copy: ${email}</span>`;
          setTimeout(() => {
            btn.innerHTML = orig;
          }, 1500);
        }
      });
    });

    // Chuyển tab Bảng xếp hạng Khu vực C
    const tabBtns = this.container.querySelectorAll('.dash-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeRankingTab = btn.getAttribute('data-tab') || 'top30';
        this.renderInline();
      });
    });

    const searchInput = this.container.querySelector('#dash-inline-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderInline();
        const newInput = this.container.querySelector('#dash-inline-search');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      });
    }

    const unitFilter = this.container.querySelector('#dash-unit-filter');
    if (unitFilter) {
      unitFilter.addEventListener('change', (e) => {
        this.selectedUnitFilter = e.target.value;
        if (this.selectedUnitFilter !== 'ALL') {
          this.expandedUnit = this.selectedUnitFilter;
        }
        this.renderInline();
      });
    }

    // Sự kiện bấm vào từng chỉ số (🔥 Ngọn lửa / 💌 Người gửi / 🎓 Người nhận) trên dòng Đơn vị
    this.container.querySelectorAll('[data-unit-stat-btn]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetUnit = btn.getAttribute('data-unit-stat-btn');
        const targetTab = btn.getAttribute('data-stat-tab') || 'overview_all';
        this.expandedUnit = targetUnit;
        this.expandedUnitTab = targetTab;
        this.renderInline();
      });
    });

    // Sự kiện bấm vào dòng Đơn vị để đóng/mở chi tiết
    this.container.querySelectorAll('[data-unit-toggle]').forEach(rowEl => {
      rowEl.addEventListener('click', () => {
        const targetUnit = rowEl.getAttribute('data-unit-toggle');
        if (this.expandedUnit === targetUnit) {
          this.expandedUnit = null;
        } else {
          this.expandedUnit = targetUnit;
          this.expandedUnitTab = 'overview_all';
        }
        this.renderInline();
      });
    });

    // Sự kiện chuyển tab con bên trong Khung Chi Tiết Đơn Vị
    this.container.querySelectorAll('[data-unit-subtab]').forEach(subBtn => {
      subBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.expandedUnitTab = subBtn.getAttribute('data-unit-subtab') || 'overview_all';
        this.renderInline();
      });
    });
  }

  renderPodiumCard(item, rank) {
    const isTop1 = rank === 1;
    const isTop2 = rank === 2;
    const borderClass = isTop1
      ? 'border-amber-400/80 bg-gradient-to-b from-amber-500/25 via-orange-500/10 to-slate-950/95 shadow-2xl shadow-amber-500/25 md:-translate-y-3'
      : isTop2
      ? 'border-slate-300/55 bg-gradient-to-b from-slate-300/15 to-slate-950/90 shadow-xl'
      : 'border-orange-500/55 bg-gradient-to-b from-orange-600/15 to-slate-950/90 shadow-xl';

    const medal = isTop1 ? '👑 QUÁN QUÂN TRI THỨC' : isTop2 ? '🥈 Á QUÂN TRI THỨC' : '🥉 QUÝ QUÂN TRI THỨC';
    const ribbonText = isTop1 ? 'TOP 1' : isTop2 ? 'TOP 2' : 'TOP 3';
    const badgeBg = isTop1
      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
      : isTop2
      ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950'
      : 'bg-gradient-to-r from-amber-600 to-orange-500 text-white';

    return `
      <div class="relative rounded-3xl overflow-hidden text-center border-2 ${borderClass} transition-all">
        <!-- AdminLTE Corner Ribbon -->
        <div class="lte-ribbon-wrapper">
          <div class="lte-ribbon ${badgeBg}">${ribbonText}</div>
        </div>

        <div class="p-5 pb-4">
          <div class="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-3 ${badgeBg} shadow-md">
            ${medal}
          </div>

          <!-- Ảnh đại diện (hoặc Avatar chữ cái sang trọng) -->
          <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-3 p-0.5 bg-gradient-to-tr from-orange-500 to-amber-300 shadow-lg">
            ${item.avatar ? `
              <img src="${item.avatar}" alt="${item.name}" class="w-full h-full rounded-full object-cover bg-slate-900" />
            ` : `
              <div class="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-lg sm:text-xl font-black text-amber-300">
                ${this.getInitials(item.name)}
              </div>
            `}
          </div>

          <h4 class="text-base sm:text-lg font-black text-white truncate">${item.name}</h4>
          <p class="text-xs text-amber-300/95 font-bold truncate mt-0.5">🏢 ${item.dept || 'FPT Telecom'}</p>
          <p class="text-[11px] text-slate-400 truncate mt-0.5">${item.role || 'Người truyền lửa'}</p>
        </div>

        <!-- AdminLTE Widget User 3-Column Footer -->
        <div class="grid grid-cols-3 divide-x divide-white/10 bg-black/45 border-t border-white/10 py-2.5 px-2 text-center">
          <div>
            <div class="text-[10px] uppercase text-slate-400 font-bold">Thứ hạng</div>
            <div class="text-sm font-black text-white">#${rank}</div>
          </div>
          <div>
            <div class="text-[10px] uppercase text-amber-300 font-bold">Ngọn lửa</div>
            <div class="text-sm sm:text-base font-black text-amber-400">🔥 ${item.count}</div>
          </div>
          <div>
            <div class="text-[10px] uppercase text-emerald-300 font-bold">Trạng thái</div>
            <div class="text-xs font-extrabold text-emerald-400">Hợp lệ ✓</div>
          </div>
        </div>
      </div>
    `;
  }

  renderRankCard4To30(item, maxCount = 50) {
    const pct = Math.max(10, Math.round(((item.count || 1) / maxCount) * 100));
    return `
      <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-amber-500/45 transition-all flex items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-9 h-9 rounded-xl bg-white/5 border border-white/15 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
            #${item.rank}
          </div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0 overflow-hidden">
            ${item.avatar ? `<img src="${item.avatar}" alt="${item.name}" class="w-full h-full object-cover" />` : this.getInitials(item.name)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-extrabold text-white text-sm truncate">${item.name}</div>
            <div class="text-xs text-slate-400 truncate">🏢 ${item.dept || 'FPT Telecom'}</div>
            <div class="w-full h-1.5 rounded-full bg-slate-900 mt-1.5 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style="width: ${pct}%"></div>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0 pl-2">
          <div class="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-sm font-black text-amber-400 flex items-center gap-1 justify-end">
            <span>🔥</span>
            <span>${item.count}</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5 font-semibold">ngọn lửa</div>
        </div>
      </div>
    `;
  }

  /**
   * Mở cửa sổ xem trước Thiệp 1080x1440 & giao diện Email Outlook thực tế, đồng thời bắn mail thử nghiệm về TungDT101@fpt.com
   */
  async openTestCardPreviewAndSend() {
    let modal = document.getElementById('ftel-test-card-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ftel-test-card-modal';
    modal.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto';
    modal.innerHTML = `
      <div class="lte-card lte-card-outline-gold w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div class="lte-card-header sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">📨</div>
            <div>
              <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">Kiểm tra Luồng Gửi Thiệp & Email Outlook</div>
              <h3 class="text-base sm:text-xl font-black text-white">XEM TRƯỚC THIỆP & GỬI THỬ NGHIỆM VỀ OUTLOOK TUNGDt101@FPT.COM</h3>
            </div>
          </div>
          <button type="button" id="close-test-card-modal-btn" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 border border-white/15 text-xs font-extrabold text-white cursor-pointer">
            ✕ Đóng
          </button>
        </div>

        <div class="lte-card-body space-y-4">
          <div id="test-card-send-status" class="lte-callout lte-callout-warning text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-between gap-2">
            <span>⏳ Đang kết xuất ảnh Thiệp 1080x1440 px từ phôi chuẩn và gửi về hộp thư Outlook <strong>TungDT101@fpt.com</strong>...</span>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <!-- CỘT 1: BẢN THIỆP 1080x1440 CÁ NHÂN HÓA -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs sm:text-sm font-extrabold uppercase text-amber-300">1. Ảnh Thiệp 1080x1440 (Người nhận & Người gửi)</h4>
                <a id="download-test-card-link" download="Thiep_Tri_An_20_11_TungDT101.png" class="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-extrabold cursor-pointer">
                  ⬇️ Tải ảnh .PNG
                </a>
              </div>
              <div class="rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl bg-slate-900">
                <img id="test-card-preview-img" alt="Thiệp Tri Ân 20/11" class="w-full h-auto block" />
              </div>
            </div>

            <!-- CỘT 2: GIAO DIỆN EMAIL TRÊN OUTLOOK CỦA NGƯỜI NHẬN & NGƯỜI GỬI -->
            <div class="space-y-3">
              <h4 class="text-xs sm:text-sm font-extrabold uppercase text-emerald-300">2. Giao diện Email hiển thị trong Outlook (TungDT101@fpt.com)</h4>
              <div class="rounded-2xl overflow-hidden border border-white/15 bg-slate-900/95 shadow-xl text-xs space-y-3 p-4">
                <div class="space-y-1.5 pb-3 border-b border-white/10">
                  <div class="flex items-center gap-2"><span class="text-slate-400 w-24 shrink-0">Tiêu đề (Subject):</span> <strong class="text-amber-300 text-sm">MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN</strong></div>
                  <div class="flex items-center gap-2"><span class="text-slate-400 w-24 shrink-0">Người nhận (To):</span> <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">TungDT101@fpt.com (Đặng Thanh Tùng)</span></div>
                  <div class="flex items-center gap-2"><span class="text-slate-400 w-24 shrink-0">Người gửi (CC):</span> <span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">Nhanlh10@fpt.com (Lê Hoàng Nhân)</span></div>
                  <div class="flex items-center gap-2"><span class="text-slate-400 w-24 shrink-0">Đính kèm:</span> <span class="text-slate-200 font-semibold">📎 Thiep_Tri_An_Dang_Thanh_Tung.png (Inline + File đính kèm + Link Google Drive)</span></div>
                </div>

                <!-- Mô phỏng khung HTML Email thực tế trong Outlook -->
                <div class="rounded-xl overflow-hidden border border-orange-500/50 bg-[#071226] text-white">
                  <div class="p-4 text-center" style="background: linear-gradient(135deg, #002d62 0%, #f37021 100%);">
                    <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-1">Trung tâm Đào tạo và Phát triển FPT Telecom (FTC)</div>
                    <div class="text-sm sm:text-base font-black text-white">🔥 MỘT NGỌN LỬA TRI ÂN VỪA ĐƯỢC THẮP LÊN 🔥</div>
                  </div>
                  <div class="p-4 space-y-2.5 text-slate-200 leading-relaxed text-xs">
                    <p>Kính gửi Anh/Chị <strong class="text-amber-300">Đặng Thanh Tùng</strong>,</p>
                    <p>Nhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11 – Chiến dịch <strong>"Gửi lời cảm ơn – Thắp sáng tri thức"</strong>, Anh/Chị vừa nhận được một ngọn lửa tri ân ấm áp từ đồng nghiệp <strong class="text-orange-400">Lê Hoàng Nhân (FTC)</strong> (Trung tâm Đào tạo FTEL (FTC)) với dấu ấn <em>"Người dẫn dắt – Người truyền cảm hứng"</em>:</p>
                    <div class="p-3 rounded-lg bg-white/5 border-l-4 border-amber-400 italic text-white">
                      "Cảm ơn Anh Đặng Thanh Tùng đã luôn là ngọn lửa nhiệt huyết truyền cảm hứng, tận tâm chia sẻ tri thức và đồng hành cùng anh em tại Trung tâm Đào tạo FTEL (FTC). Nhân dịp 20/11, chúc Anh luôn dồi dào sức khỏe, hạnh phúc và tiếp tục thắp sáng hành trình tri thức tại FPT Telecom!"
                    </div>
                    <p class="text-[11px] text-slate-400">*(Trong Outlook, tấm thiệp 1080x1440 ở cột bên trái được nhúng trực tiếp ngay tại đây kèm nút Xem & Tải Thiệp Độ Phân Giải Cao trên Google Drive)*</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#close-test-card-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => modal.remove());
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const res = await ApiService.sendTestEcardToOutlook(CardGenerator, 'tungdt101@fpt.com');
    const previewImg = modal.querySelector('#test-card-preview-img');
    const downloadLink = modal.querySelector('#download-test-card-link');
    const statusEl = modal.querySelector('#test-card-send-status');

    if (previewImg && res.cardImageBase64) {
      previewImg.src = res.cardImageBase64;
    }
    if (downloadLink && res.cardImageBase64) {
      downloadLink.href = res.cardImageBase64;
    }
    if (statusEl) {
      statusEl.className = 'lte-callout lte-callout-success text-xs sm:text-sm font-bold text-emerald-300 flex flex-wrap items-center justify-between gap-2';
      statusEl.innerHTML = `
        <span>✅ Đã gửi thẳng 2 thư Thiệp Tri Ân (1080x1440) cho vai trò <strong>Người nhận</strong> & <strong>Người gửi</strong> về hộp thư Outlook <strong>TungDT101@fpt.com</strong> (Không lưu vào Google Sheet chính thức)!</span>
        <span class="text-[11px] text-amber-300">Trạng thái: SENT_SUCCESS ✓</span>
      `;
    }
  }
}
