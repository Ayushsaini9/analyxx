---
description: How to start and stop the WhatsApp bot locally
---

# WhatsApp Bot — Start/Stop Guide

## To START the bot (2 terminals needed):

### Terminal 1 — Start the bot server:
// turbo
```bash
cd /Users/ayush/Desktop/pyq-analyzer/whatsapp-bot && npm run dev
```

### Terminal 2 — Start ngrok tunnel:
// turbo
```bash
ngrok http 3001
```

### After starting:
1. Note: Since you have an authenticated ngrok account, the URL stays the same: `https://isomerically-phenolated-lera.ngrok-free.dev`
2. If ngrok gives a NEW URL, update it in Meta Developer Dashboard:
   - Go to **WhatsApp → Configuration → Webhook → Edit**
   - Update **Callback URL** to: `https://YOUR-NEW-NGROK-URL/webhook`
   - Verify Token: `analyxx_webhook_verify_2026`
   - Click **Verify and Save**

## To STOP the bot:
// turbo
```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null
```
Then Ctrl+C in the ngrok terminal.

## Important Notes:
- The bot only works while BOTH the server AND ngrok are running
- For 24/7 uptime without running locally, deploy to Render (see SETUP.md Section 9)
- Your `.env` file has the current working credentials (token, phone number ID, etc.)
- WABA ID: `851266604690118`
- Phone Number ID: `1044548828745611`
