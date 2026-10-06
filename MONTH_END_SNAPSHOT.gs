/**
 * Personal Wealth v2.7.0 — automatic month-end snapshot
 *
 * วิธีติดตั้ง:
 * 1) เปิด Google Sheet > Extensions > Apps Script
 * 2) วางไฟล์นี้ทั้งไฟล์ แล้วกด Save
 * 3) เลือก installMonthEndSnapshotTrigger และกด Run หนึ่งครั้ง
 * 4) อนุญาตสิทธิ์ตามหน้าจอ
 *
 * Trigger จะตรวจทุกวันประมาณ 23:30 น. ตามเวลาไทย และบันทึกเฉพาะวันสุดท้ายของเดือน
 */

const PW_SNAPSHOT_TIMEZONE = "Asia/Bangkok";
const PW_SNAPSHOT_HANDLER = "runMonthEndSnapshot";
const PW_SPREADSHEET_ID_PROPERTY = "PW_SPREADSHEET_ID";

function installMonthEndSnapshotTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("กรุณาเปิด Apps Script จาก Google Sheet ที่ใช้กับ Personal Wealth");
  PropertiesService.getScriptProperties().setProperty(PW_SPREADSHEET_ID_PROPERTY, spreadsheet.getId());
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === PW_SNAPSHOT_HANDLER)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(PW_SNAPSHOT_HANDLER)
    .timeBased()
    .atHour(23)
    .nearMinute(30)
    .everyDays(1)
    .inTimezone(PW_SNAPSHOT_TIMEZONE)
    .create();
}

function runMonthEndSnapshot() {
  const now = new Date();
  const dateText = Utilities.formatDate(now, PW_SNAPSHOT_TIMEZONE, "yyyy-MM-dd");
  const parts = dateText.split("-").map(Number);
  const lastDay = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
  if (parts[2] !== lastDay) return;
  upsertMonthlySnapshot_(now, "บันทึกอัตโนมัติวันสุดท้ายของเดือน");
}

// ใช้ทดสอบหลังติดตั้งได้ทันที โดยจะบันทึก/อัปเดตเดือนปัจจุบันโดยไม่รอวันสิ้นเดือน
function testMonthEndSnapshotNow() {
  upsertMonthlySnapshot_(new Date(), "ทดสอบ Snapshot อัตโนมัติจาก Apps Script");
}

function upsertMonthlySnapshot_(anchor, note) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(PW_SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) throw new Error("ยังไม่ได้ติดตั้ง Trigger กรุณารัน installMonthEndSnapshotTrigger ก่อน");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const monthKey = Utilities.formatDate(anchor, PW_SNAPSHOT_TIMEZONE, "yyyy-MM");
  const accounts = readRows_(spreadsheet, "Accounts");
  const investments = readRows_(spreadsheet, "Investments");
  const assets = readRows_(spreadsheet, "Assets");
  const liabilities = readRows_(spreadsheet, "Liabilities");
  const transactions = readRows_(spreadsheet, "Transactions");
  const settingsRows = readRows_(spreadsheet, "Settings");
  const settings = {};
  settingsRows.forEach((row) => {
    const key = String(row.key || "").trim();
    if (key) settings[key] = row.value;
  });

  const accountAssets = toBoolean_(settings.include_accounts_in_net_worth)
    ? sum_(accounts, (row) => row.balance)
    : 0;
  const investmentAssets = sum_(investments, (row) => {
    const explicit = row.current_value;
    if (explicit !== "" && explicit !== null && explicit !== undefined) return explicit;
    return toNumber_(row.units) * toNumber_(row.current_price);
  });
  const otherAssets = sum_(assets, (row) => toNumber_(row.estimated_value) || toNumber_(row.purchase_price));
  const totalLiabilities = sum_(liabilities, (row) => row.total_amount);
  const totalAssets = accountAssets + investmentAssets + otherAssets;
  const netWorth = totalAssets - totalLiabilities;

  let income = 0;
  let expense = 0;
  transactions.forEach((row) => {
    if (monthKeyForValue_(row.date) !== monthKey) return;
    const amount = Math.abs(toNumber_(row.amount));
    const type = normalizeType_(row.type);
    if (type === "income") income += amount;
    if (type === "expense") expense += amount;
  });
  const monthlyCashflow = income - expense;
  const savingsRate = income > 0 ? monthlyCashflow / income : "";

  const snapshotSheet = spreadsheet.getSheetByName("MonthlySnapshots");
  if (!snapshotSheet) throw new Error("ไม่พบชีต MonthlySnapshots");
  const headers = snapshotSheet.getRange(1, 1, 1, snapshotSheet.getLastColumn()).getValues()[0]
    .map((value) => String(value || "").trim());
  const required = ["snapshot_month", "total_assets", "total_liabilities", "net_worth", "monthly_cashflow", "savings_rate", "note"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`MonthlySnapshots ขาด Header: ${missing.join(", ")}`);

  const record = {
    snapshot_month: `${monthKey}-01`,
    total_assets: roundMoney_(totalAssets),
    total_liabilities: roundMoney_(totalLiabilities),
    net_worth: roundMoney_(netWorth),
    monthly_cashflow: roundMoney_(monthlyCashflow),
    savings_rate: savingsRate === "" ? "" : savingsRate,
    note
  };
  const rowValues = headers.map((header) => record[header] === undefined ? "" : record[header]);
  const lastRow = snapshotSheet.getLastRow();
  const targetRows = [];
  if (lastRow >= 2) {
    const monthColumn = headers.indexOf("snapshot_month") + 1;
    const values = snapshotSheet.getRange(2, monthColumn, lastRow - 1, 1).getValues();
    values.forEach((value, index) => {
      if (monthKeyForValue_(value[0]) === monthKey) targetRows.push(index + 2);
    });
  }
  if (targetRows.length > 1) throw new Error(`พบ MonthlySnapshots เดือน ${monthKey} ซ้ำ กรุณาเหลือเพียงหนึ่งแถว`);
  const targetRow = targetRows[0] || 0;
  if (targetRow) snapshotSheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
  else snapshotSheet.appendRow(rowValues);
}

function readRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`ไม่พบชีต ${sheetName}`);
  const values = sheet.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value || "").trim());
  return values.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => { if (header) record[header] = row[index] === undefined ? "" : row[index]; });
    return record;
  }).filter((row) => headers.some((header) => header && row[header] !== ""));
}

function sum_(rows, selector) {
  return rows.reduce((total, row) => total + toNumber_(selector(row)), 0);
}

function toNumber_(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value === null || value === undefined ? "" : value).replace(/[฿,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney_(value) {
  return Math.round((toNumber_(value) + Number.EPSILON) * 100) / 100;
}

function toBoolean_(value) {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1", "on", "ใช่"].includes(String(value || "").trim().toLowerCase());
}

function normalizeType_(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["income", "รายรับ"].includes(normalized)) return "income";
  if (["expense", "รายจ่าย"].includes(normalized)) return "expense";
  return normalized;
}

function monthKeyForValue_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Utilities.formatDate(value, PW_SNAPSHOT_TIMEZONE, "yyyy-MM");
  }
  const match = String(value || "").trim().match(/^(\d{4})-(\d{1,2})/);
  return match ? `${match[1]}-${String(Number(match[2])).padStart(2, "0")}` : "";
}
