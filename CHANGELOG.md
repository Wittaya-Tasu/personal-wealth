# Changelog

การเปลี่ยนแปลงสำคัญของ Personal Wealth บันทึกตามแนวทาง [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) และใช้ Semantic Versioning

## [Unreleased]

- ยังไม่มีรายการ

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
