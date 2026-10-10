# Changelog

การเปลี่ยนแปลงสำคัญของ TasuyaWay (เดิม Personal Wealth) บันทึกตามแนวทาง [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) และใช้ Semantic Versioning

## [Unreleased]

- ยังไม่มีรายการ

## [2.14.1] - 2026-10-10

- ใช้แม่แบบถังแก้ว 3 มิติจริงแทนถังเวกเตอร์แบบแบน
- วางตัวเลขและ progress จากข้อมูลเดือนที่เลือก และฝังแม่แบบก่อนส่งออก PNG 3840×2160
- จำนวนเงินในภาพไม่มีทศนิยม ไม่เปลี่ยนข้อมูลต้นฉบับ
- ไม่แสดงวันบันทึกสมมติเมื่อไม่มีรายละเอียด Snapshot ย้อนหลัง
- เพิ่มแม่แบบใน Service Worker และเปลี่ยน Cache/version เป็น 2.14.1
- ไม่มี Migration เพิ่มจาก 2.14.0 สูตรรายงานและ Apps Script เดิม

## [2.14.0] - 2026-10-10

- เพิ่มแท็บภาพสรุปรายเดือน 4 ชั้นและดาวน์โหลด PNG 16:9
- เพิ่ม report_json ใน MonthlySnapshots เพื่อเก็บยอดรายงานทั้งเดือนและยอดสะสม ณ วันที่บันทึก
- ใช้สูตร captureMonthlyReport ชุดเดียวกันในเว็บและ Apps Script
- แสดงข้อมูลเดือนเก่าไม่ครบโดยไม่ยืมยอดปัจจุบัน และแยก Live/Manual/MonthEnd
- ตารางประกันแทนการ์ด พร้อมปุ่มและข้อมูลเดิม
- แม่แบบภาพสร้างในเครื่องด้วยข้อมูลจริง ฟอนต์ Sarabun และท่อแยกยอดเดือน/ยอดสะสม

## [2.13.0] - 2026-10-09

- เพิ่ม Dropdown ประเภทรายได้ พร้อมรักษาหมวดหมู่เดิมเมื่อแก้ไข
- เพิ่มสัดส่วนรายรับและเปลี่ยนสัดส่วนรายจ่ายเป็นแท่งแนวนอน 100% ใช้เดือนร่วมกัน
- รวมสุขภาพ/ประกันเฉพาะการแสดงกราฟให้เหลือ 4 กลุ่มหลัก และแสดงรายการยังไม่จัดกลุ่ม
- เปลี่ยนรายการลงทุนเป็นตาราง พร้อมสัดส่วนเงินต้นแท่งแนวนอน 100%
- อัปเดต Service Worker และ URL Static เป็น v2.13.0 ไม่มี Migration ใหม่

## [2.12.0] - 2026-10-09

- เพิ่มรายละเอียด Liabilities G:N, Investments L:T และชีต InsurancePolicies / RetirementPlans
- เงินต้นสะสม principal_amount แยกจาก funded_amount เพื่อไม่ Replay เงินต้นเก่า
- เพิ่ม Auto/Manual risk โดยประกาศเป็นค่าประเมินของแอป ไม่อ้างเป็นคะแนนมาตรฐานผลิตภัณฑ์
- เลือก Principal/Market และปันผล/ดอกเบี้ยรับจริงสะสมได้
- ปรับ Snapshot Apps Script ให้ใช้โหมดมูลค่าเดียวกับหน้าเว็บ
- รักษาค่าเดิมก่อนยืนยันเงินต้น และรักษา Transaction/บัตรเครดิต/งบ/เงินฉุกเฉินเดิม

## [2.11.0] - 2026-10-08

### Added

