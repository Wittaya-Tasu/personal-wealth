/**
 * Public frontend configuration.
 *
 * OAuth Client ID and Spreadsheet ID are identifiers, not passwords.
 * Restrict the OAuth client to the exact GitHub Pages origin in Google Cloud.
 * Never place a Client Secret, access token, password, or financial data here.
 */
window.APP_CONFIG = Object.freeze({
  GOOGLE_CLIENT_ID: "602356132719-j3heqe92lnmlhqdq0p4urfqhoda5krki.apps.googleusercontent.com",
  SPREADSHEET_ID: "1xNasmNnUzlQQI3saK9mwiBjvWiJJOFj7-qznnfeAC2g",
  APP_NAME: "Personal Wealth",
  LOCALE: "th-TH",
  CURRENCY: "THB",
  TIME_ZONE: "Asia/Bangkok",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
  SHEETS: Object.freeze({
    accounts: "Accounts",
    transactions: "Transactions",
    investments: "Investments",
    assets: "Assets",
    liabilities: "Liabilities",
    goals: "Goals",
    categories: "Categories",
    snapshots: "MonthlySnapshots",
    settings: "Settings"
  }),
  DEFAULTS: Object.freeze({
    monthly_budget: 30000,
    emergency_months_target: 6,
    essential_expense_override: "",
    include_accounts_in_net_worth: false
  })
});
