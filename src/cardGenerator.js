/**
 * Module Tạo E-Card Tri Ân Cá Nhân Hóa (High Resolution HTML5 Canvas)
 * Tối ưu tỷ lệ chuẩn 1080 x 1440 px, tự động co giãn nội dung không bao giờ tràn viền
 */

// Preload FPT official logo for E-Card
export const fptLogoImg = new Image();
fptLogoImg.src = '/assets/logoFPT.png';

// Preload Official Key Visual 30 Năm Tiếp Lửa for E-Card
export const keyVisualImg = new Image();
keyVisualImg.src = '/assets/key-visual-card.jpg';

export class CardGenerator {
  /**
   * Vẽ E-Card lên canvas đã truyền vào
   */
  static renderToCanvas(canvas, data, options = {}) {
    const width = options.width || 1080;
    const height = options.height || 1440;
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Tỉ lệ co giãn linh hoạt nếu width khác 1080
    const scale = width / 1080;

    const theme = data.cardStyle || 'kv';
    const recipientName = (data.recipientName || 'Người Thầy / Mentor FTEL').trim();
    const recipientRole = (data.recipientRole || 'Mentor chia sẻ tri thức').trim();
    const senderName = (data.senderName || 'Đồng nghiệp FTEL').trim();
    const senderDept = (data.senderDept || 'FPT Telecom').trim();
    const message = (data.message || 'Cảm ơn Anh/Chị đã luôn là ngọn lửa dẫn lối, kiên nhẫn trao truyền tri thức và đồng hành cùng em!').trim();
    const tag = (data.tag || '30 Tiếp Lửa Bền Bỉ').trim();

    // Font chữ chuẩn hỗ trợ trọn vẹn tiếng Việt có dấu
    const FONT_PRIMARY = '"Plus Jakarta Sans", "Montserrat", "Segoe UI", sans-serif';
    const FONT_TITLE = '"Montserrat", "Plus Jakarta Sans", "Segoe UI", sans-serif';

    // =========================================================================
    // PHONG CÁCH 1: OFFICIAL KEY VISUAL - 30 NĂM TIẾP LỬA (CHÍNH THỨC)
    // =========================================================================
    if (theme === 'kv') {
      const kvLoaded = keyVisualImg.complete && keyVisualImg.naturalWidth > 0;
      if (kvLoaded) {
        ctx.drawImage(keyVisualImg, 0, 0, width, height);
      } else {
        // Fallback màu nền Sapphire sâu thẳm nếu ảnh đang tải
        const bgGrad = ctx.createRadialGradient(
          width / 2, height * 0.45, 100 * scale,
          width / 2, height / 2, width * 0.75
        );
        bgGrad.addColorStop(0, '#0a1d4a');
        bgGrad.addColorStop(1, '#030818');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Khung bảng kính mờ cao cấp lồng ghép trên nền KV (Frosted Royal Glass Plaque)
      const plaqueX = 85 * scale;
      const plaqueY = 525 * scale;
      const plaqueW = width - 170 * scale;
      const plaqueH = 740 * scale;

      ctx.save();
      ctx.fillStyle = 'rgba(5, 15, 42, 0.82)';
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.65)';
      ctx.lineWidth = 2 * scale;
      ctx.shadowColor = 'rgba(243, 112, 33, 0.35)';
      ctx.shadowBlur = 25 * scale;
      roundRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 24 * scale, true, true);

      // Viền trong vàng mảnh
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.lineWidth = 1 * scale;
      roundRect(ctx, plaqueX + 12 * scale, plaqueY + 12 * scale, plaqueW - 24 * scale, plaqueH - 24 * scale, 18 * scale, false, true);

      // Corner Accents vàng kim
      const cornerSize = 25 * scale;
      const corners = [
        { x: plaqueX, y: plaqueY, dx: 1, dy: 1 },
        { x: plaqueX + plaqueW, y: plaqueY, dx: -1, dy: 1 },
        { x: plaqueX, y: plaqueY + plaqueH, dx: 1, dy: -1 },
        { x: plaqueX + plaqueW, y: plaqueY + plaqueH, dx: -1, dy: -1 }
      ];
      corners.forEach(c => {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(c.x + c.dx * cornerSize, c.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(c.x, c.y + c.dy * cornerSize);
        ctx.stroke();
      });
      ctx.restore();

      // Thông tin Người nhận
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.font = `italic 600 ${20 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText('✦ TRÂN TRỌNG GỬI ĐẾN ✦', width / 2, plaqueY + 55 * scale);

      // Tên Người Nhận
      const maxNameWidth = plaqueW - 100 * scale;
      let nameFontSize = 38 * scale;
      ctx.font = `bold ${nameFontSize}px ${FONT_PRIMARY}`;
      while (ctx.measureText(recipientName.toUpperCase()).width > maxNameWidth && nameFontSize > 22 * scale) {
        nameFontSize -= 2 * scale;
        ctx.font = `bold ${nameFontSize}px ${FONT_PRIMARY}`;
      }
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
      ctx.shadowBlur = 15 * scale;
      ctx.fillText(recipientName.toUpperCase(), width / 2, plaqueY + 108 * scale);
      ctx.restore();

      // Vai trò Người nhận
      ctx.fillStyle = '#cbd5e1';
      ctx.font = `500 ${20 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText(recipientRole, width / 2, plaqueY + 145 * scale);

      // Badge Danh Hiệu (Tag Pill)
      const tagText = `✦ ${tag.toUpperCase()} ✦`;
      ctx.font = `bold ${16 * scale}px ${FONT_PRIMARY}`;
      const tagTextWidth = ctx.measureText(tagText).width;
      const pillW = Math.min(tagTextWidth + 40 * scale, plaqueW - 60 * scale);
      const pillH = 32 * scale;
      const pillY = plaqueY + 168 * scale;

      ctx.save();
      ctx.fillStyle = 'rgba(243, 112, 33, 0.22)';
      ctx.strokeStyle = 'rgba(243, 112, 33, 0.65)';
      ctx.lineWidth = 1.2 * scale;
      roundRect(ctx, width / 2 - pillW / 2, pillY, pillW, pillH, 16 * scale, true, true);
      ctx.fillStyle = '#ff9900';
      ctx.fillText(tagText, width / 2, pillY + 22 * scale);
      ctx.restore();

      // Đường phân cách kim cương
      const divY1 = plaqueY + 222 * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 130 * scale, divY1);
      ctx.lineTo(width / 2 + 130 * scale, divY1);
      ctx.stroke();
      ctx.fillStyle = '#ffd700';
      drawDiamond(ctx, width / 2, divY1, 6 * scale);
      ctx.restore();

      // Lời chúc tri ân (Message)
      const maxTextW = plaqueW - 100 * scale;
      let msgFontSize = 23 * scale;
      let lineHeight = 40 * scale;

      if (message.length > 250) {
        msgFontSize = 19 * scale;
        lineHeight = 33 * scale;
      } else if (message.length < 100) {
        msgFontSize = 26 * scale;
        lineHeight = 46 * scale;
      }

      ctx.save();
      ctx.font = `italic 400 ${msgFontSize}px ${FONT_PRIMARY}`;
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';

      let lines = getLines(ctx, `"${message}"`, maxTextW);
      const maxMsgHeight = 280 * scale;
      while (lines.length * lineHeight > maxMsgHeight && msgFontSize > 15 * scale) {
        msgFontSize -= 1.5 * scale;
        lineHeight = msgFontSize * 1.55;
        ctx.font = `italic 400 ${msgFontSize}px ${FONT_PRIMARY}`;
        lines = getLines(ctx, `"${message}"`, maxTextW);
      }

      const totalTextH = lines.length * lineHeight;
      const msgCenterY = plaqueY + 380 * scale;
      const startY = msgCenterY - totalTextH / 2 + lineHeight * 0.72;

      lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight);
      });
      ctx.restore();

      // Đường phân cách người gửi
      const divY2 = plaqueY + 540 * scale;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 100 * scale, divY2);
      ctx.lineTo(width / 2 + 100 * scale, divY2);
      ctx.stroke();
      ctx.restore();

      // Thông tin Người gửi
      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 ${17 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText('Ngọn lửa tri ân được thắp lên bởi', width / 2, plaqueY + 578 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${28 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText(senderName, width / 2, plaqueY + 620 * scale);

      ctx.fillStyle = '#ffd700';
      ctx.font = `600 ${19 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText(senderDept, width / 2, plaqueY + 655 * scale);

      // Chân trang KV
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = `600 ${14 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText('✦ FPT TELECOM • 30 NĂM KHÍ PHÁCH TIÊN PHONG • 20/11/2026 ✦', width / 2, 1395 * scale);

      return;
    }

    // =========================================================================
    // PHONG CÁCH CỔ ĐIỂN: GOLD, FLAME, CYBER
    // =========================================================================

    // 1. Phối màu theo chủ đề
    let bgGradCenter = '#091b3b';
    let bgGradEdge = '#030814';
    let borderColor = '#ffd700';
    let borderSub = 'rgba(255, 215, 0, 0.35)';
    let accentGlow = 'rgba(255, 215, 0, 0.4)';
    let accentColor = '#f59e0b';
    let tagBg = 'rgba(245, 158, 11, 0.15)';
    let tagBorder = 'rgba(245, 158, 11, 0.5)';

    if (theme === 'flame') {
      bgGradCenter = '#290f03';
      bgGradEdge = '#08030b';
      borderColor = '#f37021';
      borderSub = 'rgba(243, 112, 33, 0.35)';
      accentGlow = 'rgba(243, 112, 33, 0.45)';
      accentColor = '#ff8c00';
      tagBg = 'rgba(243, 112, 33, 0.18)';
      tagBorder = 'rgba(243, 112, 33, 0.55)';
    } else if (theme === 'cyber') {
      bgGradCenter = '#00264d';
      bgGradEdge = '#020914';
      borderColor = '#00f0ff';
      borderSub = 'rgba(0, 240, 255, 0.35)';
      accentGlow = 'rgba(0, 240, 255, 0.4)';
      accentColor = '#00a3e0';
      tagBg = 'rgba(0, 240, 255, 0.15)';
      tagBorder = 'rgba(0, 240, 255, 0.5)';
    }

    // 2. Nền Radial Gradient lung linh
    const bgGrad = ctx.createRadialGradient(
      width / 2, height * 0.45, 100 * scale,
      width / 2, height / 2, width * 0.75
    );
    bgGrad.addColorStop(0, bgGradCenter);
    bgGrad.addColorStop(1, bgGradEdge);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Khung viền đôi sang trọng (Double Ornamental Border)
    const marginOuter = 50 * scale;
    const marginInner = 68 * scale;
    const boxW = width - marginOuter * 2;
    const boxH = height - marginOuter * 2;
    const innerW = width - marginInner * 2;
    const innerH = height - marginInner * 2;

    ctx.save();
    // Viền chính
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeRect(marginOuter, marginOuter, boxW, boxH);

    // Viền phụ mỏng phía trong
    ctx.strokeStyle = borderSub;
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(marginInner, marginInner, innerW, innerH);

    // Họa tiết góc Art-Deco sang trọng (Corner Accents)
    const cornerSize = 35 * scale;
    const corners = [
      { x: marginOuter, y: marginOuter, dx: 1, dy: 1 },
      { x: marginOuter + boxW, y: marginOuter, dx: -1, dy: 1 },
      { x: marginOuter, y: marginOuter + boxH, dx: 1, dy: -1 },
      { x: marginOuter + boxW, y: marginOuter + boxH, dx: -1, dy: -1 }
    ];

    corners.forEach(c => {
      // Góc chữ L gia cố
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * cornerSize, c.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x, c.y + c.dy * cornerSize);
      ctx.stroke();

      // Nốt chấm vàng góc
      ctx.fillStyle = borderColor;
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 8 * scale, c.y + c.dy * 8 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // Các hạt sáng lung linh tinh tế trên nền
    for (let i = 0; i < 35; i++) {
      const px = marginInner + Math.random() * innerW;
      const py = marginInner + Math.random() * innerH;
      const pr = (1 + Math.random() * 2) * scale;
      ctx.fillStyle = borderColor;
      ctx.globalAlpha = 0.15 + Math.random() * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // ==========================================
    // 4. HEADER & BRANDING (Logo FPT & FTC)
    // ==========================================
    ctx.textAlign = 'center';

    const logoLoaded = fptLogoImg.complete && fptLogoImg.naturalWidth > 0;
    if (logoLoaded) {
      const logoH = 46 * scale;
      const logoW = (fptLogoImg.naturalWidth / fptLogoImg.naturalHeight) * logoH;
      ctx.drawImage(fptLogoImg, width / 2 - logoW / 2, 85 * scale, logoW, logoH);

      ctx.save();
      ctx.fillStyle = borderColor;
      ctx.font = `bold ${16 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText('TRUNG TÂM ĐÀO TẠO FTEL (FTC)', width / 2, 148 * scale);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = borderColor;
      ctx.font = `bold ${20 * scale}px ${FONT_PRIMARY}`;
      ctx.fillText('✦ FPT TELECOM • FTC ✦', width / 2, 125 * scale);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `600 ${16 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText('CHÀO MỪNG NGÀY NHÀ GIÁO VIỆT NAM 20/11/2026', width / 2, 178 * scale);

    // Tiêu đề chính: THẮP LỬA TRI ÂN
    ctx.save();
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 20 * scale;
    
    // Gradient cho chữ
    const titleGrad = ctx.createLinearGradient(width / 2 - 250 * scale, 0, width / 2 + 250 * scale, 0);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.5, '#fff4cc');
    titleGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = titleGrad;
    ctx.font = `800 ${48 * scale}px ${FONT_TITLE}`;
    ctx.fillText('THẮP LỬA TRI ÂN', width / 2, 230 * scale);
    ctx.restore();

    // Tiêu đề phụ: THẮP SÁNG TRI THỨC
    ctx.fillStyle = borderColor;
    ctx.font = `700 ${23 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText('THẮP SÁNG TRI THỨC', width / 2, 275 * scale);

    // Đường gạch ngang phân cách có nốt kim cương
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 150 * scale, 305 * scale);
    ctx.lineTo(width / 2 + 150 * scale, 305 * scale);
    ctx.stroke();

    // Diamond nốt giữa
    ctx.fillStyle = borderColor;
    drawDiamond(ctx, width / 2, 305 * scale, 7 * scale);
    ctx.restore();

    // ==========================================
    // 5. RECIPIENT SECTION (NGƯỜI NHẬN)
    // Tự động căn chỉnh font size đảm bảo KHÔNG BAO GIỜ TRÀN VIỀN
    // ==========================================
    ctx.fillStyle = '#94a3b8';
    ctx.font = `italic 500 ${20 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText('Trân trọng gửi đến', width / 2, 355 * scale);

    // Tự động thu nhỏ font Tên Người Nhận nếu quá dài
    const maxNameWidth = innerW - 80 * scale;
    let nameFontSize = 38 * scale;
    ctx.font = `bold ${nameFontSize}px ${FONT_PRIMARY}`;
    while (ctx.measureText(recipientName.toUpperCase()).width > maxNameWidth && nameFontSize > 20 * scale) {
      nameFontSize -= 2 * scale;
      ctx.font = `bold ${nameFontSize}px ${FONT_PRIMARY}`;
    }

    ctx.save();
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = 12 * scale;
    ctx.fillStyle = borderColor;
    ctx.fillText(recipientName.toUpperCase(), width / 2, 405 * scale);
    ctx.restore();

    // Vai trò người nhận
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `500 ${20 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText(recipientRole, width / 2, 445 * scale);

    // Badge Danh Hiệu (Tag Pill)
    const tagText = `✦ ${tag.toUpperCase()} ✦`;
    ctx.font = `bold ${17 * scale}px ${FONT_PRIMARY}`;
    const tagTextWidth = ctx.measureText(tagText).width;
    const pillW = Math.min(tagTextWidth + 44 * scale, innerW - 60 * scale);
    const pillH = 34 * scale;
    const pillY = 470 * scale;

    ctx.save();
    ctx.fillStyle = tagBg;
    ctx.strokeStyle = tagBorder;
    ctx.lineWidth = 1.2 * scale;
    roundRect(ctx, width / 2 - pillW / 2, pillY, pillW, pillH, 17 * scale, true, true);
    ctx.fillStyle = borderColor;
    ctx.fillText(tagText, width / 2, pillY + 23 * scale);
    ctx.restore();

    // ==========================================
    // 6. MESSAGE BOX (HỘP LỜI CHÚC)
    // Co giãn thông minh để chữ luôn nằm gọn gàng bên trong
    // ==========================================
    const msgBoxX = marginInner + 30 * scale;
    const msgBoxY = 535 * scale;
    const msgBoxW = innerW - 60 * scale;
    const msgBoxH = 540 * scale;

    ctx.save();
    // Nền hộp kính mờ (Frosted glass panel)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1 * scale;
    roundRect(ctx, msgBoxX, msgBoxY, msgBoxW, msgBoxH, 20 * scale, true, true);

    // Dấu ngoặc kép trang trí mờ lớn ở góc
    ctx.fillStyle = borderColor;
    ctx.globalAlpha = 0.18;
    ctx.font = `bold ${90 * scale}px ${FONT_TITLE}`;
    ctx.fillText('“', msgBoxX + 45 * scale, msgBoxY + 85 * scale);
    ctx.restore();

    // Tính toán số dòng và font size phù hợp cho lời chúc
    const maxTextW = msgBoxW - 80 * scale;
    let msgFontSize = 24 * scale;
    let lineHeight = 42 * scale;

    if (message.length > 250) {
      msgFontSize = 20 * scale;
      lineHeight = 35 * scale;
    } else if (message.length < 100) {
      msgFontSize = 28 * scale;
      lineHeight = 48 * scale;
    }

    ctx.save();
    ctx.font = `italic 400 ${msgFontSize}px ${FONT_PRIMARY}`;
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';

    let lines = getLines(ctx, `"${message}"`, maxTextW);

    // Nếu quá nhiều dòng (tràn hộp), giảm tiếp cỡ chữ
    const maxAllowedHeight = msgBoxH - 80 * scale;
    while (lines.length * lineHeight > maxAllowedHeight && msgFontSize > 16 * scale) {
      msgFontSize -= 2 * scale;
      lineHeight = msgFontSize * 1.6;
      ctx.font = `italic 400 ${msgFontSize}px ${FONT_PRIMARY}`;
      lines = getLines(ctx, `"${message}"`, maxTextW);
    }

    // Căn giữa theo chiều dọc trong Message Box
    const totalTextH = lines.length * lineHeight;
    const startY = msgBoxY + (msgBoxH - totalTextH) / 2 + lineHeight * 0.72;

    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, startY + index * lineHeight);
    });
    ctx.restore();

    // ==========================================
    // 7. SENDER SECTION (NGƯỜI GỬI)
    // ==========================================
    const senderDividerY = 1120 * scale;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 120 * scale, senderDividerY);
    ctx.lineTo(width / 2 + 120 * scale, senderDividerY);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${18 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText('Ngọn lửa tri ân được thắp lên bởi', width / 2, 1160 * scale);

    // Tên người gửi
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${30 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText(senderName, width / 2, 1205 * scale);

    // Phòng ban người gửi
    ctx.fillStyle = borderColor;
    ctx.font = `600 ${20 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText(senderDept, width / 2, 1240 * scale);

    // ==========================================
    // 8. FOOTER SEAL
    // ==========================================
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = `600 ${14 * scale}px ${FONT_PRIMARY}`;
    ctx.fillText('✦ FPT TELECOM • 20/11/2026 • TRI ÂN NGƯỜI TRAO TRI THỨC ✦', width / 2, 1330 * scale);
  }

  /**
   * Sinh ảnh Base64 Data URL chuẩn 1080x1440
   */
  static getCardDataUrl(data, options = {}) {
    const canvas = document.createElement('canvas');
    this.renderToCanvas(canvas, data, options);
    return canvas.toDataURL('image/png', 0.95);
  }

  /**
   * Tải ảnh E-Card trực tiếp về máy người dùng
   */
  static downloadCard(data, filename) {
    const dataUrl = this.getCardDataUrl(data, { width: 1080, height: 1440 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename || `Ecard_FTEL_20_11_${(data.recipientName || 'TriAn').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Helper ngắt dòng tiếng Việt chuẩn xác
 */
function getLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Helper vẽ hình chữ nhật bo tròn góc
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === 'undefined') radius = 5;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Helper vẽ nốt kim cương trang trí
 */
function drawDiamond(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
}
