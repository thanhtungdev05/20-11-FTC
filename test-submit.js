const testData = {
  action: "submit_gratitude",
  senderName: "Lê Quỳnh Quyên",
  senderEmail: "quyenlq@fpt.net",
  senderDept: "Trung tâm Đào tạo FTEL",
  recipientName: "Nguyễn Văn Hùng",
  recipientEmail: "hungnv@fpt.net",
  recipientRole: "Giảng viên Nội bộ FTEL",
  tag: "30 Tiếp Lửa Bền Bỉ",
  message: "Em cảm ơn Anh/Chị đã luôn kiên nhẫn chỉ bảo em từng bước từ những ngày đầu bỡ ngỡ!",
  cardStyle: "gold"
};

async function run() {
  const url = "https://script.google.com/macros/s/AKfycbzTaNILtS0VPz6Nwnuu3fIoqBotXj6mEJGkP5hO61ktAz64Yngz1fXllq8C5YgPeXWT/exec";
  console.log("Sending test request to:", url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(testData)
    });
    console.log("Status:", res.status);
    console.log("Redirected:", res.redirected, res.url);
    const text = await res.text();
    console.log("Response text (first 300 chars):", text.slice(0, 300));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