- หน้า Wealth Overview สรุประบบการเงิน 4 ชั้นจากข้อมูลจริง โดยไม่สร้างคะแนนรวม
- ชีต `Budgets` สำหรับตั้งงบรายเดือนแยกตามกลุ่มรายจ่ายระดับบน
- ชีต `SinkingFunds` สำหรับเงินเตรียมรายจ่ายประจำปีและรายจ่ายก้อนใหญ่
- การคำนวณงบรวม ยอดใช้จริง ยอดคงเหลือ อัตราใช้ไป และคำเตือนเมื่อเกินงบ
- การคำนวณยอดที่ยังต้องเตรียมและยอดที่ควรเก็บต่อเดือนถึงวันครบกำหนด
- การติดตาม Sinking Fund แบบกรอกเองหรืออ่านยอด Account ที่มีหน้าที่ `SinkingFund`
- คู่มือ `WEALTH_PLANNING_MIGRATION.md`

### Changed

- หน้าแรกของเมนูความมั่งคั่งเปลี่ยนเป็น Overview 4 ชั้น โดยยังคง Tab การลงทุน บัญชี ทรัพย์สิน และหนี้เดิม
- คำเตือนงบรวม `monthly_budget` ใช้เป็น fallback เมื่อยังไม่มีงบรายกลุ่มในเดือนนั้น
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.11.0

### Safety

- สองชีตใหม่เป็น Optional ระหว่าง Migration เพื่อไม่ให้หน้าเดิมล้มเมื่อยังสร้างชีตไม่ครบ
- Account-linked Sinking Fund ต้องอ้างถึง Account ที่มี `account_role = SinkingFund`
- ไม่ย้ายเงินหรือสร้าง Transaction อัตโนมัติจาก Budget/Sinking Fund
- ไม่แก้สูตร Transaction, Opening Balance, OAuth, Apps Script หรือข้อมูลเดิม

### Migration

- สร้าง `Budgets!A1:G1` ตาม Header ที่กำหนด
- สร้าง `SinkingFunds!A1:L1` ตาม Header ที่กำหนด
- ไม่ต้องแก้ Header ของชีตเดิม ไม่ต้องแก้ OAuth และไม่ต้องแก้ Apps Script

## [2.10.0] - 2026-10-08

### Added

- Header `account_role` ต่อท้ายชีต Accounts เพื่อกำหนดหน้าที่ของเงินแต่ละบัญชี
- Header `expense_group` และ `is_essential` ต่อท้ายชีต Transactions
- กลุ่มรายจ่ายระดับบน: ส่วนตัว, ครอบครัว, บ้าน รถ และหนี้, สุขภาพ, ประกันและการป้องกัน
- คู่มือ `FINANCIAL_FOUNDATION_MIGRATION.md`

### Changed

- เงินสำรองฉุกเฉินนับเฉพาะ Account ที่กำหนด `account_role = Emergency`
- ค่าใช้จ่ายจำเป็นอัตโนมัติใช้ Expense ที่ระบุ `is_essential = Yes` เฉลี่ย 3 เดือน
- กราฟสัดส่วนรายจ่ายรวมตาม `expense_group` แทนหมวดรายจ่ายย่อย
- หน้าบัญชีแสดงหน้าที่ของแต่ละบัญชี
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.10.0

### Safety

- ไม่สมมติว่าบัญชีเดิมทุกบัญชีเป็นเงินฉุกเฉิน
- ไม่สมมติว่ารายจ่ายเดิมทั้งหมดเป็นรายจ่ายจำเป็น
- ข้อมูลที่ยังจำแนกไม่ครบจะแสดงคำเตือนและ `ยังไม่จัดกลุ่ม`
- เพิ่ม Header ต่อท้ายเท่านั้น และไม่คำนวณ Opening Balance/Transactions เก่าย้อนหลัง

### Migration

- `Accounts!G1 = account_role`
- `Transactions!L1 = expense_group`
- `Transactions!M1 = is_essential`
- ไม่ต้องสร้างชีตใหม่ ไม่ต้องแก้ OAuth และไม่ต้องแก้ Apps Script

## [2.9.0] - 2026-10-08

### Added

