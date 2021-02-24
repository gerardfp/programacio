const cool = require('cool-ascii-faces');
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const { Client } = require('pg-promise');

var pgp = require('pg-promise')(/* options */)
var db = pgp({
  connectionString:  process.env.DATABASE_URL,
  ssl: true
});

console.log(process.env.DATABASE_URL);

db.one('SELECT $1 AS value', 123)
  .then(function (data) {
    console.log('DATA:', data.value)
  })
  .catch(function (error) {
    console.log('ERROR:', error)
  })


const dbse = async () => {
  const { err, res } = await db.one('SELECT table_schema,table_name FROM information_schema.tables;');

  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  client.end();

  return res.rows;
}

const cmd = async () => {
  var ret = "mmm";
  const { stdout, stderr } = await exec("java Main.java");
  if(stdout) return stdout;

  return stderr;
}

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/test', (req, res) => res.send("test"))
  .get('/test2', (req, res) => res.send("test2"))
  .get('/java', async (req, res) => { const p = await cmd(); res.send(p)})
  .get('/db', async (req, res) => { const p = await dbse(); res.send(p)})
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
