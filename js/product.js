/* ============================================================
   product.js — หน้ารายละเอียดสินค้า และการซื้อสินค้าด้วยพ้อย
   ============================================================ */

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function initProductPage() {
  renderHeader("shop");

  const id = getProductIdFromUrl();
  const db = getDB();
  const product = db.products.find((p) => p.id === id);
  const mount = document.getElementById("product-mount");

  if (!product) {
    mount.innerHTML = `
      <div class="empty-state">
        <div class="big">❓</div>
        <p>ไม่พบสินค้านี้ อาจถูกลบไปแล้ว</p>
        <a class="btn btn-ghost" href="index.html">กลับหน้าร้านค้า</a>
      </div>`;
    return;
  }

  renderProduct(product, db);
}

function renderProduct(product, db) {
  const mount = document.getElementById("product-mount");
  const cat = db.categories.find((c) => c.id === product.categoryId);
  const stockLeft = product.stock.filter((s) => !s.sold).length;
  const user = getCurrentUser();

  let buyAreaHtml = "";
  if (!user) {
    buyAreaHtml = `
      <p class="text-dim">กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ</p>
      <a class="btn btn-primary btn-block" href="login.html">เข้าสู่ระบบเพื่อซื้อ</a>`;
  } else if (stockLeft === 0) {
    buyAreaHtml = `<button class="btn btn-outline btn-block" disabled>สินค้าหมดสต๊อก</button>`;
  } else if (user.points < product.price) {
    buyAreaHtml = `
      <p class="text-dim">พ้อยของคุณไม่พอ (คุณมี ${user.points.toLocaleString()} พ้อย)</p>
      <a class="btn btn-primary btn-block" href="topup.html">เติมพ้อยเพิ่ม</a>`;
  } else {
    buyAreaHtml = `<button class="btn btn-primary btn-block" id="buy-btn">ซื้อเลย — ${product.price.toLocaleString()} พ้อย</button>`;
  }

  mount.innerHTML = `
    <div class="card">
      <div class="flex-row" style="align-items:flex-start; gap:20px;">
        <div class="ticket-icon" style="width:80px;height:80px;font-size:46px;">${product.image}</div>
        <div style="flex:1; min-width:240px;">
          <div class="ticket-cat">${cat ? cat.icon + " " + escapeHtml(cat.name) : ""}</div>
          <h2>${escapeHtml(product.name)}</h2>
          <p>${escapeHtml(product.desc)}</p>
          <div class="flex-row">
            <span class="ticket-price" style="font-size:22px">${product.price.toLocaleString()} <small>พ้อย</small></span>
            <span class="ticket-stock ${stockLeft === 0 ? "out" : ""}">
              ${stockLeft === 0 ? "สินค้าหมด" : `เหลือ ${stockLeft} บัญชี`}
            </span>
            <span class="text-faint">ขายแล้ว ${product.soldCount || 0} บัญชี</span>
          </div>
        </div>
      </div>
      <hr class="line" />
      <div style="max-width:340px">
        ${buyAreaHtml}
        <div id="delivered-mount" class="mt-16"></div>
      </div>
    </div>
    <div class="mt-24">
      <a href="index.html" class="btn btn-ghost btn-sm">← กลับไปเลือกสินค้าอื่น</a>
    </div>
  `;

  const buyBtn = document.getElementById("buy-btn");
  if (buyBtn) {
    buyBtn.addEventListener("click", () => handleBuy(product.id));
  }
}

function handleBuy(productId) {
  const db = getDB();
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const product = db.products.find((p) => p.id === productId);
  if (!product) return;

  const availableIndex = product.stock.findIndex((s) => !s.sold);
  if (availableIndex === -1) {
    toast("สินค้าหมดสต๊อกพอดี ลองรีเฟรชหน้าอีกครั้ง", "err");
    return;
  }

  const dbUser = db.users.find((u) => u.id === user.id);
  if (dbUser.points < product.price) {
    toast("พ้อยไม่เพียงพอ", "err");
    return;
  }

  // ตัดพ้อย มอบรหัส บันทึกออเดอร์
  dbUser.points -= product.price;
  const codeItem = product.stock[availableIndex];
  codeItem.sold = true;
  product.soldCount = (product.soldCount || 0) + 1;

  const order = {
    id: uid("ord"),
    userId: dbUser.id,
    username: dbUser.username,
    productId: product.id,
    productName: product.name,
    price: product.price,
    code: codeItem.code,
    date: nowStr(),
  };
  db.orders.push(order);

  saveDB(db);

  toast("ซื้อสำเร็จ! รับรหัสบัญชีได้ด้านล่าง", "ok");
  renderProduct(product, db);
  renderHeader("shop");

  const deliverMount = document.getElementById("delivered-mount");
  if (deliverMount) {
    deliverMount.innerHTML = `
      <div class="ok-box">
        ซื้อสำเร็จ! นี่คือรหัสบัญชีของคุณ:<br />
        <b style="user-select:all">${escapeHtml(codeItem.code)}</b>
      </div>
      <p class="text-faint">รหัสนี้ถูกบันทึกไว้ในหน้าโปรไฟล์ของคุณด้วยแล้ว</p>
    `;
  }
}
