(function exposeGoogleSheetsStore(global) {
  "use strict";

  const SESSION_TOKEN_KEY = "personalWealthGoogleToken";
  const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
  const LINKED_TRANSACTION_PREFIX = "v21-";
  const MONEY_PRECISION = 100;
  const GOAL_METADATA_HEADERS = ["goal_type", "progress_source", "linked_account", "status"];

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
    return "";
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
      const entries = Object.entries(this.config.SHEETS);
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

    isAccountReferenced(name) {
      return this.isAccountReferencedByTransaction(name) || this.isAccountReferencedByGoal(name);
    }

    accountReferenceLabel(name) {
      const references = [];
      if (this.isAccountReferencedByTransaction(name)) references.push("Transaction");
      if (this.isAccountReferencedByGoal(name)) references.push("Goal");
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

    validateTransactionAccounts(record) {
      const amount = roundMoney(record?.amount);
      if (!(amount > 0)) {
        const error = new Error("จำนวนเงินต้องมากกว่า 0 บาท");
        error.code = "INVALID_AMOUNT";
        throw error;
      }

      const type = normalizeTransactionType(record?.type);
      if (!type) {
        const error = new Error("ประเภทรายการต้องเป็น Income, Expense หรือ Transfer");
        error.code = "INVALID_TRANSACTION_TYPE";
        throw error;
      }

      const validated = { ...record, amount };
      if (type === "income") {
        const accountTo = this.findAccountByName(record.account_to);
        validated.type = "Income";
        validated.account_from = "";
        validated.account_to = normalizeName(accountTo.account_name);
      } else if (type === "expense") {
        const accountFrom = this.findAccountByName(record.account_from);
        validated.type = "Expense";
        validated.account_from = normalizeName(accountFrom.account_name);
        validated.account_to = "";
      } else {
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
      }
      return validated;
    }

    getTransactionEffects(record, multiplier = 1) {
      const transaction = this.validateTransactionAccounts(record);
      const amount = roundMoney(transaction.amount * multiplier);
      const type = normalizeTransactionType(transaction.type);
      if (type === "income") {
        return [{ accountName: transaction.account_to, delta: amount }];
      }
      if (type === "expense") {
        return [{ accountName: transaction.account_from, delta: -amount }];
      }
      return [
        { accountName: transaction.account_from, delta: -amount },
        { accountName: transaction.account_to, delta: amount }
      ];
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
      return this.applyAccountEffects(this.getTransactionEffects(record));
    }

    async reverseTransactionEffects(record) {
      return this.applyAccountEffects(this.getTransactionEffects(record, -1));
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
      return String(record?.tx_id || "").startsWith(LINKED_TRANSACTION_PREFIX);
    }

    async appendTransactionWithAccountEffects(record) {
      const transaction = this.validateTransactionAccounts({
        ...record,
        tx_id: `${LINKED_TRANSACTION_PREFIX}${createShortId()}`
      });
      const changes = await this.applyTransactionEffects(transaction);
      try {
        const result = await this.append(this.config.SHEETS.transactions, transaction);
        return { ...result, transaction };
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, "การเพิ่ม Transaction");
      }
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
      const changes = await this.applyAccountEffects(effects);
      try {
        return await this.update(this.config.SHEETS.transactions, rowNumber, transaction);
      } catch (error) {
        return this.rollbackAccountChanges(changes, error, "การแก้ไข Transaction");
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
        return this.rollbackAccountChanges(changes, error, "การลบ Transaction");
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
