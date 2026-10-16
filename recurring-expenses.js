(function exposeRecurringExpenses(global) {
  "use strict";

  const HEADERS = Object.freeze([
    "recurring_id", "name", "frequency", "amount", "next_due_date",
    "expense_category", "expense_group", "is_essential", "payment_method",
    "account_from", "credit_card", "active", "note", "last_paid_date",
    "created_at", "updated_at"
  ]);
  const FREQUENCIES = Object.freeze(["Monthly", "Yearly"]);
  const text = (value) => String(value ?? "").trim();

  function date(value) {
    const key = text(value).slice(0, 10);
    const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error("วันที่รายจ่ายประจำไม่ถูกต้อง");
    const result = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (result.toISOString().slice(0, 10) !== key) throw new Error("วันที่รายจ่ายประจำไม่มีในปฏิทิน");
    return key;
  }

  function frequency(value) {
    const normalized = text(value).toLowerCase();
    if (["monthly", "month", "รายเดือน", "ทุกเดือน"].includes(normalized)) return "Monthly";
    if (["yearly", "annual", "year", "รายปี", "ทุกปี"].includes(normalized)) return "Yearly";
    return "";
  }

  function isActive(value) {
    if (typeof value === "boolean") return value;
    return ["yes", "true", "1", "on", "active", "ใช่", "ใช้งาน"].includes(text(value).toLowerCase());
  }

  function nextDue(value, frequencyValue) {
    const key = date(value);
    const recurrence = frequency(frequencyValue);
    if (!recurrence) throw new Error("ความถี่รายจ่ายประจำไม่ถูกต้อง");
    const [year, month, day] = key.split("-").map(Number);
    const targetYear = recurrence === "Yearly" ? year + 1 : month === 12 ? year + 1 : year;
    const targetMonth = recurrence === "Yearly" ? month : month === 12 ? 1 : month + 1;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
  }

  function daysUntil(dueValue, todayValue) {
    const due = new Date(`${date(dueValue)}T00:00:00Z`);
    const today = new Date(`${date(todayValue)}T00:00:00Z`);
    return Math.round((due - today) / 86400000);
  }

  function status(record, todayValue) {
    if (!isActive(record?.active)) return "paused";
    let days;
    try { days = daysUntil(record?.next_due_date, todayValue); } catch (_error) { return "invalid"; }
    if (days < 0) return "overdue";
    if (days === 0) return "due";
    if (days <= 30) return "upcoming";
    return "future";
  }

  function paymentReference(recurringId, dueValue) {
    const id = text(recurringId).replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!id) throw new Error("รายการรายจ่ายประจำไม่มี recurring_id");
    return `v21-rec-${id}-${date(dueValue).replace(/-/g, "")}`;
  }

  global.RecurringExpenses = Object.freeze({
    HEADERS, FREQUENCIES, date, frequency, isActive, nextDue, daysUntil, status, paymentReference
  });
})(typeof window === "undefined" ? globalThis : window);