- หมวด Todo ใหม่ `โปรเจก`
- หน้า Project Detail สำหรับดู Checklist ย่อยของแต่ละโปรเจก
- เพิ่ม ดาว ติ๊ก แก้ และลบ Todo ย่อย พร้อม Progress bar
- Header `parent_todo_id` ต่อท้ายชีต Todos และคู่มือ `PROJECT_TODOS_MIGRATION.md`

### Changed

- โปรเจกที่ยังไม่เสร็จใช้กติกา Carry-over ไปวันถัดไปเช่นเดียวกับ Todo หลัก
- การลบโปรเจกถามยืนยันจำนวนงานย่อยและลบงานย่อยทั้งหมดจากแถวล่างขึ้นบน
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.9.0

### Fixed

- การสร้างแถวใหม่จะสร้าง ID อัตโนมัติเฉพาะคอลัมน์ ID หลัก ไม่เขียนค่าปลอมลง `parent_todo_id`
- ป้องกัน Todo ย่อยอ้างอิงรายการที่ไม่ใช่โปรเจกหรือซ้อนเกินหนึ่งระดับ

### Migration

- เพิ่ม `parent_todo_id` ที่ `Todos!J1` เท่านั้น
- ไม่ต้องสร้างชีตใหม่ ไม่ต้องแก้ OAuth และไม่ต้องติดตั้ง Apps Script ใหม่

## [2.8.0] - 2026-10-07

### Added

- Todo ที่ยังไม่เสร็จแสดงต่อในวันถัดไปจนกว่าจะติ๊กเสร็จ พร้อมป้าย `ค้างจาก ...`
- ตารางใต้กราฟ Cash Flow แสดง `รายรับ`, `รายจ่าย`, `เงินออม` ตามเดือนและปีชุดเดียวกับกราฟ
- ปุ่มสลับตารางระหว่างเปอร์เซ็นต์และยอดเงินบาท
- ไอคอน PWA ตัวอักษร T สำหรับ TasuyaWay

### Changed

- เปลี่ยนชื่อ WebApp/PWA จาก Personal Wealth เป็น `TasuyaWay`
- Todo carry-over ใช้แถวเดิมและวันเริ่มเดิม ไม่สร้างข้อมูลซ้ำใน Google Sheet
- โหมดเปอร์เซ็นต์ใช้รายรับเป็นฐาน 100%; เงินออม = รายรับ − รายจ่าย
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.8.0

### Fixed

- งานค้างไม่หายจากรายการเมื่อเปลี่ยนไปดูวันถัดไป
- งานที่เสร็จแล้วไม่แสดงเป็นงานค้างในวันหลังจากวันเสร็จ
- ตาราง Cash Flow รองรับเดือนที่เงินออมติดลบ และแสดง `—` เมื่อไม่มีรายรับสำหรับคำนวณเปอร์เซ็นต์

### Migration

- ไม่ต้องเพิ่มหรือเปลี่ยน Header ใน Google Sheet
- ไม่ต้องติดตั้งหรือรัน Apps Script ใหม่

## [2.7.1] - 2026-10-06

### Changed

- รายการ Todo แยกเป็นกลุ่ม `เรื่องงาน` ด้านบนและ `เรื่องส่วนตัว` ด้านล่าง
- แต่ละกลุ่มแสดงจำนวนรายการที่ทำเสร็จเทียบกับรายการทั้งหมด
- ภายในแต่ละกลุ่มยังเรียงงานค้างก่อน รายการติดดาวก่อน และงานที่เสร็จแล้วด้านล่าง
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.7.1

### Migration

- ไม่ต้องเพิ่มหรือเปลี่ยน Header ใน Google Sheet
- ไม่ต้องติดตั้ง Apps Script ใหม่

## [2.7.0] - 2026-10-05

### Added

