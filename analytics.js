(function exposeWealthAnalytics(global) {
  "use strict";

  const INCOME_TYPES = new Set(["income", "รายรับ"]);
  const EXPENSE_TYPES = new Set(["expense", "รายจ่าย"]);
  const TRANSFER_TYPES = new Set(["transfer", "โอน", "โอนเงิน"]);
  const CREDIT_CARD_PAYMENT_TYPES = new Set(["creditcardpayment", "credit_card_payment", "ชำระบัตรเครดิต"]);
  const COLORS = ["#45d18b", "#e2c46d", "#68a7ff", "#b594f6", "#f4a65a", "#ff746f", "#91a49b"];
  const MONTHLY_SPENDING_ACCOUNT_NAME = "บัญชีใช้จ่ายรายเดือน";
  const FINANCIAL_GOAL_TYPES = new Set(["financial", "finance", "การเงิน"]);
  const MILESTONE_GOAL_TYPES = new Set(["milestone", "life", "ชีวิต", "หมุดหมาย"]);
  const ACCOUNT_PROGRESS_SOURCES = new Set(["account", "บัญชี"]);
  const COMPLETED_GOAL_STATUSES = new Set(["completed", "complete", "done", "สำเร็จ", "เสร็จสิ้น"]);
  const ACCOUNT_ROLE_LABELS = Object.freeze({
    General: "เงินทั่วไป",
    Spending: "บัญชีใช้จ่าย",
    Emergency: "เงินฉุกเฉิน",
    SinkingFund: "เงินเตรียมรายจ่าย",
    Investment: "เงินรอลงทุน"
  });
  const EXPENSE_GROUP_LABELS = Object.freeze({
    Personal: "ส่วนตัว",
    Family: "ครอบครัว",
    HomeDebt: "บ้าน รถ และหนี้",
    Health: "สุขภาพ",
    Protection: "ประกันและการป้องกัน"
  });
  const ASSET_CLASS_LABELS = Object.freeze({
    Cash: "เงินสดและตลาดเงิน",
    FixedIncome: "ตราสารหนี้",
    Equity: "หุ้น",
    Mixed: "กองทุนผสม",
    Gold: "ทองคำและสินค้าโภคภัณฑ์",
    RealEstate: "อสังหาริมทรัพย์และ REIT",
    Crypto: "สินทรัพย์ดิจิทัล",
    Alternative: "สินทรัพย์ทางเลือก",
    Other: "อื่น ๆ"
  });
  const DEFAULT_ASSET_RISK = Object.freeze({
    Cash: 1,
    FixedIncome: 2,
    Mixed: 4,
    Gold: 4,
    RealEstate: 4,
    Equity: 5,
    Alternative: 5,
    Crypto: 7,
    Other: null
  });
  const RISK_LABELS = Object.freeze({
    1: "ต่ำที่สุด",
    2: "ต่ำ",
    3: "ค่อนข้างต่ำ",
    4: "ปานกลาง",
    5: "ค่อนข้างสูง",
    6: "สูง",
    7: "สูงที่สุด"
  });

  function toNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value === null || value === undefined || value === "") return 0;
    const cleaned = String(value).replace(/[฿,\s]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      const epoch = new Date(1899, 11, 30, 12, 0, 0);
      epoch.setDate(epoch.getDate() + value);
      return epoch;
    }
    if (!value) return null;

    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const yearMonth = text.match(/^(\d{4})-(\d{1,2})$/);
    if (yearMonth) {
      const date = new Date(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1, 12, 0, 0);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function monthKey(date) {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function normalizeType(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (INCOME_TYPES.has(normalized)) return "income";
    if (EXPENSE_TYPES.has(normalized)) return "expense";
    if (TRANSFER_TYPES.has(normalized)) return "transfer";
    if (CREDIT_CARD_PAYMENT_TYPES.has(normalized)) return "credit_card_payment";
    return normalized || "other";
  }

  function normalizeAccountName(value) {
    return String(value || "").trim().toLocaleLowerCase("th-TH");
  }

  function normalizeAccountRole(value) {
    const normalized = String(value || "").trim().toLowerCase();
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

  function accountRoleLabel(value) {
    return ACCOUNT_ROLE_LABELS[normalizeAccountRole(value)] || "ยังไม่กำหนดหน้าที่";
  }

  function normalizeExpenseGroup(value) {
    const normalized = String(value || "").trim().toLowerCase();
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

  function expenseGroupLabel(value) {
    return EXPENSE_GROUP_LABELS[normalizeExpenseGroup(value)] || "ยังไม่จัดกลุ่ม";
  }

  function normalizeAssetClass(value) {
    const normalized = String(value || "").trim().toLowerCase();
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

  function assetClassLabel(value) {
    return ASSET_CLASS_LABELS[normalizeAssetClass(value)] || "ยังไม่ระบุประเภทสินทรัพย์";
  }

  function defaultRiskForAssetClass(value) {
    const assetClass = normalizeAssetClass(value);
    return assetClass ? DEFAULT_ASSET_RISK[assetClass] : null;
  }

  function investmentRisk(row) {
    const source = String(row?.risk_source || "Auto").trim().toLowerCase();
    const manual = Math.round(toNumber(row?.risk_level));
    const level = source === "manual" && manual >= 1 && manual <= 7
      ? manual
      : defaultRiskForAssetClass(row?.asset_class);
    return {
      level,
      source: source === "manual" ? "Manual" : "Auto",
      label: level ? RISK_LABELS[level] : "ยังไม่ระบุ"
    };
  }

  function hasBooleanValue(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return typeof value === "boolean"
      || ["true", "yes", "1", "on", "ใช่", "false", "no", "0", "off", "ไม่ใช่"].includes(normalized);
  }

  function isLegacyCreditCardCategory(transaction) {
    return String(transaction?.category || "").trim().toLocaleLowerCase("th-TH") === "บัตรเครดิต";
  }

  function normalizeGoalType(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (MILESTONE_GOAL_TYPES.has(normalized)) return "milestone";
    if (FINANCIAL_GOAL_TYPES.has(normalized)) return "financial";
    return "financial";
  }

  function normalizeGoalProgressSource(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return ACCOUNT_PROGRESS_SOURCES.has(normalized) ? "account" : "manual";
  }

  function normalizeGoalStatus(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (COMPLETED_GOAL_STATUSES.has(normalized)) {
      return { value: "completed", label: "สำเร็จแล้ว" };
    }
    if (["in progress", "in_progress", "progress", "กำลังทำ", "กำลังดำเนินการ"].includes(normalized)) {
      return { value: "in_progress", label: "กำลังดำเนินการ" };
    }
    return { value: "not_started", label: "ยังไม่เริ่ม" };
  }

  function sum(rows, selector) {
    return (rows || []).reduce((total, row) => total + toNumber(selector(row)), 0);
  }

  function hasCellValue(value) {
    return value !== "" && value !== null && value !== undefined;
  }

  function getInvestmentPrincipal(row) {
    if (hasCellValue(row?.principal_amount)) return Math.max(toNumber(row.principal_amount), 0);
    return null; // Legacy funding is only linked contributions, not necessarily lifetime principal.
  }

  function hasInvestmentMarketValue(row) {
    return row?.valuation_mode === "Market" && hasCellValue(row?.current_value);
  }

  function getInvestmentValue(row) {
    if (row?.valuation_mode === "Principal") return getInvestmentPrincipal(row) ?? 0;
    if (hasCellValue(row?.current_value)) return Math.max(toNumber(row.current_value), 0);
    const unitsValue = toNumber(row?.units) * toNumber(row?.current_price);
    return unitsValue > 0 ? unitsValue : (getInvestmentPrincipal(row) ?? 0);
  }

  function getAssetValue(row) {
    const estimated = toNumber(row.estimated_value);
    return estimated || toNumber(row.purchase_price);
  }

  function toBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["true", "yes", "1", "on", "ใช่"].includes(normalized)) return true;
    if (["false", "no", "0", "off", "ไม่ใช่"].includes(normalized)) return false;
    return fallback;
  }

  function rowsToSettings(rows, defaults) {
    const result = { ...(defaults || {}) };
    (rows || []).forEach((row) => {
      const key = String(row.key || "").trim();
      if (key) result[key] = row.value;
    });

    result.monthly_budget = toNumber(result.monthly_budget);
    result.emergency_months_target = Math.max(1, toNumber(result.emergency_months_target) || 6);
    result.essential_expense_override = result.essential_expense_override === ""
      ? ""
      : toNumber(result.essential_expense_override);
    result.include_accounts_in_net_worth = toBoolean(result.include_accounts_in_net_worth, false);
    return result;
  }

  function previousMonths(count, anchor = new Date()) {
    const months = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1, 12, 0, 0);
      months.push({
        key: monthKey(date),
        date,
        label: date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" })
      });
    }
    return months;
  }

  function buildMonthlyCashflow(transactions, count = 12, anchor = new Date()) {
    const months = previousMonths(count, anchor);
    const index = new Map(months.map((item) => [item.key, item]));
    months.forEach((item) => {
      item.income = 0;
      item.expense = 0;
      item.cashflow = 0;
      item.transactionCount = 0;
    });

    (transactions || []).forEach((tx) => {
      const date = parseDate(tx.date);
      const item = index.get(monthKey(date));
      if (!item) return;
      const amount = Math.abs(toNumber(tx.amount));
      const type = normalizeType(tx.type);
      if (type === "income") {
        item.income += amount;
        item.transactionCount += 1;
      }
      if (type === "expense") {
        item.expense += amount;
        item.transactionCount += 1;
      }
    });

    months.forEach((item) => {
      item.cashflow = item.income - item.expense;
    });
    return months;
  }

  function buildYearCashflow(transactions, year) {
    const selectedYear = Number(year);
    const months = Array.from({ length: 12 }, (_, monthIndex) => {
      const date = new Date(selectedYear, monthIndex, 1, 12, 0, 0);
      return {
        key: monthKey(date),
        date,
        label: date.toLocaleDateString("th-TH", { month: "short" }),
        income: 0,
        expense: 0,
        cashflow: 0,
        transactionCount: 0
      };
    });
    const index = new Map(months.map((item) => [item.key, item]));

    (transactions || []).forEach((tx) => {
      const item = index.get(monthKey(parseDate(tx.date)));
      if (!item) return;
      const amount = Math.abs(toNumber(tx.amount));
      const type = normalizeType(tx.type);
      if (type === "income") {
        item.income += amount;
        item.transactionCount += 1;
      } else if (type === "expense") {
        item.expense += amount;
        item.transactionCount += 1;
      }
    });

    months.forEach((item) => {
      item.cashflow = item.income - item.expense;
    });
    return months;
  }

  function getTransactionYears(transactions, anchor = new Date()) {
    const years = new Set([anchor.getFullYear()]);
    (transactions || []).forEach((tx) => {
      const date = parseDate(tx.date);
      if (date) years.add(date.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }

  function getExpenseMonthOptions(transactions, anchor = new Date()) {
    const months = new Map();
    const addMonth = (date) => {
      if (!date) return;
      const key = monthKey(date);
      months.set(key, {
        key,
        date: new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0),
        label: date.toLocaleDateString("th-TH", { month: "long", year: "numeric" })
      });
    };
    addMonth(anchor);
    (transactions || []).forEach((tx) => {
      if (["expense", "income"].includes(normalizeType(tx.type))) addMonth(parseDate(tx.date));
    });
    return [...months.values()].sort((a, b) => b.date - a.date);
  }

  function buildTransactionMix(transactions, selectedMonthKey, type) {
    const expenseGroups = {
      Personal: ["ส่วนตัว", "#45d18b"], Family: ["ครอบครัว", "#e7c66b"],
      HomeDebt: ["บ้าน รถ และหนี้", "#7ea4e8"],
      Protection: ["สุขภาพและการป้องกัน", "#cc91dd"],
      Unclassified: ["ยังไม่จัดกลุ่ม", "#91a49b"]
    };
    const buckets = new Map();
    (transactions || []).forEach((tx) => {
      if (normalizeType(tx.type) !== type || monthKey(parseDate(tx.date)) !== selectedMonthKey) return;
      if (type === "expense" && isLegacyCreditCardCategory(tx)) return;
      let key, name, color;
      if (type === "expense") {
        key = normalizeExpenseGroup(tx.expense_group) || "Unclassified";
        if (key === "Health") key = "Protection";
        [name, color] = expenseGroups[key];
      } else {
        name = String(tx.category || "").trim() || "ยังไม่ระบุประเภทรายได้";
        key = name.toLocaleLowerCase("th-TH");
      }
      const entry = buckets.get(key) || { name, value: 0, color };
      entry.value += Math.abs(toNumber(tx.amount));
      buckets.set(key, entry);
    });
    const total = [...buckets.values()].reduce((sum, row) => sum + row.value, 0);
    const rows = [...buckets.values()].filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "th"))
      .map((row, index) => ({ ...row, color: row.color || COLORS[index % COLORS.length], percentage: total > 0 ? row.value / total : 0 }));
    return { total, rows };
  }

  function buildExpenseBreakdown(transactions, selectedMonthKey) {
    return buildTransactionMix(transactions, selectedMonthKey, "expense");
  }

  function buildIncomeBreakdown(transactions, selectedMonthKey) {
    return buildTransactionMix(transactions, selectedMonthKey, "income");
  }

  function buildBudgetOverview(budgets, transactions, selectedMonthKey) {
    const budgetByGroup = new Map();
    (budgets || []).forEach((row) => {
      if (String(row.month || "").trim() !== selectedMonthKey) return;
      const group = normalizeExpenseGroup(row.expense_group);
      if (!group) return;
      budgetByGroup.set(group, (budgetByGroup.get(group) || 0) + Math.max(toNumber(row.budget_amount), 0));
    });
    const actualByGroup = new Map();
    (transactions || []).forEach((row) => {
      if (normalizeType(row.type) !== "expense" || isLegacyCreditCardCategory(row)) return;
      if (monthKey(parseDate(row.date)) !== selectedMonthKey) return;
      const group = normalizeExpenseGroup(row.expense_group) || "Unclassified";
      actualByGroup.set(group, (actualByGroup.get(group) || 0) + Math.abs(toNumber(row.amount)));
    });
    const groupOrder = ["Personal", "Family", "HomeDebt", "Health", "Protection"];
    const rows = groupOrder.map((group) => {
      const budget = budgetByGroup.get(group) || 0;
      const actual = actualByGroup.get(group) || 0;
      return {
        group,
        name: EXPENSE_GROUP_LABELS[group],
        budget,
        actual,
        remaining: budget - actual,
        utilization: budget > 0 ? actual / budget : null
      };
    });
    const unclassified = actualByGroup.get("Unclassified") || 0;
    const totalBudget = rows.reduce((total, row) => total + row.budget, 0);
    const totalActual = rows.reduce((total, row) => total + row.actual, 0) + unclassified;
    return {
      month: selectedMonthKey,
      rows,
      totalBudget,
      totalActual,
      remaining: totalBudget - totalActual,
      utilization: totalBudget > 0 ? totalActual / totalBudget : null,
      unclassified,
      configuredGroups: rows.filter((row) => row.budget > 0).length
    };
  }

  function monthsUntil(date, anchor) {
    if (!date || Number.isNaN(date.getTime())) return null;
    const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0);
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    if (dueDay < anchorDay) return 0;
    const base = ((dueDay.getFullYear() - anchorDay.getFullYear()) * 12) + dueDay.getMonth() - anchorDay.getMonth();
    return Math.max(base + (dueDay.getDate() >= anchorDay.getDate() ? 1 : 0), 1);
  }

  function buildSinkingFundOverview(funds, accounts, anchor = new Date()) {
    const accountIndex = new Map();
    (accounts || []).forEach((account) => {
      const key = normalizeAccountName(account.account_name);
      if (!key) return;
      const entries = accountIndex.get(key) || [];
      entries.push(account);
      accountIndex.set(key, entries);
    });
    const rows = (funds || []).map((fund) => {
      const source = normalizeGoalProgressSource(fund.progress_source);
      const linkedMatches = source === "account"
        ? accountIndex.get(normalizeAccountName(fund.linked_account)) || []
        : [];
      const linkedAccount = linkedMatches.length === 1 ? linkedMatches[0] : null;
      const trackingError = source === "account" && linkedMatches.length !== 1
        ? linkedMatches.length > 1
          ? `พบบัญชี “${fund.linked_account}” ซ้ำ`
          : `ไม่พบบัญชี “${fund.linked_account}”`
        : source === "account" && normalizeAccountRole(linkedAccount?.account_role) !== "SinkingFund"
          ? `บัญชี “${fund.linked_account}” ไม่ได้กำหนดหน้าที่เป็นเงินเตรียมรายจ่าย`
          : "";
      const target = Math.max(toNumber(fund.target_amount), 0);
      const current = source === "account" && linkedAccount && !trackingError
        ? Math.max(toNumber(linkedAccount.balance), 0)
        : source === "account"
          ? 0
          : Math.max(toNumber(fund.current_amount), 0);
      const dueDate = parseDate(fund.due_date);
      const monthsRemaining = monthsUntil(dueDate, anchor);
      const remaining = Math.max(target - current, 0);
      const normalizedStatus = String(fund.status || "Active").trim().toLowerCase();
      const status = ["completed", "complete", "ครบแล้ว"].includes(normalizedStatus)
        ? "Completed"
        : ["paused", "pause", "พักไว้"].includes(normalizedStatus)
          ? "Paused"
          : "Active";
      return {
        ...fund,
        source,
        linkedAccount,
        target,
        current,
        dueDate,
        monthsRemaining,
        remaining,
        status,
        trackingError,
        percentage: target > 0 && !trackingError ? Math.min(current / target, 1) : null,
        monthlyRequired: status !== "Active" || trackingError || remaining === 0 || monthsRemaining === null
          ? 0
          : remaining / Math.max(monthsRemaining, 1)
      };
    }).sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return String(a.fund_name || "").localeCompare(String(b.fund_name || ""), "th");
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
    const activeRows = rows.filter((row) => row.status !== "Completed");
    return {
      rows,
      totalTarget: rows.reduce((total, row) => total + row.target, 0),
      totalCurrent: rows.reduce((total, row) => total + row.current, 0),
      totalRemaining: activeRows.reduce((total, row) => total + row.remaining, 0),
      monthlyRequired: activeRows.reduce((total, row) => total + row.monthlyRequired, 0),
      overdueCount: activeRows.filter((row) => row.status === "Active" && row.monthsRemaining === 0 && row.remaining > 0).length
    };
  }

  function buildFourTierOverview({ currentMonth, savingsRate, debtServiceRatio, emergencyMonths, emergencyFund, budget, sinkingFunds, investments, totalAssets, insurance, retirement }) {
    const incomeStatus = currentMonth.income <= 0
      ? { key: "incomplete", label: "ข้อมูลไม่ครบ" }
      : currentMonth.cashflow < 0
        ? { key: "attention", label: "ควรปรับปรุง" }
        : savingsRate >= 0.2
          ? { key: "strong", label: "แข็งแรง" }
          : { key: "building", label: "กำลังสร้าง" };
    const expenseStatus = budget.totalBudget <= 0
      ? { key: "incomplete", label: "ยังไม่ได้ตั้งงบ" }
      : budget.totalActual > budget.totalBudget
        ? { key: "attention", label: "เกินงบ" }
        : { key: "strong", label: "อยู่ในแผน" };
    const emergencyStatus = emergencyMonths === null
      ? { key: "incomplete", label: "ข้อมูลไม่ครบ" }
      : emergencyMonths >= emergencyFund.targetMonths
        ? { key: "strong", label: "ถึงเป้าหมาย" }
        : emergencyMonths >= 3
          ? { key: "building", label: "กำลังสร้าง" }
          : { key: "attention", label: "ควรเร่งสะสม" };
    const investmentStatus = !retirement?.plan
      ? { key: "incomplete", label: "ยังไม่ได้ตั้งแผน" }
      : retirement.gap > 0
        ? { key: "building", label: "กำลังสะสม" }
        : { key: "strong", label: "ตามเป้าหมาย" };
    return [
      { tier: 1, key: "income", title: "รายได้", status: incomeStatus, value: currentMonth.income, secondary: savingsRate },
      { tier: 2, key: "expense", title: "รายจ่าย หนี้ และความคุ้มครอง", status: expenseStatus, value: budget.totalActual, secondary: budget.utilization, debtServiceRatio, insuranceCount: insurance?.activeCount || 0 },
      { tier: 3, key: "emergency", title: "เงินฉุกเฉิน", status: emergencyStatus, value: emergencyFund.balance, secondary: emergencyMonths, target: emergencyFund.targetAmount },
      { tier: 4, key: "investment", title: "ลงทุนและเกษียณ", status: investmentStatus, value: retirement?.plan ? retirement.retirementPrincipal : investments, secondary: retirement?.progress ?? (totalAssets > 0 ? investments / totalAssets : null), retirementGap: retirement?.gap, sinkingMonthly: sinkingFunds.monthlyRequired }
    ];
  }

  function buildDebtOverview(liabilities, anchor = new Date()) {
    const rows = (liabilities || []).map((row) => {
      const balance = Math.max(toNumber(row.total_amount), 0);
      const original = Math.max(toNumber(row.original_amount), 0);
      const rate = Math.max(toNumber(row.interest_rate), 0);
      const dueDate = parseDate(row.due_date);
      const progress = original > 0 ? Math.max(0, Math.min(1 - (balance / original), 1)) : null;
      return { ...row, balance, original, rate, dueDate, progress };
    });
    const totalBalance = rows.reduce((total, row) => total + row.balance, 0);
    const weightedRate = totalBalance > 0
      ? rows.reduce((total, row) => total + (row.balance * row.rate), 0) / totalBalance
      : 0;
    return {
      rows,
      totalBalance,
      monthlyPayment: rows.reduce((total, row) => total + Math.max(toNumber(row.monthly_payment), 0), 0),
      weightedRate,
      creditCardBalance: rows.filter((row) => String(row.liability_type || "").toLowerCase() === "creditcard")
        .reduce((total, row) => total + row.balance, 0),
      dueWithinYear: rows.filter((row) => row.dueDate && row.dueDate >= anchor && row.dueDate <= new Date(anchor.getFullYear() + 1, anchor.getMonth(), anchor.getDate())).length
    };
  }

  function buildInsuranceOverview(policies, anchor = new Date()) {
    const today = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0);
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(upcomingLimit.getDate() + 90);
    const rows = (policies || []).map((row) => {
      const status = String(row.status || "Active").trim();
      const renewalDate = parseDate(row.renewal_date);
      return {
        ...row,
        status,
        renewalDate,
        coverage: Math.max(toNumber(row.coverage_amount), 0),
        annualPremium: Math.max(toNumber(row.annual_premium), 0)
      };
    }).sort((a, b) => {
      if (!a.renewalDate && !b.renewalDate) return String(a.policy_name || "").localeCompare(String(b.policy_name || ""), "th");
      if (!a.renewalDate) return 1;
      if (!b.renewalDate) return -1;
      return a.renewalDate - b.renewalDate;
    });
    rows.forEach((row) => {
      const endDate = parseDate(row.end_date);
      if (row.status.toLowerCase() === "active" && endDate && endDate < today) row.status = "Expired";
    });
    const active = rows.filter((row) => row.status.toLowerCase() === "active");
    return {
      rows,
      activeCount: active.length,
      totalCoverage: active.reduce((total, row) => total + row.coverage, 0),
      annualPremium: active.reduce((total, row) => total + row.annualPremium, 0),
      monthlyPremium: active.reduce((total, row) => total + row.annualPremium, 0) / 12,
      upcomingRenewals: active.filter((row) => row.renewalDate && row.renewalDate >= today && row.renewalDate <= upcomingLimit).length,
      expiredCount: rows.filter((row) => row.status.toLowerCase() === "expired").length
    };
  }

  function normalizeInvestmentPurpose(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["retirement", "เกษียณ"].includes(normalized)) return "Retirement";
    if (["income", "สร้างรายได้"].includes(normalized)) return "Income";
    if (["growth", "เติบโต"].includes(normalized)) return "Growth";
    if (["preservation", "รักษาเงินต้น"].includes(normalized)) return "Preservation";
    return normalized ? "Other" : "";
  }

  function buildInvestmentOverview(investments) {
    const rows = (investments || []).map((row) => {
      const principal = getInvestmentPrincipal(row);
      const hasMarketValue = hasInvestmentMarketValue(row);
      const currentValue = getInvestmentValue(row);
      const risk = investmentRisk(row);
      return {
        ...row,
        principal,
        hasMarketValue,
        currentValue,
        profitLoss: hasMarketValue && principal !== null ? currentValue - principal : null,
        incomeReceived: Math.max(toNumber(row.income_received), 0),
        assetClass: normalizeAssetClass(row.asset_class),
        assetClassLabel: assetClassLabel(row.asset_class),
        purpose: normalizeInvestmentPurpose(row.investment_purpose),
        risk
      };
    });
    const totalPrincipal = rows.reduce((total, row) => total + row.principal, 0);
    const knownRiskPrincipal = rows.reduce((total, row) => total + (row.risk.level ? row.principal : 0), 0);
    const weightedRisk = knownRiskPrincipal > 0
      ? rows.reduce((total, row) => total + (row.risk.level ? row.principal * row.risk.level : 0), 0) / knownRiskPrincipal
      : null;
    const allocationMap = new Map();
    rows.forEach((row) => {
      if (row.principal === null) return;
      const key = row.assetClass || "Unclassified";
      allocationMap.set(key, (allocationMap.get(key) || 0) + row.principal);
    });
    return {
      rows,
      totalPrincipal,
      unknownPrincipalCount: rows.filter((row) => row.principal === null).length,
      totalDisplayValue: rows.reduce((total, row) => total + row.currentValue, 0),
      trackedMarketValue: rows.filter((row) => row.hasMarketValue).reduce((total, row) => total + row.currentValue, 0),
      totalIncomeReceived: rows.reduce((total, row) => total + row.incomeReceived, 0),
      weightedRisk,
      unclassifiedCount: rows.filter((row) => !row.assetClass).length,
      allocation: [...allocationMap.entries()].map(([assetClass, principal], index) => ({
        assetClass,
        name: assetClass === "Unclassified" ? "ยังไม่ระบุประเภท" : ASSET_CLASS_LABELS[assetClass],
        principal,
        percentage: totalPrincipal > 0 ? principal / totalPrincipal : 0,
        color: COLORS[index % COLORS.length]
      })).sort((a, b) => b.principal - a.principal)
    };
  }

  function calculateAge(birthDate, anchor) {
    if (!birthDate) return null;
    let age = anchor.getFullYear() - birthDate.getFullYear();
    const birthdayPassed = anchor.getMonth() > birthDate.getMonth()
      || (anchor.getMonth() === birthDate.getMonth() && anchor.getDate() >= birthDate.getDate());
    if (!birthdayPassed) age -= 1;
    return Math.max(age, 0);
  }

  function buildRetirementOverview(plans, investments, anchor = new Date()) {
    const activePlans = (plans || []).filter((row) => String(row.status || "Active").trim().toLowerCase() === "active");
    const plan = activePlans[0] || null;
    const investmentOverview = buildInvestmentOverview(investments);
    const retirementPrincipal = investmentOverview.rows
      .filter((row) => row.purpose === "Retirement")
      .reduce((total, row) => total + row.principal, 0);
    if (!plan) {
      return { plan: null, activePlanCount: activePlans.length, retirementPrincipal, investmentOverview };
    }
    const birthDate = parseDate(plan.birth_date);
    const currentAge = calculateAge(birthDate, anchor);
    const retirementAge = Math.max(toNumber(plan.retirement_age), 0);
    const retirementDate = birthDate ? new Date(birthDate.getFullYear() + retirementAge, birthDate.getMonth(), birthDate.getDate(), 12) : null;
    const yearsToRetirement = retirementDate ? Math.max((retirementDate - anchor) / (365.2425 * 86400000), 0) : null;
    const inflationRate = Math.max(toNumber(plan.inflation_rate), 0) / 100;
    const expectedReturn = Math.max(toNumber(plan.expected_return), 0) / 100;
    const withdrawalRate = Math.max(toNumber(plan.withdrawal_rate), 0) / 100;
    const monthlyExpenseToday = Math.max(toNumber(plan.monthly_expense_today), 0);
    const monthlyContribution = Math.max(toNumber(plan.monthly_contribution), 0);
    const monthlyExpenseAtRetirement = yearsToRetirement === null
      ? null
      : monthlyExpenseToday * ((1 + inflationRate) ** yearsToRetirement);
    const targetFund = monthlyExpenseAtRetirement === null || withdrawalRate <= 0
      ? null
      : (monthlyExpenseAtRetirement * 12) / withdrawalRate;
    const months = yearsToRetirement === null ? 0 : Math.round(yearsToRetirement * 12);
    const monthlyReturn = ((1 + expectedReturn) ** (1 / 12)) - 1;
    const futurePrincipal = yearsToRetirement === null
      ? null
      : retirementPrincipal * ((1 + expectedReturn) ** yearsToRetirement);
    const futureContributions = yearsToRetirement === null
      ? null
      : monthlyReturn > 0
        ? monthlyContribution * ((((1 + monthlyReturn) ** months) - 1) / monthlyReturn)
        : monthlyContribution * months;
    const projectedFund = futurePrincipal === null ? null : futurePrincipal + futureContributions;
    const gap = targetFund === null || projectedFund === null ? null : Math.max(targetFund - projectedFund, 0);
    return {
      plan,
      activePlanCount: activePlans.length,
      birthDate,
      currentAge,
      retirementAge,
      yearsToRetirement,
      inflationRate,
      expectedReturn,
      withdrawalRate,
      monthlyExpenseToday,
      monthlyExpenseAtRetirement,
      monthlyContribution,
      retirementPrincipal,
      targetFund,
      projectedFund,
      gap,
      progress: targetFund > 0 ? Math.min(projectedFund / targetFund, 1) : null,
      investmentOverview
    };
  }

  function classifyAllocation(label, source) {
    const text = `${label || ""} ${source || ""}`.toLowerCase();
    if (/cash|เงินสด|เงินฝาก|ออมทรัพย์|ฝากประจำ/.test(text)) return "เงินสดและเงินฝาก";
    if (/rmf|ssf|pvd|provident|สำรองเลี้ยงชีพ|ประกันสังคม|sso|เกษียณ/.test(text)) return "เงินเกษียณ";
    if (/btc|bitcoin|crypto|คริป/.test(text)) return "สินทรัพย์ดิจิทัล";
    if (/ประกัน|insurance/.test(text)) return "ประกัน/สะสมทรัพย์";
    if (/บ้าน|ที่ดิน|คอนโด|อสังหา|real estate|property/.test(text)) return "อสังหาริมทรัพย์";
    if (/รถ|vehicle|car/.test(text)) return "ยานพาหนะ";
    if (/หุ้น|equity|stock|etf|กองทุน|fund|esg|bond|ตราสาร/.test(text)) return "เงินลงทุน";
    return "ทรัพย์สินอื่น";
  }

  function buildAllocation(data, includeAccounts) {
    const buckets = new Map();
    const add = (name, value) => {
      const amount = Math.max(0, toNumber(value));
      if (!amount) return;
      buckets.set(name, (buckets.get(name) || 0) + amount);
    };

    if (includeAccounts) {
      (data.accounts || []).forEach((row) => add("เงินสดและเงินฝาก", row.balance));
    }
    (data.investments || []).forEach((row) => {
      const realClass = normalizeAssetClass(row.asset_class);
      add(realClass ? ASSET_CLASS_LABELS[realClass] : classifyAllocation(row.category, row.asset_name), getInvestmentValue(row));
    });
    (data.assets || []).forEach((row) => {
      add(classifyAllocation(row.category, row.asset_name), getAssetValue(row));
    });

    const total = [...buckets.values()].reduce((acc, value) => acc + value, 0);
    return [...buckets.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        percentage: total > 0 ? value / total : 0,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }

  function isCashInvestment(row) {
    return classifyAllocation(row.category, row.asset_name) === "เงินสดและเงินฝาก";
  }

  function buildSnapshotHistory(snapshots) {
    return (snapshots || [])
      .map((row) => {
        const date = parseDate(row.snapshot_month);
        return {
          date,
          key: monthKey(date),
          label: date ? date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }) : "—",
          netWorth: toNumber(row.net_worth),
          totalAssets: toNumber(row.total_assets),
          totalLiabilities: toNumber(row.total_liabilities)
        };
      })
      .filter((row) => row.date)
      .sort((a, b) => a.date - b.date);
  }

  function buildGoalRows(goals, accounts = []) {
    const accountMatches = new Map();
    (accounts || []).forEach((account) => {
      const key = normalizeAccountName(account.account_name);
      if (!key) return;
      if (!accountMatches.has(key)) accountMatches.set(key, []);
      accountMatches.get(key).push(account);
    });

    return (goals || [])
      .map((row) => {
        const goalType = normalizeGoalType(row.goal_type);
        const isMilestone = goalType === "milestone";
        const progressSource = isMilestone
          ? "status"
          : normalizeGoalProgressSource(row.progress_source);
        const target = Math.max(0, toNumber(row.target_amount));
        let current = Math.max(0, toNumber(row.current_amount));
        let linkedAccount = null;
        let trackingError = "";

        if (!isMilestone && progressSource === "account") {
          const accountName = String(row.linked_account || "").trim();
          const matches = accountMatches.get(normalizeAccountName(accountName)) || [];
          if (!accountName || matches.length === 0) {
            trackingError = `ไม่พบบัญชีที่ผูกกับเป้าหมาย “${row.goal_name || "ไม่ระบุชื่อ"}”`;
          } else if (matches.length > 1) {
            trackingError = `พบบัญชีชื่อ “${accountName}” ซ้ำ จึงคำนวณเป้าหมายไม่ได้`;
          } else {
            linkedAccount = matches[0];
            current = Math.max(0, toNumber(linkedAccount.balance));
          }
        }

        const status = normalizeGoalStatus(row.status);
        const deadline = parseDate(row.deadline);
        return {
          ...row,
          goalType,
          isMilestone,
          progressSource,
          linkedAccount,
          trackingError,
          status: status.value,
          statusLabel: status.label,
          target,
          current,
          deadline,
          percentage: isMilestone || trackingError || target <= 0
            ? null
            : Math.min(current / target, 1),
          remaining: isMilestone ? null : Math.max(target - current, 0)
        };
      })
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return String(a.goal_name).localeCompare(String(b.goal_name), "th");
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline - b.deadline;
      });
  }

  function buildWarnings(data, settings, snapshots, monthly, goals = [], budget = null) {
    const warnings = [];
    const accountCash = sum(data.accounts, (row) => row.balance);
    const investmentCash = sum((data.investments || []).filter(isCashInvestment), getInvestmentValue);

    if (accountCash > 0 && investmentCash > 0) {
      warnings.push("พบยอดเงินสดทั้งใน Accounts และ Investments ควรตรวจว่าบันทึกซ้ำหรือไม่ ก่อนเปิดการนับยอดบัญชีใน Net Worth");
    }
    if (!snapshots.length) {
      warnings.push("ยังไม่มี MonthlySnapshots กราฟความมั่งคั่งจึงไม่สร้างตัวเลขย้อนหลังจำลองให้");
    }
    if (!(data.transactions || []).length) {
      warnings.push("ยังไม่มี Transactions จึงคำนวณกระแสเงินสด อัตราการออม และเงินสำรองฉุกเฉินไม่ได้");
    }
    if (!settings.include_accounts_in_net_worth && accountCash > 0 && investmentCash === 0) {
      warnings.push("ยอดบัญชีเงินยังไม่ถูกรวมใน Net Worth เพราะการตั้งค่า “นับยอดบัญชี” ปิดอยู่");
    }
    if (monthly.at(-1)?.income === 0 && sum(data.liabilities, (row) => row.monthly_payment) > 0) {
      warnings.push("มีค่างวดหนี้ แต่ไม่มีรายรับของเดือนนี้ จึงยังคำนวณภาระหนี้ต่อรายได้ไม่ได้");
    }
    if (!(budget?.totalBudget > 0) && settings.monthly_budget > 0 && monthly.at(-1)?.expense > settings.monthly_budget) {
      const overBudget = monthly.at(-1).expense - settings.monthly_budget;
      warnings.push(`รายจ่ายเดือนนี้เกินงบที่ตั้งไว้ ${new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(overBudget)}`);
    }
    goals.forEach((goal) => {
      if (goal.trackingError && !warnings.includes(goal.trackingError)) {
        warnings.push(goal.trackingError);
      }
    });
    return warnings;
  }

  function buildViewModel(data, defaults, anchor = new Date()) {
    const safeData = {
      accounts: data.accounts || [],
      transactions: data.transactions || [],
      investments: data.investments || [],
      assets: data.assets || [],
      liabilities: data.liabilities || [],
      goals: data.goals || [],
      categories: data.categories || [],
      snapshots: data.snapshots || [],
      settings: data.settings || [],
      budgets: data.budgets || [],
      sinkingFunds: data.sinkingFunds || [],
      insurancePolicies: data.insurancePolicies || [],
      retirementPlans: data.retirementPlans || []
    };
    const settings = rowsToSettings(safeData.settings, defaults);
    const accountAssets = settings.include_accounts_in_net_worth
      ? sum(safeData.accounts, (row) => row.balance)
      : 0;
    const investments = sum(safeData.investments, getInvestmentValue);
    const otherAssets = sum(safeData.assets, getAssetValue);
    const liabilities = sum(safeData.liabilities, (row) => row.total_amount);
    const totalAssets = accountAssets + investments + otherAssets;
    const netWorth = totalAssets - liabilities;
    const monthly = buildMonthlyCashflow(safeData.transactions, 12, anchor);
    const currentMonth = monthly.at(-1) || { income: 0, expense: 0, cashflow: 0 };
    const currentMonthKey = monthKey(anchor);
    const monthlySpendingAccountKey = normalizeAccountName(MONTHLY_SPENDING_ACCOUNT_NAME);
    const monthlySpendingAccountMatches = safeData.accounts.filter((account) => {
      return normalizeAccountName(account.account_name) === monthlySpendingAccountKey;
    });
    const monthlySpendingAccount = monthlySpendingAccountMatches.length === 1
      ? monthlySpendingAccountMatches[0]
      : null;
    const monthlySpendingExpense = safeData.transactions.reduce((total, transaction) => {
      const isCurrentMonth = monthKey(parseDate(transaction.date)) === currentMonthKey;
      const isExpense = normalizeType(transaction.type) === "expense";
      const isMonthlySpendingAccount = normalizeAccountName(transaction.account_from) === monthlySpendingAccountKey;
      return isCurrentMonth && isExpense && isMonthlySpendingAccount
        ? total + Math.abs(toNumber(transaction.amount))
        : total;
    }, 0);
    const monthlySpending = {
      accountName: MONTHLY_SPENDING_ACCOUNT_NAME,
      account: monthlySpendingAccount,
      balance: monthlySpendingAccount ? toNumber(monthlySpendingAccount.balance) : null,
      expense: monthlySpendingExpense,
      status: monthlySpendingAccountMatches.length === 0
        ? "missing"
        : monthlySpendingAccountMatches.length > 1
          ? "duplicate"
          : "available"
    };
    const savingsRate = currentMonth.income > 0 ? currentMonth.cashflow / currentMonth.income : null;
    const debtPayments = sum(safeData.liabilities, (row) => row.monthly_payment);
    const hasDebt = liabilities > 0 || debtPayments > 0;
    const debtServiceRatio = debtPayments === 0
      ? 0
      : currentMonth.income > 0
        ? debtPayments / currentMonth.income
        : null;

    const emergencyAccounts = safeData.accounts.filter((account) => {
      return normalizeAccountRole(account.account_role) === "Emergency";
    });
    const emergencyBalance = sum(emergencyAccounts, (row) => row.balance);
    const recentThree = monthly.slice(-3);
    const recentMonthKeys = new Set(recentThree.map((row) => row.key));
    const recentExpenses = safeData.transactions.filter((transaction) => {
      return normalizeType(transaction.type) === "expense"
        && !isLegacyCreditCardCategory(transaction)
        && recentMonthKeys.has(monthKey(parseDate(transaction.date)));
    });
    const classifiedExpenses = recentExpenses.filter((transaction) => {
      return Boolean(normalizeExpenseGroup(transaction.expense_group))
        && hasBooleanValue(transaction.is_essential);
    });
    const activeExpenseMonthKeys = new Set(recentExpenses.map((transaction) => monthKey(parseDate(transaction.date))));
    const essentialTotal = classifiedExpenses.reduce((total, transaction) => {
      return toBoolean(transaction.is_essential, false)
        ? total + Math.abs(toNumber(transaction.amount))
        : total;
    }, 0);
    const calculatedEssentialExpense = activeExpenseMonthKeys.size
      ? essentialTotal / activeExpenseMonthKeys.size
      : null;
    const usesEssentialOverride = settings.essential_expense_override !== "";
    const essentialExpense = usesEssentialOverride
      ? toNumber(settings.essential_expense_override)
      : classifiedExpenses.length
        ? calculatedEssentialExpense
        : null;
    const emergencyMonths = essentialExpense > 0 ? emergencyBalance / essentialExpense : null;
    const expenseClassification = {
      total: recentExpenses.length,
      classified: classifiedExpenses.length,
      unclassified: Math.max(recentExpenses.length - classifiedExpenses.length, 0),
      coverage: recentExpenses.length ? classifiedExpenses.length / recentExpenses.length : null
    };
    const emergencyFund = {
      accounts: emergencyAccounts,
      balance: emergencyBalance,
      targetMonths: settings.emergency_months_target,
      targetAmount: essentialExpense === null ? null : essentialExpense * settings.emergency_months_target,
      shortfall: essentialExpense === null
        ? null
        : Math.max((essentialExpense * settings.emergency_months_target) - emergencyBalance, 0),
      essentialExpenseSource: usesEssentialOverride ? "override" : "transactions"
    };
    const snapshots = buildSnapshotHistory(safeData.snapshots);
    const previousSnapshot = snapshots.length >= 2 ? snapshots.at(-2) : null;
    const latestSnapshot = snapshots.at(-1) || null;
    const referenceNetWorth = latestSnapshot?.netWorth || netWorth;
    const netWorthChange = previousSnapshot ? referenceNetWorth - previousSnapshot.netWorth : null;
    const netWorthChangeRate = previousSnapshot && previousSnapshot.netWorth !== 0
      ? netWorthChange / Math.abs(previousSnapshot.netWorth)
      : null;
    const allocation = buildAllocation(safeData, settings.include_accounts_in_net_worth);
    const budget = buildBudgetOverview(safeData.budgets, safeData.transactions, currentMonthKey);
    const sinkingFunds = buildSinkingFundOverview(safeData.sinkingFunds, safeData.accounts, anchor);
    const debt = buildDebtOverview(safeData.liabilities, anchor);
    const insurance = buildInsuranceOverview(safeData.insurancePolicies, anchor);
    const investmentOverview = buildInvestmentOverview(safeData.investments);
    const retirement = buildRetirementOverview(safeData.retirementPlans, safeData.investments, anchor);
    const fourTiers = buildFourTierOverview({
      currentMonth,
      savingsRate,
      debtServiceRatio,
      emergencyMonths,
      emergencyFund,
      budget,
      sinkingFunds,
      investments,
      totalAssets,
      insurance,
      retirement
    });
    const goals = buildGoalRows(safeData.goals, safeData.accounts);
    const warnings = buildWarnings(safeData, settings, snapshots, monthly, goals, budget);
    if (!emergencyAccounts.length) {
      warnings.push("ยังไม่มีบัญชีที่กำหนดหน้าที่เป็น “เงินฉุกเฉิน” ตัวเลขเงินสำรองจึงยังเป็นศูนย์");
    }
    if (!usesEssentialOverride && recentExpenses.length && expenseClassification.unclassified > 0) {
      warnings.push(
        `รายจ่าย 3 เดือนล่าสุดยังจัดกลุ่มหรือระบุความจำเป็นไม่ครบ `
        + `${expenseClassification.unclassified} รายการ ตัวเลขเงินสำรองฉุกเฉินจึงอาจคลาดเคลื่อน`
      );
    }
    if (!usesEssentialOverride && recentExpenses.length && classifiedExpenses.length === 0) {
      warnings.push("ยังคำนวณค่าใช้จ่ายจำเป็นไม่ได้ กรุณาจัดกลุ่มรายจ่ายเดิมและระบุว่าเป็นรายจ่ายจำเป็นหรือไม่");
    }
    if (essentialExpense === 0) {
      warnings.push("ค่าใช้จ่ายจำเป็นต่อเดือนเป็น 0 จึงยังคำนวณจำนวนเดือนเงินสำรองฉุกเฉินไม่ได้");
    }
    if (monthlySpending.status === "missing") {
      warnings.push(`ไม่พบบัญชี “${MONTHLY_SPENDING_ACCOUNT_NAME}” จึงยังแสดงเงินใช้จ่ายคงเหลือไม่ได้`);
    }
    if (monthlySpending.status === "duplicate") {
      warnings.push(`พบบัญชีชื่อ “${MONTHLY_SPENDING_ACCOUNT_NAME}” ซ้ำ จึงไม่สามารถระบุยอดเงินใช้จ่ายคงเหลือได้อย่างแน่นอน`);
    }
    if (budget.unclassified > 0) {
      warnings.push(`รายจ่ายเดือนนี้ ${budget.unclassified.toLocaleString("th-TH")} บาท ยังไม่มีกลุ่มระดับบน จึงเทียบงบประมาณรายกลุ่มไม่ได้ครบ`);
    }
    if (budget.totalBudget > 0 && budget.totalActual > budget.totalBudget) {
      warnings.push(`รายจ่ายเดือนนี้เกินงบประมาณรายกลุ่ม ${(budget.totalActual - budget.totalBudget).toLocaleString("th-TH")} บาท`);
    }
    if (sinkingFunds.overdueCount > 0) {
      warnings.push(`มีเงินเตรียมรายจ่ายเลยกำหนดและยังไม่ครบ ${sinkingFunds.overdueCount} รายการ`);
    }
    sinkingFunds.rows.forEach((fund) => {
      if (fund.trackingError && !warnings.includes(fund.trackingError)) warnings.push(fund.trackingError);
    });
    if (investmentOverview.unclassifiedCount > 0) {
      warnings.push(`มีการลงทุน ${investmentOverview.unclassifiedCount} รายการที่ยังไม่ระบุประเภทสินทรัพย์จริง จึงยังประเมินความเสี่ยงและสัดส่วนเงินต้นไม่ได้ครบ`);
    }
    if (retirement.activePlanCount > 1) {
      warnings.push("พบแผนเกษียณสถานะ Active มากกว่า 1 แผน ระบบใช้แผนแรก กรุณาพักแผนที่ไม่ใช้");
    }

    const transactions = [...safeData.transactions]
      .map((row) => ({
        ...row,
        parsedDate: parseDate(row.date),
        normalizedType: normalizeType(row.type),
        numericAmount: Math.abs(toNumber(row.amount))
      }))
      .sort((a, b) => {
        const dateA = a.parsedDate?.getTime() || 0;
        const dateB = b.parsedDate?.getTime() || 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b._rowNumber || 0) - (a._rowNumber || 0);
      });

    return {
      data: safeData,
      settings,
      totals: {
        accountAssets,
        investments,
        otherAssets,
        totalAssets,
        liabilities,
        netWorth,
        investableNetWorth: accountAssets + investments - liabilities,
        debtPayments,
        hasDebt,
        liquidCash: emergencyBalance
      },
      currentMonth,
      monthlySpending,
      monthly,
      savingsRate,
      debtServiceRatio,
      essentialExpense,
      emergencyMonths,
      emergencyFund,
      expenseClassification,
      budget,
      sinkingFunds,
      debt,
      insurance,
      investmentOverview,
      retirement,
      fourTiers,
      snapshots,
      netWorthChange,
      netWorthChangeRate,
      allocation,
      goals,
      transactions,
      warnings
    };
  }

  global.WealthAnalytics = Object.freeze({
    toNumber,
    parseDate,
    monthKey,
    normalizeType,
    normalizeAccountRole,
    accountRoleLabel,
    normalizeExpenseGroup,
    expenseGroupLabel,
    normalizeAssetClass,
    assetClassLabel,
    defaultRiskForAssetClass,
    investmentRisk,
    normalizeInvestmentPurpose,
    getInvestmentPrincipal,
    hasInvestmentMarketValue,
    getInvestmentValue,
    getAssetValue,
    rowsToSettings,
    buildMonthlyCashflow,
    buildYearCashflow,
    getTransactionYears,
    getExpenseMonthOptions,
    buildExpenseBreakdown,
    buildIncomeBreakdown,
    buildBudgetOverview,
    buildSinkingFundOverview,
    buildDebtOverview,
    buildInsuranceOverview,
    buildInvestmentOverview,
    buildRetirementOverview,
    buildFourTierOverview,
    buildGoalRows,
    buildViewModel
  });
})(window);
