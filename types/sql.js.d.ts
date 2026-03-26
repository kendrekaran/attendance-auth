declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: typeof Database;
  }
  export class Database {
    constructor();
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
  }): Promise<SqlJsStatic>;
}
