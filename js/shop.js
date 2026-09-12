/* ============================================================
   shop.js — หน้าร้านค้า: กรองหมวดหมู่ ค้นหา แสดงสินค้า ซื้อสินค้า
   ============================================================ */

let activeCategory = "all";
let searchTerm = "";

function initShop() {
  renderHeader("shop");
  renderCategoryChips();
  renderProductGrid();
  renderHeroStats();

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderProductGrid();
    });
  }
}

function renderHeroStats() {
  const db = getDB();
  const elCat = document.getElementById("stat-categories");
  const elProd = document.getElementById("stat-products");
  const elSold = document.getElementById("stat-sold");
  if (elCat) elCat.textContent = db.categories.length;
  if (elProd) elProd.textContent = db.products.length;
  if (elSold)
    elSold.textContent = db.products.reduce((a, p) => a + (p.soldCount || 0), 0);
}

function renderCategoryChips() {
  const db = getDB();
  const mount = document.getElementById("cat-row");
  if (!mount) return;

  const chips = [{ id: "all", name: "ทั้งหมด", icon: "🗂️" }, ...db.categories];

  mount.innerHTML = chips
    .map(
      (c) => `
      <div class="cat-chip ${activeCategory === c.id ? "active" : ""}" data-cat="${c.id}">
        <span>${c.icon}</span><span>${escapeHtml(c.name)}</span>
      </div>`
    )
    .join("");

  mount.querySelectorAll(".cat-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.cat;
      renderCategoryChips();
      renderProductGrid();
    });
  });
}

function renderProductGrid() {
  const db = getDB();
  const mount = document.getElementById("product-grid");
  if (!mount) return;

  let list = db.products;
  if (activeCategory !== "all") {
    list = list.filter((p) => p.categoryId === activeCategory);
  }
  if (searchTerm) {
    list = list.filter((p) => p.name.toLowerCase().includes(searchTerm));
  }

  if (list.length === 0) {
    mount.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <div class="big">🔍</div>
        <p>ไม่พบสินค้าที่ตรงกับเงื่อนไข ลองค้นหาคำอื่นดูนะ</p>
      </div>`;
    return;
  }

  mount.innerHTML = list
    .map((p) => {
      const cat = db.categories.find((c) => c.id === p.categoryId);
      const stockLeft = p.stock.filter((s) => !s.sold).length;
      return `
      <a class="ticket" href="product.html?id=${p.id}">
        <div class="ticket-top">
          <div class="ticket-icon">${p.photo ? `<img src="${p.photo}" alt="" />` : p.image}</div>
          <div>
            <div class="ticket-title">${escapeHtml(p.name)}</div>
            <div class="ticket-cat">${cat ? cat.icon + " " + escapeHtml(cat.name) : ""}</div>
          </div>
        </div>
        <div class="ticket-desc">${escapeHtml(truncate(p.desc, 70))}</div>
        <div class="ticket-stub">
          <div class="ticket-price">${p.price.toLocaleString()} <small>พ้อย</small></div>
          <div class="ticket-stock ${stockLeft === 0 ? "out" : ""}">
            ${stockLeft === 0 ? "สินค้าหมด" : `เหลือ ${stockLeft} บัญชี`}
          </div>
        </div>
      </a>`;
    })
    .join("");
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}
