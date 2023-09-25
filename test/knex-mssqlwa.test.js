const assert = require('assert');
const mssqlwa = require('../knex-mssqlwa');
const knex = require('knex');

describe('result mode test suite', () => {
  test('test default result mode', async () => {
    const config = {
      client: mssqlwa,
      driver: 'ODBC Driver 18 for SQL Server',
      connection: {
        host: 'localhost',
        database: 'master',
        requestTimeout: 2000,
        options: {
          encrypt: true,
          trustedConnection: true,
          trustServerCertificate: true,
        },
      },
    };

    const db = knex(config);
    const result = await db.raw('select 1;');
    await db.destroy();
    const expectedResult = [{ '': 1 }];
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
    const expectedResult = [{ '': 1 }];
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
    const expectedResult = [[{ '': 1 }], [{ '': 2 }]];
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
    const expectedResult = [[{ '': 1 }]];
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
    const expectedResult = [[{ '': 1 }], [{ '': 2 }]];
    expect(result).toEqual(expectedResult);
  });
});

describe('timeout test suite', () => {
  test('test long query 15s timeout expired', async () => {
    const config = {
      client: mssqlwa,
      driver: 'ODBC Driver 18 for SQL Server',
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
    try {
      await db.raw("waitfor delay '00:00:15';");
    } catch (err) {
      assert(err != null);
      assert(err.message.indexOf('Query timeout expired') > 0);
    }
    await db.destroy();
  }, 20000);

  test('test long query timeout success', async () => {
    const config = {
      client: mssqlwa,
      driver: 'ODBC Driver 18 for SQL Server',
      connection: {
        host: 'localhost',
        database: 'master',
        port: 1433,
        requestTimeout: 16000,
        options: {
          encrypt: true,
          trustedConnection: true,
          trustServerCertificate: true,
        },
      },
    };

    const db = knex(config);
    try {
      await db.raw("waitfor delay '00:00:15';");
    } catch (err) {
      assert(err != null);
      assert(err.message.indexOf('Query timeout expired') > 0);
    }
    await db.destroy();
  }, 20000);
});

describe('concurrent DB connections', () => {
  test('test parallel requests through Promise', async () => {
    const config = {
      client: mssqlwa,
      driver: 'ODBC Driver 18 for SQL Server',
      connection: {
        host: 'localhost',
        database: 'master',
        // connectionTimeout: 100000,
        // requestTimeout: 100000,
        options: {
          encrypt: true,
          trustedConnection: true,
          trustServerCertificate: true,
        },
      },
      pool: {
        min: 0,
        max: 10,
        // reapIntervalMillis: 100,
        // acquireTimeoutMillis: 300000,
        // idleTimeoutMillis: 500,
        // propagateCreateError: true,
      },
      // acquireConnectionTimeout: 5,
    };

    const db = knex(config);

    const queryPromises = Array.from({ length: 50 });
    await Promise.all(
      queryPromises.map(() => {
        return db.raw('select 1;');
      })
    );

    await db.destroy();
  }, 100000);

  test('test multiple DB connections in a loop', async () => {
    const config = {
      client: mssqlwa,
      driver: 'ODBC Driver 18 for SQL Server',
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
        min: 10,
        max: 100,
      },
    };

    const numConnections = 100;
    const dbConnections = [];

    try {
      // Create multiple DB connections concurrently
      for (let i = 0; i < numConnections; i++) {
        const db = knex(config);
        const result = await db.raw('select 1');
        dbConnections.push({ db, result });
      }

      // Check that all connections were successful
      dbConnections.forEach(({ db, result }) => {
        db.destroy();
        const expectedResult = [{ '': 1 }];
        expect(result).toEqual(expectedResult);
      });
    } catch (error) {
      // Handle any errors that may occur during connection creation or execution
      throw error;
    } finally {
      // Ensure all DB connections are properly closed
      dbConnections.forEach(({ db }) => {
        db.destroy();
      });
    }
  }, 100000);
});
