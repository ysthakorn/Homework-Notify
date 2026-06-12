<div align="center">

# HW-to-LINE Notifier

**ระบบแจ้งเตือนการบ้านผ่าน LINE Group (Multi-Team Supported)**  
สร้างด้วย Node.js, Express, LINE Messaging API, และ Google Sheets

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![LINE](https://img.shields.io/badge/LINE-Messaging%20API-00C300?logo=line&logoColor=white)](https://developers.line.biz/)

</div>

---

## Features

- **Multi-Team Support** — รองรับการจัดการหลายทีมในระบบเดียว สลับทีมได้ทันทีผ่านหน้าเว็บ
- **Developer-focused UI** — หน้าตา Dashboard ดูทันสมัย รองรับการเปลี่ยน Theme (Light/Dark Mode และ Accent Colors) แบบ Real-time
- **Access Control & Identity** — 
  - รองรับ Cloudflare Access (อ่านอีเมลผู้ใช้จาก Header)
  - ระบบ Team Ownership และ Team Members (แชร์สิทธิ์ให้คนอื่นในทีม)
  - ระบบล็อกรหัสผ่าน (Team Password Lock) สำหรับบุคคลภายนอก
- **Admin Panel & Audit Logs** — แผงควบคุมสำหรับผู้ดูแลระบบ สามารถดูประวัติการส่งการบ้าน (Audit Logs) และข้ามการป้องกันรหัสผ่านของทุกทีมได้
- **Web-based Setup** — แก้ไขค่าตั้งค่า (LINE Token, Group ID, Google Sheet) ของแต่ละทีมได้จากหน้าเว็บโดยตรง ไม่ต้องแก้ไฟล์
- **Google Sheet Integration** — โหลดรายการจากการบ้านจาก Google Sheet พร้อมปุ่ม "ส่งแถวนี้"
- **LINE Push Message** — ส่งข้อความเข้า LINE Group ผ่าน Messaging API ด้วย Template ที่สวยงาม

---

## Project Structure

```
.
├── package.json
└── src/
    ├── app.js              # Express app setup & middleware
    ├── server.js           # Server entry point (listen)
    ├── config/
    │   └── env.js          # Environment variables & Global defaults
    ├── routes/
    │   └── notifyRoutes.js # All route handlers (API & Views)
    ├── services/
    │   ├── auditService.js # ระบบบันทึกประวัติการใช้งาน
    │   ├── envService.js   # อ่าน/เขียนไฟล์ config
    │   ├── lineClient.js   # LINE Messaging API client
    │   ├── messageBuilder.js # สร้างข้อความแจ้งเตือน + parse วันที่
    │   ├── sheetService.js # โหลด & parse CSV จาก Google Sheet
    │   └── teamService.js  # จัดการฐานข้อมูลและสิทธิ์ของ Teams
    └── views/
        ├── index.html      # Dashboard (ฟอร์มส่งแบบ Manual)
        ├── sheet.html      # ตารางข้อมูลจาก Google Sheet
        ├── setup.html      # หน้าตั้งค่าทีมและสมาชิก (ACL)
        ├── admin.html      # แผงควบคุมสำหรับผู้ดูแลระบบ
        ├── docs.html       # API documentation
        ├── status.html     # System status
        └── assets/         # CSS และ JS ฝั่ง Frontend ทั้งหมด
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the server

```bash
npm start
```

For development mode (auto reload with `--watch`):

```bash
npm run dev
```

เปิด **http://localhost:8080** ในเบราว์เซอร์

### 3. Configure Teams

แทนที่จะตั้งค่าในไฟล์ `.env` ระบบใหม่ให้คุณเข้าไปที่เมนู **Setup** ผ่านหน้าเว็บ เพื่อกรอกค่าต่างๆ (LINE Token, Group ID, Google Sheet URL) ของแต่ละทีมแยกกัน ระบบจะบันทึกข้อมูลลงไฟล์ JSON โดยอัตโนมัติ

---

## Google Sheet Integration

ใส่ URL แบบ CSV export ลงในหน้า Setup (หัวข้อ Google Sheet CSV URL) แล้วระบบจะโหลดรายการจาก Sheet อัตโนมัติ พร้อมปุ่ม "ส่งแถวนี้"

### รองรับชื่อคอลัมน์แบบยืดหยุ่น

ระบบจะจับคู่ชื่อคอลัมน์ใน Sheet กับฟิลด์ต่อไปนี้ (case-insensitive):

| Field | Accepted Column Names |
|---|---|
| **subject** | `subject`, `subject_name`, `วิชา` |
| **title** | `title`, `topic`, `หัวข้อ`, `งาน` |
| **detail** | `detail`, `description`, `รายละเอียด` |
| **due** | `due`, `due_date`, `date`, `กำหนดส่ง`, `วันที่` |

---

## HTTP API Usage

คุณสามารถยิง API จากระบบภายนอก (เช่น cURL, Postman) ได้ โดยต้องแนบ Header ยืนยันตัวตนของทีมนั้นๆ

### Team Authentication Headers

ถ้าทีมมีการล็อครหัสผ่าน:
`X-Team-Password: YOUR_TEAM_PASSWORD`

ถ้าต้องการระบุ Team ID (ใน Query หรือ Body):
`teamId=YOUR_TEAM_ID`

---

## Admin Panel & Cloudflare Access

ระบบถูกออกแบบมาให้รองรับการนำไปใช้คู่กับ **Cloudflare Access (Zero Trust)**
โดยระบบจะอ่าน HTTP Headers ต่อไปนี้เพื่อยืนยันตัวตน:
- `Cf-Access-Authenticated-User-Email`
- `Cf-Access-Jwt-Assertion` (เพื่อถอดรหัสชื่อ)

อีเมลที่ถูกกำหนดเป็น Admin ในโค้ดจะสามารถเข้าถึงหน้า `/admin` ได้เพื่อดู Audit Logs และเจาะเข้าระบบของทีมอื่นๆ ได้ทันที
