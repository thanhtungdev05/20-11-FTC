import { ApiService } from './api.js';
import { GOOGLE_FORM_URL, GOOGLE_SHEET_URL } from './mockData.js';

/**
 * Module Live Dashboard Chiến Dịch 20/11 (Khu vực A - B - C - D)
 * - Khu vực B: Tổng quan chiến dịch (4 chỉ số KPI thời gian thực)
 * - Khu vực C: Bảng xếp hạng ("30 NGƯỜI TIẾP LỬA TRI THỨC" với Top 3 nổi bật + "100 NGƯỜI TIẾP LỬA SỚM NHẤT" dạng Timeline)
 * - Khu vực D: Lan tỏa theo đơn vị (Biểu đồ thanh ngang + Thống kê Người gửi/Người nhận + Bộ lọc theo đơn vị)
 */
export class DashboardModule {
  constructor() {
    this.data = null;
    this.selectedUnitFilter = 'ALL';
    this.searchQuery = '';
    this.activeRankingTab = 'top30'; // 'top30' | 'early100'
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

  renderInline() {
    if (!this.container || !this.data) return;

    const {
      totalFlames = 0,
      uniqueRecipients = 0,
      uniqueSenders = 0,
      uniqueUnits = 0,
      top30Recipients = [],
      early100Senders = [],
      unitSpread = []
    } = this.data;

    // Lọc theo đơn vị và từ khóa tìm kiếm
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
                placeholder="Tìm họ tên, đơn vị..." 
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
        <!-- KHU VỰC D: LAN TỎA THEO ĐƠN VỊ (BIỂU ĐỒ THANH NGANG & BỘ LỌC ĐƠN VỊ)    -->
        <!-- ======================================================================= -->
        <section class="glass-card rounded-3xl p-5 sm:p-7">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                Khu vực D • Lan Tỏa Theo Đơn Vị
              </div>
              <h2 class="text-lg sm:text-2xl font-black text-white">THỐNG KÊ NGỌN LỬA THEO ĐƠN VỊ / PHÒNG BAN</h2>
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

          <div class="space-y-3.5">
            ${filteredUnits.map((u, idx) => {
              const widthPct = Math.max(6, Math.round((u.totalFlames / maxUnitFlames) * 100));
              return `
                <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                    <div class="flex items-center gap-2.5">
                      <span class="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-black flex items-center justify-center">
                        ${idx + 1}
                      </span>
                      <span class="font-bold text-white text-sm sm:text-base">${u.unit}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-3 text-xs">
                      <span class="text-amber-400 font-extrabold">🔥 ${u.totalFlames} ngọn lửa</span>
                      <span class="text-sky-300">💌 ${u.senderCount} người gửi</span>
                      <span class="text-emerald-300">🎓 ${u.recipientCount} người nhận</span>
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
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;

    // Gắn sự kiện tương tác cho Dashboard
    const refreshBtn = this.container.querySelector('#dash-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

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
        this.renderInline();
      });
    }
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
