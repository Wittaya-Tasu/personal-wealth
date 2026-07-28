(function exposeWealthAnalytics(global) {
  "use strict";

  const INCOME_TYPES = new Set(["income", "รายรับ"]);
  const EXPENSE_TYPES = new Set(["expense", "รายจ่าย"]);
  const TRANSFER_TYPES = new Set(["transfer", "โอน", "โอนเงิน"]);
  const COLORS = ["#45d18b", "#e2c46d", "#68a7ff", "#b594f6", "#f4a65a", "#ff746f", "#91a49b"];
  const MONTHLY_SPENDING_ACCOUNT_NAME = "บัญชีใช้จ่ายรายเดือน";
  const FINANCIAL_GOAL_TYPES = new Set(["financial", "finance", "การเงิน"]);
  const MILESTONE_GOAL_TYPES = new Set(["milestone", "life", "ชีวิต", "หมุดหมาย"]);
  const ACCOUNT_PROGRESS_SOURCES = new Set(["account", "บัญชี"]);
  const COMPLETED_GOAL_STATUSES = new Set(["completed", "complete", "done", "สำเร็จ", "เสร็จสิ้น"]);

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
    return normalized || "other";
  }

  function normalizeAccountName(value) {
    return String(value || "").trim().toLocaleLowerCase("th-TH");
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

  function getInvestmentValue(row) {
    const current = toNumber(row.current_value);
    if (current || row.current_value === 0 || row.current_value === "0") return current;
    return toNumber(row.units) * toNumber(row.current_price);
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
      add(classifyAllocation(row.category, row.asset_name), getInvestmentValue(row));
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

  function buildWarnings(data, settings, snapshots, monthly, goals = []) {
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
    if (settings.monthly_budget > 0 && monthly.at(-1)?.expense > settings.monthly_budget) {
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
      settings: data.settings || []
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

    const cashInvestments = sum(safeData.investments.filter(isCashInvestment), getInvestmentValue);
    const cashAccounts = settings.include_accounts_in_net_worth
      ? sum(safeData.accounts, (row) => row.balance)
      : 0;
    const liquidCash = cashInvestments + cashAccounts;
    const recentThree = monthly.slice(-3);
    const activeExpenseMonths = recentThree.filter((row) => row.transactionCount > 0);
    const averageExpense = activeExpenseMonths.length
      ? activeExpenseMonths.reduce((acc, row) => acc + row.expense, 0) / activeExpenseMonths.length
      : 0;
    const essentialExpense = settings.essential_expense_override === ""
      ? averageExpense
      : toNumber(settings.essential_expense_override);
    const emergencyMonths = essentialExpense > 0 ? liquidCash / essentialExpense : null;
    const snapshots = buildSnapshotHistory(safeData.snapshots);
    const previousSnapshot = snapshots.length >= 2 ? snapshots.at(-2) : null;
    const latestSnapshot = snapshots.at(-1) || null;
    const referenceNetWorth = latestSnapshot?.netWorth || netWorth;
    const netWorthChange = previousSnapshot ? referenceNetWorth - previousSnapshot.netWorth : null;
    const netWorthChangeRate = previousSnapshot && previousSnapshot.netWorth !== 0
      ? netWorthChange / Math.abs(previousSnapshot.netWorth)
      : null;
    const allocation = buildAllocation(safeData, settings.include_accounts_in_net_worth);
    const goals = buildGoalRows(safeData.goals, safeData.accounts);
    const warnings = buildWarnings(safeData, settings, snapshots, monthly, goals);
    if (monthlySpending.status === "missing") {
      warnings.push(`ไม่พบบัญชี “${MONTHLY_SPENDING_ACCOUNT_NAME}” จึงยังแสดงเงินใช้จ่ายคงเหลือไม่ได้`);
    }
    if (monthlySpending.status === "duplicate") {
      warnings.push(`พบบัญชีชื่อ “${MONTHLY_SPENDING_ACCOUNT_NAME}” ซ้ำ จึงไม่สามารถระบุยอดเงินใช้จ่ายคงเหลือได้อย่างแน่นอน`);
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
        liquidCash
      },
      currentMonth,
      monthlySpending,
      monthly,
      savingsRate,
      debtServiceRatio,
      essentialExpense,
      emergencyMonths,
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
    getInvestmentValue,
    getAssetValue,
    rowsToSettings,
    buildMonthlyCashflow,
    buildGoalRows,
    buildViewModel
  });
})(window);
