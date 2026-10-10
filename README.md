# TasuyaWay v2.14.0 — Monthly Four-tier Report

เพิ่มภาพสรุปรายเดือนดาวน์โหลด PNG และตารางประกัน
อ่าน [MONTHLY_REPORT_MIGRATION.md](MONTHLY_REPORT_MIGRATION.md) ก่อน Deploy: เพิ่ม MonthlySnapshots.report_json และแทน Apps Script เดิม

## คู่มือรุ่นฐาน v2.13.0

# TasuyaWay v2.13.0 — Monthly Mix & Investment Table

อ่าน [UPDATE_V2.13.0.md](UPDATE_V2.13.0.md) สำหรับสิ่งที่เปลี่ยนและการ Deploy รุ่นนี้

เพิ่ม Dropdown รายได้ กราฟแท่งสัดส่วน 100% รายรับ/รายจ่าย และตารางการลงทุน ไม่ต้องเพิ่ม Header เมื่ออัปเดตจาก v2.12.0

## คู่มือรุ่นฐาน v2.12.0

# TasuyaWay v2.12.0 — Lifetime Wealth Planning

รุ่นนี้เพิ่มรายละเอียดหนี้ ประกัน และเกษียณ พร้อมการลงทุนที่เน้นเงินต้นเป็นหลัก

| ฟังก์ชัน | พฤติกรรม |
|---|---|
| หนี้ | ประเภท เงินกู้เริ่มต้น ดอกเบี้ย วันชำระ วันครบกำหนด วงเงินบัตร และทรัพย์สินที่เกี่ยวข้อง |
| ประกัน | กรมธรรม์รายฉบับ เบี้ยรายปี วันจ่ายเบี้ย ผู้เอาประกัน และสถานะ |
| การลงทุน | เงินต้นแยกจากยอดที่เคยหักบัญชี ระยะเวลา วัตถุประสงค์ ประเภทสินทรัพย์จริง |
| ความเสี่ยง | Auto ตามประเภทสินทรัพย์ หรือ Manual 1–7; เป็นค่าประเมินภายในแอป |
| กำไร/ขาดทุน | เปิดผ่านโหมด Market ได้; ค่าเริ่มต้น Principal ไม่ต้องอัปเดตราคา |
| ปันผล/ดอกเบี้ย | ยอดรับจริงสะสมเลือกกรอก ไม่เพิ่ม Account ซ้ำ |
| เกษียณ | เงินตั้งต้นจากสินทรัพย์ที่เลือกเกษียณ เป้าหมายและช่องว่างตามสมมติฐานที่แก้ได้ |

ต้องทำ [WEALTH_LIFETIME_MIGRATION.md](WEALTH_LIFETIME_MIGRATION.md) และอัปเดต MONTH_END_SNAPSHOT.gs ใน Apps Script เดิมก่อน Deploy

ข้อมูลลงทุนเก่าคงยอดเดิมไว้จนผู้ใช้ยืนยันเงินต้น ห้ามนำ funded_amount หรือ current_value มาเดาเป็นเงินต้นทั้งหมด

## คู่มือรุ่นฐาน v2.11.0 (รายละเอียดเดิม)

# TasuyaWay v2.11.0

**Personal finance and daily life hub** — WebApp/PWA ส่วนตัวสำหรับบันทึกการเงิน เป้าหมายชีวิต Todo, Habit และสิ่งที่อยากขอบคุณ โดยใช้ GitHub Pages เป็น Frontend และอ่าน–เขียน Google Sheet แบบ Private ผ่าน Google OAuth และ Google Sheets API v4 โดยตรง พร้อม Google Apps Script เฉพาะงาน Snapshot ตามเวลา

## ความสามารถหลัก

