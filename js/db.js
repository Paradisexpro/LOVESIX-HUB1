/* ============================================================
   db.js — ตัวจัดการฐานข้อมูลด้วย Firebase Realtime Database
   ข้อมูลทั้งหมด (สินค้า, หมวดหมู่, สมาชิก, ออเดอร์, โค้ดเติมพ้อย,
   ตั้งค่า) ถูกเก็บไว้ที่ Firebase Realtime Database ของโปรเจกต์
   lovesixshop
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAA7hiNqnwVQpsZR5oAeIRDocxxJXCAd90",
  authDomain: "lovesixshop.firebaseapp.com",
  databaseURL: "https://lovesixshop-default-rtdb.firebaseio.com",
  projectId: "lovesixshop",
  storageBucket: "lovesixshop.firebasestorage.app",
  messagingSenderId: "50715656584",
  appId: "1:50715656584:web:8caf882df411131481ba3d",
  measurementId: "G-Y6S811MSF1",
};

/* เส้นทางหลักใน Realtime Database ที่เก็บข้อมูลทั้งระบบ */
const DB_PATH = "pixelvault/db";

/* ชื่อ key สำหรับเก็บเป็นสำรองใน localStorage (กรณี Firebase อ่าน/เขียนไม่ได้) */
const DB_KEY = "gid_store_db_fb_fallback_v1";

let app = null;
let dbRef = null;
let _cache = null;
let _ready = null;
let _usingFallback = false;

/* -------- simple hash (ใช้แทนการเก็บรหัสผ่านแบบตัวอักษรล้วน) --------
   หมายเหตุ: นี่คือระบบสาธิต ที่เก็บรหัสผ่านแบบ hash ฝั่ง client
   ไม่เหมาะกับการใช้งานจริงที่ต้องการความปลอดภัยระดับ production */
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowStr() {
  return new Date().toLocaleString("th-TH", { hour12: false });
}

/* -------- Seed ข้อมูลตั้งต้น -------- */
function seedDB() {
  const categories = [
    { id: "cat_gta", name: "GTA V", icon: "🚗" },
    { id: "cat_ff", name: "Free Fire", icon: "🔥" },
    { id: "cat_rov", name: "RoV", icon: "⚔️" },
    { id: "cat_pubg", name: "PUBG Mobile", icon: "🎯" },
    { id: "cat_valo", name: "Valorant", icon: "🕹️" },
    { id: "cat_gi", name: "Genshin Impact", icon: "⭐" },
    { id: "cat_mlbb", name: "Mobile Legends", icon: "🛡️" },
  ];

  const products = [];

  const users = [
    {
      id: "u_admin", username: "admin", password: simpleHash("admin123"),
      role: "admin", points: 0, createdAt: nowStr(), banned: false,
    },
    {
      id: "u_demo", username: "demo", password: simpleHash("demo1234"),
      role: "customer", points: 1000, createdAt: nowStr(), banned: false,
    },
  ];

  const topupCodes = [
    { code: "WELCOME100", points: 100, used: false, usedBy: null },
    { code: "GAMER500", points: 500, used: false, usedBy: null },
  ];

  return {
    settings: {
      adminCode: "ADMIN2024",
      siteName: "LOVE SIXHUB",
      qr: {
        active: true,
        type: "promptpay",
        account: "0821234567",
        holder: "LOVE SIXHUB",
        city: "Bangkok",
        bank: "PromptPay",
        qrImage: "",
      },
    },
    categories,
    products,
    users,
    topupCodes,
    topupRequests: [],
    orders: [],
  };
}

/* -------- ปรับโครงสร้างข้อมูลหลังอ่านจาก Firebase --------
   Realtime Database บันทึก array เปล่าไว้เป็นค่าว่าง เมื่ออ่านกลับมา
   ต้องแปลงให้เป็น array ตามเดิม */
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
}

