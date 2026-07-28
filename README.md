# Personal Wealth v2.1.0

**Account-linked Transactions** — WebApp/PWA ส่วนตัวสำหรับบันทึกรายรับ รายจ่าย การโอนเงิน ทรัพย์สิน หนี้สิน การลงทุน และเป้าหมายทางการเงิน โดยใช้ GitHub Pages เป็น Frontend และอ่าน–เขียน Google Sheet แบบ Private ผ่าน Google OAuth และ Google Sheets API v4 โดยตรง

## ความสามารถหลักของ v2.1.0

- Transaction ใหม่ปรับยอด `Accounts.balance` อัตโนมัติ
- แก้ไขหรือลบ Transaction ที่สร้างโดย v2.1.0 แล้วย้อนผลเดิมก่อนใช้ผลใหม่
- ป้องกันยอดบัญชีติดลบ ชื่อบัญชีซ้ำ และ Transfer เข้าบัญชีเดิม
- ป้องกันการลบหรือเปลี่ยนชื่อ Account ที่ยังถูก Transaction อ้างถึง
- เลือกบัญชีจากรายการ Accounts พร้อมแสดงยอดปัจจุบัน
- Expense ใหม่เลือก `บัญชีใช้จ่ายรายเดือน` เป็นค่าเริ่มต้นเมื่อพบบัญชีชื่อนี้
- Quick Reconnect ไม่บังคับขอ consent ทุกครั้ง
- รักษา Cash Flow, Dashboard, PWA และ Safe Area เดิม

## สถาปัตยกรรม

```text
iPhone / Browser
      |
      +-- Static WebApp / PWA บน GitHub Pages
      +-- Google Identity Services: OAuth Token Model
      +-- Google Sheets API v4
      +-- Google Sheet แบบ Private/Restricted
```

- ไม่มี Backend ของแอป
- ไม่ใช้ Google Apps Script
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
└── icons/
    ├── wealth-icon.svg
    ├── icon-192.png
    └── icon-512.png
```

`script.js` แบบเดิมไม่ถูกใช้งาน

## โครงสร้าง Google Sheet

v2.1.0 ไม่เปลี่ยนชื่อ Sheet หรือ Header

| Sheet | Headers ตามลำดับ |
|---|---|
| `Accounts` | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| `Transactions` | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note` |
| `Investments` | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note` |
| `Assets` | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| `Liabilities` | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| `Goals` | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note` |
| `Categories` | `category_id`, `category_name`, `type`, `note` |
| `MonthlySnapshots` | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| `Settings` | `key`, `value`, `description` |

ชื่อ `account_name` ต้องไม่ซ้ำ เพราะ Transactions ยังเก็บชื่อบัญชีตามโครงสร้างเดิม

## Opening Balance และจุดเริ่มใช้ v2.1.0

ยอดในชีต `Accounts` ขณะ Deploy v2.1.0 ถือเป็น **Opening Balance**

- ระบบไม่อ่าน Transactions เก่าเพื่อคำนวณยอด Accounts ย้อนหลัง
- Transaction ที่สร้างจาก v2.1.0 จะมีตัวระบุใน `tx_id` เพื่อบอกว่าเป็นรายการที่เชื่อมกับ Accounts
- Transaction เก่าก่อน v2.1.0 เป็น Legacy transaction และไม่ปรับยอด Accounts เมื่อแก้หรือลบ เพื่อป้องกันการนับอดีตซ้ำใน Opening Balance
- หากต้องการเปลี่ยนข้อมูล Legacy transaction ให้ตรวจยอดธนาคารและ Reconcile Account หลังแก้ไข

## วิธีใช้ Income / Expense / Transfer

| Type | ช่องบัญชีที่ต้องเลือก | ผลต่อ Account | ผลต่อ Cash Flow |
|---|---|---|---|
| `Income` | เงินเข้าบัญชี (`account_to`) | เพิ่มยอดบัญชีปลายทาง | รายรับ |
| `Expense` | จ่ายจากบัญชี (`account_from`) | ลดยอดบัญชีต้นทาง | รายจ่าย |
| `Transfer` | จากบัญชีและเข้าบัญชี | ลดต้นทางและเพิ่มปลายทาง | ไม่นับเป็นรายรับ/รายจ่าย |

กติกา:

- จำนวนเงินต้องมากกว่า 0
- เลือกได้เฉพาะชื่อที่มีจริงใน Accounts
- Transfer ห้ามใช้บัญชีเดียวกันทั้งต้นทางและปลายทาง
- ถ้ายอดต้นทางไม่พอ ระบบจะไม่บันทึก
- การซื้อ RMF, ETF หรือย้ายเงินไปบัญชีลงทุนไม่ควรเป็น Expense หากเป็นการเปลี่ยนรูปสินทรัพย์

### ตัวอย่างการแบ่งงบใช้จ่ายรายเดือน

ตัวอย่างการแบ่งงบ 1,000 บาทจากบัญชีหลักไปใช้ประจำเดือน:

```text
Type: Transfer
จากบัญชี: บัญชีหลัก
เข้าบัญชี: บัญชีใช้จ่ายรายเดือน
จำนวน: 1,000
```

ผลคือบัญชีหลักลด 1,000 บาทและบัญชีใช้จ่ายรายเดือนเพิ่ม 1,000 บาท โดย Cash Flow ไม่ถือเป็นรายรับหรือรายจ่าย

เมื่อบันทึก Expense ใหม่ แอปจะเลือก `บัญชีใช้จ่ายรายเดือน` เป็นค่าเริ่มต้นถ้ามีชื่อนี้ แต่ผู้ใช้เปลี่ยนเป็นบัญชีอื่นได้

## การแก้ไขและลบ Transaction

สำหรับ Transaction ที่สร้างโดย v2.1.0:

1. ระบบคำนวณผลย้อนกลับของรายการเดิม
2. ตรวจว่าผลลัพธ์สุดท้ายไม่ทำให้ Account ใดติดลบ
3. อัปเดตยอด Accounts แบบ batch
4. แก้ไขหรือลบแถว Transaction
5. หากขั้นตอน Transaction ล้มเหลว ระบบพยายามคืนยอด Accounts เดิม

หาก rollback ล้มเหลว แอปจะแจ้งชัดเจนว่าข้อมูลอาจไม่ตรงกัน ให้หยุดทำรายการและ Reconcile ก่อน

Google Sheets API ไม่ใช่ฐานข้อมูล Transactional จึงไม่สามารถรับประกัน atomic transaction ระหว่างการแก้ยอด Accounts กับการเพิ่ม/แก้/ลบแถว Transactions ได้ 100%

## การเพิ่ม แก้ไข และลบ Account

- เพิ่ม Account ได้เมื่อชื่อไม่ซ้ำ
- เปลี่ยน `account_name` ไม่ได้ถ้ามี Transaction อ้างถึงชื่อเดิม
- ลบ Account ไม่ได้ถ้ามี Transaction อ้างถึง
- แก้ `balance` โดยตรงได้เพื่อ Reconcile
- การแก้ balance โดยตรงไม่เรียก Transaction automation

## Reconcile กับยอดธนาคารจริง

ควรตรวจเป็นประจำหรือเมื่อแอปแจ้ง rollback failure:

1. เปิดยอดจริงจากธนาคาร
2. ไปที่ `ความมั่งคั่ง > บัญชีเงิน`
3. เลือกแก้ Account
4. ใส่ `ยอดคงเหลือ` ให้ตรงกับยอดจริง
5. บันทึกและกด Refresh
6. หากมีความต่าง ให้ตรวจ Transaction ล่าสุดก่อนสร้างรายการชดเชย

อย่าสร้าง Income/Expense ปลอมเพื่อให้ยอดตรง หากเป็นเพียงการแก้ Opening Balance หรือแก้ความคลาดเคลื่อน ให้แก้ balance โดยตรงและใส่เหตุผลใน `note`

## Net Worth และ Investments

```text
Net Worth = Accounts ที่เลือกให้นับ + Investments + Assets - Liabilities
```

- ผู้ใช้ย้ายเงินสดออกจาก Investments ไป Account แล้ว
- ตั้งค่า `include_accounts_in_net_worth = true` ในชีต Settings แล้ว
- Investments ยังคงเป็นมูลค่าที่ผู้ใช้อัปเดตเอง
- v2.1.0 ไม่สร้าง `InvestmentTransactions` และไม่แก้มูลค่า Investments อัตโนมัติ
- สูตร Emergency Fund ไม่เปลี่ยน

## OAuth และ Quick Reconnect

- การเชื่อมต่อเกิดจากการกดปุ่มของผู้ใช้เท่านั้น
- แอปใช้ `prompt` ว่างในการเชื่อมต่อทั่วไป เพื่อลดการขอ consent ซ้ำ
- Google ยังอาจแสดงหน้าบัญชีหรือ consent เมื่อเป็นครั้งแรก สิทธิ์ถูกถอน หรือนโยบาย Google กำหนด
- เมื่อ Token หมดอายุ แอปจะแสดงปุ่ม `แตะเพื่อเชื่อมต่อ Google`
- ไม่มี Refresh Token และไม่มี PIN ที่ใช้แทน Google OAuth
- Logout จะ revoke Token; การหมดอายุทั่วไปเพียงล้าง Token ใน session