- Income, Expense และ Transfer ปรับ `Accounts.balance` อัตโนมัติ
- Expense ผ่านบัตรเครดิตเพิ่มหนี้ระยะสั้นและแสดงในกราฟรายเดือน โดยไม่หัก Account ทันที
- จ่ายบัตรเต็มจำนวนหรือระบุยอดได้ ระบบลด Account และหนี้บัตรโดยไม่สร้าง Expense ซ้ำ
- Tab `วันนี้` รวม Todo, Habit และขอบคุณวันนี้ไว้ในหน้าที่เหมาะกับมือถือ
- Todo แสดงแยกกลุ่ม `เรื่องงาน`, `เรื่องส่วนตัว` และ `โปรเจก` พร้อมดาว ติ๊กเสร็จและข้อความขีดฆ่า
- Todo ที่ยังไม่เสร็จจะแสดงต่อในวันถัดไป พร้อมข้อความ `ค้างจาก ...` จนกว่าจะติ๊กเสร็จ โดยไม่สร้างแถวซ้ำ
- แตะชื่อโปรเจกเพื่อเปิดหน้า Checklist ย่อย เพิ่ม ดาว ติ๊ก แก้ และลบงานย่อยได้
- Habit รองรับทุกวัน ทุกสัปดาห์ ทุกเดือน และทุกปี พร้อมประวัติการทำแยกตามรอบ
- ขอบคุณวันนี้บันทึกได้วันละ 1–3 เรื่อง และเพิ่มหมวด `ตัวเอง` กับ `ประสบการณ์`
- Snapshot วันสุดท้ายของเดือนทำงานอัตโนมัติแม้ไม่ได้เปิด WebApp หลังติดตั้ง Trigger หนึ่งครั้ง
- เลือกวันที่ย้อนหลัง แก้ไข ล้างรายการ และเปิดดูประวัติวันที่เคยบันทึกได้
- การแก้หรือลบ Transaction ที่สร้างตั้งแต่ v2.1.0 ย้อนผลเดิมก่อนใช้ผลใหม่
- การ์ด `เงินใช้จ่ายคงเหลือ` อ่านยอดจริงจาก Account ชื่อ `บัญชีใช้จ่ายรายเดือน`
- เมื่อไม่มีหนี้ การ์ด `ภาระหนี้ต่อรายได้` แสดง `0%` และ `ไม่มีภาระหนี้`
- Goal เดิมยังใช้ยอด `current_amount` แบบกรอกเอง
- Goal การเงินเลือกติดตามจาก `Accounts.balance` ได้ เช่น เลือก DIME สำหรับเงินสำรองฉุกเฉิน
- Goal แบบ Milestone ใช้สถานะ `ยังไม่เริ่ม`, `กำลังดำเนินการ`, `สำเร็จแล้ว` โดยไม่สร้างเปอร์เซ็นต์เงินสมมติ
- Expense ต้องเลือกหมวดหมู่ก่อน แล้วจึงพิมพ์ชื่อรายการใน `item_name`
- Account เลือกหน้าที่เป็นเงินทั่วไป บัญชีใช้จ่าย เงินฉุกเฉิน เงินเตรียมรายจ่าย หรือเงินรอลงทุน
- เงินสำรองฉุกเฉินนับเฉพาะ Account ที่มี `account_role = Emergency`
- Expense ต้องเลือกกลุ่มระดับบนและระบุว่าเป็นรายจ่ายจำเป็นหรือไม่
- Investment เลือกสินทรัพย์เดิมจากชีต Investments หรือเพิ่มชื่อใหม่ แล้วกรอกเฉพาะยอดเงินลงทุนรอบนี้
- เงินลงทุนรอบใหม่เพิ่มใน `current_value`/`funded_amount` ของสินทรัพย์เดิมและหัก Account ต้นทาง โดยไม่ถูกนับเป็น Expense
- กราฟ Cash Flow เลือก 6/12 เดือนและปี พ.ศ. ได้ แกน X แสดงชื่อเดือน แกน Y แสดงจำนวนเต็ม
- ตารางสรุปใต้กราฟ Cash Flow แสดงรายรับ รายจ่าย และเงินออมของเดือนชุดเดียวกับกราฟ พร้อมสลับ `%`/`ยอดเงิน`
- กราฟสัดส่วนรายจ่ายรวมตามกลุ่มระดับบนและเลือกเดือนได้
- หน้า Wealth Overview สรุประบบการเงิน 4 ชั้น: กระแสเงินสด, ควบคุมรายจ่ายและหนี้, เงินฉุกเฉิน และลงทุนระยะยาว โดยไม่สร้างคะแนนรวมที่กำกวม
- ตั้งงบรายเดือนแยกตามกลุ่มรายจ่ายระดับบน พร้อมเทียบยอดจริงและยอดคงเหลือ
- เงินเตรียมรายจ่ายประจำปี/รายจ่ายก้อนใหญ่คำนวณยอดที่ควรเก็บต่อเดือนจากเป้าหมาย ยอดสะสม และวันครบกำหนด
- เงินเตรียมรายจ่ายเลือกกรอกยอดเองหรือเชื่อม Account ที่มี `account_role = SinkingFund` ได้
- ป้องกันการเปลี่ยนชื่อหรือลบ Account ที่ Transaction, Goal หรือ Investment ยังอ้างถึง
- Static Asset ใช้ Version URL `v=2.11.0` ลดปัญหา PWA โหลด HTML และ JavaScript คนละรุ่น
- รักษา Quick Reconnect, PWA, iPhone Safe Area และ Theme เดิม

## สถาปัตยกรรม

```text
iPhone / Browser
      |
      +-- Static WebApp / PWA บน GitHub Pages
      +-- Google Identity Services: OAuth Token Model
      +-- Google Sheets API v4
      +-- Google Sheet แบบ Private/Restricted
      +-- Google Apps Script: Month-end Snapshot Trigger
```

