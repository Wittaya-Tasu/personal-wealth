# TasuyaWay v2.12.0 — หนี้ ประกัน และแผนเกษียณ

อัปเดตจาก v2.11.0 โดยสำรอง Google Sheet และ Repository ก่อน เพิ่ม Header ต่อท้ายเท่านั้น ไม่แทรกคอลัมน์และไม่ลบข้อมูลเดิม

## 1. Investments: เพิ่ม L1:T1

คัดลอกบรรทัดนี้ไปวางที่ **Investments!L1**:

```text
investment_purpose	asset_class	risk_source	risk_level	time_horizon_years	income_received	principal_amount	valuation_mode	valuation_date
```

| Cell | Header | ความหมาย |
|---|---|---|
| L1 | investment_purpose | Retirement / Growth / Income / Preservation / Other |
| M1 | asset_class | Cash / FixedIncome / Equity / Mixed / Gold / RealEstate / Crypto / Alternative / Other |
| N1 | risk_source | Auto / Manual |
| O1 | risk_level | ระดับ 1–7; Auto ให้แอปคำนวณ |
| P1 | time_horizon_years | ระยะเวลาที่ตั้งใจลงทุน จำนวนปีเต็ม |
| Q1 | income_received | ปันผล/ดอกเบี้ยรับจริงสะสม เลือกกรอก |
| R1 | principal_amount | เงินต้นสะสมทั้งหมดที่ยืนยันแล้ว |
| S1 | valuation_mode | Principal / Market |
| T1 | valuation_date | วันที่มูลค่าปัจจุบัน YYYY-MM-DD เลือกกรอก |

**ห้ามคัดลอกมูลค่าปัจจุบันมาเป็นเงินต้นโดยอัตโนมัติ** และอย่าแก้ `funded_amount` เพื่อเติมเงินต้นเก่า เพราะช่อง K นี้ใช้คำนวณการคืนเงินเข้าบัญชีเมื่อลบสินทรัพย์

หลัง Deploy เปิด ความมั่งคั่ง > การลงทุน > รายละเอียด ของแต่ละรายการ:

1. กรอกเงินต้นทั้งหมดจากข้อมูลจริง รวมเงินต้นก่อนเริ่มใช้แอป
2. เลือกวัตถุประสงค์ ประเภทสินทรัพย์จริง และระยะเวลา
3. เลือกใช้ **เงินต้น** เป็นค่าเริ่มต้น หากไม่ต้องการดูราคาตลาด
4. ถ้าต้องการกำไร/ขาดทุน เลือก **มูลค่าปัจจุบัน** แล้วกรอกมูลค่าและวันที่

ข้อมูลเดิมที่ยังไม่ยืนยันเงินต้นจะแสดง “ยังไม่ได้ยืนยันเงินต้น” และยังใช้มูลค่าเดิมในความมั่งคั่ง จึงไม่ทำให้ยอดเดิมหายเมื่ออัปเดตโค้ด

| การทำรายการ | เงินต้น | ยอดบัญชี |
|---|---|---|
| กรอกรายละเอียด/เงินต้นเก่า | ใช้ยอดที่ยืนยัน | ไม่เปลี่ยน |
| เพิ่มเงินลงทุน | เพิ่มเงินต้นตามยอดรอบใหม่ | หักเฉพาะเงินรอบใหม่ |
| ปรับความเสี่ยง/วัตถุประสงค์/มูลค่า | ไม่เพิ่มเงินต้น | ไม่เปลี่ยน |
| ลบการลงทุน | ลบแถว | ย้อนเฉพาะยอด `funded_amount` ที่เชื่อมบัญชีตามระบบเดิม ไม่ใช่รายการขายสินทรัพย์ |

## 2. Liabilities: เพิ่ม G1:N1

วางที่ **Liabilities!G1**:

```text
debt_category	original_amount	interest_rate	start_date	due_date	payment_day	credit_limit	linked_asset
```

| Cell | Header | ความหมาย |
|---|---|---|
| G1 | debt_category | Mortgage / Auto / CreditCard / Personal / Education / Business / Other |
| H1 | original_amount | เงินกู้เริ่มต้น เลือกกรอก |
| I1 | interest_rate | ดอกเบี้ยตามสัญญา % ต่อปี เช่น 6.5 |
| J1 | start_date | วันเริ่มสัญญา |
| K1 | due_date | วันครบกำหนดสัญญา |
| L1 | payment_day | วันชำระแต่ละเดือน 1–31 |
| M1 | credit_limit | วงเงินบัตรเครดิต |
| N1 | linked_asset | ชื่อทรัพย์สิน/รายละเอียดที่เกี่ยวข้อง เป็นข้อความประกอบ |