- Tab `วันนี้` รวม Todo, Habit และขอบคุณวันนี้สำหรับหน้าจอมือถือ
- Todo แยกเรื่องงาน/เรื่องส่วนตัว รองรับดาว ติ๊กเสร็จ ขีดฆ่า แก้ไขและลบ
- Habit ความถี่ Daily, Weekly, Monthly และ Yearly พร้อม HabitLogs แยกตามรอบ
- ชีตใหม่ `Todos`, `Habits`, `HabitLogs` และคู่มือ `TODAY_MIGRATION.md`
- `MONTH_END_SNAPSHOT.gs` และคู่มือติดตั้ง Trigger เพื่อบันทึก Snapshot วันสุดท้ายของเดือนแม้ไม่ได้เปิดแอป
- หมวด Gratitude `ตัวเอง` และ `ประสบการณ์`

### Changed

- เมนูหลัก `ขอบคุณ` เปลี่ยนเป็น `วันนี้` โดยคงข้อมูล Gratitude เดิมทั้งหมด
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.7.0
- Optional sheet loader รองรับฟังก์ชันใหม่โดยไม่ทำให้หน้าการเงินล้มเมื่อยังไม่ได้ Migration

### Fixed

- Snapshot อัตโนมัติใช้ Upsert จึงไม่สร้างแถวซ้ำในเดือนเดียวกัน
- Habit หนึ่งรายการสร้าง Completion ได้เพียงหนึ่งรายการต่อรอบ
- Todo ที่ทำเสร็จคงอยู่ในวันเดิมและสามารถยกเลิกสถานะได้

### Known limitations

- Apps Script time trigger ทำงานในช่วงเวลาประมาณการ ไม่รับประกันเวลาระดับวินาที
- Todo ไม่ย้ายงานค้างไปวันถัดไปอัตโนมัติ
- การเพิ่ม/แก้/ลบแต่ละรายการใช้ Google Sheets API แยกคำสั่งและไม่มี Multi-user concurrency control

## [2.6.0] - 2026-09-19

### Added

- Tab `ขอบคุณวันนี้` ในเมนูหลัก รองรับ iPhone และ Desktop
- บันทึกสิ่งที่อยากขอบคุณวันละ 1–3 เรื่อง
- หมวด คน, สัตว์, สิ่งของ, สถานที่, เหตุการณ์ และอื่น ๆ
- ตัวเลือกวันที่ ปุ่มวันก่อนหน้า/วันถัดไป และประวัติวันที่เคยบันทึก
- ชีตใหม่ `Gratitude` และคู่มือ `GRATITUDE_MIGRATION.md`

### Changed

- รวมความสามารถ Credit Card Liabilities จาก v2.5.0 ไว้ใน ZIP v2.6.0 เพื่อ Deploy ครั้งเดียว
- Bottom Navigation ปรับเป็น 6 ช่อง พร้อม Tab ขอบคุณ
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.6.0

### Fixed

- หากยังไม่มีชีต Gratitude ระบบการเงินยังโหลดและซิงก์ได้ตามปกติ
- การแก้วันเดิมอัปเดต Slot เดิม และการล้างช่องลบเฉพาะ Slot นั้น
- ป้องกันวันที่/Slot/หมวดหมู่ผิดรูปแบบและข้อความเกิน 500 ตัวอักษร

### Known limitations

- การบันทึกหลาย Slot ใช้หลายคำสั่ง Google Sheets API และไม่มี Atomic transaction ข้ามแถว
- ยังไม่มี Reminder, Streak หรือกราฟสถิติ Gratitude ในรุ่นนี้

## [2.5.0] - 2026-09-19

### Added

- บัตรเครดิตใน Liabilities ด้วย `liability_type = CreditCard`
- ช่องทางจ่าย Expense แบบ Account หรือ Credit Card
- ปุ่มจ่ายบัตรแบบเต็มจำนวนหรือระบุยอด พร้อมเลือก Account ต้นทาง
- ปุ่มลบบัตรออกจากระบบพร้อมการยืนยันสองชั้น
- Header `payment_method`, `credit_card` ใน Transactions และ `liability_type` ใน Liabilities
- คู่มือ `CREDIT_CARD_MIGRATION.md`

