<div align="center">

# 📚 HW-to-LINE Notifier

**ระบบแจ้งเตือนการบ้านผ่าน LINE Group**  
สร้างด้วย Node.js · Express · LINE Messaging API · Google Sheets

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![LINE](https://img.shields.io/badge/LINE-Messaging%20API-00C300?logo=line&logoColor=white)](https://developers.line.biz/)

</div>

---

## ✨ Features

- 💻 **Developer-focused UI** — หน้าตา Dashboard แบบ Dark Theme (Coolify-inspired) พร้อม Sidebar Navigation รองรับมือถือ
- 📋 **Dashboard** — ส่งข้อความแจ้งเตือนการบ้านผ่านฟอร์ม หรือเลือกจาก Google Sheet
- ⚙️ **Web-based Env Editor** — แก้ไขค่าตั้งค่า (`.env`) ได้จากหน้าเว็บโดยตรง ไม่ต้องแก้ไฟล์เอง
- 📊 **Google Sheet Integration** — โหลดรายการจาก Sheet พร้อมปุ่ม "ส่งแถวนี้" สำหรับทุกแถว
- 💬 **LINE Push Message** — ส่งข้อความเข้า LINE Group ผ่าน Messaging API
- 📅 **รองรับปี พ.ศ.** — แปลง พ.ศ. (> 2400) → ค.ศ. อัตโนมัติ
- 🕐 **รองรับเวลา** — รูปแบบวันที่ `DD/MM/YYYY` หรือ `DD/MM/YYYY HH:MM`

---

## 📁 Project Structure

```
.
├── package.json
├── .env.example
└── src/
    ├── app.js              # Express app setup & middleware
    ├── server.js            # Server entry point (listen)
    ├── config/
    │   └── env.js           # Environment variables
    ├── routes/
    │   └── notifyRoutes.js  # All route handlers
    ├── services/
    │   ├── envService.js    # อ่าน/เขียนไฟล์ .env
    │   ├── lineClient.js    # LINE Messaging API client (push)
    │   ├── messageBuilder.js # สร้างข้อความแจ้งเตือน + parse วันที่
    │   └── sheetService.js  # โหลด & parse CSV จาก Google Sheet
    └── views/
        ├── index.html       # Dashboard (ฟอร์ม + ตาราง Sheet)
        ├── setup.html       # Setup guide
        ├── docs.html        # API documentation
        ├── status.html      # System status
        └── assets/
            ├── styles.css   # Stylesheet
            ├── dashboard.js # Dashboard logic
            ├── setup.js     # Env editor logic
            └── status.js    # Status page logic
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

คุณสามารถตั้งค่าได้ 2 วิธี:
1. **ผ่านหน้าเว็บ (แนะนำ)** — รันเซิร์ฟเวอร์ก่อน แล้วไปที่หน้า `/setup` เพื่อกรอกค่าผ่าน UI (บันทึกแล้วระบบจะสร้าง/อัปเดตไฟล์ `.env` ให้อัตโนมัติและใช้งานได้ทันที)
2. **สร้างไฟล์ `.env` เอง** — คัดลอกไฟล์ `.env.example` เป็น `.env` แล้วแก้ไขค่า:

| Variable | Description | Default |
|---|---|---|
| `LINE_ACCESS_TOKEN` | LINE Messaging API access token | `YOUR_TOKEN_HERE` |
| `LINE_GROUP_ID` | LINE group ID ที่จะส่งข้อความ | `YOUR_GROUP_ID_HERE` |
| `PORT` | พอร์ตสำหรับ server | `8080` |
| `LINE_REQUEST_TIMEOUT_SEC` | timeout สำหรับ request (วินาที) | `10` |
| `GOOGLE_SHEET_CSV_URL` | URL สำหรับ export CSV จาก Google Sheet | _(empty)_ |

> [!TIP]
> **Google Sheet CSV URL format:**
> ```
> https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0
> ```

<details>
<summary>ตัวอย่าง: ตั้งค่าผ่าน PowerShell</summary>

```powershell
$env:LINE_ACCESS_TOKEN="YOUR_TOKEN_HERE"
$env:LINE_GROUP_ID="YOUR_GROUP_ID_HERE"
$env:PORT="8080"
$env:LINE_REQUEST_TIMEOUT_SEC="10"
$env:GOOGLE_SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0"
```

</details>

### 3. Run the server

```bash
npm start
```

For development mode (auto reload with `--watch`):

```bash
npm run dev
```

เปิด **http://localhost:8080** ในเบราว์เซอร์

---

## 🌐 Pages

| Path | Description |
|---|---|
| `/` | 📋 Dashboard — ฟอร์มส่งการบ้านแบบกำหนดเอง |
| `/sheet` | 📊 Google Sheet — ตารางคิวการบ้านจาก Google Sheet |
| `/setup` | ⚙️ Setup — แก้ไข .env ได้จากหน้าเว็บ |
| `/docs` | 📖 API documentation |
| `/status` | 📊 System status |

---

## 📊 Google Sheet Integration

ใส่ URL แบบ CSV export ลงใน `GOOGLE_SHEET_CSV_URL` แล้วหน้า Dashboard จะโหลดรายการจาก Sheet อัตโนมัติ พร้อมปุ่ม **"ส่งแถวนี้"** รายละแถว

### รองรับชื่อคอลัมน์แบบยืดหยุ่น

ระบบจะจับคู่ชื่อคอลัมน์ใน Sheet กับฟิลด์ต่อไปนี้ (case-insensitive):

| Field | Accepted Column Names |
|---|---|
| **subject** | `subject`, `subject_name`, `วิชา` |
| **title** | `title`, `topic`, `หัวข้อ`, `งาน` |
| **detail** | `detail`, `description`, `รายละเอียด` |
| **due** | `due`, `date`, `deadline`, `กำหนดส่ง`, `วันที่` |

### ตัวอย่างข้อมูล CSV

```csv
subject,title,detail,date
คณิตศาสตร์,แบบฝึกหัดบทที่ 3,ทำข้อ 1-20,22/04/2569
```

> [!NOTE]
> ระบบจะแปลงปี พ.ศ. (> 2400) เป็น ค.ศ. อัตโนมัติ และรองรับรูปแบบเวลาด้วย เช่น `22/04/2569 16:30`

---

## 🔌 API Endpoints

### Pages

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Dashboard (HTML) |
| `GET` | `/sheet` | Google Sheet Queue (HTML) |
| `GET` | `/setup` | Setup guide (HTML) |
| `GET` | `/docs` | API docs (HTML) |
| `GET` | `/status` | System status (HTML) |

### API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/config` | ดึง config (เช่น มี Google Sheet หรือไม่) |
| `GET` | `/api/env` | อ่านค่า .env ปัจจุบัน |
| `PUT` | `/api/env` | เขียนค่า .env ใหม่ (reload ทันที) |
| `GET` | `/api/sheet-rows` | โหลดแถวจาก Google Sheet CSV |
| `POST` | `/notify` | ส่งข้อความแจ้งเตือนการบ้านไปยัง LINE Group |
| `POST` | `/notify-row` | ส่งแถวที่เลือกจาก Sheet ไปยัง LINE Group |

---

### `GET /health`

```json
{ "ok": true }
```

### `GET /api/config`

```json
{ "hasGoogleSheet": true }
```

### `GET /api/env`

```json
{
  "ok": true,
  "values": {
    "LINE_ACCESS_TOKEN": "...",
    "LINE_GROUP_ID": "...",
    "PORT": "8080",
    "LINE_REQUEST_TIMEOUT_SEC": "10",
    "GOOGLE_SHEET_CSV_URL": "..."
  }
}
```

### `PUT /api/env`

**Request body:**

```json
{
  "LINE_ACCESS_TOKEN": "NEW_TOKEN",
  "LINE_GROUP_ID": "NEW_GROUP",
  "PORT": "8080",
  "LINE_REQUEST_TIMEOUT_SEC": "10",
  "GOOGLE_SHEET_CSV_URL": "..."
}
```

**Response:** `{ "ok": true }`

### `GET /api/sheet-rows`

**Response (success):**

```json
{
  "ok": true,
  "rows": [
    { "rowId": 1, "subject": "คณิตศาสตร์", "title": "แบบฝึกหัด", "detail": "ข้อ 1-20", "due": "22/04/2569" }
  ]
}
```

**Response (error):**

```json
{ "error": "GOOGLE_SHEET_CSV_URL is not configured" }
```

### `POST /notify`

**Request body:**

```json
{
  "subject": "คณิตศาสตร์",
  "title": "แบบฝึกหัดบทที่ 3",
  "detail": "ทำข้อ 1-20",
  "due": "22/04/2569"
}
```

**Response:** `{ "ok": true }`

### `POST /notify-row`

**Request body:** — เหมือน `/notify` (fields: `subject`, `title`, `detail`, `due`/`date`)

**Response:** `{ "ok": true }`

---

### 💬 ตัวอย่างข้อความใน LINE

```
📢 การบ้านใหม่มาแล้ว!
━━━━━━━━━━━━━━
📘 วิชา: คณิตศาสตร์
📌 หัวข้อ: แบบฝึกหัดบทที่ 3
📝 รายละเอียด: ทำข้อ 1-20
⏳ ส่งวันที่: 22/04/2026 @ 00:00
━━━━━━━━━━━━━━
```

---

## 📄 License

This project is for educational purposes.
