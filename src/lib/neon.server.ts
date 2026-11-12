import { neonQuery, neonExecute, neonUserError } from "./neon-gateway.server";

// Preserve existing parameterized tag queries while using the linked connection.
// Credentials are read by the gateway helper only when a handler executes SQL.
export function parameterizedStatement(strings: readonly string[], params: unknown[]) {
  return {
    query: strings.reduce((sql, part, i) => sql + (i ? `$${i}` : "") + part, ""),
    params,
  };
}

export function watchtower() {
  return async (strings: TemplateStringsArray, ...params: unknown[]): Promise<any[]> => {
    const statement = parameterizedStatement(strings, params);
    const readOnly = /^\s*(SELECT|WITH|EXPLAIN)\b/i.test(statement.query)
      && !/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i.test(statement.query);
    try {
      const result = await (readOnly ? neonQuery : neonExecute)(statement.query, statement.params);
      return result.rows;
    } catch (error) {
      console.error("Linked Neon request failed", error);
      throw new Error(neonUserError(error).message);
    }
  };
}

export function evidence() {
  // DEPRECATED. The legacy "lucky-wildflower" evidence DB has been retired.
  // Every site page must read from the unbased "quiet-math" watchtower DB.
  // Any leftover caller is silently redirected so it cannot leak biased data.
  // To find leaks, grep for evidence() and migrate to watchtower().
  console.warn("evidence() is deprecated — redirecting to watchtower() (quiet-math).");
  return watchtower();
}