- ไม่มี Backend สำหรับการใช้งานหน้าเว็บ; Google Apps Script ใช้เฉพาะ Snapshot ตามเวลา
- ไม่มี Client Secret หรือ Refresh Token
- Access Token เก็บใน `sessionStorage` เท่านั้น
- Service Worker Cache เฉพาะ Static Assets และไม่ Cache Google API response

## โครงสร้างไฟล์

```text
/
├── index.html
├── style.css
├── config.js
├── analytics.js
├── api.js
├── app.js
├── manifest.json
├── sw.js
├── README.md
├── PROJECT_STATE.md
├── CHANGELOG.md
├── GOALS_MIGRATION.md
├── INVESTMENTS_MIGRATION.md
├── TRANSACTIONS_MIGRATION.md
├── CREDIT_CARD_MIGRATION.md
├── GRATITUDE_MIGRATION.md
├── TODAY_MIGRATION.md
├── PROJECT_TODOS_MIGRATION.md
├── FINANCIAL_FOUNDATION_MIGRATION.md
├── WEALTH_PLANNING_MIGRATION.md
├── SNAPSHOT_AUTOMATION.md
├── MONTH_END_SNAPSHOT.gs
└── icons/
```

`script.js` แบบเดิมไม่ถูกใช้งาน

## โครงสร้าง Google Sheet

v2.11.0 สร้างชีต `Budgets` และ `SinkingFunds` ตาม `WEALTH_PLANNING_MIGRATION.md` โดยไม่แก้ Header ของชีตเดิม

| Sheet | Headers ตามลำดับ |
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
| `Budgets` | `budget_id`, `month`, `expense_group`, `budget_amount`, `note`, `created_at`, `updated_at` |
| `SinkingFunds` | `fund_id`, `fund_name`, `target_amount`, `current_amount`, `due_date`, `progress_source`, `linked_account`, `expense_group`, `status`, `note`, `created_at`, `updated_at` |

ก่อน Deploy v2.11.0 ต้องทำ [WEALTH_PLANNING_MIGRATION.md](WEALTH_PLANNING_MIGRATION.md) แล้วจึงตรวจ Migration รุ่นก่อนที่เกี่ยวข้อง

ชื่อ `account_name` ต้องไม่ซ้ำ เพราะ Transactions, Goals และ Investments ยังเก็บชื่อบัญชีตามโครงสร้างเดิม

## ภาระหนี้ต่อรายได้

```text
Debt Service Ratio = ค่างวดหนี้รวมต่อเดือน ÷ รายรับเดือนปัจจุบัน
```

- ถ้า `Liabilities` ไม่มีรายการ หรือยอดหนี้และค่างวดรวมเป็น 0 จะแสดง `0%` และ `ไม่มีภาระหนี้`
- ไม่ต้องสร้างรายการหนี้ชื่อ “ไม่มีหนี้” หรือรายการยอด 0
- ถ้ามีหนี้และค่างวด แต่เดือนปัจจุบันยังไม่มี Income จะแสดง `—` เพราะยังไม่มีตัวหาร พร้อมแสดงค่างวดจริง
- ถ้ามียอดหนี้แต่ค่างวดเป็น 0 อัตราภาระหนี้จะแสดง `0%` แต่รายการหนี้ยังคงอยู่ในหน้าความมั่งคั่ง

## เป้าหมายการเงินและเป้าหมายชีวิต

แนวทางวางแผนการเงินไม่ได้มีเพียงการสะสมเงิน เป้าหมายในระบบแบ่งเป็น 2 รูปแบบ:

| รูปแบบ | เหมาะกับ | วิธีติดตาม |
|---|---|---|
| เป้าหมายการเงิน | เงินสำรองฉุกเฉิน เกษียณ บ้าน การศึกษา ท่องเที่ยว ลดหนี้ | กรอกยอดสะสมเอง หรืออ่านยอดจาก Account |
| เป้าหมายชีวิต / Milestone | จัดทำพินัยกรรม ทบทวนประกัน พัฒนาทักษะ ตรวจสุขภาพ วางแผนภาษี | สถานะ ยังไม่เริ่ม / กำลังดำเนินการ / สำเร็จแล้ว |

หมวดเป้าหมายที่ใช้ในการวางแผนสากลมักครอบคลุม:

- สภาพคล่องและเงินสำรองฉุกเฉิน
- เกษียณและอิสรภาพทางการเงิน
- การลดหนี้
- บ้านและทรัพย์สินสำคัญ
- การศึกษาและพัฒนาทักษะ
- สุขภาพและความคุ้มครอง
- ครอบครัวและผู้พึ่งพิง
- ภาษี เอกสารสำคัญ และมรดก
- ประสบการณ์และคุณภาพชีวิต

