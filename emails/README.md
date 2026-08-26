# 📧 NLO Email Communications & Newsletters

This directory houses all official email communications, newsletter templates, and monthly review campaign broadcasts for the **National Legal Observatory**.

---

## 📂 Directory Structure

```
emails/
├── 📁 campaigns/                               # Time-sensitive issue releases & announcements
│   ├── 📄 monthly-review-2026-08-teaser.html   # Pre-launch embargo countdown teaser (zero spoilers)
│   └── 📄 monthly-review-2026-08-launch.html   # Official live release announcement with summary
│
├── 📁 templates/                               # Reusable baseline templates
│   └── 📄 welcome-subscriber.html              # Automatic welcome email for new newsletter subscribers
│
└── 📄 README.md                                # This guide
```

---

## 🚀 How to Send Campaigns

### Method 1: Copy-Paste Directly in Gmail
1. Open any `.html` file in your browser (`open emails/campaigns/monthly-review-2026-08-launch.html`).
2. Press **`Cmd + A`** then **`Cmd + C`** to copy the formatted layout.
3. In Gmail Compose, press **`Cmd + V`** to paste the rich visual email.
4. Add your recipient list in **Bcc**, set the subject, and click **Send** or **Schedule Send**.

### Method 2: Automated Dispatch Script
From the repository root:

```bash
# 1. Preview/Test by sending to yourself:
TEST_EMAIL="your-email@example.com" GMAIL_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/send-launch-mail.js

# 2. Dispatch to all active database subscribers:
GMAIL_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx" node scripts/send-launch-mail.js
```