### Changed

- Expense ผ่านบัตรเพิ่มยอดหนี้ระยะสั้นโดยไม่ลด Account
- การชำระบัตรลดทั้ง Account และยอดหนี้ แต่ไม่ถูกนับเป็น Expense ซ้ำ
- ยอดซื้อผ่านบัตรใช้หมวดรายจ่ายจริง จึงแสดงใน Cash Flow และกราฟสัดส่วนรายจ่าย
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.5.0

### Fixed

- การแก้หรือลบ Expense ผ่านบัตรย้อนยอดหนี้เดิมก่อน
- การลบรายการชำระบัตรคืนผลต่อ Account และยอดหนี้
- ป้องกันการชำระเกินยอดหนี้และป้องกัน Account ติดลบ

### Known limitations

- Google Sheets API ไม่มี Atomic transaction ข้าม Transactions, Accounts และ Liabilities; ระบบมี Rollback แต่หาก Rollback ล้มเหลวต้อง Reconcile ด้วยตนเอง
- การลบบัตรเก็บประวัติ Transaction เดิมไว้ หากจะลบ/แก้รายการบัตรย้อนหลังต้องสร้างบัตรชื่อเดิมกลับมาก่อน

## [2.4.0] - 2026-08-30

### Added

- Header `item_name` ต่อท้ายชีต Transactions เพื่อแยกชื่อรายการออกจากหมวดรายจ่าย
- หมวดรายจ่ายมาตรฐาน 10 หมวด และรองรับหมวดเพิ่มจากชีต Categories ที่มี `type = Expense`
- ฟอร์ม Expense บังคับเลือกหมวดก่อนจึงพิมพ์ชื่อรายการได้
- ฟอร์ม Investment เลือกสินทรัพย์เดิมจากชีต Investments หรือเพิ่มชื่อสินทรัพย์ใหม่
- การเติมยอด Investment เดิมจะเพิ่ม `current_value` และ `funded_amount` ในแถวเดิม
- คู่มือ `TRANSACTIONS_MIGRATION.md`

### Changed

- ฟอร์ม Investment เหลือเฉพาะสินทรัพย์ Account ต้นทาง และยอดเงินลงทุนรอบใหม่
- เอาช่องจำนวนหน่วย ต้นทุนเฉลี่ย ราคาปัจจุบัน มูลค่าปัจจุบัน ประเภท ภาษี และหมายเหตุออกจากหน้าบันทึก Investment
- สินทรัพย์เดิมที่เชื่อม Account แล้วต้องใช้ Account ต้นทางเดิม
- รายการ Expense แสดง `item_name` เป็นชื่อหลักและแสดง `category` เป็นข้อมูลประกอบ
- เปอร์เซ็นต์ในกราฟสัดส่วนรายจ่ายต่ำกว่า 10% แสดงทศนิยม 1 ตำแหน่ง
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.4.0

### Fixed

- ตัด Transaction ที่หมวดเป็น `บัตรเครดิต` ออกจากกราฟสัดส่วนรายจ่ายและตัวหารเปอร์เซ็นต์
- การเติมเงินใน Investment เดิมหัก Account เฉพาะเงินรอบใหม่ ไม่หักมูลค่าเดิมซ้ำ
- รายจ่ายเก่าที่ไม่มี `item_name` ยังลบและย้อนยอด Account ได้

### Known limitations

- การรวมเงินลงทุนในแถวเดิมรองรับ Account ต้นทางหนึ่งบัญชีต่อสินทรัพย์
- ยังไม่มี Investment Ledger สำหรับเก็บทุก Contribution แยกเป็นประวัติ
- การเพิ่มเงินลงทุนถือว่า `current_value` เพิ่มตามยอดเงินรอบใหม่ และยังไม่ติดตามราคาตลาดอัตโนมัติ

## [2.3.0] - 2026-08-30

### Added