### Goal แบบกรอกยอดเอง

1. เลือก `เป้าหมายการเงิน`
2. ใส่เงินเป้าหมาย
3. เลือก `กรอกยอดสะสมเอง`
4. อัปเดตช่อง `สะสมแล้ว` ตามต้องการ

### Goal ที่ผูกกับ Account

1. เลือก `เป้าหมายการเงิน`
2. ใส่เงินเป้าหมาย
3. เลือก `ยอดคงเหลือในบัญชี`
4. เลือก Account เช่น `DIME`

ระบบใช้ `Accounts.balance` ปัจจุบันของ DIME เป็นยอดสะสมในการแสดงผล โดยไม่เขียนทับยอด Account และไม่ใช้ `current_amount` ในการคำนวณขณะยังผูกบัญชีอยู่

ตัวอย่าง:

```text
ชื่อ: เงินสำรองฉุกเฉิน
เงินเป้าหมาย: 600,000
ติดตามจาก: ยอดคงเหลือในบัญชี
บัญชีอ้างอิง: DIME
```

ถ้า DIME มี 150,000 บาท ระบบแสดงความคืบหน้า 25%

### Goal แบบ Milestone

เลือก `เป้าหมายชีวิต / Milestone` แล้วระบุสถานะและกำหนดวัน เช่น:

- จัดทำพินัยกรรม — กำลังดำเนินการ
- ทบทวนความคุ้มครองประกันประจำปี — ยังไม่เริ่ม
- เรียนหลักสูตรการลงทุนให้จบ — สำเร็จแล้ว

ระบบไม่แปลง Milestone เป็นจำนวนเงินหรือเปอร์เซ็นต์สมมติ

## Opening Balance และ Account-linked Transactions

ยอดใน `Accounts` ขณะเริ่มใช้ v2.1.0 ถือเป็น Opening Balance

- ระบบไม่อ่าน Transactions เก่าเพื่อคำนวณยอด Accounts ย้อนหลัง
- Transaction ใหม่ตั้งแต่ v2.1.0 มี `tx_id` ขึ้นต้น `v21-`
- Legacy transaction ไม่ปรับ Opening Balance เมื่อแก้หรือลบ
- Income เพิ่ม `account_to`
- Expense ลด `account_from`
- Transfer ลดต้นทางและเพิ่มปลายทาง โดยไม่นับเป็น Income/Expense
- ถ้ายอดต้นทางไม่พอ ระบบไม่บันทึก

การเติมงบรายเดือนให้ใช้ Transfer จากบัญชีหลักไป `บัญชีใช้จ่ายรายเดือน`

## บัตรเครดิตและหนี้ระยะสั้น

| เหตุการณ์ | Accounts | Liabilities | Cash Flow / กราฟรายจ่าย |
|---|---:|---:|---|
| ซื้อของผ่านบัตร | ไม่เปลี่ยน | หนี้บัตรเพิ่ม | นับเป็น Expense ในเดือนที่ซื้อ |
| จ่ายบัตรบางส่วน/เต็มจำนวน | บัญชีต้นทางลด | หนี้บัตรลด | ไม่นับเป็น Expense ซ้ำ |
| ลบ Expense ผ่านบัตร | ไม่เปลี่ยน | ย้อนหนี้จากรายการนั้น | Expense หายจากกราฟ |
| ลบรายการชำระบัตร | คืนยอดบัญชี | คืนยอดหนี้ | Cash Flow ไม่เปลี่ยน |

- สร้างบัตรในเมนูหนี้สินโดยเลือกประเภท `บัตรเครดิต (หนี้ระยะสั้น)`
- Expense ต้องเลือก `ช่องทางการจ่าย = บัตรเครดิต` และเลือกชื่อบัตร
- ปุ่ม `จ่ายบัตร` รองรับเต็มจำนวนหรือระบุยอด และไม่อนุญาตให้จ่ายเกินหนี้/ยอดบัญชี
- ปุ่ม `ลบบัตร` ลบแถวบัตรและยอดหนี้หลังยืนยันสองชั้น แต่คงประวัติ Expense เพื่อให้กราฟย้อนหลังครบ
- หากลบบัตรแล้วต้องแก้หรือลบ Transaction เก่าที่อ้างถึงบัตร ให้สร้างบัตรชื่อเดิมก่อน

## ขอบคุณวันนี้

ส่วน `ขอบคุณวันนี้` อยู่ใน Tab `วันนี้` และแยกจากระบบการเงินโดยสมบูรณ์

