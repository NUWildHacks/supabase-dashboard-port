/**
 * Convert a database row into an app type by dropping `null` columns.
 * The app's types use optional fields (`undefined`) for unset values rather than `null`,
 * so this keeps unset Postgres columns out of the object.
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

/** Supabase returns at most this many rows per request (`max_rows` in supabase/config.toml). */
const PAGE_SIZE = 1000;

/**
 * Read every row of a query, one page at a time, so the result is not cut off at `max_rows`.
 * The query must have a stable order (for example, by primary key) for the pages to be correct.
 *
 * @example
 * ```ts
 * const rows = await selectAllRows((from, to) =>
 *   supabaseAdmin.from(USERS_TABLE).select().order("id").range(from, to).throwOnError()
 * );
 * ```
 */
export const selectAllRows = async <T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> => {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await queryPage(from, from + PAGE_SIZE - 1);

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows;
};

/** Keep each `.in()` filter short enough for the request URL. */
export const IN_FILTER_CHUNK_SIZE = 200;

/** Split a list into groups of at most `size` items, for `.in()` filters. */
export const chunkList = <T>(items: T[], size = IN_FILTER_CHUNK_SIZE): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};
