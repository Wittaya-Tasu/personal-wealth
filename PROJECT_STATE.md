# TasuyaWay — Project State

> อัปเดต: 7 ตุลาคม 2569 (2026-10-07), Asia/Bangkok  
> รุ่นพัฒนา: **v2.8.0 — TasuyaWay + Todo Carry-over + Cashflow Summary**  
> รุ่นที่ตรวจพบว่า Deploy อยู่ก่อนเริ่มงาน: **v2.7.1**  
> สถานะ v2.8.0: พร้อม Deploy; ไม่เปลี่ยน Google Sheet หรือ Apps Script

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
| Backend | ไม่มีสำหรับ WebApp; มี Apps Script เฉพาะ Scheduled Snapshot |
| UI | ภาษาไทย, Dark Emerald + Gold, Sarabun |
| อุปกรณ์หลัก | iPhone โดยเฉพาะหน้าจอประมาณ 390–430px และ Desktop |

## 2. การเปลี่ยนแปลง v2.8.0

| งาน | ผลลัพธ์ |
|---|---|
| Todo ค้าง | งานที่ยังไม่เสร็จแสดงต่อในวันถัดไปจนกว่าจะติ๊กเสร็จ โดยไม่สร้างแถวใหม่ |
| ประวัติ Todo | เก็บวันเริ่มเดิม แสดง `ค้างจาก ...`; งานเสร็จหายจากวันหลังวันเสร็จ |
| Branding | เปลี่ยนชื่อ WebApp/PWA เป็น `TasuyaWay` และเปลี่ยนไอคอนจาก W เป็น T |
| Cashflow summary | เพิ่มตารางรายรับ รายจ่าย เงินออมใต้กราฟ โดยใช้เดือน/ปีชุดเดียวกับกราฟ |
| โหมดตาราง | สลับแสดงเปอร์เซ็นต์หรือยอดเงินบาทได้ |
| Migration | ไม่เพิ่ม Sheet/Header และไม่ต้องแก้ Apps Script |
| PWA | Versioned assets และ cache เป็น v2.8.0 |

## 3. โครงสร้าง Google Sheet

| Sheet | Headers |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note`, `item_name`, `payment_method`, `credit_card` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note`, `account_from`, `funded_amount` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note`, `liability_type` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note`, `goal_type`, `progress_source`, `linked_account`, `status` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |
| `Gratitude` | `gratitude_id`, `date`, `slot`, `category`, `gratitude_text`, `created_at`, `updated_at` |
| `Todos` | `todo_id`, `date`, `category`, `task_text`, `is_important`, `is_completed`, `completed_at`, `created_at`, `updated_at` |
| `Habits` | `habit_id`, `habit_name`, `frequency`, `active`, `created_at`, `updated_at` |
| `HabitLogs` | `habit_log_id`, `habit_id`, `period_key`, `completed_date`, `completed_at`, `created_at`, `updated_at` |

### Migration v2.7.0

เพิ่มต่อท้ายตารางเท่านั้น:

| Cell | Header |
|---|---|
| Transactions J1 | `payment_method` |
| Transactions K1 | `credit_card` |
| Liabilities F1 | `liability_type` |

อ่านขั้นตอนใน `CREDIT_CARD_MIGRATION.md` ห้ามแทรกคอลัมน์กลางตาราง

สร้างชีต `Todos`, `Habits`, `HabitLogs` ตาม `TODAY_MIGRATION.md`, ตรวจหมวด Gratitude ตาม `GRATITUDE_MIGRATION.md` และติดตั้ง Trigger ตาม `SNAPSHOT_AUTOMATION.md`

## 4. กติกา Expense

| การกระทำ | กติกา |
|---|---|
| เพิ่ม Expense | เลือกหมวดก่อน ช่องรายการจึงพิมพ์ได้ |
| หมวดมาตรฐาน | อาหาร, เครื่องดื่ม, หนังสือ, ทำบุญ, ของใช้ส่วนตัว, ค่าเดินทาง, ครอบครัว, สุขภาพ, อิเล็กทรอนิกส์, อื่น ๆ |
| หมวดเพิ่มเอง | อ่านจาก Categories ที่ `type = Expense` |
| บันทึก | `category` อยู่คอลัมน์ D และ `item_name` อยู่คอลัมน์ I |
| รายการเก่า | ยังอ่าน แสดง ลบ และย้อน Account ได้แม้ `item_name` ว่าง |
| กราฟ | รวมตาม `category`; ตัด `บัตรเครดิต` ออก |

