const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');
const routes = require('./routes');
const db = require('./db');
const crypto = require('./lib/crypto');

const app = express();

const production  = 'https://programacio.herokuapp.com';
const development = 'http://localhost:5000';
const url = (process.env.NODE_ENV ? production : development);

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


// TODO: config
const password = "holaquetal";


async function getTransport()  {
    const smtpconfig = await db.config.getSMTP();

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpconfig.smtpuser,
          pass: smtpconfig.smtppass
        }
    });
}

const gettransport = getTransport();


function restrict(req, res, next) {
    if (req.session.user_email) {
      next();
    } else {
      res.redirect('/login');
    }
}

function restrictAdmin(req, res, next) {
    if (req.session.user_admin) {
      next();
    } else if(!req.session.user){
      res.redirect('/login');
    }
}

const postlogin = async (req, res) => {
    if(user = await db.auth.auth(req.body.user_email, req.body.user_password)){
        req.session.regenerate(function(){
            req.session.user_email = user.user_email;
            req.session.user_id = user.user_id;

            if(user.admin){
                req.session.user_admin = user.user_admin; 
                res.redirect('/admin');
            } else {
                res.redirect('/');
            }
        });
    } else {
        res.redirect('/login');
    }
};


app.get('/signup', (req, res) => { res.render('pages/signup') });

app.post('/signup', async (req, res) => {
    const encryptedEmail = crypto.encryptString(req.body.user_email, password);

    const transporter = await gettransport;

    var mailOptions = {
        from: 'ocnwaatte@gmail.com',
        to: req.body.user_email,
        subject: 'Sending Email via Node.js',
        html: `Bienvenido a ocnwaatte! <a href='${url}/verify/${encryptedEmail}'>Haz clic aquí para crear la cuenta</a>`
    };
      
    const info = await transporter.sendMail(mailOptions);
    res.send("Email sent. Check your email");
});

app.get('/verify/*', async (req, res) => {

    let decryptedEmail;
    try {
        decryptedEmail = crypto.decryptString(req.params[0], password);
    } catch(e){
        res.send("error, clave invalida");   
        return;
    }
    
    res.render('pages/signuppass', {user_email: decryptedEmail, encryptedEmail: req.params[0]});
});

app.post('/setpass', async (req, res, next) => {

    let decryptedEmail;
    try {
        decryptedEmail = crypto.decryptString(req.body.encryptedemail, password);
    } catch(e){
        res.render("error, clave invalida");     
        return;   
    }
    
    if(req.body.user_email === decryptedEmail){
        await db.auth.upsert(decryptedEmail, req.body.user_password);
        next();
    } else {
        res.render("error, la clave no coincide con el email");        
    }
}, postlogin);


app.get('/logout', (req, res) => { req.session.destroy(() => { res.redirect('/') }) });
app.get('/login', (req, res) => { res.render('pages/login') });
app.post('/login', postlogin);
app.use('/admin', restrictAdmin, routes.admin);
app.use('/', restrict, routes.index);

  
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));