function normalizeDB(db) {
  if (!db || typeof db !== "object") return seedDB();
  db.settings = db.settings || { adminCode: "ADMIN2024", siteName: "LOVE SIXHUB" };
  if (db.settings.siteName === "PixelVault") db.settings.siteName = "LOVE SIXHUB";
  db.settings.qr = db.settings.qr || {
    active: true,
    type: "promptpay",
    account: "0821234567",
    holder: "LOVE SIXHUB",
    city: "Bangkok",
    bank: "PromptPay",
    qrImage: "",
  };
  db.categories = toArray(db.categories);
  const gtaIdx = db.categories.findIndex((c) => c.id === "cat_gta");
  if (gtaIdx === -1) {
    db.categories.unshift({ id: "cat_gta", name: "GTA V", icon: "🚗" });
  } else if (gtaIdx !== 0) {
    const [gta] = db.categories.splice(gtaIdx, 1);
    db.categories.unshift(gta);
  }
  db.products = toArray(db.products);
  const legacySeedIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
  db.products = db.products.filter((p) => !legacySeedIds.includes(p.id));
  db.users = toArray(db.users);
  db.topupCodes = toArray(db.topupCodes);
  db.topupRequests = toArray(db.topupRequests);
  db.orders = toArray(db.orders);
  db.products.forEach((p) => {
    p.stock = toArray(p.stock);
    p.soldCount = p.soldCount || 0;
    p.photo = p.photo || "";
  });
  return db;
}

/* -------- localStorage fallback (เมื่อ Firebase ใช้ไม่ได้) -------- */
function persistLocal(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function readLocalFallback() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? normalizeDB(JSON.parse(raw)) : null;
  } catch (e) {
    return null;
  }
}

function startFallback() {
  _usingFallback = true;
  _cache = readLocalFallback() || seedDB();
  return _cache;
}

/* -------- Firebase initialisation -------- */
function initFirebase() {
  if (app) return true;
  if (typeof firebase === "undefined") return false;
  app = firebase.initializeApp(firebaseConfig);
  dbRef = firebase.database().ref(DB_PATH);
  return true;
}

/* -------- โหลดฐานข้อมูลจาก Firebase ก่อนแสดงผลทุกหน้า -------- */
function initDB() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (!initFirebase()) {
      console.warn("Firebase SDK โหลดไม่สำเร็จ -> ใช้ข้อมูลสำรองใน localStorage");
      return startFallback();
    }
    try {
      const snap = await dbRef.once("value");
      if (snap.exists() && snap.val()) {
        _cache = normalizeDB(snap.val());
        return _cache;
      }
      // ยังไม่มีข้อมูลใน Firebase -> สร้างข้อมูลตั้งต้นและอัปโหลด
      _cache = seedDB();
      try {
        await dbRef.set(_cache);
      } catch (err) {
        console.warn("Firebase เขียนข้อมูลตั้งต้นไม่ได้ -> ใช้ localStorage", err);
        startFallback();
      }
      return _cache;
    } catch (err) {
      console.warn("Firebase อ่านข้อมูลล้มเหลว -> ใช้ localStorage", err);
      return startFallback();
    }
  })();
  return _ready;
}

/* -------- อ่านฐานข้อมูล (ข้อมูลจะพร้อมหลัง initDB สำเร็จ) -------- */
function getDB() {
  if (!_cache) _cache = readLocalFallback() || seedDB();
  return _cache;
}

/* -------- บันทึกฐานข้อมูลทั้งหมดไปยัง Firebase -------- */
async function saveDB(db) {
  _cache = db;
  if (!db) return;
  if (_usingFallback || !initFirebase()) {
    persistLocal(db);
    return;
  }
  try {
    await dbRef.set(db);
  } catch (err) {
    console.warn("Firebase เขียนข้อมูลไม่ได้ -> ใช้ localStorage", err);
    _usingFallback = true;
    persistLocal(db);
  }
}

/* -------- รีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดข้อมูลตัวอย่าง -------- */
async function resetDB() {
  _cache = seedDB();
  await saveDB(_cache);
  return _cache;
}

/* -------- session (ผู้ใช้ที่ล็อกอินอยู่ — เก็บไว้ที่เบราว์เซอร์นี้เท่านั้น) -------- */
const SESSION_KEY = "gid_store_session";

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(userId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
  const s = getSession();
  if (!s) return null;
  const db = getDB();
  if (!db || !Array.isArray(db.users)) return null;
  return db.users.find((u) => u.id === s.userId) || null;
}

/* -------- admin unlock flag (แยกจาก session, ต้องกรอกรหัสแอดมินทุกครั้งที่เข้าเมนู) -------- */
const ADMIN_UNLOCK_KEY = "gid_store_admin_unlocked";

function isAdminUnlocked() {
  return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1";
}

function setAdminUnlocked(v) {
  if (v) sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1");
  else sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
}