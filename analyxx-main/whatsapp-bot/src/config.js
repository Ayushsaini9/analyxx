/**
 * ANALYXX WhatsApp Bot — Config Loader
 * Validates that all required environment variables are set.
 */

require("dotenv").config();

const required = [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "GROQ_API_KEY",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

module.exports = {
  // WhatsApp Cloud API
  WA_TOKEN: process.env.WHATSAPP_TOKEN,
  WA_PHONE_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WA_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WA_API_BASE: `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  LIBRARY_BUCKET: "library-papers",

  // Cloudflare R2 CDN
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "https://pub-5d418c0acdfa4e9ba673215eb5998a3b.r2.dev",

  // Groq AI
  GROQ_API_KEY: process.env.GROQ_API_KEY,

  // Backend
  BACKEND_URL: process.env.BACKEND_URL || (process.env.NODE_ENV === "production" ? "https://analyxx-backend.onrender.com" : "http://localhost:8000"),

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Server
  PORT: parseInt(process.env.PORT, 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
};
