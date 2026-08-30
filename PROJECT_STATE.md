# Personal Wealth — Project State

> อัปเดต: 30 สิงหาคม 2569 (2026-08-30), Asia/Bangkok  
> รุ่นพัฒนา: **v2.4.0 — Expense Categories & Simple Investment Contributions**  
> รุ่นที่ผู้ใช้ยืนยันว่า Deploy และใช้งานได้: **v2.3.0**  
> สถานะ v2.4.0: ผ่าน Static/Mock tests; ต้อง Migration Transactions, Deploy และทดสอบกับ Google Sheet จริง

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
| อุปกรณ์หลัก | iPhone โดยเฉพาะหน้าจอประมาณ 390–430px และ Desktop |

## 2. การเปลี่ยนแปลง v2.4.0

| งาน | ผลลัพธ์ |
|---|---|
| หมวดรายจ่าย | เลือกจากหมวดมาตรฐานและ Categories sheet |
| ชื่อรายการรายจ่าย | เพิ่ม `item_name`; เลือกหมวดก่อนจึงพิมพ์ได้ |
| รายการเดิม | ผู้ใช้แก้ category และ item_name ใน Google Sheet ได้เอง |
| กราฟสัดส่วนรายจ่าย | ตัด category `บัตรเครดิต` ออกทั้งยอดและตัวหารเปอร์เซ็นต์ |
| เปอร์เซ็นต์กลุ่มเล็ก | ต่ำกว่า 10% แสดงทศนิยม 1 ตำแหน่ง |
| Investment form | เลือกสินทรัพย์เดิม/ชื่อใหม่ + Account + เงินลงทุนรอบนี้ |
| เติม Investment เดิม | เพิ่ม `current_value` และ `funded_amount` ในแถวเดิม |
| Account ต้นทาง | สินทรัพย์ที่เชื่อมแล้วบังคับใช้ Account เดิม |
| PWA | Versioned assets และ cache เป็น v2.4.0 |

## 3. โครงสร้าง Google Sheet

| Sheet | Headers |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note`, `item_name` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note`, `account_from`, `funded_amount` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note`, `goal_type`, `progress_source`, `linked_account`, `status` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |

### Migration v2.4.0

เพิ่มต่อท้ายชีต `Transactions` เท่านั้น:

| Cell | Header |
|---|---|
| I1 | `item_name` |

อ่านขั้นตอนและวิธีจัดข้อมูลเดิมใน `TRANSACTIONS_MIGRATION.md` ห้ามแทรกคอลัมน์กลางตาราง

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
| `index.html` | คำอธิบาย Quick Add, Search placeholder และ Version URL |
| `style.css` | แสดงสถานะช่องที่ถูกปิดจนกว่าจะเลือกข้อมูลก่อน |
| `analytics.js` | ตัดหมวดบัตรเครดิตจาก expense breakdown |
| `api.js` | Schema item_name, validation และ Investment contribution/rollback |
| `app.js` | ฟอร์ม Expense/Investment, เปอร์เซ็นต์ และการแสดงรายการ |
| `sw.js` | Cache v2.4.0 |
| `README.md` | คู่มือระบบและ Deploy |
| `PROJECT_STATE.md` | สถานะล่าสุด |
| `CHANGELOG.md` | ประวัติ v2.4.0 |
| `TRANSACTIONS_MIGRATION.md` | วิธีเพิ่ม I1 และจัดข้อมูลเดิม |

`style.css` เพิ่มสถานะ disabled ให้ช่องที่ยังกรอกไม่ได้โดยไม่เปลี่ยนโครง Theme; `config.js`, `manifest.json`, OAuth Client ID, Spreadsheet ID และชื่อชีตไม่เปลี่ยน

## 8. ผลทดสอบในสภาพแวดล้อมจำลอง

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax: analytics/api/app/sw | ผ่าน |
| ตัด category บัตรเครดิตจากยอดรวม/เปอร์เซ็นต์ | ผ่าน |
| กลุ่มรายจ่ายต่ำกว่า 10% | ผ่านข้อมูลคำนวณและ Static rendering check |
| Expense มี category + item_name | ผ่าน |
| ขาด Header item_name | Block การเพิ่ม/แก้ Expense พร้อมข้อความ |
| ลบ/ย้อน Expense เก่าที่ไม่มี item_name | ผ่าน |
| เติม RMF เดิม | current_value/funded_amount เพิ่มถูกต้อง |
| Account ลดเฉพาะเงินลงทุนรอบใหม่ | ผ่าน |
| เพิ่มสินทรัพย์ชื่อใหม่ | ผ่าน |
| ชื่อสินทรัพย์ซ้ำ | Block |
| เขียน Investment ล้มเหลว | Rollback Account ผ่าน |
| PWA Version URLs | ผ่าน Static check |

## 9. สิ่งที่ต้องทดสอบกับ Google Sheet จริง

1. เพิ่ม I1 `item_name` ใน Transactions
2. Deploy v2.4.0 และปิด–เปิด PWA ใหม่
3. เพิ่ม Expense ทดสอบ 1 บาท: เลือกหมวดก่อน แล้วพิมพ์รายการ
4. ตรวจ D = category, I = item_name และ Account ลด 1 บาท
5. ลบ Expense และตรวจ Account กลับเท่าเดิม
6. สร้าง/แก้รายการหมวด `บัตรเครดิต` แล้วตรวจว่าไม่ปรากฏในกราฟสัดส่วน
7. เพิ่ม RMF 1 บาทจาก Account เดิม ตรวจ Account ลด 1 และ RMF เพิ่ม 1
8. เพิ่มชื่อสินทรัพย์ใหม่ 1 บาท ตรวจว่าเกิดแถวใหม่
9. ลบรายการทดสอบและ Reconcile Account

## 10. Deploy

1. สำรอง Google Sheet และ Repository
2. ทำ `TRANSACTIONS_MIGRATION.md`
3. Replace ไฟล์จาก `personal-wealth-v2.4.0.zip` ที่ Root
4. Commit: `feat: add expense categories and investment contributions`
5. รอ GitHub Pages workflow เป็นสีเขียว
6. ปิด PWA เดิม เปิดใหม่ และ Refresh

## 11. Rollback และข้อจำกัด

- ย้อน Code เป็น v2.3.0 ได้ และคงคอลัมน์ `item_name` ไว้ได้
- Code rollback ไม่ย้อนยอด Account ที่ v2.4.0 เขียนแล้ว ต้อง Reconcile จากข้อมูลจริง
- Google Sheets API ไม่มี Atomic transaction ข้ามชีต; ระบบทำ compensating rollback เมื่อเขียนล้มเหลว
- หนึ่งสินทรัพย์ที่รวมในแถวเดิมรองรับหนึ่ง Account ต้นทาง
- ไม่มี Contribution ledger, Sale, Dividend, Fee, Tax, Reinvest หรือราคาตลาดอัตโนมัติ
- Legacy Transactions/Investments ไม่ถูกนำไปปรับ Opening Balance ย้อนหลัง
- ไม่มี Refresh Token และไม่มี Multi-user concurrency control
