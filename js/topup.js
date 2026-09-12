/* ============================================================
   topup.js — เติมพ้อยด้วยโค้ด และ เติมเงินผ่าน QR Code + สลิป
   เมื่อส่งคำขอแล้ว แอดมินจะอนุมัติในหลังบ้าน พ้อยจะเข้าทันที
   ============================================================ */

function initTopupPage() {
  renderHeader("topup");
  const user = getCurrentUser();
  if (!user) {
    toast("กรุณาเข้าสู่ระบบก่อนใช้หน้าเติมเงิน", "err");
    const box = document.querySelector(".container.section");
    if (box) {
      box.innerHTML = `
        <div class="card" style="max-width:420px;margin:0 auto;text-align:center">
          <div class="big">🔒</div>
          <h3>กรุณาเข้าสู่ระบบ</h3>
          <p class="text-dim">ต้องเข้าสู่ระบบก่อนเพื่อดูพ้อยและส่งคำขอเติมเงิน</p>
          <a class="btn btn-primary btn-block" href="login.html">เข้าสู่ระบบ</a>
        </div>`;
    }
    setTimeout(() => (window.location.href = "login.html"), 1800);
    return;
  }

  renderPointsBadge(user);
  renderQrForm(user);
  renderTopupHistory();

  document.getElementById("redeem-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const codeInput = document.getElementById("redeem-code");
    const result = redeemTopupCode(codeInput.value);
    const mount = document.getElementById("redeem-msg");

    if (!result.ok) {
      mount.innerHTML = `<div class="error-box">${escapeHtml(result.error)}</div>`;
      return;
    }
    mount.innerHTML = `<div class="ok-box">แลกโค้ดสำเร็จ! ได้รับ ${result.points.toLocaleString()} พ้อย</div>`;
    codeInput.value = "";
    renderHeader("topup");
    renderPointsBadge(getCurrentUser());
  });
}

function renderPointsBadge(user) {
  const el = document.getElementById("current-points");
  if (el) el.textContent = user.points.toLocaleString();
}

function redeemTopupCode(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "กรุณากรอกโค้ด" };

  const db = getDB();
  const user = getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };

  const entry = db.topupCodes.find((c) => c.code.toUpperCase() === code);
  if (!entry) return { ok: false, error: "ไม่พบโค้ดนี้ในระบบ" };
  if (entry.used) return { ok: false, error: "โค้ดนี้ถูกใช้ไปแล้ว" };

  entry.used = true;
  entry.usedBy = user.username;

  const dbUser = db.users.find((u) => u.id === user.id);
  dbUser.points += entry.points;

  saveDB(db);
  return { ok: true, points: entry.points };
}

/* ============================================================
   เติมเงินผ่าน QR Code (PromptPay)
   ============================================================ */

/* -------- EMVCo TLV helper -------- */
function tlv(tag, value) {
  const v = String(value);
  const len = v.length.toString().padStart(2, "0");
  return `${tag}${len}${v}`;
}

/* -------- CRC16-CCITT (0x1021, init 0xFFFF) -------- */
function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/* -------- สร้าง Payload PromptPay (EMVCo) -------- */
function buildPromptPayPayload(qr, amount) {
  const merchantId = String(qr.account || "").replace(/[^0-9]/g, "");
  let fullId = merchantId;
  if (merchantId.length === 10 && merchantId.startsWith("0")) {
    fullId = "66" + merchantId.slice(1);
  }
  const merchantInfo = tlv("00", "A000000677010111") + tlv("01", fullId);
  const merchantName = (qr.holder || "SHOP").slice(0, 25);
  const city = (qr.city || "Bangkok").slice(0, 15);

  let payload = tlv("00", "01") + tlv("01", "11") + tlv("29", merchantInfo);

  if (amount > 0) {
    payload += tlv("53", "764") + tlv("54", Number(amount).toFixed(2));
  }
  payload += tlv("58", "TH") + tlv("59", merchantName) + tlv("60", city);
  payload += tlv("63", crc16(payload));
  return payload;
}

