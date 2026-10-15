(function (global) {
  "use strict";
  const HEADERS = Object.freeze(["event_id", "event_date", "category", "tone", "title", "detail", "created_at", "updated_at"]);
  const CATEGORIES = Object.freeze(["เรื่องงาน", "เรื่องส่วนตัว"]);
  const TONES = Object.freeze(["Positive", "Negative", "Neutral"]);
  const text = (value) => String(value ?? "").trim();
  function category(value) {
    const key = text(value).toLowerCase();
    return ({work: "เรื่องงาน", personal: "เรื่องส่วนตัว", "เรื่องงาน": "เรื่องงาน", "เรื่องส่วนตัว": "เรื่องส่วนตัว"})[key] || "";
  }
  function tone(value) {
    return TONES.find((item) => item.toLowerCase() === text(value).toLowerCase()) || "";
  }
  function date(value) {
    const key = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error("กรุณาระบุวันที่เหตุการณ์ให้ถูกต้อง");
    const parsed = new Date(`${key}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key) throw new Error("วันที่เหตุการณ์ไม่มีในปฏิทิน");
    return key;
  }
  function month(value) {
    const key = text(value);
    if (!/^\d{4}-\d{2}$/.test(key)) throw new Error("กรุณาเลือกเดือนให้ถูกต้อง");
    date(`${key}-01`);
    return key;
  }
  function shiftMonth(value, delta) {
    const parsed = new Date(`${month(value)}-01T00:00:00Z`);
    parsed.setUTCMonth(parsed.getUTCMonth() + delta);
    return month(parsed.toISOString().slice(0, 7));
  }
  function valid(row) {
    try { date(row.event_date); return Boolean(category(row.category) && tone(row.tone)); } catch { return false; }
  }
  function rowsForMonth(rows, value) {
    const key = month(value);
    return rows.filter((row) => valid(row) && row.event_date.slice(0, 7) === key)
      .sort((a, b) => b.event_date.localeCompare(a.event_date) || text(b.created_at).localeCompare(text(a.created_at)) || text(a.event_id).localeCompare(text(b.event_id)));
  }
  global.MonthlyEvents = Object.freeze({ HEADERS, CATEGORIES, TONES, category, tone, date, month, shiftMonth, valid, rowsForMonth });
})(window);