ยอดหนี้คงเหลือยังเป็น `total_amount` เดิม การกรอกรายละเอียดไม่คำนวณดอกเบี้ยหรือชำระหนี้อัตโนมัติ ระบบจ่ายบัตรเครดิตเดิมยังทำงานตามเดิม

## 3. สร้างชีต InsurancePolicies

วางที่ **InsurancePolicies!A1**:

```text
policy_id	policy_name	insurance_type	insurer	coverage_amount	annual_premium	start_date	renewal_date	end_date	insured_person	status	note	created_at	updated_at
```

| ช่วง | รายละเอียด |
|---|---|
| A:N | 14 คอลัมน์ตามลำดับข้างต้น |
| insurance_type | Life / Health / CriticalIllness / Accident / Vehicle / Property / Other |
| annual_premium | เบี้ยรวมทั้งปี ไม่ใช่เบี้ยต่องวด |
| renewal_date | วันชำระเบี้ยครั้งถัดไป กรอก/ปรับเอง |
| status | Active / Expired / Cancelled |

ไม่รวมวงเงินประกันต่างประเภทเข้าด้วยกัน ไม่บวกวงเงินประกันเป็นสินทรัพย์ ไม่สร้าง Expense ซ้ำ รายการที่พ้น end_date จะแสดงหมดอายุและไม่รวมในเบี้ยของกรมธรรม์ที่มีผล

## 4. สร้างชีต RetirementPlans

วางที่ **RetirementPlans!A1**:

```text
retirement_id	plan_name	birth_date	retirement_age	monthly_expense_today	inflation_rate	expected_return	withdrawal_rate	monthly_contribution	status	note	created_at	updated_at
```

| ช่วง/ค่า | รายละเอียด |
|---|---|
| A:M | 13 คอลัมน์ตามลำดับข้างต้น |
| birth_date | วันเกิด ค.ศ. YYYY-MM-DD |
| monthly_expense_today | ค่าใช้จ่ายที่ต้องการหลังเกษียณ ในมูลค่าเงินวันนี้ |
| inflation_rate | เงินเฟ้อคาดการณ์ % ต่อปี |
| expected_return | ผลตอบแทนสุทธิคาดการณ์ % ต่อปี ค่าเริ่มต้น 0 เพื่อเน้นเงินต้น |
| withdrawal_rate | สมมติฐานอัตราถอนใช้ต่อปี เช่น 4 หมายถึง 4% |
| monthly_contribution | ยอดที่ตั้งใจสะสมทุกเดือน ไม่หักบัญชีอัตโนมัติ |
| status | Active / Paused; ใช้งานได้หนึ่งแผนต่อครั้ง |

เงินตั้งต้นเกษียณรวมเฉพาะ `principal_amount` ของ Investments ที่เลือก `investment_purpose = Retirement` ไม่เดาว่า RMF/PVD ทุกแถวมีวัตถุประสงค์หรือเงินต้นเท่าไร

สูตร: ค่าใช้จ่ายต่อเดือน ณ เกษียณ = ค่าใช้จ่ายวันนี้ × (1 + เงินเฟ้อ)^จำนวนปีถึงวันเกษียณ

เป้าหมายเงินก้อน = ค่าใช้จ่าย ณ เกษียณ × 12 ÷ อัตราถอนใช้

ยอดคาดการณ์ = เงินต้นเกษียณทบต้น + เงินสะสมปลายเดือนทบต้น โดยแปลงผลตอบแทนต่อปีเป็นอัตรารายเดือนที่สอดคล้องกัน

แบบจำลองนี้ใช้สมมติฐานคงที่ ไม่ใช่การรับประกันผลตอบแทนหรือความเพียงพอของเงิน ใช้ 0% ได้หากต้องการดูการสะสมเงินต้นอย่างเดียว ค่าเงินเฟ้อ 2% และอัตราถอน 4% เป็นค่าเริ่มต้นสำหรับแก้ไข ไม่ใช่ค่าที่ระบบประเมินให้เหมาะกับแต่ละคน

