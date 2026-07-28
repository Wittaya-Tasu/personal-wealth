# Personal Wealth — Project State

> สถานะสำหรับส่งต่องานให้ AI Agent  
> อัปเดต: 28 กรกฎาคม 2569 (2026-07-28), Asia/Bangkok  
> รุ่น: **v2.1.0 — Account-linked Transactions**  
> สถานะ: Code candidate ผ่าน Static/Mock tests; รอผู้ใช้ Deploy และทดสอบกับ Google Sheet จริง

## 1. สรุปโครงการ

| รายการ | สถานะ |
|---|---|
| Repository | `Wittaya-Tasu/personal-wealth` |
| Branch หลัก | `main` |
| WebApp | `https://wittaya-tasu.github.io/personal-wealth/` |
| Hosting | GitHub Pages |
| รูปแบบ | Static WebApp / PWA |
| Frontend | Vanilla HTML/CSS/JavaScript |
| ฐานข้อมูล | Google Sheet แบบ Private/Restricted |
| Authentication | Google OAuth Token Model |
| Data API | Google Sheets API v4 โดยตรง |
| Google Apps Script | ไม่ใช้; Deployments เดิม Archived |
| UI | ภาษาไทย, Sarabun, Dark Emerald + Gold |
| อุปกรณ์หลัก | iPhone และ Desktop |

ค่าจริงของ OAuth Client ID และ Spreadsheet ID อยู่ใน `config.js` ล่าสุด ห้ามคัดลอกค่าจากเอกสารเก่ามาเขียนทับ

## 2. สถาปัตยกรรม

```text
iPhone / Browser
      |
      +-- GitHub Pages: Static WebApp / PWA
      +-- Google Identity Services: OAuth Token Model
      +-- Google Sheets API v4
      +-- Google Sheet: Private/Restricted
```

- ไม่มี Backend ของแอป
- ไม่มี Client Secret หรือ Refresh Token
- Access Token เก็บใน `sessionStorage`
- Service Worker Cache เฉพาะ Static Assets
- ห้าม Cache Google API response หรือข้อมูลการเงิน

## 3. การเปลี่ยนแปลง v2.1.0

### Account-linked Transactions

| Transaction | Account ที่ต้องเลือก | ผลต่อ Balance | Cash Flow |
|---|---|---|---|
| Income | `account_to` | เพิ่มปลายทาง | รายรับ |
| Expense | `account_from` | ลดต้นทาง | รายจ่าย |
| Transfer | `account_from` และ `account_to` | ลดต้นทาง เพิ่มปลายทาง | ไม่นับ |

กติกา:

- amount ต้องมากกว่า 0
- เลือกได้เฉพาะชื่อที่มีใน Accounts
- ชื่อ Account ต้องไม่ซ้ำ
- Transfer ห้ามต้นทางและปลายทางเดียวกัน
- Transaction ห้ามทำให้ Balance ติดลบ
- Expense ใหม่เลือก `บัญชีใช้จ่ายรายเดือน` เป็นค่าเริ่มต้นเมื่อพบบัญชีนี้
- Investments ไม่ถูกปรับจาก Transaction

### การแก้ไข

Transaction ที่สร้างโดย v2.1.0:

1. คำนวณผลย้อนกลับของรายการเดิม
2. รวมกับผลของรายการใหม่
3. ตรวจยอดคงเหลือทุก Account
4. อัปเดตยอด Accounts แบบ `values:batchUpdate`
5. อัปเดตแถว Transaction
6. หากข้อ 5 ล้มเหลว ให้พยายามคืนยอด Accounts ก่อนแก้

รองรับการเปลี่ยน amount, type, account_from และ account_to

### การลบ

- Income: ลดเงินที่เคยเพิ่มจากบัญชีปลายทาง
- Expense: คืนเงินให้บัญชีต้นทาง
- Transfer: คืนเงินให้ต้นทางและลดเงินจากปลายทาง
- ถ้าย้อนยอดแล้ว Account ใดติดลบ ระบบจะไม่ลบ
- หากลบแถวไม่สำเร็จหลังปรับ Accounts ระบบพยายามคืนยอดก่อนลบ

