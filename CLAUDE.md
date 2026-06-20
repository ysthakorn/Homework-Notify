# AI Context: Homework-Notify (HW Notifier)

**IMPORTANT INSTRUCTIONS FOR AI (CLAUDE / ChatGPT / etc.):**
If you are reading this file, you have just been initialized into the Homework-Notify project workspace. This document serves as your "memory block" to catch you up on the current state, architecture, and quirks of this specific codebase.

## 1. Project Overview & Architecture

A **tri-service** Node.js application for managing homework, tracking submissions, and sending notifications. Uses a file-based JSON database (`/data/*.json`).

**Architecture (Three Services):**
- **Admin/Teacher Portal (`hwnotify.service`):** Port **8080** — `src/server.js`. Teachers create homework, approve requests, view dashboard.
- **Student Portal (`hwnotify-student.service`):** Port **8081** — `student-portal/server.js`. Students submit new homework requests (→ `pending_approval` state).
- **Push Portal (`hwnotify-push.service`):** Port **8082** — `push-portal/server.js`. Web Push Notifications as LINE fallback when monthly limit is hit.

## 2. Key Directories & Mappings

```
Homework-Notify/
├── src/                         # Admin Portal (Port 8080)
│   ├── server.js                # Entry point
│   ├── app.js                   # Express app + middleware
│   ├── config/env.js            # Global env config singleton
│   ├── routes/notifyRoutes.js   # All routes (monolithic)
│   └── services/
│       ├── homeworkService.js   # CRUD — filters out pending_approval
│       ├── teamService.js       # Team config, LINE tokens, students
│       ├── codeRedService.js    # Cron: warns for homework due in 24h
│       ├── auditService.js      # Audit log read/write
│       ├── lineClient.js        # LINE Messaging API push
│       ├── messageBuilder.js    # Build LINE Flex/Text messages
│       ├── formSyncService.js   # Sync submissions from Google Sheet CSV
│       └── envService.js        # Read/write .env file
│
├── student-portal/              # Student Portal (Port 8081)
│   ├── server.js
│   └── routes.js
│
├── push-portal/                 # Push Portal (Port 8082) — NEW
│   ├── server.js
│   ├── routes/
│   │   ├── pages.js             # HTML views
│   │   ├── subscribe.js         # Subscribe/Unsubscribe API
│   │   └── push.js              # Internal broadcast endpoint
│   └── services/
│       ├── subscriptionService.js
│       └── pushService.js
│
├── data/                        # JSON database (no external DB)
│   ├── teams.json
│   ├── homework.json
│   ├── audit.json
│   ├── code_red_log.json
│   └── push_subscriptions.json
│
├── scripts/                     # One-off maintenance scripts (not in production path)
├── hwnotify.service             # systemd service files (all at root)
├── hwnotify-student.service
├── hwnotify-push.service
└── package.json                 # npm scripts for all 3 services
```

## 3. Critical Quirks & Rules (MUST READ)

1. **NVM Pathing**: Node is at `/home/remote/.nvm/versions/node/v20.20.2/bin/node`. Use this absolute path in all systemd `ExecStart` lines.
2. **Systemctl**: `sudo systemctl restart hwnotify.service | hwnotify-student.service | hwnotify-push.service`. Ask user to run — AI cannot use sudo.
3. **Cloudflare Access**: Admin Portal (8080) reads `cf-access-authenticated-user-email` header. Missing header → mocked as `admin@local.dev` for local dev. Student & Push portals are public.
4. **No Database Engine**: All data in `/data/*.json`. Use `fs.readFileSync` / `fs.writeFileSync`. Do NOT use MongoDB/MySQL/Postgres.
5. **No PDF Generation**: PDF export was removed. Dashboard uses Chart.js (Pie + Bar charts).
6. **Code Red Service**: Toggled via `team.config.codeRedEnabled`. Background cron for 24h homework warnings.
7. **Push Secret**: Admin Portal calls Push Portal with `X-Push-Secret` header (from `PUSH_SECRET` env var) for internal auth.
8. **Theme System**: All portals use the same CSS variables and `theme.js` (Dark/Light/System + accent colors). localStorage keys: `theme-mode`, `theme-color`.

## 4. Current State (As of Last Handoff)

- **Student Portal UI**: Dark mode, custom dropdowns, CSS animations — polished.
- **Pending Approval Workflow**: Students submit → `pending_approval` → Teachers approve → `active` (with LINE + Push notification).
- **Code Red**: Active, sends LINE notifications for near-deadline homework.
- **Push Portal**: Fully functional. Subscribers can filter by team. Fires on every homework send/approve, even if LINE fails.
- **Theme**: Dark/Light/color theme system works across all 3 portals with shared localStorage keys.
- **Timezone**: All three `server.js` files set `process.env.TZ = "Asia/Bangkok"` at the very top.

## 5. Next Steps

When the user prompts you, rely on this file and `Doc.md` to understand context before making sweeping changes. Stick to Vanilla JS/CSS for frontend. Update JSON schema safely if adding new features (add migration in `teamService.js → readTeams()`).
