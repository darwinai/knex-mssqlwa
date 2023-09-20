// MSSQL Client
// -------
const map = require('lodash/map');
const isNil = require('lodash/isNil');

const knex = require('knex');
const MSSQL_Formatter = require('./mssql-formatter');
const Transaction = require('./transaction');
const QueryCompiler = require('./query/mssql-querycompiler');
const SchemaCompiler = require('./schema/mssql-compiler');
const TableCompiler = require('./schema/mssql-tablecompiler');
const ViewCompiler = require('./schema/mssql-viewcompiler');
const ColumnCompiler = require('./schema/mssql-columncompiler');
const QueryBuilder = require('knex/lib/query/querybuilder');
const { setHiddenProperty } = require('knex/lib/util/security');

const debug = require('debug')('knex:mssqlwa');

const SQL_INT4 = { MIN: -2147483648, MAX: 2147483647 };
const SQL_BIGINT_SAFE = { MIN: -9007199254740991, MAX: 9007199254740991 };

// Always initialize with the "QueryBuilder" and "QueryCompiler" objects, which
// extend the base 'lib/query/builder' and 'lib/query/compiler', respectively.
class Client_MSSQL_WA extends knex.Client {
  static resultMode = undefined;

  constructor(config = {}) {
    super(config);
  }

  _generateConnection() {
    const config = this.config;
    const settings = this.config.connection;

    const cfg = {
      authentication: {
        type: settings.type || 'default',
        options: {
          userName: settings.userName || settings.user,
          password: settings.password,
        },
      },
      driver: config.driver || 'SQL Server Native Client 11.0',
      server: settings.server || settings.host,
      database: settings.database,
      port: settings.port || 1433,
      connectionTimeout: settings.connectionTimeout || settings.timeout || 15000,
      requestTimeout: !isNil(settings.requestTimeout) ? settings.requestTimeout : 15000,
      options: {
        encrypt: settings.encrypt || false,
        trustServerCertificate: settings.options.trustServerCertificate || false,
        trustedConnection: settings.options.trustedConnection || false,
        ...settings.options,
      },
    };

    if (cfg.authentication.options.password) {
      setHiddenProperty(cfg.authentication.options);
    }

    if (isNaN(cfg.options.requestTimeout)) cfg.options.requestTimeout = 15000;
    if (cfg.options.requestTimeout === Infinity) cfg.options.requestTimeout = 0;
    if (cfg.options.requestTimeout < 0) cfg.options.requestTimeout = 0;

    if (settings.debug) {
      cfg.options.debug = {
        packet: true,
        token: true,
        data: true,
        payload: true,
      };
    }

    return cfg;
  }

  _driver() {
    const msnodesql = require('mssql/msnodesqlv8');
    return msnodesql;
  }

  formatter() {
    return new MSSQL_Formatter(this, ...arguments);
  }

  transaction() {
    return new Transaction(this, ...arguments);
  }

  queryCompiler() {
    return new QueryCompiler(this, ...arguments);
  }

  schemaCompiler() {
    return new SchemaCompiler(this, ...arguments);
  }

  tableCompiler() {
    return new TableCompiler(this, ...arguments);
  }

  viewCompiler() {
    return new ViewCompiler(this, ...arguments);
  }
  queryBuilder() {
    const b = new QueryBuilder(this);
    return b;
  }

  columnCompiler() {
    return new ColumnCompiler(this, ...arguments);
  }

  wrapIdentifierImpl(value) {
    if (value === '*') {
      return '*';
    }

    return `[${value.replace(/[[\]]+/g, '')}]`;
  }

  initializePool(config = this.config) {
    super.initializePool(config);
    this.resultMode = config.resultMode || 'default';

    const settings = this._generateConnection();
    const connectionString =
      `Driver={${settings.driver}};`+
      `UID=${settings.authentication.options.userName};`+
      `PWD=${settings.authentication.options.password};`+
      `Server=${settings.server},${settings.port};`+
      `Database=${settings.database};`+
      `Trusted_Connection=${settings.options.trustedConnection ? 'yes' : 'no'};`+
      `TrustServerCertificate=${settings.options.trustServerCertificate ? 'yes' : 'no'};` +
      `Encrypt=${settings.options.encrypt ? 'yes' : 'no'};`
    const poolConfig = {
      connectionString: connectionString,
      connectionPooling: true,
      pool: config.pool,
      ...settings,
    };

    const Driver = this._driver();
    const connectionPool = new Driver.ConnectionPool(poolConfig);
    connectionPool.on('error', (err) => {
      console.error('A connection error occurred:', err);
    });
    this._connectionPool = connectionPool;
  }

  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection() {
    return new Promise((resolver, rejecter) => {
      debug('connection::connection new connection requested');
      this._connectionPool.connect((err, pool) => {
        if (err)
          return rejecter(err);
        return resolver(pool);
      });
    });
  }

