/* ============================================================
   profile.js — โปรไฟล์ผู้ใช้: ข้อมูลบัญชี ประวัติการซื้อ เปลี่ยนรหัสผ่าน
   ============================================================ */

function initProfilePage() {
  renderHeader("profile");
  const user = requireLogin();
  if (!user) return;

  renderProfileInfo(user);
  renderOrderHistory(user);

  document.getElementById("change-pass-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const oldPass = document.getElementById("old-pass").value;
    const newPass = document.getElementById("new-pass").value;
    const confirmPass = document.getElementById("confirm-pass").value;
    const mount = document.getElementById("pass-msg");

    const db = getDB();
    const dbUser = db.users.find((u) => u.id === user.id);

    if (dbUser.password !== simpleHash(oldPass)) {
      mount.innerHTML = `<div class="error-box">รหัสผ่านเดิมไม่ถูกต้อง</div>`;
      return;
    }
    if (newPass.length < 6) {
      mount.innerHTML = `<div class="error-box">รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร</div>`;
      return;
    }
    if (newPass !== confirmPass) {
      mount.innerHTML = `<div class="error-box">รหัสผ่านใหม่ไม่ตรงกัน</div>`;
      return;
    }

    dbUser.password = simpleHash(newPass);
    saveDB(db);
    mount.innerHTML = `<div class="ok-box">เปลี่ยนรหัสผ่านสำเร็จ</div>`;
    e.target.reset();
  });
}

function renderProfileInfo(user) {
  const mount = document.getElementById("profile-info");
  mount.innerHTML = `
    <div class="flex-between">
      <div>
        <div class="text-faint">ชื่อผู้ใช้</div>
        <h3 class="mb-0">${escapeHtml(user.username)}</h3>
      </div>
      <span class="tag ${user.role === "admin" ? "tag-admin" : "tag-customer"}">
        ${user.role === "admin" ? "แอดมิน" : "ลูกค้า"}
      </span>
    </div>
    <hr class="line" />
    <div class="flex-between">
      <span class="text-dim">พ้อยคงเหลือ</span>
      <span class="ticket-price" style="font-size:20px">${user.points.toLocaleString()} <small>พ้อย</small></span>
    </div>
    <div class="flex-between mt-8">
      <span class="text-dim">สมัครสมาชิกเมื่อ</span>
      <span class="text-dim">${escapeHtml(user.createdAt)}</span>
    </div>
    <a href="topup.html" class="btn btn-primary btn-block mt-16">เติมพ้อยเพิ่ม</a>
  `;
}

function renderOrderHistory(user) {
  const db = getDB();
  const mount = document.getElementById("order-history");
  const myOrders = db.orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (myOrders.length === 0) {
    mount.innerHTML = `
      <div class="empty-state">
        <div class="big">🧾</div>
        <p>ยังไม่มีประวัติการซื้อ</p>
        <a class="btn btn-ghost" href="index.html">ไปเลือกซื้อสินค้า</a>
      </div>`;
    return;
  }

  mount.innerHTML = `
    <table>
      <thead>
        <tr><th>สินค้า</th><th>ราคา</th><th>รหัสที่ได้รับ</th><th>วันที่</th></tr>
      </thead>
      <tbody>
        ${myOrders
          .map(
            (o) => `
          <tr>
            <td>${escapeHtml(o.productName)}</td>
            <td>${o.price.toLocaleString()} พ้อย</td>
            <td style="user-select:all">${escapeHtml(o.code)}</td>
            <td class="text-faint">${escapeHtml(o.date)}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}
