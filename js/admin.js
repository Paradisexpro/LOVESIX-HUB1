/* ============================================================
   admin.js — หลังบ้านแอดมิน
   ปลดล็อกด้วย "รหัสแอดมิน" (แยกจากรหัสผ่านล็อกอิน) ก่อนถึงจะเห็นเมนู
   ============================================================ */

let currentTab = "overview";
let editingProductId = null;

function initAdminPage() {
  renderHeader("");

  if (isAdminUnlocked()) {
    showAdminDashboard();
  } else {
    showAdminGate();
  }
}

/* -------- ด่านกรอกรหัสแอดมิน -------- */
function showAdminGate() {
  document.getElementById("gate-view").style.display = "block";
  document.getElementById("dashboard-view").style.display = "none";

  const form = document.getElementById("admin-code-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("admin-code-input").value.trim();
    const db = getDB();
    const mount = document.getElementById("gate-msg");

    if (input === db.settings.adminCode) {
      setAdminUnlocked(true);
      showAdminDashboard();
    } else {
      mount.innerHTML = `<div class="error-box">รหัสแอดมินไม่ถูกต้อง</div>`;
    }
  });
}

function lockAdmin() {
  setAdminUnlocked(false);
  currentTab = "overview";
  showAdminGate();
  document.getElementById("admin-code-input").value = "";
}

