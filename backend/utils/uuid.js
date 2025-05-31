/**
 * UUID utilities using Bun's native UUID generation
 * Uses UUID v7 for database IDs (time-ordered, better for performance)
 */

// Generate UUID v7 (time-ordered, database-friendly)
export const generateId = () => {
  return Bun.randomUUIDv7();
};

// Generate UUID v4 (random, for tokens/sessions)
export const generateRandomId = () => {
  return crypto.randomUUID();
};