## การรักษาความปลอดภัย

- Google Sheet ต้องเป็น Private/Restricted
- ห้ามใส่ Client Secret, Access Token, Password หรือข้อมูลการเงินจริงใน Repository
- `GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` เป็น Identifier และคงค่าเดิมใน v2.1.0
- Service Worker ไม่ Cache Google Sheets API
- GAS deployments เดิมต้องคงสถานะ Archived
- การลบข้อมูลมีหน้าต่างยืนยัน

## วิธี Deploy

1. สำรอง Google Sheet และ Repository รุ่นปัจจุบัน
2. ดาวน์โหลด `personal-wealth-v2.1.0.zip`
3. แตก ZIP และอัปโหลดไฟล์ภายในไปที่ Root ของ Repository
4. Replace ไฟล์ชื่อเดิม และเพิ่ม `CHANGELOG.md`
5. Commit ด้วยข้อความ:

```text
feat: link transactions to account balances
```

6. รอ GitHub Actions `pages build and deployment` เป็นสีเขียว
7. เปิด WebApp แล้วกด Refresh
8. บน iPhone ให้ปิดแล้วเปิด PWA ใหม่หากยังเห็น Cache เดิม
9. ทดสอบด้วยข้อมูลทดสอบ 1 บาทตาม Checklist ใน `PROJECT_STATE.md`

## วิธี Rollback

1. หยุดเพิ่ม แก้ หรือลบ Transaction
2. Revert Commit v2.1.0 หรือ Replace `app.js`, `api.js`, `sw.js`, `README.md` และ `PROJECT_STATE.md` ด้วยไฟล์ v2.0.2 ที่สำรองไว้
3. Deploy และรอ GitHub Pages เป็นสีเขียว
4. ตรวจยอด Accounts กับธนาคารจริงและ Reconcile ด้วยตนเอง
5. ระวัง: v2.0.2 จะไม่ย้อนยอด Account เมื่อแก้หรือลบ Transaction ที่ v2.1.0 เคยสร้าง

การ Rollback Code ไม่ได้ย้อนยอด Accounts หรือ Transactions ที่เกิดขึ้นระหว่างใช้ v2.1.0 โดยอัตโนมัติ

## การแก้ปัญหา

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| พบชื่อบัญชีซ้ำ | แก้ `account_name` ใน Accounts ให้ไม่ซ้ำ |
| ไม่พบบัญชีในฟอร์ม | เพิ่มบัญชีใน Accounts แล้วกด Refresh |
| ยอดเงินไม่พอ | ตรวจยอด Account หรือ Reconcile กับธนาคาร |
| เปลี่ยนชื่อ/ลบบัญชีไม่ได้ | มี Transaction อ้างถึงชื่อบัญชี |
| สิทธิ์หมดอายุ | กด `แตะเพื่อเชื่อมต่อ Google` |
| Google แจ้ง `origin_mismatch` | Origin ต้องเป็น `https://wittaya-tasu.github.io` |
| Login ได้แต่อ่านชีตไม่ได้ | บัญชี Google ต้องมีสิทธิ์แก้ไข Spreadsheet |
| หน้าเว็บยังเป็นรุ่นเก่า | รอ Deploy แล้ว Refresh หรือเปิด PWA ใหม่ |
| แจ้ง rollback ไม่สำเร็จ | หยุดทำรายการและ Reconcile ทุก Account ที่เกี่ยวข้อง |

## ข้อจำกัดที่ยังเหลือ

- ไม่มี Database transaction ข้าม Accounts และ Transactions
- ไม่มีระบบหลายผู้ใช้หรือป้องกันการแก้พร้อมกันจากหลายอุปกรณ์
- Legacy transactions ไม่เชื่อมกับ Accounts
- Investments ต้องอัปเดตมูลค่าด้วยตนเอง
- ไม่มีระบบซื้อขายหุ้น RMF/PVD หรือราคาตลาด
- ไม่มี Refresh Token หรือการเชื่อมต่อแบบถาวร

## เอกสารอ้างอิง

- Google Identity Services — Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Sheets API — JavaScript quickstart: https://developers.google.com/workspace/sheets/api/quickstart/js
