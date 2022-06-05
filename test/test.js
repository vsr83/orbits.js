import {AssertionError, strict as assert} from 'assert';
import {norm, atan2d, asind} from "../src/MathUtils.js";
import {angleDiff, limitAngleDeg, angleDegArc, angleArcDeg, angleDegHms, angleHmsDeg} from "../src/Angles.js";
import {nutationTerms} from "../src/Nutation.js";
import {timeGast, timeGmst, timeJulianTs, timeJulianYmdhms, dateJulianYmd } from '../src/Time.js';
import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef, coordEfiWgs84, coordWgs84Efi, 
    coordEfiEnu, coordEnuEfi, coordEnuAzEl, coordAzElEnu, coordPerIne, coordInePer } from '../src/Frames.js';
import {keplerSolve, keplerPerifocal, keplerPlanets, keplerOsculating, keplerPropagate} from "../src/Kepler.js";

import {hipparchusFind, hipparchusGet} from "../src/Hipparchus.js";
import {vsop87} from "../src/Vsop87A.js";
import {aberrationStellarCart, aberrationStellarSph} from "../src/Aberration.js";

/**
 * Check floating point value with tolerance.   
 * 
 * @param {*} val 
 *      The value to be checked.
 * @param {*} exp 
 *      The expected value.
 * @param {*} tol 
 *      The tolerance for the check.
 */
function checkFloat(val, exp, tol)
{
    if (Math.abs(val - exp) > tol)
    {
        console.log("Value: " + val);
        console.log("Expected: " + exp);
        console.log("Error: " + Math.abs(val - exp) + " > " + tol);
    }
    assert.equal(Math.abs(val - exp) <= tol, true);
}

/**
 * Check floating point array with tolerance.   
 * 
 * @param {*} val 
 *      The value to be checked.
 * @param {*} exp 
 *      The expected value.
 * @param {*} tol 
 *      The tolerance for the check.
 */
 function checkFloatArray(val, exp, tol)
 {
     for (let indVal = 0; indVal < val.length; indVal++)
     {
         checkFloat(val[indVal], exp[indVal], tol);
     }
 }
 

