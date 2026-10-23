/**
 * Dữ liệu mẫu ban đầu cho FTEL 20/11
 */

export const DEPARTMENTS = [
  "Trung tâm Đào tạo FTEL",
  "TIN - Viễn thông Quốc tế Miền Bắc",
  "PNC - Viễn thông Quốc tế Miền Nam",
  "FTI - Khách hàng Doanh nghiệp",
  "NOC - Trung tâm Vận hành Mạng",
  "INF - Trung tâm Phát triển Hạ tầng",
  "CS - Trung tâm Chăm sóc Khách hàng",
  "CUS - Trung tâm Quản lý Cước",
  "FPL - FPT Play",
  "Khối Công nghệ & Kỹ thuật",
  "Khối Bán lẻ & Phân phối",
  "Ban Giám đốc & Văn phòng HO",
  "Chi nhánh Toàn quốc (Vùng 1 - Vùng 7)"
];

export const ROLES = [
  "Giảng viên – Người truyền tri thức",
  "Mentor/ Coach – Người đồng hành, khai mở năng lực",
  "Người dẫn dắt – Người truyền cảm hứng",
  "Quản lý trực tiếp – Người định hướng",
  "Đồng nghiệp tận tâm – Người sẻ chia, sát cánh",
  "Khác – Một người đặc biệt trong hành trình"
];

/**
 * Danh bạ nhân sự FTEL (Email -> Họ và tên)
 * Tự động điền Họ và tên khi người dùng đăng nhập hoặc nhập email
 */
export const EMPLOYEE_DIRECTORY = {
  "tungdt101@fpt.com": "Đặng Thanh Tùng",
  "tungdt101@fpt.net": "Đặng Thanh Tùng",
  "hungnv@fpt.net": "Nguyễn Văn Hùng",
  "anhtm@fpt.net": "Trần Mai Anh",
  "phuclh@fpt.net": "Lê Hoàng Phúc",
  "phuclv@fpt.net": "Lê Văn Phúc",
  "hangpt@fpt.net": "Phạm Thúy Hằng",
  "baodq@fpt.net": "Đỗ Quốc Bảo",
  "dangvh@fpt.net": "Vũ Hải Đăng",
  "vannt@fpt.net": "Ngô Thanh Vân",
  "khiemhg@fpt.net": "Hoàng Gia Khiêm",
  "lanbt@fpt.net": "Bùi Thị Lan",
  "nghiadt@fpt.net": "Đinh Trọng Nghĩa"
};

export function lookupEmployeeName(email) {
  if (!email) return "";
  const normalized = String(email).trim().toLowerCase();
  if (EMPLOYEE_DIRECTORY[normalized]) {
    return EMPLOYEE_DIRECTORY[normalized];
  }
  try {
    const cachedDir = JSON.parse(localStorage.getItem('ftel_employee_dir_cache') || '{}');
    if (cachedDir && cachedDir[normalized]) {
      return cachedDir[normalized];
    }
    const submissions = JSON.parse(localStorage.getItem('ftel_tribute_submissions_v1') || '[]');
    if (Array.isArray(submissions)) {
      for (const item of submissions) {
        if (String(item?.senderEmail || '').trim().toLowerCase() === normalized && item?.senderName) {
          return item.senderName;
        }
        if (String(item?.recipientEmail || '').trim().toLowerCase() === normalized && item?.recipientName) {
          return item.recipientName;
        }
      }
    }
  } catch (e) {}
  return "";
}

export function saveEmployeeNameCache(email, fullName) {
  if (!email || !fullName) return;
  const normalized = String(email).trim().toLowerCase();
  const cleanName = String(fullName).trim();
  if (!normalized || !cleanName) return;
  try {
    const cachedDir = JSON.parse(localStorage.getItem('ftel_employee_dir_cache') || '{}');
    cachedDir[normalized] = cleanName;
    localStorage.setItem('ftel_employee_dir_cache', JSON.stringify(cachedDir));
  } catch (e) {}
}

