/**
 * Decode JWT token and extract user data
 * JWT format: header.payload.signature
 * The payload is base64url encoded JSON
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;

    // Split token into parts
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Invalid token format");
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed (base64url doesn't require padding, but atob does)
    const padded = payload + "==".substring(0, (4 - payload.length % 4) % 4);
    
    // Decode base64url to string
    const decoded = atob(padded);
    
    // Parse JSON
    const decodedPayload = JSON.parse(decoded);
    
    return decodedPayload;
  } catch (err) {
    console.error("Failed to decode token:", err);
    return null;
  }
};

/**
 * Get current user from JWT token
 */
export const getCurrentUserFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  // Return user object - structure depends on your JWT payload
  // Usually contains: _id, name, email, avatar, etc.
  return {
    _id: payload.userId || payload._id || payload.id,
    name: payload.name,
    email: payload.email,
    avatar: payload.avatar,
    ...payload, // Include all payload data
  };
};
