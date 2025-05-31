/**
 * Password utilities using Bun's native password hashing
 * Uses Argon2id by default for better security than bcrypt
 */

export const hashPassword = async (password) => {
  return await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 4,        // 4 MiB
    timeCost: 3,          // 3 iterations
  });
};

export const verifyPassword = async (password, hash) => {
  return await Bun.password.verify(password, hash);
};

// Alternative bcrypt implementation if needed for compatibility
export const hashPasswordBcrypt = async (password) => {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12,  // Higher cost for better security
  });
};

export const verifyPasswordBcrypt = async (password, hash) => {
  return await Bun.password.verify(password, hash);
};