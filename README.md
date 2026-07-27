# Personal Wealth v2

WebApp ส่วนตัวสำหรับบันทึกและติดตามรายรับ–รายจ่าย ทรัพย์สิน หนี้สิน การลงทุน และเป้าหมายทางการเงิน ใช้ GitHub Pages เป็น Frontend และอ่าน–เขียน Google Sheet ส่วนตัวผ่าน Google OAuth โดยตรง

## สิ่งที่เปลี่ยนจากเวอร์ชันเดิม

- ใช้ข้อมูลจริงจาก Google Sheet ทุกการ์ดและทุกกราฟ
- ไม่มีตัวเลขหรือกราฟความมั่งคั่งย้อนหลังแบบจำลอง
- รวมการบันทึกรายรับ รายจ่าย โอนเงิน การลงทุน บัญชี ทรัพย์สิน หนี้สิน และเป้าหมายไว้ในแอปเดียว
- เพิ่มหน้า Dashboard, Transactions, Wealth และ Goals
- คำนวณ Net Worth, กระแสเงินสด, อัตราการออม, เงินสำรองฉุกเฉิน และภาระหนี้
- รองรับการลบรายการจาก Google Sheet โดยมีหน้าต่างยืนยัน
- รองรับ PWA และ Safe Area ของ iPhone
- ไม่ใช้ GAS เป็นช่องทางเปิดเผยข้อมูลการเงิน

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
└── icons/
    ├── wealth-icon.svg
    ├── icon-192.png
    └── icon-512.png
```

ไฟล์ `script.js` เดิมไม่ถูกใช้อีกต่อไป หลังอัปโหลดชุดใหม่นี้สามารถลบ `script.js` เดิมออกจาก Repository ได้

## วิธีติดตั้งบน GitHub Pages

1. สำรอง Google Sheet และ Repository เดิมก่อน
2. อัปโหลดไฟล์ทั้งหมดในชุดนี้ไปที่ Root ของ Repository `personal-wealth`
3. เลือกให้ไฟล์ชื่อซ้ำถูก Replace
4. ลบ `script.js` เดิมออกจาก Repository
5. Commit การเปลี่ยนแปลง
6. รอ GitHub Pages Deploy ประมาณ 1–3 นาที
7. เปิด `https://wittaya-tasu.github.io/personal-wealth/`
8. กด `เชื่อมต่อ Google` และเลือกบัญชีที่มีสิทธิ์แก้ไข Google Sheet

## ตั้งค่า Google Cloud

ต้องตั้งค่าใน Google Cloud Project ที่สร้าง OAuth Client ID เดิม:

1. เปิดใช้ **Google Sheets API**
2. OAuth Client Type ต้องเป็น **Web application**
3. เพิ่ม Authorized JavaScript origin:

```text
https://wittaya-tasu.github.io
```

4. หาก OAuth Consent Screen อยู่ใน Testing ให้เพิ่มบัญชี Google ของเจ้าของแอปเป็น Test user
5. Google Sheet ต้องเป็น Private และแชร์เฉพาะบัญชีที่ต้องใช้

`GOOGLE_CLIENT_ID` และ `SPREADSHEET_ID` อยู่ใน `config.js` และไม่ใช่รหัสผ่าน แต่ห้ามใส่ Client Secret หรือ Access Token ใน Repository

## GAS เดิม

แอป v2 ไม่ต้องใช้ Google Apps Script เดิมแล้ว

GAS เดิมมี `doGet()` ที่ส่งข้อมูลจากชีตกลับทั้งหมด และไม่มีการตรวจสอบผู้ใช้ในตัวโค้ด หาก Deployment ตั้งค่าเป็น `Anyone` ผู้ที่ทราบ URL สามารถเรียกอ่านข้อมูลได้ แม้หน้าเว็บจะแสดงปุ่ม Google Login ก็ตาม

หลังตรวจว่า v2 ทำงานแล้ว ให้ไปที่:

```text
Google Apps Script > Deploy > Manage deployments
```

จากนั้น Archive/ปิด Deployment เดิม หรือเปลี่ยนสิทธิ์ไม่ให้บุคคลทั่วไปเรียกใช้

## ชีตที่ระบบใช้

ระบบรองรับโครงสร้างฐานข้อมูลเดิมโดยไม่ต้องเปลี่ยนชื่อคอลัมน์

