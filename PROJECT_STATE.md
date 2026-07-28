# Personal Wealth — Project State

> อัปเดต: 28 กรกฎาคม 2569 (2026-07-28), Asia/Bangkok  
> รุ่น: **v2.2.0 — Account-linked Goals**  
> สถานะ: ผ่าน Static/Mock tests; ต้อง Migration Goals, Deploy และทดสอบกับ Google Sheet จริง

## 1. สรุปโครงการ

| รายการ | สถานะ |
|---|---|
| Repository | `Wittaya-Tasu/personal-wealth` |
| Branch | `main` |
| WebApp | `https://wittaya-tasu.github.io/personal-wealth/` |
| Hosting | GitHub Pages |
| รูปแบบ | Static WebApp / PWA |
| Database | Google Sheet แบบ Private/Restricted |
| Auth | Google OAuth Token Model |
| API | Google Sheets API v4 โดยตรง |
| Backend | ไม่มี; GAS deployments เดิม Archived |
| UI | ภาษาไทย, Dark Emerald + Gold, Sarabun |
| อุปกรณ์หลัก | iPhone และ Desktop |

## 2. การเปลี่ยนแปลง v2.2.0

### ภาระหนี้ต่อรายได้

- ถ้า `Liabilities` ไม่มีรายการ หรือยอดหนี้และค่างวดรวมเป็น 0 แสดง `0%`
- Detail แสดง `ไม่มีภาระหนี้`
- ไม่ต้องสร้างรายการหนี้ชื่อ “ไม่มีหนี้” หรือยอด 0
- ถ้ามีค่างวดแต่ยังไม่มี Income เดือนปัจจุบัน แสดง `—` และเหตุผล

### เป้าหมายการเงิน

- `Manual`: ใช้ `current_amount` เดิม
- `Account`: ใช้ `Accounts.balance` ของ `linked_account`
- การอ่านยอด Goal ไม่เขียนหรือปรับยอด Account
- Account หายหรือชื่อซ้ำทำให้ Goal แสดงคำเตือนและไม่เดาบัญชี

### เป้าหมายชีวิต / Milestone

- ไม่ใช้จำนวนเงินหรือเปอร์เซ็นต์สมมติ
- สถานะ: `Not Started`, `In Progress`, `Completed`
- แสดงวันเป้าหมายและบันทึกช่วยจำได้

### ความถูกต้องของการอ้างอิง

- ห้ามเปลี่ยน `account_name` เมื่อ Transaction หรือ Goal อ้างถึง
- ห้ามลบ Account เมื่อ Transaction หรือ Goal อ้างถึง
- Duplicate `account_name` ยังถือเป็น Error

### PWA Cache

- Local Assets ใน `index.html` ใช้ Query `?v=2.2.0`
- Service Worker ลงทะเบียนด้วย `sw.js?v=2.2.0`
- Cache name: `personal-wealth-shell-v2.2.0`
- ไม่ Cache Google API response

## 3. โครงสร้าง Google Sheet

ชื่อชีตเดิมทั้งหมดคงเดิม v2.2.0 เพิ่ม Header ต่อท้ายเฉพาะ `Goals`

| Sheet | Headers |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note`, `goal_type`, `progress_source`, `linked_account`, `status` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |

Migration:

| Cell | Header ใหม่ |
|---|---|
| G1 | `goal_type` |
| H1 | `progress_source` |
| I1 | `linked_account` |
| J1 | `status` |

Goal เดิมที่ G–J ว่างจะถูกตีความเป็น `Financial` + `Manual`

## 4. กติกา Goal

### Financial + Manual

- `target_amount` > 0
- `current_amount` >= 0
- `linked_account` ว่าง

### Financial + Account

- `target_amount` > 0
- `linked_account` ต้องตรงกับ Account ที่มีอยู่และชื่อไม่ซ้ำ
- ยอดแสดงผล = `max(Accounts.balance, 0)`
- `current_amount` ไม่ถูกใช้ขณะผูกบัญชี และไม่ถูกลบเพื่อรองรับการสลับกลับ Manual

### Milestone

- `target_amount` และ `current_amount` ว่าง
- `progress_source = Status`
- `linked_account` ว่าง
- ใช้ `status` แทนเปอร์เซ็นต์

## 5. Account-linked Transactions และ Opening Balance

- ยอด Accounts ตอนเริ่มใช้ v2.1.0 เป็น Opening Balance
- Transaction เก่าไม่ถูกคำนวณย้อนกลับ
- Transaction ใหม่มี `tx_id` ขึ้นต้น `v21-`
- Income เพิ่มปลายทาง
- Expense ลดต้นทาง
- Transfer ลดต้นทางและเพิ่มปลายทาง
- แก้/ลบรายการใหม่ย้อนผลเดิมก่อนใช้ผลใหม่
- Legacy transaction แก้/ลบโดยไม่ปรับ Opening Balance
- Investments ไม่ถูก Transaction automation แก้ไข

## 6. เงินใช้จ่ายคงเหลือ

- อ่านยอดจาก Account ชื่อ `บัญชีใช้จ่ายรายเดือน`
- ยอดยกมาคงอยู่ ไม่ Reset รายเดือน
- Expense ใหม่เลือกบัญชีนี้เป็นค่าเริ่มต้น
- Detail นับ Expense เดือนปัจจุบันจากบัญชีนี้
- เงินเติมงบใช้ Transfer จากบัญชีหลัก

## 7. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `index.html` | ชื่อ Goals ใหม่และ Version URLs |
| `style.css` | สถานะ Goal, Migration warning และ Dynamic goal fields |
| `analytics.js` | No-debt logic, Goal types, Account-linked progress และคำเตือน |
| `api.js` | Validate/Save Goal, ตรวจ Header และป้องกัน Account references |
| `app.js` | ฟอร์ม/Render Goal, Debt display, Schema warning และ Null-safe class |
| `sw.js` | Cache v2.2.0 และ Versioned assets |
| `README.md` | คู่มือ v2.2.0 |
| `PROJECT_STATE.md` | สถานะฉบับนี้ |
| `CHANGELOG.md` | ประวัติ v2.2.0 |
| `GOALS_MIGRATION.md` | ขั้นตอนเพิ่ม Header Goals |
| `PERSONAL_WEALTH_AGENT_MASTER_PROMPT.md` | อัปเดต Schema และสถานะความสามารถล่าสุด |

ไฟล์ที่ตรวจแล้วแต่ไม่เปลี่ยน:

- `config.js`: Client ID, Spreadsheet ID, Sheet names และ Defaults เดิม
- `manifest.json`: PWA configuration เดิมถูกต้อง

## 8. OAuth และ Security

- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` ไม่เปลี่ยน
- Google Cloud configuration ไม่เปลี่ยน
- Quick Reconnect ใช้ user gesture และ `prompt` ว่าง
- Token เก็บเฉพาะ `sessionStorage`
- ไม่มี Client Secret, Refresh Token, Password หรือข้อมูลการเงินจริงใน Repository
- Goal ที่ผูกบัญชีใช้ OAuth Scope เดิม
- Service Worker Cache เฉพาะ Static Assets

