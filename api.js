(function exposeGoogleSheetsStore(global) {
  "use strict";

  const SESSION_TOKEN_KEY = "personalWealthGoogleToken";
  const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
  const LINKED_TRANSACTION_PREFIX = "v21-";
  const CREDIT_CARD_EXPENSE_PREFIX = "v25-cc-";
  const CREDIT_CARD_PAYMENT_PREFIX = "v25-pay-";
  const MONEY_PRECISION = 100;
  const GOAL_METADATA_HEADERS = ["goal_type", "progress_source", "linked_account", "status"];
  const INVESTMENT_FUNDING_HEADERS = ["account_from", "funded_amount"];
  const INVESTMENT_PLANNING_HEADERS = ["investment_purpose", "asset_class", "risk_source", "risk_level", "time_horizon_years", "income_received", "principal_amount", "valuation_mode", "valuation_date"];
  const TRANSACTION_ITEM_HEADERS = ["item_name"];
  const CREDIT_CARD_TRANSACTION_HEADERS = ["payment_method", "credit_card"];
  const ACCOUNT_ROLE_HEADERS = ["account_role"];
  const EXPENSE_PLANNING_HEADERS = ["expense_group", "is_essential"];
  const BUDGET_HEADERS = ["budget_id", "month", "expense_group", "budget_amount", "note", "created_at", "updated_at"];
  const SINKING_FUND_HEADERS = ["fund_id", "fund_name", "target_amount", "current_amount", "due_date", "progress_source", "linked_account", "expense_group", "status", "note", "created_at", "updated_at"];
  const LIABILITY_TYPE_HEADERS = ["liability_type"];
  const LIABILITY_DETAIL_HEADERS = ["debt_category", "original_amount", "interest_rate", "start_date", "due_date", "payment_day", "credit_limit", "linked_asset"];
  const INSURANCE_HEADERS = ["policy_id", "policy_name", "insurance_type", "insurer", "coverage_amount", "annual_premium", "start_date", "renewal_date", "end_date", "insured_person", "status", "note", "created_at", "updated_at"];
  const RETIREMENT_HEADERS = ["retirement_id", "plan_name", "birth_date", "retirement_age", "monthly_expense_today", "inflation_rate", "expected_return", "withdrawal_rate", "monthly_contribution", "status", "note", "created_at", "updated_at"];
  const GRATITUDE_HEADERS = ["gratitude_id", "date", "slot", "category", "gratitude_text", "created_at", "updated_at"];
  const TODO_HEADERS = ["todo_id", "date", "category", "task_text", "is_important", "is_completed", "completed_at", "created_at", "updated_at", "parent_todo_id"];
  const HABIT_HEADERS = ["habit_id", "habit_name", "frequency", "active", "created_at", "updated_at"];
  const HABIT_LOG_HEADERS = ["habit_log_id", "habit_id", "period_key", "completed_date", "completed_at", "created_at", "updated_at"];
  const GRATITUDE_CATEGORIES = new Set(["คน", "ตัวเอง", "สัตว์", "สิ่งของ", "สถานที่", "เหตุการณ์", "ประสบการณ์", "อื่น ๆ"]);
  const TODO_CATEGORIES = new Set(["เรื่องงาน", "เรื่องส่วนตัว", "โปรเจก"]);
  const HABIT_FREQUENCIES = new Set(["Daily", "Weekly", "Monthly", "Yearly"]);
  const ACCOUNT_ROLES = new Set(["General", "Spending", "Emergency", "SinkingFund", "Investment"]);
  const EXPENSE_GROUPS = new Set(["Personal", "Family", "HomeDebt", "Health", "Protection"]);
  const SINKING_FUND_SOURCES = new Set(["Manual", "Account"]);
  const SINKING_FUND_STATUSES = new Set(["Active", "Paused", "Completed"]);
  const ASSET_CLASSES = new Set(["Cash", "FixedIncome", "Equity", "Mixed", "Gold", "RealEstate", "Crypto", "Alternative", "Other"]);
  const INVESTMENT_PURPOSES = new Set(["Retirement", "Growth", "Income", "Preservation", "Other"]);
  const RISK_SOURCES = new Set(["Auto", "Manual"]);
  const DEFAULT_ASSET_RISK = Object.freeze({ Cash: 1, FixedIncome: 2, Mixed: 4, Gold: 4, RealEstate: 4, Equity: 5, Alternative: 5, Crypto: 7, Other: null });
  const DEBT_CATEGORIES = new Set(["Mortgage", "Auto", "CreditCard", "Personal", "Education", "Business", "Other"]);
  const INSURANCE_TYPES = new Set(["Life", "Health", "CriticalIllness", "Accident", "Vehicle", "Property", "Other"]);
  const INSURANCE_STATUSES = new Set(["Active", "Expired", "Cancelled"]);
  const RETIREMENT_STATUSES = new Set(["Active", "Paused"]);

  function waitFor(predicate, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (predicate()) {
          clearInterval(timer);
          resolve();
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error("โหลดบริการ Google ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต"));
        }
      }, 80);
    });
  }

  function quoteSheet(name) {
    return `'${String(name).replace(/'/g, "''")}'`;
  }

  function columnLetter(columnNumber) {
    let number = columnNumber;
    let result = "";
    while (number > 0) {
      number -= 1;
      result = String.fromCharCode(65 + (number % 26)) + result;
      number = Math.floor(number / 26);
    }
    return result;
  }

  function createShortId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID().split("-")[0];
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  function normalizeName(value) {
    return String(value ?? "").trim();
  }

  function accountKey(value) {
    return normalizeName(value).toLocaleLowerCase("th-TH");
  }

  function toMoney(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const parsed = Number(String(value ?? "").replace(/[฿,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function roundMoney(value) {
    return Math.round((toMoney(value) + Number.EPSILON) * MONEY_PRECISION) / MONEY_PRECISION;
  }

  function normalizeTransactionType(value) {
    const type = String(value ?? "").trim().toLowerCase();
    if (["income", "รายรับ"].includes(type)) return "income";
    if (["expense", "รายจ่าย"].includes(type)) return "expense";
    if (["transfer", "โอน", "โอนเงิน"].includes(type)) return "transfer";
    if (["creditcardpayment", "credit_card_payment", "ชำระบัตรเครดิต"].includes(type)) return "credit_card_payment";
    return "";
  }

  function normalizePaymentMethod(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["creditcard", "credit_card", "บัตรเครดิต"].includes(normalized) ? "CreditCard" : "Account";
  }

  function normalizeAccountRole(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    const aliases = {
      general: "General",
      "เงินทั่วไป": "General",
      spending: "Spending",
      "ใช้จ่าย": "Spending",
      "บัญชีใช้จ่าย": "Spending",
      emergency: "Emergency",
      "เงินฉุกเฉิน": "Emergency",
      sinkingfund: "SinkingFund",
      sinking_fund: "SinkingFund",
      "เงินเตรียมรายจ่าย": "SinkingFund",
      investment: "Investment",
      "เงินรอลงทุน": "Investment"
    };
    return aliases[normalized] || "";
  }

  function normalizeExpenseGroup(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    const aliases = {
      personal: "Personal",
      "ส่วนตัว": "Personal",
      family: "Family",
      "ครอบครัว": "Family",
      homedebt: "HomeDebt",
      home_debt: "HomeDebt",
      "บ้าน รถ และหนี้": "HomeDebt",
      health: "Health",
      "สุขภาพ": "Health",
      protection: "Protection",
      "ประกันและการป้องกัน": "Protection"
    };
    return aliases[normalized] || "";
  }

  function normalizeLiabilityType(value, name = "") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["creditcard", "credit_card", "บัตรเครดิต"].includes(normalized)) return "CreditCard";
    if (/บัตรเครดิต|credit\s*card/i.test(String(name || ""))) return "CreditCard";
    return "Loan";
  }

  function normalizeAssetClass(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    const aliases = {
      cash: "Cash", money_market: "Cash", "เงินสด": "Cash", "ตลาดเงิน": "Cash",
      fixedincome: "FixedIncome", fixed_income: "FixedIncome", bond: "FixedIncome", "ตราสารหนี้": "FixedIncome",
      equity: "Equity", stock: "Equity", "หุ้น": "Equity",
      mixed: "Mixed", balanced: "Mixed", "กองทุนผสม": "Mixed",
      gold: "Gold", commodity: "Gold", "ทอง": "Gold", "ทองคำ": "Gold",
      realestate: "RealEstate", real_estate: "RealEstate", reit: "RealEstate", "อสังหาริมทรัพย์": "RealEstate",
      crypto: "Crypto", digital_asset: "Crypto", "คริปโท": "Crypto", "สินทรัพย์ดิจิทัล": "Crypto",
      alternative: "Alternative", "สินทรัพย์ทางเลือก": "Alternative",
      other: "Other", "อื่น ๆ": "Other"
    };
    return aliases[normalized] || "";
  }

  function normalizeInvestmentPurpose(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["retirement", "เกษียณ"].includes(normalized)) return "Retirement";
    if (["growth", "เติบโต"].includes(normalized)) return "Growth";
    if (["income", "สร้างรายได้"].includes(normalized)) return "Income";
    if (["preservation", "รักษาเงินต้น"].includes(normalized)) return "Preservation";
    if (["other", "อื่น ๆ"].includes(normalized)) return "Other";
    return "";
  }

  function normalizeRiskSource(value) {
    return String(value ?? "").trim().toLowerCase() === "manual" ? "Manual" : "Auto";
  }

  function hasCellValue(value) {
    return value !== "" && value !== null && value !== undefined;
  }

  function investmentValue(record) {
    if (hasCellValue(record?.current_value)) return Math.max(roundMoney(record.current_value), 0);
    const unitsValue = roundMoney(toMoney(record?.units) * toMoney(record?.current_price));
    if (unitsValue > 0) return unitsValue;
    return Math.max(roundMoney(record?.funded_amount), 0);
  }

  function isValidIsoDate(value, allowBlank = true) {
    const text = normalizeName(value);
    if (!text) return allowBlank;
    const parts = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return false;
    const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
    return date.getUTCFullYear() === Number(parts[1])
      && date.getUTCMonth() === Number(parts[2]) - 1
      && date.getUTCDate() === Number(parts[3]);
  }

  function validateInvestmentPlanning(record, { requireFields = true } = {}) {
    for (const field of ["principal_amount", "current_value", "income_received", "time_horizon_years", "risk_level"]) {
      const value = record?.[field];
      if (hasCellValue(value) && !Number.isFinite(Number(String(value).replace(/[,฿\s]/g, "")))) throw new Error(`ข้อมูลตัวเลขไม่ถูกต้อง: ${field}`);
    }
    const purpose = normalizeInvestmentPurpose(record?.investment_purpose);
    const assetClass = normalizeAssetClass(record?.asset_class);
    const riskSource = normalizeRiskSource(record?.risk_source);
    const requestedRisk = toMoney(record?.risk_level);
    const horizon = normalizeName(record?.time_horizon_years) === "" ? "" : Number(record.time_horizon_years);
    const incomeReceived = normalizeName(record?.income_received) === "" ? "" : roundMoney(record.income_received);
    const currentValue = normalizeName(record?.current_value) === "" ? "" : roundMoney(record.current_value);
    const principal = normalizeName(record?.principal_amount) === "" ? "" : roundMoney(record.principal_amount);
    const valuationMode = record?.valuation_mode || "Principal";
    if (principal === "" || principal < 0) throw new Error("กรุณาระบุเงินต้นสะสมจริง รวมเงินต้นเดิมก่อนเริ่มใช้แอป");
    if (!["Principal", "Market"].includes(valuationMode)) throw new Error("รูปแบบมูลค่าไม่ถูกต้อง");
    if (valuationMode === "Market" && currentValue === "") throw new Error("กรุณากรอกมูลค่าปัจจุบัน หรือเลือกใช้เงินต้น");
    if (!isValidIsoDate(record?.valuation_date, true)) throw new Error("วันที่มูลค่าไม่ถูกต้อง");
    if (requireFields && !INVESTMENT_PURPOSES.has(purpose)) throw new Error("กรุณาเลือกเป้าหมายการลงทุน");
    if (requireFields && !ASSET_CLASSES.has(assetClass)) throw new Error("กรุณาเลือกประเภทสินทรัพย์จริง");
    if (!RISK_SOURCES.has(riskSource)) throw new Error("แหล่งระดับความเสี่ยงไม่ถูกต้อง");
    const riskLevel = riskSource === "Auto" ? (DEFAULT_ASSET_RISK[assetClass] || "") : requestedRisk;
    if (riskSource === "Manual" && !(Number.isInteger(riskLevel) && riskLevel >= 1 && riskLevel <= 7)) throw new Error("ระดับความเสี่ยงต้องอยู่ระหว่าง 1–7");
    if (horizon !== "" && (!Number.isInteger(horizon) || horizon < 1 || horizon > 100)) throw new Error("ระยะเวลาลงทุนต้องอยู่ระหว่าง 1–100 ปี");
    if (requireFields && horizon === "") throw new Error("กรุณาระบุระยะเวลาการลงทุน");
    if (incomeReceived !== "" && incomeReceived < 0) throw new Error("เงินปันผลหรือดอกเบี้ยสะสมติดลบไม่ได้");
    if (currentValue !== "" && currentValue < 0) throw new Error("มูลค่าปัจจุบันติดลบไม่ได้");
    return {
      investment_purpose: purpose,
      asset_class: assetClass,
      risk_source: riskSource,
      risk_level: riskLevel,
      time_horizon_years: horizon,
      income_received: incomeReceived,
      current_value: currentValue,
      principal_amount: principal,
      valuation_mode: valuationMode,
      valuation_date: normalizeName(record?.valuation_date)
    };
  }

  function normalizeGoalType(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["milestone", "life", "ชีวิต", "หมุดหมาย"].includes(normalized)) return "Milestone";
    return "Financial";
  }

  function normalizeGoalProgressSource(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["account", "บัญชี"].includes(normalized) ? "Account" : "Manual";
  }

  function normalizeSinkingFundSource(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["account", "บัญชี"].includes(normalized)) return "Account";
    if (["manual", "กรอกเอง"].includes(normalized)) return "Manual";
    return "";
  }

  function normalizeSinkingFundStatus(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["active", "กำลังสะสม"].includes(normalized)) return "Active";
    if (["paused", "pause", "พักไว้"].includes(normalized)) return "Paused";
    if (["completed", "complete", "ครบแล้ว"].includes(normalized)) return "Completed";
    return "";
  }

  function normalizeGoalStatus(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["completed", "complete", "done", "สำเร็จ", "เสร็จสิ้น"].includes(normalized)) return "Completed";
    if (["in progress", "in_progress", "progress", "กำลังทำ", "กำลังดำเนินการ"].includes(normalized)) {
      return "In Progress";
    }
    return "Not Started";
  }

  function parseUpdatedRow(range) {
    const match = String(range || "").match(/![A-Z]+(\d+)(?::[A-Z]+\d+)?$/i);
    return match ? Number(match[1]) : null;
  }

  function normalizeCell(value) {
    if (value === undefined || value === null) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  }

  function isYes(value) {
    if (typeof value === "boolean") return value;
    return ["yes", "true", "1", "on", "ใช่"].includes(String(value ?? "").trim().toLowerCase());
  }

  function habitPeriodKey(dateValue, frequency) {
    const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error("วันที่ Habit ไม่ถูกต้อง");
    if (!HABIT_FREQUENCIES.has(frequency)) throw new Error("ความถี่ Habit ไม่ถูกต้อง");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (frequency === "Daily") return `${match[1]}-${match[2]}-${match[3]}`;
    if (frequency === "Monthly") return `${match[1]}-${match[2]}`;
    if (frequency === "Yearly") return match[1];
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - weekday);
    const isoYear = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${isoYear}-W${String(week).padStart(2, "0")}`;
  }

  class GoogleSheetsStore {
    constructor(config) {
      this.config = config;
      this.tokenClient = null;
      this.token = null;
      this.headers = {};
      this.sheetIds = {};
      this.initialized = false;
      this.currentData = null;
      this.gratitudeLoadError = null;
      this.todoLoadError = null;
      this.habitLoadError = null;
      this.habitLogLoadError = null;
      this.budgetLoadError = null;
      this.sinkingFundLoadError = null;
      this.insuranceLoadError = null;
      this.retirementLoadError = null;
    }

    async init() {
      if (this.initialized) return;
      await waitFor(() => global.google?.accounts?.oauth2);
      this.tokenClient = global.google.accounts.oauth2.initTokenClient({
        client_id: this.config.GOOGLE_CLIENT_ID,
        scope: this.config.SCOPES,
        callback: () => {}
      });
      this.restoreSessionToken();
      this.initialized = true;
    }

    restoreSessionToken() {
      try {
        const stored = JSON.parse(sessionStorage.getItem(SESSION_TOKEN_KEY) || "null");
        if (!stored?.access_token || !stored?.expires_at || stored.expires_at <= Date.now() + 30_000) {
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
          return;
        }
        this.token = stored;
      } catch {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    }

    isAuthorized() {
      return Boolean(
        this.token?.access_token
        && this.token.expires_at
        && this.token.expires_at > Date.now() + 30_000
      );
    }

    signIn(prompt = "") {
      if (!this.tokenClient) return Promise.reject(new Error("ระบบ Google ยังไม่พร้อม"));
      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            const error = new Error(response.error_description || response.error);
            error.code = response.error;
            reject(error);
            return;
          }
          this.token = {
            ...response,
            expires_at: Date.now() + (Number(response.expires_in || 3600) * 1000)
          };
          sessionStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(this.token));
          resolve(this.token);
        };
        this.tokenClient.requestAccessToken({ prompt });
      });
    }

    clearSessionToken() {
      this.token = null;
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }

    async signOut() {
      const accessToken = this.token?.access_token;
      if (accessToken) {
        await new Promise((resolve) => {
          global.google.accounts.oauth2.revoke(accessToken, resolve);
        });
      }
      this.clearSessionToken();
      this.currentData = null;
    }

    ensureAuthorized() {
      if (!this.isAuthorized()) {
        const error = new Error("กรุณาเชื่อมต่อบัญชี Google ก่อน");
        error.code = "AUTH_REQUIRED";
        throw error;
      }
    }

    async request(path, { method = "GET", query, body } = {}) {
      this.ensureAuthorized();
      const url = new URL(`${SHEETS_API_BASE}/${encodeURIComponent(this.config.SPREADSHEET_ID)}${path}`);
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
          else if (value !== undefined && value !== null) url.searchParams.set(key, value);
        });
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token.access_token}`,
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (!response.ok) {
        if (response.status === 401) {
          this.clearSessionToken();
        }
        const error = new Error(payload?.error?.message || `Google Sheets API error ${response.status}`);
        error.status = response.status;
        error.result = payload;
        throw error;
      }
      return payload || {};
    }

    async loadOptionalSheet(data, key, sheetName, endColumn, errorProperty) {
      try {
        const response = await this.request("/values:batchGet", {
          query: {
            ranges: [`${quoteSheet(sheetName)}!A:${endColumn}`],
            majorDimension: "ROWS",
            valueRenderOption: "UNFORMATTED_VALUE",
            dateTimeRenderOption: "FORMATTED_STRING"
          }
        });
        const values = response.valueRanges?.[0]?.values || [];
        const headers = (values[0] || []).map((value) => String(value || "").trim());
        this.headers[sheetName] = headers;
        data[key] = values.slice(1).map((row, rowIndex) => {
          const record = { _rowNumber: rowIndex + 2 };
          headers.forEach((header, columnIndex) => {
            if (header) record[header] = row[columnIndex] ?? "";
          });
          return record;
        }).filter((record) => headers.some((header) => header && record[header] !== ""));
        this[errorProperty] = null;
      } catch (error) {
        if (error?.status !== 400) throw error;
        this.headers[sheetName] = [];
        data[key] = [];
        this[errorProperty] = error;
      }
    }

    async loadAll() {
      const optionalKeys = new Set(["gratitude", "todos", "habits", "habitLogs", "budgets", "sinkingFunds", "insurancePolicies", "retirementPlans"]);
      const entries = Object.entries(this.config.SHEETS).filter(([key]) => !optionalKeys.has(key));
      const ranges = entries.map(([, sheetName]) => `${quoteSheet(sheetName)}!A:Z`);
      const response = await this.request("/values:batchGet", {
        query: {
          ranges,
          majorDimension: "ROWS",
          valueRenderOption: "UNFORMATTED_VALUE",
          dateTimeRenderOption: "FORMATTED_STRING"
        }
      });
      const valueRanges = response.valueRanges || [];
      const data = {};

      entries.forEach(([key, sheetName], index) => {
        const values = valueRanges[index]?.values || [];
        const rawHeaders = values[0] || [];
        let lastHeader = rawHeaders.length - 1;
        while (lastHeader >= 0 && !String(rawHeaders[lastHeader] || "").trim()) lastHeader -= 1;
        const headers = rawHeaders.slice(0, lastHeader + 1).map((value) => String(value || "").trim());
        this.headers[sheetName] = headers;
        data[key] = values.slice(1)
          .map((row, rowIndex) => {
            const record = { _rowNumber: rowIndex + 2 };
            headers.forEach((header, columnIndex) => {
              if (header) record[header] = row[columnIndex] ?? "";
            });
            return record;
          })
          .filter((record) => headers.some((header) => header && record[header] !== ""));
      });

      await this.loadOptionalSheet(data, "gratitude", this.getGratitudeSheetName(), "G", "gratitudeLoadError");
      await this.loadOptionalSheet(data, "todos", this.getTodoSheetName(), "J", "todoLoadError");
      await this.loadOptionalSheet(data, "habits", this.getHabitSheetName(), "F", "habitLoadError");
      await this.loadOptionalSheet(data, "habitLogs", this.getHabitLogSheetName(), "G", "habitLogLoadError");
      await this.loadOptionalSheet(data, "budgets", this.getBudgetSheetName(), "G", "budgetLoadError");
      await this.loadOptionalSheet(data, "sinkingFunds", this.getSinkingFundSheetName(), "L", "sinkingFundLoadError");
      await this.loadOptionalSheet(data, "insurancePolicies", this.getInsuranceSheetName(), "N", "insuranceLoadError");
      await this.loadOptionalSheet(data, "retirementPlans", this.getRetirementSheetName(), "M", "retirementLoadError");

      this.currentData = data;
      return data;
    }

    getHeaders(sheetName) {
      const headers = this.headers[sheetName];
      if (!headers?.length) throw new Error(`ไม่พบหัวตารางของชีต ${sheetName}`);
      return headers;
    }

    getMissingHeaders(sheetName, requiredHeaders) {
      const headers = this.getHeaders(sheetName);
      return (requiredHeaders || []).filter((header) => !headers.includes(header));
    }

    getMissingGoalMetadataHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.goals, GOAL_METADATA_HEADERS);
    }

    getMissingInvestmentFundingHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.investments, INVESTMENT_FUNDING_HEADERS);
    }

    getMissingInvestmentPlanningHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.investments, INVESTMENT_PLANNING_HEADERS);
    }

    getMissingTransactionItemHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.transactions, TRANSACTION_ITEM_HEADERS);
    }

    getMissingAccountRoleHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.accounts, ACCOUNT_ROLE_HEADERS);
    }

    getMissingExpensePlanningHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.transactions, EXPENSE_PLANNING_HEADERS);
    }

    getMissingCreditCardTransactionHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.transactions, CREDIT_CARD_TRANSACTION_HEADERS);
    }

    getMissingLiabilityTypeHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.liabilities, LIABILITY_TYPE_HEADERS);
    }

    getMissingLiabilityDetailHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.liabilities, LIABILITY_DETAIL_HEADERS);
    }

    getMissingCreditCardHeaders() {
      return [
        ...this.getMissingCreditCardTransactionHeaders().map((header) => `Transactions.${header}`),
        ...this.getMissingLiabilityTypeHeaders().map((header) => `Liabilities.${header}`)
      ];
    }

    getGratitudeSheetName() {
      return this.config.SHEETS.gratitude || "Gratitude";
    }

    getMissingGratitudeHeaders() {
      const headers = this.headers[this.getGratitudeSheetName()] || [];
      return GRATITUDE_HEADERS.filter((header) => !headers.includes(header));
    }

    isGratitudeSheetReady() {
      return !this.gratitudeLoadError && this.getMissingGratitudeHeaders().length === 0;
    }

    getTodoSheetName() {
      return this.config.SHEETS.todos || "Todos";
    }

    getHabitSheetName() {
      return this.config.SHEETS.habits || "Habits";
    }

    getHabitLogSheetName() {
      return this.config.SHEETS.habitLogs || "HabitLogs";
    }

    getBudgetSheetName() {
      return this.config.SHEETS.budgets || "Budgets";
    }

    getSinkingFundSheetName() {
      return this.config.SHEETS.sinkingFunds || "SinkingFunds";
    }

    getInsuranceSheetName() {
      return this.config.SHEETS.insurancePolicies || "InsurancePolicies";
    }

    getRetirementSheetName() {
      return this.config.SHEETS.retirementPlans || "RetirementPlans";
    }

    getMissingTodoHeaders() {
      const headers = this.headers[this.getTodoSheetName()] || [];
      return TODO_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingHabitHeaders() {
      const headers = this.headers[this.getHabitSheetName()] || [];
      return HABIT_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingHabitLogHeaders() {
      const headers = this.headers[this.getHabitLogSheetName()] || [];
      return HABIT_LOG_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingBudgetHeaders() {
      const headers = this.headers[this.getBudgetSheetName()] || [];
      return BUDGET_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingSinkingFundHeaders() {
      const headers = this.headers[this.getSinkingFundSheetName()] || [];
      return SINKING_FUND_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingInsuranceHeaders() {
      const headers = this.headers[this.getInsuranceSheetName()] || [];
      return INSURANCE_HEADERS.filter((header) => !headers.includes(header));
    }

    getMissingRetirementHeaders() {
      const headers = this.headers[this.getRetirementSheetName()] || [];
      return RETIREMENT_HEADERS.filter((header) => !headers.includes(header));
    }

    isTodoSheetReady() {
      return !this.todoLoadError && this.getMissingTodoHeaders().length === 0;
    }

    isHabitSheetReady() {
      return !this.habitLoadError
        && !this.habitLogLoadError
        && this.getMissingHabitHeaders().length === 0
        && this.getMissingHabitLogHeaders().length === 0;
    }

    isBudgetSheetReady() {
      return !this.budgetLoadError && this.getMissingBudgetHeaders().length === 0;
    }

    isSinkingFundSheetReady() {
      return !this.sinkingFundLoadError && this.getMissingSinkingFundHeaders().length === 0;
    }

    isInsuranceSheetReady() {
      return !this.insuranceLoadError && this.getMissingInsuranceHeaders().length === 0;
    }

    isRetirementSheetReady() {
      return !this.retirementLoadError && this.getMissingRetirementHeaders().length === 0;
    }

    buildRow(sheetName, record) {
      const headers = this.getHeaders(sheetName);
      const primaryIdHeader = headers[0];
      return headers.map((header) => {
        if (header === primaryIdHeader && header.endsWith("_id") && !record[header]) return createShortId();
        return normalizeCell(record[header]);
      });
    }

    rowInputOption(sheetName) {
      // Keep ISO dates and product/policy names literal in the new planning records.
      return [this.getInsuranceSheetName(), this.getRetirementSheetName(), this.config.SHEETS.investments, this.config.SHEETS.liabilities].includes(sheetName) ? "RAW" : "USER_ENTERED";
    }

    async append(sheetName, record) {
      const row = this.buildRow(sheetName, record);
      const range = `${quoteSheet(sheetName)}!A1`;
      const result = await this.request(`/values/${encodeURIComponent(range)}:append`, {
        method: "POST",
        query: {
          valueInputOption: this.rowInputOption(sheetName),
          insertDataOption: "INSERT_ROWS"
        },
        body: { majorDimension: "ROWS", values: [row] }
      });
      return {
        ...result,
        rowNumber: parseUpdatedRow(result?.updates?.updatedRange)
      };
    }

    async update(sheetName, rowNumber, record) {
      const headers = this.getHeaders(sheetName);
      const row = this.buildRow(sheetName, record);
      const endColumn = columnLetter(headers.length);
      const range = `${quoteSheet(sheetName)}!A${rowNumber}:${endColumn}${rowNumber}`;
      return this.request(`/values/${encodeURIComponent(range)}`, {
        method: "PUT",
        query: { valueInputOption: this.rowInputOption(sheetName) },
        body: { majorDimension: "ROWS", values: [row] }
      });
    }

    async loadSheetIds() {
      if (Object.keys(this.sheetIds).length) return;
      const response = await this.request("", {
        query: { fields: "sheets.properties(sheetId,title)" }
      });
      (response.sheets || []).forEach(({ properties }) => {
        this.sheetIds[properties.title] = properties.sheetId;
      });
    }

    async delete(sheetName, rowNumber) {
      await this.loadSheetIds();
      const sheetId = this.sheetIds[sheetName];
      if (sheetId === undefined) throw new Error(`ไม่พบชีต ${sheetName}`);
      if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error("ตำแหน่งแถวไม่ถูกต้อง");

      return this.request(":batchUpdate", {
        method: "POST",
        body: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber
              }
            }
          }]
        }
      });
    }

    getAccountRows() {
      if (!this.currentData) throw new Error("ยังไม่ได้โหลดข้อมูลล่าสุดจาก Google Sheet");
      return this.currentData.accounts || [];
    }

    buildAccountIndex() {
      const index = new Map();
      this.getAccountRows().forEach((account) => {
        const name = normalizeName(account.account_name);
        if (!name) return;
        const key = accountKey(name);
        if (index.has(key)) {
          const error = new Error(`พบชื่อบัญชีซ้ำ “${name}” กรุณาแก้ชื่อในชีต Accounts ให้ไม่ซ้ำก่อนทำรายการ`);
          error.code = "DUPLICATE_ACCOUNT_NAME";
          throw error;
        }
        index.set(key, account);
      });
      return index;
    }

    findAccountByName(name) {
      const normalized = normalizeName(name);
      const account = this.buildAccountIndex().get(accountKey(normalized));
      if (!account) {
        const error = new Error(`ไม่พบบัญชี “${normalized || "ไม่ระบุชื่อ"}” ในชีต Accounts`);
        error.code = "ACCOUNT_NOT_FOUND";
        throw error;
      }
      return account;
    }

    isAccountReferencedByTransaction(name) {
      const key = accountKey(name);
      return (this.currentData?.transactions || []).some((transaction) => {
        return accountKey(transaction.account_from) === key || accountKey(transaction.account_to) === key;
      });
    }

    isAccountReferencedByGoal(name) {
      const key = accountKey(name);
      return (this.currentData?.goals || []).some((goal) => {
        const source = normalizeGoalProgressSource(goal.progress_source);
        return source === "Account" && accountKey(goal.linked_account) === key;
      });
    }

    isAccountReferencedByInvestment(name) {
      const key = accountKey(name);
      return (this.currentData?.investments || []).some((investment) => {
        return this.isAccountLinkedInvestment(investment)
          && accountKey(investment.account_from) === key;
      });
    }

    isAccountReferencedBySinkingFund(name) {
      const key = accountKey(name);
      return (this.currentData?.sinkingFunds || []).some((fund) => {
        return normalizeGoalProgressSource(fund.progress_source) === "Account"
          && accountKey(fund.linked_account) === key;
      });
    }

    isAccountReferenced(name) {
      return this.isAccountReferencedByTransaction(name)
        || this.isAccountReferencedByGoal(name)
        || this.isAccountReferencedByInvestment(name)
        || this.isAccountReferencedBySinkingFund(name);
    }

    accountReferenceLabel(name) {
      const references = [];
      if (this.isAccountReferencedByTransaction(name)) references.push("Transaction");
      if (this.isAccountReferencedByGoal(name)) references.push("Goal");
      if (this.isAccountReferencedByInvestment(name)) references.push("Investment");
      if (this.isAccountReferencedBySinkingFund(name)) references.push("Sinking Fund");
      return references.join(" และ ") || "ข้อมูลอื่น";
    }

    validateAccountRecord(record, existingRecord = null) {
      const missingHeaders = this.getMissingAccountRoleHeaders();
      if (missingHeaders.length) {
        const error = new Error(
          `ชีต Accounts ยังขาด Header: ${missingHeaders.join(", ")} `
          + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกบัญชี"
        );
        error.code = "ACCOUNT_ROLE_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }
      const name = normalizeName(record?.account_name);
      if (!name) throw new Error("กรุณาระบุชื่อบัญชี");
      const accountRole = normalizeAccountRole(record?.account_role);
      if (!ACCOUNT_ROLES.has(accountRole)) throw new Error("กรุณาเลือกหน้าที่ของบัญชี");

      const rows = this.getAccountRows();
      this.buildAccountIndex();
      const duplicate = rows.find((account) => {
        return account._rowNumber !== existingRecord?._rowNumber
          && accountKey(account.account_name) === accountKey(name);
      });
      if (duplicate) {
        const error = new Error(`มีบัญชีชื่อ “${name}” อยู่แล้ว ชื่อบัญชีต้องไม่ซ้ำกัน`);
        error.code = "DUPLICATE_ACCOUNT_NAME";
        throw error;
      }

      const oldName = normalizeName(existingRecord?.account_name);
      if (oldName && accountKey(oldName) !== accountKey(name) && this.isAccountReferenced(oldName)) {
        const referenceLabel = this.accountReferenceLabel(oldName);
        const error = new Error(`เปลี่ยนชื่อบัญชี “${oldName}” ไม่ได้ เพราะมี ${referenceLabel} อ้างถึงชื่อนี้อยู่`);
        error.code = "ACCOUNT_NAME_REFERENCED";
        throw error;
      }
      return { ...record, account_name: name, account_role: accountRole };
    }

    async appendAccount(record) {
      const validated = this.validateAccountRecord(record);
      return this.append(this.config.SHEETS.accounts, validated);
    }

    async updateAccountRecord(rowNumber, existingRecord, record) {
      const validated = this.validateAccountRecord(record, existingRecord);
      return this.update(this.config.SHEETS.accounts, rowNumber, {
        ...existingRecord,
        ...validated
      });
    }

    async deleteAccount(rowNumber) {
      this.buildAccountIndex();
      const account = this.getAccountRows().find((row) => row._rowNumber === rowNumber);
      if (!account) throw new Error("ไม่พบบัญชีที่ต้องการลบ");
      if (this.isAccountReferenced(account.account_name)) {
        const referenceLabel = this.accountReferenceLabel(account.account_name);
        const error = new Error(`ลบบัญชี “${account.account_name}” ไม่ได้ เพราะยังมี ${referenceLabel} อ้างถึงบัญชีนี้`);
        error.code = "ACCOUNT_REFERENCED";
        throw error;
      }
      return this.delete(this.config.SHEETS.accounts, rowNumber);
    }

    getLiabilityRows() {
      if (!this.currentData) throw new Error("ยังไม่ได้โหลดข้อมูลล่าสุดจาก Google Sheet");
      return this.currentData.liabilities || [];
    }

    isCreditCardLiability(record) {
      return normalizeLiabilityType(record?.liability_type, record?.liability_name) === "CreditCard";
    }

    buildLiabilityIndex({ creditCardsOnly = false } = {}) {
      const index = new Map();
      this.getLiabilityRows().forEach((liability) => {
        if (creditCardsOnly && !this.isCreditCardLiability(liability)) return;
        const name = normalizeName(liability.liability_name);
        if (!name) return;
        const key = accountKey(name);
        if (index.has(key)) {
          const error = new Error(`พบชื่อหนี้สินซ้ำ “${name}” กรุณาแก้ชื่อในชีต Liabilities ให้ไม่ซ้ำก่อนทำรายการ`);
          error.code = "DUPLICATE_LIABILITY_NAME";
          throw error;
        }
        index.set(key, liability);
      });
      return index;
    }

    getCreditCardRows() {
      return this.getLiabilityRows().filter((row) => this.isCreditCardLiability(row));
    }

    findCreditCardByName(name) {
      const normalized = normalizeName(name);
      const card = this.buildLiabilityIndex({ creditCardsOnly: true }).get(accountKey(normalized));
      if (!card) {
        const error = new Error(`ไม่พบบัตรเครดิต “${normalized || "ไม่ระบุชื่อ"}” ในชีต Liabilities`);
        error.code = "CREDIT_CARD_NOT_FOUND";
        throw error;
      }
      return card;
    }

    isLiabilityReferencedByTransaction(name) {
      const key = accountKey(name);
      return (this.currentData?.transactions || []).some((transaction) => {
        return accountKey(transaction.credit_card) === key;
      });
    }

    validateLiabilityRecord(record, existingRecord = null) {
      const missingHeaders = [
        ...this.getMissingLiabilityTypeHeaders(),
        ...this.getMissingLiabilityDetailHeaders()
      ];
      if (missingHeaders.length) {
        const error = new Error(
          `ชีต Liabilities ยังขาด Header: ${missingHeaders.join(", ")} `
          + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกหนี้สินรุ่นนี้"
        );
        error.code = "LIABILITY_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }

      const name = normalizeName(record?.liability_name);
      if (!name) throw new Error("กรุณาระบุชื่อหนี้สิน");
      const duplicate = this.getLiabilityRows().find((row) => {
        return row._rowNumber !== existingRecord?._rowNumber
          && accountKey(row.liability_name) === accountKey(name);
      });
      if (duplicate) {
        const error = new Error(`มีหนี้สินชื่อ “${name}” อยู่แล้ว ชื่อต้องไม่ซ้ำกัน`);
        error.code = "DUPLICATE_LIABILITY_NAME";
        throw error;
      }

      const oldName = normalizeName(existingRecord?.liability_name);
      if (oldName && accountKey(oldName) !== accountKey(name) && this.isLiabilityReferencedByTransaction(oldName)) {
        const error = new Error(`เปลี่ยนชื่อ “${oldName}” ไม่ได้ เพราะมี Transaction บัตรเครดิตอ้างถึงชื่อนี้อยู่`);
        error.code = "LIABILITY_NAME_REFERENCED";
        throw error;
      }

      const liabilityType = normalizeLiabilityType(record?.liability_type, name);
      const totalAmount = roundMoney(record?.total_amount);
      const monthlyPayment = liabilityType === "CreditCard" ? 0 : roundMoney(record?.monthly_payment);
      const categoryRaw = normalizeName(record?.debt_category);
      const categoryAliases = { mortgage: "Mortgage", auto: "Auto", creditcard: "CreditCard", credit_card: "CreditCard", personal: "Personal", education: "Education", business: "Business", other: "Other" };
      const debtCategory = liabilityType === "CreditCard"
        ? "CreditCard"
        : categoryAliases[categoryRaw.toLowerCase()] || categoryRaw;
      const originalAmount = roundMoney(record?.original_amount);
      const interestRate = hasCellValue(record?.interest_rate) ? toMoney(record.interest_rate) : "";
      const paymentDay = normalizeName(record?.payment_day) ? Number(record.payment_day) : "";
      const creditLimit = liabilityType === "CreditCard" ? roundMoney(record?.credit_limit) : "";
      const startDate = normalizeName(record?.start_date);
      const dueDate = normalizeName(record?.due_date);
      if (!DEBT_CATEGORIES.has(debtCategory)) throw new Error("กรุณาเลือกประเภทหนี้");
      if (totalAmount < 0 || monthlyPayment < 0 || originalAmount < 0 || creditLimit < 0) throw new Error("ยอดหนี้ ค่างวด เงินต้นเดิม และวงเงินต้องไม่ติดลบ");
      if (interestRate < 0 || interestRate > 100) throw new Error("อัตราดอกเบี้ยต้องอยู่ระหว่าง 0–100% ต่อปี");
      if (paymentDay !== "" && (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31)) throw new Error("วันชำระต้องอยู่ระหว่างวันที่ 1–31");
      if (!isValidIsoDate(startDate, true) || !isValidIsoDate(dueDate, true)) throw new Error("วันที่เริ่มหรือวันครบกำหนดหนี้ไม่ถูกต้อง");
      return {
        ...record,
        liability_name: name,
        liability_type: liabilityType,
        total_amount: totalAmount,
        monthly_payment: monthlyPayment,
        debt_category: debtCategory,
        original_amount: originalAmount,
        interest_rate: interestRate,
        start_date: startDate,
        due_date: dueDate,
        payment_day: paymentDay,
        credit_limit: creditLimit,
        linked_asset: normalizeName(record?.linked_asset)
      };
    }

    async appendLiability(record) {
      return this.append(this.config.SHEETS.liabilities, this.validateLiabilityRecord(record));
    }

    async updateLiabilityRecord(rowNumber, existingRecord, record) {
      const validated = this.validateLiabilityRecord({ ...existingRecord, ...record }, existingRecord);
      return this.update(this.config.SHEETS.liabilities, rowNumber, validated);
    }

    async deleteCreditCard(rowNumber) {
      const card = this.getCreditCardRows().find((row) => row._rowNumber === rowNumber);
      if (!card) throw new Error("ไม่พบบัตรเครดิตที่ต้องการลบ");
      return this.delete(this.config.SHEETS.liabilities, rowNumber);
    }

    getGratitudeRows() {
      return this.currentData?.gratitude || [];
    }

    validateGratitudeEntry(record) {
      const date = normalizeName(record?.date);
      const slot = Number(record?.slot);
      const category = normalizeName(record?.category);
      const gratitudeText = normalizeName(record?.gratitude_text);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("วันที่บันทึกคำขอบคุณไม่ถูกต้อง");
      if (![1, 2, 3].includes(slot)) throw new Error("ลำดับคำขอบคุณต้องอยู่ระหว่าง 1–3");
      if (!GRATITUDE_CATEGORIES.has(category)) throw new Error(`หมวดหมู่คำขอบคุณ “${category}” ไม่ถูกต้อง`);
      if (!gratitudeText) throw new Error(`กรุณาระบุข้อความขอบคุณเรื่องที่ ${slot}`);
      if (gratitudeText.length > 500) throw new Error("ข้อความขอบคุณแต่ละเรื่องยาวได้ไม่เกิน 500 ตัวอักษร");
      return { ...record, date, slot, category, gratitude_text: gratitudeText };
    }

    async saveDailyGratitude(dateValue, entries) {
      const missingHeaders = this.getMissingGratitudeHeaders();
      if (missingHeaders.length || this.gratitudeLoadError) {
        const error = new Error(
          `ระบบขอบคุณวันนี้ยังไม่พร้อม กรุณาสร้างชีต Gratitude และ Header: ${GRATITUDE_HEADERS.join(", ")}`
        );
        error.code = "GRATITUDE_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }

      const date = normalizeName(dateValue);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("กรุณาเลือกวันที่");
      const normalizedEntries = (entries || []).map((entry) => ({
        slot: Number(entry?.slot),
        category: normalizeName(entry?.category),
        gratitude_text: normalizeName(entry?.gratitude_text)
      }));
      const filledEntries = normalizedEntries
        .filter((entry) => entry.category || entry.gratitude_text)
        .map((entry) => this.validateGratitudeEntry({ ...entry, date }));
      const slots = new Set(filledEntries.map((entry) => entry.slot));
      if (slots.size !== filledEntries.length) throw new Error("พบลำดับคำขอบคุณซ้ำ");

      const existingRows = this.getGratitudeRows().filter((row) => normalizeName(row.date) === date);
      const existingBySlot = new Map();
      existingRows.forEach((row) => {
        const slot = Number(row.slot);
        if (existingBySlot.has(slot)) {
          const error = new Error(`พบข้อมูลขอบคุณวันที่ ${date} เรื่องที่ ${slot} ซ้ำ กรุณาแก้ใน Google Sheet ก่อน`);
          error.code = "DUPLICATE_GRATITUDE_SLOT";
          throw error;
        }
        existingBySlot.set(slot, row);
      });
      if (!filledEntries.length && !existingRows.length) throw new Error("กรุณาบันทึกสิ่งที่อยากขอบคุณอย่างน้อย 1 เรื่อง");

      const now = new Date().toISOString();
      const sheetName = this.getGratitudeSheetName();
      const updates = [];
      const appends = [];
      filledEntries.forEach((entry) => {
        const existing = existingBySlot.get(entry.slot);
        const record = {
          ...(existing || {}),
          ...entry,
          gratitude_id: existing?.gratitude_id || `grat-${date.replace(/-/g, "")}-${entry.slot}`,
          created_at: existing?.created_at || now,
          updated_at: now
        };
        if (existing?._rowNumber) updates.push({ rowNumber: existing._rowNumber, record });
        else appends.push(record);
      });
      const filledSlots = new Set(filledEntries.map((entry) => entry.slot));
      const deletes = existingRows
        .filter((row) => !filledSlots.has(Number(row.slot)))
        .sort((a, b) => b._rowNumber - a._rowNumber);

      for (const item of updates) await this.update(sheetName, item.rowNumber, item.record);
      for (const record of appends) await this.append(sheetName, record);
      for (const row of deletes) await this.delete(sheetName, row._rowNumber);
      return { saved: filledEntries.length, deleted: deletes.length };
    }

    getTodoRows() {
      return this.currentData?.todos || [];
    }

    validateTodoRecord(record, existingRecord = null) {
      if (!this.isTodoSheetReady()) {
        const error = new Error(`ระบบ Todo ยังไม่พร้อม กรุณาสร้างชีต Todos และ Header: ${TODO_HEADERS.join(", ")}`);
        error.code = "TODO_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = this.getMissingTodoHeaders();
        throw error;
      }
      const date = normalizeName(record?.date);
      const category = normalizeName(record?.category);
      const taskText = normalizeName(record?.task_text);
      const parentTodoId = normalizeName(record?.parent_todo_id);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("วันที่ Todo ไม่ถูกต้อง");
      if (!TODO_CATEGORIES.has(category)) throw new Error("กรุณาเลือกประเภท Todo");
      if (!taskText) throw new Error("กรุณาระบุสิ่งที่ต้องทำ");
      if (taskText.length > 300) throw new Error("ข้อความ Todo ยาวได้ไม่เกิน 300 ตัวอักษร");
      if (parentTodoId) {
        const parent = this.getTodoRows().find((row) => normalizeName(row.todo_id) === parentTodoId);
        if (!parent) throw new Error("ไม่พบโปรเจกหลักของงานย่อยนี้");
        if (normalizeName(parent.parent_todo_id)) throw new Error("ระบบรองรับ Todo ย่อยหนึ่งระดับเท่านั้น");
        if (normalizeName(parent.category) !== "โปรเจก") throw new Error("Todo ย่อยต้องอ้างอิงรายการประเภทโปรเจก");
        if (existingRecord?.todo_id && existingRecord.todo_id === parentTodoId) throw new Error("Todo ไม่สามารถอ้างอิงตัวเองได้");
      }
      const now = new Date().toISOString();
      const completed = isYes(record?.is_completed);
      return {
        ...(existingRecord || {}),
        ...record,
        todo_id: existingRecord?.todo_id || record?.todo_id || `todo-${date.replace(/-/g, "")}-${createShortId()}`,
        date,
        category: parentTodoId ? "โปรเจก" : category,
        task_text: taskText,
        parent_todo_id: parentTodoId,
        is_important: isYes(record?.is_important) ? "Yes" : "No",
        is_completed: completed ? "Yes" : "No",
        completed_at: completed ? (record?.completed_at || now) : "",
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendTodo(record) {
      return this.append(this.getTodoSheetName(), this.validateTodoRecord(record));
    }

    async updateTodoRecord(rowNumber, existingRecord, patch) {
      return this.update(
        this.getTodoSheetName(),
        rowNumber,
        this.validateTodoRecord({ ...existingRecord, ...patch }, existingRecord)
      );
    }

    async deleteTodo(rowNumber) {
      return this.delete(this.getTodoSheetName(), rowNumber);
    }

    getHabitRows() {
      return this.currentData?.habits || [];
    }

    getHabitLogRows() {
      return this.currentData?.habitLogs || [];
    }

    validateHabitRecord(record, existingRecord = null) {
      if (!this.isHabitSheetReady()) {
        const error = new Error("ระบบ Habit ยังไม่พร้อม กรุณาสร้างชีต Habits และ HabitLogs ตาม TODAY_MIGRATION.md");
        error.code = "HABIT_SCHEMA_MIGRATION_REQUIRED";
        throw error;
      }
      const habitName = normalizeName(record?.habit_name);
      const frequency = normalizeName(record?.frequency);
      if (!habitName) throw new Error("กรุณาระบุชื่อ Habit");
      if (habitName.length > 200) throw new Error("ชื่อ Habit ยาวได้ไม่เกิน 200 ตัวอักษร");
      if (!HABIT_FREQUENCIES.has(frequency)) throw new Error("ความถี่ Habit ไม่ถูกต้อง");
      const now = new Date().toISOString();
      return {
        ...(existingRecord || {}),
        ...record,
        habit_id: existingRecord?.habit_id || record?.habit_id || `habit-${createShortId()}`,
        habit_name: habitName,
        frequency,
        active: record?.active === undefined || record?.active === "" || isYes(record?.active) ? "Yes" : "No",
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendHabit(record) {
      return this.append(this.getHabitSheetName(), this.validateHabitRecord(record));
    }

    async archiveHabit(rowNumber, existingRecord) {
      if (!existingRecord) throw new Error("ไม่พบ Habit ที่ต้องการพัก");
      return this.update(this.getHabitSheetName(), rowNumber, {
        ...existingRecord,
        active: "No",
        updated_at: new Date().toISOString()
      });
    }

    habitPeriodKey(dateValue, frequency) {
      return habitPeriodKey(dateValue, frequency);
    }

    async setHabitCompletion(habit, dateValue, completed) {
      if (!this.isHabitSheetReady()) throw new Error("ระบบ Habit ยังไม่พร้อม กรุณาทำ TODAY_MIGRATION.md ก่อน");
      const habitId = normalizeName(habit?.habit_id);
      if (!habitId) throw new Error("Habit ไม่มี habit_id");
      const date = normalizeName(dateValue);
      const periodKey = habitPeriodKey(date, normalizeName(habit?.frequency));
      const duplicates = this.getHabitLogRows().filter((row) => {
        return normalizeName(row.habit_id) === habitId && normalizeName(row.period_key) === periodKey;
      });
      if (duplicates.length > 1) throw new Error(`พบ HabitLogs ซ้ำสำหรับรอบ ${periodKey} กรุณาแก้ใน Google Sheet`);
      const existing = duplicates[0];
      if (!completed) {
        if (existing?._rowNumber) return this.delete(this.getHabitLogSheetName(), existing._rowNumber);
        return { skipped: true };
      }
      const now = new Date().toISOString();
      const record = {
        ...(existing || {}),
        habit_log_id: existing?.habit_log_id || `hlog-${createShortId()}`,
        habit_id: habitId,
        period_key: periodKey,
        completed_date: date,
        completed_at: now,
        created_at: existing?.created_at || now,
        updated_at: now
      };
      if (existing?._rowNumber) return this.update(this.getHabitLogSheetName(), existing._rowNumber, record);
      return this.append(this.getHabitLogSheetName(), record);
    }

    getBudgetRows() {
      return this.currentData?.budgets || [];
    }

    validateBudgetRecord(record, existingRecord = null) {
      if (!this.isBudgetSheetReady()) {
        const error = new Error(`ระบบงบประมาณยังไม่พร้อม กรุณาสร้างชีต Budgets และ Header: ${BUDGET_HEADERS.join(", ")}`);
        error.code = "BUDGET_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = this.getMissingBudgetHeaders();
        throw error;
      }
      const month = normalizeName(record?.month);
      const expenseGroup = normalizeExpenseGroup(record?.expense_group);
      const amount = roundMoney(record?.budget_amount);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("เดือนของงบประมาณไม่ถูกต้อง");
      if (!EXPENSE_GROUPS.has(expenseGroup)) throw new Error("กรุณาเลือกกลุ่มรายจ่ายของงบประมาณ");
      if (!(amount > 0)) throw new Error("วงเงินงบประมาณต้องมากกว่า 0 บาท");
      const duplicate = this.getBudgetRows().find((row) => {
        return row._rowNumber !== existingRecord?._rowNumber
          && normalizeName(row.month) === month
          && normalizeExpenseGroup(row.expense_group) === expenseGroup;
      });
      if (duplicate) throw new Error("เดือนและกลุ่มรายจ่ายนี้มีงบประมาณอยู่แล้ว กรุณาแก้แถวเดิม");
      const now = new Date().toISOString();
      return {
        ...(existingRecord || {}),
        ...record,
        budget_id: existingRecord?.budget_id || record?.budget_id || `budget-${month.replace("-", "")}-${createShortId()}`,
        month,
        expense_group: expenseGroup,
        budget_amount: amount,
        note: normalizeName(record?.note),
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendBudget(record) {
      return this.append(this.getBudgetSheetName(), this.validateBudgetRecord(record));
    }

    async updateBudgetRecord(rowNumber, existingRecord, record) {
      return this.update(
        this.getBudgetSheetName(),
        rowNumber,
        this.validateBudgetRecord({ ...existingRecord, ...record }, existingRecord)
      );
    }

    getSinkingFundRows() {
      return this.currentData?.sinkingFunds || [];
    }

    validateSinkingFundRecord(record, existingRecord = null) {
      if (!this.isSinkingFundSheetReady()) {
        const error = new Error(`ระบบเงินเตรียมรายจ่ายยังไม่พร้อม กรุณาสร้างชีต SinkingFunds และ Header: ${SINKING_FUND_HEADERS.join(", ")}`);
        error.code = "SINKING_FUND_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = this.getMissingSinkingFundHeaders();
        throw error;
      }
      const fundName = normalizeName(record?.fund_name);
      const targetAmount = roundMoney(record?.target_amount);
      const currentAmount = roundMoney(record?.current_amount);
      const dueDate = normalizeName(record?.due_date);
      const progressSource = normalizeSinkingFundSource(record?.progress_source);
      const expenseGroup = normalizeExpenseGroup(record?.expense_group);
      const status = normalizeSinkingFundStatus(record?.status || "Active");
      let linkedAccount = "";
      if (!fundName) throw new Error("กรุณาระบุชื่อเงินเตรียมรายจ่าย");
      if (!(targetAmount > 0)) throw new Error("ยอดเป้าหมายต้องมากกว่า 0 บาท");
      if (currentAmount < 0) throw new Error("ยอดสะสมติดลบไม่ได้");
      const dueParts = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const dueValue = dueParts
        ? new Date(Date.UTC(Number(dueParts[1]), Number(dueParts[2]) - 1, Number(dueParts[3])))
        : null;
      if (
        !dueParts
        || dueValue.getUTCFullYear() !== Number(dueParts[1])
        || dueValue.getUTCMonth() !== Number(dueParts[2]) - 1
        || dueValue.getUTCDate() !== Number(dueParts[3])
      ) throw new Error("วันครบกำหนดไม่ถูกต้อง");
      if (!SINKING_FUND_SOURCES.has(progressSource)) throw new Error("แหล่งติดตามเงินเตรียมรายจ่ายไม่ถูกต้อง");
      if (!EXPENSE_GROUPS.has(expenseGroup)) throw new Error("กรุณาเลือกกลุ่มรายจ่าย");
      if (!SINKING_FUND_STATUSES.has(status)) throw new Error("สถานะเงินเตรียมรายจ่ายไม่ถูกต้อง");
      if (progressSource === "Account") {
        const account = this.findAccountByName(record?.linked_account);
        if (normalizeAccountRole(account.account_role) !== "SinkingFund") {
          throw new Error(`บัญชี “${account.account_name}” ต้องกำหนดหน้าที่เป็น เงินเตรียมรายจ่าย ก่อนเชื่อม`);
        }
        linkedAccount = normalizeName(account.account_name);
        const linkedDuplicate = this.getSinkingFundRows().find((row) => {
          return row._rowNumber !== existingRecord?._rowNumber
            && normalizeSinkingFundSource(row.progress_source) === "Account"
            && accountKey(row.linked_account) === accountKey(linkedAccount);
        });
        if (linkedDuplicate) {
          throw new Error(`บัญชี “${linkedAccount}” ถูกเชื่อมกับเงินเตรียมรายจ่ายรายการอื่นแล้ว กรุณาใช้บัญชีแยกหรือเลือกกรอกยอดเอง`);
        }
      }
      const duplicate = this.getSinkingFundRows().find((row) => {
        return row._rowNumber !== existingRecord?._rowNumber
          && accountKey(row.fund_name) === accountKey(fundName)
          && normalizeName(row.due_date) === dueDate;
      });
      if (duplicate) throw new Error("ชื่อและวันครบกำหนดนี้มีรายการเงินเตรียมรายจ่ายอยู่แล้ว");
      const now = new Date().toISOString();
      return {
        ...(existingRecord || {}),
        ...record,
        fund_id: existingRecord?.fund_id || record?.fund_id || `fund-${createShortId()}`,
        fund_name: fundName,
        target_amount: targetAmount,
        current_amount: progressSource === "Manual" ? currentAmount : (existingRecord?.current_amount || ""),
        due_date: dueDate,
        progress_source: progressSource,
        linked_account: linkedAccount,
        expense_group: expenseGroup,
        status,
        note: normalizeName(record?.note),
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendSinkingFund(record) {
      return this.append(this.getSinkingFundSheetName(), this.validateSinkingFundRecord(record));
    }

    async updateSinkingFundRecord(rowNumber, existingRecord, record) {
      return this.update(
        this.getSinkingFundSheetName(),
        rowNumber,
        this.validateSinkingFundRecord({ ...existingRecord, ...record }, existingRecord)
      );
    }

    getInsuranceRows() {
      return this.currentData?.insurancePolicies || [];
    }

    validateInsuranceRecord(record, existingRecord = null) {
      if (!this.isInsuranceSheetReady()) {
        const error = new Error(`ระบบประกันยังไม่พร้อม กรุณาสร้างชีต InsurancePolicies และ Header: ${INSURANCE_HEADERS.join(", ")}`);
        error.code = "INSURANCE_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = this.getMissingInsuranceHeaders();
        throw error;
      }
      const policyName = normalizeName(record?.policy_name);
      const insuranceType = normalizeName(record?.insurance_type);
      const status = normalizeName(record?.status || "Active");
      const coverageAmount = roundMoney(record?.coverage_amount);
      const annualPremium = roundMoney(record?.annual_premium);
      const startDate = normalizeName(record?.start_date);
      const renewalDate = normalizeName(record?.renewal_date);
      const endDate = normalizeName(record?.end_date);
      if (!policyName) throw new Error("กรุณาระบุชื่อกรมธรรม์");
      if (!INSURANCE_TYPES.has(insuranceType)) throw new Error("กรุณาเลือกประเภทประกัน");
      if (!INSURANCE_STATUSES.has(status)) throw new Error("สถานะกรมธรรม์ไม่ถูกต้อง");
      if (coverageAmount < 0 || annualPremium < 0) throw new Error("วงเงินคุ้มครองและเบี้ยประกันต้องไม่ติดลบ");
      if (![startDate, renewalDate, endDate].every((date) => isValidIsoDate(date, true))) throw new Error("วันที่กรมธรรม์ไม่ถูกต้อง");
      if (startDate && endDate && endDate < startDate) throw new Error("วันสิ้นสุดกรมธรรม์ต้องไม่ก่อนวันเริ่ม");
      const duplicate = this.getInsuranceRows().find((row) => {
        return row._rowNumber !== existingRecord?._rowNumber
          && accountKey(row.policy_name) === accountKey(policyName);
      });
      if (duplicate) throw new Error(`มีกรมธรรม์ชื่อ “${policyName}” อยู่แล้ว`);
      const now = new Date().toISOString();
      return {
        ...(existingRecord || {}),
        ...record,
        policy_id: existingRecord?.policy_id || record?.policy_id || `policy-${createShortId()}`,
        policy_name: policyName,
        insurance_type: insuranceType,
        insurer: normalizeName(record?.insurer),
        coverage_amount: coverageAmount,
        annual_premium: annualPremium,
        start_date: startDate,
        renewal_date: renewalDate,
        end_date: endDate,
        insured_person: normalizeName(record?.insured_person),
        status,
        note: normalizeName(record?.note),
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendInsurance(record) {
      return this.append(this.getInsuranceSheetName(), this.validateInsuranceRecord(record));
    }

    async updateInsuranceRecord(rowNumber, existingRecord, record) {
      return this.update(this.getInsuranceSheetName(), rowNumber, this.validateInsuranceRecord({ ...existingRecord, ...record }, existingRecord));
    }

    getRetirementRows() {
      return this.currentData?.retirementPlans || [];
    }

    validateRetirementRecord(record, existingRecord = null) {
      if (!this.isRetirementSheetReady()) {
        const error = new Error(`ระบบแผนเกษียณยังไม่พร้อม กรุณาสร้างชีต RetirementPlans และ Header: ${RETIREMENT_HEADERS.join(", ")}`);
        error.code = "RETIREMENT_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = this.getMissingRetirementHeaders();
        throw error;
      }
      const planName = normalizeName(record?.plan_name);
      const birthDate = normalizeName(record?.birth_date);
      const retirementAge = Number(record?.retirement_age);
      const monthlyExpense = roundMoney(record?.monthly_expense_today);
      const inflationRate = toMoney(record?.inflation_rate);
      const expectedReturn = toMoney(record?.expected_return);
      const withdrawalRate = toMoney(record?.withdrawal_rate);
      const monthlyContribution = roundMoney(record?.monthly_contribution);
      const status = normalizeName(record?.status || "Active");
      if (!planName) throw new Error("กรุณาระบุชื่อแผนเกษียณ");
      if (!isValidIsoDate(birthDate, false) || birthDate > new Date().toISOString().slice(0, 10)) throw new Error("วันเกิดไม่ถูกต้อง");
      if (!Number.isInteger(retirementAge) || retirementAge < 40 || retirementAge > 80) throw new Error("อายุเกษียณต้องอยู่ระหว่าง 40–80 ปี");
      if (!(monthlyExpense > 0)) throw new Error("ค่าใช้จ่ายต่อเดือนหลังเกษียณต้องมากกว่า 0 บาท");
      if ([inflationRate, expectedReturn].some((rate) => rate < 0 || rate > 30)) throw new Error("เงินเฟ้อและผลตอบแทนคาดหวังต้องอยู่ระหว่าง 0–30%");
      if (!(withdrawalRate > 0 && withdrawalRate <= 20)) throw new Error("อัตราถอนใช้ต้องมากกว่า 0 และไม่เกิน 20%");
      if (monthlyContribution < 0) throw new Error("เงินลงทุนต่อเดือนติดลบไม่ได้");
      if (!RETIREMENT_STATUSES.has(status)) throw new Error("สถานะแผนเกษียณไม่ถูกต้อง");
      const duplicateActive = status === "Active" && this.getRetirementRows().find((row) => {
        return row._rowNumber !== existingRecord?._rowNumber
          && normalizeName(row.status || "Active") === "Active";
      });
      if (duplicateActive) throw new Error("มีแผนเกษียณ Active อยู่แล้ว กรุณาพักแผนเดิมก่อนสร้างแผนใหม่");
      const now = new Date().toISOString();
      return {
        ...(existingRecord || {}),
        ...record,
        retirement_id: existingRecord?.retirement_id || record?.retirement_id || `retire-${createShortId()}`,
        plan_name: planName,
        birth_date: birthDate,
        retirement_age: retirementAge,
        monthly_expense_today: monthlyExpense,
        inflation_rate: inflationRate,
        expected_return: expectedReturn,
        withdrawal_rate: withdrawalRate,
        monthly_contribution: monthlyContribution,
        status,
        note: normalizeName(record?.note),
        created_at: existingRecord?.created_at || record?.created_at || now,
        updated_at: now
      };
    }

    async appendRetirement(record) {
      return this.append(this.getRetirementSheetName(), this.validateRetirementRecord(record));
    }

    async updateRetirementRecord(rowNumber, existingRecord, record) {
      return this.update(this.getRetirementSheetName(), rowNumber, this.validateRetirementRecord({ ...existingRecord, ...record }, existingRecord));
    }

    validateGoalRecord(record) {
      const missingHeaders = this.getMissingGoalMetadataHeaders();
      if (missingHeaders.length) {
        const error = new Error(
          `ชีต Goals ยังขาด Header: ${missingHeaders.join(", ")} `
          + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกเป้าหมายรุ่นนี้"
        );
        error.code = "GOAL_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }

      const goalName = normalizeName(record?.goal_name);
      if (!goalName) throw new Error("กรุณาระบุชื่อเป้าหมาย");
      const goalType = normalizeGoalType(record?.goal_type);
      const validated = {
        ...record,
        goal_name: goalName,
        goal_type: goalType
      };

      if (goalType === "Milestone") {
        validated.target_amount = "";
        validated.current_amount = "";
        validated.progress_source = "Status";
        validated.linked_account = "";
        validated.status = normalizeGoalStatus(record?.status);
        return validated;
      }

      const targetAmount = roundMoney(record?.target_amount);
      if (!(targetAmount > 0)) {
        const error = new Error("เงินเป้าหมายต้องมากกว่า 0 บาท");
        error.code = "INVALID_GOAL_TARGET";
        throw error;
      }
      const progressSource = normalizeGoalProgressSource(record?.progress_source);
      validated.target_amount = targetAmount;
      validated.progress_source = progressSource;
      validated.status = "";

      if (progressSource === "Account") {
        const account = this.findAccountByName(record?.linked_account);
        validated.linked_account = normalizeName(account.account_name);
        validated.current_amount = record?.current_amount ?? "";
      } else {
        const currentAmount = roundMoney(record?.current_amount);
        if (currentAmount < 0) {
          const error = new Error("ยอดสะสมต้องไม่ติดลบ");
          error.code = "INVALID_GOAL_CURRENT";
          throw error;
        }
        validated.current_amount = currentAmount;
        validated.linked_account = "";
      }
      return validated;
    }

    async appendGoal(record) {
      const validated = this.validateGoalRecord(record);
      return this.append(this.config.SHEETS.goals, validated);
    }

    async updateGoalRecord(rowNumber, existingRecord, record) {
      const validated = this.validateGoalRecord({
        ...existingRecord,
        ...record
      });
      return this.update(this.config.SHEETS.goals, rowNumber, validated);
    }

    isAccountLinkedInvestment(record) {
      return Boolean(normalizeName(record?.account_from) && roundMoney(record?.funded_amount) > 0);
    }

    validateInvestmentRecord(record, existingRecord = null) {
      const missingHeaders = [
        ...this.getMissingInvestmentFundingHeaders(),
        ...this.getMissingInvestmentPlanningHeaders()
      ];
      if (missingHeaders.length) {
        const error = new Error(
          `ชีต Investments ยังขาด Header: ${missingHeaders.join(", ")} `
          + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกการลงทุนรุ่นนี้"
        );
        error.code = "INVESTMENT_SCHEMA_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }

      const assetName = normalizeName(record?.asset_name);
      if (!assetName) throw new Error("กรุณาระบุชื่อสินทรัพย์ลงทุน");
      const accountFrom = normalizeName(record?.account_from);
      const fundedAmount = roundMoney(record?.funded_amount);
      const planning = validateInvestmentPlanning(record, { requireFields: true });
      const isLegacyUnlinked = Boolean(
        existingRecord
        && !normalizeName(existingRecord.account_from)
        && !(roundMoney(existingRecord.funded_amount) > 0)
      );

      if (!accountFrom) {
        if (!isLegacyUnlinked) {
          const error = new Error("กรุณาเลือกบัญชีที่ใช้เงินลงทุน");
          error.code = "INVESTMENT_ACCOUNT_REQUIRED";
          throw error;
        }
        return { ...record, ...planning, asset_name: assetName, account_from: "", funded_amount: "" };
      }
      if (!(fundedAmount > 0)) {
        const error = new Error("จำนวนเงินที่ใช้ลงทุนต้องมากกว่า 0 บาท");
        error.code = "INVALID_INVESTMENT_FUNDING";
        throw error;
      }

      const account = this.findAccountByName(accountFrom);
      return {
        ...record,
        ...planning,
        asset_name: assetName,
        account_from: normalizeName(account.account_name),
        funded_amount: fundedAmount
      };
    }

    getInvestmentEffects(record, multiplier = 1) {
      if (!this.isAccountLinkedInvestment(record)) return [];
      return [{
        accountName: normalizeName(record.account_from),
        delta: roundMoney(-roundMoney(record.funded_amount) * multiplier)
      }];
    }

    async appendInvestmentWithAccountEffects(record) {
      const investment = this.validateInvestmentRecord(record);
      const changes = await this.applyAccountEffects(this.getInvestmentEffects(investment));
      try {
        const result = await this.append(this.config.SHEETS.investments, investment);
        return { ...result, investment };
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, "การเพิ่ม Investment");
      }
    }

    async updateInvestmentWithAccountEffects(rowNumber, existingRecord, record) {
      const investment = this.validateInvestmentRecord({
        ...existingRecord,
        ...record
      }, existingRecord);
      const effects = [
        ...this.getInvestmentEffects(existingRecord, -1),
        ...this.getInvestmentEffects(investment)
      ];
      const changes = await this.applyAccountEffects(effects);
      try {
        return await this.update(this.config.SHEETS.investments, rowNumber, investment);
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, "การแก้ไข Investment");
      }
    }

    async deleteInvestmentWithAccountEffects(record) {
      if (!record?._rowNumber) throw new Error("ไม่พบตำแหน่ง Investment ที่ต้องการลบ");
      const changes = await this.applyAccountEffects(this.getInvestmentEffects(record, -1));
      try {
        return await this.delete(this.config.SHEETS.investments, record._rowNumber);
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, "การลบ Investment");
      }
    }

    async addInvestmentContribution(record) {
      const missingHeaders = [
        ...this.getMissingInvestmentFundingHeaders(),
        ...this.getMissingInvestmentPlanningHeaders()
      ];
      if (missingHeaders.length) {
        const error = new Error(
          `ชีต Investments ยังขาด Header: ${missingHeaders.join(", ")} `
          + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกการลงทุน"
        );
        error.code = "INVESTMENT_SCHEMA_MIGRATION_REQUIRED";
        throw error;
      }

      const amount = roundMoney(record?.funded_amount);
      if (!(amount > 0)) {
        const error = new Error("จำนวนเงินที่ใช้ลงทุนต้องมากกว่า 0 บาท");
        error.code = "INVALID_INVESTMENT_FUNDING";
        throw error;
      }
      const account = this.findAccountByName(record?.account_from);
      const accountName = normalizeName(account.account_name);
      const targetRow = Number(record?.investment_row);
      const existing = Number.isInteger(targetRow) && targetRow >= 2
        ? (this.currentData?.investments || []).find((row) => row._rowNumber === targetRow)
        : null;
      if (record?.investment_row !== "new" && !existing) {
        const error = new Error("ไม่พบสินทรัพย์ลงทุนที่เลือก กรุณาซิงก์ข้อมูลแล้วลองใหม่");
        error.code = "INVESTMENT_NOT_FOUND";
        throw error;
      }

      let action;
      let actionLabel;
      if (existing) {
        const existingAccount = normalizeName(existing.account_from);
        if (existingAccount && accountKey(existingAccount) !== accountKey(accountName)) {
          const error = new Error(
            `“${existing.asset_name || "สินทรัพย์นี้"}” ใช้บัญชีต้นทาง “${existingAccount}” อยู่แล้ว `
            + "กรุณาใช้บัญชีเดิมเพื่อให้ยอดย้อนหลังถูกต้อง"
          );
          error.code = "INVESTMENT_ACCOUNT_MISMATCH";
          throw error;
        }
        const planning = validateInvestmentPlanning({ ...existing, ...record, current_value: existing.current_value }, { requireFields: true });
        const updated = {
          ...existing,
          ...planning,
          account_from: existingAccount || accountName,
          principal_amount: roundMoney(planning.principal_amount + amount),
          funded_amount: roundMoney((existingAccount ? toMoney(existing.funded_amount) : 0) + amount),
          current_value: hasCellValue(existing.current_value)
            ? roundMoney(toMoney(existing.current_value) + amount)
            : ""
        };
        action = () => this.update(this.config.SHEETS.investments, existing._rowNumber, updated);
        actionLabel = `การเพิ่มเงินใน ${existing.asset_name || "Investment"}`;
      } else {
        const assetName = normalizeName(record?.asset_name);
        if (!assetName) throw new Error("กรุณาระบุชื่อสินทรัพย์ลงทุนใหม่");
        const duplicate = (this.currentData?.investments || []).find((row) => {
          return accountKey(row.asset_name) === accountKey(assetName);
        });
        if (duplicate) {
          const error = new Error(`มี “${assetName}” อยู่แล้ว กรุณาเลือกจากรายการสินทรัพย์เดิม`);
          error.code = "DUPLICATE_INVESTMENT_NAME";
          throw error;
        }
        const planning = validateInvestmentPlanning({ ...record, principal_amount: amount, valuation_mode: "Principal", current_value: "", income_received: "" }, { requireFields: true });
        const investment = {
          asset_name: assetName,
          category: "เงินลงทุน",
          units: "",
          avg_cost: "",
          current_price: "",
          current_value: "",
          tax_deductible: "",
          note: "",
          account_from: accountName,
          funded_amount: amount,
          ...planning
        };
        action = () => this.append(this.config.SHEETS.investments, investment);
        actionLabel = `การเพิ่ม ${assetName}`;
      }

      const changes = await this.applyAccountEffects([{ accountName, delta: -amount }]);
      try {
        return await action();
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, actionLabel);
      }
    }

    async updateInvestmentProfile(rowNumber, existingRecord, record) {
      const missingHeaders = this.getMissingInvestmentPlanningHeaders();
      if (missingHeaders.length) {
        const error = new Error(`ชีต Investments ยังขาด Header: ${missingHeaders.join(", ")}`);
        error.code = "INVESTMENT_PLANNING_MIGRATION_REQUIRED";
        error.missingHeaders = missingHeaders;
        throw error;
      }
      const planning = validateInvestmentPlanning({ ...existingRecord, ...record }, { requireFields: true });
      return this.update(this.config.SHEETS.investments, rowNumber, {
        ...existingRecord,
        ...planning,
        note: normalizeName(record?.note ?? existingRecord?.note)
      });
    }

    validateTransactionAccounts(record, { requireExpenseItem = true } = {}) {
      const amount = roundMoney(record?.amount);
      if (!(amount > 0)) {
        const error = new Error("จำนวนเงินต้องมากกว่า 0 บาท");
        error.code = "INVALID_AMOUNT";
        throw error;
      }

      const type = normalizeTransactionType(record?.type);
      if (!type) {
        const error = new Error("ประเภทรายการไม่ถูกต้อง");
        error.code = "INVALID_TRANSACTION_TYPE";
        throw error;
      }

      const validated = { ...record, amount };
      if (type === "income") {
        const accountTo = this.findAccountByName(record.account_to);
        validated.type = "Income";
        validated.account_from = "";
        validated.account_to = normalizeName(accountTo.account_name);
        validated.payment_method = "Account";
        validated.credit_card = "";
      } else if (type === "expense") {
        if (requireExpenseItem) {
          const missingHeaders = [
            ...this.getMissingTransactionItemHeaders(),
            ...this.getMissingExpensePlanningHeaders()
          ];
          if (missingHeaders.length) {
            const error = new Error(
              `ชีต Transactions ยังขาด Header: ${missingHeaders.join(", ")} `
              + "กรุณาเพิ่ม Header ต่อท้ายแถวที่ 1 ก่อนบันทึกรายจ่าย"
            );
            error.code = "TRANSACTION_SCHEMA_MIGRATION_REQUIRED";
            error.missingHeaders = missingHeaders;
            throw error;
          }
          validated.category = normalizeName(record.category);
          validated.item_name = normalizeName(record.item_name);
          validated.expense_group = normalizeExpenseGroup(record.expense_group);
          validated.is_essential = isYes(record.is_essential) ? "Yes" : "No";
          if (!validated.category) throw new Error("กรุณาเลือกหมวดหมู่รายจ่าย");
          if (!validated.item_name) throw new Error("กรุณาระบุรายการรายจ่าย");
          if (!EXPENSE_GROUPS.has(validated.expense_group)) throw new Error("กรุณาเลือกกลุ่มรายจ่ายระดับบน");
          if (!["yes", "no"].includes(String(record.is_essential || "").trim().toLowerCase())) {
            throw new Error("กรุณาระบุว่ารายจ่ายนี้จำเป็นหรือไม่");
          }
        }
        validated.type = "Expense";
        validated.account_to = "";
        const paymentMethod = normalizePaymentMethod(record.payment_method);
        if (paymentMethod === "CreditCard") {
          const missingHeaders = this.getMissingCreditCardHeaders();
          if (missingHeaders.length) {
            const error = new Error(
              `ระบบบัตรเครดิตยังขาด Header: ${missingHeaders.join(", ")} กรุณาทำ Migration v2.5.0 ก่อน`
            );
            error.code = "CREDIT_CARD_SCHEMA_MIGRATION_REQUIRED";
            error.missingHeaders = missingHeaders;
            throw error;
          }
          const card = this.findCreditCardByName(record.credit_card);
          validated.payment_method = "CreditCard";
          validated.credit_card = normalizeName(card.liability_name);
          validated.account_from = "";
        } else {
          const accountFrom = this.findAccountByName(record.account_from);
          validated.payment_method = "Account";
          validated.credit_card = "";
          validated.account_from = normalizeName(accountFrom.account_name);
        }
      } else if (type === "transfer") {
        const accountFrom = this.findAccountByName(record.account_from);
        const accountTo = this.findAccountByName(record.account_to);
        if (accountKey(accountFrom.account_name) === accountKey(accountTo.account_name)) {
          const error = new Error("บัญชีต้นทางและปลายทางของ Transfer ต้องเป็นคนละบัญชี");
          error.code = "SAME_TRANSFER_ACCOUNT";
          throw error;
        }
        validated.type = "Transfer";
        validated.account_from = normalizeName(accountFrom.account_name);
        validated.account_to = normalizeName(accountTo.account_name);
        validated.payment_method = "Account";
        validated.credit_card = "";
      } else {
        const missingHeaders = this.getMissingCreditCardHeaders();
        if (missingHeaders.length) {
          const error = new Error(
            `ระบบบัตรเครดิตยังขาด Header: ${missingHeaders.join(", ")} กรุณาทำ Migration v2.5.0 ก่อน`
          );
          error.code = "CREDIT_CARD_SCHEMA_MIGRATION_REQUIRED";
          error.missingHeaders = missingHeaders;
          throw error;
        }
        const accountFrom = this.findAccountByName(record.account_from);
        const card = this.findCreditCardByName(record.credit_card);
        const outstanding = roundMoney(card.total_amount);
        if (requireExpenseItem && amount > outstanding) {
          const error = new Error(
            `ยอดชำระ ${amount.toLocaleString("th-TH")} บาท มากกว่ายอดหนี้ของ “${card.liability_name}” `
            + `${outstanding.toLocaleString("th-TH")} บาท`
          );
          error.code = "PAYMENT_EXCEEDS_CARD_BALANCE";
          throw error;
        }
        validated.type = "CreditCardPayment";
        validated.category = "ชำระบัตรเครดิต";
        validated.item_name = normalizeName(record.item_name) || `ชำระ ${card.liability_name}`;
        validated.account_from = normalizeName(accountFrom.account_name);
        validated.account_to = "";
        validated.payment_method = "Account";
        validated.credit_card = normalizeName(card.liability_name);
      }
      if (type === "income" || type === "transfer" || type === "credit_card_payment") {
        if (type === "income" || type === "transfer") validated.item_name = "";
        validated.expense_group = "";
        validated.is_essential = "";
      }
      return validated;
    }

    getTransactionEffects(record, multiplier = 1) {
      const transaction = this.validateTransactionAccounts(record, { requireExpenseItem: false });
      const amount = roundMoney(transaction.amount * multiplier);
      const type = normalizeTransactionType(transaction.type);
      if (type === "income") {
        return [{ target: "account", name: transaction.account_to, delta: amount }];
      }
      if (type === "expense") {
        if (normalizePaymentMethod(transaction.payment_method) === "CreditCard") {
          return [{ target: "liability", name: transaction.credit_card, delta: amount }];
        }
        return [{ target: "account", name: transaction.account_from, delta: -amount }];
      }
      if (type === "credit_card_payment") {
        return [
          { target: "account", name: transaction.account_from, delta: -amount },
          { target: "liability", name: transaction.credit_card, delta: -amount }
        ];
      }
      return [
        { target: "account", name: transaction.account_from, delta: -amount },
        { target: "account", name: transaction.account_to, delta: amount }
      ];
    }

    prepareFinancialChanges(effects) {
      const accountIndex = this.buildAccountIndex();
      const liabilityIndex = this.buildLiabilityIndex({ creditCardsOnly: true });
      const totals = new Map();
      (effects || []).forEach((effect) => {
        const target = effect.target === "liability" ? "liability" : "account";
        const key = accountKey(effect.name);
        const mapKey = `${target}:${key}`;
        totals.set(mapKey, {
          target,
          key,
          delta: roundMoney((totals.get(mapKey)?.delta || 0) + toMoney(effect.delta))
        });
      });

      const changes = [];
      totals.forEach(({ target, key, delta }) => {
        if (!delta) return;
        if (target === "account") {
          const row = accountIndex.get(key);
          if (!row) throw new Error(`ไม่พบบัญชี “${key}” ในชีต Accounts`);
          const before = roundMoney(row.balance);
          const after = roundMoney(before + delta);
          if (after < 0) {
            const error = new Error(
              `ยอดเงินในบัญชี “${row.account_name}” ไม่เพียงพอ `
              + `(คงเหลือ ${before.toLocaleString("th-TH")} บาท)`
            );
            error.code = "INSUFFICIENT_ACCOUNT_BALANCE";
            throw error;
          }
          changes.push({ target, row, before, after });
          return;
        }

        const row = liabilityIndex.get(key);
        if (!row) throw new Error(`ไม่พบบัตรเครดิต “${key}” ในชีต Liabilities`);
        const before = roundMoney(row.total_amount);
        const after = roundMoney(before + delta);
        if (after < 0) {
          const error = new Error(`ยอดหนี้ของ “${row.liability_name}” ต่ำกว่ายอดที่ต้องย้อนหรือชำระ กรุณาตรวจรายการบัตรก่อน`);
          error.code = "NEGATIVE_CREDIT_CARD_BALANCE";
          throw error;
        }
        changes.push({ target, row, before, after });
      });
      return changes;
    }

    async writeFinancialChanges(changes, targetKey = "after") {
      if (!changes?.length) return;
      const accountHeaders = this.getHeaders(this.config.SHEETS.accounts);
      const liabilityHeaders = this.getHeaders(this.config.SHEETS.liabilities);
      const accountColumn = columnLetter(accountHeaders.indexOf("balance") + 1);
      const liabilityColumn = columnLetter(liabilityHeaders.indexOf("total_amount") + 1);
      if (!accountColumn) throw new Error("ไม่พบ Header balance ในชีต Accounts");
      if (!liabilityColumn) throw new Error("ไม่พบ Header total_amount ในชีต Liabilities");
      const data = changes.map((change) => {
        const isAccount = change.target === "account";
        const sheetName = isAccount ? this.config.SHEETS.accounts : this.config.SHEETS.liabilities;
        const column = isAccount ? accountColumn : liabilityColumn;
        return {
          range: `${quoteSheet(sheetName)}!${column}${change.row._rowNumber}`,
          majorDimension: "ROWS",
          values: [[roundMoney(change[targetKey])]]
        };
      });
      await this.request("/values:batchUpdate", {
        method: "POST",
        body: { valueInputOption: "USER_ENTERED", data }
      });
      changes.forEach((change) => {
        if (change.target === "account") change.row.balance = roundMoney(change[targetKey]);
        else change.row.total_amount = roundMoney(change[targetKey]);
      });
    }

    async applyFinancialEffects(effects) {
      const changes = this.prepareFinancialChanges(effects);
      await this.writeFinancialChanges(changes);
      return changes;
    }

    async rollbackFinancialChanges(changes, primaryError, actionLabel) {
      try {
        await this.writeFinancialChanges(changes, "before");
      } catch (rollbackError) {
        const error = new Error(
          `${actionLabel}ไม่สำเร็จ และย้อนยอดบัญชี/บัตรเครดิตไม่สำเร็จ `
          + "กรุณาหยุดทำรายการและ Reconcile กับข้อมูลจริงก่อน"
        );
        error.code = "ROLLBACK_FAILED";
        error.primaryError = primaryError;
        error.rollbackError = rollbackError;
        throw error;
      }
      throw primaryError;
    }

    prepareAccountBalanceChanges(effects) {
      const accountIndex = this.buildAccountIndex();
      const totals = new Map();
      (effects || []).forEach((effect) => {
        const key = accountKey(effect.accountName);
        totals.set(key, roundMoney((totals.get(key) || 0) + toMoney(effect.delta)));
      });

      const changes = [];
      totals.forEach((delta, key) => {
        if (!delta) return;
        const account = accountIndex.get(key);
        if (!account) throw new Error(`ไม่พบบัญชี “${key}” ในชีต Accounts`);
        const before = roundMoney(account.balance);
        const after = roundMoney(before + delta);
        if (after < 0) {
          const error = new Error(
            `ยอดเงินในบัญชี “${account.account_name}” ไม่เพียงพอ `
            + `(คงเหลือ ${before.toLocaleString("th-TH")} บาท)`
          );
          error.code = "INSUFFICIENT_ACCOUNT_BALANCE";
          throw error;
        }
        changes.push({ account, before, after });
      });
      return changes;
    }

    async writeAccountBalances(changes, targetKey = "after") {
      if (!changes?.length) return;
      const sheetName = this.config.SHEETS.accounts;
      const headers = this.getHeaders(sheetName);
      const balanceColumn = headers.indexOf("balance") + 1;
      if (!balanceColumn) throw new Error("ไม่พบ Header balance ในชีต Accounts");
      const column = columnLetter(balanceColumn);
      const data = changes.map((change) => ({
        range: `${quoteSheet(sheetName)}!${column}${change.account._rowNumber}`,
        majorDimension: "ROWS",
        values: [[roundMoney(change[targetKey])]]
      }));
      await this.request("/values:batchUpdate", {
        method: "POST",
        body: {
          valueInputOption: "USER_ENTERED",
          data
        }
      });
      changes.forEach((change) => {
        change.account.balance = roundMoney(change[targetKey]);
      });
    }

    async updateAccountBalance(accountName, balance) {
      const account = this.findAccountByName(accountName);
      const before = roundMoney(account.balance);
      const after = roundMoney(balance);
      if (after < 0) throw new Error(`ยอดบัญชี “${account.account_name}” ติดลบไม่ได้`);
      const changes = [{ account, before, after }];
      await this.writeAccountBalances(changes);
      return changes[0];
    }

    async applyAccountEffects(effects) {
      const changes = this.prepareAccountBalanceChanges(effects);
      await this.writeAccountBalances(changes);
      return changes;
    }

    async applyTransactionEffects(record) {
      return this.applyFinancialEffects(this.getTransactionEffects(record));
    }

    async reverseTransactionEffects(record) {
      return this.applyFinancialEffects(this.getTransactionEffects(record, -1));
    }

    async rollbackAccountChanges(changes, primaryError, actionLabel) {
      try {
        await this.writeAccountBalances(changes, "before");
      } catch (rollbackError) {
        const error = new Error(
          `${actionLabel}ไม่สำเร็จ และย้อนยอด Accounts ไม่สำเร็จ `
          + "ข้อมูลอาจไม่ตรงกัน กรุณาหยุดทำรายการและ Reconcile ยอดบัญชีกับธนาคารก่อน"
        );
        error.code = "ROLLBACK_FAILED";
        error.primaryError = primaryError;
        error.rollbackError = rollbackError;
        throw error;
      }
      throw primaryError;
    }

    isAccountLinkedTransaction(record) {
      const id = String(record?.tx_id || "");
      return id.startsWith(LINKED_TRANSACTION_PREFIX)
        || id.startsWith(CREDIT_CARD_EXPENSE_PREFIX)
        || id.startsWith(CREDIT_CARD_PAYMENT_PREFIX);
    }

    async appendTransactionWithAccountEffects(record) {
      const rawType = normalizeTransactionType(record?.type);
      const prefix = rawType === "credit_card_payment"
        ? CREDIT_CARD_PAYMENT_PREFIX
        : rawType === "expense" && normalizePaymentMethod(record?.payment_method) === "CreditCard"
          ? CREDIT_CARD_EXPENSE_PREFIX
          : LINKED_TRANSACTION_PREFIX;
      const transaction = this.validateTransactionAccounts({ ...record, tx_id: `${prefix}${createShortId()}` });
      const changes = await this.applyTransactionEffects(transaction);
      try {
        const result = await this.append(this.config.SHEETS.transactions, transaction);
        return { ...result, transaction };
      } catch (error) {
        return this.rollbackFinancialChanges(changes, error, "การเพิ่ม Transaction");
      }
    }

    async payCreditCard(record) {
      return this.appendTransactionWithAccountEffects({ ...record, type: "CreditCardPayment" });
    }

    async updateTransactionWithAccountEffects(rowNumber, existingRecord, record) {
      const transaction = this.validateTransactionAccounts({
        ...existingRecord,
        ...record,
        tx_id: existingRecord.tx_id
      });

      // Legacy transactions are record-only. Their historical effects are already
      // included in the opening balances and must never be replayed automatically.
      if (!this.isAccountLinkedTransaction(existingRecord)) {
        return this.update(this.config.SHEETS.transactions, rowNumber, transaction);
      }

      const effects = [
        ...this.getTransactionEffects(existingRecord, -1),
        ...this.getTransactionEffects(transaction)
      ];
      const changes = await this.applyFinancialEffects(effects);
      try {
        return await this.update(this.config.SHEETS.transactions, rowNumber, transaction);
      } catch (error) {
        return this.rollbackFinancialChanges(changes, error, "การแก้ไข Transaction");
      }
    }

    async deleteTransactionWithAccountEffects(record) {
      if (!record?._rowNumber) throw new Error("ไม่พบตำแหน่ง Transaction ที่ต้องการลบ");

      // Deleting a legacy row must not change opening balances.
      if (!this.isAccountLinkedTransaction(record)) {
        return this.delete(this.config.SHEETS.transactions, record._rowNumber);
      }

      const changes = await this.reverseTransactionEffects(record);
      try {
        return await this.delete(this.config.SHEETS.transactions, record._rowNumber);
      } catch (error) {
        return this.rollbackFinancialChanges(changes, error, "การลบ Transaction");
      }
    }

    async saveSettings(values) {
      const sheetName = this.config.SHEETS.settings;
      const existing = this.currentData?.settings || [];
      const descriptions = {
        monthly_budget: "งบใช้จ่ายต่อเดือน",
        emergency_months_target: "เป้าหมายเงินสำรองฉุกเฉิน (เดือน)",
        essential_expense_override: "ค่าใช้จ่ายจำเป็นต่อเดือน; เว้นว่างเพื่อใช้ Expense ที่ is_essential = Yes เฉลี่ย 3 เดือน",
        include_accounts_in_net_worth: "นับยอด Accounts รวมในความมั่งคั่งสุทธิ"
      };

      for (const [key, value] of Object.entries(values)) {
        const matched = existing.find((row) => String(row.key) === key);
        const record = {
          key,
          value: normalizeCell(value),
          description: descriptions[key] || ""
        };
        if (matched?._rowNumber) {
          await this.update(sheetName, matched._rowNumber, { ...matched, ...record });
        } else {
          await this.append(sheetName, record);
        }
      }
    }
  }

  global.GoogleSheetsStore = GoogleSheetsStore;
})(window);
