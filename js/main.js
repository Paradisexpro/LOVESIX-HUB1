/* ============================================================
   main.js — ส่วนหัวเว็บ (navbar) ที่ใช้ร่วมกันทุกหน้า
   ============================================================ */

function renderHeader(activePage) {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  const db = getDB();
  const user = getCurrentUser();

  const links = [
    { href: "index.html", label: "ร้านค้า", key: "shop" },
    { href: "topup.html", label: "เติมพ้อย", key: "topup" },
    { href: "profile.html", label: "โปรไฟล์", key: "profile" },
  ];

  const linksHtml = links
    .map(
      (l) =>
        `<a class="nav-link ${activePage === l.key ? "active" : ""}" href="${l.href}">${l.label}</a>`
    )
    .join("");

  const rightHtml = user
    ? `
      <div class="nav-points" title="แต้มคงเหลือ">
        <span class="dot"></span> ${user.points.toLocaleString()} พ้อย
      </div>
      <span class="nav-username">${escapeHtml(user.username)}</span>
      ${user.role === "admin" ? `<a class="btn btn-ghost btn-sm" href="admin.html">หลังบ้าน</a>` : ""}
      <button class="btn btn-outline btn-sm" onclick="handleLogout()">ออกจากระบบ</button>
    `
    : `
      <a class="btn btn-ghost btn-sm" href="login.html">เข้าสู่ระบบ</a>
      <a class="btn btn-primary btn-sm" href="register.html">สมัครสมาชิก</a>
    `;

  mount.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="brand">
        <span class="brand-mark">◆</span> ${escapeHtml(db.settings.siteName)}
      </a>
      <nav class="nav-links">${linksHtml}</nav>
      <div class="nav-right">${rightHtml}</div>
    </div>
  `;
}

function handleLogout() {
  logoutUser();
  window.location.href = "index.html";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function toast(message, type = "ok") {
  let box = document.getElementById("toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function formatDate(d) {
  return d;
}
