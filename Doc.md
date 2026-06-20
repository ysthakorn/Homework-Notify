# คู่มือการดูแลและบำรุงรักษาระบบ HW Notifier
# (Maintenance Guide)

> เอกสารนี้จัดทำขึ้นสำหรับผู้ดูแลระบบ เพื่อใช้เป็นคู่มืออ้างอิงในการตั้งค่า นำไปใช้งาน และบำรุงรักษาระบบ HW Notifier บนสถาปัตยกรรมแบบ Monorepo

---

## สารบัญ

1. [ภาพรวมระบบและสถาปัตยกรรม](#1-ภาพรวมระบบและสถาปัตยกรรม)
2. [โครงสร้าง Directory](#2-โครงสร้าง-directory-monorepo)
3. [การ Deploy และ Restart](#3-การ-deploy-และ-restart)
4. [โครงสร้างข้อมูล (Data Schema)](#4-โครงสร้างข้อมูล)
5. [API Reference](#5-api-reference)
6. [การตั้งค่าทีม (Team Configuration)](#6-การตั้งค่าทีม)
7. [การเชื่อมต่อ LINE](#7-การเชื่อมต่อ-line)
8. [การเชื่อมต่อ Google Form/Sheet](#8-การเชื่อมต่อ-google-formsheet)
9. [การ Backup & Restore](#9-การ-backup--restore)
10. [การแก้ปัญหาที่พบบ่อย (Troubleshooting)](#10-การแก้ปัญหาที่พบบ่อย)

---

## 1. ภาพรวมระบบและสถาปัตยกรรม

**HW Notifier** ถูกออกแบบด้วยสถาปัตยกรรมย่อย (Micro-Portals) ที่รวมกันอยู่ใน Monorepo เดียว ประกอบด้วย:

| Portal | หน้าที่ | พอร์ต | การป้องกัน |
|---|---|---|---|
| **Main Portal** | สร้างการบ้าน ส่งแจ้งเตือน ดูสรุปผล | 8080 | Cloudflare Access Header |
| **Student Portal** | ให้นักเรียนยื่นเพิ่มการบ้านเพื่อรอการอนุมัติ | 8081 | Public (เปิดสาธารณะ) |
| **Push Portal** | จัดการ Subscription และยิง Web Push | 8082 | Public / CORS |

```
┌────────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Browser      │──────▶│  Cloudflare  │──────▶│  Main Portal    │
│   (Admin)      │       │  Access      │       │  (Port 8080)    │
└────────────────┘       └──────────────┘       └───────┬─────────┘
                                                        │
                                             ┌──────────▼─────────┐
                                             │    Data (JSON)     │
┌────────────────┐                           │    - teams.json    │
│   Browser      │──────────────────────────▶│    - homework.json │
│   (Student)    │       (Port 8081)         │    - audit.json    │
└────────────────┘                           └──────────▲─────────┘
                                                        │
┌────────────────┐                           ┌──────────┴─────────┐
│ Service Worker │◀──────────────────────────│   Push Portal      │
│ (Web Push)     │       (Port 8082)         │   (Port 8082)      │
└────────────────┘                           └────────────────────┘
```

---

## 2. โครงสร้าง Directory (Monorepo)

ระบบทั้งหมดจะถูกบรรจุในโฟลเดอร์ `apps/` เพื่อให้ระดับ Root สะอาดและจัดการง่าย:

| Path | คำอธิบาย |
|---|---|
| `apps/main-portal/` | ระบบหลักสำหรับ Admin |
| ├── `server.js` | Entry point ของ Main Portal |
| ├── `services/` | Business logic ทั้งหมด รวมถึงจัดการฐานข้อมูล JSON |
| └── `views/` | หน้าเว็บ HTML ของระบบแอดมิน |
| `apps/student-portal/`| ระบบสำหรับนักเรียน |
| ├── `server.js` | Entry point ของ Student Portal |
| └── `routes.js` | จัดการ Routing และยืม Service จาก main-portal มาใช้งาน |
| `apps/push-portal/` | ระบบ Web Push Notification |
| ├── `server.js` | Entry point ของ Push Portal |
| └── `routes/` | API สำหรับรับ Subscription และส่งสัญญาณ VAPID |
| `data/` | Database แบบ Local File (.json) |
| `deployment/systemd/` | เก็บสคริปต์สำหรับการติดตั้ง Systemd Services |
| `package.json` | รันคำสั่งรวมสำหรับทุก Portal ที่ระดับ Root |

---

## 3. การ Deploy และ Restart

ระบบใช้ Node.js รันโดยตรง หากใช้งานบน Server จริงแนะนำให้ใช้ **Systemd** (ไฟล์ตัวอย่างมีอยู่ใน `deployment/systemd/`)

### การสั่งรัน Service ด้วย Systemd

```bash
# Restart Main Portal
sudo systemctl restart hwnotify.service

# Restart Student Portal
sudo systemctl restart hwnotify-student.service

# Restart Push Portal
sudo systemctl restart hwnotify-push.service
```

### การดู Log แบบ Real-time

```bash
sudo journalctl -u hwnotify.service -f
```

### เมื่อไหร่ที่ต้อง Restart ระบบ?
- เมื่อแก้ไขโค้ดที่อยู่ภายใต้โฟลเดอร์ `apps/*/services/` หรือ `apps/*/routes*/` 
- เมื่อแก้ไฟล์ `.env`
*(หมายเหตุ: การแก้ไขไฟล์ `.html`, `.css`, หรือ `.js` ที่อยู่ภายใต้โฟลเดอร์ `views/` สามารถทำงานได้ทันทีโดยแค่กด Refresh Browser)*

---

## 4. โครงสร้างข้อมูล

ฐานข้อมูลถูกเก็บไว้ในโฟลเดอร์ `data/` รูปแบบไฟล์ `.json`

### `data/teams.json` (ข้อมูลกลุ่มเรียน)
```jsonc
[
  {
    "id": "uuid",
    "name": "ชื่อวิชา/ทีม",
    "lineAccessTokens": [ { "token": "...", "remark": "..." } ],
    "lineGroupId": "...",
    "apiKey": "hw_xxxxxxxx",
    "owner": "admin@example.com",
    "students": [ { "name": "...", "email": "..." } ],
    "googleFormUrl": "...",
    "googleFormEntryId": "entry.123",
    "googleFormSubjectEntryId": "entry.456",
    "googleSheetCsvUrl": "..."
  }
]
```

### `data/homework.json` (รายการการบ้าน)
```jsonc
[
  {
    "id": "uuid",
    "teamId": "uuid-ของ-teams",
    "subject": "วิชา",
    "title": "หัวข้อ",
    "due": "2026-06-20T23:59",
    "status": "active", // หรือ pending_approval, rejected
    "submissions": {
      "ชื่อนักเรียน": {
        "submittedAt": "2026-06-14T15:37:55.210Z",
        "submittedBy": "email@example.com"
      }
    }
  }
]
```

### `data/push_subscriptions.json` (Web Push)
บันทึกข้อมูล Endpoint และ Keys จากเบราว์เซอร์ของ User เพื่อเอาไว้ยิง Notification 

---

## 5. API Reference (Main Portal)

### API ยอดนิยมสำหรับการบ้าน
- `GET /api/homework?teamId=xxx` : โหลดการบ้านของทีม
- `POST /api/homework` : สร้างการบ้านใหม่
- `PUT /api/homework/:hwId` : แก้ไขรายละเอียด
- `DELETE /api/homework/:hwId` : ลบการบ้าน
- `POST /api/homework/:hwId/submit` : บันทึกสถานะว่านักเรียนส่งงานแล้ว
- `POST /api/homework/sync` : อัปเดตสถานะการส่งงานอัตโนมัติจาก Google Sheets
- `POST /api/homework/:hwId/notify-summary` : ส่งแชทสรุปรายชื่อคนยังไม่ส่งเข้า LINE

---

## 6. การตั้งค่าทีม

ไปที่หน้า **Setup** (`/setup`) ใน Main Portal
- ข้อมูลสำคัญที่สุดคือ **LINE Access Token** และ **LINE Group ID**
- ใส่ URL ของ Google Form และ Google Sheet (CSV) หากต้องการใช้งานระบบกดปุ่มเพื่อ Sync ยอดคนส่งงานอัตโนมัติ

---

## 7. การเชื่อมต่อ LINE

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Channel ประเภท **Messaging API**
3. สร้างและคัดลอก **Channel Access Token (Long-lived)**
4. เอา Bot ดึงเข้ากลุ่ม LINE ที่ต้องการ และคัดลอก **Group ID** ของกลุ่มนั้นมาตั้งค่าในระบบ
*(ข้อความที่ระบบส่งให้จะอยู่ในรูปแบบ Flex Message ที่สวยงามและมีปุ่มกดอ่านรายละเอียดได้)*

---

## 8. การเชื่อมต่อ Google Form/Sheet

### หา Entry ID จาก Form
1. ไปที่เมนู "Get pre-filled link" ใน Google Form
2. พิมพ์ข้อมูลสมมติลงไปแล้วเอา URL ที่สร้างขึ้นมาดู จะเห็นคำว่า `entry.XXXXXXXXX=ค่าสมมติ` 
3. เอาเลข Entry ID นี้มาใส่ในระบบ เพื่อให้ระบบสามารถส่ง URL ที่กรอกวิชาและชื่องานไว้ล่วงหน้าให้เด็กได้

### แชร์ข้อมูลจาก Sheet ไปยังระบบ
1. เปิด Google Sheet ที่รับข้อมูลจาก Form
2. ไปที่ File -> Share -> **Publish to web**
3. เลือกเฉพาะ Sheet นั้น และเลือกฟอร์แมตเป็น **CSV**
4. เอาลิงก์ที่ได้มาวางในระบบ HW Notifier

---

## 9. การ Backup & Restore

### Backup
ข้อมูลการบ้านทั้งหมดถูกเซฟลงฮาร์ดดิสก์ตรงๆ ในโฟลเดอร์ `data/` คุณสามารถสำรองข้อมูลได้อย่างง่ายดายโดยการคัดลอกโฟลเดอร์นี้:
```bash
cp -r /path/to/project/data /path/to/backup/data_$(date +%Y%m%d)
```

### Restore
แค่นำไฟล์ `.json` กลับมาทับในโฟลเดอร์ `data/` แล้วกด Restart Service:
```bash
sudo systemctl restart hwnotify.service
```

---

## 10. การแก้ปัญหาที่พบบ่อย

**Q: หน้าเว็บ Error หรือโหลดไม่ขึ้น?**
A: ตรวจสอบ Log ของ Node โดยรัน `sudo journalctl -u hwnotify.service -n 50`

**Q: สั่งรัน npm run dev ไม่ได้ หา path ไม่เจอ?**
A: ตรวจสอบให้แน่ใจว่าคุณสั่งคำสั่ง `npm` ที่หน้า Root ของโฟลเดอร์ (ที่มีไฟล์ `package.json` อยู่) ไม่ใช่ข้างในโฟลเดอร์ `apps/`

**Q: ส่งข้อความเข้า LINE ไม่ได้?**
A: อาจเกิดจาก Token ผิดหมดอายุ หรือ Bot ไม่ได้อยู่ในกลุ่ม ลองเข้าไปดูใน Audit Logs หน้า `/admin` ของระบบ จะมีแจ้ง Error Code จากเซิร์ฟเวอร์ LINE โดยตรง