/* -------- แดชบอร์ดหลัก -------- */
function showAdminDashboard() {
  document.getElementById("gate-view").style.display = "none";
  document.getElementById("dashboard-view").style.display = "block";
  switchTab("overview");
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".admin-side button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".admin-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tab}`);
  });

  const renderers = {
    overview: renderOverview,
    products: renderProductsTab,
    categories: renderCategoriesTab,
    topupcodes: renderTopupCodesTab,
    customers: renderCustomersTab,
    orders: renderOrdersTab,
    settings: renderSettingsTab,
  };
  renderers[tab] && renderers[tab]();
}

/* ============================================================
   ภาพรวม
   ============================================================ */
function renderOverview() {
  const db = getDB();
  const mount = document.getElementById("panel-overview");
  const totalRevenue = db.orders.reduce((a, o) => a + o.price, 0);
  const stockLeft = db.products.reduce(
    (a, p) => a + p.stock.filter((s) => !s.sold).length,
    0
  );

  mount.innerHTML = `
    <h3>ภาพรวมระบบ</h3>
    <div class="grid-2">
      <div class="card"><span class="text-faint">สมาชิกทั้งหมด</span><h2>${db.users.length}</h2></div>
      <div class="card"><span class="text-faint">สินค้าทั้งหมด</span><h2>${db.products.length}</h2></div>
      <div class="card"><span class="text-faint">ออเดอร์ที่ขายได้</span><h2>${db.orders.length}</h2></div>
      <div class="card"><span class="text-faint">พ้อยที่ใช้จ่ายรวม</span><h2>${totalRevenue.toLocaleString()}</h2></div>
      <div class="card"><span class="text-faint">บัญชีคงเหลือในสต๊อก</span><h2>${stockLeft}</h2></div>
      <div class="card"><span class="text-faint">โค้ดเติมพ้อยที่ยังไม่ใช้</span><h2>${db.topupCodes.filter((c) => !c.used).length}</h2></div>
    </div>
  `;
}

/* ============================================================
   สินค้า + สต๊อกรหัส
   ============================================================ */
function renderProductsTab() {
  const db = getDB();
  const mount = document.getElementById("panel-products");

  mount.innerHTML = `
    <div class="flex-between">
      <h3 class="mb-0">จัดการสินค้า</h3>
      <button class="btn btn-primary btn-sm" onclick="openProductForm()">+ เพิ่มสินค้าใหม่</button>
    </div>

    <div id="product-form-mount" class="mt-16"></div>

    <div class="card mt-16">
      <table>
        <thead>
          <tr><th>สินค้า</th><th>หมวดหมู่</th><th>ราคา</th><th>สต๊อกคงเหลือ</th><th>ขายแล้ว</th><th></th></tr>
        </thead>
        <tbody>
          ${db.products
            .map((p) => {
              const cat = db.categories.find((c) => c.id === p.categoryId);
              const left = p.stock.filter((s) => !s.sold).length;
              return `
              <tr>
                <td>${p.image} ${escapeHtml(p.name)}</td>
                <td>${cat ? escapeHtml(cat.name) : "-"}</td>
                <td>${p.price.toLocaleString()}</td>
                <td>${left}</td>
                <td>${p.soldCount || 0}</td>
                <td class="flex-row">
                  <button class="btn btn-ghost btn-sm" onclick="openProductForm('${p.id}')">แก้ไข</button>
                  <button class="btn btn-outline btn-sm" onclick="openStockManager('${p.id}')">สต๊อกรหัส</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">ลบ</button>
                </td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <div id="stock-manager-mount" class="mt-16"></div>
  `;
}

function openProductForm(productId) {
  editingProductId = productId || null;
  const db = getDB();
  const product = productId ? db.products.find((p) => p.id === productId) : null;
  const mount = document.getElementById("product-form-mount");

  mount.innerHTML = `
    <div class="card">
      <h4>${product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h4>
      <form id="product-form">
        <div class="grid-2">
          <div class="form-group">
            <label>ชื่อสินค้า</label>
            <input type="text" id="pf-name" value="${product ? escapeHtml(product.name) : ""}" required />
          </div>
          <div class="form-group">
            <label>ไอคอน (emoji)</label>
            <input type="text" id="pf-icon" value="${product ? product.image : "🎮"}" required />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select id="pf-category">
              ${db.categories
                .map(
                  (c) =>
                    `<option value="${c.id}" ${product && product.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="form-group">
            <label>ราคา (พ้อย)</label>
            <input type="number" id="pf-price" min="1" value="${product ? product.price : 100}" required />
          </div>
        </div>
        <div class="form-group">
          <label>รายละเอียดสินค้า</label>
          <textarea id="pf-desc" required>${product ? escapeHtml(product.desc) : ""}</textarea>
        </div>
        <div class="flex-row">
          <button type="submit" class="btn btn-primary">${product ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}</button>
          <button type="button" class="btn btn-ghost" onclick="closeProductForm()">ยกเลิก</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("product-form").addEventListener("submit", (e) => {
    e.preventDefault();
    saveProductForm();
  });
}

function closeProductForm() {
  editingProductId = null;
  document.getElementById("product-form-mount").innerHTML = "";
}

function saveProductForm() {
  const db = getDB();
  const name = document.getElementById("pf-name").value.trim();
  const icon = document.getElementById("pf-icon").value.trim() || "🎮";
  const categoryId = document.getElementById("pf-category").value;
  const price = parseInt(document.getElementById("pf-price").value, 10);
  const desc = document.getElementById("pf-desc").value.trim();

  if (!name || !price || price <= 0) {
    toast("กรุณากรอกข้อมูลให้ครบและราคาต้องมากกว่า 0", "err");
    return;
  }

  if (editingProductId) {
    const p = db.products.find((x) => x.id === editingProductId);
    Object.assign(p, { name, image: icon, categoryId, price, desc });
    toast("แก้ไขสินค้าสำเร็จ", "ok");
  } else {
    db.products.push({
      id: uid("p"),
      name,
      image: icon,
      categoryId,
      price,
      desc,
      stock: [],
      soldCount: 0,
    });
    toast("เพิ่มสินค้าสำเร็จ", "ok");
  }

  saveDB(db);
  closeProductForm();
  renderProductsTab();
}

function deleteProduct(productId) {
  if (!confirm("ยืนยันการลบสินค้านี้? รหัสในสต๊อกที่ยังไม่ขายจะถูกลบไปด้วย")) return;
  const db = getDB();
  db.products = db.products.filter((p) => p.id !== productId);
  saveDB(db);
  toast("ลบสินค้าแล้ว", "ok");
  renderProductsTab();
  document.getElementById("stock-manager-mount").innerHTML = "";
}

function openStockManager(productId) {
  const db = getDB();
  const product = db.products.find((p) => p.id === productId);
  const mount = document.getElementById("stock-manager-mount");

  mount.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h4 class="mb-0">สต๊อกรหัสของ: ${escapeHtml(product.name)}</h4>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('stock-manager-mount').innerHTML=''">ปิด</button>
      </div>
      <p class="text-faint">เพิ่มรหัสบัญชีทีละหลายชุดได้ โดยพิมพ์หนึ่งรหัสต่อหนึ่งบรรทัด</p>
      <div class="form-group">
        <textarea id="new-stock-codes" placeholder="เช่น
FF-ACC-9001 | pass: Ab12$Cd
FF-ACC-9002 | pass: Ef34%Gh"></textarea>
      </div>
      <button class="btn btn-primary btn-sm" onclick="addStockCodes('${productId}')">เพิ่มรหัสเข้าสต๊อก</button>

      <hr class="line" />
      <table>
        <thead><tr><th>รหัส</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          ${product.stock
            .map(
              (s, i) => `
            <tr>
              <td>${escapeHtml(s.code)}</td>
              <td><span class="tag ${s.sold ? "tag-banned" : "tag-ok"}">${s.sold ? "ขายแล้ว" : "พร้อมขาย"}</span></td>
              <td>
                ${!s.sold ? `<button class="btn btn-danger btn-sm" onclick="removeStockCode('${productId}', ${i})">ลบ</button>` : ""}
              </td>
            </tr>`
            )
            .join("") || `<tr><td colspan="3" class="text-faint">ยังไม่มีรหัสในสต๊อก</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function addStockCodes(productId) {
  const textarea = document.getElementById("new-stock-codes");
  const lines = textarea.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    toast("กรุณากรอกรหัสอย่างน้อย 1 รายการ", "err");
    return;
  }

  const db = getDB();
  const product = db.products.find((p) => p.id === productId);
  lines.forEach((code) => product.stock.push({ code, sold: false }));
  saveDB(db);

  toast(`เพิ่มรหัสเข้าสต๊อก ${lines.length} รายการ`, "ok");
  openStockManager(productId);
  renderProductsTab();
}

function removeStockCode(productId, index) {
  const db = getDB();
  const product = db.products.find((p) => p.id === productId);
  product.stock.splice(index, 1);
  saveDB(db);
  openStockManager(productId);
  renderProductsTab();
}

/* ============================================================
   หมวดหมู่
   ============================================================ */
function renderCategoriesTab() {
  const db = getDB();
  const mount = document.getElementById("panel-categories");

  mount.innerHTML = `
    <h3>จัดการหมวดหมู่สินค้า</h3>
    <div class="card">
      <form id="cat-form" class="flex-row" style="align-items:flex-end">
        <div class="form-group mb-0" style="flex:1">
          <label>ชื่อหมวดหมู่</label>
          <input type="text" id="cat-name" placeholder="เช่น Free Fire" required />
        </div>
        <div class="form-group mb-0">
          <label>ไอคอน</label>
          <input type="text" id="cat-icon" placeholder="🎮" style="width:80px" required />
        </div>
        <button type="submit" class="btn btn-primary">เพิ่มหมวดหมู่</button>
      </form>
    </div>

    <div class="card mt-16">
      <table>
        <thead><tr><th>ไอคอน</th><th>ชื่อหมวดหมู่</th><th>จำนวนสินค้า</th><th></th></tr></thead>
        <tbody>
          ${db.categories
            .map((c) => {
              const count = db.products.filter((p) => p.categoryId === c.id).length;
              return `
              <tr>
                <td style="font-size:20px">${c.icon}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${count}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">ลบ</button></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("cat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("cat-name").value.trim();
    const icon = document.getElementById("cat-icon").value.trim() || "🎮";
    if (!name) return;
    const db2 = getDB();
    db2.categories.push({ id: uid("cat"), name, icon });
    saveDB(db2);
    toast("เพิ่มหมวดหมู่แล้ว", "ok");
    renderCategoriesTab();
  });
}

function deleteCategory(catId) {
  const db = getDB();
  const inUse = db.products.some((p) => p.categoryId === catId);
  if (inUse) {
    toast("ลบไม่ได้ เพราะยังมีสินค้าผูกอยู่กับหมวดหมู่นี้", "err");
    return;
  }
  db.categories = db.categories.filter((c) => c.id !== catId);
  saveDB(db);
  toast("ลบหมวดหมู่แล้ว", "ok");
  renderCategoriesTab();
}

/* ============================================================
   โค้ดเติมพ้อย
   ============================================================ */
function renderTopupCodesTab() {
  const db = getDB();
  const mount = document.getElementById("panel-topupcodes");

  mount.innerHTML = `
    <h3>จัดการโค้ดเติมพ้อย</h3>
    <div class="card">
      <form id="topup-code-form" class="grid-2">
        <div class="form-group">
          <label>โค้ด (เว้นว่างเพื่อสุ่มอัตโนมัติ)</label>
          <input type="text" id="tc-code" placeholder="เช่น SUMMER2026" />
        </div>
        <div class="form-group">
          <label>จำนวนพ้อยที่ได้รับ</label>
          <input type="number" id="tc-points" min="1" value="100" required />
        </div>
        <button type="submit" class="btn btn-primary" style="grid-column:1/-1">สร้างโค้ด</button>
      </form>
    </div>

    <div class="card mt-16">
      <table>
        <thead><tr><th>โค้ด</th><th>พ้อย</th><th>สถานะ</th><th>ใช้โดย</th><th></th></tr></thead>
        <tbody>
          ${db.topupCodes
            .map(
              (c) => `
            <tr>
              <td style="user-select:all">${escapeHtml(c.code)}</td>
              <td>${c.points.toLocaleString()}</td>
              <td><span class="tag ${c.used ? "tag-banned" : "tag-ok"}">${c.used ? "ใช้แล้ว" : "ยังไม่ใช้"}</span></td>
              <td>${c.usedBy ? escapeHtml(c.usedBy) : "-"}</td>
              <td>${!c.used ? `<button class="btn btn-danger btn-sm" onclick="deleteTopupCode('${c.code}')">ลบ</button>` : ""}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="5" class="text-faint">ยังไม่มีโค้ด</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("topup-code-form").addEventListener("submit", (e) => {
    e.preventDefault();
    let code = document.getElementById("tc-code").value.trim().toUpperCase();
    const points = parseInt(document.getElementById("tc-points").value, 10);
    if (!points || points <= 0) {
      toast("จำนวนพ้อยต้องมากกว่า 0", "err");
      return;
    }
    const db2 = getDB();
    if (!code) {
      code = "GID" + Math.random().toString(36).slice(2, 8).toUpperCase();
    }
    if (db2.topupCodes.some((c) => c.code.toUpperCase() === code)) {
      toast("มีโค้ดนี้อยู่แล้ว กรุณาใช้ชื่ออื่น", "err");
      return;
    }
    db2.topupCodes.push({ code, points, used: false, usedBy: null });
    saveDB(db2);
    toast(`สร้างโค้ด ${code} สำเร็จ`, "ok");
    renderTopupCodesTab();
  });
}

function deleteTopupCode(code) {
  const db = getDB();
  db.topupCodes = db.topupCodes.filter((c) => c.code !== code);
  saveDB(db);
  renderTopupCodesTab();
}

/* ============================================================
   สมาชิก / ลูกค้า
   ============================================================ */
function renderCustomersTab() {
  const db = getDB();
  const mount = document.getElementById("panel-customers");

  mount.innerHTML = `
    <h3>จัดการสมาชิก</h3>
    <div class="card">
      <table>
        <thead>
          <tr><th>ชื่อผู้ใช้</th><th>บทบาท</th><th>พ้อย</th><th>สถานะ</th><th>จัดการ</th></tr>
        </thead>
        <tbody>
          ${db.users
            .map(
              (u) => `
            <tr>
              <td>${escapeHtml(u.username)}</td>
              <td><span class="tag ${u.role === "admin" ? "tag-admin" : "tag-customer"}">${u.role === "admin" ? "แอดมิน" : "ลูกค้า"}</span></td>
              <td>${u.points.toLocaleString()}</td>
              <td><span class="tag ${u.banned ? "tag-banned" : "tag-ok"}">${u.banned ? "ถูกระงับ" : "ปกติ"}</span></td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="openCustomerEditor('${u.id}')">จัดการ</button>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div id="customer-editor-mount" class="mt-16"></div>
  `;
}

function openCustomerEditor(userId) {
  const db = getDB();
  const u = db.users.find((x) => x.id === userId);
  const mount = document.getElementById("customer-editor-mount");

  mount.innerHTML = `
    <div class="card">
      <div class="flex-between">
        <h4 class="mb-0">จัดการบัญชี: ${escapeHtml(u.username)}</h4>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('customer-editor-mount').innerHTML=''">ปิด</button>
      </div>

      <div class="grid-2 mt-16">
        <div>
          <h4>ปรับพ้อย</h4>
          <div class="form-group">
            <label>จำนวนพ้อยที่จะปรับ (ใส่ค่าลบเพื่อหักพ้อย)</label>
            <input type="number" id="ce-points" value="0" />
          </div>
          <button class="btn btn-primary btn-sm" onclick="adjustCustomerPoints('${u.id}')">บันทึกพ้อย</button>
        </div>

        <div>
          <h4>ตั้งรหัสผ่านใหม่</h4>
          <div class="form-group">
            <label>รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
            <input type="password" id="ce-password" />
          </div>
          <button class="btn btn-primary btn-sm" onclick="resetCustomerPassword('${u.id}')">ตั้งรหัสผ่านใหม่</button>
        </div>
      </div>

      <hr class="line" />
      <div class="flex-row">
        <button class="btn btn-outline btn-sm" onclick="toggleBanCustomer('${u.id}')">
          ${u.banned ? "ปลดระงับบัญชี" : "ระงับบัญชี"}
        </button>
        <button class="btn btn-outline btn-sm" onclick="toggleAdminRole('${u.id}')">
          ${u.role === "admin" ? "ลดสิทธิ์เป็นลูกค้า" : "เลื่อนสิทธิ์เป็นแอดมิน"}
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${u.id}')">ลบบัญชีนี้</button>
      </div>
      <div id="ce-msg" class="mt-16"></div>
    </div>
  `;
}

function adjustCustomerPoints(userId) {
  const delta = parseInt(document.getElementById("ce-points").value, 10) || 0;
  const db = getDB();
  const u = db.users.find((x) => x.id === userId);
  u.points = Math.max(0, u.points + delta);
  saveDB(db);
  toast("ปรับพ้อยเรียบร้อย", "ok");
  renderCustomersTab();
  openCustomerEditor(userId);
}

function resetCustomerPassword(userId) {
  const pass = document.getElementById("ce-password").value;
  const msg = document.getElementById("ce-msg");
  if (pass.length < 6) {
    msg.innerHTML = `<div class="error-box">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</div>`;
    return;
  }
  const db = getDB();
  const u = db.users.find((x) => x.id === userId);
  u.password = simpleHash(pass);
  saveDB(db);
  msg.innerHTML = `<div class="ok-box">ตั้งรหัสผ่านใหม่เรียบร้อย</div>`;
}

function toggleBanCustomer(userId) {
  const db = getDB();
  const u = db.users.find((x) => x.id === userId);
  u.banned = !u.banned;
  saveDB(db);
  renderCustomersTab();
  openCustomerEditor(userId);
}

function toggleAdminRole(userId) {
  const db = getDB();
  const u = db.users.find((x) => x.id === userId);
  u.role = u.role === "admin" ? "customer" : "admin";
  saveDB(db);
  renderCustomersTab();
  openCustomerEditor(userId);
}

function deleteCustomer(userId) {
  if (!confirm("ยืนยันการลบบัญชีนี้อย่างถาวร?")) return;
  const db = getDB();
  db.users = db.users.filter((x) => x.id !== userId);
  saveDB(db);
  toast("ลบบัญชีแล้ว", "ok");
  document.getElementById("customer-editor-mount").innerHTML = "";
  renderCustomersTab();
}

/* ============================================================
   ออเดอร์
   ============================================================ */
function renderOrdersTab() {
  const db = getDB();
  const mount = document.getElementById("panel-orders");
  const orders = [...db.orders].sort((a, b) => (a.date < b.date ? 1 : -1));

  mount.innerHTML = `
    <h3>ประวัติคำสั่งซื้อทั้งหมด</h3>
    <div class="card">
      <table>
        <thead><tr><th>ผู้ซื้อ</th><th>สินค้า</th><th>ราคา</th><th>รหัสที่ส่ง</th><th>วันที่</th></tr></thead>
        <tbody>
          ${orders
            .map(
              (o) => `
            <tr>
              <td>${escapeHtml(o.username)}</td>
              <td>${escapeHtml(o.productName)}</td>
              <td>${o.price.toLocaleString()} พ้อย</td>
              <td>${escapeHtml(o.code)}</td>
              <td class="text-faint">${escapeHtml(o.date)}</td>
            </tr>`
            )
            .join("") || `<tr><td colspan="5" class="text-faint">ยังไม่มีคำสั่งซื้อ</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   ตั้งค่า
   ============================================================ */
function renderSettingsTab() {
  const db = getDB();
  const mount = document.getElementById("panel-settings");

  mount.innerHTML = `
    <h3>ตั้งค่าระบบ</h3>
    <div class="card" style="max-width:460px">
      <form id="settings-form">
        <div class="form-group">
          <label>ชื่อเว็บไซต์</label>
          <input type="text" id="st-sitename" value="${escapeHtml(db.settings.siteName)}" required />
        </div>
        <div class="form-group">
          <label>รหัสแอดมิน (ใช้ปลดล็อกหน้านี้)</label>
          <input type="text" id="st-admincode" value="${escapeHtml(db.settings.adminCode)}" required />
        </div>
        <button type="submit" class="btn btn-primary">บันทึกการตั้งค่า</button>
      </form>
      <div id="settings-msg" class="mt-16"></div>
    </div>

    <div class="card mt-16" style="max-width:460px">
      <h4>รีเซ็ตข้อมูลทั้งหมด</h4>
      <p class="text-faint">ล้างข้อมูลทั้งหมดกลับไปเป็นชุดข้อมูลตัวอย่างเริ่มต้น การกระทำนี้ไม่สามารถย้อนกลับได้</p>
      <button class="btn btn-danger" onclick="handleResetAll()">รีเซ็ตข้อมูลระบบ</button>
    </div>
  `;

  document.getElementById("settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const db2 = getDB();
    db2.settings.siteName = document.getElementById("st-sitename").value.trim() || "PixelVault";
    db2.settings.adminCode = document.getElementById("st-admincode").value.trim() || "ADMIN2024";
    saveDB(db2);
    document.getElementById("settings-msg").innerHTML = `<div class="ok-box">บันทึกการตั้งค่าแล้ว</div>`;
    renderHeader("");
  });
}

function handleResetAll() {
  if (!confirm("ยืนยันการรีเซ็ตข้อมูลทั้งระบบกลับเป็นค่าเริ่มต้น?")) return;
  resetDB();
  clearSession();
  setAdminUnlocked(false);
  toast("รีเซ็ตข้อมูลแล้ว", "ok");
  window.location.href = "index.html";
}
