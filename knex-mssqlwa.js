// Knex-MSSQLWA.js
// --------------
//     (c) 2023 DarwinAI Corp
//     This library may be freely distributed under the MIT license.

const mssqlwa = require('./dialect/mssqlwa/index');

/**
 * These export configurations enable JS and TS developers
 * to consume knex in whatever way best suits their needs.
 * Some examples of supported import syntax includes:
 * - `const mssqlwa = require('mssqlwa')`
 * - `const { mssqlwa } = require('mssqlwa')`
 * - `import * as mssqlwa from 'mssqlwa'`
 * - `import { mssqlwa } from 'mssqlwa'`
 * - `import mssqlwa from 'mssqlwa'`
 */
mssqlwa.mssqlwa = mssqlwa;
mssqlwa.default = mssqlwa;

module.exports = mssqlwa;
