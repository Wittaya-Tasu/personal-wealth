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
    charts: {
      netWorth: null,
      cashflow: null,
      allocation: null
    }
  };

  const pageTitles = {
    dashboard: "ภาพรวม",
    transactions: "รายรับ–รายจ่าย",
    wealth: "ความมั่งคั่ง",
    goals: "เป้าหมาย"
  };

  const formMeta = {
    transaction: { title: "รายรับ–รายจ่าย", eyebrow: "CASH FLOW", sheet: config.SHEETS.transactions },
    investment: { title: "ข้อมูลการลงทุน", eyebrow: "PORTFOLIO", sheet: config.SHEETS.investments },
    account: { title: "บัญชีเงิน", eyebrow: "CASH & BANK", sheet: config.SHEETS.accounts },
    asset: { title: "ทรัพย์สิน", eyebrow: "ASSET", sheet: config.SHEETS.assets },
    liability: { title: "หนี้สิน", eyebrow: "LIABILITY", sheet: config.SHEETS.liabilities },
    goal: { title: "เป้าหมายทางการเงิน", eyebrow: "GOAL", sheet: config.SHEETS.goals }
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatCurrency(value, compact = false) {
    const number = analytics.toNumber(value);
    const options = {
      style: "currency",
      currency: config.CURRENCY,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
      if (button.closest(".data-form")) button.disabled = isLoading;
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
      navigator.serviceWorker.register("./sw.js").catch(() => {});
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
      state.viewModel = analytics.buildViewModel(data, config.DEFAULTS);
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
      "debtServiceValue", "totalAssetsCenter", "txIncomeSummary", "txExpenseSummary",
      "txBalanceSummary", "wealthAssetsSummary", "wealthLiabilitiesSummary", "wealthNetSummary"
    ].forEach((id) => setText(id, id === "emergencyMonthsValue" ? "— เดือน" : "฿—"));
    setText("netWorthStatus", "รอเชื่อมต่อ");
    setText("netWorthChange", "เชื่อมต่อ Google เพื่อดูข้อมูลจริง");
    ["recentTransactions", "transactionList", "wealthList", "goalPreview", "goalList"].forEach((id) => {
      const container = document.getElementById(id);
      container.replaceChildren(emptyState());
    });
    destroyCharts();
  }

  function renderAll() {
    renderDashboard();
    renderTransactions();
    renderWealth();
    renderGoals();
  }

  function renderDashboard() {
    const vm = state.viewModel;
    if (!vm) return;
    const changeClass = vm.netWorthChange === null ? "neutral" : vm.netWorthChange >= 0 ? "positive" : "negative";

    setText("netWorthValue", formatCurrency(vm.totals.netWorth));
    setText("asOfLabel", `ข้อมูลล่าสุด ${formatDate(new Date())}`);
    setText("netWorthStatus", vm.netWorthChange === null ? "มูลค่าปัจจุบัน" : vm.netWorthChange >= 0 ? "เพิ่มขึ้น" : "ลดลง");
    qs("#netWorthStatus").className = `status-pill ${vm.netWorthChange === null ? "neutral" : changeClass}`;

    if (vm.netWorthChange === null) {
      setText("netWorthChange", "ยังไม่มี Snapshot เดือนก่อนสำหรับเปรียบเทียบ");
    } else {
      const sign = vm.netWorthChange >= 0 ? "+" : "";
      setText("netWorthChange", `${sign}${formatCurrency(vm.netWorthChange)} (${formatPercent(vm.netWorthChangeRate, 1)}) จาก Snapshot ก่อน`);
    }
    qs("#netWorthChange").className = `hero-change ${changeClass}`;

    const monthlySpending = vm.monthlySpending;
    if (monthlySpending.status === "available") {
      setText("monthlySpendingBalanceValue", formatCurrency(monthlySpending.balance));
      qs("#monthlySpendingBalanceValue").className = monthlySpending.balance < 0
        ? "negative"
        : monthlySpending.balance > 0
          ? "positive"
          : "";
      setText("monthlySpendingBalanceDetail", `ใช้จากบัญชีนี้เดือนนี้ ${formatCurrency(monthlySpending.expense, true)}`);
    } else {
      setText("monthlySpendingBalanceValue", "฿—");
      qs("#monthlySpendingBalanceValue").className = "";
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
    setText("debtServiceValue", formatPercent(vm.debtServiceRatio, 0));
    setText("debtServiceDetail", `ค่างวดรวม ${formatCurrency(vm.totals.debtPayments, true)}/เดือน`);
    setText("totalAssetsCenter", formatCurrency(vm.totals.totalAssets, true));

    renderWarnings();
    renderNetWorthChart();
    renderCashflowChart();
    renderAllocationChart();
    renderGoalContainer(qs("#goalPreview"), vm.goals.slice(0, 3), false);
    renderTransactionContainer(qs("#recentTransactions"), vm.transactions.slice(0, 5), false);
  }

  function renderWarnings() {
    const container = qs("#dataWarnings");
    const warnings = state.viewModel?.warnings || [];
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
    const rows = state.viewModel.monthly.slice(-count);
    const options = baseChartOptions();
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
    state.charts = { netWorth: null, cashflow: null, allocation: null };
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
    qs("#txBalanceSummary").className = spendingBalance === null
      ? ""
      : spendingBalance < 0
        ? "negative"
        : spendingBalance > 0
          ? "positive"
          : "";

    const query = qs("#transactionSearch").value.trim().toLowerCase();
    const filter = qs("#transactionTypeFilter").value;
    const rows = vm.transactions.filter((row) => {
      const haystack = `${row.category || ""} ${row.note || ""} ${row.account_from || ""} ${row.account_to || ""}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesType = filter === "all" || row.normalizedType === filter;
      return matchesQuery && matchesType;
    });
    renderTransactionContainer(qs("#transactionList"), rows, true);
  }

  function transactionLabel(row) {
    if (row.normalizedType === "income") return row.category || "รายรับ";
    if (row.normalizedType === "expense") return row.category || "รายจ่าย";
    if (row.normalizedType === "transfer") return row.category || "โอนเงิน";
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
        row.normalizedType === "income" ? "+" : row.normalizedType === "expense" ? "−" : "↔"
      );
      const copy = createElement("div", "row-copy");
      copy.append(
        createElement("strong", "", transactionLabel(row)),
        createElement("span", "", `${formatDate(row.parsedDate, { day: "numeric", month: "short" })}${row.note ? ` · ${row.note}` : ""}`)
      );
      const amount = createElement("span", `row-amount ${row.normalizedType === "income" ? "positive" : row.normalizedType === "expense" ? "negative" : ""}`);
      amount.textContent = `${row.normalizedType === "income" ? "+" : row.normalizedType === "expense" ? "−" : ""}${formatCurrency(row.numericAmount)}`;

      if (withActions) {
        const actions = createElement("div", "row-actions");
        actions.append(
          amount,
          editButton("transaction", row._rowNumber, transactionLabel(row)),
          deleteButton(config.SHEETS.transactions, row._rowNumber, transactionLabel(row))
        );
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
        meta: (row) => `ค่างวด ${formatCurrency(row.monthly_payment || 0)}/เดือน`,
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
      actions.append(
        createElement("span", `row-amount ${state.wealthTab === "liabilities" ? "negative" : ""}`, formatCurrency(definition.value(row))),
        editButton(
          state.wealthTab === "investments"
            ? "investment"
            : state.wealthTab === "accounts"
              ? "account"
              : state.wealthTab === "assets"
                ? "asset"
                : "liability",
          row._rowNumber,
          definition.name(row)
        ),
        deleteButton(definition.sheet, row._rowNumber, definition.name(row))
      );
      item.append(icon, copy, actions);
      container.appendChild(item);
    });
  }

  function renderGoals() {
    renderGoalContainer(qs("#goalList"), state.viewModel?.goals || [], true);
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
      if (withActions) {
        const actions = createElement("div", "row-actions");
        actions.append(
          createElement("span", "", formatPercent(goal.percentage, 0)),
          editButton("goal", goal._rowNumber, goal.goal_name || "เป้าหมาย"),
          deleteButton(config.SHEETS.goals, goal._rowNumber, goal.goal_name || "เป้าหมาย")
        );
        topline.appendChild(actions);
      } else {
        topline.appendChild(createElement("span", "", formatPercent(goal.percentage, 0)));
      }
      const progress = createElement("div", "goal-progress");
      const progressBar = createElement("span");
      progressBar.style.width = `${goal.percentage * 100}%`;
      progress.appendChild(progressBar);
      const meta = createElement("div", "goal-meta");
      meta.append(
        createElement("span", "", `${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}`),
        createElement("span", "", goal.deadline ? `ครบ ${formatDate(goal.deadline, { month: "short", year: "numeric" })}` : "ไม่กำหนดวัน")
      );
      item.append(topline, progress, meta);
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

  function editButton(type, rowNumber, label) {
    const button = createElement("button", "edit-button", "แก้");
    button.type = "button";
    button.setAttribute("aria-label", `แก้ไข ${label}`);
    button.dataset.editType = type;
    button.dataset.editRow = rowNumber;
    return button;
  }

  async function handleListAction(event) {
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
    const account = sheetName === config.SHEETS.accounts
      ? (state.data?.accounts || []).find((row) => row._rowNumber === rowNumber)
      : null;
    const accountEffectText = transaction
      ? store.isAccountLinkedTransaction(transaction)
        ? "\nระบบจะย้อนผลของรายการนี้ในยอด Accounts ก่อนลบ"
        : "\nรายการเดิมก่อน v2.1.0 จะถูกลบโดยไม่ปรับ Opening Balance"
      : "";
    if (!global.confirm(`ยืนยันลบ “${label}”?\nการลบนี้จะนำแถวออกจาก Google Sheet${accountEffectText}`)) return;
    try {
      setLoading(true);
      if (transaction) {
        await store.deleteTransactionWithAccountEffects(transaction);
      } else if (account) {
        await store.deleteAccount(rowNumber);
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
    setText("formTitle", `${record ? "แก้ไข" : "เพิ่ม"}${meta.title}`);
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

  function accountOptions(selectedValue = "") {
    const selected = String(selectedValue || "").trim().toLocaleLowerCase("th-TH");
    const options = ['<option value="">เลือกบัญชี</option>'];
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

  function formTemplate(type, record) {
    const saveLabel = record ? "บันทึกการแก้ไข" : "บันทึกข้อมูล";
    const note = (placeholder = "รายละเอียดเพิ่มเติม") => `
      <label class="field"><span>บันทึกช่วยจำ</span>
        <textarea name="note" placeholder="${placeholder}">${inputValue(record, "note")}</textarea>
      </label>`;
    const submit = `<button class="primary-button full-width" type="submit">${saveLabel}</button>`;

    if (type === "transaction") {
      const currentType = analytics.normalizeType(record?.type || "Expense");
      const defaultExpenseAccount = record
        ? record.account_from
        : (state.data?.accounts || []).find((account) => {
          return String(account.account_name || "").trim() === "บัญชีใช้จ่ายรายเดือน";
        })?.account_name || "";
      const selectedFrom = currentType === "expense" ? defaultExpenseAccount : record?.account_from || "";
      const selectedTo = record?.account_to || "";
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
        <label class="field"><span>หมวดหมู่</span><input name="category" list="categoryOptions" value="${inputValue(record, "category")}" placeholder="เช่น อาหาร เงินเดือน น้ำมัน" required><datalist id="categoryOptions"></datalist></label>
        <div class="field-row account-fields">
          <label class="field" data-account-from-field><span data-account-from-label>จ่ายจากบัญชี</span><select name="account_from">${accountOptions(selectedFrom)}</select></label>
          <label class="field" data-account-to-field><span data-account-to-label>เงินเข้าบัญชี</span><select name="account_to">${accountOptions(selectedTo)}</select></label>
        </div>
        ${note()}
        ${submit}`;
    }

    if (type === "investment") {
      return `
        <label class="field"><span>ชื่อสินทรัพย์ลงทุน</span><input name="asset_name" value="${inputValue(record, "asset_name")}" placeholder="เช่น RMF, ETF, หุ้นไทย" required></label>
        <label class="field"><span>ประเภท</span><input name="category" list="investmentCategories" value="${inputValue(record, "category")}" placeholder="กองทุนรวม หุ้น ตราสารหนี้"><datalist id="investmentCategories"><option value="กองทุนรวม"><option value="หุ้น"><option value="ETF"><option value="ตราสารหนี้"><option value="เงินเกษียณ"><option value="สินทรัพย์ดิจิทัล"><option value="เงินสด"></datalist></label>
        <div class="field-row">
          <label class="field"><span>จำนวนหน่วย</span><input name="units" type="number" min="0" step="any" inputmode="decimal" value="${inputValue(record, "units")}"></label>
          <label class="field"><span>ต้นทุนเฉลี่ย</span><input name="avg_cost" type="number" min="0" step="any" inputmode="decimal" value="${inputValue(record, "avg_cost")}"></label>
        </div>
        <div class="field-row">
          <label class="field"><span>ราคาปัจจุบัน</span><input name="current_price" type="number" min="0" step="any" inputmode="decimal" value="${inputValue(record, "current_price")}"></label>
          <label class="field"><span>มูลค่าปัจจุบัน (บาท)</span><input name="current_value" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "current_value")}" placeholder="หากเว้นว่างจะคำนวณจากหน่วย × ราคา"></label>
        </div>
        <label class="field toggle-field"><span><strong>ลดหย่อนภาษีได้</strong><small>เช่น RMF, Thai ESG</small></span><input name="tax_deductible" type="checkbox" ${String(record?.tax_deductible || "").toLowerCase() === "yes" ? "checked" : ""}></label>
        ${note()}
        ${submit}`;
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
      return `
        <label class="field"><span>ชื่อหนี้สิน</span><input name="liability_name" value="${inputValue(record, "liability_name")}" placeholder="เช่น สินเชื่อบ้าน บัตรเครดิต" required></label>
        <div class="field-row">
          <label class="field"><span>ยอดหนี้คงเหลือ</span><input name="total_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "total_amount")}" required></label>
          <label class="field"><span>ค่างวดต่อเดือน</span><input name="monthly_payment" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "monthly_payment")}"></label>
        </div>
        ${note("หากต้องการติดตามดอกเบี้ย ให้ระบุไว้ชั่วคราวในช่องนี้")}
        ${submit}`;
    }

    return `
      <label class="field"><span>ชื่อเป้าหมาย</span><input name="goal_name" value="${inputValue(record, "goal_name")}" placeholder="เช่น เงินสำรองฉุกเฉิน เกษียณ" required></label>
      <div class="field-row">
        <label class="field"><span>เงินเป้าหมาย</span><input name="target_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "target_amount")}" required></label>
        <label class="field"><span>สะสมแล้ว</span><input name="current_amount" type="number" min="0" step="0.01" inputmode="decimal" value="${inputValue(record, "current_amount", "0")}" required></label>
      </div>
      <label class="field"><span>วันที่ต้องการสำเร็จ</span><input name="deadline" type="date" value="${inputDate(record, "deadline")}"></label>
      ${note("เหตุผลหรือแผนการสะสม")}
      ${submit}`;
  }

  function populateDynamicLists() {
    const categoryList = qs("#categoryOptions");
    if (categoryList) {
      const names = new Set([
        "อาหารและเครื่องดื่ม", "เดินทาง/น้ำมัน", "บิลและค่าใช้จ่าย", "ครอบครัว",
        "สุขภาพ", "ช้อปปิ้ง", "ท่องเที่ยว", "เงินเดือน", "รายได้พิเศษ", "เงินปันผล"
      ]);
      (state.data?.categories || []).forEach((row) => row.category_name && names.add(String(row.category_name)));
      (state.data?.transactions || []).forEach((row) => row.category && names.add(String(row.category)));
      [...names].sort((a, b) => a.localeCompare(b, "th")).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        categoryList.appendChild(option);
      });
    }

  }

  function bindFormBehavior(type) {
    if (type !== "transaction") return;
    const update = () => {
      const selected = analytics.normalizeType(qs("#dynamicForm input[name='type']:checked")?.value);
      const accountFields = qs("#dynamicForm .account-fields");
      const fromField = qs("#dynamicForm [data-account-from-field]");
      const toField = qs("#dynamicForm [data-account-to-field]");
      const fromSelect = qs("#dynamicForm select[name='account_from']");
      const toSelect = qs("#dynamicForm select[name='account_to']");
      const showFrom = selected === "expense" || selected === "transfer";
      const showTo = selected === "income" || selected === "transfer";

      fromField.hidden = !showFrom;
      toField.hidden = !showTo;
      fromSelect.disabled = !showFrom;
      toSelect.disabled = !showTo;
      fromSelect.required = showFrom;
      toSelect.required = showTo;
      qs("#dynamicForm [data-account-from-label]").textContent = selected === "expense" ? "จ่ายจากบัญชี" : "จากบัญชี";
      qs("#dynamicForm [data-account-to-label]").textContent = selected === "income" ? "เงินเข้าบัญชี" : "เข้าบัญชี";
      accountFields.style.gridTemplateColumns = selected === "transfer" ? "repeat(2, minmax(0, 1fr))" : "1fr";
    };
    qsa("#dynamicForm input[name='type']").forEach((input) => input.addEventListener("change", update));
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
      values.tax_deductible = form.elements.tax_deductible.checked ? "Yes" : "No";
      if (!analytics.toNumber(values.current_value)) {
        values.current_value = analytics.toNumber(values.units) * analytics.toNumber(values.current_price);
      }
    }
    if (type === "transaction") {
      const normalized = analytics.normalizeType(values.type);
      if (!(analytics.toNumber(values.amount) > 0)) {
        showToast("จำนวนเงินต้องมากกว่า 0 บาท", "error");
        return;
      }
      if (normalized === "income") values.account_from = "";
      if (normalized === "expense") values.account_to = "";
      if (normalized === "transfer" && values.account_from === values.account_to) {
        showToast("บัญชีต้นทางและปลายทางต้องเป็นคนละบัญชี", "error");
        return;
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
      } else if (type === "account" && state.activeRecord?._rowNumber) {
        await store.updateAccountRecord(
          state.activeRecord._rowNumber,
          state.activeRecord,
          { ...state.activeRecord, ...values }
        );
      } else if (type === "account") {
        await store.appendAccount(values);
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
