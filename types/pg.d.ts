declare module 'pg' {
  export interface QueryField {
    name: string;
  }

  export interface QueryResult<R = Record<string, unknown>> {
    rows: R[];
    rowCount: number | null;
    fields: QueryField[];
  }

  export interface PoolClient {
    query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
    release(): void;
  }

  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: unknown;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}