export const TRIBUTE_TAGS = [
  { id: "tiep-lua", name: "30 Tiếp Lửa Bền Bỉ", color: "from-amber-400 to-orange-500", desc: "Dành cho Mentor kiên trì đồng hành & truyền lửa" },
  { id: "truyen-cam-hung", name: "Người Truyền Cảm Hứng", color: "from-rose-500 to-orange-400", desc: "Thắp sáng niềm đam mê học hỏi và bứt phá" },
  { id: "huong-dan-tan-tam", name: "Hướng Dẫn Tận Tâm", color: "from-blue-500 to-cyan-400", desc: "Chỉ bảo từng chi tiết nhỏ, kiên nhẫn đồng hành" },
  { id: "dan-loi-tan-binh", name: "Dẫn Lối Tân Binh", color: "from-emerald-400 to-teal-600", desc: "Chiếc phao cứu sinh cho những ngày đầu bỡ ngỡ" },
  { id: "dong-doi-tuyet-voi", name: "Đồng Đội Tri Thức", color: "from-purple-500 to-indigo-600", desc: "Cùng nhau giải bài toán khó, không giấu nghề" }
];

export const SAMPLE_WISHES = [
  "Em cảm ơn Anh/Chị đã luôn kiên nhẫn chỉ bảo em từng bước từ những ngày đầu còn bỡ ngỡ tại FTEL. Ngọn lửa nhiệt huyết của Anh/Chị là nguồn động lực lớn nhất của em!",
  "Nhân ngày 20/11, chúc Người Thầy đặc biệt của em luôn dồi dào sức khỏe, tràn đầy năng lượng và tiếp tục thắp sáng tri thức cho thật nhiều thế hệ tiếp theo!",
  "Cảm ơn Mentor tuyệt vời đã không ngần ngại chia sẻ từng kinh nghiệm xương máu trong các dự án lớn. Nhờ có Anh/Chị mà em đã trưởng thành hơn rất nhiều!",
  "Gửi lời tri ân sâu sắc nhất tới Coach tận tâm! Từng lời góp ý, từng buổi review của Anh/Chị đã giúp em vượt qua những giai đoạn thử thách nhất.",
  "Người ta nói muốn đi nhanh hãy đi một mình, muốn đi xa hãy đi cùng nhau. Cảm ơn Anh/Chị đã luôn là ngọn hải đăng dẫn lối em trên hành trình tại FPT Telecom!"
];

export const MOCK_LEADERBOARD = [
  { rank: 1, name: "Nguyễn Văn Hùng", email: "hungnv@fpt.net", dept: "Trung tâm Đào tạo FTEL", role: "Giảng viên Nội bộ FTEL", count: 48, badge: "gold" },
  { rank: 2, name: "Trần Mai Anh", email: "anhtm@fpt.net", dept: "NOC - Trung tâm Vận hành Mạng", role: "Mentor / Coach chuyên môn", count: 42, badge: "silver" },
  { rank: 3, name: "Lê Hoàng Phúc", email: "phuclh@fpt.net", dept: "FTI - Khách hàng Doanh nghiệp", role: "Mentor / Coach chuyên môn", count: 37, badge: "bronze" },
  { rank: 4, name: "Phạm Thúy Hằng", email: "hangpt@fpt.net", dept: "CS - Trung tâm Chăm sóc Khách hàng", role: "Người hướng dẫn tân binh (Buddy)", count: 31 },
  { rank: 5, name: "Đỗ Quốc Bảo", email: "baodq@fpt.net", dept: "TIN - Viễn thông Quốc tế Miền Bắc", role: "Trưởng nhóm / Leader dẫn dắt", count: 29 },
  { rank: 6, name: "Vũ Hải Đăng", email: "dangvh@fpt.net", dept: "Khối Công nghệ & Kỹ thuật", role: "Đồng nghiệp tận tâm chia sẻ tri thức", count: 26 },
  { rank: 7, name: "Ngô Thanh Vân", email: "vannt@fpt.net", dept: "PNC - Viễn thông Quốc tế Miền Nam", role: "Giảng viên Nội bộ FTEL", count: 24 },
  { rank: 8, name: "Hoàng Gia Khiêm", email: "khiemhg@fpt.net", dept: "FPL - FPT Play", role: "Mentor / Coach chuyên môn", count: 21 },
  { rank: 9, name: "Bùi Thị Lan", email: "lanbt@fpt.net", dept: "INF - Trung tâm Phát triển Hạ tầng", role: "Người hướng dẫn tân binh (Buddy)", count: 19 },
  { rank: 10, name: "Đinh Trọng Nghĩa", email: "nghiadt@fpt.net", dept: "Ban Giám đốc & Văn phòng HO", role: "Trưởng nhóm / Leader dẫn dắt", count: 18 }
];