- ฟอร์ม Investment เลือก `account_from` และระบุ `funded_amount`
- Account-linked Investment สำหรับการเพิ่ม แก้ และลบ พร้อม Rollback ยอดบัญชีเมื่อการเขียนข้อมูลล้มเหลว
- Header `account_from` และ `funded_amount` ต่อท้ายชีต Investments
- คู่มือ `INVESTMENTS_MIGRATION.md`
- ตัวกรองปี พ.ศ. สำหรับกราฟ Cash Flow
- กราฟสัดส่วนรายจ่ายตามหมวดหมู่ พร้อมตัวกรองเดือน ยอดรวม จำนวนเงิน และเปอร์เซ็นต์

### Changed

- Investment ใหม่หักเงินจาก Account แต่ไม่นับเป็น Expense หรือ Cash Flow
- กราฟ Cash Flow แกน X แสดงชื่อเดือนโดยไม่แสดงปี และแกน Y แสดงจำนวนเงินบาทแบบเต็ม
- เพิ่มพื้นที่ซ้ายและขวาของกราฟ Cash Flow เพื่อไม่ให้ตัวเลขแกนถูกตัดบนมือถือ
- หัวข้อ Allocation เปลี่ยนจาก `ทรัพย์สินอยู่ที่ไหน` เป็น `ทรัพย์สิน`
- เอาคำว่า `สินทรัพย์รวม` ออกจากกลางกราฟ Allocation
- ตัวเลขสินทรัพย์รวมในกราฟ Allocation เพิ่มจาก 12px เป็น 30px และแสดงทศนิยม 1 ตำแหน่ง
- กราฟวงกลมเรียงเป็นแนวตั้งบนหน้าจอกว้างไม่เกิน 520px
- Static Assets และ Service Worker cache เปลี่ยนเป็น v2.3.0

### Fixed

- แก้ตัวเลขแกน Y ของ Cash Flow ที่ถูกย่อและแสดงไม่ครบ เช่นเห็นเพียง `฿1`, `฿8`
- แก้ชื่อเดือนด้านขวาสุดถูกตัดบนหน้าจอมือถือ
- ป้องกันการเปลี่ยนชื่อหรือลบ Account ที่ Investment รุ่นใหม่อ้างถึง
- Investment เดิมก่อน v2.3.0 ไม่ถูกนำมาหักหรือคืนยอด Account ย้อนหลัง

### Known limitations

- Account-linked Investment เป็นการติดตามเงินต้นต่อหนึ่งแถว ไม่ใช่ Investment Ledger ซื้อ–ขายเต็มรูปแบบ
- ยังไม่มีการขาย ปันผล ค่าธรรมเนียม ภาษี และราคาตลาดอัตโนมัติ
- Google Sheets API ยังไม่มี Atomic transaction ข้ามชีต

## [2.2.0] - 2026-07-28

### Added

- Goal แบบ `Financial` เลือกติดตามยอดแบบ Manual หรืออ่านจาก `Accounts.balance`
- Goal แบบ `Milestone` สำหรับเป้าหมายที่ไม่วัดด้วยจำนวนเงิน พร้อมสถานะ Not Started, In Progress และ Completed
- Header `goal_type`, `progress_source`, `linked_account`, `status` ต่อท้ายชีต Goals
- คำเตือนเมื่อ Goals ยังไม่ได้ Migration หรือบัญชีที่ Goal อ้างถึงหาย/ชื่อซ้ำ
- คู่มือ `GOALS_MIGRATION.md`

### Changed

- การ์ดภาระหนี้ต่อรายได้แสดง `0%` และ `ไม่มีภาระหนี้` เมื่อไม่มีหนี้ โดยไม่ต้องสร้างรายการหนี้ยอด 0
- Account ที่ Goal แบบ Account อ้างถึงจะเปลี่ยนชื่อหรือลบไม่ได้จนกว่าจะย้าย/ยกเลิกการอ้างอิง
- หัวข้อ Goals เปลี่ยนเป็น `เป้าหมายการเงินและชีวิต`
- Static Assets ใช้ Version URL `v=2.2.0`
- Service Worker cache เปลี่ยนเป็น `personal-wealth-shell-v2.2.0`

