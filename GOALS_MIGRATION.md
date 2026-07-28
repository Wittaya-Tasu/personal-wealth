# Goals Migration — v2.2.0

Migration นี้เพิ่มความสามารถ Goal แบบผูกบัญชีและ Goal แบบ Milestone โดยไม่ลบหรือเปลี่ยนข้อมูลเดิม

## ก่อนเริ่ม

1. เปิด Google Sheet ของ Personal Wealth
2. ไปที่ `File > Make a copy` เพื่อสำรองข้อมูล
3. เปิดชีต `Goals`
4. ตรวจว่า Header เดิมในแถว 1 เป็นดังนี้:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `goal_id` | `goal_name` | `target_amount` | `current_amount` | `deadline` | `note` |

ถ้า Header เดิมไม่ตรง ให้หยุดและตรวจไฟล์รุ่นที่ใช้อยู่ก่อน ห้ามแทรกคอลัมน์กลางตาราง

## เพิ่ม Header ใหม่

เพิ่มข้อความต่อท้ายแถว 1 โดยไม่แทรกคอลัมน์:

| Cell | Header |
|---|---|
| G1 | `goal_type` |
| H1 | `progress_source` |
| I1 | `linked_account` |
| J1 | `status` |

เมื่อเสร็จแล้ว Header ทั้งแถวต้องเป็น:

```text
goal_id, goal_name, target_amount, current_amount, deadline, note, goal_type, progress_source, linked_account, status
```

สะกดด้วยตัวพิมพ์เล็กและเครื่องหมายขีดล่างตามนี้ทุกตัว ห้ามมีช่องว่างหัวหรือท้าย

## ข้อมูล Goal เดิม

ไม่ต้องกรอกคอลัมน์ G–J ให้แถวเดิม ระบบจะตีความเป็น:

```text
goal_type = Financial
progress_source = Manual
```

จึงยังใช้ `target_amount` และ `current_amount` เดิมตามปกติ

## ค่าที่ WebApp ใช้

| Header | ค่าที่ระบบบันทึก |
|---|---|
| `goal_type` | `Financial` หรือ `Milestone` |
| `progress_source` | `Manual`, `Account` หรือ `Status` |
| `linked_account` | ชื่อจาก `Accounts.account_name` เมื่อเลือก Account |
| `status` | `Not Started`, `In Progress` หรือ `Completed` |

ไม่จำเป็นต้องพิมพ์ค่าเหล่านี้เอง ให้เพิ่ม Header แล้วใช้ฟอร์มใน WebApp

## ทดสอบหลัง Deploy

ใช้ข้อมูลทดสอบที่ไม่ใช่ข้อมูลการเงินจริง:

1. สร้าง Goal การเงินเป้าหมาย 100 บาท แบบ Manual ยอดสะสม 1 บาท
2. ตรวจว่าแสดง 1%
3. แก้ Goal ให้ติดตามจาก Account ทดสอบ
4. ตรวจว่ายอดสะสมเปลี่ยนเป็น `Accounts.balance` ของบัญชีนั้น
5. สร้าง Milestone ชื่อ `ทดสอบ Goal` สถานะ `กำลังดำเนินการ`
6. แก้เป็น `สำเร็จแล้ว`
7. ลบ Goal ทดสอบทั้งสองรายการ

การเพิ่ม แก้ หรือลบ Goal ไม่ควรเปลี่ยนยอด Account, Transaction หรือ Investment

## Rollback

ถ้าย้อน Code กลับ v2.1.1 สามารถคงคอลัมน์ G–J ไว้ได้ รุ่นเดิมจะอ่าน Header เพิ่มแต่ไม่ใช้ค่าเหล่านี้ ไม่ต้องลบคอลัมน์และไม่ต้องย้ายข้อมูลเดิม