| ความสามารถ | กติกา |
|---|---|
| จำนวนต่อวัน | สูงสุด 3 เรื่อง และบันทึกก่อนได้ตั้งแต่ 1 เรื่อง |
| หมวดหมู่ | คน, ตัวเอง, สัตว์, สิ่งของ, สถานที่, เหตุการณ์, ประสบการณ์, อื่น ๆ |
| วันที่ | ค่าเริ่มต้นเป็นวันนี้ และเลือกย้อนหลัง/วันอื่นได้ |
| แก้ไข | เปิดวันที่เดิมแล้วแก้ข้อความหรือหมวด จากนั้นบันทึก |
| ลบ | ล้างช่องที่ต้องการแล้วกดบันทึก |
| ประวัติ | เรียงวันที่ล่าสุดก่อน แตะเพื่อเปิดบันทึกวันนั้น |

หนึ่งเรื่องเก็บหนึ่งแถวในชีต Gratitude โดยใช้ `date + slot` เป็นตำแหน่งของเรื่อง ระบบไม่ส่งข้อมูลนี้เข้า Analytics และไม่เปลี่ยนยอดทางการเงิน

## Todo และ Habit

- Todo ผูกกับวันที่ แยก `เรื่องงาน`, `เรื่องส่วนตัว` และ `โปรเจก`
- ดาวเป็นเครื่องหมายความสำคัญ; ติ๊กแล้วขีดฆ่าและเอาติ๊กออกได้
- งานค้างจะแสดงต่อในวันที่เลือกซึ่งอยู่หลังวันเริ่มงาน จนกว่าจะติ๊กเสร็จ โดยยังเก็บ `date` เดิมไว้และไม่สร้างรายการซ้ำ
- เมื่อติ๊กเสร็จ งานจะแสดงเป็นงานเสร็จในวันนั้น และจะไม่แสดงในวันหลังจากวันเสร็จ
- โปรเจกหลักเก็บ `parent_todo_id` ว่าง ส่วนงานย่อยเก็บ `todo_id` ของโปรเจกใน `parent_todo_id`
- ระบบรองรับงานย่อยหนึ่งระดับ; การลบโปรเจกจะถามยืนยันและลบงานย่อยของโปรเจกนั้นด้วย
- Habit ใช้รอบ Daily, Weekly (จันทร์–อาทิตย์), Monthly และ Yearly
- หนึ่ง Habit มีได้หนึ่งสถานะเสร็จต่อหนึ่งรอบ และปุ่ม `พัก` จะไม่ลบประวัติเดิม

## Snapshot สิ้นเดือนอัตโนมัติ

ติดตั้ง `MONTH_END_SNAPSHOT.gs` ตาม `SNAPSHOT_AUTOMATION.md` หนึ่งครั้ง Script จะตรวจทุกวันประมาณ 23:30 น. ตามเวลาไทย และ Upsert `MonthlySnapshots` เฉพาะวันสุดท้ายของเดือน ปุ่ม Snapshot แบบเดิมยังคงใช้เป็นทางเลือกสำรอง

## หมวดหมู่และชื่อรายการรายจ่าย

- Expense ใหม่ต้องเลือก `expense_group` ระดับบนและ `is_essential` ก่อนบันทึก
- Expense ใหม่ต้องเลือก `category` ก่อน จึงจะพิมพ์ `item_name` ได้
- หมวดมาตรฐานในแอป: อาหาร, เครื่องดื่ม, หนังสือ, ทำบุญ, ของใช้ส่วนตัว, ค่าเดินทาง, ครอบครัว, สุขภาพ, อิเล็กทรอนิกส์ และ อื่น ๆ
- เพิ่มหมวดเองได้ในชีต `Categories` โดยระบุ `type` เป็น `Expense`
- กราฟรวมตาม `expense_group`; หมวดย่อยยังเก็บใน `category` และชื่อร้านหรือรายละเอียดเก็บใน `item_name`
- การชำระบัตรเป็น `CreditCardPayment` จึงไม่ถูกนับเป็น Expense ซ้ำ ส่วนยอดซื้อผ่านบัตรยังแสดงในกลุ่มรายจ่ายที่เลือก
- Expense เก่าที่ `category = บัตรเครดิต` ยังถูกตัดออกตามกติกาเดิมเพื่อป้องกันยอดซ้ำ
- เปอร์เซ็นต์ต่ำกว่า 10% แสดงทศนิยม 1 ตำแหน่ง ส่วนตั้งแต่ 10% ขึ้นไปแสดงจำนวนเต็ม

## การเพิ่ม แก้ไข และลบ Account

- ชื่อ Account ต้องไม่ซ้ำ
- เปลี่ยนชื่อหรือลบ Account ไม่ได้เมื่อ Transaction, Goal แบบ Account หรือ Investment รุ่นใหม่ยังอ้างถึง
- หากต้องการเปลี่ยนชื่อ ให้ย้ายการอ้างอิงของ Goal/Investment ก่อน
- แก้ `balance` โดยตรงได้เพื่อ Reconcile และไม่กระตุ้น Transaction automation

