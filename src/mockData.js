/**
 * Dữ liệu cấu hình, Danh bạ nhân sự, Bộ chuẩn hóa chính tả & Dữ liệu mẫu cho Chiến dịch FTEL 20/11
 */

export const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/1ot14yO0FsBI0jVeySVhs1v4s_QX30e3iNiJg0WveJUI/viewform";
export const GOOGLE_FORM_EDIT_URL = "https://docs.google.com/forms/d/1ot14yO0FsBI0jVeySVhs1v4s_QX30e3iNiJg0WveJUI/edit";
export const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit?pli=1&gid=1557167031#gid=1557167031";
export const GOOGLE_HR_SHEET_URL = "https://docs.google.com/spreadsheets/d/1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g/edit?gid=1084168011#gid=1084168011";
export const GOOGLE_SHEET_ID = "1MRmolCh50gHt5UMlSkIFSNtKdFSK0xhJ_f_4NpHUu9g";
export const GOOGLE_SHEET_GID = "1557167031";
export const GOOGLE_HR_SHEET_GID = "1084168011";

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
  "nhanlh10@fpt.com": { name: "Lê Hoàng Nhân", dept: "Trung tâm Đào tạo FTEL (FTC)" },
  "nhanlh10@fpt.net": { name: "Lê Hoàng Nhân", dept: "Trung tâm Đào tạo FTEL (FTC)" },
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

// Bộ nhớ đệm RAM tốc độ cao O(1) hỗ trợ quy mô 25.000+ nhân sự không làm đầy localStorage
export const IN_MEMORY_HR_MAP = new Map();

export function registerBulkEmployeesInMemory(list = []) {
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    const emp = list[i];
    if (!emp || !emp.email) continue;
    const email = String(emp.email).trim().toLowerCase();
    const local = email.split("@")[0];
    const info = { name: emp.name || "", dept: emp.dept || "FPT Telecom", avatar: emp.avatar || "" };
    IN_MEMORY_HR_MAP.set(email, info);
    if (local) {
      IN_MEMORY_HR_MAP.set(local, info);
      IN_MEMORY_HR_MAP.set(`${local}@fpt.com`, info);
      IN_MEMORY_HR_MAP.set(`${local}@fpt.net`, info);
    }
  }
}

