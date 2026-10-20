# Implementation Plan: Comprehensive Installation & User Guides

Comprehensive documentation suite delivering two distinct, production-grade markdown guides: `installation.md` (exact current runtime environment, database orchestration, configuration, and self-hosted deployment) and `user_guide.md` (complete end-user manual covering all 7 IT dashboard modules, vendors, invoices, notes, and admin workflows), complete with system architecture diagrams and file structure mapping.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed with the user via interactive clarification:
> - **Current Environment Target**: `installation.md` will document the exact current runtime environment (Node.js 22, Express + Vite middleware, MariaDB 10.11 relational database with socket/TCP access, automated `start-db.sh` lifecycle script, and environment variable configuration).
> - **User Guide Depth**: `user_guide.md` will provide a comprehensive, end-to-end walkthrough of all 7 IT dashboard modules plus vendor, invoice, meeting notes, and administrative capabilities.
> - **Architecture & Structure**: Detailed ASCII box-drawing diagrams modeling the full system architecture (Client -> Express Proxy/API -> MariaDB Database & Storage) paired with a complete file directory map explaining every major component.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. `installation.md`: A complete dev-ops and setup manual documenting the actual AI Studio runtime environment, local Linux/macOS setup, MariaDB initialization, environment variable security, and production self-hosting with reverse proxies.
  2. `user_guide.md`: An exhaustive operator manual guiding end users, IT managers, and administrators through every feature of the platform with zero placeholder content.
- **Target Audience**:
  - Developers and DevOps engineers maintaining or deploying the application.
  - IT Directors, System Administrators, and Helpdesk Specialists managing assets, cloud subscriptions, staffing, incidents, and vendor billing.
- **Key Value**: Provides clear, authoritative documentation for running, maintaining, and navigating the entire full-stack enterprise IT management suite.

---

## 2. Document Specifications & Visual Architecture

