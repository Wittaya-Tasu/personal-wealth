# Personal Wealth — Project State

> อัปเดต: 30 สิงหาคม 2569 (2026-08-30), Asia/Bangkok  
> รุ่นพัฒนา: **v2.3.0 — Account-linked Investments & Spending Analytics**  
> รุ่นที่ผู้ใช้ยืนยันว่า Deploy แล้ว: **v2.2.0**  
> สถานะ v2.3.0: ผ่าน Static/Mock tests; ต้อง Migration Investments, Deploy และทดสอบกับ Google Sheet จริง

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

## 2. การเปลี่ยนแปลง v2.3.0

| งาน | ผลลัพธ์ |
|---|---|
| Investment ใช้เงินจากบัญชี | เพิ่มตัวเลือก `account_from` และช่อง `funded_amount` |
| Cash Flow บนมือถือ | แกน Y แสดงเงินบาทเต็มจำนวน ไม่ใช้ compact notation |
| Cash Flow แกน X | แสดงเฉพาะชื่อเดือน |
| Cash Flow ปี | เพิ่มตัวกรองปี พ.ศ. ข้างตัวกรอง 6/12 เดือน |
| สัดส่วนรายจ่าย | เพิ่มกราฟวงกลมแยกหมวดหมู่ พร้อมเลือกเดือน |
| Allocation | เปลี่ยนหัวข้อเป็น `ทรัพย์สิน`, เอาคำว่า `สินทรัพย์รวม` ออกจากกลางวง |
| ตัวเลข Allocation | เพิ่ม 12px → 30px และแสดงทศนิยม 1 ตำแหน่ง |
| Mobile layout | กราฟวงกลมเรียงแนวตั้งบนหน้าจอกว้างไม่เกิน 520px |
| PWA | Versioned assets และ cache เป็น v2.3.0 |

## 3. โครงสร้าง Google Sheet

| Sheet | Headers |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note`, `account_from`, `funded_amount` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note`, `goal_type`, `progress_source`, `linked_account`, `status` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |

### Migration v2.3.0

เพิ่มต่อท้ายชีต `Investments` เท่านั้น:

| Cell | Header |
|---|---|
| J1 | `account_from` |
| K1 | `funded_amount` |

ข้อมูล Investment เดิมให้ J–K ว่าง ระบบจะถือเป็น Legacy และไม่ปรับ Accounts ย้อนหลัง อ่านขั้นตอนเต็มใน `INVESTMENTS_MIGRATION.md`

## 4. กติกา Account-linked Investment

| การกระทำ | กติกา |
|---|---|
| เพิ่ม Investment ใหม่ | ต้องเลือก Account และ `funded_amount > 0` |
| บันทึกสำเร็จ | ลด `Accounts.balance` ตามเงินลงทุน |
| ยอดบัญชีไม่พอ | ไม่บันทึกและไม่ให้ยอดติดลบ |
| แก้ราคาปัจจุบัน | ไม่เปลี่ยน Account หาก `account_from` และ `funded_amount` เดิม |
| แก้เงินลงทุน/บัญชี | คืนผลเดิมก่อน แล้วใช้ผลใหม่ |
| ลบรายการเชื่อมบัญชี | คืนเงินลงทุนเดิมเข้าบัญชีก่อนลบ |
| Legacy Investment | แก้/ลบโดยไม่ปรับ Opening Balance |
| การเขียน Investment ล้มเหลว | Rollback ยอด Account เป็นค่าก่อนทำรายการ |

Investment เป็นการเปลี่ยนรูปสินทรัพย์ จึงไม่เป็น Income/Expense และไม่เข้ากราฟ Cash Flow หรือสัดส่วนรายจ่าย

Account ที่ Transaction, Goal หรือ Investment อ้างถึงจะเปลี่ยนชื่อหรือลบไม่ได้ ชื่อ `account_name` ต้องไม่ซ้ำ

## 5. กติกากราฟ

### Cash Flow

- ปีในตัวกรองเก็บเป็น ค.ศ. ภายใน แต่แสดงเป็น พ.ศ.
- ตัวเลือกปีมีปีปัจจุบันและปีที่พบใน Transactions
- 12 เดือนแสดง ม.ค.–ธ.ค. ของปีที่เลือก
- 6 เดือนของปีปัจจุบันสิ้นสุดที่เดือนปัจจุบัน
- 6 เดือนของปีก่อนสิ้นสุดที่เดือนธันวาคม
- แกน X ใช้ชื่อเดือนเท่านั้น เช่น `มี.ค.`
- แกน Y ใช้เงินบาทเต็มจำนวน เช่น `฿20,000`

### สัดส่วนรายจ่าย

- ใช้เฉพาะ Transaction ประเภท Expense ของเดือนที่เลือก
- รวมรายการตาม `category`
- เรียงจากยอดมากไปน้อย
- แสดงเปอร์เซ็นต์และจำนวนเงินบาทใน Legend
- Investment ไม่ถูกรวม

### Allocation

