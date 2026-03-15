// utils/invalidateInboxCache.js

const redisClient = require("../config/redis");

/**
 * Invalidate inbox cache for one or more userIds.
 * Call this whenever a message is sent or a friend request changes.
 * 
 * @param {string | string[]} userIds
 */
const invalidateInboxCache = async (userIds) => {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const keys = ids.map((id) => `inbox:${id}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error("Inbox cache invalidation error:", err);
    // Non-fatal
  }
};

module.exports = invalidateInboxCache;