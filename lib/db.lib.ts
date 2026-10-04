/**
 * Convert a database row into an app type by dropping `null` columns.
 * Firestore documents left unset fields out entirely, so the app's types use optional
 * fields (`undefined`) rather than `null`. This keeps that behavior for Postgres rows.
 *
 * @param row - A row returned by supabase-js
 * @returns The row without null-valued keys, typed as `T`
 * @example
 * ```ts
 * const { data } = await supabaseAdmin.from(USERS_TABLE).select().eq("id", id).maybeSingle();
 * const user = data ? fromRow<User>(data) : null;
 * ```
 */
export const fromRow = <T>(row: Record<string, unknown>): T =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as T;

/**
 * Convert many database rows into app types. See {@link fromRow}.
 */
export const fromRows = <T>(rows: Record<string, unknown>[] | null): T[] => (rows ?? []).map((row) => fromRow<T>(row));
