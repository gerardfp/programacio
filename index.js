const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const routes = require('./routes');
const db = require('./db');
const runjava = require('./runjava')

const app = express();

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
        // ,
        // cookie: { secure: true }
}))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs');



function restrict(req, res, next) {
    if (req.session.user) {
      next();
    } else {
      res.redirect('/login');
    }
}

function restrictAdmin(req, res, next) {
    if (req.session.isAdmin) {
      next();
    } else if(!req.session.user){
      res.redirect('/login');
    }
}

    
app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/') }) });
  
app.get('/login', (req, res) => { res.render('pages/login') });
  
app.post('/login', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    if(user = await db.auth.auth(username, password)){
        req.session.regenerate(function(){
            req.session.user = user.email;

            if(user.admin){
                req.session.isAdmin = user.admin; 
                res.redirect('/admin');
            } else {
                res.redirect('/');
            }
        });
    } else {
        res.redirect('/login');
    }
});

app.use('/admin', restrictAdmin, routes.admin);
app.use('/', restrict, routes.index);


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