### 2.1 Full ASCII Architecture Diagram (Included in Documentation)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Browser)                               │
│  React 19 SPA · React Router (HashRouter) · Tailwind CSS · Lucide Icons · Recharts     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / JSON API & Static Bundles (Port 3000)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SERVER LAYER (Node.js 22)                            │
│  Express 4 · Vite Dev Middleware (dev) / Static Dist (prod) · Multer File Uploads       │
│                                                                                        │
│  ┌───────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │    Authentication     │  │   Dashboard & Analytics │  │  Operations & Logistics  │ │
│  │  /api/auth/* (JWT)    │  │  /api/it-dashboard      │  │  /api/assets             │ │
│  │  Bcrypt Hash Verify   │  │  /api/cloud-subscript.  │  │  /api/helpdesk           │ │
│  │  Role Authorization   │  │  /api/expenses          │  │  /api/staffing           │ │
│  └───────────────────────┘  └─────────────────────────┘  └──────────────────────────┘ │
│  ┌───────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────┐ │
│  │    Invoicing & CRM    │  │   Knowledge & Notes     │  │  Automations & Exports   │ │
│  │  /api/vendors         │  │  /api/notes             │  │  PDF Report Generation   │ │
│  │  /api/invoices        │  │  /api/templates         │  │  Telegram Bot (node-cron)│ │
│  └───────────────────────┘  └─────────────────────────┘  └──────────────────────────┘ │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ MySQL2 Connection Pool (Port 3306 / Socket)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                DATABASE LAYER (MariaDB 10.11+)                         │
│  Databases: `ainotes` / `ainotes_db`                                                   │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Core Tables:                                                                    │  │
│  │  · it_cloud_subscriptions (10 Active Services: AWS, Azure, Google Cloud, etc.)   │  │
│  │  · it_assets (Hardware, Serial Numbers, Warranty, Status, Assigned Techs)        │  │
│  │  · it_helpdesk (Incident Tickets, Priorities, SLA Tracking, Timestamps)          │  │
│  │  · it_staffing (Technician Profiles, Monthly Shifts, Performance Scores)         │  │
│  │  · it_sites (Multi-Hospital & Clinic Locations, Geo Metadata)                    │  │
│  │  · it_expenses (Monthly IT Budgets vs Actual Expenditures)                       │  │
│  │  · vendors & invoices (Procurement, Terms, Currency, Payment Status)             │  │
│  │  · notes & note_templates (Meeting Agendas, Markdown Content, Attachments)       │  │
│  │  · users (System Credentials, Admin/User Roles, Security Tokens)                 │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Complete Codebase File Map

```
/
├── App.tsx                    # Top-level client routing (HashRouter), AuthProvider, ProtectedRoute definitions
├── index.html                 # HTML5 entry shell with viewport meta, fonts, and root container
├── index.tsx                  # React DOM client mounting point
├── package.json               # Package definitions, scripts ("dev", "build", "start")
├── server.ts                  # Unified Express full-stack server: Vite middleware, API routes, DB pool, Cron
├── start-db.sh                # Container database lifecycle orchestrator: packages, daemon, schemas, seeds
├── ainotes_db.sql             # SQL schema definitions and initial seed dataset for all enterprise tables
├── .env.example               # Template environment configuration (MySQL credentials, JWT, Telegram)
├── .mariadb-debs/             # Persistent local offline Debian cache for rapid database restoration
│
├── pages/
│   ├── auth/                  # Authentication pages: SignIn, SignUp, ForgotPassword, ResetPassword
│   └── dashboard/
│       ├── ITDashboard.tsx    # Master multi-tab operations center (KPIs, site filtering, PDF exports)
│       ├── ExecutiveSummaryModule.tsx  # Executive overview: cross-module rollups & analytics
│       ├── CloudSubscriptionsModule.tsx # Cloud & SaaS subscription management, currency conversion
│       ├── AssetsModule.tsx   # Hardware/Software asset inventory tracking and lifecycle management
│       ├── SettingsModule.tsx # Multi-site configuration (Main Hospital, Clinics, Departments)
│       ├── VendorList.tsx     # 3rd-party vendor CRM, contact information, service agreements
│       ├── InvoicesList.tsx   # Procurement invoice ledger, payment tracking, total spend
│       ├── CreateInvoice.tsx  # Dynamic invoice creation & editing with line items and tax
│       ├── MyNotes.tsx        # IT Meeting notes, documentation, search, and categorization
│       ├── CreateNote.tsx     # Rich note authoring with priority, venue, tags, and file attachments
│       ├── SingleNote.tsx     # Full-view note presentation with export and sharing
│       ├── Account.tsx        # User profile, role badges, and credential management
│       └── Settings.tsx       # System preferences and integration controls
│
├── components/
│   ├── Sidebar.tsx            # Responsive desktop/mobile navigation sidebar with active route states
│   ├── auth/                  # Authentication guards (ProtectedRoute)
│   └── ui/                    # Reusable design components (Button, Modal, StatCard, Badge, Dropdown)
│
├── context/
│   └── AuthContext.tsx        # Global user authentication state, token storage, and session lifecycle
│
├── services/
│   ├── noteService.ts         # Client API connector for note management
│   ├── storageService.ts      # Local client caching and persistence helpers
│   └── mockService.ts         # Fallback data provider for standalone preview
│
└── uploads/                   # Server-side file attachment storage for invoices and note documents
```

---

## 3. Plan Deliverables & Detailed Structure

### File 1: `installation.md`
1. **System Overview & Runtime Stack**:
   - Node.js 22 LTS, npm, Express 4.x
   - Vite 6 dev server integrated directly via Express middleware
   - MariaDB 10.11+ server with local socket communication and TCP fallback
   - Persistent offline package cache (`.mariadb-debs/`)
2. **Environment Configuration**:
   - Detailed breakdown of `.env` variables (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
   - Security best practices (JWT secret generation, MySQL user isolation)
3. **Step-by-Step Installation**:
   - Step 1: Clone and dependency installation (`npm install`)
   - Step 2: Database setup (automated via `bash ./start-db.sh` or manual schema import `mysql -u root -p < ainotes_db.sql`)
   - Step 3: Launching the development server (`npm run dev`) on port 3000
   - Step 4: Production build (`npm run build`) and start (`npm start`)
4. **Nginx Reverse Proxy & Cloud Run Deployment**:
   - Production Nginx virtual host configuration (`proxy_pass http://127.0.0.1:3000`)
   - Port 8080 container gateway mapping
5. **Troubleshooting Guide**:
   - Handling MariaDB socket errors (`Can't connect to local MySQL server`)
   - Resolving port 3000/8080 collisions
   - Package manager conflict resolution (preventing bun lockfile deadlocks)

### File 2: `user_guide.md`
1. **Welcome & Navigation Fundamentals**:
   - Logging in, session persistence, role permissions, and sidebar navigation
2. **Executive Summary Module**:
   - Reading KPI cards (Active Tickets, Resolution SLA, Cloud Costs, Server Uptime)
   - Multi-site filtering (filtering across Hospital, Clinic, or All Sites)
   - Exporting the Executive PDF dossier
3. **Cloud Subscriptions & SaaS Tracking**:
   - Viewing the 10 active cloud services and monthly recurring expenditures
   - Registering new subscriptions (billing cycle, renewal dates, cost per user, vendor tags)
   - Managing cancellation alerts and contract expirations
4. **IT Asset Inventory Management**:
   - Registering hardware & software assets (Asset Tag, Serial Number, Model, Warranty)
   - Asset status tracking (In-Service, In-Repair, Decommissioned, Backup)
   - Assignment of assets to hospital/clinic departments and staff
5. **Helpdesk & Incident Response**:
   - Submitting incident tickets with priority ratings (Critical, High, Medium, Low)
   - Assigning technicians, tracking resolution timestamps, and closing tickets
6. **Staffing, Shifts & Scheduling**:
   - Viewing the IT personnel roster and skill roles (System Admin, Network Eng, Helpdesk L1)
   - Monthly shift calendars and on-call rotations across branches
7. **Multi-Site & System Settings**:
   - Configuring hospital branches, medical clinics, and remote centers
   - Managing system alert thresholds and notification settings
8. **Vendor Management & Invoicing**:
   - Managing vendor directory, agreements, and support contacts
   - Creating invoices with itemized costs, tax rates, and payment tracking
9. **IT Knowledge Base & Meeting Notes**:
   - Documenting operational procedures, post-mortems, and agendas
   - Tagging, searching, and uploading file attachments

---

## 4. Verification Plan

- Inspect both generated files (`installation.md` and `user_guide.md`) to verify markdown formatting, heading hierarchy, code fences, and ASCII diagrams.
- Verify that all instructions accurately match the active codebase files and database schemas.
- Run `compile_applet` to confirm the application remains in a pristine, functional build state.
