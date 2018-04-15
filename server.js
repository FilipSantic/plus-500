var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');
var flash = require('connect-flash');
var engine = require('consolidate');
var phonegap = require('connect-phonegap');
var path = require('path');

var app = express();

// Spajanje na bazu podataka
require('./config/passport')(passport); // passport konfiguracija

// Postavljanje aplikacije
app.use(morgan('dev')); // spajanje svakog zahtjeva u konzolu
app.use(cookieParser()); // cookies (potrebno za autorizaciju kod logina)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Potrebno za passport
app.use(session({
	secret: 'vidyapathaisalwaysrunning',
	resave: true,
	saveUninitialized: true
 } )); // session tajni kod
app.use(passport.initialize());
app.use(passport.session()); // trajni login session
app.use(flash());

app.use(phonegap());

// Routes
require('./app/routes.js')(app, passport); // spajanje svih ruta u main.js

// Pokretanje servera
app.listen(3000, function(){
    console.log('Server je pokrenut na portu 3000...')
})