## 5. ความเสี่ยงอัตโนมัติ

ค่าเริ่มต้นนี้เป็น **การจัดระดับคร่าว ๆ ภายในแอป** ไม่ใช่คะแนน PRIIPs/SRI หรือคะแนนกองทุนจาก ก.ล.ต. และไม่ใช่ความสามารถรับความเสี่ยงของผู้ใช้

| ประเภท | Default ภายในแอป |
|---|---:|
| Cash | 1 |
| FixedIncome | 2 |
| Mixed | 4 |
| Gold | 4 |
| RealEstate | 4 |
| Equity | 5 |
| Alternative | 5 |
| Crypto | 7 |
| Other / ยังไม่เลือก | ไม่ประเมินอัตโนมัติ |

สินทรัพย์ในกลุ่มเดียวกันเสี่ยงต่างกันได้ เช่น ตราสารหนี้เครดิตต่ำ หุ้นกระจุกตัว อสังหาริมทรัพย์ที่มีหนี้ หรือผลิตภัณฑ์ที่ใช้ leverage ให้เปลี่ยนเป็น Manual ได้ ระบบไม่อ่านชื่อ RMF แล้วเดาว่าเป็นหุ้น เพราะ RMF เป็นประเภทผลิตภัณฑ์และอาจลงทุนหลายสินทรัพย์

แหล่งอ้างอิงหลักการแบ่งประเภทและความเสี่ยง (ตัวเลข Default เป็นการออกแบบของแอป):
- Investor.gov: https://www.investor.gov/introduction-investing/getting-started/asset-allocation
- Investor.gov — ความเสี่ยงตราสารหนี้แตกต่างกัน: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-35
- European Commission — PRIIPs เป็นการประเมินระดับผลิตภัณฑ์: https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en

## 6. อัปเดต Apps Script เดิมก่อนใช้เงินต้น

เพื่อให้ Snapshot และหน้าเว็บใช้มูลค่าเดียวกัน:

1. เปิด Google Sheet > ส่วนขยาย > Apps Script
2. เปิดไฟล์เดิมที่มี `runMonthEndSnapshot` และสำรองโค้ดไว้
3. แทนโค้ดในไฟล์นั้นด้วย **MONTH_END_SNAPSHOT.gs** รุ่นนี้ทั้งหมด แล้ว Save
4. ไม่เพิ่มสำเนาฟังก์ชันซ้ำในอีกไฟล์ ไม่ต้อง Deploy Web App
5. หาก Trigger เดิมยังมีอยู่ ไม่ต้องติดตั้งซ้ำ หากยังไม่มีให้รัน `installMonthEndSnapshotTrigger` ครั้งเดียว

ไม่ต้องรันทดสอบ Snapshot ถ้าไม่ต้องการเขียนทับ Snapshot เดือนปัจจุบัน

## 7. Deploy และตรวจ

1. ทำ Migration ทั้งสี่ตารางข้างต้น
2. อัปเดต Apps Script ตามข้อ 6
3. อัปโหลดไฟล์ ZIP ที่ Root ของ Repository คง config.js เดิมไว้
4. Commit: `feat: add debt insurance and principal-first retirement planning`
5. รอ Pages deploy ปิดและเปิด PWA ใหม่ แล้ว Refresh
6. เปิดการลงทุน > รายละเอียด ยืนยันเงินต้นหนึ่งรายการ ตรวจว่ายอดบัญชีไม่เปลี่ยน
7. เพิ่มเงินเล็กน้อย ตรวจเงินต้นและบัญชี เปลี่ยน Auto/Manual ตรวจว่าค่าที่กำหนดเองคงอยู่
8. เพิ่มกรมธรรม์และแผนเกษียณ ตรวจบน iPhone

Rollback: คืนโค้ดเว็บและ Apps Script เป็นรุ่นก่อน ชีต/คอลัมน์ใหม่คงไว้ได้ **แต่สินทรัพย์ใหม่ในโหมดเงินต้นที่ current_value ว่าง จะไม่ถูกนับครบในโค้ดเก่า** จึงควรใช้ backup หรือ reconcile มูลค่าก่อนย้อนรุ่น การย้อนโค้ดไม่ย้อนเงินในบัญชี
