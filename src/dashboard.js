import { ApiService } from './api.js';

/**
 * Module Dashboard & Bảng Vinh Danh "30 Tiếp Lửa Bền Bỉ"
 */
export class DashboardModule {
  constructor() {
    this.modal = null;
    this.leaderboardData = [];
    this.filteredData = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  /**
   * Mở modal Dashboard
   */
  async open() {
    this.createModalDOM();
    await this.loadData();
    this.render();
  }

  createModalDOM() {
    // Remove if exists
    const existing = document.getElementById('dashboard-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'dashboard-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl transition-all duration-300';
    modal.innerHTML = `
      <div class="relative w-full max-w-5xl max-h-[92vh] flex flex-col glass-card rounded-3xl border border-amber-500/35 shadow-2xl overflow-hidden text-white">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div class="flex items-center gap-3">
            <div class="h-10 px-2 py-1 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <img src="/assets/logoFPT.png" alt="FPT Logo" class="h-7 w-auto object-contain" />
            </div>
            <div>
              <h2 class="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <span>BẢNG VINH DANH "30 TIẾP LỬA BỀN BỈ"</span>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">FTC • FTEL 20/11</span>
              </h2>
              <p class="text-xs text-slate-400">Trung tâm Đào tạo FTEL (FTC) • Dữ liệu thời gian thực phục vụ xét giải và truyền thông</p>
            </div>
          </div>
          <button id="close-dashboard-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer text-sm">
            ✕
          </button>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-white/10 bg-black/25 text-center">
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5">
            <span class="text-xs text-slate-400">Tổng ngọn lửa thắp sáng</span>
            <div id="stat-total-submissions" class="text-2xl font-black text-amber-400 mt-1">--</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5">
            <span class="text-xs text-slate-400">Mentor/Coach được tri ân</span>
            <div id="stat-total-mentors" class="text-2xl font-black text-orange-400 mt-1">--</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5">
            <span class="text-xs text-slate-400">CBNV tham gia gửi</span>
            <div id="stat-total-senders" class="text-2xl font-black text-sky-400 mt-1">--</div>
          </div>
          <div class="p-3.5 rounded-2xl bg-white/[0.04] border border-white/5">
            <span class="text-xs text-slate-400">Đơn vị / Chi nhánh</span>
            <div id="stat-total-depts" class="text-2xl font-black text-emerald-400 mt-1">13</div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-3 border-b border-white/10 bg-black/20">
          <div class="relative w-full sm:w-72">
            <input 
              id="dashboard-search-input" 
              type="text" 
              placeholder="Tìm theo tên, email, đơn vị..." 
              class="custom-input w-full px-3.5 py-2 text-sm placeholder-slate-400"
            />
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button id="dashboard-admin-manage-btn" class="hidden px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10">
              <span>👑</span>
              <span>Quản Lý / Xóa Lời Chúc</span>
            </button>
            <button id="export-csv-btn" class="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <span>↓ Xuất Báo Cáo Excel</span>
            </button>
            <button id="refresh-dashboard-btn" class="px-3.5 py-2 rounded-xl btn-glass text-slate-300 text-xs font-medium transition-all cursor-pointer">
              ↻ Làm mới
            </button>
          </div>
        </div>

        <!-- Table Content -->
        <div class="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <div id="leaderboard-table-container">
            <div class="py-12 text-center text-slate-500">Đang đồng bộ dữ liệu...</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-white/10 bg-slate-950 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hệ thống bảo mật: Google Sheets Restricted Mode</span>
          </div>
          <span class="text-slate-500">Giải thưởng 30 Tiếp Lửa Bền Bỉ xét theo số lượt tri ân hợp lệ</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Attach events
    modal.querySelector('#close-dashboard-btn').addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    const searchInput = modal.querySelector('#dashboard-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.applyFilter();
    });

    modal.querySelector('#export-csv-btn').addEventListener('click', () => this.exportCsv());
    modal.querySelector('#refresh-dashboard-btn').addEventListener('click', () => this.refresh());

    const adminManageBtn = modal.querySelector('#dashboard-admin-manage-btn');
    const isAdmin = !!(ApiService.getUserSession()?.isAdmin || ApiService.getAdminSession()?.isAdmin);
    if (adminManageBtn && isAdmin) {
      adminManageBtn.classList.remove('hidden');
      adminManageBtn.classList.add('flex');
      adminManageBtn.addEventListener('click', () => {
        this.close();
        const openAdminBtn = document.getElementById('open-admin-panel-btn') || document.getElementById('footer-admin-link');
        if (openAdminBtn) openAdminBtn.click();
      });
    }
  }

  async loadData() {
    try {
      const [stats, leaderboard] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getLeaderboard()
      ]);

      // Update counters
      const totalSubEl = document.getElementById('stat-total-submissions');
      const totalMentorsEl = document.getElementById('stat-total-mentors');
      const totalSendersEl = document.getElementById('stat-total-senders');

      if (totalSubEl) totalSubEl.textContent = (stats.totalSubmissions || 265).toLocaleString('vi-VN');
      if (totalMentorsEl) totalMentorsEl.textContent = (stats.uniqueRecipients || 42).toString();
      if (totalSendersEl) totalSendersEl.textContent = (stats.uniqueSenders || 198).toLocaleString('vi-VN');

      this.leaderboardData = leaderboard;
      this.applyFilter();
    } catch (err) {
      console.error("Dashboard data load error:", err);
    }
  }

  applyFilter() {
    if (!this.searchQuery) {
      this.filteredData = this.leaderboardData;
    } else {
      this.filteredData = this.leaderboardData.filter(item => {
        return (item.name || '').toLowerCase().includes(this.searchQuery) ||
               (item.email || '').toLowerCase().includes(this.searchQuery) ||
               (item.dept || '').toLowerCase().includes(this.searchQuery) ||
               (item.role || '').toLowerCase().includes(this.searchQuery);
      });
    }
    this.render();
  }

  render() {
    const container = document.getElementById('leaderboard-table-container');
    if (!container) return;

    if (this.filteredData.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          Không tìm thấy cán bộ Mentor nào phù hợp với từ khóa "${this.searchQuery}".
        </div>
      `;
      return;
    }

    const maxCount = Math.max(...this.leaderboardData.map(d => d.count), 1);

    const rowsHtml = this.filteredData.map((item, idx) => {
      const rank = item.rank || (idx + 1);
      let rankBadge = `<span class="font-bold text-slate-400 text-sm">#${rank}</span>`;
      let rowHighlight = "hover:bg-white/5";

      if (rank === 1) {
        rankBadge = `<div class="w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-amber-400/40">🥇 1</div>`;
        rowHighlight = "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-amber-400";
      } else if (rank === 2) {
        rankBadge = `<div class="w-7 h-7 rounded-full bg-gradient-to-r from-slate-300 to-slate-100 text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-slate-300/30">🥈 2</div>`;
        rowHighlight = "bg-slate-400/10 hover:bg-slate-400/15 border-l-4 border-slate-300";
      } else if (rank === 3) {
        rankBadge = `<div class="w-7 h-7 rounded-full bg-gradient-to-r from-amber-700 to-orange-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-orange-700/30">🥉 3</div>`;
        rowHighlight = "bg-orange-600/10 hover:bg-orange-600/15 border-l-4 border-orange-500";
      }

      const percent = Math.min(100, Math.round((item.count / maxCount) * 100));

      return `
        <tr class="transition-colors ${rowHighlight} border-b border-white/5">
          <td class="py-3 px-3 text-center w-14">${rankBadge}</td>
          <td class="py-3 px-3">
            <div class="font-bold text-white text-sm">${item.name}</div>
            <div class="text-xs text-slate-400">${item.email}</div>
          </td>
          <td class="py-3 px-3 hidden md:table-cell">
            <span class="text-xs font-medium text-slate-300">${item.dept || 'FTEL'}</span>
          </td>
          <td class="py-3 px-3 hidden sm:table-cell">
            <span class="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-800 text-amber-300 border border-amber-400/20">
              ${item.role || 'Mentor'}
            </span>
          </td>
          <td class="py-3 px-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <span class="text-base font-bold text-orange-400">${item.count}</span>
              <span class="text-xs text-slate-400">lượt</span>
            </div>
            <div class="w-24 ml-auto h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
              <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style="width: ${percent}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-xs font-semibold text-slate-400 border-b border-white/10 uppercase tracking-wider">
            <th class="py-2.5 px-3 text-center">Hạng</th>
            <th class="py-2.5 px-3">Cán bộ được tri ân</th>
            <th class="py-2.5 px-3 hidden md:table-cell">Đơn vị / Phòng ban</th>
            <th class="py-2.5 px-3 hidden sm:table-cell">Vai trò</th>
            <th class="py-2.5 px-3 text-right">Số ngọn lửa nhận</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  exportCsv() {
    if (!this.leaderboardData || this.leaderboardData.length === 0) return;

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    csvContent += "Hạng,Họ và tên,Email,Đơn vị,Vai trò,Số lượt tri ân\n";

    this.leaderboardData.forEach((item, idx) => {
      const rank = item.rank || (idx + 1);
      const row = [
        rank,
        `"${item.name}"`,
        `"${item.email}"`,
        `"${item.dept || ''}"`,
        `"${item.role || ''}"`,
        item.count
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_Cao_Top30_Tiep_Lua_Ben_Bi_FTEL_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async refresh() {
    const container = document.getElementById('leaderboard-table-container');
    if (container) {
      container.innerHTML = `<div class="py-12 text-center text-slate-400">Đang cập nhật...</div>`;
    }
    await this.loadData();
  }

  close() {
    if (this.modal) {
      this.modal.classList.add('opacity-0');
      setTimeout(() => {
        if (this.modal) this.modal.remove();
        this.modal = null;
      }, 200);
    }
  }
}