- สูตร Allocation เดิมไม่เปลี่ยน
- จำนวนกลางวงใช้ compact currency 1 ตำแหน่ง
- ไม่มีข้อความ `สินทรัพย์รวม` กลางวง

## 6. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `index.html` | ตัวกรองปี, กราฟรายจ่าย, Allocation และ Version URL |
| `style.css` | Mobile chart layout, filters และตัวเลข Allocation 30px |
| `analytics.js` | Cash Flow รายปี, รายการเดือน และสัดส่วนรายจ่าย |
| `api.js` | Investment validation, Account effects, Rollback และ reference protection |
| `app.js` | ฟอร์ม Investment, chart rendering, filters และการลบ Investment |
| `sw.js` | Cache v2.3.0 |
| `README.md` | คู่มือระบบและ Deploy |
| `PROJECT_STATE.md` | สถานะล่าสุด |
| `CHANGELOG.md` | ประวัติ v2.3.0 |
| `INVESTMENTS_MIGRATION.md` | วิธีเพิ่ม J1–K1 |
| `PERSONAL_WEALTH_AGENT_MASTER_PROMPT.md` | Handoff รุ่นล่าสุด |

ไม่แก้ `config.js`, `manifest.json`, Google OAuth Client ID, Spreadsheet ID หรือชื่อชีต

## 7. ผลทดสอบในสภาพแวดล้อมจำลอง

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax: analytics/api/app/sw | ผ่าน |
| Cash Flow รายปีและชื่อเดือนโดยไม่มีปี | ผ่าน |
| รวม Expense ตามหมวดหมู่และเปอร์เซ็นต์ | ผ่าน |
| เพิ่ม Investment → หัก Account | ผ่าน |
| ย้าย Investment จาก Account A → B | ผ่าน |
| แก้เงินลงทุน → ใช้ผลสุทธิ | ผ่าน |
| ลบ Investment → คืน Account | ผ่าน |
| Legacy Investment → ไม่ปรับ Account | ผ่าน |
| ยอดบัญชีไม่พอ | ผ่าน |
| Append Investment ล้มเหลว → Rollback | ผ่าน |
| ขาด Header J–K → Block พร้อมข้อความ | ผ่าน |
| Account ที่ Investment อ้างถึง → Block Rename/Delete | ผ่าน |
| HTML IDs/Versioned assets | ผ่าน |
| Regression Transaction/Goal/Monthly Spending | ผ่าน Static checks |

## 8. สิ่งที่ต้องทดสอบกับ Google Sheet จริง

1. เพิ่ม J1 `account_from` และ K1 `funded_amount`
2. Deploy v2.3.0 และปิด–เปิด PWA ใหม่
3. เพิ่ม Investment ทดสอบ 1 บาทจาก Account ที่เลือก
4. ตรวจ Account ลด 1 บาท และ Cash Flow/กราฟรายจ่ายไม่เปลี่ยน
5. แก้เฉพาะราคาปัจจุบัน ตรวจว่า Account ไม่ลดซ้ำ
6. ลบรายการ ตรวจว่า Account กลับมาเท่าเดิม
7. ทดสอบ Cash Flow 6/12 เดือนและเลือกปี พ.ศ.
8. ทดสอบกราฟสัดส่วนรายจ่ายอย่างน้อยสองเดือน
9. ตรวจ Allocation บน iPhone ว่าตัวเลข 1 ตำแหน่งไม่ล้นวง
10. ทดสอบ Income, Expense, Transfer และ Goal เดิมอย่างละหนึ่งครั้ง

## 9. Deploy

1. สำรอง Google Sheet และ Repository
2. ทำ `INVESTMENTS_MIGRATION.md`
3. Replace ไฟล์จาก `personal-wealth-v2.3.0.zip` ที่ Root
4. Commit: `feat: add account-linked investments and spending charts`
5. รอ GitHub Pages workflow เป็นสีเขียว
6. ปิด PWA เดิม เปิดใหม่ และ Refresh

## 10. Rollback

1. หยุดบันทึก Transaction และ Investment
2. Revert v2.3.0 หรือ Replace Code ด้วย Backup v2.2.0
3. Header J–K คงไว้ได้
4. Code rollback ไม่ย้อนยอด Account ที่ v2.3.0 เขียนแล้ว
5. ตรวจ Investment ที่มี `account_from`/`funded_amount` และ Reconcile Accounts ก่อนใช้งานต่อ

## 11. ข้อจำกัด

- ไม่มี Database transaction แบบ Atomic ข้ามชีต
- Account-linked Investment เป็นเงินต้นต่อหนึ่งแถว ไม่ใช่ประวัติซื้อ–ขายเต็มรูปแบบ
- ยังไม่มี Sale, Dividend, Fee, Tax, Reinvest และ Market Price API
- Investments ยังคงต้องอัปเดต `current_price`/`current_value` เอง
- Legacy Transactions และ Legacy Investments ไม่ปรับ Opening Balance ย้อนหลัง
- ไม่มี Refresh Token และไม่มี Multi-user concurrency control
