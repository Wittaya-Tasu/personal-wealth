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
  const TRANSACTION_ITEM_HEADERS = ["item_name"];
  const CREDIT_CARD_TRANSACTION_HEADERS = ["payment_method", "credit_card"];
  const LIABILITY_TYPE_HEADERS = ["liability_type"];
  const GRATITUDE_HEADERS = ["gratitude_id", "date", "slot", "category", "gratitude_text", "created_at", "updated_at"];
  const GRATITUDE_CATEGORIES = new Set(["คน", "สัตว์", "สิ่งของ", "สถานที่", "เหตุการณ์", "อื่น ๆ"]);

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

  function normalizeLiabilityType(value, name = "") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["creditcard", "credit_card", "บัตรเครดิต"].includes(normalized)) return "CreditCard";
    if (/บัตรเครดิต|credit\s*card/i.test(String(name || ""))) return "CreditCard";
    return "Loan";
  }

  function investmentValue(record) {
    const explicitValue = toMoney(record?.current_value);
    if (explicitValue > 0) return explicitValue;
    return roundMoney(toMoney(record?.units) * toMoney(record?.current_price));
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

    async loadAll() {
      const entries = Object.entries(this.config.SHEETS).filter(([key]) => key !== "gratitude");
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

      const gratitudeSheet = this.getGratitudeSheetName();
      try {
        const gratitudeResponse = await this.request("/values:batchGet", {
          query: {
            ranges: [`${quoteSheet(gratitudeSheet)}!A:G`],
            majorDimension: "ROWS",
            valueRenderOption: "UNFORMATTED_VALUE",
            dateTimeRenderOption: "FORMATTED_STRING"
          }
        });
        const values = gratitudeResponse.valueRanges?.[0]?.values || [];
        const headers = (values[0] || []).map((value) => String(value || "").trim());
        this.headers[gratitudeSheet] = headers;
        data.gratitude = values.slice(1).map((row, rowIndex) => {
          const record = { _rowNumber: rowIndex + 2 };
          headers.forEach((header, columnIndex) => {
            if (header) record[header] = row[columnIndex] ?? "";
          });
          return record;
        }).filter((record) => headers.some((header) => header && record[header] !== ""));
        this.gratitudeLoadError = null;
      } catch (error) {
        if (error?.status !== 400) throw error;
        this.headers[gratitudeSheet] = [];
        data.gratitude = [];
        this.gratitudeLoadError = error;
      }

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

    getMissingTransactionItemHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.transactions, TRANSACTION_ITEM_HEADERS);
    }

    getMissingCreditCardTransactionHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.transactions, CREDIT_CARD_TRANSACTION_HEADERS);
    }

    getMissingLiabilityTypeHeaders() {
      return this.getMissingHeaders(this.config.SHEETS.liabilities, LIABILITY_TYPE_HEADERS);
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

    buildRow(sheetName, record) {
      return this.getHeaders(sheetName).map((header) => {
        if (header.endsWith("_id") && !record[header]) return createShortId();
        return normalizeCell(record[header]);
      });
    }

    async append(sheetName, record) {
      const row = this.buildRow(sheetName, record);
      const range = `${quoteSheet(sheetName)}!A1`;
      const result = await this.request(`/values/${encodeURIComponent(range)}:append`, {
        method: "POST",
        query: {
          valueInputOption: "USER_ENTERED",
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
        query: { valueInputOption: "USER_ENTERED" },
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

    isAccountReferenced(name) {
      return this.isAccountReferencedByTransaction(name)
        || this.isAccountReferencedByGoal(name)
        || this.isAccountReferencedByInvestment(name);
    }

    accountReferenceLabel(name) {
      const references = [];
      if (this.isAccountReferencedByTransaction(name)) references.push("Transaction");
      if (this.isAccountReferencedByGoal(name)) references.push("Goal");
      if (this.isAccountReferencedByInvestment(name)) references.push("Investment");
      return references.join(" และ ") || "ข้อมูลอื่น";
    }

    validateAccountRecord(record, existingRecord = null) {
      const name = normalizeName(record?.account_name);
      if (!name) throw new Error("กรุณาระบุชื่อบัญชี");

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
      return { ...record, account_name: name };
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
      const missingHeaders = this.getMissingLiabilityTypeHeaders();
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
      if (totalAmount < 0 || monthlyPayment < 0) throw new Error("ยอดหนี้และค่างวดต้องไม่ติดลบ");
      return {
        ...record,
        liability_name: name,
        liability_type: liabilityType,
        total_amount: totalAmount,
        monthly_payment: monthlyPayment
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
      const missingHeaders = this.getMissingInvestmentFundingHeaders();
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
        return { ...record, asset_name: assetName, account_from: "", funded_amount: "" };
      }
      if (!(fundedAmount > 0)) {
        const error = new Error("จำนวนเงินที่ใช้ลงทุนต้องมากกว่า 0 บาท");
        error.code = "INVALID_INVESTMENT_FUNDING";
        throw error;
      }

      const account = this.findAccountByName(accountFrom);
      return {
        ...record,
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
      const missingHeaders = this.getMissingInvestmentFundingHeaders();
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
        const updated = {
          ...existing,
          account_from: existingAccount || accountName,
          funded_amount: roundMoney((existingAccount ? toMoney(existing.funded_amount) : 0) + amount),
          current_value: roundMoney(investmentValue(existing) + amount)
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
        const investment = {
          asset_name: assetName,
          category: "เงินลงทุน",
          units: "",
          avg_cost: "",
          current_price: "",
          current_value: amount,
          tax_deductible: "",
          note: "",
          account_from: accountName,
          funded_amount: amount
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
          const missingHeaders = this.getMissingTransactionItemHeaders();
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
          if (!validated.category) throw new Error("กรุณาเลือกหมวดหมู่รายจ่าย");
          if (!validated.item_name) throw new Error("กรุณาระบุรายการรายจ่าย");
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
      if (type === "income" || type === "transfer") validated.item_name = "";
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
        essential_expense_override: "ค่าใช้จ่ายจำเป็นต่อเดือน; เว้นว่างเพื่อใช้ค่าเฉลี่ย",
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
