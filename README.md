# Personal Wealth v2.2.0

**Account-linked Goals** — WebApp/PWA ส่วนตัวสำหรับบันทึกรายรับ รายจ่าย การโอนเงิน ทรัพย์สิน หนี้สิน การลงทุน และเป้าหมายการเงินกับเป้าหมายชีวิต โดยใช้ GitHub Pages เป็น Frontend และอ่าน–เขียน Google Sheet แบบ Private ผ่าน Google OAuth และ Google Sheets API v4 โดยตรง

## ความสามารถหลัก

- Income, Expense และ Transfer ปรับ `Accounts.balance` อัตโนมัติ
- การแก้หรือลบ Transaction ที่สร้างตั้งแต่ v2.1.0 ย้อนผลเดิมก่อนใช้ผลใหม่
- การ์ด `เงินใช้จ่ายคงเหลือ` อ่านยอดจริงจาก Account ชื่อ `บัญชีใช้จ่ายรายเดือน`
- เมื่อไม่มีหนี้ การ์ด `ภาระหนี้ต่อรายได้` แสดง `0%` และ `ไม่มีภาระหนี้`
- Goal เดิมยังใช้ยอด `current_amount` แบบกรอกเอง
- Goal การเงินเลือกติดตามจาก `Accounts.balance` ได้ เช่น เลือก DIME สำหรับเงินสำรองฉุกเฉิน
- Goal แบบ Milestone ใช้สถานะ `ยังไม่เริ่ม`, `กำลังดำเนินการ`, `สำเร็จแล้ว` โดยไม่สร้างเปอร์เซ็นต์เงินสมมติ
- ป้องกันการเปลี่ยนชื่อหรือลบ Account ที่ Transaction หรือ Goal ยังอ้างถึง
- Static Asset ใช้ Version URL `v=2.2.0` ลดปัญหา PWA โหลด HTML และ JavaScript คนละรุ่น
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
└── icons/
```

`script.js` แบบเดิมไม่ถูกใช้งาน

## โครงสร้าง Google Sheet

v2.2.0 เปลี่ยนเฉพาะ Header ของ `Goals` โดยเพิ่ม 4 ช่องต่อท้าย ข้อมูลและ Header เดิมไม่ถูกลบหรือเปลี่ยนชื่อ

| Sheet | Headers ตามลำดับ |
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

ก่อน Deploy ให้ทำตาม [GOALS_MIGRATION.md](GOALS_MIGRATION.md) หากยังไม่เพิ่ม Header ระบบยังอ่าน Goal เดิมได้ แต่จะเตือนและไม่บันทึก Goal จนกว่า Header จะครบ

ชื่อ `account_name` ต้องไม่ซ้ำ เพราะ Transactions และ Goals ยังเก็บชื่อบัญชีตามโครงสร้างเดิม

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

## การเพิ่ม แก้ไข และลบ Account

- ชื่อ Account ต้องไม่ซ้ำ
- เปลี่ยนชื่อหรือลบ Account ไม่ได้เมื่อ Transaction หรือ Goal แบบ Account ยังอ้างถึง
- หากต้องการเปลี่ยนชื่อ ให้แก้ Goal ไปใช้บัญชีอื่นหรือเปลี่ยนเป็น Manual ก่อน
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
- Investments ยังคงเป็นมูลค่าที่ผู้ใช้อัปเดตเอง
- ไม่มี `InvestmentTransactions` และไม่แก้มูลค่า Investments อัตโนมัติ
- สูตร Emergency Fund เดิมไม่เปลี่ยน

## OAuth และ Quick Reconnect

- การเชื่อมต่อเกิดจากการกดปุ่มของผู้ใช้
- ใช้ `prompt` ว่างในการเชื่อมต่อทั่วไปเพื่อลด consent ซ้ำ
- เมื่อ Token หมดอายุจะแสดง `แตะเพื่อเชื่อมต่อ Google`
- ไม่มี Refresh Token และไม่มี PIN แทน Google OAuth
- ไม่ต้องเปลี่ยน Google Cloud configuration สำหรับ v2.2.0

## ความปลอดภัย

- Google Sheet ต้องเป็น Private/Restricted
- ห้ามใส่ Client Secret, Access Token, Password หรือข้อมูลการเงินจริงใน Repository
- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` ไม่เปลี่ยน
- Service Worker ไม่ Cache Google Sheets API
- GAS deployments เดิมต้องคง Archived
- Goal ที่ผูกบัญชีเป็นเพียงการอ่านยอดจากข้อมูลที่ OAuth อนุญาตอยู่แล้ว

## วิธี Deploy

1. สำรอง Google Sheet และ Repository รุ่นปัจจุบัน
2. ทำ Migration ชีต Goals ตาม `GOALS_MIGRATION.md`
3. ดาวน์โหลด `personal-wealth-v2.2.0.zip`
4. แตก ZIP แล้ว Replace ไฟล์ใน Root ของ Repository
5. Commit:

```text
feat: add account-linked goals and debt clarity
```

6. รอ GitHub Actions `pages build and deployment` เป็นสีเขียว
7. ปิด WebApp/PWA ทุกหน้าต่าง แล้วเปิดใหม่
8. กด Refresh และทดสอบตาม `PROJECT_STATE.md`

## วิธี Rollback

1. หยุดแก้ Goal ชั่วคราว
2. Revert Commit v2.2.0 หรือ Replace Code ด้วย Backup v2.1.1
3. Header ใหม่ 4 ช่องใน Goals สามารถคงไว้ได้ เพราะ v2.1.1 จะเพิกเฉย
4. รอ Deploy และเปิดแอปใหม่

Rollback Code ไม่เปลี่ยนยอด Accounts, Transactions หรือ Investments และไม่ต้องลบ Header ใหม่

## การแก้ปัญหา

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| Goal รุ่นใหม่บันทึกไม่ได้ | เพิ่ม Header `goal_type`, `progress_source`, `linked_account`, `status` ต่อท้าย Goals |
| Goal ผูกบัญชีแสดงตรวจสอบบัญชี | ตรวจ `linked_account` และชื่อ Account; ชื่อต้องไม่ซ้ำ |
| เปลี่ยนชื่อ/ลบ Account ไม่ได้ | มี Transaction หรือ Goal อ้างถึงบัญชี |
| ภาระหนี้แสดง `—` | มีค่างวดแต่ยังไม่มี Income เดือนปัจจุบัน |
| หน้าเว็บยังเป็นรุ่นเก่า | รอ Deploy, ปิด PWA แล้วเปิดใหม่ หรือ Clear site data |
| สิทธิ์หมดอายุ | กด `แตะเพื่อเชื่อมต่อ Google` |
| แจ้ง rollback ไม่สำเร็จ | หยุดทำรายการและ Reconcile Accounts ที่เกี่ยวข้อง |

## ข้อจำกัด

- Google Sheets API ไม่มี Database transaction ข้ามชีต
- ไม่มีระบบหลายผู้ใช้หรือป้องกันการแก้พร้อมกันหลายอุปกรณ์
- Goal ผูกบัญชีอ้างอิงด้วย `account_name` ไม่ใช่ `account_id`
- Goal หนึ่งรายการผูกได้หนึ่ง Account ใน v2.2.0
- Milestone มีสถานะ 3 ระดับและไม่มีรายการงานย่อย
- Legacy transactions ไม่เชื่อม Accounts
- Investments ต้องอัปเดตมูลค่าด้วยตนเอง
- ไม่มี Refresh Token

## เอกสารอ้างอิง

- Google Identity Services — Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Sheets API — JavaScript quickstart: https://developers.google.com/workspace/sheets/api/quickstart/js
