import { ApiService } from './api.js';
import { GOOGLE_FORM_URL, GOOGLE_HR_SHEET_URL } from './mockData.js';

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

    // Lọc theo đơn vị và từ khóa tìm kiếm cho Khu vực C
    const filterByUnitAndSearch = (list) => {
      return list.filter(item => {
        const matchUnit = this.selectedUnitFilter === 'ALL' || item.dept === this.selectedUnitFilter;
        if (!matchUnit) return false;
        if (!this.searchQuery) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          String(item.name || '').toLowerCase().includes(q) ||
          String(item.email || '').toLowerCase().includes(q) ||
          String(item.dept || '').toLowerCase().includes(q)
        );
      });
    };

    const filteredTop30 = filterByUnitAndSearch(top30Recipients).slice(0, 30);
    const filteredEarly100 = filterByUnitAndSearch(early100Senders).slice(0, 100);
    const filteredUnits = this.selectedUnitFilter === 'ALL'
      ? unitSpread
      : unitSpread.filter(u => u.unit === this.selectedUnitFilter);

    // Lọc Danh sách Nhân sự (Tra cứu DS Nhân sự gid=1084168011 - hỗ trợ tìm không dấu, hoa/thường, cả @fpt.com & @fpt.net)
    const filteredHrList = hrDirectory.filter(emp => {
      const matchUnit = this.hrUnitFilter === 'ALL' || emp.dept === this.hrUnitFilter;
      if (!matchUnit) return false;
      if (!this.hrSearchQuery.trim()) return true;
      const rawQ = this.hrSearchQuery.trim().toLowerCase();
      const normQ = this.normalizeText(rawQ);
      const qAccount = rawQ.split('@')[0];

      const empName = String(emp.name || '').toLowerCase();
      const empNormName = this.normalizeText(empName);
      const empEmail = String(emp.email || '').toLowerCase();
      const empAccount = empEmail.split('@')[0];
      const empDept = String(emp.dept || '').toLowerCase();
      const empNormDept = this.normalizeText(empDept);

      return (
        empName.includes(rawQ) ||
        empNormName.includes(normQ) ||
        empEmail.includes(rawQ) ||
        (qAccount && empAccount.includes(qAccount)) ||
        empDept.includes(rawQ) ||
        empNormDept.includes(normQ)
      );
    });
    const maxHrDisplay = this.hrSearchQuery.trim() ? 90 : 30;

    // Tách Top 3 và Hạng 4 - 30 cho Bảng "30 NGƯỜI TIẾP LỬA TRI THỨC"
    const top1 = filteredTop30[0] || null;
    const top2 = filteredTop30[1] || null;
    const top3 = filteredTop30[2] || null;
    const rank4To30 = filteredTop30.slice(3, 30);

    const maxUnitFlames = Math.max(...unitSpread.map(u => u.totalFlames || 1), 1);
    const allUnitsList = unitSpread.map(u => u.unit);

    this.container.innerHTML = `
      <div class="space-y-8">
        <!-- ======================================================================= -->
        <!-- KHU VỰC B: TỔNG QUAN CHIẾN DỊCH (4 THẺ KPI CẬP NHẬT TỰ ĐỘNG)            -->
        <!-- ======================================================================= -->
        <section class="glass-card-glow rounded-3xl p-5 sm:p-7">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
            <div>
              <div class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Khu vực B • Tổng Quan Chiến Dịch (Real-time)</span>
              </div>
              <h2 class="text-lg sm:text-2xl font-black text-white">NHỊP ĐẬP LAN TỎA NGỌN LỬA TRI ÂN</h2>
            </div>
            <div class="flex flex-wrap items-center gap-2">
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
                class="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-slate-200 transition-all cursor-pointer"
              >
                ↻ Cập nhật số liệu
              </button>
            </div>
          </div>

          <!-- 4 Thẻ chỉ số tổng hợp -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/30 shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-orange-300">Tổng số ngọn lửa</span>
                <span class="text-xl">🔥</span>
              </div>
              <div class="text-2xl sm:text-4xl font-black text-amber-400">${totalFlames.toLocaleString('vi-VN')}</div>
              <p class="text-[11px] text-slate-400 mt-1">Tổng số lời cảm ơn hợp lệ</p>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-yellow-500/5 border border-amber-500/30 shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-300">Người được tri ân</span>
                <span class="text-xl">🎓</span>
              </div>
              <div class="text-2xl sm:text-4xl font-black text-white">${uniqueRecipients.toLocaleString('vi-VN')}</div>
              <p class="text-[11px] text-slate-400 mt-1">Cá nhân nhận ít nhất 1 lời cảm ơn</p>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-500/5 border border-sky-500/30 shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-sky-300">Người tham gia gửi</span>
                <span class="text-xl">💌</span>
              </div>
              <div class="text-2xl sm:text-4xl font-black text-sky-300">${uniqueSenders.toLocaleString('vi-VN')}</div>
              <p class="text-[11px] text-slate-400 mt-1">CBNV đã gửi lời cảm ơn</p>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/30 shadow-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-300">Đơn vị lan tỏa</span>
                <span class="text-xl">🏢</span>
              </div>
              <div class="text-2xl sm:text-4xl font-black text-emerald-400">${uniqueUnits.toLocaleString('vi-VN')}</div>
              <p class="text-[11px] text-slate-400 mt-1">Đơn vị có nhân sự tham gia</p>
            </div>
          </div>
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC TRA CỨU NHÂN SỰ TRONG DANH SÁCH NHÂN SỰ (SHEET GID=1084168011)  -->
        <!-- ======================================================================= -->
        <section class="glass-card rounded-3xl p-5 sm:p-7 border border-amber-500/30">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/10">
            <div>
              <div class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <span>🔍</span>
                <span>Danh Bạ Nhân Sự FTEL • Đồng Bộ Sheet DS Nhân Sự</span>
              </div>
              <h2 class="text-lg sm:text-2xl font-black text-white">TÌM KIẾM NHÂN SỰ TRONG DANH SÁCH NHÂN SỰ</h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Tra cứu nhanh Họ và tên, Email FPT, Đơn vị công tác và số ngọn lửa đã gửi / đã nhận của từng CBNV
              </p>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div class="relative">
                <input 
                  type="text" 
                  id="hr-directory-search-input" 
                  value="${this.hrSearchQuery}"
                  placeholder="🔍 Nhập tên, email (VD: Nhanlh10@fpt.com)..." 
                  class="custom-input rounded-xl px-4 py-2.5 text-xs sm:text-sm sm:w-72 border-amber-500/40"
                />
              </div>
              <select id="hr-directory-unit-select" class="custom-input rounded-xl px-3 py-2.5 text-xs sm:text-sm">
                <option value="ALL" ${this.hrUnitFilter === 'ALL' ? 'selected' : ''}>Tất cả đơn vị (${allUnitsList.length})</option>
                ${allUnitsList.map(u => `
                  <option value="${u}" ${this.hrUnitFilter === u ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
              <button
                type="button"
                id="hr-toggle-sync-panel-btn"
                class="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Đồng bộ hoặc Dán nhanh toàn bộ dữ liệu từ tab DS nhân sự (gid=1084168011)"
              >
                <span>📥 Đồng bộ DS Nhân sự</span>
              </button>
            </div>
          </div>

          ${this.showHrSyncPanel ? `
            <div class="mb-5 p-4 rounded-2xl bg-slate-950/90 border border-amber-400/50 space-y-3">
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

          <div class="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span>Hiển thị <strong class="text-amber-300">${Math.min(filteredHrList.length, maxHrDisplay).toLocaleString('vi-VN')}</strong> / <strong class="text-white">${filteredHrList.length.toLocaleString('vi-VN')}</strong> nhân sự phù hợp</span>
            <span class="text-[11px] text-slate-400">💡 Bấm vào Email để copy nhanh khi điền Google Form</span>
          </div>

          ${filteredHrList.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              ${filteredHrList.slice(0, maxHrDisplay).map(emp => `
                <div class="p-3.5 rounded-2xl bg-slate-950/75 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2.5">
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xs font-black text-amber-300 shrink-0">
                      ${this.getInitials(emp.name)}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="font-bold text-white text-sm truncate">${emp.name}</div>
                      <button 
                        type="button"
                        data-copy-email="${emp.email}"
                        class="text-xs font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1 truncate mt-0.5 cursor-pointer"
                        title="Bấm để copy Email"
                      >
                        <span>📧 ${emp.email}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">Copy</span>
                      </button>
                      <div class="text-[11px] text-slate-400 truncate mt-1">🏢 ${emp.dept || 'FPT Telecom'}</div>
                    </div>
                  </div>
                  <div class="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                    <div class="flex items-center gap-2.5">
                      <span class="text-emerald-300 font-bold">🎓 Nhận: ${emp.receivedCount || 0} 🔥</span>
                      <span class="text-sky-300 font-semibold">💌 Gửi: ${emp.sentCount || 0}</span>
                    </div>
                    <a 
                      href="${GOOGLE_FORM_URL}" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="px-2.5 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-bold transition-all"
                    >
                      🔥 Tri ân
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
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
          `}
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC C: BẢNG XẾP HẠNG VINH DANH (TOP 30 & TOP 100 SỚM NHẤT)          -->
        <!-- ======================================================================= -->
        <section class="glass-card rounded-3xl p-5 sm:p-7">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/10">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                Khu vực C • Bảng Xếp Hạng Vinh Danh
              </div>
              <h2 class="text-lg sm:text-2xl font-black text-white">BẢNG VÀNG TIẾP LỬA TRI THỨC FTEL</h2>
              <p class="text-xs text-slate-400 mt-0.5">Chỉ tính các lời cảm ơn hợp lệ (mỗi bản ghi hợp lệ tính 1 ngọn lửa, tự động loại trừ bản ghi trùng lặp)</p>
            </div>

            <!-- Thanh chuyển đổi 2 bảng xếp hạng + Tìm kiếm -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div class="inline-flex p-1 rounded-2xl bg-slate-950/80 border border-white/10">
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
                placeholder="Tìm trong Bảng xếp hạng..." 
                class="custom-input rounded-xl px-3.5 py-2 text-xs sm:w-52"
              />
            </div>
          </div>

          <!-- NỘI DUNG BẢNG 1: 30 NGƯỜI TIẾP LỬA TRI THỨC -->
          <div id="tab-panel-top30" class="${this.activeRankingTab === 'top30' ? 'block' : 'hidden'} space-y-6">
            <!-- BỤC VINH DANH TOP 3 NỔI BẬT -->
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

            <!-- DANH SÁCH HẠNG 4 – 30 (DẠNG THẺ / BẢNG GỌN DỄ ĐỌC) -->
            ${rank4To30.length > 0 ? `
            <div class="mt-6">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-300">
                  ✦ Danh sách vinh danh Hạng 4 – ${Math.min(30, filteredTop30.length)}
                </h3>
                <span class="text-[11px] text-slate-400">Sắp xếp theo tổng số lời cảm ơn giảm dần</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                ${rank4To30.map(item => this.renderRankCard4To30(item)).join('')}
              </div>
            </div>
            ` : ''}
          </div>

          <!-- NỘI DUNG BẢNG 2: 100 NGƯỜI TIẾP LỬA SỚM NHẤT (TIMELINE DÒNG THỜI GIAN) -->
          <div id="tab-panel-early100" class="${this.activeRankingTab === 'early100' ? 'block' : 'hidden'}">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 class="text-sm sm:text-base font-extrabold text-amber-300 uppercase">
                  ⚡ Dòng Thời Gian 100 Người Tiếp Lửa Sớm Nhất
                </h3>
                <p class="text-xs text-slate-400">Xếp theo thời điểm gửi lời cảm ơn hợp lệ tăng dần (từ sớm nhất)</p>
              </div>
              <span class="text-xs px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold">
                Đã ghi nhận: ${filteredEarly100.length} / 100 CBNV đầu tiên
              </span>
            </div>

            <div class="relative pl-4 sm:pl-6 border-l-2 border-amber-500/35 space-y-3 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
              ${filteredEarly100.map(item => `
                <div class="relative p-3.5 rounded-2xl bg-slate-950/65 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span class="absolute -left-[23px] sm:-left-[31px] top-4 w-4 h-4 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 border-2 border-slate-950 shadow-md shadow-orange-500/40"></span>
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                      #${item.order}
                    </div>
                    <div class="min-w-0">
                      <div class="font-bold text-white text-sm truncate">${item.name}</div>
                      <div class="text-xs text-slate-400 truncate">
                        <span>🏢 ${item.dept || 'FPT Telecom'}</span>
                        ${item.recipientName ? `<span class="text-amber-400/90"> • Gửi tới: ${item.recipientName}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                    <span>🕒</span>
                    <span>${item.timestamp}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- ======================================================================= -->
        <!-- KHU VỰC D: THỐNG KÊ NGỌN LỬA THEO ĐƠN VỊ / PHÒNG BAN (CLICK XEM CHI TIẾT) -->
        <!-- ======================================================================= -->
        <section class="glass-card rounded-3xl p-5 sm:p-7">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Khu vực D • Lan Tỏa Theo Đơn Vị (Đồng bộ Danh sách Nhân sự)
              </div>
              <h2 class="text-lg sm:text-2xl font-black text-white">THỐNG KÊ NGỌN LỬA THEO ĐƠN VỊ / PHÒNG BAN</h2>
              <p class="text-xs text-slate-400 mt-0.5">
                👆 <strong>Bấm vào từng Đơn vị</strong> hoặc bấm vào <strong>🔥 Ngọn lửa</strong>, <strong>💌 Người gửi</strong>, <strong>🎓 Người nhận</strong> để xem danh sách các thành viên chi tiết trong đơn vị đó
              </p>
            </div>

            <!-- Bộ lọc theo đơn vị -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-300 font-semibold whitespace-nowrap">Lọc đơn vị:</label>
              <select id="dash-unit-filter" class="custom-input rounded-xl px-3 py-2 text-xs sm:text-sm">
                <option value="ALL" ${this.selectedUnitFilter === 'ALL' ? 'selected' : ''}>Tất cả đơn vị (${allUnitsList.length})</option>
                ${allUnitsList.map(u => `
                  <option value="${u}" ${this.selectedUnitFilter === u ? 'selected' : ''}>${u}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="space-y-4">
            ${filteredUnits.map((u, idx) => {
              const widthPct = Math.max(6, Math.round((u.totalFlames / maxUnitFlames) * 100));
              const isExpanded = this.expandedUnit === u.unit;
              return `
                <div class="rounded-2xl bg-slate-950/75 border ${isExpanded ? 'border-amber-400/60 shadow-xl shadow-amber-500/10' : 'border-white/10 hover:border-white/25'} transition-all overflow-hidden">
                  <!-- Thanh tiêu đề Đơn vị (Bấm vào để đóng/mở chi tiết) -->
                  <div 
                    data-unit-toggle="${u.unit}"
                    class="p-4 sm:p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-2.5">
                      <div class="flex items-center gap-2.5">
                        <span class="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-black flex items-center justify-center shrink-0">
                          ${idx + 1}
                        </span>
                        <div>
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-white text-sm sm:text-base">${u.unit}</span>
                            <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-semibold">
                              ${isExpanded ? '▼ Đang mở chi tiết' : '▶ Bấm xem thành viên chi tiết'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- 3 Nút Chỉ Số Trực Quan (Bấm vào từng chỉ số để mở thẳng tab chi tiết đó) -->
                      <div class="flex flex-wrap items-center gap-2 text-xs">
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="flames"
                          class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.totalFlames} ngọn lửa của đơn vị ${u.unit}"
                        >
                          <span>🔥 ${u.totalFlames} ngọn lửa</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="senders"
                          class="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.senderCount} người gửi của đơn vị ${u.unit}"
                        >
                          <span>💌 ${u.senderCount} người gửi</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="recipients"
                          class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Xem chi tiết ${u.recipientCount} người nhận của đơn vị ${u.unit}"
                        >
                          <span>🎓 ${u.recipientCount} người nhận</span>
                        </button>
                        <button 
                          type="button"
                          data-unit-stat-btn="${u.unit}"
                          data-stat-tab="overview_all"
                          class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>👥 Xem tất cả</span>
                        </button>
                      </div>
                    </div>

                    <!-- Biểu đồ thanh ngang -->
                    <div class="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                      <div 
                        class="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-500"
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

    // Sự kiện tìm kiếm Nhân sự trong DS Nhân sự
    const hrSearchInput = this.container.querySelector('#hr-directory-search-input');
    if (hrSearchInput) {
      hrSearchInput.addEventListener('input', (e) => {
        this.hrSearchQuery = e.target.value;
        this.renderInline();
        const nextInput = this.container.querySelector('#hr-directory-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    const hrUnitSelect = this.container.querySelector('#hr-directory-unit-select');
    if (hrUnitSelect) {
      hrUnitSelect.addEventListener('change', (e) => {
        this.hrUnitFilter = e.target.value;
        this.renderInline();
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
      ? 'border-amber-400/70 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-slate-950/90 shadow-2xl shadow-amber-500/20 md:-translate-y-2'
      : isTop2
      ? 'border-slate-300/50 bg-gradient-to-b from-slate-300/15 to-slate-950/85'
      : 'border-orange-500/50 bg-gradient-to-b from-orange-600/15 to-slate-950/85';

    const medal = isTop1 ? '👑 HẠNG 1' : isTop2 ? '🥈 HẠNG 2' : '🥉 HẠNG 3';
    const badgeBg = isTop1
      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
      : isTop2
      ? 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950'
      : 'bg-gradient-to-r from-amber-600 to-orange-500 text-white';

    return `
      <div class="relative rounded-3xl p-5 text-center border-2 ${borderClass} transition-all">
        <div class="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${badgeBg} shadow-md">
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
        <p class="text-xs text-amber-300/90 font-semibold truncate mt-0.5">${item.dept || 'FPT Telecom'}</p>
        <p class="text-[11px] text-slate-400 truncate mt-0.5">${item.role || 'Người truyền lửa'}</p>

        <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-center gap-2">
          <span class="text-xl">🔥</span>
          <span class="text-xl sm:text-2xl font-black text-amber-400">${item.count}</span>
          <span class="text-xs text-slate-300 font-semibold">ngọn lửa</span>
        </div>
      </div>
    `;
  }

  renderRankCard4To30(item) {
    return `
      <div class="p-3.5 rounded-2xl bg-slate-950/65 border border-white/10 hover:border-amber-500/35 transition-all flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-extrabold text-xs flex items-center justify-center shrink-0">
            #${item.rank}
          </div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0 overflow-hidden">
            ${item.avatar ? `<img src="${item.avatar}" alt="${item.name}" class="w-full h-full object-cover" />` : this.getInitials(item.name)}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-white text-sm truncate">${item.name}</div>
            <div class="text-xs text-slate-400 truncate">${item.dept || 'FPT Telecom'}</div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-base font-black text-amber-400 flex items-center gap-1 justify-end">
            <span>🔥</span>
            <span>${item.count}</span>
          </div>
          <div class="text-[10px] text-slate-400">ngọn lửa</div>
        </div>
      </div>
    `;
  }
}
