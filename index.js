const express = require('express');
const path = require('path');
const db = require('./db');
const runjava = require('./runjava')
const app = express();



app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))

GET('/java', () => runjava());
GET('/db', () => db.posts.all());
  
const PORT = process.env.PORT || 5000;
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