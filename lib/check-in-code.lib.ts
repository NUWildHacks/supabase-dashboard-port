import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The check-in QR code holds the user ID and a signature, so a code cannot be made for someone
 * else from their user ID alone. The signing key comes from the server's secret key.
 */
const getSigningKey = () => {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Missing Supabase environment variables");
  return createHmac("sha256", secret).update("wildhacks-check-in-qr-code").digest();
};

const sign = (userId: string) => createHmac("sha256", getSigningKey()).update(userId).digest("base64url");

/** The QR code text for a user: `{"user_id": ..., "sig": ...}`. */
export const createCheckInCode = (userId: string) => JSON.stringify({ user_id: userId, sig: sign(userId) });

export const isValidCheckInSignature = (userId: string, signature: string | undefined) => {
  if (!signature) return false;
  const expected = Buffer.from(sign(userId));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
