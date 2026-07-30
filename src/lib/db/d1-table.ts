import type { Table } from './types';

// Local D1 stubs; these merge with @cloudflare/workers-types after `npm install`.
declare global {
  interface D1Result<T = unknown> {
    results: T[];
    meta?: { changes?: number };
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run(): Promise<{ meta?: { changes?: number } }>;
  }

  interface D1Database {
    prepare(sql: string): D1PreparedStatement;
  }
}

function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toDbValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function fromDbValue(value: unknown): unknown {
  if (value === 1 || value === 0) return value === 1;
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

    delete: async (id) => {
      const { meta } = await d1
        .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .run();
      return (meta?.changes ?? 0) > 0;
    },
  };
}