## Reconcile กับยอดธนาคารจริง

1. เปิดยอดจริงจากธนาคาร
2. ไปที่ `ความมั่งคั่ง > บัญชีเงิน`
3. แก้ `ยอดคงเหลือ` ให้ตรงกับยอดจริง
4. ระบุเหตุผลใน `note`
5. บันทึกและกด Refresh

อย่าสร้าง Income/Expense ปลอมเพื่อแก้ Opening Balance หรือความคลาดเคลื่อน

## Net Worth และ Investments

```text
Net Worth = Accounts ที่เลือกให้นับ + Investments + Assets - Liabilities
```

- ผู้ใช้ย้ายเงินสดออกจาก Investments ไป Account แล้ว
- ตั้งค่า `include_accounts_in_net_worth = true` แล้ว
- ฟอร์มลงทุนแสดงเฉพาะสินทรัพย์ Account ต้นทาง และยอดเงินลงทุนรอบใหม่
- เลือกสินทรัพย์เดิม เช่น RMF แล้วระบบเพิ่มยอดรอบใหม่ในแถวเดิม
- หากไม่มีชื่อในรายการ ให้เลือก `เพิ่มชื่อสินทรัพย์ใหม่`
- สินทรัพย์เดิมที่เชื่อม Account แล้วต้องใช้ Account ต้นทางเดิม เพื่อรักษาประวัติการหักและคืนยอด
- `funded_amount` คือเงินต้นที่หักจาก Account ส่วน `current_value` คือมูลค่าปัจจุบัน สองช่องนี้ไม่ควรถูกใช้แทนกัน
- การลงทุนไม่ถูกนับเป็น Expense หรือ Cash Flow
- ไม่มี `InvestmentTransactions` สำหรับประวัติซื้อ–ขาย และไม่ดึงราคาตลาดอัตโนมัติ
- สูตรเงินฉุกเฉินใช้เฉพาะยอด Account ที่กำหนด `account_role = Emergency`

## เงินสำรองฉุกเฉินและรายจ่ายจำเป็น

```text
เงินฉุกเฉิน = ผลรวม Accounts.balance ที่ account_role = Emergency
ค่าใช้จ่ายจำเป็นต่อเดือน = ค่าเฉลี่ย 3 เดือนของ Expense ที่ is_essential = Yes
จำนวนเดือนเงินฉุกเฉิน = เงินฉุกเฉิน ÷ ค่าใช้จ่ายจำเป็นต่อเดือน
```

- หากกรอก `essential_expense_override` ใน Settings ระบบใช้ค่าที่กรอกแทนค่าเฉลี่ย Transactions
- บัญชีทั่วไป บัญชีใช้จ่าย เงินรอลงทุน และ Investments ไม่ถูกนับเป็นเงินฉุกเฉิน
- หากข้อมูลรายจ่าย 3 เดือนล่าสุดยังจำแนกไม่ครบ ระบบจะแสดงคำเตือน
- กราฟสัดส่วนรายจ่ายรวมตาม `expense_group`; รายการเดิมที่ยังว่างรวมอยู่ใน `ยังไม่จัดกลุ่ม`

## ตารางรายรับ รายจ่าย และเงินออม

ตารางใต้กราฟ Cash Flow ใช้ปีและช่วง 6/12 เดือนเดียวกับกราฟ โดยคำนวณแต่ละเดือนดังนี้:

```text
รายรับ = 100%
รายจ่าย (%) = รายจ่าย ÷ รายรับ
เงินออม = รายรับ − รายจ่าย
เงินออม (%) = เงินออม ÷ รายรับ
```

- ปุ่ม `%` แสดงสัดส่วนเทียบรายรับของเดือนนั้น
- ปุ่ม `ยอดเงิน` แสดงเงินบาทเต็มจำนวน
- เงินออมติดลบหมายถึงรายจ่ายมากกว่ารายรับ
- เดือนที่ไม่มีรายรับจะแสดง `—` ในโหมดเปอร์เซ็นต์ เพราะไม่มีฐานสำหรับหาร แต่ยังดูยอดจริงได้ในโหมด `ยอดเงิน`

## Wealth Overview 4 ชั้น

หน้าแรกของเมนู `ความมั่งคั่ง` สรุปข้อมูลจริงจากระบบเป็น 4 ชั้น โดยไม่รวมเป็นคะแนนเดียว:

