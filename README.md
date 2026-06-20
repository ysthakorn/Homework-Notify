# HW-to-LINE Notifier

ระบบเว็บแอปพลิเคชันจัดการการบ้านและแจ้งเตือนผ่าน **LINE Group** (Multi-Team Supported) พัฒนาด้วย Node.js, Express, LINE Messaging API และมีระบบซิงค์ข้อมูลกับ Google Sheets โครงสร้างโปรเจกต์เป็นแบบ **Monorepo** เพื่อให้ง่ายต่อการนำไปพัฒนาต่อ

---

## Features

- **Micro-Portal Architecture**
  - **Main Portal (Port 8080):** สำหรับครูและผู้ดูแลระบบในการสร้าง แจ้งเตือน และจัดการการบ้าน
  - **Student Portal (Port 8081):** สำหรับนักเรียนใช้ยื่นการบ้านใหม่เข้าสู่ระบบ (สถานะ Pending Approval)
  - **Push Portal (Port 8082):** ระบบ Web Push Notification สำหรับแจ้งเตือนผ่านเบราว์เซอร์
- **Multi-Team Support** จัดการหลายกลุ่มเรียน/หลายวิชา ได้ในระบบเดียว สามารถสลับทีมได้ทันทีผ่าน Dashboard
- **Google Sheet Integration** ดึงข้อมูลการส่งงานของนักเรียนจาก Google Sheet อัตโนมัติ พร้อมปุ่ม Sync ทันใจ
- **Code Red Service** ระบบ Background Worker ที่คอยรันตรวจสอบและแจ้งเตือนการบ้านด่วนที่กำลังจะถึงกำหนดส่งในอีก 24 ชั่วโมง
- **Zero-Trust Ready** ระบบ Main Portal รองรับการตรวจสอบสิทธิ์ผู้ใช้ผ่าน HTTP Headers ของ Cloudflare Access (อ่านอีเมลจาก `cf-access-authenticated-user-email`)
- **JSON Based** เก็บข้อมูลโดยใช้ไฟล์ `.json` ไม่ต้องพึ่งพา Database Engine ภายนอก ทำให้ติดตั้งและ Deploy ง่ายมาก

---

## Project Structure

โปรเจกต์ถูกจัดเก็บในรูปแบบ **Monorepo** โดยแบ่งแอปพลิเคชันย่อยไว้ในโฟลเดอร์ `apps/`:

```text
.
├── apps/
│   ├── main-portal/          # ระบบหลักสำหรับผู้ดูแลระบบ (Admin/Teacher)
│   ├── student-portal/       # ระบบสำหรับนักเรียน (ยื่นเพิ่มการบ้าน)
│   └── push-portal/          # ระบบแจ้งเตือน Web Push Notification
├── data/                     # ฐานข้อมูล JSON (ถูกตั้ง ignore ไว้เพื่อความปลอดภัย)
├── deployment/               # สคริปต์สำหรับการ Deploy (เช่น systemd)
├── package.json              # กำหนด Dependencies และ NPM Scripts
└── .env.example              # ไฟล์ตัวอย่างสำหรับการตั้งค่า Environment
```

---

## Getting Started

### 1. Prerequisites
- Node.js version 20 หรือใหม่กว่า
- บัญชี [LINE Developers](https://developers.line.biz/) (เพื่อใช้ Messaging API)

### 2. Installation
โคลนโปรเจกต์ลงมาที่เครื่องและติดตั้ง Dependencies:
```bash
git clone https://github.com/your-username/Homework-Notify-Project.git
cd Homework-Notify-Project
npm install
```

### 3. Environment Variables
คัดลอกไฟล์ตัวอย่างเพื่อสร้าง `.env` ของคุณเอง:
```bash
cp .env.example .env
```
*(สำหรับการใช้งานจริง ข้อมูลต่างๆ อย่างเช่น LINE Access Token ของแต่ละทีมจะถูกบันทึกลงในไฟล์ฐานข้อมูล JSON อัตโนมัติจากหน้าเว็บ Setup)*

### 4. Running the Portals Locally
ระบบถูกออกแบบให้แต่ละ Portal รันแยกกัน (คุณสามารถเปิด Terminal 3 หน้าจอเพื่อรันทุกพอร์ตพร้อมกันได้):

**โหมด Development (มีการทำ Hot-reload):**
```bash
npm run dev           # รัน Main Portal (พอร์ต 8080)
npm run dev:student   # รัน Student Portal (พอร์ต 8081)
npm run dev:push      # รัน Push Portal (พอร์ต 8082)
```

**โหมด Production:**
```bash
npm run start
npm run start:student
npm run start:push
```

---

## Data Storage
ระบบนี้จัดเก็บข้อมูลแบบ Local JSON Files ภายในโฟลเดอร์ `data/`:
- ข้อมูลผู้ใช้ ข้อมูลทีม และรายการการบ้าน จะถูกบันทึกที่นี่
- ระบบจะทำการสร้างไฟล์ `*.json` ให้โดยอัตโนมัติหากไม่พบไฟล์ในครั้งแรกที่รัน
- โฟลเดอร์ `data/` จะถูกละเว้น (Ignored) ออกจากการ Commit บน GitHub เพื่อป้องกันข้อมูลส่วนตัวหรือความลับของระบบหลุดออกสู่สาธารณะ

---

## Documentation
สำหรับข้อมูลเชิงลึก การตั้งค่า LINE API การซิงค์ Google Sheets หรือการตั้งค่าบน Production (Deploying) กรุณาอ่านต่อที่ [Doc.md](./Doc.md)

---

## License
โปรเจกต์นี้ใช้งานภายใต้ลิขสิทธิ์ [MIT License](./LICENSE)
