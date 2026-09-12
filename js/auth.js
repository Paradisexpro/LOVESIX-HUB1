/* ============================================================
   auth.js — สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบ
   ============================================================ */

function registerUser(username, password, confirmPassword) {
  username = (username || "").trim();

  if (username.length < 4) {
    return { ok: false, error: "ชื่อผู้ใช้ต้องมีอย่างน้อย 4 ตัวอักษร" };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { ok: false, error: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 และ _ เท่านั้น" };
  }
  if (password.length < 6) {
    return { ok: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  }

  const db = getDB();
  const exists = db.users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) {
    return { ok: false, error: "มีชื่อผู้ใช้นี้ในระบบแล้ว" };
  }

  const newUser = {
    id: uid("u"),
    username,
    password: simpleHash(password),
    role: "customer",
    points: 0,
    createdAt: nowStr(),
    banned: false,
  };
  db.users.push(newUser);
  saveDB(db);
  setSession(newUser.id);
  return { ok: true, user: newUser };
}

function loginUser(username, password) {
  const db = getDB();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === (username || "").trim().toLowerCase()
  );
  if (!user) {
    return { ok: false, error: "ไม่พบชื่อผู้ใช้นี้ในระบบ" };
  }
  if (user.banned) {
    return { ok: false, error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมิน" };
  }
  if (user.password !== simpleHash(password)) {
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง" };
  }
  setSession(user.id);
  return { ok: true, user };
}

function logoutUser() {
  clearSession();
  setAdminUnlocked(false);
}

/* บังคับให้ต้องล็อกอินก่อนถึงจะอยู่หน้านี้ได้ ไม่งั้นเด้งไป login.html */
function requireLogin() {
  const u = getCurrentUser();
  if (!u) {
    window.location.href = "login.html";
    return null;
  }
  return u;
}
