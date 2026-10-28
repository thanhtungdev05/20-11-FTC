/**
 * Dữ liệu cấu hình, Danh bạ nhân sự, Bộ chuẩn hóa chính tả & Dữ liệu mẫu cho Chiến dịch FTEL 20/11
 */

export const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/1ot14yO0FsBI0jVeySVhs1v4s_QX30e3iNiJg0WveJUI/viewform";
export const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit?pli=1&gid=1557167031#gid=1557167031";
export const GOOGLE_SHEET_ID = "1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g";
export const GOOGLE_SHEET_GID = "1557167031";

export const DEPARTMENTS = [
  "Trung tâm Đào tạo FTEL (FTC)",
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
  "Một người đặc biệt trong hành trình"
];

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

/**
 * Danh bạ nhân sự FTEL (Email -> { name, dept, avatar })
 */
export const EMPLOYEE_DIRECTORY = {
  "tungdt101@fpt.com": { name: "Đặng Thanh Tùng", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "tungdt101@fpt.net": { name: "Đặng Thanh Tùng", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "duyennnt3@fpt.com": { name: "Nguyễn Ngọc Thảo Duyên", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "duyennnt3@fpt.net": { name: "Nguyễn Ngọc Thảo Duyên", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "hungnv@fpt.net": { name: "Nguyễn Văn Hùng", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "anhtm@fpt.net": { name: "Trần Mai Anh", dept: "NOC - Trung tâm Vận hành Mạng" },
  "phuclh@fpt.net": { name: "Lê Hoàng Phúc", dept: "FTI - Khách hàng Doanh nghiệp" },
  "phuclv@fpt.net": { name: "Lê Văn Phúc", dept: "FTI - Khách hàng Doanh nghiệp" },
  "hangpt@fpt.net": { name: "Phạm Thúy Hằng", dept: "CS - Trung tâm Chăm sóc Khách hàng" },
  "baodq@fpt.net": { name: "Đỗ Quốc Bảo", dept: "TIN - Viễn thông Quốc tế Miền Bắc" },
  "dangvh@fpt.net": { name: "Vũ Hải Đăng", dept: "Khối Công nghệ & Kỹ thuật" },
  "vannt@fpt.net": { name: "Ngô Thanh Vân", dept: "PNC - Viễn thông Quốc tế Miền Nam" },
  "khiemhg@fpt.net": { name: "Hoàng Gia Khiêm", dept: "FPL - FPT Play" },
  "lanbt@fpt.net": { name: "Bùi Thị Lan", dept: "INF - Trung tâm Phát triển Hạ tầng" },
  "nghiadt@fpt.net": { name: "Đinh Trọng Nghĩa", dept: "Ban Giám đốc & Văn phòng HO" }
};

export function lookupEmployeeInfo(email) {
  if (!email) return { name: "", dept: "FPT Telecom", avatar: "" };
  const normalized = String(email).trim().toLowerCase();
  const entry = EMPLOYEE_DIRECTORY[normalized];
  if (entry) {
    return typeof entry === "string"
      ? { name: entry, dept: "FPT Telecom", avatar: "" }
      : { name: entry.name || "", dept: entry.dept || "FPT Telecom", avatar: entry.avatar || "" };
  }
  try {
    const cachedDir = JSON.parse(localStorage.getItem("ftel_employee_dir_cache") || "{}");
    if (cachedDir && cachedDir[normalized]) {
      const c = cachedDir[normalized];
      return typeof c === "string"
        ? { name: c, dept: "FPT Telecom", avatar: "" }
        : { name: c.name || "", dept: c.dept || "FPT Telecom", avatar: c.avatar || "" };
    }
  } catch (e) {}
  return { name: "", dept: "FPT Telecom", avatar: "" };
}

export function lookupEmployeeName(email) {
  return lookupEmployeeInfo(email).name;
}

export function saveEmployeeNameCache(email, fullName, dept = "FPT Telecom") {
  if (!email || !fullName) return;
  const normalized = String(email).trim().toLowerCase();
  const cleanName = String(fullName).trim();
  if (!normalized || !cleanName) return;
  try {
    const cachedDir = JSON.parse(localStorage.getItem("ftel_employee_dir_cache") || "{}");
    cachedDir[normalized] = { name: cleanName, dept: dept || "FPT Telecom" };
    localStorage.setItem("ftel_employee_dir_cache", JSON.stringify(cachedDir));
  } catch (e) {}
}

/**
 * Bộ kiểm tra & chuẩn hóa chính tả tiếng Việt tự động cho thông điệp tri ân
 */
export function cleanAndCorrectVietnameseText(text) {
  if (!text) return "";
  let s = String(text).trim();

  // Chuẩn hóa khoảng trắng và dấu câu
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\s+([,.;!?])/g, "$1");
  s = s.replace(/([,.;!?])([^\s"”’)\]])/g, "$1 $2");
  s = s.replace(/\n{3,}/g, "\n\n");

  const replacements = [
    [/\bko\b/gi, "không"],
    [/\bkhg\b/gi, "không"],
    [/\bhok\b/gi, "không"],
    [/\bk\b/gi, "không"],
    [/\bdc\b/gi, "được"],
    [/\bđc\b/gi, "được"],
    [/\bđk\b/gi, "được"],
    [/\ba\/c\b/gi, "Anh/Chị"],
    [/\bac\b/gi, "Anh/Chị"],
    [/\bmn\b/gi, "mọi người"],
    [/\bmng\b/gi, "mọi người"],
    [/\bnv\b/gi, "nhân viên"],
    [/\bcv\b/gi, "công việc"],
    [/\bgđ\b/gi, "gia đình"],
    [/\bcam on\b/gi, "cảm ơn"],
    [/\bcám ơn\b/gi, "cảm ơn"],
    [/\btruyền lữa\b/gi, "truyền lửa"],
    [/\bnhiệt huyểt\b/gi, "nhiệt huyết"],
    [/\bsức khoẻ\b/gi, "sức khỏe"]
  ];

  replacements.forEach(([regex, target]) => {
    s = s.replace(regex, target);
  });

  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  s = s.replace(/([.!?]\s+)([a-zàáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])/g, (m, p1, p2) => {
    return p1 + p2.toUpperCase();
  });

  return s;
}

/**
 * Bảng 1: 30 NGƯỜI TIẾP LỬA TRI THỨC (Mẫu hiển thị khi chưa có dữ liệu thực hoặc chế độ Demo)
 */
export const MOCK_LEADERBOARD = [
  { rank: 1, name: "Nguyễn Văn Hùng", email: "hungnv@fpt.net", dept: "Trung tâm Đào tạo FTEL (FTC)", role: "Giảng viên – Người truyền tri thức", count: 48, badge: "gold" },
  { rank: 2, name: "Trần Mai Anh", email: "anhtm@fpt.net", dept: "NOC - Trung tâm Vận hành Mạng", role: "Mentor/ Coach – Người đồng hành, khai mở năng lực", count: 42, badge: "silver" },
  { rank: 3, name: "Lê Hoàng Phúc", email: "phuclh@fpt.net", dept: "FTI - Khách hàng Doanh nghiệp", role: "Người dẫn dắt – Người truyền cảm hứng", count: 37, badge: "bronze" },
  { rank: 4, name: "Phạm Thúy Hằng", email: "hangpt@fpt.net", dept: "CS - Trung tâm Chăm sóc Khách hàng", role: "Đồng nghiệp tận tâm – Người sẻ chia, sát cánh", count: 31 },
  { rank: 5, name: "Đỗ Quốc Bảo", email: "baodq@fpt.net", dept: "TIN - Viễn thông Quốc tế Miền Bắc", role: "Quản lý trực tiếp – Người định hướng", count: 29 },
  { rank: 6, name: "Vũ Hải Đăng", email: "dangvh@fpt.net", dept: "Khối Công nghệ & Kỹ thuật", role: "Mentor/ Coach – Người đồng hành, khai mở năng lực", count: 26 },
  { rank: 7, name: "Ngô Thanh Vân", email: "vannt@fpt.net", dept: "PNC - Viễn thông Quốc tế Miền Nam", role: "Giảng viên – Người truyền tri thức", count: 24 },
  { rank: 8, name: "Hoàng Gia Khiêm", email: "khiemhg@fpt.net", dept: "FPL - FPT Play", role: "Người dẫn dắt – Người truyền cảm hứng", count: 21 },
  { rank: 9, name: "Bùi Thị Lan", email: "lanbt@fpt.net", dept: "INF - Trung tâm Phát triển Hạ tầng", role: "Đồng nghiệp tận tâm – Người sẻ chia, sát cánh", count: 19 },
  { rank: 10, name: "Đinh Trọng Nghĩa", email: "nghiadt@fpt.net", dept: "Ban Giám đốc & Văn phòng HO", role: "Quản lý trực tiếp – Người định hướng", count: 18 },
  { rank: 11, name: "Trịnh Quốc Khánh", email: "khanhtq@fpt.com", dept: "Chi nhánh Toàn quốc (Vùng 1 - Vùng 7)", role: "Giảng viên – Người truyền tri thức", count: 16 },
  { rank: 12, name: "Lý Thanh Thảo", email: "thaolt@fpt.com", dept: "CUS - Trung tâm Quản lý Cước", role: "Mentor/ Coach – Người đồng hành, khai mở năng lực", count: 15 }
];

/**
 * Bảng 2: 100 NGƯỜI TIẾP LỬA SỚM NHẤT (Sắp xếp theo thời gian gửi hợp lệ tăng dần từ sớm nhất)
 */
export const MOCK_EARLY_100 = [
  { order: 1, name: "Nguyễn Ngọc Thảo Duyên", email: "duyennnt3@fpt.com", dept: "Trung tâm Đào tạo FTEL (FTC)", recipientName: "Nguyễn Văn Hùng", timestamp: "08:00:12 - 20/11/2026" },
  { order: 2, name: "Đặng Thanh Tùng", email: "tungdt101@fpt.com", dept: "Trung tâm Đào tạo FTEL (FTC)", recipientName: "Trần Mai Anh", timestamp: "08:01:05 - 20/11/2026" },
  { order: 3, name: "Lê Minh Tuấn", email: "tuanlm12@fpt.com", dept: "FTI - Khách hàng Doanh nghiệp", recipientName: "Lê Hoàng Phúc", timestamp: "08:02:18 - 20/11/2026" },
  { order: 4, name: "Phạm Thị Hồng Nhung", email: "nhungpth@fpt.com", dept: "CS - Trung tâm Chăm sóc Khách hàng", recipientName: "Phạm Thúy Hằng", timestamp: "08:03:40 - 20/11/2026" },
  { order: 5, name: "Trần Quốc Tuấn", email: "tuantq8@fpt.com", dept: "TIN - Viễn thông Quốc tế Miền Bắc", recipientName: "Đỗ Quốc Bảo", timestamp: "08:04:19 - 20/11/2026" },
  { order: 6, name: "Hoàng Minh Châu", email: "chauhm@fpt.com", dept: "PNC - Viễn thông Quốc tế Miền Nam", recipientName: "Ngô Thanh Vân", timestamp: "08:05:52 - 20/11/2026" },
  { order: 7, name: "Võ Thành Đạt", email: "datvt5@fpt.com", dept: "Khối Công nghệ & Kỹ thuật", recipientName: "Vũ Hải Đăng", timestamp: "08:07:11 - 20/11/2026" },
  { order: 8, name: "Đoàn Thu Trang", email: "trangdt9@fpt.com", dept: "FPL - FPT Play", recipientName: "Hoàng Gia Khiêm", timestamp: "08:08:45 - 20/11/2026" },
  { order: 9, name: "Nguyễn Hữu Phước", email: "phuocnh@fpt.com", dept: "INF - Trung tâm Phát triển Hạ tầng", recipientName: "Bùi Thị Lan", timestamp: "08:10:03 - 20/11/2026" },
  { order: 10, name: "Phan Thanh Bình", email: "binhpt@fpt.com", dept: "NOC - Trung tâm Vận hành Mạng", recipientName: "Trần Mai Anh", timestamp: "08:11:28 - 20/11/2026" }
];

/**
 * Khu vực D: Lan tỏa theo đơn vị
 */
export const MOCK_UNIT_SPREAD = [
  { unit: "Trung tâm Đào tạo FTEL (FTC)", totalFlames: 64, senderCount: 45, recipientCount: 14 },
  { unit: "TIN - Viễn thông Quốc tế Miền Bắc", totalFlames: 52, senderCount: 38, recipientCount: 11 },
  { unit: "PNC - Viễn thông Quốc tế Miền Nam", totalFlames: 46, senderCount: 34, recipientCount: 10 },
  { unit: "FTI - Khách hàng Doanh nghiệp", totalFlames: 39, senderCount: 28, recipientCount: 8 },
  { unit: "NOC - Trung tâm Vận hành Mạng", totalFlames: 34, senderCount: 25, recipientCount: 7 },
  { unit: "CS - Trung tâm Chăm sóc Khách hàng", totalFlames: 31, senderCount: 22, recipientCount: 6 },
  { unit: "Khối Công nghệ & Kỹ thuật", totalFlames: 26, senderCount: 19, recipientCount: 5 },
  { unit: "FPL - FPT Play", totalFlames: 21, senderCount: 16, recipientCount: 4 }
];
