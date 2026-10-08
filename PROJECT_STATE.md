# TasuyaWay — Project State

> อัปเดต: 8 ตุลาคม 2569 (2026-10-08), Asia/Bangkok  
> รุ่นพัฒนา: **v2.11.0 — Four-tier Wealth Planning**  
> รุ่นฐานก่อนเริ่มงาน: **v2.10.0 — Financial Foundation**  
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

## 2. การเปลี่ยนแปลง v2.11.0

| งาน | ผลลัพธ์ |
|---|---|
| Wealth Overview | เพิ่มหน้าแรกของเมนูความมั่งคั่ง สรุประบบการเงิน 4 ชั้นโดยไม่สร้างคะแนนรวม |
| ชั้น 1 | รายรับ กระแสเงินสด และอัตราออมเดือนปัจจุบัน |
| ชั้น 2 | งบเทียบยอดจริง ภาระหนี้ และกลุ่มรายจ่ายที่ยังไม่จำแนก |
| ชั้น 3 | จำนวนเดือนเงินฉุกเฉินและเป้าหมายตาม Settings |
| ชั้น 4 | มูลค่าการลงทุนและสัดส่วนการลงทุนต่อทรัพย์สิน |
| งบประมาณ | ตั้งงบรายเดือนแยก 5 กลุ่มรายจ่าย เปรียบเทียบยอดจริง คงเหลือ และอัตราใช้ไป |
| เงินเตรียมรายจ่าย | สร้างเป้าหมายรายปี/รายจ่ายก้อนใหญ่ พร้อมยอดที่ควรเก็บต่อเดือน |
| การติดตามเงินเตรียม | รองรับ Manual หรืออ่าน Account ที่เป็น `SinkingFund` |
| ความเข้ากันได้ | ชีตใหม่เป็น Optional ระหว่าง Migration; การเงินเดิมยังโหลดได้ |
| PWA | Versioned assets และ cache เป็น v2.11.0 |

## 3. Migration และโครงสร้างใหม่

สร้างชีตใหม่ตาม `WEALTH_PLANNING_MIGRATION.md` โดยไม่แทรกคอลัมน์ในชีตเดิม:

| Sheet | Headers ตามลำดับ |
|---|---|
| `Budgets` | `budget_id`, `month`, `expense_group`, `budget_amount`, `note`, `created_at`, `updated_at` |
| `SinkingFunds` | `fund_id`, `fund_name`, `target_amount`, `current_amount`, `due_date`, `progress_source`, `linked_account`, `expense_group`, `status`, `note`, `created_at`, `updated_at` |

ค่าที่รองรับ:

- `Budgets.month`: `YYYY-MM`
- `expense_group`: `Personal`, `Family`, `HomeDebt`, `Health`, `Protection`
- `progress_source`: `Manual`, `Account`
- `status`: `Active`, `Paused`, `Completed`
- `linked_account`: จำเป็นเมื่อใช้ Account และบัญชีนั้นต้องมี `account_role = SinkingFund`

## 4. กติกาการคำนวณ

```text
Budget Remaining = Budget Amount − Actual Expense ของเดือนและกลุ่มเดียวกัน

Sinking Remaining = MAX(Target Amount − Current Amount, 0)
Sinking Monthly Required = Sinking Remaining ÷ จำนวนเดือนที่ยังเก็บได้ถึง Due Date
```

| กรณี | ผลลัพธ์ |
|---|---|
| เดือนนั้นไม่มี Budget | แสดงว่ายังไม่ได้ตั้งงบ และใช้ `monthly_budget` เป็น fallback ใน Warning เดิม |
| Expense ยังไม่มี group | ไม่นำไปปนกับกลุ่มที่ตั้งงบ และแสดงยอด `ยังไม่จัดกลุ่ม` |
| Budget ใช้เกิน | Remaining ติดลบและแสดงสถานะเกินงบ |
| Sinking Fund แบบ Manual | ใช้ `current_amount` |
| Sinking Fund แบบ Account | ใช้ยอดปัจจุบันของ `linked_account` |
| Account หาย/ชื่อซ้ำ/หน้าที่ผิด | ไม่เดายอด; แสดงข้อความให้ตรวจสอบ |
| เลยกำหนดและยังไม่ครบ | แสดง Overdue และยอดคงเหลือ |
| Paused/Completed | ยอดควรเก็บต่อเดือนเป็น 0 |

## 5. หลัก Wealth Overview 4 ชั้น

