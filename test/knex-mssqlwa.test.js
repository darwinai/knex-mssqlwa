const mssqlwa = require('../knex-mssqlwa');
const knex = require('knex');

test('test default result mode', async () => {
  const config = {
    client: mssqlwa,
    connection: {
      host: 'localhost',
      database: 'master',
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: true,
      },
    }
  };
  const db = knex(config);
  const result = await db.raw('select 1; select 2;');
  db.destroy();
  const expectedResult = [{ "": 1 }];
  expect(result).toEqual(expectedResult);
});

test('test mixed result mode, one return recordset', async () => {
  const config = {
    client: mssqlwa,
    driver: 'ODBC Driver 18 for SQL Server',
    resultMode: 'mixed',
    connection: {
      host: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: true,
      },
    },
    pool: {
      min: 2,
      max: 100,
    },
  };
  const db = knex(config);
  const result = await db.raw('select 1');
  db.destroy();
  const expectedResult = [{ "": 1 }];
  expect(result).toEqual(expectedResult);
});

test('test mixed result mode, two return recordsets', async () => {
  const config = {
    client: mssqlwa,
    driver: 'ODBC Driver 18 for SQL Server',
    resultMode: 'mixed',
    connection: {
      host: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: true,
      },
    },
    pool: {
      min: 2,
      max: 100,
    },
  };
  const db = knex(config);
  const result = await db.raw('select 1; select 2;');
  db.destroy();
  const expectedResult = [[{ "": 1 }], [{ "": 2 }]];
  expect(result).toEqual(expectedResult);
});

test('test multi result mode, one return recordset', async () => {
  const config = {
    client: mssqlwa,
    driver: 'ODBC Driver 18 for SQL Server',
    resultMode: 'multi',
    connection: {
      host: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: true,
      },
    },
  };
  const db = knex(config);
  const result = await db.raw('select 1');
  db.destroy();
  const expectedResult = [[{ "": 1 }]];
  expect(result).toEqual(expectedResult);
});

test('test multi result mode, return two recordsets', async () => {
  const config = {
    client: mssqlwa,
    driver: 'ODBC Driver 18 for SQL Server',
    resultMode: 'multi',
    connection: {
      host: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: true,
        trustedConnection: true,
        trustServerCertificate: true,
      },
    },
  };
  const db = knex(config);
  const result = await db.raw('select 1; select 2;');
  db.destroy();
  const expectedResult = [[{ "": 1 }], [{ "": 2 }]];
  expect(result).toEqual(expectedResult);
});