### Account

- ห้ามเพิ่มชื่อซ้ำ
- ห้ามเปลี่ยน `account_name` เมื่อมี Transaction อ้างถึงชื่อเดิม
- ห้ามลบ Account เมื่อมี Transaction อ้างถึง
- แก้ `balance` โดยตรงได้เพื่อ Reconcile
- การแก้ Account โดยตรงไม่เรียก Transaction automation

## 4. Opening Balance และ Cutover

สถานะข้อมูลที่ผู้ใช้จัดเตรียมแล้ว:

- ย้ายยอด `เงินสด(TH)` ออกจาก Investments ไป Account ชื่อ DIME
- ลบ Row `เงินสด(TH)` จาก Investments
- เปิด `include_accounts_in_net_worth = true` ใน Settings
- ยอด Accounts ปัจจุบันเป็น Opening Balance
- มี Accounts รวมถึง `บัญชีใช้จ่ายรายเดือน`

กติกา Cutover:

- ไม่คำนวณ Transactions เก่าย้อนกลับเพื่อสร้างยอด Accounts
- Transaction ใหม่จาก v2.1.0 ใช้ `tx_id` ที่ขึ้นต้น `v21-` เป็นตัวระบุภายในว่า Account effects ถูกใช้แล้ว
- Transaction เดิมที่ไม่มี Prefix นี้เป็น Legacy transaction
- Legacy transaction ไม่ปรับ Accounts เมื่อแก้หรือลบ เพื่อไม่ให้ Opening Balance ถูกนับอดีตซ้ำ
- หากแก้ Legacy transaction ให้ Reconcile กับยอดธนาคารจริง
- ไม่มีการเพิ่ม Header หรือ Sheet สำหรับ Cutover

## 5. โครงสร้าง Google Sheet

**ไม่มีการเปลี่ยนชื่อ Sheet หรือ Header ใน v2.1.0**

| Sheet | Headers ตามลำดับ |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |

## 6. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `app.js` | Transaction select, ค่าเริ่มต้นบัญชีใช้จ่าย, เรียก Account effects, ป้องกัน Account rename/delete, Quick Reconnect |
| `api.js` | Validation, Account balance batch update, reverse/apply effects, rollback, Legacy cutover |
| `sw.js` | Cache v2.1.0 และ URL matching ภายใต้ GitHub Pages scope |
| `README.md` | คู่มือใช้งาน, Opening Balance, Reconcile, OAuth, Deploy และ Rollback |
| `PROJECT_STATE.md` | อัปเดตสถานะ v2.1.0 |
| `CHANGELOG.md` | สร้างใหม่ตาม Keep a Changelog |

## 7. ไฟล์ที่ตรวจแล้วแต่ไม่เปลี่ยน

| ไฟล์ | เหตุผล |
|---|---|
| `index.html` | Form ถูกสร้างจาก `app.js`; IDs และ CSP เดิมเพียงพอ |
| `style.css` | ใช้ Style ของ select เดิมได้; ไม่ต้องเปลี่ยน Theme/Safe Area |
| `analytics.js` | Cash Flow แยก Income/Expense/Transfer ถูกต้องอยู่แล้ว |
| `config.js` | ห้ามเปลี่ยน IDs และไม่ต้องเพิ่ม Config |
| `manifest.json` | PWA configuration เดิมถูกต้อง |
| `PERSONAL_WEALTH_AGENT_MASTER_PROMPT.md` | เป็นเอกสารอ้างอิง ไม่ใช่ไฟล์เป้าหมายของรุ่นนี้ |

Hash ของไฟล์ข้างต้นตรงกับไฟล์อัปโหลดล่าสุดก่อนเริ่มงาน

## 8. OAuth และ Quick Reconnect

