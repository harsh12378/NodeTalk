const redis = require("../config/redis"); // your redis client

const MESSAGE_CACHE_TTL = 60 * 60; // 1 hour, match your existing TTL
const MAX_CACHED_MESSAGES = 50;     // only keep latest 50 in cache

const appendMessageToCache = async (chatId, messageData) => {
  try {
    const key = `messages:${chatId}`;
    const exists = await redis.exists(key);

    // Only append if cache exists — no point caching if nobody has fetched yet
    if (!exists) return;

    const cached = await redis.get(key);
    const messages = JSON.parse(cached);

    messages.push(messageData);

    // Trim to latest N to prevent unbounded cache growth
    const trimmed = messages.slice(-MAX_CACHED_MESSAGES);

    await redis.setex(key, MESSAGE_CACHE_TTL, JSON.stringify(trimmed));
  } catch (err) {
    // Cache append failing should never break message sending
    console.error("appendMessageToCache error:", err);
  }
};

module.exports = appendMessageToCache;