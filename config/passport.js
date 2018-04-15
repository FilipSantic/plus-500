var LocalStrategy = require('passport-local').Strategy;
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var dbconfig = require('./database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        connection.query("SELECT * FROM korisnici WHERE id = ? ",[id], function(err, rows){
            done(err, rows[0]);
        });
    });

    passport.use(
        'local-signup',
        new LocalStrategy({
            usernameField : 'korisnik',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, korisnik, password, done)
        {
            connection.query("SELECT * FROM korisnici WHERE korisnik = ?",[korisnik], function(err, rows)
            {
                if (err)
                    return done(err);
                if (rows.length) {
                    return done(null, false, req.flash('Upozorenje', 'Korisničko ime je već zauzeto.'));
                } else {
                    var newUserMysql = {
                        korisnik: korisnik,
                        password: bcrypt.hashSync(password, null, null)
                    };

                    var insertQuery = "INSERT INTO `korisnici` ( `korisnik`, `password` ) values (?,?)";

                    connection.query(insertQuery,[newUserMysql.korisnik, newUserMysql.password],function(err, rows) {
                        newUserMysql.id = rows.insertId;

                        return done(null, newUserMysql);
                    });
                }
            });
        })
    );

    passport.use(
        'local-login',
        new LocalStrategy({
            usernameField : 'korisnik',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, korisnik, password, done)
        {
            connection.query("SELECT * FROM korisnici WHERE korisnik = ?",[korisnik], function(err, rows)
            {
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false, req.flash('Upozorenje', 'Korisnik nije registriran.'));
                }

                if (!bcrypt.compareSync(password, rows[0].password))
                    return done(null, false, req.flash('Upozorenje', 'Upisali ste krivu lozinku.'));

                return done(null, rows[0]);
            });
        })
    );

    passport.use(
        'local-uredi',
        new LocalStrategy({
            usernameField : 'korisnik',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, korisnik, password, done)
        {
            connection.query("UPDATE korisnici SET Grad = ?, Adresa = ?, Kontakt = ? WHERE korisnik = ?",[req.body.grad, req.body.adresa, req.body.kontakt, korisnik], function(err, rows)
            {
                if (err)
                    return done(err);

                return done(null, rows[0]);
            });
        })
    );

    passport.use(
        'local-trgovina',
        new LocalStrategy({
            usernameField : 'korisnik',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, korisnik, password, done)
        {
            var iz = req.body.iz;
            var u = req.body.u;
            var iznos = req.body.iznos;
            var zDeviza;
            var HRKAUD, HRKCAD, HRKCZK, HRKDKK, HRKHUF, HRKJPY, HRKNOK, HRKSEK, HRKCHF, HRKGBP, HRKUSD, HRKBAM, HRKEUR, HRKPLN;
            connection.query("SELECT * FROM korisnici WHERE korisnik = ?", [korisnik], function(err, rows)
            {
                if (err)
                    return done(err);

                zDeviza = new XMLHttpRequest();
                zDeviza.open('GET', 'https://api.fixer.io/latest?base=HRK', true);
                zDeviza.onreadystatechange = primiDevize;
                zDeviza.send();

                function primiDevize()
                {
                    if(zDeviza.readyState == 4 && zDeviza.status == 200)
                    {
                        var podaci = JSON.parse(zDeviza.responseText);
                        HRKAUD = podaci.rates.AUD;
                        HRKCAD = podaci.rates.CAD;
                        HRKCZK = podaci.rates.CZK;
                        HRKDKK = podaci.rates.DKK;
                        HRKHUF = podaci.rates.HUF;
                        HRKJPY = podaci.rates.JPY;
                        HRKNOK = podaci.rates.NOK;
                        HRKSEK = podaci.rates.SEK;
                        HRKCHF = podaci.rates.CHF;
                        HRKGBP = podaci.rates.GBP;
                        HRKUSD = podaci.rates.USD;
                        HRKEUR = podaci.rates.EUR;
                        HRKPLN = podaci.rates.PLN;

                        var kune = rows[0].kune;
                        var aud = rows[0].aud;
                        var cad = rows[0].cad;
                        var czk = rows[0].czk;
                        var dkk = rows[0].dkk;
                        var huf = rows[0].huf;
                        var jpy = rows[0].jpy;
                        var nok = rows[0].nok;
                        var sek = rows[0].sek;
                        var chf = rows[0].chf;
                        var gbp = rows[0].gbp;
                        var usd = rows[0].usd;
                        var eur = rows[0].eur;
                        var pln = rows[0].pln;

                        if(iz == "fromHRK")
                        {
                            if(iznos > kune) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno kuna na računu.'));
                            if(u == "intoHRK") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti kune u kune.'));
                            if(u == "intoAUD")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKAUD;
                                connection.query("UPDATE korisnici SET kune = ?, aud = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);
                                });
                                connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    return done(null, rows[0]);
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKCAD;
                                connection.query("UPDATE korisnici SET kune = ?, cad = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCZK")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKCZK;
                                connection.query("UPDATE korisnici SET kune = ?, czk = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKDKK;
                                connection.query("UPDATE korisnici SET kune = ?, dkk = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKHUF;
                                connection.query("UPDATE korisnici SET kune = ?, huf = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKJPY;
                                connection.query("UPDATE korisnici SET kune = ?, joy = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKNOK;
                                connection.query("UPDATE korisnici SET kune = ?, nok = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKCAD;
                                connection.query("UPDATE korisnici SET kune = ?, sek = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKCHF;
                                connection.query("UPDATE korisnici SET kune = ?, chf = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKGBP;
                                connection.query("UPDATE korisnici SET kune = ?, gbp = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKUSD;
                                connection.query("UPDATE korisnici SET kune = ?, usd = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKEUR;
                                connection.query("UPDATE korisnici SET kune = ?, eur = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = kune - iznos;
                                var piznos = iznos * HRKPLN;
                                connection.query("UPDATE korisnici SET kune = ?, pln = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromAUD")
                        {
                            if(iznos > aud) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno australskih dolara na računu.'));
							if(u == "intoAUD") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti australske dolare u australske dolare.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (1 / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKCAD / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCZK")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKCZK / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoDKK")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKDKK / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKHUF / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKJPY / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKNOK / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKSEK / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKCHF / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKGBP / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKUSD / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKEUR / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = aud - iznos;
                                var piznos = iznos * (HRKPLN / HRKAUD);
                                connection.query("UPDATE korisnici SET AUD = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromCAD")
                        {
                            if(iznos > cad) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno kanadskih dolara na računu.'));
							if(u == "intoCAD") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti kanadske dolare u kanadske dolare.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (1 / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKAUD / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCZK")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKCZK / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoDKK")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKDKK / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKHUF / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKJPY / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKNOK / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKSEK / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKCHF / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKGBP / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKUSD / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKEUR / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = cad - iznos;
                                var piznos = iznos * (HRKPLN / HRKCAD);
                                connection.query("UPDATE korisnici SET CAD = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromCZK")
                        {
                            if(iznos > czk) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno čeških kruna na računu.'));
							if(u == "intoCZK") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti češke krune u češke krune.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (1 / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKAUD / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKCAD / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoDKK")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKDKK / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKHUF / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKJPY / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKNOK / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKSEK / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKCHF / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKGBP / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKUSD / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKEUR / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = czk - iznos;
                                var piznos = iznos * (HRKPLN / HRKCZK);
                                connection.query("UPDATE korisnici SET CZK = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromDKK")
                        {
                            if(iznos > dkk) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno danskih krune na računu.'));
							if(u == "intoDKK") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti danske krune u danske krune.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (1 / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKAUD / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKCAD / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKCZK / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKHUF / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKJPY / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKNOK / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKSEK / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKCHF / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKGBP / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKUSD / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKEUR / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = dkk - iznos;
                                var piznos = iznos * (HRKPLN / HRKDKK);
                                connection.query("UPDATE korisnici SET DKK = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromHUF")
                        {
                            if(iznos > huf) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno mađarskih forinti na računu.'));
							if(u == "intoHUF") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti mađarske forinte u mađarske forinte.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (1 / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKAUD / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKCAD / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKCZK / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKDKK / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKJPY / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKNOK / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKSEK / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKCHF / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKGBP / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKUSD / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKEUR / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = huf - iznos;
                                var piznos = iznos * (HRKPLN / HRKHUF);
                                connection.query("UPDATE korisnici SET HUF = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromJPY")
                        {
                            if(iznos > jpy) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno japanskih jena na računu.'));
							if(u == "intoJPY") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti japanske jene u japanske jene.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (1 / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKAUD / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKCAD / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKCZK / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKDKK / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKHUF / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKNOK / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKSEK / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKCHF / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKGBP / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKUSD / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKEUR / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = jpy - iznos;
                                var piznos = iznos * (HRKPLN / HRKJPY);
                                connection.query("UPDATE korisnici SET JPY = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromNOK")
                        {
                            if(iznos > nok) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno norveških kruna na računu.'));
							if(u == "intoNOK") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti norveške krune u norveške krune.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (1 / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKAUD / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKCAD / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKCZK / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKDKK / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKHUF / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKJPY / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKSEK / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKCHF / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKGBP / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKUSD / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKEUR / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = nok - iznos;
                                var piznos = iznos * (HRKPLN / HRKNOK);
                                connection.query("UPDATE korisnici SET NOK = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromSEK")
                        {
                            if(iznos > sek) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno švedskih kruna na računu.'));
							if(u == "intoSEK") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti švedske krune u švedske krune.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (1 / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKAUD / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKCAD / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKCZK / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKDKK / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKHUF / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKJPY / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKNOK / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKCHF / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKGBP / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKUSD / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKEUR / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = sek - iznos;
                                var piznos = iznos * (HRKPLN / HRKSEK);
                                connection.query("UPDATE korisnici SET SEK = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromCHF")
                        {
                            if(iznos > chf) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno švicarkih franaka na računu.'));
							if(u == "intoCHF") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti švicarske franke u švicarske franke.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (1 / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKAUD / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKCAD / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKCZK / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKDKK / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKHUF / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKJPY / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKNOK / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKSEK / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKGBP / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKUSD / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKEUR / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = chf - iznos;
                                var piznos = iznos * (HRKPLN / HRKCHF);
                                connection.query("UPDATE korisnici SET CHF = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromGBP")
                        {
                            if(iznos > gbp) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno britanskih funti na računu.'));
							if(u == "intoGBP") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti britanske funte u britanske funte.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (1 / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKAUD / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKCAD / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKCZK / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKDKK / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKHUF / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKJPY / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKNOK / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKSEK / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKCHF / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKUSD / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKEUR / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = gbp - iznos;
                                var piznos = iznos * (HRKPLN / HRKGBP);
                                connection.query("UPDATE korisnici SET GBP = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromUSD")
                        {
                            if(iznos > usd) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno američkih dolara na računu.'));
							if(u == "intoUSD") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti američke dolare u američke dolare.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (1 / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKAUD / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKCAD / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKCZK / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKDKK / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKHUF / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKJPY / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKNOK / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKSEK / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKCHF / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKGBP / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKEUR / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = usd - iznos;
                                var piznos = iznos * (HRKPLN / HRKUSD);
                                connection.query("UPDATE korisnici SET USD = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromEUR")
                        {
                            if(iznos > eur) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno eura na računu.'));
							if(u == "intoEUR") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti eure u eure.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (1 / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKAUD / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKCAD / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKCZK / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKDKK / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKHUF / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKJPY / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKNOK / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKSEK / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKCHF / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKGBP / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKUSD / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoPLN")
                            {
                                var kiznos = eur - iznos;
                                var piznos = iznos * (HRKPLN / HRKEUR);
                                connection.query("UPDATE korisnici SET EUR = ?, PLN = ? WHERE korisnik = ?", [kiznos, pln + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                        if(iz == "fromPLN")
                        {
                            if(iznos > pln) return done(null, false, req.flash('Upozorenje', 'Nemate dovoljno poljskih zlota na računu.'));
							if(u == "intoPLN") return done(null, false, req.flash('Upozorenje', 'Ne možete pretvoriti poljske zlote u poljske zlote.'));
                            if(u == "intoHRK")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (1 / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, kune = ? WHERE korisnik = ?", [kiznos, kune + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoAUD")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKAUD / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, AUD = ? WHERE korisnik = ?", [kiznos, aud + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCAD")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKCAD / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, CAD = ? WHERE korisnik = ?", [kiznos, cad + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
							else if(u == "intoCZK")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKCZK / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, CZK = ? WHERE korisnik = ?", [kiznos, czk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoDKK")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKDKK / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, DKK = ? WHERE korisnik = ?", [kiznos, dkk + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoHUF")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKHUF / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, HUF = ? WHERE korisnik = ?", [kiznos, huf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoJPY")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKJPY / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, JPY = ? WHERE korisnik = ?", [kiznos, jpy + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoNOK")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKNOK / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, NOK = ? WHERE korisnik = ?", [kiznos, nok + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoSEK")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKSEK / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, SEK = ? WHERE korisnik = ?", [kiznos, sek + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoCHF")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKCHF / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, CHF = ? WHERE korisnik = ?", [kiznos, chf + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoGBP")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKGBP / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, GBP = ? WHERE korisnik = ?", [kiznos, gbp + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoUSD")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKUSD / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, USD = ? WHERE korisnik = ?", [kiznos, usd + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                            else if(u == "intoEUR")
                            {
                                var kiznos = pln - iznos;
                                var piznos = iznos * (HRKEUR / HRKPLN);
                                connection.query("UPDATE korisnici SET PLN = ?, EUR = ? WHERE korisnik = ?", [kiznos, eur + piznos, korisnik], function(err, rows)
                                {
                                    if (err)
                                        return done(err);

                                    connection.query("INSERT INTO `transakcije` ( `korisnik`, `iz`, `piznos`, `u`, `kiznos`, `kiznos2` ) values (?,?,?,?,?,?)", [korisnik, req.body.iz, iznos, req.body.u, kiznos, piznos], function(err, rows)
                                    {
                                        if (err)
                                            return done(err);
    
                                        return done(null, rows[0]);
                                    });
                                });
                            }
                        }
                    }
                }
            });
        })
    );
}