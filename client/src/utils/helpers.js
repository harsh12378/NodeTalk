// Stable helper — works whether senderId is a raw string or populated object
export const getSenderId = (senderId) => {
  if (!senderId) return null;
  if (typeof senderId === "string") return senderId;
  return senderId._id;
};
