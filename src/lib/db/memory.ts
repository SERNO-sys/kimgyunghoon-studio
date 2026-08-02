import type { Db, Table } from './types';

function createTable<T extends { id: string }>(): Table<T> {
  const rows: T[] = [];

  const matches = (row: T, filter: Partial<T>) => {
    return (Object.keys(filter) as (keyof T)[]).every((key) => {
      const value = filter[key];
      if (value === undefined) return true;
      return row[key] === value;
    });
  };

  return {
    findMany: async (filter) => {
      if (!filter) return [...rows];
      return rows.filter((row) => matches(row, filter));
    },
    findOne: async (filter) => {
      return rows.find((row) => matches(row, filter)) ?? null;
    },
    findById: async (id) => {
      return rows.find((row) => row.id === id) ?? null;
    },
    findByPrefix: async (prefix) => {
      return rows.filter((row) => row.id.startsWith(prefix));
    },

    insert: async (data) => {
      rows.push(data);
      return data;
    },
    update: async (id, data) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return null;
      rows[index] = { ...rows[index], ...data } as T;
      return rows[index];
    },
    delete: async (id) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}

function createInMemoryDbInstance(): Db {
  return {
    users: createTable(),
    sites: createTable(),
    domains: createTable(),
    posts: createTable(),
    media: createTable(),
    categories: createTable(),
    settings: createTable(),
    deployVersions: createTable(),
  };
}

export function createInMemoryDb(): Db {
  const key = '__localDb__';
  const globalStore = globalThis as unknown as Record<string, Db | undefined>;

  if (!globalStore[key]) {
    globalStore[key] = createInMemoryDbInstance();
  }

  return globalStore[key];
}
