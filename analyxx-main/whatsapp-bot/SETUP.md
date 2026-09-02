# ANALYXX WhatsApp Bot — Complete Setup Guide

## Table of Contents

1. [Meta Business Account Setup](#1-meta-business-account-setup)
2. [Meta Developer App Creation](#2-meta-developer-app-creation)
3. [WhatsApp Business API Configuration](#3-whatsapp-business-api-configuration)
4. [Business Profile Setup](#4-business-profile-setup)
5. [Bot Server Setup](#5-bot-server-setup)
6. [Local Testing with ngrok](#6-local-testing-with-ngrok)
7. [Webhook Configuration in Meta Dashboard](#7-webhook-configuration-in-meta-dashboard)
8. [Database Setup for User Verification](#8-database-setup-for-user-verification)
9. [Deployment on Render](#9-deployment-on-render)
10. [Business Verification](#10-business-verification)
11. [Testing Checklist](#11-testing-checklist)
12. [Common Issues & Fixes](#12-common-issues--fixes)

---

## 1. Meta Business Account Setup

Since you don't have a Meta Business account, follow these steps:

### Step 1: Create a Meta Business Account

1. Go to **https://business.facebook.com/overview**
2. Click **"Create Account"**
3. Enter:
   - Business name: **ANALYXX AI**
   - Your name and email
   - Business details (education/technology category)
4. Verify your email address
5. Your Business Account ID will be shown at: `business.facebook.com/settings` → Business Info

### Step 2: Create a Facebook Page (required)

1. Go to **https://facebook.com/pages/create**
2. Choose **"Business or Brand"**
3. Page name: **ANALYXX AI**
4. Category: **Education** or **Technology**
5. Add a profile picture (your ANALYXX logo) and cover photo
6. Link this page to your Meta Business Account:
   - Business Settings → Accounts → Pages → Add → "Add a Page"

---

## 2. Meta Developer App Creation

### Step 1: Create a Developer Account

1. Go to **https://developers.facebook.com**
2. Click **"Get Started"** (sign in with your Facebook account)
3. Accept the developer terms
4. Verify your account (phone number required)

### Step 2: Create an App

1. Go to **https://developers.facebook.com/apps**
2. Click **"Create App"**
3. Select app type: **"Business"**
4. Enter:
   - App name: **ANALYXX WhatsApp Bot**
   - App contact email: your email
   - Business Account: select "ANALYXX AI" (created in step 1)
5. Click **"Create App"**

### Step 3: Add WhatsApp Product

1. In your app dashboard, scroll to **"Add Products to Your App"**
2. Find **"WhatsApp"** → Click **"Set Up"**
3. You'll see the WhatsApp Getting Started page

---

## 3. WhatsApp Business API Configuration

### Step 1: Get Your Credentials

In the Meta Developer Dashboard → WhatsApp → API Setup:

1. **Temporary Access Token** — Copy this (valid 24 hours). You'll generate a permanent one later.
2. **Phone Number ID** — Under "From" phone number, copy the Phone Number ID
3. **WhatsApp Business Account ID** — Shown at the top

### Step 2: Generate a Permanent Access Token

Temporary tokens expire in 24 hours. For production:

1. Go to **Business Settings** → **System Users** → **Add**
2. Name: `whatsapp-bot`, Role: **Admin**
3. Click **"Generate New Token"**
4. Select your app (**ANALYXX WhatsApp Bot**)
5. Add permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`
6. Copy the permanent token — this is your `WHATSAPP_TOKEN`

### Step 3: Register a Real Phone Number (for production)

Meta provides a test phone number for development. For production:

1. WhatsApp → Getting Started → **"Add Phone Number"**
2. Enter your business phone number
3. Verify via SMS or voice call
4. This number will show your business name in WhatsApp

---

## 4. Business Profile Setup

### Make Your Bot Look Professional in WhatsApp

#### Display Name

1. Go to **WhatsApp → Getting Started** in your Meta Developer dashboard
2. Click your phone number → **"Edit"**
3. Under **Display Name**, enter: **ANALYXX AI**
4. Meta will review the name (takes 1-3 business days)

#### Profile Picture / Logo

1. Use the WhatsApp Business Management API to set profile picture:

```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/whatsapp_business_profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profile_picture_url=https://your-domain.com/logo.jpg"
```

Or via API in the dashboard: WhatsApp → Configuration → Business Profile

#### Business Profile Details

Set these in the WhatsApp Business Profile settings:

```bash
curl -X PATCH \
  "https://graph.facebook.com/v21.0/YOUR_PHONE_NUMBER_ID/whatsapp_business_profile" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "about": "AI-powered exam preparation and PYQ analysis",
    "address": "India",
    "description": "ANALYXX AI helps students prepare for JEE, NEET, UPSC, CAT, CBSE, and other exams with AI-powered analysis of previous year question papers.",
    "vertical": "EDUCATION",
    "email": "analyxai@gmail.com",
    "websites": ["https://analyxx.ai"]
  }'
```

#### How It Looks to Users

When someone receives a message from your bot:
- **Chat name**: ANALYXX AI (your display name)
- **Profile picture**: Your uploaded logo
- **Business badge**: Green checkmark (after verification)
- **Notification preview**: "ANALYXX AI: [message preview]"
- **About section**: Your description from the business profile

---

## 5. Bot Server Setup

### Step 1: Install Dependencies

```bash
cd whatsapp-bot
npm install
```

### Step 2: Create Your .env File

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# From Meta Developer Dashboard
WHATSAPP_TOKEN=EAAxxxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=analyxx_webhook_verify_2026

# Same as your backend/.env
SUPABASE_URL=https://uxnesngjfduazyznpopx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here

# Same as your backend/.env
GROQ_API_KEY=gsk_your_key_here

PORT=3001
NODE_ENV=development
```

### Step 3: Create Logs Directory

```bash
mkdir -p logs
```

### Step 4: Start the Server

```bash
npm run dev
```

You should see:
```
[2026-03-31 19:00:00] INFO: ANALYXX WhatsApp Bot running on port 3001
[2026-03-31 19:00:00] INFO: Webhook URL: http://localhost:3001/webhook
```

---

## 6. Local Testing with ngrok

WhatsApp needs a public HTTPS URL for webhooks. Use ngrok for local testing:

### Step 1: Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Create ngrok Account & Auth

1. Sign up at **https://ngrok.com**
2. Copy your auth token from dashboard
3. Run: `ngrok config add-authtoken YOUR_TOKEN`

### Step 3: Expose Your Local Server

```bash
ngrok http 3001
```

You'll get a URL like:
```
Forwarding: https://abc123.ngrok-free.app → http://localhost:3001
```

Copy the **https** URL — this is your webhook URL.

---

## 7. Webhook Configuration in Meta Dashboard

### Step 1: Set Webhook URL

1. Go to **Meta Developer Dashboard** → your app
2. Navigate to **WhatsApp** → **Configuration**
3. Under **Webhook**, click **"Edit"**
4. Enter:
   - **Callback URL**: `https://abc123.ngrok-free.app/webhook` (your ngrok URL)
   - **Verify Token**: `analyxx_webhook_verify_2026` (same as your .env)
5. Click **"Verify and Save"**

If verification succeeds, you'll see a green checkmark.

### Step 2: Subscribe to Message Events

After verification, under **Webhook Fields**, subscribe to:
- ✅ **messages** — incoming messages, button replies, etc.

### Step 3: Test It

1. Open WhatsApp on your phone
2. Send a message to the test phone number shown in your Meta dashboard
3. Send: "Hi"
4. You should receive the email-linking prompt (since your phone isn't linked yet)
5. Send your registered ANALYXX email
6. After linking, send: "menu"
7. You should see the interactive exam selection list

---

## 8. Database Setup for User Verification

The bot needs a `whatsapp_users` table to persist phone → ANALYXX account links.

Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor):

```sql
CREATE TABLE IF NOT EXISTS whatsapp_users (
  phone TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  user_name TEXT,
  user_email TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;

-- Policy: allow service role full access
CREATE POLICY "Service role access" ON whatsapp_users
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

> **Note**: The bot will work even without this table (using in-memory cache), but links won't persist across restarts.

---

## 9. Deployment on Render

### Step 1: Push to GitHub

Create a separate repo or subfolder deployment:

```bash
cd whatsapp-bot
git init
git add .
git commit -m "ANALYXX WhatsApp Bot"
git remote add origin https://github.com/your-username/analyxx-whatsapp-bot.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to **https://render.com**
2. Click **"New" → "Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: analyxx-whatsapp-bot
   - **Region**: Singapore (closest to India)
   - **Branch**: main
   - **Root Directory**: (leave blank if separate repo, or `whatsapp-bot` if monorepo)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (for testing) or Starter ($7/mo for production)

### Step 3: Set Environment Variables

In Render dashboard → Environment:

Add all variables from your `.env` file.

### Step 4: Update Webhook URL

After deployment, Render gives you a URL like:
`https://analyxx-whatsapp-bot.onrender.com`

Go back to Meta Developer Dashboard → WhatsApp → Configuration → Webhook:
- Update Callback URL to: `https://analyxx-whatsapp-bot.onrender.com/webhook`

---

## 10. Business Verification

### For Official Green Checkmark

1. Go to **Meta Business Manager** → **Security Center**
2. Click **"Start Verification"**
3. You'll need:
   - Legal business name
   - Business address
   - Business phone number
   - Business documents (one of):
     - GST certificate
     - Business registration certificate
     - Utility bill with business name
4. Verification takes 2-10 business days
5. Once verified, your WhatsApp profile gets the **green checkmark badge**

### Messaging Limits

- **Test mode**: Can only message numbers added to your "test numbers" list
- **After verification**: 
  - Tier 1: 1,000 conversations/day
  - Tier 2: 10,000 conversations/day
  - Tier 3: 100,000 conversations/day
  - Tiers increase automatically based on quality

---

## 11. Testing Checklist

### Verification Flow
- [ ] Send any message from an unlinked phone → receives email-linking prompt
- [ ] Send valid registered email → successfully links account
- [ ] Send invalid email → receives "no account found" message
- [ ] After linking, send "hi" → receives personalized greeting + menu

### Core Features
- [ ] Type "menu" → receives interactive exam list
- [ ] Select "NEET" from list → receives subject list
- [ ] Select "Biology" → receives year list
- [ ] Select "2024" → receives PDF (if available) or "not found" message
- [ ] Type "NEET Biology PYQs" → correctly classified, starts PYQ flow
- [ ] Type "Important chapters for JEE Physics" → receives AI-generated chapter list
- [ ] Type "UPSC Polity repeated topics" → receives AI-generated topic list
- [ ] Type "Analyze CAT Quant" → receives AI analysis

### Interactive Buttons
- [ ] "Get Paper PDF" button works
- [ ] "AI Analysis" button triggers analysis
- [ ] "Browse More" returns to exam menu

### Edge Cases
- [ ] Very long message (>1000 chars) → handled gracefully
- [ ] Gibberish text → receives general help message
- [ ] Image/voice message → receives "text only" message
- [ ] Rapid message spam → rate-limited

---

## 12. Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Webhook verification fails | Check `WHATSAPP_VERIFY_TOKEN` matches in both .env and Meta dashboard |
| "Invalid OAuth access token" | Token expired — generate a permanent System User token (see Step 3.2) |
| Bot doesn't reply | Check server logs (`logs/combined.log`), verify webhook subscription includes "messages" |
| "Message failed to send" | Verify `WHATSAPP_PHONE_NUMBER_ID` is correct. Check API version (v21.0) |
| "Recipient not in allowed list" | In test mode, add recipient numbers in Meta Dashboard → WhatsApp → API Setup → "To" field |
| PDFs not found | Check Supabase `library-papers` bucket path matches: `{examId}/{Subject}/{year}.pdf` |
| AI analysis empty/error | Verify `GROQ_API_KEY` is valid. Check Groq rate limits. |
| ngrok URL stops working | Free ngrok URLs change each restart. Update webhook URL in Meta dashboard each time. Use paid ngrok for stable URL. |
| Duplicate messages | The bot deduplicates by message ID. If still happening, check Meta webhook retry settings. |
| Render cold starts (free tier) | Free Render services spin down after 15min inactivity. First message after idle may timeout. Upgrade to Starter plan. |

---

## Architecture Recap

```
whatsapp-bot/
├── package.json
├── .env.example
├── .env                    ← YOUR CONFIG (git-ignored)
├── SETUP.md                ← THIS FILE
├── logs/
│   ├── combined.log
│   └── error.log
└── src/
    ├── index.js            ← Express server (entry point)
    ├── config.js           ← Env var loader + validation
    ├── logger.js           ← Winston logger
    ├── webhook.js          ← GET/POST /webhook routes
    ├── whatsapp.js         ← WhatsApp Cloud API client
    ├── intentClassifier.js ← Regex + LLM intent classification
    ├── examData.js         ← Exam/subject/year mappings
    ├── sessionStore.js     ← In-memory session (multi-step flows)
    ├── userVerifier.js     ← ANALYXX user verification
    └── handlers/
        ├── messageHandler.js   ← Central message router
        ├── menuHandler.js      ← Interactive menu sender
        ├── pyqHandler.js       ← PYQ paper lookup
        └── analysisHandler.js  ← AI analysis generator
```
