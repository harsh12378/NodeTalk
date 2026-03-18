// utils/invalidateMessageCache.js

const redisClient = require("../config/redis");

/**
 * Wipes all cached pages for a given chat.
 * Call this whenever messages are sent, deleted, or cleared.
 */
const invalidateMessageCache = async (chatId) => {
  try {
    // SCAN is non-blocking, safe for production (avoids KEYS *)
    const pattern = `messages:${chatId}:*`;
    let cursor = "0";

    do {
      const { cursor: nextCursor, keys } = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100
      });

      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      cursor = nextCursor;
    } while (cursor !== "0");

  } catch (err) {
    console.error("Cache invalidation error:", err);
    // Non-fatal — don't let cache errors break your mutations
  }
};

module.exports = invalidateMessageCache;