`บัตรเครดิต` ใน v2.4.0 หมายถึงค่า exact match ใน `Transactions.category` ไม่ใช่ชื่อ `account_from` ดังนั้นค่าอาหารที่ชำระผ่าน Account บัตรเครดิตจะยังอยู่ในกราฟ หาก category เป็น `อาหาร`

## 5. กติกา Investment Contribution

| การกระทำ | กติกา |
|---|---|
| เลือก RMF เดิม | แสดงมูลค่าปัจจุบันและ Account ต้นทางเดิม |
| เพิ่มเงิน | `current_value += เงินรอบใหม่`; `funded_amount += เงินรอบใหม่` |
| Account | ลดเฉพาะเงินรอบใหม่ และต้องมียอดเพียงพอ |
| ชื่อใหม่ | Append แถวใหม่ใน Investments และตั้ง `category = เงินลงทุน` |
| ชื่อซ้ำ | Block และให้เลือกสินทรัพย์เดิม |
| เปลี่ยน Account | Block หากสินทรัพย์เดิมเชื่อม Account อยู่แล้ว |
| เขียน Investment ล้มเหลว | Rollback Account เป็นยอดก่อนทำรายการ |
| ลบสินทรัพย์เชื่อม Account | คืน `funded_amount` ทั้งหมดก่อนลบแถว |
| Cash Flow | ไม่ถือเป็น Income หรือ Expense |

ฟอร์มไม่แสดง units, avg_cost, current_price, current_value, tax_deductible และ note แต่คอลัมน์เดิมยังคงอยู่เพื่อรักษาข้อมูลเดิม การเติมเงินจะไม่ลบค่าเดิมเหล่านี้

## 6. กติกากราฟสัดส่วนรายจ่าย

- ใช้เฉพาะ Transaction ประเภท Expense ของเดือนที่เลือก
- ตัดรายการที่ `category` เท่ากับ `บัตรเครดิต` หลัง trim/case normalization
- รวมตาม `category` และเรียงจากยอดมากไปน้อย
- ตัวหารเปอร์เซ็นต์เป็นยอดหลังตัดบัตรเครดิตแล้ว
- เปอร์เซ็นต์มากกว่า 0 แต่น้อยกว่า 10% แสดง 1 ตำแหน่ง
- เปอร์เซ็นต์ตั้งแต่ 10% ขึ้นไปแสดงจำนวนเต็ม

## 7. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `index.html` | ชื่อ TasuyaWay, ตาราง Cashflow, Version URL |
| `style.css` | ตาราง Cashflow แบบเลื่อนแนวนอนบนมือถือ และป้ายงานค้าง |
| `app.js` | Todo carry-over และการคำนวณ/แสดงตาราง Cashflow |
| `manifest.json` | ชื่อ คำอธิบาย และหมวดของ PWA |
| `icons/*` | ไอคอน TasuyaWay ตัวอักษร T |
| `sw.js` | Cache v2.8.0 |
| `README.md` | คู่มือระบบและ Deploy |
| `PROJECT_STATE.md` | สถานะล่าสุด |
| `CHANGELOG.md` | ประวัติ v2.8.0 |
| `GRATITUDE_MIGRATION.md` | เพิ่มหมวดตัวเองและประสบการณ์ |
| `TODAY_MIGRATION.md` | วิธีสร้าง Todos, Habits, HabitLogs |
| `MONTH_END_SNAPSHOT.gs` | Scheduled Snapshot สิ้นเดือน |
| `SNAPSHOT_AUTOMATION.md` | วิธีติดตั้ง Trigger และทดสอบ |

`api.js`, `analytics.js`, `config.js`, OAuth Client ID, Spreadsheet ID, โครงสร้างชีต และ Apps Script ไม่เปลี่ยน

