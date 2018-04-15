var zDeviza;
var HRKAUD, HRKCAD, HRKCZK, HRKDKK, HRKHUF, HRKJPY, HRKNOK, HRKSEK, HRKCHF, HRKGBP, HRKUSD, HRKBAM, HRKEUR, HRKPLN;

window.onload = function()
{
    zDeviza = new XMLHttpRequest();
    zDeviza.open('GET', 'https://api.fixer.io/latest?base=HRK', true);
    zDeviza.onreadystatechange = primiDevize;
    zDeviza.send();
}

function primiDevize()
{
    if(zDeviza.readyState == 4 && zDeviza.status == 200)
    {
        var podaci = jQuery.parseJSON(zDeviza.responseText);
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
        document.getElementById("HRKAUD").innerHTML = (1 / HRKAUD).toFixed(6);
        document.getElementById("HRKCAD").innerHTML = (1 / HRKCAD).toFixed(6);
        document.getElementById("HRKCZK").innerHTML = (1 / HRKCZK).toFixed(6);
        document.getElementById("HRKDKK").innerHTML = (1 / HRKDKK).toFixed(6);
        document.getElementById("HRKHUF").innerHTML = (1 / HRKHUF).toFixed(6);
        document.getElementById("HRKJPY").innerHTML = (1 / HRKJPY).toFixed(6);
        document.getElementById("HRKNOK").innerHTML = (1 / HRKNOK).toFixed(6);
        document.getElementById("HRKSEK").innerHTML = (1 / HRKSEK).toFixed(6);
        document.getElementById("HRKCHF").innerHTML = (1 / HRKCHF).toFixed(6);
        document.getElementById("HRKGBP").innerHTML = (1 / HRKGBP).toFixed(6);
        document.getElementById("HRKUSD").innerHTML = (1 / HRKUSD).toFixed(6);
        document.getElementById("HRKEUR").innerHTML = (1 / HRKEUR).toFixed(6);
        document.getElementById("HRKPLN").innerHTML = (1 / HRKPLN).toFixed(6);
    }
}

function calculate()
{
    var amount = parseFloat(document.getElementById("amount").value);
    var select = document.getElementById("select");
    var select1 = document.getElementById("select1");
    var result = document.getElementById("result");

    var rates = {
        HRK : {
            HRK: 1,
            AUD: HRKAUD.toFixed(6),
            CAD: HRKCAD.toFixed(6),
            CZK: HRKCZK.toFixed(6),
            DKK: HRKDKK.toFixed(6),
            HUF: HRKHUF.toFixed(6),
            JPY: HRKJPY.toFixed(6),
            NOK: HRKNOK.toFixed(6),
            SEK: HRKSEK.toFixed(6),
            CHF: HRKCHF.toFixed(6),
            GBP: HRKGBP.toFixed(6),
            USD: HRKUSD.toFixed(6),
            EUR: HRKEUR.toFixed(6),
            PLN: HRKPLN.toFixed(6)
        }
    }

    if(rates[select.value] && rates[select.value][select1.value]){
        result.value = amount * rates[select.value][select1.value];
    }
}