describe('Angles', function() {
    describe('limitAngleDeg', function() {
        it('Test Ranges', function() {
            assert.equal(limitAngleDeg(100), 100);
            assert.equal(limitAngleDeg(0), 0);
            assert.equal(limitAngleDeg(360), 0);
            assert.equal(limitAngleDeg(361), 1);
            assert.equal(limitAngleDeg(720), 0);
            assert.equal(limitAngleDeg(721), 1);
            assert.equal(limitAngleDeg(-1), 359);
            assert.equal(limitAngleDeg(-361), 359);
            assert.equal(limitAngleDeg(-721), 359);
        });
    });

    describe('angleDiff', function() {
        it('Zero', function() {
            assert.equal(angleDiff(0, 0), 0);
            assert.equal(angleDiff(0, 360), 0);
            assert.equal(angleDiff(360, 0), 0);
            assert.equal(angleDiff(-360, 360), 0);
        });
        it('Middle positive', function() {
            assert.equal(angleDiff(100, 200), 100);
        });
        it('Middle negative', function() {
            assert.equal(angleDiff(200, 100), -100);
        });
        it('Left positive', function() {
            assert.equal(angleDiff(0, 0.1), 0.1);
        });
        it('Left negative', function() {
            assert.equal(angleDiff(0.1, 0), -0.1);
        });
        it('Right positive', function() {
            assert.equal(angleDiff(359, 0), 1);
            assert.equal(angleDiff(359, 360), 1);
            assert.equal(angleDiff(359, 720), 1);
            assert.equal(angleDiff(359, -360), 1);
            assert.equal(angleDiff(359, -720), 1);
        });
        it('Right negative', function() {
            assert.equal(angleDiff(-360, 359), -1);
            assert.equal(angleDiff(-720, 359), -1);
            assert.equal(angleDiff(0, 359), -1);
            assert.equal(angleDiff(360, 359), -1);
            assert.equal(angleDiff(720, 359), -1);
        });
        it('Missing arguments', function() {
            assert.equal(angleDiff(120), -120);
            assert.equal(angleDiff(), 0);
        });
    });

    describe('angleDegArc', function() {
        it('Nominal Range', function() {
            let {deg, arcMin, arcSec} = angleDegArc(1 + 2/60 + 3/3600);
            assert.equal(deg, 1);
            assert.equal(arcMin, 2);
            checkFloat(arcSec, 3, 1e-9);
        });
        it('Below Range', function() {
            let {deg, arcMin, arcSec} = angleDegArc(-359 + 2/60 + 3/3600);
            assert.equal(deg, 1);
            assert.equal(arcMin, 2);
            checkFloat(arcSec, 3, 1e-9);
        });
        it('Above Range', function() {
            let {deg, arcMin, arcSec} = angleDegArc(361 + 2/60 + 3/3600);
            assert.equal(deg, 1);
            assert.equal(arcMin, 2);
            checkFloat(arcSec, 3, 1e-9);
        });
    });

    describe('angleArcDeg', function() {
        it('Nominal Range', function() {
            checkFloat(angleArcDeg(1, 2, 3), 1 + 2/60 + 3/3600, 1e-9);
        });
        it('Below Range', function() {
            checkFloat(angleArcDeg(-359, 2, 3), 1 + 2/60 + 3/3600, 1e-9);
            checkFloat(angleArcDeg(1, 2 - 360 * 60, 3), 1 + 2/60 + 3/3600, 1e-9);
            checkFloat(angleArcDeg(1, 2, 3 - 360 * 3600), 1 + 2/60 + 3/3600, 1e-9);
        });
        it('Above Range', function() {
            checkFloat(angleArcDeg(361, 2, 3), 1 + 2/60 + 3/3600, 1e-9);
        });
    });

    describe('angleDegHms', function() {
        it('Nominal Range', function() {
            let {hour, minute, second} = angleDegHms(1 * 15.0 + 2 * 15.0/60 + 3 * 15/3600);
            assert.equal(hour, 1);
            assert.equal(minute, 2);
            checkFloat(second, 3, 1e-9);
        });
        it('Below Range', function() {
            let {hour, minute, second} = angleDegHms(-23 * 15.0 + 2 * 15.0/60 + 3 * 15/3600);
            assert.equal(hour, 1);
            assert.equal(minute, 2);
            checkFloat(second, 3, 1e-9);
        });
        it('Above Range', function() {
            let {hour, minute, second} = angleDegHms(25 * 15.0 + 2 * 15.0/60 + 3 * 15/3600);
            assert.equal(hour, 1);
            assert.equal(minute, 2);
            checkFloat(second, 3, 1e-9);
        });
    });

    describe('angleHmsDeg', function() {
        it('Nominal Range', function() {
            checkFloat(angleHmsDeg(1, 2, 3), 1 * 15 + 2*15/60 + 3*15/3600, 1e-9);
        });
        it('Below Range', function() {
            checkFloat(angleHmsDeg(-23, 2, 3), 1 * 15 + 2*15/60 + 3*15/3600, 1e-9);
        });
        it('Above Range', function() {
            checkFloat(angleHmsDeg(25, 2, 3), 1 * 15 + 2*15/60 + 3*15/3600, 1e-9);
        });
    });
});

describe('Time', function() {
    describe('dateJulianYmd', function() {
        it('Values from 2020', function() {
            checkFloat(dateJulianYmd(2000, 1, 1),  2451544.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 1, 15), 2451558.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 2, 1),  2451575.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 2, 15), 2451589.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 3, 1),  2451604.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 3, 15), 2451618.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 4, 1),  2451635.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 4, 15), 2451649.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 5, 1),  2451665.5, 1e-9);
            checkFloat(dateJulianYmd(2000, 5, 15), 2451679.5, 1e-9);
        });
    });

    describe('timeJulianYmdhms', function() {
        it('2022-05-15 23:53:20', function() {
            const {JD, JT} = timeJulianYmdhms(2022, 5, 15, 23, 53, 20);
            checkFloat(JT, 2459715.49537, 1e-6);
        });
    });

    describe('timeJulianTs', function() {
        it('2022-05-15 23:53:20', function() {
            const {JD, JT} = timeJulianTs(new Date("2022-05-15T23:53:20Z"));
            checkFloat(JT, 2459715.49537, 1e-6);
        });
    });

    describe('timeGmst', function() {
        it('2022-05-16T22:50:30Z', function() {
            const {JD, JT} = timeJulianTs(new Date("2022-05-16T22:50:30Z"));
            checkFloat(timeGmst(JT), 217.2555200824681, 1e-6);
        });
    });

    describe('timeGast', function() {
        it('2022-05-16T22:50:30Z', function() {
            const {JD, JT} = timeJulianTs(new Date("2022-05-16T22:50:30Z"));
            checkFloat(timeGast(JT), 217.2517594733733, 1e-6);
        });
    });
});