## 8. ผลทดสอบในสภาพแวดล้อมจำลอง

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax: analytics/api/app/sw | ผ่าน |
| รูดบัตรไม่ลด Account และเพิ่มหนี้ | ผ่าน |
| รูดบัตรปรากฏใน Cash Flow/Expense Breakdown | ผ่าน |
| แก้ยอดรูดบัตรย้อนของเดิมก่อน | ผ่าน |
| จ่ายบางส่วนลด Account และหนี้ | ผ่าน |
| จ่ายบัตรไม่ถูกนับเป็น Expense ซ้ำ | ผ่าน |
| จ่ายเกินยอดหนี้ | Block |
| ลบรายการชำระคืน Account/หนี้ | ผ่าน |
| ลบ Expense ผ่านบัตรย้อนหนี้ | ผ่าน |
| ลบบัตรออกจาก Liabilities | ผ่าน |
| บันทึก Gratitude 1–3 เรื่อง | ผ่าน |
| แก้ Slot เดิม/เพิ่ม Slot ใหม่ | ผ่าน |
| ล้าง Slot แล้วลบเฉพาะแถวนั้น | ผ่าน |
| หมวดหรือ Header ไม่ถูกต้อง | Block |
| ไม่มีชีต Gratitude | หน้าการเงินยังโหลดได้ |
| Todo validation/ดาว/สถานะเสร็จ | ผ่าน API Mock |
| Todo ค้างแสดงต่อวันถัดไปโดยไม่สร้างแถวซ้ำ | ผ่าน Logic Mock |
| Todo เสร็จแสดงถึงวันเสร็จและหายจากวันถัดไป | ผ่าน Logic Mock |
| Habit period key วัน/สัปดาห์/เดือน/ปี | ผ่าน API Mock |
| ไม่มี Todos/Habits/HabitLogs | หน้าการเงินยังโหลดได้ |
| Apps Script syntax | ผ่าน |
| PWA Version URLs | ผ่าน Static check |
| Cashflow table: % / ยอดเงิน / เงินออมติดลบ / ไม่มีรายรับ | ผ่าน Logic Mock |
| Manifest และไอคอน 192/512 | ผ่าน Static/Image check |

## 9. สิ่งที่ต้องทดสอบกับ Google Sheet จริง

1. ทำ `TODAY_MIGRATION.md` และตรวจ `GRATITUDE_MIGRATION.md`
2. ติดตั้ง `MONTH_END_SNAPSHOT.gs` ตาม `SNAPSHOT_AUTOMATION.md`
3. Deploy v2.8.0 และปิด–เปิด PWA ใหม่
4. ทดสอบ Todo: เพิ่มงานวันนี้ เปิดวันถัดไป ตรวจป้าย `ค้างจาก ...` แล้วติ๊กเสร็จ
5. ทดสอบ Habit ทุกความถี่ และตรวจว่าในรอบเดียวกันไม่สร้าง Log ซ้ำ
6. ทดสอบ Gratitude หมวดตัวเองและประสบการณ์
7. Run `testMonthEndSnapshotNow` แล้วตรวจ MonthlySnapshots

## 10. Deploy

1. สำรอง Google Sheet และ Repository
2. ทำ `TODAY_MIGRATION.md`
3. ตรวจ `GRATITUDE_MIGRATION.md`
4. ติดตั้ง `SNAPSHOT_AUTOMATION.md`
5. Replace ไฟล์จาก `tasuya-way-v2.8.0.zip` ที่ Root
6. Commit: `feat: rebrand to TasuyaWay and add cashflow summary`
7. รอ GitHub Pages workflow เป็นสีเขียว
8. ปิด PWA เดิม เปิดใหม่ และ Refresh

## 11. Rollback และข้อจำกัด

- ย้อน Code เป็นรุ่นที่ Deploy อยู่ก่อนหน้าได้ และคง Header/ชีตใหม่ไว้ได้
- Code rollback ไม่ย้อนยอด Accounts/Liabilities หรือแถว Gratitude ที่เขียนแล้ว
- Google Sheets API ไม่มี Atomic transaction ข้ามชีต; ระบบทำ compensating rollback เมื่อเขียนล้มเหลว
- หนึ่งสินทรัพย์ที่รวมในแถวเดิมรองรับหนึ่ง Account ต้นทาง
- ไม่มี Contribution ledger, Sale, Dividend, Fee, Tax, Reinvest หรือราคาตลาดอัตโนมัติ
- Legacy Transactions/Investments ไม่ถูกนำไปปรับ Opening Balance ย้อนหลัง
- ลบบัตรแล้วประวัติ Expense ยังคงอยู่; หากแก้/ลบย้อนหลังต้องสร้างบัตรชื่อเดิมก่อน
- ไม่มี Refresh Token และไม่มี Multi-user concurrency control
- การบันทึก Gratitude หลาย Slot ไม่เป็น Atomic transaction ข้ามแถว
- Todo carry-over เป็นการแสดงแถวเดิมตามวัน ไม่ได้เปลี่ยน `date` หรือสร้างสำเนาใน Google Sheet
- Apps Script Trigger ทำงานในช่วงเวลาโดยประมาณ ไม่รับประกันวินาทีที่แน่นอน
