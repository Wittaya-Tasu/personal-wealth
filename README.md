# Personal Wealth v2.6.0

**Credit Card Liabilities + Daily Gratitude** — WebApp/PWA ส่วนตัวสำหรับบันทึกการเงิน เป้าหมายชีวิต และสิ่งที่อยากขอบคุณในแต่ละวัน โดยใช้ GitHub Pages เป็น Frontend และอ่าน–เขียน Google Sheet แบบ Private ผ่าน Google OAuth และ Google Sheets API v4 โดยตรง

## ความสามารถหลัก

- Income, Expense และ Transfer ปรับ `Accounts.balance` อัตโนมัติ
- Expense ผ่านบัตรเครดิตเพิ่มหนี้ระยะสั้นและแสดงในกราฟรายเดือน โดยไม่หัก Account ทันที
- จ่ายบัตรเต็มจำนวนหรือระบุยอดได้ ระบบลด Account และหนี้บัตรโดยไม่สร้าง Expense ซ้ำ
- Tab `ขอบคุณวันนี้` บันทึกได้วันละ 1–3 เรื่อง แยกหมวด คน สัตว์ สิ่งของ สถานที่ เหตุการณ์ และอื่น ๆ
- เลือกวันที่ย้อนหลัง แก้ไข ล้างรายการ และเปิดดูประวัติวันที่เคยบันทึกได้
- การแก้หรือลบ Transaction ที่สร้างตั้งแต่ v2.1.0 ย้อนผลเดิมก่อนใช้ผลใหม่
- การ์ด `เงินใช้จ่ายคงเหลือ` อ่านยอดจริงจาก Account ชื่อ `บัญชีใช้จ่ายรายเดือน`
- เมื่อไม่มีหนี้ การ์ด `ภาระหนี้ต่อรายได้` แสดง `0%` และ `ไม่มีภาระหนี้`
- Goal เดิมยังใช้ยอด `current_amount` แบบกรอกเอง
- Goal การเงินเลือกติดตามจาก `Accounts.balance` ได้ เช่น เลือก DIME สำหรับเงินสำรองฉุกเฉิน
- Goal แบบ Milestone ใช้สถานะ `ยังไม่เริ่ม`, `กำลังดำเนินการ`, `สำเร็จแล้ว` โดยไม่สร้างเปอร์เซ็นต์เงินสมมติ
- Expense ต้องเลือกหมวดหมู่ก่อน แล้วจึงพิมพ์ชื่อรายการใน `item_name`
- Investment เลือกสินทรัพย์เดิมจากชีต Investments หรือเพิ่มชื่อใหม่ แล้วกรอกเฉพาะยอดเงินลงทุนรอบนี้
- เงินลงทุนรอบใหม่เพิ่มใน `current_value`/`funded_amount` ของสินทรัพย์เดิมและหัก Account ต้นทาง โดยไม่ถูกนับเป็น Expense
- กราฟ Cash Flow เลือก 6/12 เดือนและปี พ.ศ. ได้ แกน X แสดงชื่อเดือน แกน Y แสดงจำนวนเต็ม
- กราฟสัดส่วนรายจ่ายแยกตามหมวดหมู่และเลือกเดือนได้ โดยไม่นับหมวด `บัตรเครดิต`
- ป้องกันการเปลี่ยนชื่อหรือลบ Account ที่ Transaction, Goal หรือ Investment ยังอ้างถึง
- Static Asset ใช้ Version URL `v=2.6.0` ลดปัญหา PWA โหลด HTML และ JavaScript คนละรุ่น
- รักษา Quick Reconnect, PWA, iPhone Safe Area และ Theme เดิม

## สถาปัตยกรรม

```text
iPhone / Browser
      |
      +-- Static WebApp / PWA บน GitHub Pages
      +-- Google Identity Services: OAuth Token Model
      +-- Google Sheets API v4
      +-- Google Sheet แบบ Private/Restricted
```

