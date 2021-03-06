const promise = require('bluebird'); // best promise library today
const pgPromise = require('pg-promise'); // pg-promise core library
const {Problems, Auth, Config} = require('./repos');

const initOptions = {
    promiseLib: promise,
    extend(obj, dc) {
        obj.problems = new Problems(obj, pgp);
        obj.auth = new Auth(obj, pgp);
        obj.config = new Config(obj, pgp);
    }
};

const pgp = pgPromise(initOptions);

const db = pgp({
    connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/programacio',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

module.exports = db;