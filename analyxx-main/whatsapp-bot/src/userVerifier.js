/**
 * ANALYXX WhatsApp Bot — User Verification
 *
 * Only registered ANALYXX users can use the bot.
 * Users must first link their WhatsApp number by sending a
 * one-time verification code or their registered email.
 *
 * We store verified phone→email mappings in a Supabase table called
 * 'whatsapp_users'. If the table doesn't exist, we query the users
 * table by email directly for a simpler flow.
 */

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const logger = require("./logger");

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

// In-memory cache of verified phones: phone → { userId, name, email }
const verifiedCache = new Map();

/**
 * Check if a phone number is linked to a registered ANALYXX user.
 */
async function isVerifiedUser(phone) {
  if (verifiedCache.has(phone)) return verifiedCache.get(phone);

  try {
    // Check whatsapp_users table for phone→user mapping
    const { data, error } = await supabase
      .from("whatsapp_users")
      .select("user_id, user_name, user_email")
      .eq("phone", phone)
      .single();

    if (data && !error) {
      const user = { userId: data.user_id, name: data.user_name, email: data.user_email };
      verifiedCache.set(phone, user);
      return user;
    }
  } catch (err) {
    // Table might not exist yet — that's OK, we'll use email-based linking
    logger.debug("whatsapp_users table not found, using email linking flow");
  }

  return null;
}

/**
 * Attempt to link a phone number to an ANALYXX account by email.
 * Returns the user object if successful, null otherwise.
 */
async function linkByEmail(phone, email) {
  try {
    // Look up user by email in the users table
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (!user || error) {
      logger.debug(`Email lookup failed: ${email}`, { error });
      return null;
    }

    // Store the phone→user mapping
    try {
      await supabase.from("whatsapp_users").upsert({
        phone,
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        linked_at: new Date().toISOString(),
      });
    } catch (insertErr) {
      // If table doesn't exist, that's fine — cache is enough for now
      logger.debug("Could not persist phone mapping (table may not exist)", { error: insertErr.message });
    }

    const userData = { userId: user.id, name: user.name, email: user.email };
    verifiedCache.set(phone, userData);
    logger.info(`Linked WhatsApp ${phone} to ANALYXX user ${user.email}`);
    return userData;

  } catch (err) {
    logger.error("Email linking error", { error: err.message });
    return null;
  }
}

/**
 * Check if a message looks like an email address.
 */
function looksLikeEmail(text) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

module.exports = { isVerifiedUser, linkByEmail, looksLikeEmail };
