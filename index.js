const express = require('express');
const path = require('path');
const db = require('./db');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const PORT = process.env.PORT || 5000;



const cmd = async () => {
  var ret = "mmm";
  const { stdout, stderr } = await exec("java Main.java");
  if(stdout) return stdout;

  return stderr;
}

const app = express();



app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))

GET('/java', () => cmd());
GET('/db', () => db.posts.all());
  
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));

function GET(url, handler) {
  app.get(url, async (req, res) => {
      try {
          const data = await handler(req);
          res.json({
              success: true,
              data
          });
      } catch (error) {
          res.json({
              success: false,
              error: error.message || error
          });
      }
  });
}