export function lookupEmployeeInfo(email) {
  if (!email) return { name: "", dept: "FPT Telecom", avatar: "" };
  const normalized = String(email).trim().toLowerCase();
  const localPart = normalized.split("@")[0];

  const memHit =
    IN_MEMORY_HR_MAP.get(normalized) ||
    (localPart ? IN_MEMORY_HR_MAP.get(localPart) : null);
  if (memHit && memHit.name) {
    return memHit;
  }

  const entry =
    EMPLOYEE_DIRECTORY[normalized] ||
    (localPart ? EMPLOYEE_DIRECTORY[`${localPart}@fpt.com`] || EMPLOYEE_DIRECTORY[`${localPart}@fpt.net`] : null);
  if (entry) {
    return typeof entry === "string"
      ? { name: entry, dept: "FPT Telecom", avatar: "" }
      : { name: entry.name || "", dept: entry.dept || "FPT Telecom", avatar: entry.avatar || "" };
  }
  try {
    const cachedDir = JSON.parse(localStorage.getItem("ftel_employee_dir_cache") || "{}");
    const c =
      cachedDir[normalized] ||
      (localPart ? cachedDir[`${localPart}@fpt.com`] || cachedDir[`${localPart}@fpt.net`] : null);
    if (c) {
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
  const local = normalized.split("@")[0];
  const info = { name: cleanName, dept: dept || "FPT Telecom", avatar: "" };
  IN_MEMORY_HR_MAP.set(normalized, info);
  if (local) {
    IN_MEMORY_HR_MAP.set(local, info);
    IN_MEMORY_HR_MAP.set(`${local}@fpt.com`, info);
    IN_MEMORY_HR_MAP.set(`${local}@fpt.net`, info);
  }
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
    // 1. Cụm từ và ngữ cảnh dễ gõ sai phụ âm cuối / dấu hỏi ngã
    [/\bchút mừng\b/gi, "chúc mừng"],
    [/\bchút anh\b/gi, "chúc anh"],
    [/\bchút chị\b/gi, "chúc chị"],
    [/\bchút bạn\b/gi, "chúc bạn"],
    [/\bchút thầy\b/gi, "chúc thầy"],
    [/\bchút cô\b/gi, "chúc cô"],
    [/\bchút em\b/gi, "chúc em"],
    [/\bchút cbnv\b/gi, "chúc CBNV"],
    [/\bngọn lữa\b/gi, "ngọn lửa"],
    [/\btruyền lữa\b/gi, "truyền lửa"],
    [/\bthắp lữa\b/gi, "thắp lửa"],
    [/\bchia sẽ\b/gi, "chia sẻ"],
    [/\bsẻ chia\b/gi, "sẻ chia"],
    [/\bchi ân\b/gi, "tri ân"],
    [/\bdồi giàu\b/gi, "dồi dào"],
    [/\bdồi dào\b/gi, "dồi dào"],
    [/\bnhiệt huyểt\b/gi, "nhiệt huyết"],
    [/\bsức khoẻ\b/gi, "sức khỏe"],
    [/\bthắp xáng\b/gi, "thắp sáng"],
    [/\bgiản viên\b/gi, "giảng viên"],
    [/\bđòng nghiệp\b/gi, "đồng nghiệp"],
    [/\bchúc mưng\b/gi, "chúc mừng"],
    [/\bchuc mung\b/gi, "chúc mừng"],

    // 2. Viết tắt và telex thông dụng
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
    [/\bae\b/gi, "anh em"],
    [/\ba e\b/gi, "anh em"],
    [/\bcty\b/gi, "công ty"],
    [/\btg\b/gi, "thời gian"],
    [/\btgian\b/gi, "thời gian"],
    [/\bmik\b/gi, "mình"],
    [/\bmk\b/gi, "mình"],
    [/\bblđ\b/gi, "Ban Lãnh đạo"],
    [/\bcbnv\b/gi, "CBNV"],
    [/\bcbcnv\b/gi, "CBNV"],
    [/\bftel\b/gi, "FTEL"],
    [/\bfpt\b/gi, "FPT"],
    [/\bftc\b/gi, "FTC"],
    [/\bhp\b/gi, "hạnh phúc"],
    [/\bsk\b/gi, "sức khỏe"],
    [/\btc\b/gi, "thành công"],
    [/\bcam on\b/gi, "cảm ơn"],
    [/\bcám ơn\b/gi, "cảm ơn"]
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
 * Khu vực D: Lan tỏa theo đơn vị & Danh bạ nhân sự chi tiết (Kèm chi tiết Ngọn lửa, Người gửi, Người nhận, Thành viên)
 */
const BASE_UNIT_CONFIGS = [
  { unit: "Trung tâm Đào tạo FTEL (FTC)", code: "ftc", totalFlames: 64, senderCount: 45, recipientCount: 14 },
  { unit: "TIN - Viễn thông Quốc tế Miền Bắc", code: "tin", totalFlames: 52, senderCount: 38, recipientCount: 11 },
  { unit: "PNC - Viễn thông Quốc tế Miền Nam", code: "pnc", totalFlames: 46, senderCount: 34, recipientCount: 10 },
  { unit: "FTI - Khách hàng Doanh nghiệp", code: "fti", totalFlames: 39, senderCount: 28, recipientCount: 8 },
  { unit: "NOC - Trung tâm Vận hành Mạng", code: "noc", totalFlames: 34, senderCount: 25, recipientCount: 7 },
  { unit: "CS - Trung tâm Chăm sóc Khách hàng", code: "cs", totalFlames: 31, senderCount: 22, recipientCount: 6 },
  { unit: "Khối Công nghệ & Kỹ thuật", code: "tech", totalFlames: 26, senderCount: 19, recipientCount: 5 },
  { unit: "FPL - FPT Play", code: "fpl", totalFlames: 21, senderCount: 16, recipientCount: 4 }
];

const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Phan", "Lý", "Trịnh", "Đinh"];
const MID_NAMES = ["Văn", "Thị", "Hoàng", "Minh", "Ngọc", "Thanh", "Quốc", "Hải", "Thu", "Hữu", "Đức", "Gia", "Trọng", "Mai"];
const FIRST_NAMES = ["Hùng", "Anh", "Phúc", "Hằng", "Bảo", "Đăng", "Vân", "Khiêm", "Lan", "Nghĩa", "Tùng", "Duyên", "Tuấn", "Nhung", "Châu", "Đạt", "Trang", "Phước", "Bình", "Thảo", "Khánh", "Linh", "Nam", "Phương"];

function removeDiacritics(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function buildMockUnitSpreadAndHrDirectory() {
  const hrDirectory = [];
  const seenEmails = new Set();

  // Đưa các nhân sự tiêu biểu từ EMPLOYEE_DIRECTORY và MOCK_LEADERBOARD vào trước
  Object.entries(EMPLOYEE_DIRECTORY).forEach(([email, info]) => {
    if (email.endsWith("@fpt.net") && seenEmails.has(email.replace("@fpt.net", "@fpt.com"))) return;
    seenEmails.add(email);
    hrDirectory.push({
      name: info.name,
      email: email,
      dept: info.dept,
      role: "CBNV / Giảng viên nội bộ",
      sentCount: 2,
      receivedCount: 5
    });
  });

  const unitSpread = BASE_UNIT_CONFIGS.map((cfg, uIdx) => {
    const recipientsList = [];
    const sendersList = [];
    const flamesList = [];
    const membersMap = {};

    // 1. Tạo danh sách Người nhận (đúng bằng cfg.recipientCount, VD: 14 người nhận cho FTC)
    const knownUnitMentors = MOCK_LEADERBOARD.filter(m => m.dept === cfg.unit);
    for (let r = 0; r < cfg.recipientCount; r++) {
      let recName, recEmail, recRole;
      if (r < knownUnitMentors.length) {
        recName = knownUnitMentors[r].name;
        recEmail = knownUnitMentors[r].email;
        recRole = knownUnitMentors[r].role;
      } else {
        const ln = LAST_NAMES[(uIdx * 3 + r) % LAST_NAMES.length];
        const mn = MID_NAMES[(uIdx * 5 + r) % MID_NAMES.length];
        const fn = FIRST_NAMES[(uIdx * 7 + r) % FIRST_NAMES.length];
        recName = `${ln} ${mn} ${fn}`;
        recEmail = `${removeDiacritics(fn)}${removeDiacritics(ln)[0]}${removeDiacritics(mn)[0]}${r + 1}@fpt.com`;
        recRole = ROLES[r % ROLES.length];
      }
      const recObj = {
        name: recName,
        email: recEmail,
        dept: cfg.unit,
        role: recRole,
        count: 0
      };
      recipientsList.push(recObj);
      membersMap[recEmail] = {
        name: recName,
        email: recEmail,
        dept: cfg.unit,
        role: recRole,
        sentCount: 1,
        receivedCount: 0
      };
    }

    // 2. Tạo danh sách Người gửi (đúng bằng cfg.senderCount, VD: 45 người gửi cho FTC)
    const knownUnitSenders = MOCK_EARLY_100.filter(s => s.dept === cfg.unit);
    for (let s = 0; s < cfg.senderCount; s++) {
      let sName, sEmail;
      if (s < knownUnitSenders.length) {
        sName = knownUnitSenders[s].name;
        sEmail = knownUnitSenders[s].email;
      } else {
        const ln = LAST_NAMES[(uIdx * 2 + s + 4) % LAST_NAMES.length];
        const mn = MID_NAMES[(uIdx * 4 + s + 2) % MID_NAMES.length];
        const fn = FIRST_NAMES[(uIdx * 6 + s + 3) % FIRST_NAMES.length];
        sName = `${ln} ${mn} ${fn}`;
        sEmail = `${removeDiacritics(fn)}${removeDiacritics(ln)[0]}${removeDiacritics(mn)[0]}_${cfg.code}${s + 1}@fpt.com`;
      }
      const h = String(8 + (s % 10)).padStart(2, "0");
      const m = String((s * 7) % 60).padStart(2, "0");
      const sObj = {
        name: sName,
        email: sEmail,
        dept: cfg.unit,
        count: 0,
        latestTimestamp: `${h}:${m} - 20/11/2026`
      };
      sendersList.push(sObj);
      if (!membersMap[sEmail]) {
        membersMap[sEmail] = {
          name: sName,
          email: sEmail,
          dept: cfg.unit,
          role: "CBNV Tiếp Lửa",
          sentCount: 0,
          receivedCount: 0
        };
      }
    }

    // 3. Phân bổ đúng cfg.totalFlames (VD: 64 ngọn lửa cho FTC) giữa sendersList và recipientsList
    for (let f = 0; f < cfg.totalFlames; f++) {
      const sender = sendersList[f % sendersList.length];
      const recipient = recipientsList[f % recipientsList.length];
      sender.count++;
      recipient.count++;
      if (membersMap[sender.email]) membersMap[sender.email].sentCount++;
      if (membersMap[recipient.email]) membersMap[recipient.email].receivedCount++;

      flamesList.push({
        order: f + 1,
        senderName: sender.name,
        senderEmail: sender.email,
        senderDept: sender.dept,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientDept: recipient.dept,
        role: recipient.role,
        timestamp: sender.latestTimestamp
      });
    }

    recipientsList.sort((a, b) => b.count - a.count);
    sendersList.sort((a, b) => b.count - a.count);
    const membersList = Object.values(membersMap).sort((a, b) => (b.receivedCount + b.sentCount) - (a.receivedCount + a.sentCount));

    membersList.forEach(mem => {
      if (!seenEmails.has(mem.email)) {
        seenEmails.add(mem.email);
        hrDirectory.push(mem);
      }
    });

    return {
      unit: cfg.unit,
      totalFlames: cfg.totalFlames,
      senderCount: cfg.senderCount,
      recipientCount: cfg.recipientCount,
      memberCount: membersList.length,
      flamesList,
      sendersList,
      recipientsList,
      membersList
    };
  });

  return { unitSpread, hrDirectory };
}

const BUILT_MOCK_DATA = buildMockUnitSpreadAndHrDirectory();
export const MOCK_UNIT_SPREAD = BUILT_MOCK_DATA.unitSpread;
export const MOCK_HR_DIRECTORY = BUILT_MOCK_DATA.hrDirectory;
