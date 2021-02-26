const db = require('./db');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

app.use(session({
    genid: function(req) {
        return genuuid() // use UUIDs for session IDs
      },
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }))