- การเชื่อมต่อทั่วไปใช้ `store.signIn("")`
- ไม่บังคับ `consent` ทุกครั้ง
- Google จะแสดง consent เองเมื่อจำเป็น
- เมื่อ API ตอบ 401 ให้ล้าง Token ใน session โดยไม่ revoke grant
- แสดงปุ่ม `แตะเพื่อเชื่อมต่อ Google`
- การขอ Token ต้องเริ่มจาก User gesture
- Logout โดยผู้ใช้ยัง revoke Token ตามเดิม
- ไม่ใช้ `localStorage`, PIN, Backend หรือ Refresh Token
- ไม่เปลี่ยน Google Cloud configuration หรือ OAuth Scope

## 9. ความปลอดภัย

| รายการ | ผล |
|---|---|
| Client Secret / Password | ไม่เพิ่ม |
| Access Token แบบ Hardcode | ไม่มี |
| Token storage | `sessionStorage` ตามเดิม |
| Google Sheet privacy | ต้องคง Private/Restricted |
| OAuth Client/Spreadsheet ID | ไม่เปลี่ยน |
| OAuth Scope | ไม่เปลี่ยน |
| GAS Backend | ไม่เพิ่มกลับ |
| Google API Cache | ไม่มี |
| Delete confirmation | คงไว้และเพิ่มคำอธิบายผลต่อ Accounts |
| Console error | จำกัดเหลือรหัส/ข้อความสั้น ไม่เขียน payload |

## 10. ผลการทดสอบ

### ผ่านจาก Static/Mock tests

| ลำดับ | การทดสอบ | ผล |
|---:|---|---|
| 1 | Income 1 บาท → Account +1 | ผ่าน Mock |
| 2 | ลบ Income → ยอดเดิม | ผ่าน Mock |
| 3 | Expense 1 บาท → Account -1 | ผ่าน Mock |
| 4 | แก้ Expense 1 เป็น 2 → สุทธิ -2 | ผ่าน Mock |
| 5 | เปลี่ยน Account ของ Expense | ผ่าน Mock |
| 6 | ลบ Expense → คืนยอด | ผ่าน Mock |
| 7 | Transfer 1 บาท A → B | ผ่าน Mock |
| 8 | แก้จำนวนและ Account ของ Transfer | ผ่าน Mock |
| 9 | ลบ Transfer → ยอดทั้งคู่เดิม | ผ่าน Mock |
| 10 | ป้องกัน Transfer บัญชีเดียวกัน | ผ่าน Mock |
| 11 | ป้องกันชื่อ Account ซ้ำ | ผ่าน Mock |
| 12 | ป้องกันยอดติดลบ | ผ่าน Mock |
| 13 | Legacy transaction ไม่ปรับ Opening Balance | ผ่าน Mock |
| 14 | Investments ไม่ถูกแก้ | ผ่าน Mock |
| 15 | Cash Flow ยังแยก Income/Expense/Transfer | ผ่าน Analytics Mock |
| 20 | Cache version เป็น v2.1.0 และไม่ Cache Google API | ผ่าน Static |

Static checks อื่นที่ผ่าน:

