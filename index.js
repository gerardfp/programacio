const cool = require('cool-ascii-faces');
const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5000;

const util = require('util');
const exec = util.promisify(require('child_process').exec);

const cmd = async () => {
  var ret = "mmm";
  const { stdout, stderr } = await exec("java Main.java");
  if (stderr) {
      return stderr;
  }
  return stdout;
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
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