  validateConnection(connection) {
    return connection && connection.connected;
  }

  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  async destroyRawConnection(connection) {
    debug('connection::destroy');
    return await connection.close();
  }

  // Position the bindings for the query.
  positionBindings(sql) {
    if (sql.startsWith("exec")) {
      debug('Skipping position binding for a procedure.');
      return sql;
    }

    let questionCount = -1;
    return sql.replace(/\\?\?/g, (match) => {
      if (match === '\\?') {
        return '?';
      }

      questionCount += 1;
      return `@c${questionCount}`;
    });
  }

  _chomp(connection) {
    throw Error('Not implemented!');
    if (connection.connected === true) {
      // const nextRequest = this.requestQueue.pop();
      const request = this.requestQueue.pop();
      if (request) {
        debug(
          'connection::query executing query, %d more in queue',
          this.requestQueue.length
        );
        // try {
        //   request.validateParameters(this.databaseCollation);
        // } catch (error) {
        //   request.error = error;
        //   // process.nextTick(() => {
        //     //   this.debug.log(error.message);
        //     //   request.callback(error);
        //     // });
        //     return;
        //   }
        // this.logger.warn(JSON.stringify(request, null, 0));
        const parameters = [];
        parameters.push({
          type: this._driver().NVarChar,
          name: 'statement',
          value: request.sql,
          output: false,
          length: undefined,
          precision: undefined,
          scale: undefined
        });
    
        if (request.parameters.length) {
          parameters.push({
            type: this._driver().NVarChar,
            name: 'params',
            value: request.makeParamsParameter(request.parameters),
            output: false,
            length: undefined,
            precision: undefined,
            scale: undefined
          });
          parameters.push(...request.parameters);
        }
        const execRegex = /^exec\s+(\w+)/i;
        const match = request.sql.match(execRegex);

        if (match) {
          const storedProcedureName = match[1];
        } else {
          request.query(request.sql, (err, result) => {
            if (err) {
              this.logger.error(err);
              return;
            }
            for (const row of result.recordsets[0]) {
              request.emit('row', row);
            }
            
            // console.log(result.recordsets.length) // count of recordsets returned by the procedure
            // console.log(result.recordsets[0].length) // count of rows contained in first recordset
            // console.log(result.recordset) // first recordset from result.recordsets
            // console.log(result.returnValue) // procedure return value
            // console.log(result.output) // key/value collection of output values
            // console.log(result.rowsAffected) // array of numbers, each number represents the number of rows affected by executed statemens
          });
        }
        // connection.execSql(nextRequest);
      }
    }
  }

  _enqueueRequest(request, connection) {
    this.requestQueue.push(request);
    this._chomp(connection);
  }

  _makeRequest(query, callback) {
    const Driver = this._driver();
    const sql = typeof query === 'string' ? query : query.sql;
    let rowCount = 0;

    if (!sql) throw new Error('The query is empty');

    debug('request::request sql=%s', sql);

    const request = this._connectionPool.request();
    request.sql = sql;
    request.on('prepared', () => {
      debug('request %s::request prepared', this.id);
    });

    request.on('done', (rowCount, more) => {
      debug('request::done rowCount=%d more=%s', rowCount, more);
    });

    request.on('doneProc', (rowCount, more) => {
      debug(
        'request::doneProc id=%s rowCount=%d more=%s',
        request.id,
        rowCount,
        more
      );
    });

    request.on('doneInProc', (rowCount, more) => {
      debug(
        'request::doneInProc id=%s rowCount=%d more=%s',
        request.id,
        rowCount,
        more
      );
    });

    request.once('requestCompleted', () => {
      debug('request::completed id=%s', request.id);
      return callback(null, rowCount);
    });

    request.on('error', (err) => {
      debug('request::error id=%s message=%s', request.id, err.message);
      return callback(err);
    });

    return request;
  }

  // Grab a connection, run the query via the MSSQL streaming interface,
  // and pass that through to the stream we've sent back to the client.
  _stream(connection, query, /** @type {NodeJS.ReadWriteStream} */ stream) {
    throw Error('Not implemented!');
    return new Promise((resolve, reject) => {
      const request = this._makeRequest(query, (err) => {
        if (err) {
          stream.emit('error', err);
          return reject(err);
        }

        resolve();
      });

      request.on('row', (row) => {
        stream.write(
          row.reduce(
            (prev, curr) => ({
              ...prev,
              [curr.metadata.colName]: curr.value,
            }),
            {}
          )
        );
      });
      request.on('error', (err) => {
        stream.emit('error', err);
        reject(err);
      });
      request.once('requestCompleted', () => {
        stream.end();
        resolve();
      });

      this._assignBindings(request, query.bindings);
      this._enqueueRequest(request, connection);
    });
  }

