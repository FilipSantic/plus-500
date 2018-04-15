module.exports = function(app, passport) {
    app.get('/', function(req, res) {
		  res.render('index.ejs');
    });
    
    app.get('/login', function(req, res) {
		  res.render('login.ejs', { message: req.flash('Upozorenje') });
    });
    
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile',
        failureRedirect : '/login',
        failureFlash : true
    }),
    function(req, res) {
        if (req.body.remember) {
          req.session.cookie.maxAge = 1000 * 60 * 3;
        } else {
          req.session.cookie.expires = false;
        }
    res.redirect('/');
    });

    app.get('/registracija', function(req, res) {
		  res.render('registracija.ejs', { message: req.flash('Upozorenje') });
    });
    
    app.post('/registracija', passport.authenticate('local-signup', {
      successRedirect : '/profile',
      failureRedirect : '/registracija',
      failureFlash : true
    }));
    
    app.get('/profile', isLoggedIn, function(req, res) {
      res.render('profile.ejs', {
        user : req.user,
      });
    });

    app.get('/trgovina', isLoggedIn, function(req, res) {
      res.render('trgovina.ejs', {
        user : req.user,
        message: req.flash('Upozorenje')
      });
    });

    app.post('/trgovina', passport.authenticate('local-trgovina', {
      successRedirect : '/trgovina',
      failureRedirect : '/trgovina',
      failureFlash : true,
    }));

    app.get('/stanje', isLoggedIn, function(req, res) {
      res.render('stanje.ejs', {
        user : req.user
      });
    });

    app.get('/kupovine', isLoggedIn, function(req, res) {
      res.render('kupovine.ejs', {
        user : req.user
      });
    });

    app.get('/uredi', isLoggedIn, function(req, res) {
      res.render('uredi.ejs', {
        user : req.user
      });
    });

    app.post('/uredi', passport.authenticate('local-uredi', {
      successRedirect : '/uredi',
      failureRedirect : '/uredi',
      failureFlash : true
    }));
    
    app.get('/odjava', function(req, res) {
      req.logout();
      res.redirect('/');
	  });
}

function isLoggedIn(req, res, next) {

	if (req.isAuthenticated())
		return next();

	res.redirect('/');
}