- JavaScript syntax: `app.js`, `api.js`, `sw.js`
- `manifest.json` parse ได้
- ไม่มี HTML ID ซ้ำ
- Static selectors อ้างถึง Element ที่มีอยู่; Dynamic selector ถูกสร้างจาก Form
- ไม่พบ `localStorage` หรือการบังคับ `signIn("consent")`
- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` ไม่เปลี่ยน
- `index.html`, `style.css`, `analytics.js`, `config.js`, `manifest.json` มี Hash ตรงกับไฟล์ล่าสุด
- Mock rollback ผ่านสำหรับ Append, Update และ Delete failure
- ป้องกัน Account rename/delete เมื่อมี Transaction อ้างถึงผ่าน Mock

### ต้องให้ผู้ใช้ทดสอบกับ Google Sheet จริง

| ลำดับ | การทดสอบ | สถานะ |
|---:|---|---|
| 1–14 | REST API กับข้อมูลทดสอบ 1 บาท | ยังไม่ได้ทดสอบจริง |
| 16 | Login ครั้งแรก | รอทดสอบหลัง Deploy |
| 17 | Quick Reconnect หลัง Token หมดอายุ | Static ผ่าน; รอทดสอบจริง |
| 18 | PWA บน iPhone และ Safe Area | CSS ไม่เปลี่ยน; รอ Regression test |
| 19 | Desktop responsive | UI files ไม่เปลี่ยน; รอ Regression test |
| 20 | Service Worker เปลี่ยน Cache หลัง Deploy | Static ผ่าน; รอตรวจ Browser |

ห้ามอ้างว่า REST API จริงผ่านแล้วจนกว่าผู้ใช้จะ Deploy และทดสอบ

## 11. ข้อจำกัดที่เหลือ

- Google Sheets API ไม่มี Atomic database transaction ระหว่าง Accounts และ Transactions
- หาก request สำเร็จที่ Server แต่ Browser ไม่ได้รับ response อาจต้อง Reconcile
- ไม่มีการล็อกหรือป้องกันการแก้พร้อมกันจากหลายอุปกรณ์
- Legacy transactions ไม่เชื่อม Accounts
- Investments อัปเดตมูลค่าด้วยตนเอง
- ไม่มี `InvestmentTransactions`, ระบบซื้อขายหลักทรัพย์ หรือราคาตลาด
- สูตร Emergency Fund ไม่เปลี่ยน
- OAuth ไม่มี Refresh Token และต้องให้ผู้ใช้กดเชื่อมต่อใหม่เมื่อจำเป็น

## 12. วิธี Deploy

1. สำรอง Google Sheet และ Repository v2.0.2
2. อัปโหลดไฟล์จาก `personal-wealth-v2.1.0.zip` ไปที่ Root ของ Repository
3. Replace 5 ไฟล์เดิมและเพิ่ม `CHANGELOG.md`
4. Commit:

```text
feat: link transactions to account balances
```

5. รอ GitHub Actions `pages build and deployment` เป็นสีเขียว
6. เปิด WebApp และกด Refresh
7. บน iPhone ให้ปิดและเปิด PWA ใหม่ถ้า Cache ยังไม่เปลี่ยน
8. ทดสอบตาม Checklist ด้วยจำนวน 1 บาทและลบข้อมูลทดสอบเมื่อเสร็จ

## 13. Rollback Plan

1. หยุดเพิ่ม แก้ และลบ Transaction
2. Revert Commit v2.1.0 หรือ Replace ไฟล์ด้วย Backup v2.0.2
3. Deploy และรอ GitHub Pages เป็นสีเขียว
4. ตรวจและ Reconcile ทุก Account กับยอดธนาคารจริง
5. ระวังว่า v2.0.2 จะไม่ย้อนยอด Account เมื่อลบหรือแก้ Transaction ที่ v2.1.0 สร้าง

การ Rollback Code ไม่ย้อนข้อมูลที่เขียนใน Google Sheet ระหว่างใช้ v2.1.0

## 14. Checklist หลัง Deploy

- [ ] GitHub Pages workflow สีเขียว
- [ ] ปุ่ม Login ครั้งแรกทำงาน
- [ ] Income 1 บาทเพิ่ม Account และลบแล้วคืนยอด
- [ ] Expense 1 บาทลดบัญชีใช้จ่ายและลบแล้วคืนยอด
- [ ] แก้ Expense 1 เป็น 2 แล้วสุทธิลดเพียง 2
- [ ] Transfer 1 บาท A → B และลบแล้วทั้งคู่กลับยอดเดิม
- [ ] ยอดไม่พอถูกป้องกัน
- [ ] เปลี่ยนชื่อ/ลบ Account ที่ถูกอ้างถึงไม่ได้
- [ ] Investments ไม่เปลี่ยน
- [ ] Cash Flow ยังถูกต้อง
- [ ] Quick Reconnect ไม่ขอ consent ซ้ำโดยไม่จำเป็น
- [ ] iPhone Safe Area และ Bottom Navigation ปกติ
- [ ] Desktop layout ปกติ
- [ ] Cache เปลี่ยนเป็น v2.1.0
- [ ] ลบข้อมูลทดสอบและตรวจยอด Account สุดท้าย
