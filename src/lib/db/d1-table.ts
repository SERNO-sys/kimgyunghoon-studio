import type { Table } from './types';

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toDbValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0;
  // Serialize nested objects/arrays (e.g. the site `theme_config` JSON column)
  // so they can be stored in a TEXT column and read back as structured data.
  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function fromDbValue(value: unknown): unknown {
  if (value === 1 || value === 0) return value === 1;
  // Attempt to parse JSON-encoded columns (e.g. `theme_config`) back into
  // structured data. Plain strings that are not valid JSON are returned as-is.
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed === 'null' ||
      trimmed === 'true' ||
      trimmed === 'false'
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Not valid JSON; fall through and return the raw string.
      }
    }
  }
  return value;
}


function toRow(data: object): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    row[toSnakeCase(key)] = toDbValue(value);
  }
  return row;
}

function fromRow<T extends { id: string }>(row: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[toCamelCase(key)] = fromDbValue(value);
  }
  return mapped as T;
}

export function createD1Table<T extends { id: string }>(
  d1: D1Database,
  tableName: string
): Table<T> {
  const buildWhere = (filter: Partial<T>): { clause: string; values: unknown[] } => {
    const conditions: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;
      conditions.push(`${toSnakeCase(key)} = ?`);
      values.push(toDbValue(value));
    }
    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
    };
  };

  return {
    findMany: async (filter) => {
      const { clause, values } = buildWhere(filter ?? ({} as Partial<T>));
      const sql = `SELECT * FROM ${tableName} ${clause}`;
      const stmt = d1.prepare(sql);
      const { results } = await (values.length ? stmt.bind(...values).all() : stmt.all());
      return (results as Record<string, unknown>[]).map(fromRow) as T[];
    },

    findOne: async (filter) => {
      const { clause, values } = buildWhere(filter);
      const sql = `SELECT * FROM ${tableName} ${clause} LIMIT 1`;
      const row = await d1.prepare(sql).bind(...values).first();
      return row ? (fromRow(row as Record<string, unknown>) as T) : null;
    },

    findById: async (id) => {
      const row = await d1
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .first();
      return row ? (fromRow(row as Record<string, unknown>) as T) : null;
    },

    findByPrefix: async (prefix) => {
      const sql = `SELECT * FROM ${tableName} WHERE id LIKE ?`;
      const { results } = await d1
        .prepare(sql)
        .bind(`${prefix}%`)
        .all();
      return (results as Record<string, unknown>[]).map(fromRow) as T[];
    },


    insert: async (data) => {
      const row = toRow(data as Record<string, unknown>);
      const columns = Object.keys(row);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(row);
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      await d1.prepare(sql).bind(...values).run();
      return data;
    },

    update: async (id, data) => {
      const row = toRow(data as Record<string, unknown>);
      const setClauses = Object.keys(row).map((key) => `${key} = ?`);
      const values = [...Object.values(row), id];
      if (setClauses.length === 0) {
        const existing = await d1
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(id)
          .first();
        return existing ? (fromRow(existing as Record<string, unknown>) as T) : null;
      }
      const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`;
      await d1.prepare(sql).bind(...values).run();
      const updated = await d1
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .first();
      return updated ? (fromRow(updated as Record<string, unknown>) as T) : null;
    },

    updateIf: async (id, expected, data) => {
      const expectedRow = toRow(expected as Record<string, unknown>);
      const expectedClauses = Object.keys(expectedRow).map((key) => `${key} = ?`);
      const expectedValues = Object.values(expectedRow);

      const row = toRow(data as Record<string, unknown>);
      const setClauses = Object.keys(row).map((key) => `${key} = ?`);
      const setValues = Object.values(row);

      if (setClauses.length === 0) {
        const existing = await d1
          .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
          .bind(id)
          .first();
        return existing ? (fromRow(existing as Record<string, unknown>) as T) : null;
      }

      const whereClause =
        expectedClauses.length > 0
          ? `WHERE id = ? AND ${expectedClauses.join(' AND ')}`
          : `WHERE id = ?`;
      const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} ${whereClause}`;
      const { meta } = await d1
        .prepare(sql)
        .bind(...setValues, id, ...expectedValues)
        .run();

      // Precondition failed (stale write) — no row was updated.
      if ((meta?.changes ?? 0) === 0) return null;

      const updated = await d1
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .first();
      return updated ? (fromRow(updated as Record<string, unknown>) as T) : null;
    },

    delete: async (id) => {

      const { meta } = await d1
        .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .run();
      return (meta?.changes ?? 0) > 0;
    },
  };
}
