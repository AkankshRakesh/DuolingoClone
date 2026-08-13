declare module 'sql.js' {
  export type Database = {
    run(sql: string, params?: Array<string | number | null | undefined>): void
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
    export(): Uint8Array
  }

  type SqlJsFactory = {
    Database: new (data?: Uint8Array) => Database
  }

  export default function initSqlJs(options?: {
    locateFile?: (file: string) => string
  }): Promise<SqlJsFactory>
}