### Fixed

- แยกกรณี “ไม่มีหนี้” ออกจากกรณี “มีค่างวดแต่ยังไม่มีรายรับเดือนนี้”
- Goal เดิมที่ไม่มี Metadata ใหม่ยังคำนวณเป็น Financial + Manual ตามเดิม
- ป้องกัน PWA โหลด `index.html` และ JavaScript คนละรุ่นหลัง Deploy
- การกำหนด class ของ KPI ใช้ Null-safe helper ลดความเสียหายเมื่อไฟล์ Static คนละรุ่น

### Security

- ไม่มี Client Secret, Access Token, Password หรือข้อมูลการเงินจริงเพิ่มใน Repository
- Goal ที่ผูกบัญชีอ่านเฉพาะข้อมูลจาก Google Sheet ภายใต้ OAuth Scope เดิม
- Service Worker ยังคงไม่ Cache Google Sheets API response

### Known limitations

- Goal หนึ่งรายการผูกได้หนึ่ง Account
- Goal อ้างอิง Account ด้วย `account_name` ตามโครงสร้างปัจจุบัน
- Milestone ยังไม่มี Checklist ย่อยหรือเปอร์เซ็นต์งาน
- Google Sheets API ไม่มี Transaction แบบฐานข้อมูลระหว่างหลายชีต

## [2.1.1] - 2026-07-28

### Added

- การ์ด `เงินใช้จ่ายคงเหลือ` บน Dashboard ซึ่งอ่านยอดจริงจาก Account ชื่อ `บัญชีใช้จ่ายรายเดือน`
- ข้อความแสดง Expense เดือนปัจจุบันที่จ่ายจากบัญชีใช้จ่ายรายเดือน
- คำเตือนเมื่อไม่พบบัญชีใช้จ่ายรายเดือนหรือพบชื่อซ้ำ

### Changed

- เปลี่ยนการ์ดแรกจาก `กระแสเงินสดเดือนนี้` เป็น `เงินใช้จ่ายคงเหลือ`
- เปลี่ยน `งบใช้จ่ายคงเหลือ` ในหน้ารายการให้ใช้ `Accounts.balance` จริง แทน `monthly_budget - expense`
- Service Worker cache เปลี่ยนเป็น `personal-wealth-shell-v2.1.1`

### Fixed

- ลดความสับสนระหว่าง Cash Flow สุทธิของเดือนกับจำนวนเงินที่ยังสามารถใช้ได้จริง

### Security

- ไม่มีการเปลี่ยน OAuth, Scope, Google Sheet privacy หรือการจัดเก็บ Token
- ไม่เพิ่ม Secret และไม่ Cache Google Sheets API response

### Known limitations

- ต้องมี Account ชื่อ `บัญชีใช้จ่ายรายเดือน` เพียงรายการเดียว
- ยอดคงเหลือรวมเงินยกมาจากเดือนก่อนและไม่รีเซ็ตอัตโนมัติ
- ข้อความ `ใช้จากบัญชีนี้เดือนนี้` ไม่นับ Expense ที่จ่ายจาก Account อื่น

## [2.1.0] - 2026-07-28

### Added

- ระบบ Account-linked Transactions สำหรับ Transaction ที่สร้างโดย v2.1.0
- ปรับยอด `Accounts.balance` อัตโนมัติสำหรับ Income, Expense และ Transfer
- ย้อนผล Transaction เดิมก่อนแก้ไขหรือลบ
- Rollback ยอด Accounts เมื่อการเพิ่ม แก้ หรือลบแถว Transaction ล้มเหลว
- ตรวจชื่อ Account ซ้ำ ชื่อ Account ที่ไม่มีจริง และจำนวนเงินที่ไม่มากกว่า 0
- ป้องกัน Transfer ไปบัญชีเดียวกับต้นทาง
- ป้องกันยอด Account ติดลบจาก Transaction หรือการย้อนยอด
- ป้องกันการลบ Account และเปลี่ยน `account_name` เมื่อมี Transaction อ้างถึง
- เลือก Account จาก `select` พร้อมแสดงยอดปัจจุบัน
- เลือก `บัญชีใช้จ่ายรายเดือน` เป็นค่าเริ่มต้นของ Expense ใหม่เมื่อพบบัญชีชื่อนี้
- เอกสาร Opening Balance, Cutover, Reconcile, Deploy และ Rollback