- ไม่มี Backend ของแอปและไม่ใช้ Google Apps Script
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
└── icons/
```

`script.js` แบบเดิมไม่ถูกใช้งาน

## โครงสร้าง Google Sheet

v2.6.0 รวม Migration บัตรเครดิต v2.5.0 และเพิ่มชีต Gratitude แยกจากข้อมูลการเงิน ข้อมูลเดิมไม่ถูกลบหรือเปลี่ยนชื่อ

| Sheet | Headers ตามลำดับ |
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

ก่อน Deploy ให้ทำ [CREDIT_CARD_MIGRATION.md](CREDIT_CARD_MIGRATION.md), [GRATITUDE_MIGRATION.md](GRATITUDE_MIGRATION.md) และตรวจ Migration เดิมทั้งหมด หากยังไม่มี Gratitude หน้าการเงินยังทำงานได้ แต่ Tab ขอบคุณจะบันทึกไม่ได้

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

Tab `ขอบคุณ` เป็นพื้นที่บันทึกสิ่งดี ๆ แยกจากระบบการเงินโดยสมบูรณ์

| ความสามารถ | กติกา |
|---|---|
| จำนวนต่อวัน | สูงสุด 3 เรื่อง และบันทึกก่อนได้ตั้งแต่ 1 เรื่อง |
| หมวดหมู่ | คน, สัตว์, สิ่งของ, สถานที่, เหตุการณ์, อื่น ๆ |
| วันที่ | ค่าเริ่มต้นเป็นวันนี้ และเลือกย้อนหลัง/วันอื่นได้ |
| แก้ไข | เปิดวันที่เดิมแล้วแก้ข้อความหรือหมวด จากนั้นบันทึก |
| ลบ | ล้างช่องที่ต้องการแล้วกดบันทึก |
| ประวัติ | เรียงวันที่ล่าสุดก่อน แตะเพื่อเปิดบันทึกวันนั้น |

หนึ่งเรื่องเก็บหนึ่งแถวในชีต Gratitude โดยใช้ `date + slot` เป็นตำแหน่งของเรื่อง ระบบไม่ส่งข้อมูลนี้เข้า Analytics และไม่เปลี่ยนยอดทางการเงิน

## หมวดหมู่และชื่อรายการรายจ่าย

- Expense ใหม่ต้องเลือก `category` ก่อน จึงจะพิมพ์ `item_name` ได้
- หมวดมาตรฐานในแอป: อาหาร, เครื่องดื่ม, หนังสือ, ทำบุญ, ของใช้ส่วนตัว, ค่าเดินทาง, ครอบครัว, สุขภาพ, อิเล็กทรอนิกส์ และ อื่น ๆ
- เพิ่มหมวดเองได้ในชีต `Categories` โดยระบุ `type` เป็น `Expense`
- กราฟรวมตาม `category`; ชื่อร้านหรือรายละเอียดเฉพาะเก็บใน `item_name`
- กราฟไม่นำ Transaction ที่ `category` เท่ากับ `บัตรเครดิต` มาคำนวณ เพื่อไม่ให้ยอดชำระบัตรถูกนับซ้ำ
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
- สูตร Emergency Fund เดิมไม่เปลี่ยน

## OAuth และ Quick Reconnect

- การเชื่อมต่อเกิดจากการกดปุ่มของผู้ใช้
- ใช้ `prompt` ว่างในการเชื่อมต่อทั่วไปเพื่อลด consent ซ้ำ
- เมื่อ Token หมดอายุจะแสดง `แตะเพื่อเชื่อมต่อ Google`
- ไม่มี Refresh Token และไม่มี PIN แทน Google OAuth
- ไม่ต้องเปลี่ยน Google Cloud configuration สำหรับ v2.6.0

## ความปลอดภัย

- Google Sheet ต้องเป็น Private/Restricted
- ห้ามใส่ Client Secret, Access Token, Password หรือข้อมูลการเงินจริงใน Repository
- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` ไม่เปลี่ยน
- Service Worker ไม่ Cache Google Sheets API
- GAS deployments เดิมต้องคง Archived
- Goal ที่ผูกบัญชีเป็นเพียงการอ่านยอดจากข้อมูลที่ OAuth อนุญาตอยู่แล้ว

## วิธี Deploy

1. สำรอง Google Sheet และ Repository รุ่นปัจจุบัน
2. ตรวจ Migration ชีต Goals ตาม `GOALS_MIGRATION.md`
3. ทำ Migration ชีต Investments ตาม `INVESTMENTS_MIGRATION.md`
4. ทำ Migration ชีต Transactions ตาม `TRANSACTIONS_MIGRATION.md`
5. ทำ Migration บัตรเครดิตตาม `CREDIT_CARD_MIGRATION.md`
6. สร้างชีต Gratitude ตาม `GRATITUDE_MIGRATION.md`
7. ดาวน์โหลด `personal-wealth-v2.6.0.zip`
8. แตก ZIP แล้ว Replace ไฟล์ใน Root ของ Repository
9. Commit:

```text
feat: add credit cards and daily gratitude
```

10. รอ GitHub Actions `pages build and deployment` เป็นสีเขียว
11. ปิด WebApp/PWA ทุกหน้าต่าง แล้วเปิดใหม่
12. กด Refresh และทดสอบตามคู่มือ Migration ทั้งสองไฟล์

## วิธี Rollback

1. หยุดบันทึก Transaction และ Investment ชั่วคราว
2. Revert Commit v2.6.0 หรือ Replace Code ด้วย Backup รุ่นที่ใช้งานอยู่ก่อน Deploy
3. Header ใหม่ใน Goals, Investments และ Transactions สามารถคงไว้ได้ เพราะ Code เก่าจะเพิกเฉย
4. รอ Deploy และเปิดแอปใหม่

Rollback Code ไม่ย้อนยอด Accounts, Liabilities หรือแถว Gratitude ที่เขียนแล้ว ต้อง Reconcile ยอดจริงก่อนใช้งานต่อ

## การแก้ปัญหา

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| Goal รุ่นใหม่บันทึกไม่ได้ | เพิ่ม Header `goal_type`, `progress_source`, `linked_account`, `status` ต่อท้าย Goals |
| Goal ผูกบัญชีแสดงตรวจสอบบัญชี | ตรวจ `linked_account` และชื่อ Account; ชื่อต้องไม่ซ้ำ |
| เปลี่ยนชื่อ/ลบ Account ไม่ได้ | มี Transaction, Goal หรือ Investment อ้างถึงบัญชี |
| บันทึก Investment ไม่ได้ | เพิ่ม Header `account_from`, `funded_amount` ต่อท้าย Investments และตรวจยอด Account |
| บันทึกรายจ่ายไม่ได้ | เพิ่ม Header `item_name` ที่ I1 ของ Transactions แล้วเลือกหมวดและพิมพ์ชื่อรายการ |
| ยอด Account ลดหลังลงทุน | เป็นผลปกติของ Investment ใหม่ และไม่ถูกนับเป็น Expense |
| กราฟสัดส่วนรายจ่ายว่าง | เดือนที่เลือกไม่มี Expense หรือมีเฉพาะหมวด `บัตรเครดิต` |
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