| Sheet | Headers ที่ใช้ |
|---|---|
| Accounts | `account_id`, `account_name`, `currency`, `balance`, `type`, `note` |
| Transactions | `tx_id`, `date`, `type`, `category`, `account_from`, `account_to`, `amount`, `note` |
| Investments | `investment_id`, `asset_name`, `category`, `units`, `avg_cost`, `current_price`, `current_value`, `tax_deductible`, `note` |
| Assets | `asset_id`, `asset_name`, `category`, `purchase_price`, `estimated_value`, `note` |
| Liabilities | `liability_id`, `liability_name`, `total_amount`, `monthly_payment`, `note` |
| Goals | `goal_id`, `goal_name`, `target_amount`, `current_amount`, `deadline`, `note` |
| Categories | `category_id`, `category_name`, `type`, `note` |
| MonthlySnapshots | `snapshot_month`, `total_assets`, `total_liabilities`, `net_worth`, `monthly_cashflow`, `savings_rate`, `note` |
| Settings | `key`, `value`, `description` |

ห้ามแก้ชื่อ Sheet หรือชื่อ Header โดยไม่แก้ `config.js` และโค้ดที่เกี่ยวข้อง

## กติกาการคำนวณ

### Net Worth

```text
Net Worth = Accounts ที่เลือกให้นับ + Investments + Assets − Liabilities
```

ค่าเริ่มต้นของ `include_accounts_in_net_worth` เป็น `false` เพราะฐานข้อมูลเดิมมี `Cash(TH)` อยู่ใน Investments หากเพิ่มยอดเดียวกันใน Accounts แล้วเปิดให้นับทั้งคู่ เงินสดจะถูกนับซ้ำ

แนวทางที่ถูกต้องในระยะยาว:

1. ย้ายเงินสดและเงินฝากจาก Investments ไปไว้ใน Accounts
2. เปิด `นับยอดบัญชีใน Net Worth` ในหน้าตั้งค่า
3. ใช้ Investments สำหรับสินทรัพย์ลงทุนจริง

### Transactions

- `Income` = รายรับ
- `Expense` = รายจ่าย
- `Transfer` = การโอนระหว่างบัญชี ไม่ถูกนับเป็นรายรับหรือรายจ่าย
- เงินที่โอนไปลงทุนไม่ควรถูกบันทึกเป็น Expense หากเป็นเพียงการย้ายสินทรัพย์

### เงินสำรองฉุกเฉิน

```text
จำนวนเดือน = เงินสดพร้อมใช้ ÷ ค่าใช้จ่ายจำเป็นต่อเดือน
```

หากไม่ได้กำหนดค่าใช้จ่ายจำเป็น ระบบใช้ค่าใช้จ่ายเฉลี่ย 3 เดือนล่าสุด

### ประวัติความมั่งคั่ง

กราฟ Net Worth ใช้ข้อมูลจาก `MonthlySnapshots` เท่านั้น ระบบจะไม่สร้างตัวเลขย้อนหลังขึ้นเอง

ควรบันทึกเดือนละครั้งหลังอัปเดตมูลค่าทรัพย์สินและหนี้สินแล้ว โดยกด:

```text
ตั้งค่า > บันทึก Snapshot เดือนนี้
```

หากเดือนนั้นมี Snapshot อยู่แล้ว ระบบจะอัปเดตแถวเดิมแทนการสร้างข้อมูลซ้ำ

## การรักษาความปลอดภัย

- Repository สามารถเป็น Public ได้ เพราะไม่มีข้อมูลการเงินจริงอยู่ในไฟล์
- Google Sheet ต้องเป็น Private
- จำกัด OAuth Client ให้ใช้ได้จาก GitHub Pages origin ที่กำหนด
- Access Token ถูกเก็บใน `sessionStorage` และหมดอายุตาม Google
- Service Worker เก็บเฉพาะไฟล์หน้าตาแอป ไม่เก็บคำตอบจาก Google Sheets API
- ห้ามเพิ่ม Client Secret, Access Token, รหัสผ่าน หรือสำเนาฐานข้อมูลลง GitHub

## การแก้ปัญหา

| อาการ | สิ่งที่ต้องตรวจ |
|---|---|
| Google แจ้ง `origin_mismatch` | Authorized JavaScript origin ต้องเป็น `https://wittaya-tasu.github.io` |
| แจ้งว่า Sheets API ไม่เปิดใช้ | เปิด Google Sheets API ใน Cloud Project เดียวกับ OAuth Client |
| Login ได้แต่อ่านชีตไม่ได้ | บัญชีที่ Login ต้องมีสิทธิ์ใน Spreadsheet |
| กราฟ Net Worth ว่าง | เพิ่มข้อมูลใน `MonthlySnapshots` |
| Net Worth สูงผิดปกติ | ตรวจเงินสดซ้ำระหว่าง Accounts และ Investments |
| หน้าเว็บยังเป็นเวอร์ชันเก่า | Hard refresh หรือปิดแล้วเปิด PWA ใหม่หลัง GitHub Pages Deploy |

## เอกสารอ้างอิง

- Google Identity Services — Token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google Sheets API — JavaScript quickstart: https://developers.google.com/workspace/sheets/api/quickstart/js