### Changed

- Income ต้องเลือก `account_to` และเพิ่มยอดบัญชีปลายทาง
- Expense ต้องเลือก `account_from` และลดยอดบัญชีต้นทาง
- Transfer ต้องเลือกต้นทางและปลายทาง ลดต้นทาง และเพิ่มปลายทาง
- การแก้ Transaction ที่เชื่อม Accounts ใช้ผลสุทธิจากการย้อนรายการเดิมและใช้รายการใหม่
- Transaction เก่าก่อน v2.1.0 คงเป็น Legacy transaction และไม่กระทบ Opening Balance เมื่อแก้หรือลบ
- Quick Reconnect ใช้ OAuth prompt ว่างสำหรับการเชื่อมต่อทั่วไป แทนการบังคับ `consent` ทุกครั้ง
- เมื่อ Token หมดอายุ ระบบล้างเฉพาะ Token ใน session และแสดงปุ่ม `แตะเพื่อเชื่อมต่อ Google`
- Service Worker cache เปลี่ยนเป็น `personal-wealth-shell-v2.1.0`
- Service Worker ตรวจ Static Asset ด้วย URL ภายใต้ GitHub Pages scope `/personal-wealth/`

### Fixed

- แก้ความเสี่ยงการหักยอดซ้ำเมื่อแก้จำนวนเงินหรือเปลี่ยน Account ของ Expense
- แก้การลบ Income, Expense และ Transfer ให้คืนยอด Account ที่เกี่ยวข้อง
- แก้การเชื่อมต่อใหม่ที่ขอ consent ซ้ำเกินจำเป็น
- แก้การตรวจเส้นทาง Static Asset ให้ไม่จับคู่ path แบบกว้างเกินไป
- แก้ Offline fallback ให้ใช้ `index.html` เฉพาะ Navigation request

### Security

- คงการเก็บ Access Token ใน `sessionStorage`; ไม่ใช้ `localStorage`
- ไม่เพิ่ม Client Secret, Refresh Token, Password หรือข้อมูลการเงินจริง
- ไม่เปลี่ยน `GOOGLE_CLIENT_ID` หรือ `SPREADSHEET_ID`
- ไม่เพิ่ม OAuth Scope และไม่เปลี่ยน Google Cloud configuration
- ไม่ Cache Google Sheets API response
- ไม่เปิด Google Apps Script Backend กลับมา
- ลดข้อมูล Error ที่เขียนลง Console เหลือเฉพาะรหัสหรือข้อความสั้น

### Known limitations

- Google Sheets API ไม่มี Database transaction ระหว่าง Values update กับการเพิ่ม แก้ หรือลบแถว
- ระบบพยายาม rollback แต่กรณีเครือข่ายไม่แน่นอนอาจต้อง Reconcile ยอดด้วยตนเอง
- ไม่มีการป้องกันการแก้พร้อมกันจากหลายอุปกรณ์
- Legacy transactions ไม่เชื่อมกับ Accounts
- Investments ยังอัปเดตมูลค่าด้วยตนเองและไม่ถูก Transaction เปลี่ยน
- ไม่มี `InvestmentTransactions`, ระบบซื้อขายหลักทรัพย์ หรือราคาตลาด
- OAuth ไม่มี Refresh Token และอาจต้องกดเชื่อมต่อใหม่เมื่อ Token หมดอายุ