| ชั้น | สิ่งที่แสดง | แหล่งข้อมูลหลัก |
|---|---|---|
| 1 กระแสเงินสด | รายรับ กระแสเงินสด และอัตราออมเดือนนี้ | Transactions |
| 2 ควบคุมรายจ่ายและหนี้ | งบเทียบยอดจริง และภาระหนี้ต่อรายได้ | Budgets, Transactions, Liabilities |
| 3 เงินสำรองและความพร้อม | จำนวนเดือนเงินฉุกเฉินและเป้าหมาย | Accounts, รายจ่ายจำเป็น, Settings |
| 4 ลงทุนระยะยาว | มูลค่าการลงทุนและสัดส่วนต่อทรัพย์สิน | Investments, Assets, Accounts |

สถานะในแต่ละชั้นเป็นตัวช่วยชี้จุดที่ควรตรวจ ไม่ใช่คำแนะนำการลงทุนหรือคะแนนสุขภาพการเงินสำเร็จรูป รายละเอียดประกันจะเพิ่มในลำดับพัฒนาที่ 5 และรายละเอียดเกษียณ/ความเสี่ยงจะเพิ่มในลำดับที่ 6

## งบประมาณรายเดือน

- ตั้งงบแยกตาม `expense_group` และเดือนรูปแบบ `YYYY-MM`
- หนึ่งเดือนมีงบได้หนึ่งแถวต่อหนึ่งกลุ่ม เพื่อป้องกันยอดซ้ำ
- ยอดใช้จริงนับ Expense ของเดือนและกลุ่มเดียวกัน; รายการชำระบัตรไม่ถูกนับซ้ำ
- ระบบแสดงงบรวม ใช้จริง คงเหลือ และอัตราใช้ไป พร้อมเตือนเมื่อเกินงบ
- `monthly_budget` ใน Settings ยังเป็นงบรวมแบบเดิม และใช้เป็น fallback เมื่อเดือนนั้นยังไม่มีงบรายกลุ่ม

## เงินเตรียมรายจ่ายประจำปี

```text
ยอดที่ยังต้องเตรียม = เป้าหมาย − ยอดสะสม
ควรเก็บต่อเดือน = ยอดที่ยังต้องเตรียม ÷ จำนวนเดือนถึงวันครบกำหนด
```

- ตัวอย่าง: ประกันรายปี ภาษี ท่องเที่ยว การศึกษา หรือค่าซ่อมใหญ่
- แบบ `Manual` ใช้ `current_amount` ที่กรอกเอง
- แบบ `Account` อ่านยอดจาก Account ที่มี `account_role = SinkingFund`; หนึ่งบัญชีเชื่อมได้หนึ่งกองและระบบไม่ย้ายเงินให้เอง
- สถานะมี `Active`, `Paused`, `Completed`; รายการพักหรือสำเร็จแล้วไม่คำนวณยอดที่ควรเก็บต่อเดือน
- หากเลยกำหนดแล้วยังไม่ครบ ระบบแสดงเตือนให้ปรับแผนหรือวันครบกำหนด

## OAuth และ Quick Reconnect

- การเชื่อมต่อเกิดจากการกดปุ่มของผู้ใช้
- ใช้ `prompt` ว่างในการเชื่อมต่อทั่วไปเพื่อลด consent ซ้ำ
- เมื่อ Token หมดอายุจะแสดง `แตะเพื่อเชื่อมต่อ Google`
- ไม่มี Refresh Token และไม่มี PIN แทน Google OAuth
- ไม่ต้องเปลี่ยน Google Cloud OAuth configuration สำหรับ v2.11.0

## ความปลอดภัย

