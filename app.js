(function runPersonalWealthApp(global) {
  "use strict";

  const config = global.APP_CONFIG;
  const analytics = global.WealthAnalytics;
  const store = new global.GoogleSheetsStore(config);
  const state = {
    data: null,
    viewModel: null,
    activeView: "dashboard",
    wealthTab: "investments",
    activeSheet: null,
    activeFormType: null,
    activeRecord: null,
    gratitudeDate: localIsoDate(),
    goalSchemaMissingHeaders: [],
    investmentSchemaMissingHeaders: [],
    transactionSchemaMissingHeaders: [],
    creditCardSchemaMissingHeaders: [],
    gratitudeSchemaMissingHeaders: [],
    charts: {
      netWorth: null,
      cashflow: null,
      expenseBreakdown: null,
      allocation: null
    }
  };

  const pageTitles = {
    dashboard: "ภาพรวม",
    transactions: "รายรับ–รายจ่าย",
    wealth: "ความมั่งคั่ง",
    goals: "เป้าหมาย",
    gratitude: "ขอบคุณวันนี้"
  };

  const formMeta = {
    transaction: { title: "รายรับ–รายจ่าย", eyebrow: "CASH FLOW", sheet: config.SHEETS.transactions },
    creditCardPayment: { title: "ชำระบัตรเครดิต", eyebrow: "CREDIT CARD", sheet: config.SHEETS.transactions },
    investment: { title: "เงินลงทุน", eyebrow: "PORTFOLIO", sheet: config.SHEETS.investments },
    account: { title: "บัญชีเงิน", eyebrow: "CASH & BANK", sheet: config.SHEETS.accounts },
    asset: { title: "ทรัพย์สิน", eyebrow: "ASSET", sheet: config.SHEETS.assets },
    liability: { title: "หนี้สิน", eyebrow: "LIABILITY", sheet: config.SHEETS.liabilities },
    goal: { title: "เป้าหมาย", eyebrow: "GOAL", sheet: config.SHEETS.goals }
  };

  const EXPENSE_CATEGORIES = [
    "อาหาร", "เครื่องดื่ม", "หนังสือ", "ทำบุญ", "ของใช้ส่วนตัว",
    "ค่าเดินทาง", "ครอบครัว", "สุขภาพ", "อิเล็กทรอนิกส์", "อื่น ๆ"
  ];

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatCurrency(value, compact = false, fractionDigits = 0) {
    const number = analytics.toNumber(value);
    const options = {
      style: "currency",
      currency: config.CURRENCY,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    };
    if (compact && Math.abs(number) >= 1_000_000) {
      options.notation = "compact";
      options.compactDisplay = "short";
    }
    return new Intl.NumberFormat(config.LOCALE, options).format(number);
  }

  function formatPercent(value, digits = 0) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    return new Intl.NumberFormat(config.LOCALE, {
      style: "percent",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatExpensePercent(value) {
    return formatPercent(value, value > 0 && value < 0.1 ? 1 : 0);
  }

  function formatDate(date, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!date || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(config.LOCALE, options);
  }

  function localIsoDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setClassName(id, value) {
    const element = document.getElementById(id);
    if (element) element.className = value;
  }

  function setConnection(status, text, showLogin = false) {
    const bar = qs("#connectionBar");
    bar.className = `connection-bar ${status ? `is-${status}` : ""}`;
    setText("connectionText", text);
    const loginButton = qs("#loginButton");
    loginButton.textContent = "แตะเพื่อเชื่อมต่อ Google";
    loginButton.hidden = !showLogin;
  }

  function showToast(message, type = "success") {
    const toast = createElement("div", `toast ${type === "error" ? "error" : ""}`, message);
    qs("#toastRegion").appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function emptyState() {
    return qs("#emptyStateTemplate").content.firstElementChild.cloneNode(true);
  }

  function setLoading(isLoading) {
    qs("#syncButton").classList.toggle("is-spinning", isLoading);
    qsa("button[type='submit']").forEach((button) => {
      if (button.closest(".data-form, .gratitude-form")) button.disabled = isLoading;
    });
  }

  async function initialize() {
    bindEvents();
    registerServiceWorker();
    try {
      setConnection("loading", "กำลังเตรียมการเชื่อมต่อ Google…");
      await store.init();
      if (store.isAuthorized()) {
        await refreshData();
      } else {
        setConnection("offline", "ยังไม่ได้เชื่อมต่อ Google Sheet", true);
        renderSignedOutState();
      }
    } catch (error) {
      handleError(error);
    }
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("./sw.js?v=2.6.0").catch(() => {});
    }
  }

  function bindEvents() {
    qs("#loginButton").addEventListener("click", signIn);
    qs("#logoutButton").addEventListener("click", signOut);
    qs("#snapshotButton").addEventListener("click", saveCurrentSnapshot);
    qs("#syncButton").addEventListener("click", async () => {
      try {
        if (store.isAuthorized()) await refreshData();
        else await signIn();
      } catch (error) {
        handleError(error);
      }
    });
    qs("#settingsButton").addEventListener("click", openSettings);
    qs("#quickAddButton").addEventListener("click", openQuickAdd);
    qs("#wealthAddButton").addEventListener("click", openQuickAdd);

    qsa(".nav-item").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.target));
    });
    qsa(".nav-shortcut").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.target));
    });
    qsa(".open-add").forEach((button) => {
      button.addEventListener("click", () => openForm(button.dataset.form));
    });

    qsa(".wealth-tabs button").forEach((button) => {
      button.addEventListener("click", () => {
        state.wealthTab = button.dataset.wealthTab;
        qsa(".wealth-tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderWealthList();
      });
    });

    qs("#cashflowPeriod").addEventListener("change", renderCashflowChart);
    qs("#cashflowYear").addEventListener("change", renderCashflowChart);
    qs("#expenseMonth").addEventListener("change", renderExpenseBreakdownChart);
    qs("#transactionSearch").addEventListener("input", renderTransactions);
    qs("#transactionTypeFilter").addEventListener("change", renderTransactions);
    qs("#modalOverlay").addEventListener("click", closeSheets);
    qsa(".close-sheet").forEach((button) => button.addEventListener("click", closeSheets));
    qs("#formBackButton").addEventListener("click", openQuickAdd);
    qs("#quickAddSheet").addEventListener("click", (event) => {
      const button = event.target.closest("[data-form]");
      if (button) openForm(button.dataset.form);
    });
    qs("#dynamicForm").addEventListener("submit", submitDynamicForm);
    qs("#settingsForm").addEventListener("submit", submitSettings);
    qs("#transactionList").addEventListener("click", handleListAction);
    qs("#wealthList").addEventListener("click", handleListAction);
    qs("#goalList").addEventListener("click", handleListAction);
    qs("#gratitudeDate").addEventListener("change", (event) => {
      state.gratitudeDate = event.target.value || localIsoDate();
      renderGratitude();
    });
    qs("#gratitudePreviousDay").addEventListener("click", () => changeGratitudeDate(-1));
    qs("#gratitudeNextDay").addEventListener("click", () => changeGratitudeDate(1));
    qs("#gratitudeForm").addEventListener("submit", submitGratitude);
    qs("#gratitudeForm").addEventListener("input", updateGratitudeProgressFromForm);
    qs("#gratitudeForm").addEventListener("click", (event) => {
      const clear = event.target.closest(".clear-gratitude");
      if (!clear) return;
      const card = clear.closest("[data-gratitude-slot]");
      qs("select", card).value = "";
      qs("textarea", card).value = "";
      updateGratitudeProgressFromForm();
    });
    qs("#gratitudeHistory").addEventListener("click", (event) => {
      const button = event.target.closest("[data-gratitude-date]");
      if (!button) return;
      state.gratitudeDate = button.dataset.gratitudeDate;
      renderGratitude();
      global.scrollTo({ top: 0, behavior: "smooth" });
    });

    global.addEventListener("online", async () => {
      if (!store.isAuthorized()) return;
      try {
        await refreshData();
      } catch (error) {
        handleError(error);
      }
    });
    global.addEventListener("offline", () => setConnection("offline", "ออฟไลน์ — แสดงข้อมูลล่าสุดที่โหลดไว้"));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSheets();
    });
  }

  async function signIn() {
    try {
      setLoading(true);
      setConnection("loading", "กำลังรอการอนุญาตจาก Google…");
      await store.signIn("");
      await refreshData();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await store.signOut();
      closeSheets();
      state.data = null;
      state.viewModel = null;
      renderSignedOutState();
      setConnection("offline", "ออกจากระบบแล้ว — ยังไม่ได้เชื่อมต่อ Google Sheet", true);
      showToast("ออกจากระบบ Google แล้ว");
    } catch (error) {
      handleError(error);
    }
  }

  async function refreshData() {
    setLoading(true);
    setConnection("loading", "กำลังซิงก์ข้อมูลจาก Google Sheet…");
    try {
      const data = await store.loadAll();
      state.data = data;
      state.goalSchemaMissingHeaders = store.getMissingGoalMetadataHeaders();
      state.investmentSchemaMissingHeaders = store.getMissingInvestmentFundingHeaders();
      state.transactionSchemaMissingHeaders = store.getMissingTransactionItemHeaders();
      state.creditCardSchemaMissingHeaders = store.getMissingCreditCardHeaders();
      state.gratitudeSchemaMissingHeaders = store.getMissingGratitudeHeaders();
      state.viewModel = analytics.buildViewModel(data, config.DEFAULTS);
      populateChartFilters();
      renderAll();
      setConnection("", `เชื่อมต่อแล้ว · อัปเดต ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (error) {
      if (error?.status === 401 || error?.result?.error?.code === 401) {
        store.clearSessionToken();
        setConnection("offline", "สิทธิ์หมดอายุ กรุณาเชื่อมต่อ Google ใหม่", true);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function renderSignedOutState() {
    [
      "netWorthValue", "monthlySpendingBalanceValue", "savingsRateValue", "emergencyMonthsValue",
      "debtServiceValue", "totalAssetsCenter", "expenseBreakdownTotal", "txIncomeSummary", "txExpenseSummary",
      "txBalanceSummary", "wealthAssetsSummary", "wealthLiabilitiesSummary", "wealthNetSummary"
    ].forEach((id) => setText(id, id === "emergencyMonthsValue" ? "— เดือน" : "฿—"));
    setText("netWorthStatus", "รอเชื่อมต่อ");
    setText("netWorthChange", "เชื่อมต่อ Google เพื่อดูข้อมูลจริง");
    ["recentTransactions", "transactionList", "wealthList", "goalPreview", "goalList"].forEach((id) => {
      const container = document.getElementById(id);
      container.replaceChildren(emptyState());
    });
    renderGratitude();
    qs("#expenseBreakdownLegend").replaceChildren();
    destroyCharts();
  }

  function renderAll() {
    renderDashboard();
    renderTransactions();
    renderWealth();
    renderGoals();
    renderGratitude();
  }

  function populateChartFilters() {
    const now = new Date();
    const yearSelect = qs("#cashflowYear");
    const currentYear = now.getFullYear();
    const previousYear = Number(yearSelect.value || currentYear);
    const years = analytics.getTransactionYears(state.data?.transactions, now);
    yearSelect.replaceChildren();
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = `พ.ศ. ${year + 543}`;
      yearSelect.appendChild(option);
    });
    yearSelect.value = years.includes(previousYear) ? String(previousYear) : String(currentYear);

    const monthSelect = qs("#expenseMonth");
    const currentMonthKey = analytics.monthKey(now);
    const previousMonth = monthSelect.value || currentMonthKey;
    const months = analytics.getExpenseMonthOptions(state.data?.transactions, now);
    monthSelect.replaceChildren();
    months.forEach((month) => {
      const option = document.createElement("option");
      option.value = month.key;
      option.textContent = month.label;
      monthSelect.appendChild(option);
    });
    monthSelect.value = months.some((month) => month.key === previousMonth)
      ? previousMonth
      : currentMonthKey;
  }

  function renderDashboard() {
    const vm = state.viewModel;
    if (!vm) return;
    const changeClass = vm.netWorthChange === null ? "neutral" : vm.netWorthChange >= 0 ? "positive" : "negative";

    setText("netWorthValue", formatCurrency(vm.totals.netWorth));
    setText("asOfLabel", `ข้อมูลล่าสุด ${formatDate(new Date())}`);
    setText("netWorthStatus", vm.netWorthChange === null ? "มูลค่าปัจจุบัน" : vm.netWorthChange >= 0 ? "เพิ่มขึ้น" : "ลดลง");
    setClassName("netWorthStatus", `status-pill ${vm.netWorthChange === null ? "neutral" : changeClass}`);

    if (vm.netWorthChange === null) {
      setText("netWorthChange", "ยังไม่มี Snapshot เดือนก่อนสำหรับเปรียบเทียบ");
    } else {
      const sign = vm.netWorthChange >= 0 ? "+" : "";
      setText("netWorthChange", `${sign}${formatCurrency(vm.netWorthChange)} (${formatPercent(vm.netWorthChangeRate, 1)}) จาก Snapshot ก่อน`);
    }
    setClassName("netWorthChange", `hero-change ${changeClass}`);

    const monthlySpending = vm.monthlySpending;
    if (monthlySpending.status === "available") {
      setText("monthlySpendingBalanceValue", formatCurrency(monthlySpending.balance));
      setClassName("monthlySpendingBalanceValue", monthlySpending.balance < 0
        ? "negative"
        : monthlySpending.balance > 0
          ? "positive"
          : "");
      setText("monthlySpendingBalanceDetail", `ใช้จากบัญชีนี้เดือนนี้ ${formatCurrency(monthlySpending.expense, true)}`);
    } else {
      setText("monthlySpendingBalanceValue", "฿—");
      setClassName("monthlySpendingBalanceValue", "");
      setText(
        "monthlySpendingBalanceDetail",
        monthlySpending.status === "duplicate"
          ? "พบบัญชีใช้จ่ายรายเดือนซ้ำ"
          : "ไม่พบบัญชีใช้จ่ายรายเดือน"
      );
    }
    setText("savingsRateValue", formatPercent(vm.savingsRate, 0));
    qs("#savingsRateBar").style.width = `${Math.max(0, Math.min((vm.savingsRate || 0) * 100, 100))}%`;
    setText("emergencyMonthsValue", vm.emergencyMonths === null ? "— เดือน" : `${vm.emergencyMonths.toFixed(1)} เดือน`);
    setText("emergencyDetail", `เงินพร้อมใช้ ${formatCurrency(vm.totals.liquidCash, true)} · เป้าหมาย ${vm.settings.emergency_months_target} เดือน`);
    if (!vm.totals.hasDebt) {
      setText("debtServiceValue", "0%");
      setClassName("debtServiceValue", "positive");
      setText("debtServiceDetail", "ไม่มีภาระหนี้");
    } else {
      setText("debtServiceValue", formatPercent(vm.debtServiceRatio, 0));
      setClassName("debtServiceValue", "");
      setText(
        "debtServiceDetail",
        vm.debtServiceRatio === null
          ? `ค่างวด ${formatCurrency(vm.totals.debtPayments, true)}/เดือน · ยังไม่มีรายรับเดือนนี้`
          : `ค่างวดรวม ${formatCurrency(vm.totals.debtPayments, true)}/เดือน`
      );
    }
    setText("totalAssetsCenter", formatCurrency(vm.totals.totalAssets, true, 1));

    renderWarnings();
    renderNetWorthChart();
    renderCashflowChart();
    renderExpenseBreakdownChart();
    renderAllocationChart();
    renderGoalContainer(qs("#goalPreview"), vm.goals.slice(0, 3), false);
    renderTransactionContainer(qs("#recentTransactions"), vm.transactions.slice(0, 5), false);
  }

  function renderWarnings() {
    const container = qs("#dataWarnings");
    const warnings = [...(state.viewModel?.warnings || [])];
    if (state.goalSchemaMissingHeaders.length) {
      warnings.push(
        `ฟังก์ชัน Goal รุ่นใหม่ยังไม่พร้อม: เพิ่ม Header ในชีต Goals ต่อท้ายแถวที่ 1 ได้แก่ `
        + state.goalSchemaMissingHeaders.join(", ")
      );
    }
    if (state.investmentSchemaMissingHeaders.length) {
      warnings.push(
        `ฟังก์ชันหักเงินลงทุนจากบัญชียังไม่พร้อม: เพิ่ม Header ในชีต Investments ต่อท้ายแถวที่ 1 ได้แก่ `
        + state.investmentSchemaMissingHeaders.join(", ")
      );
    }
    if (state.transactionSchemaMissingHeaders.length) {
      warnings.push(
        `ฟังก์ชันชื่อรายการรายจ่ายยังไม่พร้อม: เพิ่ม Header ในชีต Transactions ต่อท้ายแถวที่ 1 ได้แก่ `
        + state.transactionSchemaMissingHeaders.join(", ")
      );
    }
    if (state.creditCardSchemaMissingHeaders.length) {
      warnings.push(
        `ระบบบัตรเครดิตยังไม่พร้อม: กรุณาทำ Migration v2.5.0 และเพิ่ม Header `
        + state.creditCardSchemaMissingHeaders.join(", ")
      );
    }
    container.hidden = warnings.length === 0;
    container.replaceChildren();
    warnings.forEach((warning) => {
      const item = createElement("div", "warning-item");
      item.innerHTML = '<svg aria-hidden="true"><use href="#i-alert"></use></svg>';
      item.appendChild(createElement("span", "", warning));
      container.appendChild(item);
    });
  }

  function baseChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#071410",
          titleColor: "#91a49b",
          bodyColor: "#f5f7f2",
          borderColor: "rgba(226,238,232,.16)",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          titleFont: { family: "Sarabun" },
          bodyFont: { family: "Sarabun" }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#6d8077", font: { family: "Sarabun", size: 10 } }
        },
        y: {
          grid: { color: "rgba(226,238,232,.06)" },
          border: { display: false },
          ticks: {
            color: "#6d8077",
            font: { family: "Sarabun", size: 10 },
            callback: (value) => formatCurrency(value, true)
          }
        }
      }
    };
  }

  function renderNetWorthChart() {
    state.charts.netWorth?.destroy();
    state.charts.netWorth = null;
    const history = state.viewModel?.snapshots || [];
    const empty = qs("#netWorthEmpty");
    empty.hidden = history.length > 0;
    if (!history.length || !global.Chart) return;

    const options = baseChartOptions();
    options.scales.y.display = false;
    options.scales.x.ticks.maxTicksLimit = 8;
    options.plugins.tooltip.callbacks = {
      label: (context) => formatCurrency(context.raw)
    };

    state.charts.netWorth = new global.Chart(qs("#netWorthChart"), {
      type: "line",
      data: {
        labels: history.map((row) => row.label),
        datasets: [{
          data: history.map((row) => row.netWorth),
          borderColor: "#e2c46d",
          backgroundColor: "rgba(226,196,109,.10)",
          borderWidth: 2,
          pointBackgroundColor: "#e2c46d",
          pointRadius: history.length <= 2 ? 4 : 2,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.32
        }]
      },
      options
    });
  }

  function renderCashflowChart() {
    state.charts.cashflow?.destroy();
    state.charts.cashflow = null;
    if (!state.viewModel || !global.Chart) return;
    const count = Number(qs("#cashflowPeriod").value || 6);
    const selectedYear = Number(qs("#cashflowYear").value || new Date().getFullYear());
    const currentDate = new Date();
    const endMonthIndex = selectedYear === currentDate.getFullYear()
      ? currentDate.getMonth()
      : 11;
    const yearRows = analytics.buildYearCashflow(state.data?.transactions, selectedYear);
    const startMonthIndex = count === 12 ? 0 : Math.max(0, endMonthIndex - count + 1);
    const rows = yearRows.slice(startMonthIndex, endMonthIndex + 1);
    const options = baseChartOptions();
    options.layout = { padding: { top: 8, right: 10, bottom: 0, left: 4 } };
    options.plugins.legend = {
      display: true,
      position: "bottom",
      labels: {
        color: "#91a49b",
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        pointStyle: "circle",
        font: { family: "Sarabun", size: 10 }
      }
    };
    options.plugins.tooltip.displayColors = true;
    options.plugins.tooltip.callbacks = {
      label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
    };
    options.scales.x.ticks.autoSkip = count === 12;
    options.scales.x.ticks.maxTicksLimit = count === 12 ? 12 : 6;
    options.scales.x.ticks.maxRotation = 0;
    options.scales.y.ticks.callback = (value) => formatCurrency(value);
    options.scales.y.ticks.maxTicksLimit = 6;
    options.scales.y.ticks.padding = 8;
    options.scales.y.afterFit = (axis) => {
      axis.width += 8;
    };

    state.charts.cashflow = new global.Chart(qs("#cashflowChart"), {
      type: "bar",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          { label: "รายรับ", data: rows.map((row) => row.income), backgroundColor: "#45d18b", borderRadius: 5 },
          { label: "รายจ่าย", data: rows.map((row) => row.expense), backgroundColor: "#ff746f", borderRadius: 5 }
        ]
      },
      options
    });
  }

  function renderExpenseBreakdownChart() {
    state.charts.expenseBreakdown?.destroy();
    state.charts.expenseBreakdown = null;
    const legend = qs("#expenseBreakdownLegend");
    const empty = qs("#expenseBreakdownEmpty");
    const center = qs("#expenseBreakdownCenter");
    legend.replaceChildren();
    if (!state.viewModel) return;

    const selectedMonth = qs("#expenseMonth").value || analytics.monthKey(new Date());
    const breakdown = analytics.buildExpenseBreakdown(state.data?.transactions, selectedMonth);
    setText("expenseBreakdownTotal", formatCurrency(breakdown.total));
    empty.hidden = breakdown.rows.length > 0;
    center.hidden = breakdown.rows.length === 0;

    breakdown.rows.forEach((row) => {
      const item = createElement("div", "legend-row");
      const dot = createElement("span", "legend-dot");
      dot.style.backgroundColor = row.color;
      item.append(
        dot,
        createElement("span", "", row.name),
        createElement("strong", "", `${formatExpensePercent(row.percentage)} · ${formatCurrency(row.value)}`)
      );
      legend.appendChild(item);
    });
    if (!breakdown.rows.length || !global.Chart) return;

    state.charts.expenseBreakdown = new global.Chart(qs("#expenseBreakdownChart"), {
      type: "doughnut",
      data: {
        labels: breakdown.rows.map((row) => row.name),
        datasets: [{
          data: breakdown.rows.map((row) => row.value),
          backgroundColor: breakdown.rows.map((row) => row.color),
          borderColor: "#10251f",
          borderWidth: 3,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#071410",
            titleColor: "#91a49b",
            bodyColor: "#f5f7f2",
            borderColor: "rgba(226,238,232,.16)",
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const row = breakdown.rows[context.dataIndex];
                return ` ${formatCurrency(context.raw)} (${formatExpensePercent(row.percentage)})`;
              }
            }
          }
        }
      }
    });
  }

  function renderAllocationChart() {
    state.charts.allocation?.destroy();
    state.charts.allocation = null;
    const rows = state.viewModel?.allocation || [];
    const legend = qs("#allocationLegend");
    legend.replaceChildren();

    rows.slice(0, 7).forEach((row) => {
      const item = createElement("div", "legend-row");
      const dot = createElement("span", "legend-dot");
      dot.style.backgroundColor = row.color;
      item.append(dot, createElement("span", "", row.name), createElement("strong", "", formatPercent(row.percentage, 0)));
      legend.appendChild(item);
    });
    if (!rows.length || !global.Chart) {
      legend.appendChild(emptyState());
      return;
    }

    state.charts.allocation = new global.Chart(qs("#allocationChart"), {
      type: "doughnut",
      data: {
        labels: rows.map((row) => row.name),
        datasets: [{
          data: rows.map((row) => row.value),
          backgroundColor: rows.map((row) => row.color),
          borderColor: "#10251f",
          borderWidth: 3,
          hoverOffset: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#071410",
            titleColor: "#91a49b",
            bodyColor: "#f5f7f2",
            borderColor: "rgba(226,238,232,.16)",
            borderWidth: 1,
            callbacks: {
              label: (context) => ` ${formatCurrency(context.raw)} (${formatPercent(rows[context.dataIndex].percentage, 0)})`
            }
          }
        }
      }
    });
  }

  function destroyCharts() {
    Object.values(state.charts).forEach((chart) => chart?.destroy());
    state.charts = { netWorth: null, cashflow: null, expenseBreakdown: null, allocation: null };
  }

  function renderTransactions() {
    const vm = state.viewModel;
    if (!vm) return;
    setText("txIncomeSummary", formatCurrency(vm.currentMonth.income));
    setText("txExpenseSummary", formatCurrency(vm.currentMonth.expense));
    const spendingBalance = vm.monthlySpending.status === "available"
      ? vm.monthlySpending.balance
      : null;
    setText("txBalanceSummary", spendingBalance === null ? "—" : formatCurrency(spendingBalance));
    setClassName("txBalanceSummary", spendingBalance === null
      ? ""
      : spendingBalance < 0
        ? "negative"
        : spendingBalance > 0
          ? "positive"
          : "");

    const query = qs("#transactionSearch").value.trim().toLowerCase();
    const filter = qs("#transactionTypeFilter").value;
    const rows = vm.transactions.filter((row) => {
      const haystack = `${row.category || ""} ${row.item_name || ""} ${row.note || ""} ${row.account_from || ""} ${row.account_to || ""} ${row.credit_card || ""}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesType = filter === "all" || row.normalizedType === filter;
      return matchesQuery && matchesType;
    });
    renderTransactionContainer(qs("#transactionList"), rows, true);
  }

  function transactionLabel(row) {
    if (row.normalizedType === "income") return row.category || "รายรับ";
    if (row.normalizedType === "expense") return row.item_name || row.category || "รายจ่าย";
    if (row.normalizedType === "transfer") return row.category || "โอนเงิน";
    if (row.normalizedType === "credit_card_payment") return row.item_name || "ชำระบัตรเครดิต";
    return row.category || row.type || "รายการ";
  }

  function renderTransactionContainer(container, rows, withActions) {
    container.replaceChildren();
    if (!rows.length) {
      container.appendChild(emptyState());
      return;
    }
    rows.forEach((row) => {
      const item = createElement("article", "transaction-row");
      const icon = createElement(
        "span",
        `transaction-icon ${row.normalizedType}`,
        row.normalizedType === "income" ? "+" : row.normalizedType === "expense" ? "−" : row.normalizedType === "credit_card_payment" ? "฿" : "↔"
      );
      const copy = createElement("div", "row-copy");
      const details = [formatDate(row.parsedDate, { day: "numeric", month: "short" })];
      if (row.normalizedType === "expense" && row.item_name && row.category) details.unshift(row.category);
      if (row.credit_card) details.push(row.credit_card);
      if (row.note) details.push(row.note);
      copy.append(
        createElement("strong", "", transactionLabel(row)),
        createElement("span", "", details.join(" · "))
      );
      const amount = createElement("span", `row-amount ${row.normalizedType === "income" ? "positive" : row.normalizedType === "expense" ? "negative" : ""}`);
      amount.textContent = `${row.normalizedType === "income" ? "+" : row.normalizedType === "expense" ? "−" : ""}${formatCurrency(row.numericAmount)}`;

      if (withActions) {
        const actions = createElement("div", "row-actions");
        actions.append(amount);
        if (row.normalizedType !== "credit_card_payment") {
          actions.append(editButton("transaction", row._rowNumber, transactionLabel(row)));
        }
        actions.append(deleteButton(config.SHEETS.transactions, row._rowNumber, transactionLabel(row)));
        item.append(icon, copy, actions);
      } else {
        item.append(icon, copy, amount);
      }
      container.appendChild(item);
    });
  }

  function renderWealth() {
    const vm = state.viewModel;
    if (!vm) return;
    setText("wealthAssetsSummary", formatCurrency(vm.totals.totalAssets));
    setText("wealthLiabilitiesSummary", formatCurrency(vm.totals.liabilities));
    setText("wealthNetSummary", formatCurrency(vm.totals.netWorth));
    renderWealthList();
  }

  function renderWealthList() {
    const container = qs("#wealthList");
    container.replaceChildren();
    const data = state.viewModel?.data;
    if (!data) return;
    const definitions = {
      investments: {
        rows: data.investments,
        sheet: config.SHEETS.investments,
        name: (row) => row.asset_name || "การลงทุน",
        meta: (row) => row.category || "ไม่ระบุประเภท",
        value: (row) => analytics.getInvestmentValue(row),
        icon: "↗",
        className: ""
      },
      accounts: {
        rows: data.accounts,
        sheet: config.SHEETS.accounts,
        name: (row) => row.account_name || "บัญชีเงิน",
        meta: (row) => `${row.type || "บัญชี"} · ${row.currency || "THB"}`,
        value: (row) => row.balance,
        icon: "฿",
        className: ""
      },
      assets: {
        rows: data.assets,
        sheet: config.SHEETS.assets,
        name: (row) => row.asset_name || "ทรัพย์สิน",
        meta: (row) => row.category || "ไม่ระบุประเภท",
        value: (row) => analytics.getAssetValue(row),
        icon: "◆",
        className: ""
      },
      liabilities: {
        rows: data.liabilities,
        sheet: config.SHEETS.liabilities,
        name: (row) => row.liability_name || "หนี้สิน",
        meta: (row) => store.isCreditCardLiability(row)
          ? "บัตรเครดิต · หนี้ระยะสั้น"
          : `ค่างวด ${formatCurrency(row.monthly_payment || 0)}/เดือน`,
        value: (row) => row.total_amount,
        icon: "−",
        className: "liability"
      }
    };
    const definition = definitions[state.wealthTab];
    if (!definition?.rows.length) {
      container.appendChild(emptyState());
      return;
    }

    definition.rows.forEach((row) => {
      const item = createElement("article", "wealth-row");
      const icon = createElement("span", `wealth-icon ${definition.className}`, definition.icon);
      const copy = createElement("div", "row-copy");
      copy.append(createElement("strong", "", definition.name(row)), createElement("span", "", definition.meta(row)));
      const actions = createElement("div", "row-actions");
      actions.append(createElement("span", `row-amount ${state.wealthTab === "liabilities" ? "negative" : ""}`, formatCurrency(definition.value(row))));
      if (state.wealthTab === "liabilities" && store.isCreditCardLiability(row)) {
        const payButton = createElement("button", "edit-button", "จ่ายบัตร");
        payButton.type = "button";
        payButton.dataset.payCardRow = row._rowNumber;
        actions.append(payButton);
      }
      const removeButton = deleteButton(definition.sheet, row._rowNumber, definition.name(row));
      if (state.wealthTab === "liabilities" && store.isCreditCardLiability(row)) {
        removeButton.className = "edit-button danger";
        removeButton.textContent = "ลบบัตร";
      }
      actions.append(
        editButton(
          state.wealthTab === "investments"
            ? "investment"
            : state.wealthTab === "accounts"
              ? "account"
              : state.wealthTab === "assets"
                ? "asset"
                : "liability",
          row._rowNumber,
          definition.name(row),
          state.wealthTab === "investments" ? "เพิ่มเงิน" : "แก้"
        ),
        removeButton
      );
      item.append(icon, copy, actions);
      container.appendChild(item);
    });
  }

  function renderGoals() {
    renderGoalContainer(qs("#goalList"), state.viewModel?.goals || [], true);
  }

  function gratitudeDateKey(value) {
    const date = analytics.parseDate(value);
    return date ? localIsoDate(date) : String(value || "").slice(0, 10);
  }

  function changeGratitudeDate(dayDelta) {
    const parts = String(state.gratitudeDate || localIsoDate()).split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    date.setDate(date.getDate() + dayDelta);
    state.gratitudeDate = localIsoDate(date);
    renderGratitude();
  }

  function gratitudeRowsForDate(dateKey) {
    return (state.data?.gratitude || [])
      .filter((row) => gratitudeDateKey(row.date) === dateKey)
      .sort((a, b) => Number(a.slot) - Number(b.slot));
  }

  function updateGratitudeProgressFromForm() {
    const form = qs("#gratitudeForm");
    if (!form) return;
    let filled = 0;
    for (let slot = 1; slot <= 3; slot += 1) {
      if (String(form.elements[`gratitude_text_${slot}`]?.value || "").trim()) filled += 1;
    }
    setText("gratitudeProgress", `${filled}/3`);
    qs("#gratitudeProgress").classList.toggle("is-complete", filled === 3);
  }

  function renderGratitude() {
    const form = qs("#gratitudeForm");
    if (!form) return;
    const dateKey = state.gratitudeDate || localIsoDate();
    state.gratitudeDate = dateKey;
    qs("#gratitudeDate").value = dateKey;
    const ready = store.isGratitudeSheetReady();
    qs("#gratitudeMigration").hidden = ready;
    qsa("select, textarea, button[type='submit']", form).forEach((field) => {
      field.disabled = !ready;
    });
    qsa(".clear-gratitude", form).forEach((button) => { button.disabled = !ready; });

    const rows = gratitudeRowsForDate(dateKey);
    for (let slot = 1; slot <= 3; slot += 1) {
      const row = rows.find((item) => Number(item.slot) === slot);
      form.elements[`category_${slot}`].value = row?.category || "";
      form.elements[`gratitude_text_${slot}`].value = row?.gratitude_text || "";
    }
    updateGratitudeProgressFromForm();
    renderGratitudeHistory();
  }

  function renderGratitudeHistory() {
    const container = qs("#gratitudeHistory");
    container.replaceChildren();
    const grouped = new Map();
    (state.data?.gratitude || []).forEach((row) => {
      const dateKey = gratitudeDateKey(row.date);
      if (!dateKey || !String(row.gratitude_text || "").trim()) return;
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey).push(row);
    });
    const days = [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    if (!days.length) {
      const empty = createElement("div", "empty-state");
      empty.append(
        createElement("span", "", "♡"),
        createElement("strong", "", "ยังไม่มีบันทึกขอบคุณ"),
        createElement("p", "", "เริ่มบันทึกสิ่งดี ๆ ของวันนี้ได้ด้านบน")
      );
      container.appendChild(empty);
      return;
    }
    days.forEach(([dateKey, rows]) => {
      const button = createElement("button", "gratitude-history-item");
      button.type = "button";
      button.dataset.gratitudeDate = dateKey;
      const date = analytics.parseDate(dateKey);
      const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))];
      const preview = rows
        .sort((a, b) => Number(a.slot) - Number(b.slot))
        .map((row) => row.gratitude_text)
        .join(" · ");
      const copy = createElement("span", "gratitude-history-copy");
      copy.append(
        createElement("strong", "", formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })),
        createElement("small", "", `${categories.join(", ") || "ไม่ระบุหมวด"} · ${preview}`)
      );
      button.append(copy, createElement("span", "gratitude-history-count", `${rows.length}/3`));
      container.appendChild(button);
    });
  }

  async function submitGratitude(event) {
    event.preventDefault();
    if (!ensureCanWrite()) return;
    const form = event.currentTarget;
    const entries = [];
    for (let slot = 1; slot <= 3; slot += 1) {
      const category = form.elements[`category_${slot}`].value;
      const gratitudeText = form.elements[`gratitude_text_${slot}`].value.trim();
      if ((category && !gratitudeText) || (!category && gratitudeText)) {
        showToast(`เรื่องที่ ${slot} ต้องเลือกหมวดหมู่และกรอกข้อความให้ครบ`, "error");
        return;
      }
      entries.push({ slot, category, gratitude_text: gratitudeText });
    }
    const filled = entries.filter((entry) => entry.gratitude_text).length;
    if (!filled && gratitudeRowsForDate(state.gratitudeDate).length) {
      if (!global.confirm("ลบคำขอบคุณทั้งหมดของวันที่เลือกหรือไม่?")) return;
    }
    try {
      setLoading(true);
      await store.saveDailyGratitude(state.gratitudeDate, entries);
      await refreshData();
      showToast(filled ? `บันทึกคำขอบคุณ ${filled}/3 เรื่องแล้ว` : "ลบคำขอบคุณของวันที่เลือกแล้ว");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  function renderGoalContainer(container, rows, withActions) {
    container.replaceChildren();
    if (!rows.length) {
      container.appendChild(emptyState());
      return;
    }
    rows.forEach((goal) => {
      const item = createElement("article", "goal-row");
      const topline = createElement("div", "goal-topline");
      topline.appendChild(createElement("strong", "", goal.goal_name || "เป้าหมาย"));
      const summaryText = goal.isMilestone
        ? goal.statusLabel
        : goal.trackingError
          ? "ตรวจสอบบัญชี"
          : formatPercent(goal.percentage, 0);
      if (withActions) {
        const actions = createElement("div", "row-actions");
        actions.append(
          createElement(
            "span",
            goal.isMilestone ? `goal-status is-${goal.status}` : goal.trackingError ? "goal-status is-warning" : "",
            summaryText
          ),
          editButton("goal", goal._rowNumber, goal.goal_name || "เป้าหมาย"),
          deleteButton(config.SHEETS.goals, goal._rowNumber, goal.goal_name || "เป้าหมาย")
        );
        topline.appendChild(actions);
      } else {
        topline.appendChild(createElement(
          "span",
          goal.isMilestone ? `goal-status is-${goal.status}` : goal.trackingError ? "goal-status is-warning" : "",
          summaryText
        ));
      }
      const meta = createElement("div", "goal-meta");
      if (goal.isMilestone) {
        meta.append(
          createElement("span", "", "เป้าหมายแบบ Milestone"),
          createElement("span", "", goal.deadline ? `ครบ ${formatDate(goal.deadline, { month: "short", year: "numeric" })}` : "ไม่กำหนดวัน")
        );
        item.append(topline, meta);
      } else {
        const progress = createElement("div", "goal-progress");
        const progressBar = createElement("span");
        progressBar.style.width = `${Math.max(0, (goal.percentage || 0) * 100)}%`;
        progress.appendChild(progressBar);
        const sourceText = goal.progressSource === "account"
          ? goal.linkedAccount
            ? `อ้างอิง ${goal.linkedAccount.account_name}`
            : goal.trackingError
          : "อัปเดตยอดสะสมเอง";
        meta.append(
          createElement("span", "", `${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`),
          createElement(
            "span",
            "",
            `${sourceText}${goal.deadline ? ` · ครบ ${formatDate(goal.deadline, { month: "short", year: "numeric" })}` : ""}`
          )
        );
        item.append(topline, progress, meta);
      }
      container.appendChild(item);
    });
  }

  function deleteButton(sheet, rowNumber, label) {
    const button = createElement("button", "delete-button");
    button.type = "button";
    button.setAttribute("aria-label", `ลบ ${label}`);
    button.dataset.deleteSheet = sheet;
    button.dataset.deleteRow = rowNumber;
    button.dataset.deleteLabel = label;
    button.innerHTML = '<svg><use href="#i-trash"></use></svg>';
    return button;
  }

  function editButton(type, rowNumber, label, buttonText = "แก้") {
    const button = createElement("button", "edit-button", buttonText);
    button.type = "button";
    button.setAttribute("aria-label", `${buttonText} ${label}`);
    button.dataset.editType = type;
    button.dataset.editRow = rowNumber;
    return button;
  }

  async function handleListAction(event) {
    const payCard = event.target.closest("[data-pay-card-row]");
    if (payCard) {
      const record = (state.data?.liabilities || []).find((row) => row._rowNumber === Number(payCard.dataset.payCardRow));
      if (record) openForm("creditCardPayment", record);
      return;
    }
    const edit = event.target.closest("[data-edit-type]");
    if (edit) {
      const collectionMap = {
        transaction: "transactions",
        investment: "investments",
        account: "accounts",
        asset: "assets",
        liability: "liabilities",
        goal: "goals"
      };
      const collection = collectionMap[edit.dataset.editType];
      const record = (state.data?.[collection] || []).find((row) => row._rowNumber === Number(edit.dataset.editRow));
      if (record) openForm(edit.dataset.editType, record);
      return;
    }
    const button = event.target.closest("[data-delete-sheet]");
    if (!button) return;
    const label = button.dataset.deleteLabel || "รายการนี้";
    const sheetName = button.dataset.deleteSheet;
    const rowNumber = Number(button.dataset.deleteRow);
    const transaction = sheetName === config.SHEETS.transactions
      ? (state.data?.transactions || []).find((row) => row._rowNumber === rowNumber)
      : null;
    const investment = sheetName === config.SHEETS.investments
      ? (state.data?.investments || []).find((row) => row._rowNumber === rowNumber)
      : null;
    const account = sheetName === config.SHEETS.accounts
      ? (state.data?.accounts || []).find((row) => row._rowNumber === rowNumber)
      : null;
    const liability = sheetName === config.SHEETS.liabilities
      ? (state.data?.liabilities || []).find((row) => row._rowNumber === rowNumber)
      : null;
    const creditCard = liability && store.isCreditCardLiability(liability) ? liability : null;
    const accountEffectText = transaction
      ? store.isAccountLinkedTransaction(transaction)
        ? "\nระบบจะย้อนผลของรายการนี้ในยอดบัญชีหรือยอดหนี้บัตรก่อนลบ"
        : "\nรายการเดิมก่อน v2.1.0 จะถูกลบโดยไม่ปรับ Opening Balance"
      : investment
        ? store.isAccountLinkedInvestment(investment)
          ? "\nระบบจะคืนเงินลงทุนเดิมเข้าบัญชีต้นทางก่อนลบ"
          : "\nInvestment เดิมจะถูกลบโดยไม่ปรับยอด Accounts"
        : "";
    if (creditCard) {
      const balance = formatCurrency(creditCard.total_amount);
      if (!global.confirm(`ลบบัตร “${label}” ออกจากระบบ?\nยอดหนี้ปัจจุบัน ${balance}\nประวัติรายการเดิมจะยังอยู่ แต่จะเลือกบัตรนี้ทำรายการใหม่ไม่ได้`)) return;
      if (global.prompt("เพื่อยืนยันการลบบัตรและยอดหนี้ พิมพ์คำว่า ลบบัตร") !== "ลบบัตร") return;
    } else if (!global.confirm(`ยืนยันลบ “${label}”?\nการลบนี้จะนำแถวออกจาก Google Sheet${accountEffectText}`)) return;
    try {
      setLoading(true);
      if (transaction) {
        await store.deleteTransactionWithAccountEffects(transaction);
      } else if (investment) {
        await store.deleteInvestmentWithAccountEffects(investment);
      } else if (account) {
        await store.deleteAccount(rowNumber);
      } else if (creditCard) {
        await store.deleteCreditCard(rowNumber);
      } else {
        await store.delete(sheetName, rowNumber);
      }
      await refreshData();
      showToast(`ลบ ${label} แล้ว`);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  function navigate(target) {
    if (!pageTitles[target]) return;
    state.activeView = target;
    qsa(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));
    qsa(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.target === target));
    setText("pageTitle", pageTitles[target]);
    global.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openOverlay(sheet) {
    qsa(".bottom-sheet").forEach((item) => {
      const isTarget = item === sheet;
      item.classList.toggle("is-open", isTarget);
      item.setAttribute("aria-hidden", isTarget ? "false" : "true");
    });
    const overlay = qs("#modalOverlay");
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.classList.add("modal-open");
  }

  function closeSheets() {
    qsa(".bottom-sheet").forEach((sheet) => {
      sheet.classList.remove("is-open");
      sheet.setAttribute("aria-hidden", "true");
    });
    const overlay = qs("#modalOverlay");
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.hidden = true;
    }, 220);
    document.body.classList.remove("modal-open");
    state.activeSheet = null;
    state.activeFormType = null;
    state.activeRecord = null;
  }

  function ensureCanWrite() {
    if (store.isAuthorized()) return true;
    showToast("กรุณาเชื่อมต่อ Google ก่อนบันทึกข้อมูล", "error");
    signIn();
    return false;
  }

  function openQuickAdd() {
    if (!ensureCanWrite()) return;
    state.activeSheet = qs("#quickAddSheet");
    openOverlay(state.activeSheet);
  }

  function openSettings() {
    if (!ensureCanWrite()) return;
    populateSettings();
    state.activeSheet = qs("#settingsSheet");
    openOverlay(state.activeSheet);
  }

  function populateSettings() {
    const settings = state.viewModel?.settings || config.DEFAULTS;
    const form = qs("#settingsForm");
    form.elements.monthly_budget.value = settings.monthly_budget || "";
    form.elements.emergency_months_target.value = settings.emergency_months_target || 6;
    form.elements.essential_expense_override.value = settings.essential_expense_override === ""
      ? ""
      : settings.essential_expense_override;
    form.elements.include_accounts_in_net_worth.checked = Boolean(settings.include_accounts_in_net_worth);
  }

  function openForm(type, record = null) {
    if (!ensureCanWrite() || !formMeta[type]) return;
    state.activeFormType = type;
    state.activeRecord = record;
    const meta = formMeta[type];
    setText("formEyebrow", meta.eyebrow);
    setText(
      "formTitle",
      type === "investment"
        ? record
          ? `เพิ่มเงินใน ${record.asset_name || "สินทรัพย์ลงทุน"}`
          : "บันทึกเงินลงทุน"
        : `${record ? "แก้ไข" : "เพิ่ม"}${meta.title}`
    );
    qs("#dynamicForm").innerHTML = formTemplate(type, record);
    populateDynamicLists();
    bindFormBehavior(type);
    state.activeSheet = qs("#formSheet");
    openOverlay(state.activeSheet);
    setTimeout(() => qs("#dynamicForm input:not([type='radio']):not([type='checkbox'])")?.focus(), 300);
  }

  function inputValue(record, key, fallback = "") {
    const value = record?.[key] ?? fallback;
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inputDate(record, key, fallback = "") {
    const parsed = analytics.parseDate(record?.[key]);
    return parsed ? localIsoDate(parsed) : fallback;
  }

  function accountOptions(selectedValue = "", placeholder = "เลือกบัญชี") {
    const selected = String(selectedValue || "").trim().toLocaleLowerCase("th-TH");
    const options = [`<option value="">${inputValue({ value: placeholder }, "value")}</option>`];
    (state.data?.accounts || []).forEach((account) => {
      const name = String(account.account_name || "").trim();
      if (!name) return;
      const isSelected = name.toLocaleLowerCase("th-TH") === selected;
      const value = inputValue({ value: name }, "value");
      const label = inputValue({ value: `${name} — ${formatCurrency(account.balance)}` }, "value");
      options.push(`<option value="${value}" ${isSelected ? "selected" : ""}>${label}</option>`);
    });
    return options.join("");
  }

  function creditCardOptions(selectedValue = "", placeholder = "เลือกบัตรเครดิต") {
    const selected = String(selectedValue || "").trim().toLocaleLowerCase("th-TH");
    const options = [`<option value="">${inputValue({ value: placeholder }, "value")}</option>`];
    (state.data?.liabilities || []).forEach((liability) => {
      if (!store.isCreditCardLiability(liability)) return;
      const name = String(liability.liability_name || "").trim();
      if (!name) return;
      const value = inputValue({ value: name }, "value");
      const label = inputValue({ value: `${name} — ยอดหนี้ ${formatCurrency(liability.total_amount)}` }, "value");
      const isSelected = name.toLocaleLowerCase("th-TH") === selected;
      options.push(`<option value="${value}" ${isSelected ? "selected" : ""}>${label}</option>`);
    });
    return options.join("");
  }

  function transactionCategoryOptions(type, selectedValue = "") {
    const normalizedType = analytics.normalizeType(type);
    const defaults = normalizedType === "expense"
      ? EXPENSE_CATEGORIES
      : normalizedType === "income"
        ? ["เงินเดือน", "รายได้พิเศษ", "เงินปันผล", "ดอกเบี้ย", "อื่น ๆ"]
        : ["โอนเงิน", "ย้ายเงิน", "อื่น ๆ"];
    const names = [...defaults];
    (state.data?.categories || []).forEach((row) => {
      if (analytics.normalizeType(row.type) !== normalizedType) return;
      const name = String(row.category_name || "").trim();
      if (name && !names.includes(name)) names.push(name);
    });
    const current = String(selectedValue || "").trim();
    if (current && !names.includes(current)) names.push(current);
    const options = [`<option value="">เลือกหมวดหมู่</option>`];
    names.forEach((name) => {
      const value = inputValue({ value: name }, "value");
      options.push(`<option value="${value}" ${name === current ? "selected" : ""}>${value}</option>`);
    });
    return options.join("");
  }

  function investmentTargetOptions(record = null) {
    const rows = (state.data?.investments || []).filter((row) => String(row.asset_name || "").trim());
    const selectedRow = Number(record?._rowNumber || 0);
    const nameCounts = new Map();
    rows.forEach((row) => {
      const key = String(row.asset_name).trim().toLocaleLowerCase("th-TH");
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    });
    const options = [`<option value="">เลือกสินทรัพย์จาก Investments</option>`];
    rows.forEach((row) => {
      const name = String(row.asset_name).trim();
      const key = name.toLocaleLowerCase("th-TH");
      const suffix = nameCounts.get(key) > 1 ? ` · แถว ${row._rowNumber}` : "";
      const label = inputValue({ value: `${name} — ${formatCurrency(analytics.getInvestmentValue(row))}${suffix}` }, "value");
      options.push(`<option value="${row._rowNumber}" ${row._rowNumber === selectedRow ? "selected" : ""}>${label}</option>`);
    });
    const newSelected = !record && rows.length === 0;
    options.push(`<option value="new" ${newSelected ? "selected" : ""}>＋ เพิ่มชื่อสินทรัพย์ใหม่</option>`);
    return options.join("");
  }

  function formTemplate(type, record) {
    const saveLabel = record ? "บันทึกการแก้ไข" : "บันทึกข้อมูล";
    const note = (placeholder = "รายละเอียดเพิ่มเติม") => `
      <label class="field"><span>บันทึกช่วยจำ</span>
        <textarea name="note" placeholder="${placeholder}">${inputValue(record, "note")}</textarea>
      </label>`;
    const submit = `<button class="primary-button full-width" type="submit">${saveLabel}</button>`;

    if (type === "transaction") {
      const currentType = analytics.normalizeType(record?.type || "Expense");
      const currentPaymentMethod = String(record?.payment_method || (record?.credit_card ? "CreditCard" : "Account"));
      const usesCreditCard = currentType === "expense" && currentPaymentMethod.toLowerCase() === "creditcard";
      const defaultExpenseAccount = record
        ? record.account_from
        : (state.data?.accounts || []).find((account) => {
          return String(account.account_name || "").trim() === "บัญชีใช้จ่ายรายเดือน";
        })?.account_name || "";
      const selectedFrom = currentType === "expense" ? defaultExpenseAccount : record?.account_from || "";
      const selectedTo = record?.account_to || "";
      const isExpense = currentType === "expense";
      return `
        <div class="form-segments" role="radiogroup" aria-label="ประเภทรายการ">
          <label><input type="radio" name="type" value="Expense" ${currentType === "expense" ? "checked" : ""}><span>รายจ่าย</span></label>
          <label><input type="radio" name="type" value="Income" ${currentType === "income" ? "checked" : ""}><span>รายรับ</span></label>
          <label><input type="radio" name="type" value="Transfer" ${currentType === "transfer" ? "checked" : ""}><span>โอนเงิน</span></label>
        </div>
        <div class="field-row">
          <label class="field"><span>วันที่</span><input name="date" type="date" value="${inputDate(record, "date", localIsoDate())}" required></label>
          <label class="field"><span>จำนวนเงิน (บาท)</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${inputValue(record, "amount")}" placeholder="0" required></label>
        </div>
        <label class="field" data-expense-category-field ${isExpense ? "" : "hidden"}><span>หมวดหมู่รายจ่าย</span><select name="category" data-expense-category ${isExpense ? "required" : "disabled"}>${transactionCategoryOptions("Expense", isExpense ? record?.category : "")}</select></label>
        <label class="field" data-expense-item-field ${isExpense ? "" : "hidden"}><span>รายการรายจ่าย</span><input name="item_name" value="${inputValue(record, "item_name")}" placeholder="เลือกหมวดหมู่ก่อน แล้วพิมพ์รายการ" ${isExpense && record?.category ? "required" : "disabled"}></label>
        <label class="field" data-general-category-field ${isExpense ? "hidden" : ""}><span>หมวดหมู่</span><input name="category" value="${isExpense ? "" : inputValue(record, "category")}" placeholder="เช่น เงินเดือน หรือ โอนเงิน" ${isExpense ? "disabled" : "required"}></label>
        <label class="field" data-payment-method-field ${isExpense ? "" : "hidden"}><span>ช่องทางการจ่าย</span>
          <select name="payment_method" ${isExpense ? "required" : "disabled"}>
            <option value="Account" ${usesCreditCard ? "" : "selected"}>บัญชีเงิน / เงินสด</option>
            <option value="CreditCard" ${usesCreditCard ? "selected" : ""}>บัตรเครดิต</option>
          </select>
        </label>
        <label class="field" data-credit-card-field ${usesCreditCard ? "" : "hidden"}><span>บัตรเครดิต</span>
          <select name="credit_card" ${usesCreditCard ? "required" : "disabled"}>${creditCardOptions(record?.credit_card)}</select>
          <small>ยอดนี้จะเพิ่มเป็นหนี้ระยะสั้น และยังนับเป็นรายจ่ายของเดือนที่ซื้อ</small>
        </label>
        <div class="field-row account-fields">
          <label class="field" data-account-from-field><span data-account-from-label>จ่ายจากบัญชี</span><select name="account_from">${accountOptions(selectedFrom)}</select></label>
          <label class="field" data-account-to-field><span data-account-to-label>เงินเข้าบัญชี</span><select name="account_to">${accountOptions(selectedTo)}</select></label>
        </div>
        ${note()}
        ${submit}`;
    }

    if (type === "creditCardPayment") {
      const selectedCard = record?.liability_name || "";
      const outstanding = analytics.toNumber(record?.total_amount);
      return `
        ${state.creditCardSchemaMissingHeaders.length ? `<p class="form-warning">กรุณาทำ Migration v2.5.0 ก่อน: ${state.creditCardSchemaMissingHeaders.join(", ")}</p>` : ""}
        <label class="field"><span>บัตรเครดิต</span><select name="credit_card" required>${creditCardOptions(selectedCard)}</select></label>
        <p class="security-note" data-card-balance>${selectedCard ? `ยอดหนี้ปัจจุบัน ${formatCurrency(outstanding)}` : "เลือกบัตรเพื่อดูยอดหนี้ปัจจุบัน"}</p>
        <label class="field"><span>วันที่ชำระ</span><input name="date" type="date" value="${localIsoDate()}" required></label>
        <label class="field"><span>จ่ายจากบัญชี</span><select name="account_from" required>${accountOptions("", "เลือกบัญชีที่ใช้จ่ายบัตร")}</select></label>
        <div class="form-segments" role="radiogroup" aria-label="รูปแบบการชำระ">
          <label><input type="radio" name="payment_mode" value="Full" checked><span>เต็มจำนวน</span></label>
          <label><input type="radio" name="payment_mode" value="Partial"><span>ระบุยอด</span></label>
        </div>
        <label class="field" data-card-payment-amount hidden><span>ยอดที่ต้องการชำระ (บาท)</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" disabled></label>
        ${note("เช่น ชำระรอบเดือนนี้")}
        <p class="security-note">การชำระจะลดทั้งยอดบัญชีและหนี้บัตร โดยไม่บันทึกเป็นรายจ่ายซ้ำใน Cash Flow</p>
        <button class="primary-button full-width" type="submit">ยืนยันการชำระบัตร</button>`;
    }

    if (type === "investment") {
      const migrationWarning = state.investmentSchemaMissingHeaders.length
        ? `<p class="security-note">ก่อนบันทึก กรุณาเพิ่ม Header ในชีต Investments: ${state.investmentSchemaMissingHeaders.join(", ")}</p>`
        : "";
      const initialTarget = record?._rowNumber || ((state.data?.investments || []).length ? "" : "new");
      return `
        ${migrationWarning}
        <label class="field"><span>สินทรัพย์ลงทุน</span><select name="investment_target" required>${investmentTargetOptions(record)}</select></label>
        <label class="field" data-new-investment-field ${initialTarget === "new" ? "" : "hidden"}><span>ชื่อสินทรัพย์ลงทุนใหม่</span><input name="asset_name" placeholder="เช่น RMF, ETF, หุ้นไทย" ${initialTarget === "new" ? "required" : "disabled"}></label>
        <p class="security-note" data-investment-current>${record ? `มูลค่าปัจจุบัน ${formatCurrency(analytics.getInvestmentValue(record))}` : "เลือกสินทรัพย์เดิมเพื่อเพิ่มยอด หรือเพิ่มชื่อใหม่"}</p>
        <label class="field"><span>ใช้เงินจากบัญชี</span><select name="account_from" required>${accountOptions(record?.account_from, "เลือกบัญชีที่ใช้ลงทุน")}</select></label>
        <label class="field"><span>ยอดเงินที่ลงทุนเพิ่ม (บาท)</span><input name="funded_amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="เช่น 5000" required></label>
        <p class="security-note">ระบบจะหักเฉพาะยอดเงินรอบนี้จากบัญชี และเพิ่มเข้ามูลค่าสินทรัพย์เดิม โดยไม่นับเป็นรายจ่ายใน Cash Flow</p>
        <button class="primary-button full-width" type="submit">เพิ่มเงินลงทุน</button>`;
    }

    if (type === "account") {
      const accountType = String(record?.type || "ออมทรัพย์");
      const accountTypeOptions = ["ออมทรัพย์", "กระแสรายวัน", "ฝากประจำ", "เงินสด", "e-Wallet", "อื่น ๆ"]
        .map((value) => `<option value="${value}" ${accountType === value ? "selected" : ""}>${value}</option>`)
        .join("");
      return `
        <label class="field"><span>ชื่อบัญชี</span><input name="account_name" value="${inputValue(record, "account_name")}" placeholder="เช่น KBank ออมทรัพย์" required></label>
        <div class="field-row">
          <label class="field"><span>ประเภทบัญชี</span><select name="type">${accountTypeOptions}</select></label>
          <label class="field"><span>สกุลเงิน</span><input name="currency" value="${inputValue(record, "currency", "THB")}" maxlength="3" required></label>
        </div>
        <label class="field"><span>ยอดคงเหลือ</span><input name="balance" type="number" step="0.01" inputmode="decimal" value="${inputValue(record, "balance")}" placeholder="0" required></label>
        ${note("สาขา เลขท้ายบัญชี หรือรายละเอียดอื่น")}
        ${submit}`;
    }

    if (type === "asset") {
      return `
        <label class="field"><span>ชื่อทรัพย์สิน</span><input name="asset_name" value="${inputValue(record, "asset_name")}" placeholder="เช่น บ้าน รถยนต์ ที่ดิน" required></label>
        <label class="field"><span>ประเภท</span><input name="category" list="assetCategories" value="${inputValue(record, "category")}" placeholder="อสังหาริมทรัพย์ ยานพาหนะ"><datalist id="assetCategories"><option value="อสังหาริมทรัพย์"><option value="ยานพาหนะ"><option value="ธุรกิจส่วนตัว"><option value="ของสะสม"><option value="อื่น ๆ"></datalist></label>
        <div class="field-row">
          <label class="field"><span>ราคาซื้อ</span><input name="purchase_price" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "purchase_price")}"></label>
          <label class="field"><span>มูลค่าปัจจุบัน</span><input name="estimated_value" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "estimated_value")}" required></label>
        </div>
        ${note()}
        ${submit}`;
    }

    if (type === "liability") {
      const liabilityType = store.isCreditCardLiability(record) ? "CreditCard" : "Loan";
      return `
        ${state.creditCardSchemaMissingHeaders.length ? `<p class="form-warning">กรุณาทำ Migration v2.5.0 ก่อน: ${state.creditCardSchemaMissingHeaders.join(", ")}</p>` : ""}
        <label class="field"><span>ชื่อหนี้สิน</span><input name="liability_name" value="${inputValue(record, "liability_name")}" placeholder="เช่น สินเชื่อบ้าน บัตรเครดิต" required></label>
        <label class="field"><span>ประเภทหนี้สิน</span><select name="liability_type" required>
          <option value="Loan" ${liabilityType === "Loan" ? "selected" : ""}>สินเชื่อ / หนี้ทั่วไป</option>
          <option value="CreditCard" ${liabilityType === "CreditCard" ? "selected" : ""}>บัตรเครดิต (หนี้ระยะสั้น)</option>
        </select></label>
        <div class="field-row">
          <label class="field"><span>ยอดหนี้คงเหลือ</span><input name="total_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "total_amount")}" required></label>
          <label class="field" data-monthly-payment-field><span>ค่างวดต่อเดือน</span><input name="monthly_payment" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "monthly_payment")}"></label>
        </div>
        ${note("หากต้องการติดตามดอกเบี้ย ให้ระบุไว้ชั่วคราวในช่องนี้")}
        ${submit}`;
    }

    const goalType = String(record?.goal_type || "Financial").toLowerCase() === "milestone"
      ? "Milestone"
      : "Financial";
    const progressSource = String(record?.progress_source || "Manual").toLowerCase() === "account"
      ? "Account"
      : "Manual";
    const goalStatus = String(record?.status || "Not Started").toLowerCase();
    const schemaWarning = state.goalSchemaMissingHeaders.length
      ? `<p class="form-warning">ก่อนบันทึก ให้เพิ่ม Header ในชีต Goals: ${state.goalSchemaMissingHeaders.map((header) => inputValue({ value: header }, "value")).join(", ")}</p>`
      : "";
    return `
      ${schemaWarning}
      <label class="field"><span>ชื่อเป้าหมาย</span><input name="goal_name" value="${inputValue(record, "goal_name")}" placeholder="เช่น เงินสำรองฉุกเฉิน หรือ จัดทำพินัยกรรม" required></label>
      <label class="field"><span>รูปแบบเป้าหมาย</span>
        <select name="goal_type" required>
          <option value="Financial" ${goalType === "Financial" ? "selected" : ""}>เป้าหมายการเงิน</option>
          <option value="Milestone" ${goalType === "Milestone" ? "selected" : ""}>เป้าหมายชีวิต / Milestone</option>
        </select>
        <small>Milestone เหมาะกับเป้าหมายที่ไม่ต้องวัดเป็นจำนวนเงิน</small>
      </label>
      <div data-goal-financial-fields>
        <div class="field-row">
          <label class="field"><span>เงินเป้าหมาย</span><input name="target_amount" type="number" min="0.01" step="0.01" inputmode="decimal" value="${inputValue(record, "target_amount")}" placeholder="0"></label>
          <label class="field"><span>ติดตามความคืบหน้าจาก</span>
            <select name="progress_source">
              <option value="Manual" ${progressSource === "Manual" ? "selected" : ""}>กรอกยอดสะสมเอง</option>
              <option value="Account" ${progressSource === "Account" ? "selected" : ""}>ยอดคงเหลือในบัญชี</option>
            </select>
          </label>
        </div>
        <label class="field" data-goal-manual-field><span>สะสมแล้ว</span><input name="current_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "current_amount", "0")}" placeholder="0"></label>
        <label class="field" data-goal-account-field><span>บัญชีที่ใช้อ้างอิง</span>
          <select name="linked_account">${accountOptions(record?.linked_account || "", "เลือกบัญชีสำหรับติดตาม Goal")}</select>
          <small>ระบบอ่านยอดปัจจุบันจาก Accounts.balance โดยไม่แก้ยอดบัญชี</small>
        </label>
      </div>
      <label class="field" data-goal-status-field><span>สถานะ Milestone</span>
        <select name="status">
          <option value="Not Started" ${goalStatus === "not started" || goalStatus === "" ? "selected" : ""}>ยังไม่เริ่ม</option>
          <option value="In Progress" ${goalStatus === "in progress" ? "selected" : ""}>กำลังดำเนินการ</option>
          <option value="Completed" ${goalStatus === "completed" ? "selected" : ""}>สำเร็จแล้ว</option>
        </select>
      </label>
      <label class="field"><span>วันที่ต้องการสำเร็จ</span><input name="deadline" type="date" value="${inputDate(record, "deadline")}"></label>
      ${note("เหตุผล แผนการ หรือสิ่งที่ต้องทำต่อ")}
      ${submit}`;
  }

  function populateDynamicLists() {
    // Select options are rendered with the form so category and investment
    // dependencies are available before the user starts typing.
  }

  function bindFormBehavior(type) {
    if (type === "creditCardPayment") {
      const form = qs("#dynamicForm");
      const cardSelect = form.elements.credit_card;
      const amountField = qs("[data-card-payment-amount]", form);
      const amountInput = form.elements.amount;
      const balanceText = qs("[data-card-balance]", form);
      const updatePayment = () => {
        const card = (state.data?.liabilities || []).find((row) => {
          return String(row.liability_name || "") === cardSelect.value && store.isCreditCardLiability(row);
        });
        const outstanding = analytics.toNumber(card?.total_amount);
        const partial = form.elements.payment_mode.value === "Partial";
        balanceText.textContent = card ? `ยอดหนี้ปัจจุบัน ${formatCurrency(outstanding)}` : "เลือกบัตรเพื่อดูยอดหนี้ปัจจุบัน";
        amountField.hidden = !partial;
        amountInput.disabled = !partial;
        amountInput.required = partial;
        amountInput.max = outstanding > 0 ? String(outstanding) : "";
      };
      cardSelect.addEventListener("change", updatePayment);
      qsa("input[name='payment_mode']", form).forEach((input) => input.addEventListener("change", updatePayment));
      updatePayment();
      return;
    }
    if (type === "liability") {
      const form = qs("#dynamicForm");
      const updateLiabilityType = () => {
        const isCard = form.elements.liability_type.value === "CreditCard";
        const field = qs("[data-monthly-payment-field]", form);
        field.hidden = isCard;
        form.elements.monthly_payment.disabled = isCard;
        if (isCard) form.elements.monthly_payment.value = "0";
      };
      form.elements.liability_type.addEventListener("change", updateLiabilityType);
      updateLiabilityType();
      return;
    }
    if (type === "investment") {
      const form = qs("#dynamicForm");
      const targetSelect = form.elements.investment_target;
      const accountSelect = form.elements.account_from;
      const newAssetField = qs("[data-new-investment-field]", form);
      const newAssetInput = form.elements.asset_name;
      const currentText = qs("[data-investment-current]", form);
      const updateInvestmentTarget = () => {
        const isNew = targetSelect.value === "new";
        const selectedRecord = (state.data?.investments || []).find((row) => {
          return row._rowNumber === Number(targetSelect.value);
        });
        newAssetField.hidden = !isNew;
        newAssetInput.disabled = !isNew;
        newAssetInput.required = isNew;

        if (accountSelect.dataset.locked === "true") accountSelect.value = "";
        accountSelect.disabled = false;
        accountSelect.dataset.locked = "false";
        if (selectedRecord?.account_from) {
          accountSelect.value = selectedRecord.account_from;
          accountSelect.disabled = true;
          accountSelect.dataset.locked = "true";
        }
        currentText.textContent = selectedRecord
          ? `มูลค่าปัจจุบัน ${formatCurrency(analytics.getInvestmentValue(selectedRecord))}${selectedRecord.account_from ? ` · ใช้บัญชี ${selectedRecord.account_from}` : " · เลือกบัญชีต้นทางสำหรับเงินรอบแรก"}`
          : isNew
            ? "ชื่อใหม่จะถูกเพิ่มเป็นแถวใหม่ในชีต Investments"
            : "เลือกสินทรัพย์เดิมเพื่อเพิ่มยอด หรือเพิ่มชื่อใหม่";
      };
      targetSelect.addEventListener("change", updateInvestmentTarget);
      updateInvestmentTarget();
      return;
    }
    if (type === "goal") {
      const updateGoalFields = () => {
        const form = qs("#dynamicForm");
        const goalType = form.elements.goal_type.value;
        const progressSource = form.elements.progress_source.value;
        const isFinancial = goalType === "Financial";
        const usesAccount = isFinancial && progressSource === "Account";
        const financialFields = qs("[data-goal-financial-fields]", form);
        const manualField = qs("[data-goal-manual-field]", form);
        const accountField = qs("[data-goal-account-field]", form);
        const statusField = qs("[data-goal-status-field]", form);

        financialFields.hidden = !isFinancial;
        statusField.hidden = isFinancial;
        manualField.hidden = !isFinancial || usesAccount;
        accountField.hidden = !usesAccount;
        form.elements.target_amount.disabled = !isFinancial;
        form.elements.target_amount.required = isFinancial;
        form.elements.progress_source.disabled = !isFinancial;
        form.elements.current_amount.disabled = !isFinancial || usesAccount;
        form.elements.current_amount.required = isFinancial && !usesAccount;
        form.elements.linked_account.disabled = !usesAccount;
        form.elements.linked_account.required = usesAccount;
        form.elements.status.disabled = isFinancial;
        form.elements.status.required = !isFinancial;
      };
      const form = qs("#dynamicForm");
      form.elements.goal_type.addEventListener("change", updateGoalFields);
      form.elements.progress_source.addEventListener("change", updateGoalFields);
      updateGoalFields();
      return;
    }
    if (type !== "transaction") return;
    const update = () => {
      const selected = analytics.normalizeType(qs("#dynamicForm input[name='type']:checked")?.value);
      const accountFields = qs("#dynamicForm .account-fields");
      const fromField = qs("#dynamicForm [data-account-from-field]");
      const toField = qs("#dynamicForm [data-account-to-field]");
      const fromSelect = qs("#dynamicForm select[name='account_from']");
      const toSelect = qs("#dynamicForm select[name='account_to']");
      const expenseCategoryField = qs("#dynamicForm [data-expense-category-field]");
      const expenseCategory = qs("#dynamicForm [data-expense-category]");
      const expenseItemField = qs("#dynamicForm [data-expense-item-field]");
      const expenseItem = qs("#dynamicForm input[name='item_name']");
      const generalCategoryField = qs("#dynamicForm [data-general-category-field]");
      const generalCategory = qs("#dynamicForm [data-general-category-field] input[name='category']");
      const paymentMethodField = qs("#dynamicForm [data-payment-method-field]");
      const paymentMethod = qs("#dynamicForm select[name='payment_method']");
      const creditCardField = qs("#dynamicForm [data-credit-card-field]");
      const creditCard = qs("#dynamicForm select[name='credit_card']");
      const isExpense = selected === "expense";
      const usesCreditCard = isExpense && paymentMethod.value === "CreditCard";
      const showFrom = selected === "transfer" || (isExpense && !usesCreditCard);
      const showTo = selected === "income" || selected === "transfer";

      fromField.hidden = !showFrom;
      toField.hidden = !showTo;
      fromSelect.disabled = !showFrom;
      toSelect.disabled = !showTo;
      fromSelect.required = showFrom;
      toSelect.required = showTo;
      expenseCategoryField.hidden = !isExpense;
      expenseCategory.disabled = !isExpense;
      expenseCategory.required = isExpense;
      expenseItemField.hidden = !isExpense;
      expenseItem.disabled = !isExpense || !expenseCategory.value;
      expenseItem.required = isExpense;
      generalCategoryField.hidden = isExpense;
      generalCategory.disabled = isExpense;
      generalCategory.required = !isExpense;
      paymentMethodField.hidden = !isExpense;
      paymentMethod.disabled = !isExpense;
      paymentMethod.required = isExpense;
      creditCardField.hidden = !usesCreditCard;
      creditCard.disabled = !usesCreditCard;
      creditCard.required = usesCreditCard;
      qs("#dynamicForm [data-account-from-label]").textContent = selected === "expense" ? "จ่ายจากบัญชี" : "จากบัญชี";
      qs("#dynamicForm [data-account-to-label]").textContent = selected === "income" ? "เงินเข้าบัญชี" : "เข้าบัญชี";
      accountFields.style.gridTemplateColumns = selected === "transfer" ? "repeat(2, minmax(0, 1fr))" : "1fr";
    };
    qsa("#dynamicForm input[name='type']").forEach((input) => input.addEventListener("change", update));
    qs("#dynamicForm [data-expense-category]").addEventListener("change", update);
    qs("#dynamicForm select[name='payment_method']").addEventListener("change", update);
    update();
  }

  async function submitDynamicForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const type = state.activeFormType;
    const meta = formMeta[type];
    const values = Object.fromEntries(new FormData(form).entries());
    if (type === "investment") {
      values.investment_row = form.elements.investment_target.value;
      values.account_from = form.elements.account_from.value;
      values.asset_name = form.elements.asset_name?.value || "";
      if (!values.investment_row) {
        showToast("กรุณาเลือกสินทรัพย์ลงทุน หรือเลือกเพิ่มชื่อใหม่", "error");
        return;
      }
      if (!values.account_from) {
        showToast("กรุณาเลือกบัญชีที่ใช้เงินลงทุน", "error");
        return;
      }
      if (!(analytics.toNumber(values.funded_amount) > 0)) {
        showToast("จำนวนเงินที่ใช้ลงทุนต้องมากกว่า 0 บาท", "error");
        return;
      }
    }
    if (type === "transaction") {
      const normalized = analytics.normalizeType(values.type);
      if (!(analytics.toNumber(values.amount) > 0)) {
        showToast("จำนวนเงินต้องมากกว่า 0 บาท", "error");
        return;
      }
      if (normalized === "income") {
        values.account_from = "";
        values.payment_method = "Account";
        values.credit_card = "";
      }
      if (normalized === "expense") {
        values.account_to = "";
        if (values.payment_method === "CreditCard") values.account_from = "";
        else values.credit_card = "";
      }
      if (normalized === "transfer") {
        values.payment_method = "Account";
        values.credit_card = "";
      }
      if (normalized === "expense" && !String(values.item_name || "").trim()) {
        showToast("กรุณาเลือกรายจ่ายและพิมพ์ชื่อรายการ", "error");
        return;
      }
      if (normalized === "transfer" && values.account_from === values.account_to) {
        showToast("บัญชีต้นทางและปลายทางต้องเป็นคนละบัญชี", "error");
        return;
      }
    }
    if (type === "creditCardPayment") {
      const card = (state.data?.liabilities || []).find((row) => {
        return String(row.liability_name || "") === values.credit_card && store.isCreditCardLiability(row);
      });
      if (!card) {
        showToast("กรุณาเลือกบัตรเครดิต", "error");
        return;
      }
      const outstanding = analytics.toNumber(card.total_amount);
      values.amount = values.payment_mode === "Full" ? outstanding : analytics.toNumber(values.amount);
      values.item_name = `ชำระ ${card.liability_name}`;
      values.category = "ชำระบัตรเครดิต";
      if (!(values.amount > 0)) {
        showToast(outstanding > 0 ? "กรุณาระบุยอดชำระ" : "บัตรนี้ไม่มียอดหนี้ที่ต้องชำระ", "error");
        return;
      }
      if (values.amount > outstanding) {
        showToast("ยอดชำระมากกว่ายอดหนี้บัตร", "error");
        return;
      }
      delete values.payment_mode;
    }
    if (type === "goal") {
      if (values.goal_type === "Financial") {
        if (!(analytics.toNumber(values.target_amount) > 0)) {
          showToast("เงินเป้าหมายต้องมากกว่า 0 บาท", "error");
          return;
        }
        values.status = "";
        if (values.progress_source === "Account") {
          values.current_amount = state.activeRecord?.current_amount ?? "";
        } else {
          values.linked_account = "";
        }
      } else {
        values.target_amount = "";
        values.current_amount = "";
        values.progress_source = "Status";
        values.linked_account = "";
      }
    }

    try {
      setLoading(true);
      if (type === "transaction" && state.activeRecord?._rowNumber) {
        await store.updateTransactionWithAccountEffects(
          state.activeRecord._rowNumber,
          state.activeRecord,
          values
        );
      } else if (type === "transaction") {
        await store.appendTransactionWithAccountEffects(values);
      } else if (type === "creditCardPayment") {
        await store.payCreditCard(values);
      } else if (type === "account" && state.activeRecord?._rowNumber) {
        await store.updateAccountRecord(
          state.activeRecord._rowNumber,
          state.activeRecord,
          { ...state.activeRecord, ...values }
        );
      } else if (type === "account") {
        await store.appendAccount(values);
      } else if (type === "goal" && state.activeRecord?._rowNumber) {
        await store.updateGoalRecord(
          state.activeRecord._rowNumber,
          state.activeRecord,
          values
        );
      } else if (type === "goal") {
        await store.appendGoal(values);
      } else if (type === "investment") {
        await store.addInvestmentContribution(values);
      } else if (type === "liability" && state.activeRecord?._rowNumber) {
        await store.updateLiabilityRecord(state.activeRecord._rowNumber, state.activeRecord, values);
      } else if (type === "liability") {
        await store.appendLiability(values);
      } else if (state.activeRecord?._rowNumber) {
        await store.update(meta.sheet, state.activeRecord._rowNumber, { ...state.activeRecord, ...values });
      } else {
        await store.append(meta.sheet, values);
      }
      closeSheets();
      await refreshData();
      showToast(`บันทึก${meta.title}สำเร็จ`);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function submitSettings(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = {
      monthly_budget: analytics.toNumber(form.elements.monthly_budget.value),
      emergency_months_target: analytics.toNumber(form.elements.emergency_months_target.value) || 6,
      essential_expense_override: form.elements.essential_expense_override.value === ""
        ? ""
        : analytics.toNumber(form.elements.essential_expense_override.value),
      include_accounts_in_net_worth: form.elements.include_accounts_in_net_worth.checked
    };
    try {
      setLoading(true);
      await store.saveSettings(values);
      closeSheets();
      await refreshData();
      showToast("บันทึกการตั้งค่าแล้ว");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentSnapshot() {
    const vm = state.viewModel;
    if (!vm) return;
    const currentMonthKey = analytics.monthKey(new Date());
    const existing = (state.data?.snapshots || []).find((row) => {
      return analytics.monthKey(analytics.parseDate(row.snapshot_month)) === currentMonthKey;
    });
    const record = {
      snapshot_month: `${currentMonthKey}-01`,
      total_assets: vm.totals.totalAssets,
      total_liabilities: vm.totals.liabilities,
      net_worth: vm.totals.netWorth,
      monthly_cashflow: vm.currentMonth.cashflow,
      savings_rate: vm.savingsRate === null ? "" : vm.savingsRate,
      note: "บันทึกจาก Personal Wealth WebApp"
    };
    const action = existing ? "อัปเดต" : "บันทึก";
    if (!global.confirm(`${action} Snapshot ของเดือนนี้ด้วยข้อมูลปัจจุบันหรือไม่?`)) return;

    try {
      setLoading(true);
      if (existing?._rowNumber) {
        await store.update(config.SHEETS.snapshots, existing._rowNumber, { ...existing, ...record });
      } else {
        await store.append(config.SHEETS.snapshots, record);
      }
      closeSheets();
      await refreshData();
      showToast(`${action} Snapshot เดือนนี้แล้ว`);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  function handleError(error) {
    console.error("Personal Wealth error:", error?.code || error?.status || "UNKNOWN");
    const apiMessage = error?.result?.error?.message;
    let message = apiMessage || error?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
    if (/API has not been used|accessNotConfigured/i.test(message)) {
      message = "ยังไม่ได้เปิด Google Sheets API ใน Google Cloud Project";
    } else if (/insufficient|permission|forbidden|403/i.test(message)) {
      message = "บัญชีนี้ไม่มีสิทธิ์เข้าถึง Google Sheet หรือ OAuth ยังตั้งค่าไม่ครบ";
    } else if (/popup|closed|cancel/i.test(message)) {
      message = "การเข้าสู่ระบบถูกยกเลิก";
    }
    setConnection("error", message, !store.isAuthorized());
    showToast(message, "error");
  }

  initialize();
})(window);