- ใช้ข้อมูลจริงที่มีในระบบและแสดงแต่ละชั้นแยกกัน
- ไม่มีคะแนนสุขภาพการเงินรวม เพราะเกณฑ์และน้ำหนักยังไม่ได้ตกลง
- ชั้น 2 ใช้งบ กลุ่มรายจ่าย และหนี้ที่มีอยู่จริง; รายละเอียดความคุ้มครอง/ประกันเป็นงานลำดับที่ 5
- ชั้น 4 แสดงการลงทุนปัจจุบัน; เป้าหมายเกษียณ ความเสี่ยง และประเภทสินทรัพย์จริงเป็นงานลำดับที่ 6
- การแสดงสถานะเป็นเครื่องมือทบทวนข้อมูล ไม่ใช่คำแนะนำการลงทุน

## 6. ไฟล์ที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `app.js` | Tabs, Overview, รายการ/ฟอร์ม Budget และ Sinking Fund, warnings |
| `api.js` | Optional-sheet loader, schema validation และ CRUD สองชีตใหม่ |
| `analytics.js` | Budget actual, Sinking Fund plan และ 4-tier view model |
| `index.html` | Tabs/ข้อความใหม่และ Version URL |
| `style.css` | Layout mobile-first ของ Overview, Budget และ Sinking Fund |
| `sw.js` | Cache v2.11.0 |
| `WEALTH_PLANNING_MIGRATION.md` | คู่มือสร้างชีตและทดสอบ |
| `README.md`, `PROJECT_STATE.md`, `CHANGELOG.md` | เอกสารรุ่นใหม่ |

`manifest.json`, `MONTH_END_SNAPSHOT.gs`, OAuth Client ID, Spreadsheet ID และสูตร Transaction/Opening Balance ไม่เปลี่ยน

## 7. ผลทดสอบ

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax: app/api/analytics/sw | ผ่าน |
| Budget รวม/ใช้จริง/คงเหลือ | ผ่าน Mock |
| Budget ซ้ำเดือนและกลุ่มเดียวกัน | ป้องกันผ่าน Mock |
| Expense ไม่จัดกลุ่มและบัตรเครดิตเก่า | ผ่าน Mock |
| Sinking Fund Manual/Account | ผ่าน Mock |
| ตรวจ Account role สำหรับ Sinking Fund | ผ่าน Mock |
| คำนวณยอดที่ควรเก็บต่อเดือน/เลยกำหนด | ผ่าน Mock |
| Four-tier Overview | ผ่าน Mock |
| Transaction/Account effects และ Emergency Fund เดิม | ผ่าน Regression Mock |
| HTML/CSS selectors และ Version markers | ผ่าน Static checks |
| Mobile browser visual smoke | ยังไม่ได้รันใน Container เพราะไม่มี browser binary; ต้องตรวจบน iPhone หลัง Deploy |
| Google Sheet จริง / iPhone PWA | รอผู้ใช้ทดสอบหลัง Deploy |

## 8. ลำดับ Deploy

1. สำรอง Google Sheet และ Repository
2. ทำ `WEALTH_PLANNING_MIGRATION.md`
3. สร้างชีต `Budgets` และ `SinkingFunds` พร้อม Header ที่ตรงทุกตัว
4. Replace ไฟล์จาก `tasuya-way-v2.11.0.zip` ที่ Root
5. Commit: `feat: add four-tier wealth overview and planning`
6. รอ GitHub Pages workflow เป็นสีเขียว
7. ปิด PWA เดิม เปิดใหม่ และ Refresh
8. ตั้ง Budget 1 กลุ่มในเดือนปัจจุบันและตรวจยอดจริง
9. เพิ่ม Sinking Fund 1 รายการและตรวจยอดที่ควรเก็บต่อเดือน

## 9. Rollback และข้อจำกัด

- สามารถย้อน Code เป็น v2.10.0 และคงชีตใหม่ไว้ได้; รุ่นเก่าจะเพิกเฉย
- Code rollback ไม่ลบ Budget หรือ Sinking Fund ที่บันทึกแล้ว
- Google Sheets API ไม่มี Atomic transaction ข้ามชีตและไม่มี Multi-user concurrency control
- Account-linked Sinking Fund อ้างอิงด้วย `account_name` ไม่ใช่ `account_id`
- Account หนึ่งบัญชีเชื่อมได้หนึ่ง Sinking Fund เพื่อป้องกันยอดรวมซ้ำ; หากรวมหลายวัตถุประสงค์ในบัญชีเดียวให้ใช้ Manual
- การตั้ง Budget ไม่กันเงินหรือบล็อก Expense; ใช้เพื่อเปรียบเทียบและเตือน
- ระบบไม่สร้างรายการโอนเงินเข้า Sinking Fund อัตโนมัติ
- ไม่มี Refresh Token; Access Token อยู่ใน `sessionStorage`