  _assignBindings(request, bindings, paramNames) {
    if (Array.isArray(bindings)) {
      for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];

        const bindingName = paramNames[i].replace("@", "");
        this._setReqInput(request, bindingName, binding);
      }
    }
  }

  _scaleForBinding(binding) {
    if (binding % 1 === 0) {
      throw new Error(`The binding value ${binding} must be a decimal number.`);
    }

    return { scale: 10 };
  }

  _typeForBinding(binding) {
    const Driver = this._driver();

    if (
      this.connectionSettings.options &&
      this.connectionSettings.options.mapBinding
    ) {
      const result = this.connectionSettings.options.mapBinding(binding);
      if (result) {
        return [result.value, result.type];
      }
    }

    switch (typeof binding) {
      case 'string':
        return [binding, Driver.TYPES.NVarChar];
      case 'boolean':
        return [binding, Driver.TYPES.Bit];
      case 'number': {
        if (binding % 1 !== 0) {
          return [binding, Driver.TYPES.Float];
        }

        if (binding < SQL_INT4.MIN || binding > SQL_INT4.MAX) {
          if (binding < SQL_BIGINT_SAFE.MIN || binding > SQL_BIGINT_SAFE.MAX) {
            throw new Error(
              `Bigint must be safe integer or must be passed as string, saw ${binding}`
            );
          }

          return [binding, Driver.TYPES.BigInt];
        }

        return [binding, Driver.TYPES.Int];
      }
      default: {
        if (binding instanceof Date) {
          return [binding, Driver.TYPES.DateTime];
        }

        if (binding instanceof Buffer) {
          return [binding, Driver.TYPES.VarBinary];
        }

        return [binding, Driver.TYPES.NVarChar];
      }
    }
  }

  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query(connection, query) {
    const sql = typeof query === 'string' ? query : query.sql;
    const procNameMatch = sql.match(/exec\s+([^@\s]+)/);
    const procName = procNameMatch ? procNameMatch[1] : null;
    const paramNames = sql.match(/@(\w+)/g);
  
    const request = connection.request();
    this._assignBindings(request, query.bindings, paramNames);
    return new Promise(function (resolver, rejecter) {
        if (sql.startsWith("exec")) {
          request.execute(procName, function (err, response) {
            if (err) return rejecter(err);
            query.response = response;
            resolver(query);
          });
        } else {
          request.query(sql, function (err, response) {
            if (err) return rejecter(err);
            query.response = response;
            resolver(query);
          });
        }

      });
  }

  // sets a request input parameter. Detects bigints and decimals and sets type appropriately.
  _setReqInput(req, bindingName, inputBinding) {
    const [binding, bindingType] = this._typeForBinding(inputBinding);
    let options;

    if (typeof binding === 'number' && binding % 1 !== 0) {
      options = this._scaleForBinding(binding);
    }

    debug(
      'request::binding bindingName=%s type=%s value=%s',
      bindingName,
      bindingType.name,
      binding
    );

    if (Buffer.isBuffer(binding)) {
      options = {
        length: 'max',
      };
    }
    req.input(bindingName, bindingType, binding, options);
  }

  // Process the response as returned from the query.
  processResponse(query, runner) {
    if (query == null) return;
    const { recordsets, recordset } = query.response;
    const { method } = query;

    if (query.output) {
      return query.output.call(runner, response);
    }

    switch (method) {
      case 'select':
        return recordset;
      case 'first':
        return recordset[0];
      case 'pluck':
        return map(response, query.pluck);
      case 'insert':
      case 'del':
      case 'update':
      case 'counter':
        if (query.returning) {
          if (query.returning === '@@rowcount') {
            return recordset[''];
          }
        }
        return recordset;
      default:
        switch (this.resultMode) {
          case 'multi':
            return recordsets;
          case 'mixed':
            return recordsets.length === 1 ? recordset : recordsets;
          default:
            return recordset;
        }
    }
  }
}

Object.assign(Client_MSSQL_WA.prototype, {
  requestQueue: [],

  dialect: 'mssqlwa',

  driverName: 'msnodesqlv8',
});

module.exports = Client_MSSQL_WA;