- Google Sheet ต้องเป็น Private/Restricted
- ห้ามใส่ Client Secret, Access Token, Password หรือข้อมูลการเงินจริงใน Repository
- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` ไม่เปลี่ยน
- Service Worker ไม่ Cache Google Sheets API
- Apps Script สำหรับ Snapshot ต้องผูกกับ Google Sheet นี้และไม่ควรเผยแพร่เป็น Web App
- Goal ที่ผูกบัญชีเป็นเพียงการอ่านยอดจากข้อมูลที่ OAuth อนุญาตอยู่แล้ว

## วิธี Deploy

1. สำรอง Google Sheet และ Repository รุ่นปัจจุบัน
2. ทำ `WEALTH_PLANNING_MIGRATION.md`: สร้างชีต Budgets และ SinkingFunds พร้อม Header ตามลำดับ
3. ตรวจว่า Migration v2.10.0 ของ Accounts/Transactions ยังครบ
4. ตรวจ Migration ชีต Goals, Investments และบัตรเครดิตตามคู่มือเดิม
5. ตรวจชีต Gratitude/Todos/Habits และ Apps Script ที่ติดตั้งไว้แล้ว
6. ดาวน์โหลด `tasuya-way-v2.11.0.zip`
7. แตก ZIP แล้ว Replace ไฟล์ใน Root ของ Repository
8. Commit:

```text
feat: add four-tier wealth overview and planning
```

9. รอ GitHub Actions `pages build and deployment` เป็นสีเขียว
10. ปิด WebApp/PWA ทุกหน้าต่าง แล้วเปิดใหม่
11. กด Refresh แล้วทดสอบงบ 1 รายการและเงินเตรียม 1 รายการ

## วิธี Rollback

1. หยุดบันทึก Transaction และ Investment ชั่วคราว
2. Revert Commit v2.11.0 หรือ Replace Code ด้วย Backup รุ่นที่ใช้งานอยู่ก่อน Deploy
3. ชีต Budgets และ SinkingFunds สามารถคงไว้ได้ เพราะ Code เก่าจะเพิกเฉย
4. รอ Deploy และเปิดแอปใหม่

Rollback Code ไม่ย้อนยอด Accounts, Liabilities หรือแถว Gratitude ที่เขียนแล้ว ต้อง Reconcile ยอดจริงก่อนใช้งานต่อ

## การแก้ปัญหา

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| Goal รุ่นใหม่บันทึกไม่ได้ | เพิ่ม Header `goal_type`, `progress_source`, `linked_account`, `status` ต่อท้าย Goals |
| Goal ผูกบัญชีแสดงตรวจสอบบัญชี | ตรวจ `linked_account` และชื่อ Account; ชื่อต้องไม่ซ้ำ |
| เปลี่ยนชื่อ/ลบ Account ไม่ได้ | มี Transaction, Goal หรือ Investment อ้างถึงบัญชี |
| บันทึก Investment ไม่ได้ | เพิ่ม Header `account_from`, `funded_amount` ต่อท้าย Investments และตรวจยอด Account |
| บันทึก/แก้บัญชีไม่ได้ | เพิ่ม `account_role` ที่ Accounts!G1 และเลือกหน้าที่ของบัญชี |
| บันทึกรายจ่ายไม่ได้ | เพิ่ม `expense_group` ที่ Transactions!L1 และ `is_essential` ที่ M1 แล้วกรอกข้อมูลให้ครบ |
| ยอด Account ลดหลังลงทุน | เป็นผลปกติของ Investment ใหม่ และไม่ถูกนับเป็น Expense |
| กราฟขึ้น `ยังไม่จัดกลุ่ม` | Expense เดิมยังไม่มีค่า `expense_group` |
| เงินฉุกเฉินเป็น 0 | ยังไม่มี Account ที่กำหนด `account_role = Emergency` |
| เงินฉุกเฉินเป็น `—` เดือน | ยังไม่มีค่าใช้จ่ายจำเป็นที่คำนวณได้ และไม่ได้ตั้งค่า override |
| เมนูงบประมาณบันทึกไม่ได้ | สร้างชีต `Budgets` และตรวจ Header A1:G1 ตามคู่มือ |
| เมนูเงินเตรียมบันทึกไม่ได้ | สร้างชีต `SinkingFunds` และตรวจ Header A1:L1 ตามคู่มือ |
| เงินเตรียมแบบ Account เลือกบัญชีไม่ได้ | กำหนด Account นั้นเป็น `account_role = SinkingFund` ก่อน |
| งบจริงเป็น 0 หรือมี `ยังไม่จัดกลุ่ม` | ตรวจ `month` ของงบและเติม `expense_group` ใน Expense เดิม |
| ภาระหนี้แสดง `—` | มีค่างวดแต่ยังไม่มี Income เดือนปัจจุบัน |
| หน้าเว็บยังเป็นรุ่นเก่า | รอ Deploy, ปิด PWA แล้วเปิดใหม่ หรือ Clear site data |
| สิทธิ์หมดอายุ | กด `แตะเพื่อเชื่อมต่อ Google` |
| แจ้ง rollback ไม่สำเร็จ | หยุดทำรายการและ Reconcile Accounts ที่เกี่ยวข้อง |

## ข้อจำกัด

- Google Sheets API ไม่มี Database transaction ข้ามชีต
- ไม่มีระบบหลายผู้ใช้หรือป้องกันการแก้พร้อมกันหลายอุปกรณ์
- Goal ผูกบัญชีอ้างอิงด้วย `account_name` ไม่ใช่ `account_id`
- Goal หนึ่งรายการผูกได้หนึ่ง Account
- Milestone มีสถานะ 3 ระดับและไม่มีรายการงานย่อย
- Legacy transactions ไม่เชื่อม Accounts
- การเติมเงินลงทุนเพิ่ม `current_value` ตามเงินรอบใหม่ แต่ยังไม่มีราคาตลาดอัตโนมัติ
- Account-linked Investment ยังไม่ใช่ Investment Ledger ซื้อ–ขายเต็มรูปแบบ
- ไม่มี Refresh Token

## เอกสารอ้างอิง

- Google Identity Services — Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Sheets API — JavaScript quickstart: https://developers.google.com/workspace/sheets/api/quickstart/js