function renderQrForm(user) {
  const db = getDB();
  const qr = (db.settings && db.settings.qr) || { active: true, type: "promptpay", account: "", holder: "LOVE SIXHUB", bank: "PromptPay" };

  const img = document.getElementById("qr-img");
  const meta = document.getElementById("qr-meta");

  if (!qr.active || (!qr.account && !qr.qrImage)) {
    img.style.display = "none";
    meta.innerHTML = `<p class="text-faint">ยังไม่ได้ตั้งค่าบัญชีรับเงินในระบบ (ไปตั้งที่หลังบ้านแอดมิน)</p>`;
    return;
  }

  const amountInput = document.getElementById("qr-amount");
  const slipInput = document.getElementById("qr-slip");

  meta.innerHTML = `
    <div class="qr-acc" id="qr-acc-text">${escapeHtml(qr.bank || "PromptPay")}</div>
    <div class="qr-acc" style="font-size:18px"><b>${escapeHtml(qr.account || "")}</b></div>
    <div class="qr-acc" style="font-size:12.5px">${escapeHtml(qr.holder)}</div>`;

  if (qr.qrImage) {
    img.src = qr.qrImage;
  } else {
    function refreshQr() {
      const amount = Math.max(0, parseInt(amountInput.value, 10) || 0);
      const payload = buildPromptPayPayload(qr, amount);
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&data=${encodeURIComponent(payload)}`;
    }
    amountInput.addEventListener("input", refreshQr);
    refreshQr();
  }

  slipInput.addEventListener("change", () => {
    const file = slipInput.files && slipInput.files[0];
    const preview = document.getElementById("slip-preview");
    updateSlipFileName(slipInput);
    if (!file) {
      preview.innerHTML = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="slip-mini">
          <img src="${e.target.result}" alt="สลิป" />
        </div>`;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("qr-submit").addEventListener("click", () => {
    submitQrTopup(user, qr);
  });
}

function updateSlipFileName(input) {
  const file = input.files && input.files[0];
  const nameEl = document.getElementById("slip-file-name");
  const btn = document.getElementById("slip-btn");
  if (!nameEl) return;
  if (file) {
    nameEl.textContent = `เลือกแล้ว: ${file.name}`;
    btn && btn.classList.add("has-file");
  } else {
    nameEl.textContent = "";
    btn && btn.classList.remove("has-file");
  }
}

function showTopupModal(icon, title, msg) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-icon">${icon}</div>
      <h3>${title}</h3>
      <p class="text-dim" style="font-size:14px;line-height:1.6">${msg}</p>
      <button class="btn btn-primary btn-block modal-ok">ตกลง</button>
    </div>`;
  overlay.querySelector(".modal-ok").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

/* -------- บีบอัดรูปสลิปให้เล็กลงก่อนเก็บ -------- */
function compressSlip(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgEl = new Image();
      imgEl.onload = () => {
        let { width, height } = imgEl;
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgEl, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      imgEl.onerror = reject;
      imgEl.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function submitQrTopup(user) {
  const db = getDB();
  const qr = db.settings.qr || {};
  if (!qr.active || (!qr.account && !qr.qrImage)) {
    toast("ยังไม่เปิดระบบเติมเงินผ่าน QR", "err");
    return;
  }

  const amount = parseInt(document.getElementById("qr-amount").value, 10);
  const note = document.getElementById("qr-note").value.trim();
  const slipInput = document.getElementById("qr-slip");
  const msg = document.getElementById("qr-msg");

  if (!amount || amount <= 0) {
    msg.innerHTML = `<div class="error-box">กรุณากรอกจำนวนเงิน</div>`;
    return;
  }
  if (!slipInput.files || !slipInput.files[0]) {
    msg.innerHTML = `<div class="error-box">กรุณาแนบสลิปโอนเงิน</div>`;
    return;
  }

  compressSlip(slipInput.files[0])
    .then((slip) => {
      const dbUser = db.users.find((u) => u.id === user.id);
      db.topupRequests.push({
        id: uid("tp"),
        userId: dbUser.id,
        username: dbUser.username,
        amount,
        note,
        slip,
        status: "pending",
        date: nowStr(),
        approvedPoints: null,
      });
      saveDB(db).then(() => {
        msg.innerHTML = `<div class="ok-box">ส่งคำขอเติมเงินแล้ว! กำลังเติมเงิน กรุณารอเงินเข้าระบบ แอดมินจะตรวจสอบสลิปแล้วพ้อยจะเข้าทันที</div>`;
        slipInput.value = "";
        updateSlipFileName(slipInput);
        document.getElementById("slip-preview").innerHTML = "";
        document.getElementById("qr-note").value = "";
        renderTopupHistory();
        showTopupModal(
          "⏳",
          "กำลังเติมเงิน...",
          "ได้รับคำขอของคุณแล้ว<br/>กรุณารอเงินเข้าระบบ<br/>แอดมินจะตรวจสอบสลิปและเติมพ้อยให้ทันที"
        );
      });
    })
    .catch(() => {
      msg.innerHTML = `<div class="error-box">อ่านไฟล์สลิปไม่สำเร็จ ลองเปลี่ยนไฟล์อีกครั้ง</div>`;
    });
}

function renderTopupHistory() {
  const db = getDB();
  const user = getCurrentUser();
  const mount = document.getElementById("topup-history");
  if (!mount) return;
  if (!user) {
    mount.innerHTML = `<p class="text-faint">กรุณาเข้าสู่ระบบก่อน</p>`;
    return;
  }

  const rows = db.topupRequests
    .filter((r) => r.userId === user.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  mount.innerHTML =
    rows
      .map((r) => {
        const statusHtml =
          r.status === "approved"
            ? `<span class="tag tag-ok">อนุมัติแล้ว +${r.approvedPoints.toLocaleString()} พ้อย</span>`
            : r.status === "rejected"
            ? `<span class="tag tag-banned">ถูกปฏิเสธ</span>`
            : `<span class="tag tag-customer">รอตรวจสอบ</span>`;
        return `
        <div class="list-row">
          <div>
            <div>${r.amount.toLocaleString()} บาท</div>
            <div class="text-faint" style="font-size:12.5px">${escapeHtml(r.date)}</div>
          </div>
          ${statusHtml}
        </div>`;
      })
      .join("") || `<p class="text-faint">ยังไม่มีการเติมเงินผ่าน QR</p>`;
}