describe('Nutation', function() {
    describe('nutationTerms', function() {
        it('Values', function() {
            const {JD, JT} = timeJulianTs(new Date("2022-05-16T22:50:30Z"));
            const T = (JT - 2451545.0) / 36525.0;
            const {eps, deps, dpsi} = nutationTerms(T);
            checkFloat(eps, 23.436381788329449, 1e-9);
            checkFloat(deps, 0.001487806899909, 1e-9);
            checkFloat(dpsi, -0.004098746414266, 1e-9);
        });
    });
});

describe('Frames', function() {
    describe('coordEclEq, coordEqEcl', function() {
        it('Venus', function() {
            const osvEcl = {
                r : [ 7.653966861471243e+10,
                     -7.269230239742627e+10,
                      3.069790583074071e+09],
                v : [ 2.472162821491882e+04,
                      6.277680984101855e+03,
                     -1.813571001229737e+03],
                JT : 2459662.467361111
            };
            const osvJ2000Exp = 
            {
                r : [ 76539668614.71243,
                     -67916298380.10200,
                     -26095418302.98473],
                v : [2.472162821491882e+04,
                     6.481099018198909e+03,
                     8.328708368988578e+02],
                JT : 2459662.467361111
            };

            const osvJ2000 = coordEclEq(osvEcl);
            checkFloatArray(osvJ2000.r, osvJ2000Exp.r, 1);
            checkFloatArray(osvJ2000.v, osvJ2000Exp.v, 1e-4);
            checkFloat(osvJ2000.JT, osvJ2000Exp.JT, 1e-6);
        });
    });

    describe('coordJ2000Mod, coordModJ2000', function() {
        it('Venus', function() {
            const osvJ2000 = {
                r : [ 76539668614.71243,
                    -67916298380.10200,
                    -26095418302.98473],
                v : [2.472162821491882e+04,
                    6.481099018198909e+03,
                    8.328708368988578e+02],
                JT : 2459662.467361111
            };
            const osvModExp = {
                r : [76932446023.74319,
                    -67534911860.58974,
                    -25929707721.04863
                  ],
                v : [2.468725514893796e+04,
                    6.603882768282808e+03,
                    8.862197838793985e+02],
                JT : 2459662.467361111
            };

            const osvMod = coordJ2000Mod(osvJ2000);
            checkFloatArray(osvMod.r, osvModExp.r, 1);
            checkFloatArray(osvMod.v, osvModExp.v, 1e-4);
            checkFloat(osvMod.JT, osvModExp.JT, 1e-6);

            const osvJ20002 = coordModJ2000(osvMod);
            checkFloatArray(osvJ20002.r, osvJ2000.r, 1);
            checkFloatArray(osvJ20002.v, osvJ2000.v, 1e-4);
            checkFloat(osvJ20002.JT, osvJ2000.JT, 1e-6);
        });
    });

    describe('coordModTod, coordTodMod', function() {
        it('Venus', function() {
            const osvMod = {
                r : [76932446023.74319,
                    -67534911860.58974,
                    -25929707721.04863
                  ],
                v : [2.468725514893796e+04,
                    6.603882768282808e+03,
                    8.862197838793985e+02],
                JT : 2459662.467361111
            };
            const osvTodExp = {
                r : [ 76927508947.49406,
                     -67539009327.52528,
                     -25933682729.27057],
                v : [2.468769303715834e+04,
                     6.602310869956531e+03,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };

            const osvTod = coordModTod(osvMod);
            checkFloatArray(osvTod.r, osvTodExp.r, 1);
            checkFloatArray(osvTod.v, osvTodExp.v, 1e-4);
            checkFloat(osvTod.JT, osvTodExp.JT, 1e-6);

            const osvMod2 = coordTodMod(osvTod);
            checkFloatArray(osvMod2.r, osvMod.r, 1);
            checkFloatArray(osvMod2.v, osvMod.v, 1e-4);
            checkFloat(osvMod2.JT, osvMod.JT, 1e-6);
        });
    });

    describe('coordTodPef, coordPefTod', function() {
        it('Venus', function() {
            const osvTod = {
                r : [ 76927508947.49406,
                     -67539009327.52528,
                     -25933682729.27057],
                v : [2.468769303715834e+04,
                     6.602310869956531e+03,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };
            const osvPefExp = {
                r : [-87793943599.69176,
                      52645824915.41444,
                     -25933682729.27057
                  ],
                v : [3.815891418527184e+06,
                     6.391112794089540e+06,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };

            const osvPef = coordTodPef(osvTod);
            checkFloatArray(osvPef.r, osvPefExp.r, 1);
            checkFloatArray(osvPef.v, osvPefExp.v, 1e-4);
            checkFloat(osvPef.JT, osvPefExp.JT, 1e-6);

            const osvTod2 = coordPefTod(osvPef);
            checkFloatArray(osvTod2.r, osvTod.r, 1);
            checkFloatArray(osvTod2.v, osvTod.v, 1e-4);
            checkFloat(osvTod2.JT, osvTod.JT, 1e-6);
        });
    });

    describe('coordPefEfi, coordEfiPef', function() {
        it('Venus', function() {
            const osvPef = {
                r : [-87793943599.69176,
                      52645824915.41444,
                     -25933682729.27057
                  ],
                v : [3.815891418527184e+06,
                     6.391112794089540e+06,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };
            const osvEfiExp = {
                r : [-87838751662.35324,
                      52736029625.35403,
                     -25596488029.92342],
                v : [3.815926089266752e+06,
                    6.391070765456880e+06,
                    1.653485602488094e+04],
                JT : 2459662.467361111
            };

            const osvEfi = coordPefEfi(osvPef, 0.1, 0.2);
            checkFloatArray(osvEfi.r, osvEfiExp.r, 1);
            checkFloatArray(osvEfi.v, osvEfiExp.v, 1e-4);
            checkFloat(osvEfi.JT, osvEfiExp.JT, 1e-6);

            const osvPef2 = coordEfiPef(osvEfi, 0.1, 0.2);
            checkFloatArray(osvPef2.r, osvPef.r, 1);
            checkFloatArray(osvPef2.v, osvPef.v, 1e-4);
            checkFloat(osvPef2.JT, osvPef.JT, 1e-6);
        });
    });

    describe('coordEfiWgs84, coordWgs84Efi', function() {
        it('Venus', function() {
            const rEfi = [-87838751662.35324,
                           52736029625.35403,
                          -25596488029.92342];
            const latExp = -14.02735035654504;
            const lonExp = 149.0205247603176;
            const hExp = 105596252409.9468;

            const {lat, lon, h} = coordEfiWgs84(rEfi, 10, 1e-16, false);
            checkFloat(lat, latExp, 1e-6);
            checkFloat(lon, lonExp, 1e-6);
            checkFloat(h, hExp, 100);

            const rEfi2 = coordWgs84Efi(lat, lon, h);
            checkFloatArray(rEfi2, rEfi, 1);
        });
    });

    describe('coordEfiEnu, coordEnuEfi', function() {
        it('Venus', function() {
            const osvEfi = {
                r : [-87838751662.35324,
                      52736029625.35403,
                     -25596488029.92342],
                v : [3.815926089266752e+06,
                    6.391070765456880e+06,
                    1.653485602488094e+04],
                JT : 2459662.467361111
            };
            const lat = 60.205490;
            const lon = 24.0206;
            const h = 105596252409.9468;

            const osvEnuExp = {
                r : [ 83925132910.53931,
                      38278260514.84691,
                     -51419041065.68192],
                v : [ 4284268.453380695,
                     -5274201.499041729,
                      3038946.069965863],
                JT : 2459662.467361111
            };

            const osvEnu = coordEfiEnu(osvEfi, lat, lon, 0);
            checkFloatArray(osvEnu.r, osvEnuExp.r, 1);
            checkFloatArray(osvEnu.v, osvEnuExp.v, 1e-4);
            checkFloat(osvEnu.JT, osvEnuExp.JT, 1e-6);

            const osvEfi2 = coordEnuEfi(osvEnu, lat, lon, 0);
            checkFloatArray(osvEfi2.r, osvEfi.r, 1);
            checkFloatArray(osvEfi2.v, osvEfi.v, 1e-4);
            checkFloat(osvEfi2.JT, osvEfi.JT, 1e-6);
        });
    });

    describe('coordEnuAzEl, coordAzElEnu', function() {
        it('Venus', function() {
            const osvEnu = {
                r : [ 83925132910.53931,
                      38278260514.84691,
                     -51419041065.68192],
                v : [ 4284268.453380695,
                     -5274201.499041729,
                      3038946.069965863],
                JT : 2459662.467361111
            };
            const azExp = 65.48226691416835;
            const elExp = -29.13678780543464;

            const osv = coordEnuAzEl(osvEnu);
            checkFloat(osv.az, azExp, 1e-6);
            checkFloat(osv.el, elExp, 1e-6);
            checkFloat(osv.dist, norm(osvEnu.r), 1);
            checkFloat(osv.JT, osvEnu.JT, 1e-6);

            const osvEnu2 = coordAzElEnu(osv);
            checkFloatArray(osvEnu2.r, osvEnu.r, 1);
            checkFloat(osvEnu2.JT, osvEnu.JT, 1e-6);
        });
    });

    describe('coordPerIne, coordInePer', function() {
        it('Venus', function() {
            const osvPer = {
                r : [2.593281124802490e+10,
                     1.468514157356373e+11,
                                         0],
                v : [-2.933489929039629e+04,
                      5.677830279125575e+03,
                                          0],
                JT : 2459662.467361111
            };

            const Omega = 347.6140484010017;
            const incl = 359.9971073661852;
            const omega = -244.6045207975887;
            
            const osvIneExp = {
                r : [-1.489199431961666e+11,
                     -7.790989491059203e+09,
                      1.996839980819461e+06],
                v : [1.071574068660730e+03,
                    -2.986010381659133e+04,
                     1.460825013954209e+00],
                JT : 2459662.467361111
            };

            const osvIne = coordPerIne(osvPer, Omega, incl, omega);
            checkFloatArray(osvIne.r, osvIneExp.r, 1);
            checkFloatArray(osvIne.v, osvIneExp.v, 1e-4);
            checkFloat(osvIne.JT, osvIneExp.JT, 1e-6);

            const osvPer2 = coordInePer(osvIne, Omega, incl, omega);
            checkFloatArray(osvPer2.r, osvPer.r, 1);
            checkFloatArray(osvPer2.v, osvPer.v, 1e-4);
            checkFloat(osvPer2.JT, osvPer.JT, 1e-6);
        });
    });
});

describe('Hipparchus', function() {
    describe('hipparchusFind', function() {
        it('SingleMatch', function() {
            const resultsVega = hipparchusFind('Vega');
            assert.equal(resultsVega.length, 1);
            assert.equal(resultsVega[0], "3 Alpha Lyrae (Vega)");
        });
    });
    describe('hipparchusGet', function() {
        it('SingleMatch', function() {
            const vega = hipparchusGet("3 Alpha Lyrae (Vega)");
            const RAexp = 279.2347344323626;
            const DEexp = 38.783688589075688;

            checkFloat(vega.RA, RAexp, 1e-5);
            checkFloat(vega.DE, DEexp, 1e-5);
            checkFloat(vega.mag, 0.086800, 1e-20);
        });
    });
});

describe('Kepler', function() {
    describe('keplerPlanets', function() {
        it('Values', function() {
            const planets = keplerPlanets(0);
            const earth = keplerPlanets.earth;

            //keplerPerifocal(earth.a, earth.b, earth.E, 1, 1);
        });
    });

    describe('keplerSolve', function() {
        it('Values', function() {
            keplerSolve(100, 0.1, 1e-9, 10);
        });
    });

    describe('keplerPropagate', function() {
        it('Jupiter', function() {
            const M0 = -19.121440704840762;
            const a = 7.791675475674921e+11;
            const ecc_norm = 0.049355487491014;
            const mu = 1.327124400180000e+20;

            let {M, E} = keplerPropagate(100, M0, a, ecc_norm, mu);
            checkFloat(M, -10.829696265596557, 1e-6);
            checkFloat(E, 3.486119336056595e+02, 1e-6); 
        });
    });

    describe('keplerPerifocal', function() {
        it('Jupiter', function() {
            const a = 7.791675475674921e+11;
            const b = 7.782179568180367e+11;
            const E = -20.092935136837660;
            const mu = 1.327124400180000e+20;
            const JT = 2.459729500000000e+06;

            let {r, v} = keplerPerifocal(a, b, E, mu, JT);
            checkFloatArray(r, [6.932885828550206e11, -2.673520294767202e11, 0], 1);
            checkFloatArray(v, [0.470147701795366e4, 1.283663661361050e4, 0], 1e-7);
        });
    });

    describe('keplerOsculating', function() {
        it('Jupiter', function() {
            // Standard gravitational parameter for the Sun.
            const mu = 1.32712440018e20;
            const r = [7.364141603506416e11, -0.977860704076983e11, -0.160697122476993e11];
            const v = [0.156712533025024e4, 1.358009117984457e4, -0.009147374829921e4];

            const kepler = keplerOsculating(r, v, mu);
            checkFloat(kepler.a, 7.791675475674921e+11, 1);
            checkFloat(kepler.b, 7.782179568180367e+11, 1);
            checkFloat(kepler.mu, mu, 1e9);
            checkFloat(kepler.ecc_norm, 0.049355487491014, 1e-6);
            checkFloat(kepler.incl, 1.303571611846412, 1e-10);
            checkFloat(kepler.Omega, 1.005183550488739e+02, 1e-6);
            checkFloat(kepler.omega, -86.989778432121909, 1e-6);
            checkFloat(kepler.E, -20.092935136837660, 1e-6);
            checkFloat(kepler.M, -19.121440704840762, 1e-6);
            checkFloat(kepler.f,-21.088074675151098, 1e-6);
        });
    });


    describe('Integration test', function() {
        describe('Ecliptic coordinates', function() {
            const JTs = [
                timeJulianYmdhms(2022, 1, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 2, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 3, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 4, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 5, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 6, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 7, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 8, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 9, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 10, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 11, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 12, 1, 0, 0, 0),
                timeJulianYmdhms(2023, 1, 1, 0, 0, 0),
            ];

            let eclLonExp = {};
            let eclLatExp = {};

            // JPL Horizons has the issue that there is a delay associated to limited speed of light
            // from the planet to the observer and one has to fix the observer to some other body. 
            // For Mercury, the object is the Sun, which limits accuracy.
            eclLonExp.mercury = [353.517981, 166.600082, 257.435814, 3.078041, 171.079718, 268.550029,
                                 18.487901, 187.275246, 279.918520, 41.099529, 201.718043, 288.776298,
                                 65.679867];
            eclLatExp.mercury = [-5.7313, 6.1736, -3.4226, -4.9839, 5.8971, -4.5381,
                                -3.4952, 4.6103, -5.5005, -0.8824, 3.1467, -6.1014,
                                2.1014];
            eclLonExp.venus = [95.4130, 145.7195, 191.1252, 240.8421, 288.4039, 337.4525,
                            25.1782,  74.8979, 125.0697, 173.7997, 223.7525, 271.4698,
                            320.4988];
            eclLatExp.venus = [1.0946,  3.1715, 3.0892, 0.9239, -1.7895, -3.3512,
                            -2.6555, -0.1020, 2.5417, 3.3678,  1.8435, -0.8711,
                            -3.0485];
            // Observed from the Moon.
            eclLonExp.earth = [100.2321, 131.7889, 160.0713, 190.944277, 220.3139, 250.2070,
                               278.8679, 308.4498, 338.2506,   7.4939,  38.2307,  68.4438,
                                99.9696];
            eclLatExp.earth = [-0.0027, -0.0019, -0.0007,  0.0009,  0.0021,  0.0028, 
                                0.0028,  0.0021,  0.0008, -0.0007, -0.0021, -0.0029,
                                -0.0029];
            eclLonExp.mars = [235.6622, 251.9850, 267.5016, 285.5425, 303.7719, 323.1862,
                              342.2196,   1.7621,  20.8201,  38.5530,  56.0081,  72.0375,
                               87.7695];
            eclLatExp.mars = [-0.1987, -0.7072, -1.1382, -1.5331, -1.7789, -1.8441,
                              -1.7045, -1.3676, -0.8868, -0.3507, 0.2099, 0.7088,
                               1.1451];
            // Observed from the Europa Moon.
            eclLonExp.jupiter = [338.9305, 341.7283, 344.2612, 347.0716, 349.7970, 352.6183,
                                 355.3532, 358.1832,   1.0169,   3.762,   6.6006,   9.3493,
                                  12.1907];
            eclLatExp.jupiter = [-1.1105, -1.1425, -1.1691, -1.1960, -1.2193, -1.2405,
                                 -1.2582, -1.2735, -1.2857, -1.2945, -1.3005, -1.3033,
                                 -1.3030];
            // From Titan.
            eclLonExp.saturn = [314.5648, 315.5247, 316.3928, 317.3551, 318.2877, 319.2527,
                                320.1880, 321.1557, 322.1249, 323.0642, 324.0363, 324.9784,
                                325.9534];
            eclLatExp.saturn = [-0.8902, -0.9290, -0.9638, -1.0022, -1.0391, -1.0770,
                                -1.1135, -1.1509, -1.1880, -1.2237, -1.2602, -1.2953,
                                -1.3312];
            eclLonExp.uranus = [43.1120, 43.4564, 43.7676, 44.1123, 44.4461, 44.78912,
                                45.1253, 45.4707, 45.8164, 46.1510, 46.4970, 46.8320, 
                                47.1783];
            eclLatExp.uranus = [-0.3966, -0.3926, -0.3890, -0.3850, -0.3811, -0.3771,
                                -0.3731, -0.3691, -0.3650, -0.3610, -0.3569, -0.3529,
                                -0.3487];
            eclLonExp.neptune = [352.1394, 352.3272, 352.4969, 352.6848, 352.8666, 353.0545,
                                353.2364, 353.4243, 353.6122, 353.7941, 353.9820, 354.1639,
                                354.3518];
            eclLatExp.neptune = [-1.1466, -1.1510, -1.1550, -1.1594, -1.1636, -1.1680,
                                -1.1722, -1.1765, -1.1808, -1.1850, -1.1893, -1.1935,
                                -1.1977];
            const tolerances = {
                mercury : {lon : 30/3600, lat : 16/3600},
                venus   : {lon : 1/60,  lat : 4/3600},
                earth   : {lon : 25/3600,  lat : 1.5/3600},
                mars    : {lon : 44/3600,  lat : 0.6/3600},
                jupiter : {lon : 400/3600, lat : 2/3600},
                saturn  : {lon : 600/3600,  lat : 10/3600},
                uranus  : {lon : 120/3600,  lat : 2/3600},
                neptune : {lon : 1/60,  lat : 2/3600},
            }

            for (let planetName in eclLonExp)
            {
                it(planetName, function() {
                    for (let indTs = 0; indTs < JTs.length; indTs++)
                    {
                        const JT = JTs[indTs].JT;
                        const planets = keplerPlanets(JT);

                        const planet = planets[planetName];

                        const osvPer = keplerPerifocal(planet.a, planet.b, planet.E, planet.mu, JT);
                        const osvIne = coordPerIne(osvPer, planet.Omega, planet.i, planet.omega);
        
                        const r = osvIne.r;
                        const eclLon = limitAngleDeg(atan2d(r[1], r[0]));
                        const eclLat = asind(r[2] / norm(r));
        
                        checkFloat(eclLon, eclLonExp[planetName][indTs], tolerances[planetName].lon);
                        checkFloat(eclLat, eclLatExp[planetName][indTs], tolerances[planetName].lat);
                    }
                });
            }
        });
    });
});

describe('Vsop87A', function() {
    describe('vsop87', function() {
        let JT = dateJulianYmd(2022, 6, 4);

        it('Mercury', function() {
            let {r, v} = vsop87('mercury', JT);
            const rExp = [0.832216213265148e10,
                         -6.797620046569159e10,
                         -0.631833047746736e10];
            const vExp = [ 3.858225040730701e4,
                           0.841936365251681e4,
                          -0.285100298395750e4];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Venus', function() {
            let {r, v} = vsop87('venus', JT);
            const rExp = [1.034553614357372e11,
                         -0.331752946333728e11,
                         -0.064250597873576e11];
            const vExp = [ 1.050760766009897e4,
                           3.319522640775217e4,
                          -0.015061516960006e4];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Earth', function() {
            let {r, v} = vsop87('earth', JT);
            const rExp = [-0.441603031327149e11,
                          -1.451855385436845e11,
                           0.000070723106588e11];
            const vExp = [ 2.802462046043991e4,
                          -0.877593220974710e4,
                          -0.000006085918161e4];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Mars', function() {
            let {r, v} = vsop87('mars', JT);
            const rExp =[ 1.696288009064622e11,
                         -1.184051043620771e11,
                         -0.066425106325372e11];
            const vExp = [1.478752475232476e4,
                          2.194392463015448e4,
                          0.009715597396017e4];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Jupiter', function() {
            let {r, v} = vsop87('jupiter', JT);
            const rExp =[ 7.370688842802807e11,
                         -0.919165975255762e11,
                         -0.161087368565761e11];
            const vExp = [ 0.146404196154004e4,
                           1.359336294642521e4,
                          -0.008922200077270e4];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Saturn', function() {
            let {r, v} = vsop87('saturn', JT);
            const rExp =[ 1.121823661255941e12,
                         -0.963345953041318e12,
                         -0.027895459837396e12];
            const vExp = [ 5.758138754399658e3,
                           7.321848375466634e3,
                          -0.356301821101666e3];
            checkFloatArray(r, rExp, 1);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Uranus', function() {
            let {r, v} = vsop87('uranus', JT);
            const rExp =[ 2.090329648084641e12,
                          2.077548675094168e12,
                         -0.019375227735338e12];
            const vExp = [-4.849445825477810e3,
                           4.526483779517674e3,
                           0.079428295534293e3];
            checkFloatArray(r, rExp, 300);
            checkFloatArray(v, vExp, 1e-3);
        });
        it('Neptune', function() {
            let {r, v} = vsop87('neptune', JT);
            const rExp =[ 4.441950700597463e12,
                         -0.539571281726818e12,
                         -0.091260681739656e12];
            const vExp = [0.622289525677747e3,
                          5.443509008569659e3,
                         -0.126229531062381e3];
            checkFloatArray(r, rExp, 300);
            checkFloatArray(v, vExp, 1e-3);
        });
    });
});

describe('Aberration', function() {
    describe('aberrationStellarCart', function() {
        let rJ2000 = [1.250964636332911e24,
            -7.694131278689816e24,
            6.263819229905307e24]; 
        const vObsJ2000 = [0.290007812179439e2,
                          -2.298670535956016e2,
                          -0.000564533814336e2];
        const rJ2000Exp = [ 1.250891664149846e24,
                           -7.694700506965913e24,
                            6.263134530940476e24];
        const JT = 2.459659458332178e+06;
        rJ2000 = aberrationStellarCart(JT, rJ2000, vObsJ2000);
        checkFloatArray(rJ2000, rJ2000Exp, 1e10);

        rJ2000 = aberrationStellarCart(JT, rJ2000);
        checkFloatArray(rJ2000, rJ2000Exp, 1e21);
    });
});
