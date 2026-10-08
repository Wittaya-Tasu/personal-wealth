# TasuyaWay — Project State

> อัปเดต: 8 ตุลาคม 2569 (2026-10-08), Asia/Bangkok  
> รุ่นพัฒนา: **v2.10.0 — Financial Foundation**  
> รุ่นฐานก่อนเริ่มงาน: **v2.9.0**  
> สถานะ: Code และ Mock tests ผ่าน; รอ Migration และทดสอบกับ Google Sheet จริง

## 1. สรุปโครงการ

| รายการ | สถานะ |
|---|---|
| Repository | `Wittaya-Tasu/personal-wealth` |
| Branch | `main` |
| WebApp | `https://wittaya-tasu.github.io/personal-wealth/` |
| Hosting | GitHub Pages, Static PWA |
| Database | Google Sheet แบบ Private/Restricted |
| Auth/API | Google OAuth Token Model + Google Sheets API v4 โดยตรง |
| Backend | ไม่มีสำหรับหน้าเว็บ; Apps Script ใช้เฉพาะ Scheduled Snapshot |
| UI หลัก | ภาษาไทย, Dark Emerald + Gold, Sarabun, Mobile-first สำหรับ iPhone |

## 2. การเปลี่ยนแปลง v2.10.0

| งาน | ผลลัพธ์ |
|---|---|
| หน้าที่ของบัญชี | เพิ่ม `account_role` และตัวเลือก General/Spending/Emergency/SinkingFund/Investment |
| เงินฉุกเฉิน | นับเฉพาะ Accounts ที่ `account_role = Emergency` ไม่รวมบัญชีอื่นหรือ Investments |
| รายจ่ายระดับบน | เพิ่ม `expense_group`: Personal/Family/HomeDebt/Health/Protection |
| ความจำเป็น | เพิ่ม `is_essential`: Yes/No และบังคับเลือกเมื่อบันทึก Expense ใหม่ |
| สูตรรายจ่ายจำเป็น | ใช้ Expense ที่เป็น Yes เฉลี่ย 3 เดือน หรือใช้ Settings override หากกรอกไว้ |
| กราฟรายจ่าย | รวมตาม `expense_group`; แถวเดิมที่ยังว่างรวมเป็น `ยังไม่จัดกลุ่ม` |
| รายการบัตรเก่า | Expense ที่ `category = บัตรเครดิต` ยังถูกตัดออกเพื่อไม่ให้นับยอดชำระซ้ำ |
| ความเข้ากันได้ | เพิ่ม Header ต่อท้ายเท่านั้น ไม่คำนวณ Opening Balance หรือ Transactions เก่าย้อนหลัง |
| PWA | Versioned assets และ cache เป็น v2.10.0 |

## 3. โครงสร้าง Google Sheet

| Sheet | Headers |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note`, `account_role` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note`, `item_name`, `payment_method`, `credit_card`, `expense_group`, `is_essential` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note`, `account_from`, `funded_amount` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note`, `liability_type` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note`, `goal_type`, `progress_source`, `linked_account`, `status` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |
| `Gratitude` | `gratitude_id`, `date`, `slot`, `category`, `gratitude_text`, `created_at`, `updated_at` |
| `Todos` | `todo_id`, `date`, `category`, `task_text`, `is_important`, `is_completed`, `completed_at`, `created_at`, `updated_at`, `parent_todo_id` |
| `Habits` | `habit_id`, `habit_name`, `frequency`, `active`, `created_at`, `updated_at` |
| `HabitLogs` | `habit_log_id`, `habit_id`, `period_key`, `completed_date`, `completed_at`, `created_at`, `updated_at` |

### Migration v2.10.0

| Cell | Header |
|---|---|
| Accounts G1 | `account_role` |
| Transactions L1 | `expense_group` |
| Transactions M1 | `is_essential` |

เพิ่มต่อท้ายเท่านั้น ห้ามแทรกคอลัมน์กลางตาราง อ่าน `FINANCIAL_FOUNDATION_MIGRATION.md`

## 4. กติกาการคำนวณ

```text
Emergency Balance = SUM(Accounts.balance WHERE account_role = Emergency)

Essential Monthly Expense =
  average of Expense WHERE is_essential = Yes in the latest 3 calendar months

