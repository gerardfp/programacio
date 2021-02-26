const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
var genuuid = require('uuid/v4');

const db = require('./db');
const runjava = require('./runjava')

const app = express();

app.use(session({
    genid: function(req) {
        return genuuid() // use UUIDs for session IDs
        },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs');

app.get('/', (req, res) => res.render('pages/login'))

app.post('/auth', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
        const n = await db.auth.auth(username, password);
        
        if(n > 0){
            req.session.loggedin = true;
            req.session.username = username;
            res.redirect('/home');
        } else {
            res.send('Incorrect Username and/or Password');
        }			
        res.end();
    } else {
        res.send('Please enter Username and Password!');
        res.end();
    }
});

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