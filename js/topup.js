/* ============================================================
   topup.js — เติมพ้อยด้วยโค้ด (โค้ดสร้างโดยแอดมิน)
   ============================================================ */

function initTopupPage() {
  renderHeader("topup");
  const user = requireLogin();
  if (!user) return;

  renderPointsBadge(user);

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
