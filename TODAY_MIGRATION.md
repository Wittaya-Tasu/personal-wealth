# Migration หน้า “วันนี้” — v2.7.0 ถึง v2.9.0

รุ่นนี้เพิ่ม Todo และ Habit โดยสร้างชีตใหม่ 3 ชีต ข้อมูลทั้งหมดแยกจากระบบการเงินและไม่กระทบยอด Account, Liability, Net Worth หรือกราฟ

## 1. ชีต Todos

สร้างชีตชื่อ `Todos` แล้วคัดลอกบรรทัดนี้ไปวางที่ A1:

```text
todo_id	date	category	task_text	is_important	is_completed	completed_at	created_at	updated_at	parent_todo_id
```

| Cell | Header |
|---|---|
| A1 | `todo_id` |
| B1 | `date` |
| C1 | `category` |
| D1 | `task_text` |
| E1 | `is_important` |
| F1 | `is_completed` |
| G1 | `completed_at` |
| H1 | `created_at` |
| I1 | `updated_at` |
| J1 | `parent_todo_id` |

ค่าประเภทที่ระบบใช้คือ `เรื่องงาน`, `เรื่องส่วนตัว` และ `โปรเจก` ส่วนสถานะดาว/เสร็จแล้วใช้ `Yes` หรือ `No`

`parent_todo_id` เว้นว่างสำหรับ Todo/โปรเจกหลัก และใช้เก็บ `todo_id` ของโปรเจกสำหรับ Todo ย่อย

## 2. ชีต Habits

สร้างชีตชื่อ `Habits` แล้วคัดลอกบรรทัดนี้ไปวางที่ A1:

```text
habit_id	habit_name	frequency	active	created_at	updated_at
```

| Cell | Header |
|---|---|
| A1 | `habit_id` |
| B1 | `habit_name` |
| C1 | `frequency` |
| D1 | `active` |
| E1 | `created_at` |
| F1 | `updated_at` |

ค่าความถี่ที่ระบบใช้:

| ค่าในชีต | ความหมาย |
|---|---|
| `Daily` | ทุกวัน |
| `Weekly` | ทุกสัปดาห์ จันทร์–อาทิตย์ |
| `Monthly` | ทุกเดือน |
| `Yearly` | ทุกปีปฏิทิน |

## 3. ชีต HabitLogs

สร้างชีตชื่อ `HabitLogs` แล้วคัดลอกบรรทัดนี้ไปวางที่ A1:

```text
habit_log_id	habit_id	period_key	completed_date	completed_at	created_at	updated_at
```

| Cell | Header |
|---|---|
| A1 | `habit_log_id` |
| B1 | `habit_id` |
| C1 | `period_key` |
| D1 | `completed_date` |
| E1 | `completed_at` |
| F1 | `created_at` |
| G1 | `updated_at` |

`period_key` ป้องกันการติ๊ก Habit เดียวกันซ้ำในรอบเดียว เช่น `2026-10-05`, `2026-W41`, `2026-10` หรือ `2026`

## 4. กติกาการทำงาน

- Todo/โปรเจกหลักผูกกับวันที่เริ่ม และงานที่ยังไม่เสร็จจะแสดงต่อในวันถัดไปโดยไม่สร้างแถวซ้ำ
- โปรเจกมี Todo ย่อยหนึ่งระดับ โดยงานย่อยอ้างอิงผ่าน `parent_todo_id`
- ติ๊ก Todo แล้วระบบเก็บสถานะและแสดงข้อความขีดฆ่า; เอาติ๊กออกได้
- ดาวใช้ระบุความสำคัญ และรายการสำคัญที่ยังไม่เสร็จจะอยู่ด้านบน
- Habit หนึ่งรายการมีหนึ่งความถี่ การติ๊กจะใช้ร่วมกันตลอดรอบนั้น
- ปุ่ม `พัก` ซ่อน Habit จากรายการใหม่ แต่ยังรักษาประวัติใน HabitLogs
- หากยังไม่สร้างชีตใด ระบบการเงินส่วนอื่นยังทำงานตามปกติ

## 5. ตรวจหลัง Deploy

1. เปิดเมนู `วันนี้` > `สิ่งที่ต้องทำ`
2. เพิ่ม Todo เรื่องงาน ใส่ดาว แล้วติ๊กให้เสร็จ ตรวจว่าข้อความถูกขีดฆ่า
3. เอาติ๊กออกและติ๊กใหม่ ตรวจว่าไม่เกิดแถวซ้ำ
4. เพิ่ม Habit ทุกวันและทุกสัปดาห์ แล้วติ๊กอย่างละหนึ่งรายการ
5. เปลี่ยนวันที่ภายในสัปดาห์เดียวกัน ตรวจว่า Habit รายสัปดาห์ยังแสดงว่าทำแล้ว
6. เปิด Google Sheet ตรวจว่า Todos, Habits และ HabitLogs มีข้อมูลตาม Header
