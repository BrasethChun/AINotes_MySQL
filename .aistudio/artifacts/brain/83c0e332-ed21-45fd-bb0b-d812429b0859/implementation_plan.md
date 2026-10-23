# Implementation Plan: Full Email Content Synchronization (HTML & Text) for Bluehost Mail

Upgrade the **Mail Assistant** to synchronize and display complete email content—both **Rich HTML** and **Plain Text**—from the **Bluehost** mail provider, backfilling existing messages and rendering formatted email bodies with interactive views in the reading pane.

---

## User Review & Clarified Requirements

> [!NOTE]
> All clarified requirements implemented:
> - **Display Mode**: **Rich HTML with formatting and plain text fallback** (Completed).
> - **Backfill Strategy**: **Re-sync and update all existing emails** (Completed).
> - **Sync Depth**: **Last 30 messages per folder** (Completed).

---

## 1. Architecture & Data Flow

```
[Bluehost IMAP Server (SSL: 993)]
         │
         │  1. client.fetch(`${fetchFrom}:*`, { envelope, flags, uid, source: true })
         ▼
[IMAP Worker & mailparser Engine]
         │
         │  2. simpleParser(msg.source) extracts:
         │     - full body_html (sanitized HTML styling)
         │     - clean body_text (plain text fallback)
         │     - rich snippet (first 160 clean characters)
         ▼
[MariaDB: mail_messages table]
         │
         │  3. INSERT / UPDATE ON DUPLICATE KEY:
         │     - Updates existing records where body_text was placeholder
         │     - Stores body_html LONGTEXT and body_text LONGTEXT
         ▼
[REST API: GET /api/mail/messages & GET /api/mail/messages/:id]
         │
         │  4. Serves full message payload to frontend
         ▼
[Mail Assistant 3-Column Client]
         │
         │  5. Reading Pane renders:
         │     - Formatted HTML container with email-body-view
         │     - HTML / Text toggle tabs
         │     - AI Smart Reply & Summarizer grounded on complete email content
```

---

## 2. Completed Changes

- [x] **Dependencies (`package.json`)**: Installed `mailparser` and dev dependency `@types/mailparser`.
- [x] **Database Migration (`mailServer.ts`)**: Added `body_html LONGTEXT NULL` column and backfilled existing seeded records with formatted HTML.
- [x] **IMAP Sync Pipeline (`mailServer.ts`)**:
  - Configured 30-message fetch window (`fetchFrom = Math.max(1, mailbox.messages - 30)`).
  - Fetched complete RFC822 `source: true`.
  - Parsed with `simpleParser(msg.source)` into `body_text` and `body_html`.
  - Implemented backfill update query when message IDs exist to replace placeholders with full content.
  - Added HTML formatting to `POST /api/mail/send`.
- [x] **Frontend Reading Pane (`MailAssistant.tsx`)**:
  - Added interactive view toggle tabs: **"Formatted (HTML)"** and **"Plain Text"**.
  - Styled sanitized HTML email viewer with clean padding and horizontal overflow handling.
  - Replaced alerts with toast notifications.
- [x] **Testing & Verification**:
  - Tested RFC822 MIME parser successfully.
  - Verified `body_text` and `body_html` in `GET /api/mail/messages`.
  - Clean `compile_applet` build passed. Dev server active on port 3000.
