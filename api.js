(function exposeGoogleSheetsStore(global) {
  "use strict";

  const SESSION_TOKEN_KEY = "personalWealthGoogleToken";
  const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

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

    signIn(prompt = "consent") {
      if (!this.tokenClient) return Promise.reject(new Error("ระบบ Google ยังไม่พร้อม"));
      return new Promise((resolve, reject) => {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
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

    async signOut() {
      const accessToken = this.token?.access_token;
      if (accessToken) {
        await new Promise((resolve) => {
          global.google.accounts.oauth2.revoke(accessToken, resolve);
        });
      }
      this.token = null;
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
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
          this.token = null;
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
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

    buildRow(sheetName, record) {
      return this.getHeaders(sheetName).map((header) => {
        if (header.endsWith("_id") && !record[header]) return createShortId();
        return normalizeCell(record[header]);
      });
    }

    async append(sheetName, record) {
      const row = this.buildRow(sheetName, record);
      const range = `${quoteSheet(sheetName)}!A1`;
      await this.request(`/values/${encodeURIComponent(range)}:append`, {
        method: "POST",
        query: {
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS"
        },
        body: { majorDimension: "ROWS", values: [row] }
      });
    }

    async update(sheetName, rowNumber, record) {
      const headers = this.getHeaders(sheetName);
      const row = this.buildRow(sheetName, record);
      const endColumn = columnLetter(headers.length);
      const range = `${quoteSheet(sheetName)}!A${rowNumber}:${endColumn}${rowNumber}`;
      await this.request(`/values/${encodeURIComponent(range)}`, {
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

      await this.request(":batchUpdate", {
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
