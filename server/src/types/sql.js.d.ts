declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(params?: object): any;
    free(): boolean;
    reset(): void;
  }

  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface DatabaseConstructor {
    new (data?: ArrayLike<number> | Buffer | null): Database;
    (data?: ArrayLike<number> | Buffer | null): Database;
  }

  interface SqlJsStatic {
    Database: DatabaseConstructor;
  }

  export type { Database, Statement, QueryExecResult, SqlJsStatic };

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
