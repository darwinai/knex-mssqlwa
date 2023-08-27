# Knex MSSQL Client with Windows Authentication (WA) Support

[![npm version](https://img.shields.io/badge/npm-v1.0.2-blue)](https://npmjs.org/package/knex-mssqlwa)

This Knex dialect allows connecting to a MSSQL database using the windows auth.

This work is branched off [the Knex v2.5.1 MSSQL dialect](https://github.com/knex/knex/tree/2.5.1/lib/dialects/mssql).

## Usage

```
import { mssqlwa } from 'knex-mssqlwa';

const knex = require('knex')({
    client: mssqlwa,
    driver: 'SQL Server Native Client 11.0',
    connection: {
        host: '127.0.0.1',
        database: 'myapp_test',
        port: 1433,
        options: {
            encrypt: true,
            trustedConnection: true,
            trustServerCertificate: true,
          },
    }
);
```
