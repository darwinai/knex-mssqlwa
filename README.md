# Knex MSSQL Client with Windows Authentication (WA) Support

[![npm version](http://img.shields.io/npm/v/knex-mssqlwa.svg)](https://npmjs.org/package/knex-mssqlwa)
[![npm downloads](https://img.shields.io/npm/dm/knex-mssqlwa.svg)](https://npmjs.org/package/knex-mssqlwa)

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