## 9. ผลการทดสอบ

### ผ่าน Static/Mock

| # | กรณี | ผล |
|---:|---|---|
| 1 | JavaScript syntax: analytics/api/app/sw | ผ่าน |
| 2 | ไม่มีหนี้และไม่มี Income → DSR = 0 | ผ่าน |
| 3 | มีค่างวดแต่ไม่มี Income → DSR = null/แสดง — | ผ่าน |
| 4 | Goal เดิม → Financial + Manual | ผ่าน |
| 5 | Goal DIME target 100,000, balance 60,000 → 60% | ผ่าน |
| 6 | Goal ผูกบัญชีที่ไม่มี → warning | ผ่าน |
| 7 | Milestone Completed → สถานะสำเร็จ ไม่มีเปอร์เซ็นต์เงิน | ผ่าน |
| 8 | Missing Goal headers → บล็อกการบันทึกพร้อม Error | ผ่าน |
| 9 | Account ที่ Goal อ้างถึง → บล็อก Rename/Delete | ผ่าน |
| 10 | Account-linked Transaction regression | ผ่าน |
| 11 | Monthly Spending Balance regression | ผ่าน |
| 12 | Service Worker v2.2.0 ไม่ Cache Google API | ผ่าน |
| 13 | Config identifiers ไม่เปลี่ยน | ผ่าน |

### ต้องให้ผู้ใช้ทดสอบกับ Google Sheet จริง

ห้ามถือ Static/Mock ว่าเป็น REST API จริง ต้องทดสอบหลัง Migration และ Deploy:

1. Goal เดิมยังแสดงยอดเดิม
2. Goal Manual 1/100 แสดง 1%
3. Goal Account ผูก Account ทดสอบและแสดง Balance ถูกต้อง
4. แก้ Balance Account โดยตรงแล้ว Goal เปลี่ยนตามหลัง Refresh
5. Milestone เปลี่ยนสถานะและลบได้
6. Account ที่ Goal อ้างถึง Rename/Delete ไม่ได้
7. ไม่มีหนี้แสดง 0% และไม่มีภาระหนี้
8. Income/Expense/Transfer ยังทำงาน
9. iPhone Safe Area และ Desktop Responsive ไม่เสีย
10. ไม่มีแถบ Error จาก Cache เก่า

หากสร้างข้อมูลทดสอบใน Sheet ให้ลบหลังทดสอบ

## 10. ข้อจำกัด

- Goal หนึ่งรายการผูกได้หนึ่ง Account
- Goal เก็บ `account_name` ไม่ใช่ `account_id`
- Milestone ไม่มี Checklist ย่อย
- Google Sheets API ไม่มี Transaction แบบฐานข้อมูลข้ามชีต
- ไม่มีระบบหลายผู้ใช้หรือ concurrency lock
- Investments อัปเดตเอง
- ไม่มี Refresh Token

## 11. Deploy

1. สำรอง Google Sheet และ Repository v2.1.1
2. ทำตาม `GOALS_MIGRATION.md`
3. Replace ไฟล์จาก `personal-wealth-v2.2.0.zip`
4. Commit:

```text
feat: add account-linked goals and debt clarity
```

5. รอ Pages deployment สีเขียว
6. ปิด PWA/Tab เก่าและเปิดใหม่
7. Refresh และทดสอบ Checklist ด้านบน

## 12. Rollback

1. หยุดแก้ Goal
2. Revert Commit v2.2.0 หรือ Replace Code ด้วย Backup v2.1.1
3. คง Header G–J ใน Goals ได้ รุ่นเก่าจะเพิกเฉย
4. Deploy และเปิด PWA ใหม่
5. ตรวจ Accounts, Transactions, Investments และ Goals

Rollback Code ไม่ปรับยอดการเงินและไม่ต้องลบ Header ใหม่
