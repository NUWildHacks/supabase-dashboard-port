import { z } from "zod";

/**
 * Secure URL schema that only allows http:// and https:// protocols.
 * Prevents XSS attacks from dangerous protocols like javascript:, data:, file:, etc.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   url: secureUrlSchema,
 * });
 * ```
 */
export const secureUrlSchema = z.url("Invalid URL format").refine(
  (url) => {
    try {
      const parsed = new URL(url);
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  { message: "URL must use http:// or https:// protocol" }
);

/**
 * Plain text schema that rejects HTML content.
 * Prevents XSS attacks by ensuring only plain text is accepted.
 * Allows newlines for multi-line content.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   body: plainTextSchema,
 * });
 * ```
 */
export const plainTextMultiLineSchema = z
  .string()
  .regex(/^[^\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]*$/, {
    message: "Invalid characters in text. Please use plain text only.",
  })
  .regex(/^[^<]*$/, { message: "HTML tags are not allowed. Please use plain text only." });

/**
 * Plain text schema for single-line fields (no newlines allowed).
 * Use for names, titles, and other single-line text fields.
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   title: plainTextSingleLineSchema,
 * });
 * ```
 */
export const plainTextSingleLineSchema = plainTextMultiLineSchema.regex(/^[^\n\r]*$/, {
  message: "Newlines are not allowed in this field",
});

/**
 * GitHub username schema that validates according to GitHub's rules:
 * - Alphanumeric characters (a-z, 0-9) and hyphens (-)
 * - 1-39 characters in length
 * - Cannot begin or end with a hyphen
 * - Cannot have consecutive hyphens
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   github_username: githubUsernameSchema,
 * });
 * ```
 */
export const githubUsernameSchema = z
  .string()
  .min(1, "GitHub username is required")
  .max(39, "GitHub username must be 39 characters or less")
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i, {
    message:
      "GitHub username can only contain alphanumeric characters and hyphens, cannot begin or end with a hyphen, and cannot have consecutive hyphens",
  })
  .refine((username) => !username.includes("--"), { message: "GitHub username cannot have consecutive hyphens" });

/**
 * User ID schema.
 * Validates that a string matches the format of Supabase Auth user IDs (UUIDs).
 *
 * @example
 * ```ts
 * const schema = z.object({
 *   userId: userIdSchema,
 * });
 * ```
 */
export const userIdSchema = z.uuid({
  message: "Invalid user ID",
});