Emergency Months = Emergency Balance ÷ Essential Monthly Expense
```

| กรณี | ผลลัพธ์ |
|---|---|
| ไม่มีบัญชี Emergency | ยอดเงินฉุกเฉินเป็น 0 และแสดงคำเตือน |
| ไม่มีรายจ่ายที่จำแนกได้ | จำนวนเดือนเป็น `—` และแสดงคำเตือน |
| จำแนก Expense ไม่ครบ | คำนวณจากข้อมูลที่ระบุได้ พร้อมเตือนว่าอาจคลาดเคลื่อน |
| ตั้ง `essential_expense_override` | ใช้ค่าที่กรอกแทนข้อมูล Transactions |
| มีหลายบัญชี Emergency | รวมยอดทุกบัญชี |
| เงินฝาก/เงินสดอยู่ใน Investments | ไม่นับเป็นเงินฉุกเฉิน |

## 5. กติกาการบันทึก

- Account ใหม่หรือ Account ที่แก้ไขต้องมี `account_role`
- Expense ใหม่หรือ Expense ที่แก้ไขต้องมี `expense_group` และ `is_essential`
- Income, Transfer และ CreditCardPayment ไม่ใช้สองช่องดังกล่าว
- การซื้อด้วยบัตรเครดิตยังนับเป็น Expense ในเดือนที่ซื้อและต้องจำแนกกลุ่ม/ความจำเป็น
- การจ่ายบัตรเครดิตไม่ถูกนับเป็น Expense ซ้ำ
- Transaction และ Opening Balance เดิมไม่ถูกคำนวณย้อนหลัง

## 6. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `app.js` | ฟอร์ม หน้ารายการ คำเตือน และการแสดงหน้าที่บัญชี |
| `api.js` | Schema checks และ validation ของ Header/ค่ารุ่นใหม่ |
| `analytics.js` | สูตร Emergency Fund, Essential Expense และกราฟตามกลุ่มระดับบน |
| `index.html` | Version URL และคำอธิบาย Settings |
| `sw.js` | Cache v2.10.0 |
| `FINANCIAL_FOUNDATION_MIGRATION.md` | คู่มือเพิ่ม Header และกรอกข้อมูลเดิม |
| `README.md`, `PROJECT_STATE.md`, `CHANGELOG.md` | เอกสารรุ่นใหม่ |

`style.css`, `manifest.json`, `MONTH_END_SNAPSHOT.gs`, OAuth Client ID และ Spreadsheet ID ไม่เปลี่ยน

## 7. ผลทดสอบ

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax: app/api/analytics/sw | ผ่าน |
| รวมเฉพาะหลายบัญชี Emergency | ผ่าน Mock |
| ไม่รวม Spending และเงินสดใน Investments | ผ่าน Mock |
| ค่าใช้จ่ายจำเป็นเฉลี่ย 3 เดือน | ผ่าน Mock |
| ข้อมูลเดิมไม่จำแนกทำให้แสดง `—` และ Warning | ผ่าน Mock |
| Expense validation: group + Yes/No | ผ่าน Mock |
| Account validation: account_role | ผ่าน Mock |
| กราฟรวมตามกลุ่มระดับบน | ผ่าน Mock |
| Google Sheet จริง / iPhone PWA | รอผู้ใช้ทดสอบหลัง Deploy |

## 8. ลำดับ Deploy

1. สำรอง Google Sheet และ Repository
2. ทำ `FINANCIAL_FOUNDATION_MIGRATION.md`
3. กำหนด `account_role` ให้ Accounts โดยเฉพาะบัญชี Emergency
4. เติม `expense_group` และ `is_essential` ให้ Expense อย่างน้อย 3 เดือนล่าสุด
5. Replace ไฟล์จาก `tasuya-way-v2.10.0.zip` ที่ Root
6. Commit: `feat: add account roles and essential expense planning`
7. รอ GitHub Pages workflow เป็นสีเขียว
8. ปิด PWA เดิม เปิดใหม่ และ Refresh
9. ทดสอบ Expense จำนวนเล็กน้อยแล้วลบออก

## 9. Rollback และข้อจำกัด

- Header ใหม่สามารถคงไว้ได้เมื่อย้อน Code เพราะรุ่นเก่าจะเพิกเฉย
- Code rollback ไม่ย้อนยอด Account, Liability หรือ Transaction ที่เขียนแล้ว
- Google Sheets API ไม่มี Atomic transaction ข้ามชีต; ระบบใช้ compensating rollback
- ชื่อ Account ยังถูกอ้างอิงด้วย `account_name` ไม่ใช่ `account_id`
- Goal หนึ่งรายการยังผูกได้หนึ่ง Account
- ค่า Emergency Fund อาศัยการจัดประเภทที่ผู้ใช้กรอก ไม่ตรวจสภาพคล่องของธนาคารอัตโนมัติ
- ไม่มี Refresh Token และไม่มี Multi-user concurrency control
