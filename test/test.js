import {AssertionError, strict as assert} from 'assert';
import {norm, vecMul, vecSum, atand, atan2d, asind, linComb, vecDiff, tand} from "../src/MathUtils.js";
import {angleDiff, limitAngleDeg, angleDegArc, angleArcDeg, angleDegHms, angleHmsDeg} from "../src/Angles.js";
import {nutationTerms} from "../src/Nutation.js";
import {timeGast, timeGmst, timeJulianTs, timeJulianYmdhms, dateJulianYmd, timeGregorian } from '../src/Time.js';
import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef, coordEfiWgs84, coordWgs84Efi, 
    coordEfiEnu, coordEnuEfi, coordEnuAzEl, coordAzElEnu, coordPerIne, coordInePer } from '../src/Frames.js';
import {keplerSolve, keplerPerifocal, keplerPlanets, keplerOsculating, keplerPropagate} from "../src/Kepler.js";

import {hipparcosFind, hipparcosGet, properMotion} from "../src/Hipparcos.js";
import {vsop87, vsop87ABary} from "../src/Vsop87A.js";
import {aberrationStellarCart, aberrationStellarSph} from "../src/Aberration.js";
import {moonPositionEcl, moonNodePassage, moonNodePassages, moonNew, moonNewList } from '../src/Moon.js';
import {timeStepping, integrateRk4, integrateRk8, osvToRhsPM, updateOsvPM, osvStatePM} from '../src/Integration.js';
import {createContours, eclipseMagDerGrid, besselianSolarWithDelta, besselianCentralLine, besselianSolar, solarEclipses, coordFundTod, besselianRiseSet, besselianLimits, eclipseMagnitude, eclipseMagGrid } from '../src/Eclipses.js';
import { correlationTaiUt1, correlationUt1Tai, correlationTdbUt1, correlationUt1Tdb } from '../src/TimeCorrelation.js';
import { elp2000 } from '../src/Elp2000-82b.js';
import { horizons_data_planets_1900_2100 } from '../data/horizons_data_planets_1900_2100.js';
import { horizons_data_moon_1900_2100 } from '../data/horizons_data_moon_1900_2100.js';

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

 /**
 * Compute the position of the Moon for a sequence of Julian times and compute
 * errors to the given coordinates.
 * 
 * @param {*} array 
 *      The expected array with rows in the format [JT, X, Y, Z].
 * @returns Object with maximum, minimum and average errors.
 */
function checkArrayElp2000(array)
{
    let maxError = 0;
    let avgError = 0;
    let minError = 1e10;

    for (let indValue = 0; indValue < array.length; indValue++)
    {
        const values = array[indValue];
        const JT = values[0];
        const computed = vecMul(elp2000(JT), 0.001);
        const expected = [values[1], values[2], values[3]];

        // Difference between the two coordinate vectors.
        const diff = [
            computed[0] - expected[0], 
            computed[1] - expected[1], 
            computed[2] - expected[2]
        ];

        const diffNorm = Math.sqrt(diff[0]*diff[0] + diff[1]*diff[1] + diff[2]*diff[2]);
        avgError += diffNorm;
        if (diffNorm > maxError)
        {
            maxError = diffNorm;
        }
        if (diffNorm < minError)
        {
            minError = diffNorm;
        }
        //console.log(JT + " " + diffNorm);
    }

    avgError /= array.length;

    return {avgError : avgError, maxError : maxError, minError : minError};
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
        it('Nominal Range2', function() {
            let {deg, arcMin, arcSec} = angleDegArc(-5.5);
            assert.equal(deg, -5);
            assert.equal(arcMin, 30);
            checkFloat(arcSec, 0, 1e-9);
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
            checkFloat(angleArcDeg(-359, 2, 3), 1 - 2/60 - 3/3600, 1e-9);
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

    describe('timeGregorian', function() {
        it('2022-05-15 23:53:20', function() {
            const {JD, JT} = timeJulianYmdhms(2022, 5, 15, 23, 53, 20);
            const tGreg = timeGregorian(JT);
            const tGregJD = timeGregorian(JD);
            checkFloat(tGreg.year, 2022, 1e-5);
            checkFloat(tGreg.month, 5, 1e-5);
            checkFloat(tGreg.mday, 15, 1e-5);
            checkFloat(tGreg.hour, 23, 1e-5);
            checkFloat(tGreg.minute, 53, 1e-5);
            checkFloat(tGreg.second, 20, 1e-4);

            checkFloat(tGregJD.year, 2022, 1e-5);
            checkFloat(tGregJD.month, 5, 1e-5);
            checkFloat(tGregJD.mday, 15, 1e-5);
            checkFloat(tGregJD.hour, 0, 1e-5);
            checkFloat(tGregJD.minute, 0, 1e-5);
            checkFloat(tGregJD.second, 0, 1e-4);
        });
        it('2022-05-15 00:00:00', function() {
            const {JD, JT} = timeJulianYmdhms(2022, 5, 15, 0, 0, 0);
            const tGreg = timeGregorian(JT);
            const tGregJD = timeGregorian(JD);
            checkFloat(tGreg.year, 2022, 1e-5);
            checkFloat(tGreg.month, 5, 1e-5);
            checkFloat(tGreg.mday, 15, 1e-5);
            checkFloat(tGreg.hour, 0, 1e-5);
            checkFloat(tGreg.minute, 0, 1e-5);
            checkFloat(tGreg.second, 0, 1e-4);

            checkFloat(tGregJD.year, 2022, 1e-5);
            checkFloat(tGregJD.month, 5, 1e-5);
            checkFloat(tGregJD.mday, 15, 1e-5);
            checkFloat(tGregJD.hour, 0, 1e-5);
            checkFloat(tGregJD.minute, 0, 1e-5);
            checkFloat(tGregJD.second, 0, 1e-4);
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

describe('Hipparcos', function() {
    describe('hipparcosFind', function() {
        it('SingleMatch', function() {
            const resultsVega = hipparcosFind('Vega');
            assert.equal(resultsVega.length, 1);
            assert.equal(resultsVega[0], "3 Alpha Lyrae (Vega)");
        });
    });

    describe('properMotion', function() {
        it ('Alpha Centauri', function() {
            // Alpha Centauri (Proksima Kentavra)
            const starData = {
                "id":71681,
                "RA":219.91412833,
                "DE":-60.83947139,
                "Plx":742.12,
                "RA_delta":-3600.35,
                "DE_delta":952.11,
                "mag":1.2429,
                "distPar":1.35,
                "constellation":"CEN",
                "radVel":-18.6
            };

            // 2020 GAIA vs ESA reference implementation
            // http://cdsarc.u-strasbg.fr/ftp/cats/aliases/H/Hipparcos/version_cd/src/pos_prop.c
            // RA      219.85510906931927  219.8551090709
            // DE      -60.83185171038954   60.8318517103
            // Plx     742.4212155860748   742.4212204729
            // pmra  -3602.41482765023   -3602.4147299442
            // pmde    956.1237813365689   956.1237958262

            // id: 71681,
            // RA: 219.85510907092015,
            // DE: -60.8318517102732,
            // Plx: 742.4212204728574,
            // RA_delta: -3602.414729944163,
            // DE_delta: 956.1237958262054,
            // mag: 1.2429,
            // constellation: 'CEN',
            // radVel: -18.58764420704424

            //console.log(starData);
            // console.log(properMotion(starData, 2458849.50000 + 0.5));
            //console.log(hipparcosGet("Alpha Centauri (Proksima Kentavra)", 2458849.50000));
            const starData2020 = properMotion(starData, 2458849.50000 + 0.5);
            // C Reference implementation:
            checkFloat(starData2020.RA, 219.8551090709, 1e-10);
            checkFloat(starData2020.DE, -60.8318517103, 1e-10);
            checkFloat(starData2020.Plx, 742.4212204729, 1e-10);
            checkFloat(starData2020.RA_delta, -3602.4147299442, 1e-10);
            checkFloat(starData2020.DE_delta, 956.1237958262, 1e-10);
            // GAIA: 
            checkFloat(starData2020.RA, 219.85510906931927, 1e-8);
            checkFloat(starData2020.DE, -60.83185171038954, 1e-8);
            checkFloat(starData2020.Plx, 742.4212155860748, 1e-5);
            checkFloat(starData2020.RA_delta, -3602.41482765023, 1e-4);
            checkFloat(starData2020.DE_delta, 956.1237813365689, 1e-4);
        });
    });

    describe('hipparcosGet', function() {
        it('SingleMatch', function() {
            const vega = hipparcosGet("3 Alpha Lyrae (Vega)");
            const RAexp = 279.2347344323626;
            const DEexp = 38.783688589075688;

            checkFloat(vega.RA, RAexp, 1e-5);
            checkFloat(vega.DE, DEexp, 1e-5);
            checkFloat(vega.mag, 0.086800, 1e-20);
        });

        it('SingleMatch', function() {
            const vega = hipparcosGet("3 Alpha Lyrae (Vega)");
            const RAexp = 279.2347344323626;
            const DEexp = 38.783688589075688;

            checkFloat(vega.RA, RAexp, 1e-5);
            checkFloat(vega.DE, DEexp, 1e-5);
            checkFloat(vega.mag, 0.086800, 1e-20);
        });

        it('ProperMotion', function() {
            // HIP 91262 
            // GAIA retrieval https://gea.esac.esa.int/archive/.
            //SELECT ARRAY_ELEMENT(
            //    (EPOCH_PROP(ra,de,plx,pmra,pmde,0,1991.25,2020))
            //    ,1) AS RA
            //FROM public.hipparcos
            //WHERE hip=91262
            //SELECT ARRAY_ELEMENT(
            //    (EPOCH_PROP(ra,de,plx,pmra,pmde,0,1991.25,2020))
            //    ,2) AS DE
            //FROM public.hipparcos
            //WHERE hip=91262

            const RA1980Exp = 279.2333024696844; 
            const RA2000Exp = 279.2347351065055; 
            const RA2020Exp = 279.2361667535478; 
            const DE1980Exp = 38.782094794759736;
            const DE2000Exp = 38.78369179580521;
            const DE2020Exp = 38.78528877935731;

            const JT_1980 = timeJulianYmdhms(1980, 1, 1, 0, 0, 0);
            const JT_2000 = timeJulianYmdhms(2000, 1, 1, 0, 0, 0);
            const JT_2020 = timeJulianYmdhms(2020, 1, 1, 0, 0, 0);
            const vega_1980 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_1980.JT);
            const vega_2000 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_2000.JT);
            const vega_2020 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_2020.JT);

            checkFloat(vega_1980.RA, RA1980Exp, 1.0/(3600.0 * 500));
            checkFloat(vega_2000.RA, RA2000Exp, 1.0/(3600.0 * 500));
            checkFloat(vega_2020.RA, RA2020Exp, 1.0/(3600.0 * 500));
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

        it('JPL Horizons 1900-2100', function() {
            const objects = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
            // VSOP87 error should be less than 1 arcsecond for 2000 years around the epoch.
            const maxErrorExp = {
                'mercury' :  100.0, // arcsec    46e6 km * sind(1/3600) =   223 km
                'venus' :    100.0, // arcsec 107.5e6 km * sind(1/3600) =   521 km
                'earth' :    100.0, // arcsec 147.1e6 km * sind(1/3600) =   713 km
                'mars'  :    200.0, // arcsec 206.7e6 km * sind(1/3600) =  1002 km
                'jupiter' : 3591.0, // arcsec 740.6e6 km * sind(1/3600) =  3591 km
                'saturn' :  6582.0, // arcsec 1357.e6 km * sind(1/3600) =  6582 km 
                'uranus' : 20000.0, // arcsec 2733.e6 km * sind(1/3600) = 13253 km
                'neptune': 55000.0, // arcsec 4471.e6 km * sind(1/3600) = 21677 km
            }
            const maxErrorExpV = {
                'mercury' :  0.0001, // arcsec    46e6 km * sind(1/3600) =   223 km
                'venus' :    0.0001, // arcsec 107.5e6 km * sind(1/3600) =   521 km
                'earth' :    0.0001, // arcsec 147.1e6 km * sind(1/3600) =   713 km
                'mars'  :    0.0002, // arcsec 206.7e6 km * sind(1/3600) =  1002 km
                'jupiter' :  0.003, // arcsec 740.6e6 km * sind(1/3600) =  3591 km
                'saturn' :   0.003, // arcsec 1357.e6 km * sind(1/3600) =  6582 km 
                'uranus' :   0.003, // arcsec 2733.e6 km * sind(1/3600) = 13253 km
                'neptune':   0.003, // arcsec 4471.e6 km * sind(1/3600) = 21677 km
            }

            for (let indObject = 0; indObject < objects.length; indObject++)
            {
                const objName = objects[indObject];
                let maxError = 0;
                let maxErrorV = 0;

                for (let indValue = 0; indValue < horizons_data_planets_1900_2100[objName].length; indValue++)
                {
                    const values = horizons_data_planets_1900_2100[objName][indValue];
                    const rExp = [values[1], values[2], values[3]];
                    const vExp = [values[4], values[5], values[6]];
                    const JT = values[0];
                    const r = vecMul(vsop87(objName, JT).r, 0.001);
                    const v = vecMul(vsop87(objName, JT).v, 0.001);

                    const diff = vecDiff(r, rExp);
                    const diffNorm = norm(diff);
                    const diffV = vecDiff(v, vExp);
                    const diffNormV = norm(diffV);
                    //console.log(objName + " " + r + " " + rExp + " " + diffNorm);
                    maxError = Math.max(maxError, diffNorm);
                    maxErrorV = Math.max(maxErrorV, diffNormV);
                }
                //console.log(objName + " " + maxError + " " + maxErrorExp[objName] + " " + maxErrorV);
                assert.equal(maxError < maxErrorExp[objName], true);
            }
        });
    });
});

describe('Aberration', function() {
    describe('aberrationStellarCart', function() {
        it('Vega', function() {
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
});

/*
describe('Moon', function() {
    describe('moonEquatorial', function() {
        it('No nutation parameter', function() {        
            const JT = 2.459694500000000e+06;
            const rTod = moonPositionTod(JT);
            const rTodExp = [3.042115315818079e8, -1.878671124143496e8, -1.190937748596068e8];
            checkFloatArray(rTod, rTodExp, 1);
        });
        it('With nutation parameter', function() {        
            const JT = 2.459694500000000e+06;
            const T = (JT - 2451545.0)/36525.0;
            const nutTerms = nutationTerms(T);
            const rTod = moonPositionTod(JT, nutTerms);
            const rTodExp = [3.042115315818079e8, -1.878671124143496e8, -1.190937748596068e8];
            checkFloatArray(rTod, rTodExp, 1);
        });
    });
    describe('moonNodePassage', function() {
        it ('Meeus', function() {
            checkFloat(moonNodePassage(-170.0), 2446938.76803, 1e-5);
        });
    });
    describe('moonNodePassages', function() {
        it ('range', function() {
            const nodePassages = moonNodePassages(2010, 2020);

            for (let JT of nodePassages)
            {
                //const T = (JT - 2451545.0)/36525.0;
                //const nutTerms = nutationTerms(T);
                //const rTod = moonPositionTod(JT, nutTerms);
                //const osvMod = coordTodMod({r : rTod, v : [0, 0, 0], JT : JT}, nutTerms)
                //const osvJ2000 = coordModJ2000(osvMod, nutTerms);
                //const osvEcl = coordEqEcl(osvJ2000);
                const rEcl = elp2000(JT);

                const latMoon = asind(rEcl[2] / norm(rEcl));
                //console.log(latMoon + " " + osvEcl.r[2]);
                // 1m accuracy:
                checkFloat(rEcl[2], 0.0, 1);
                //console.log(timeGregorian(JT));
            }
        });
    });

    describe('newMoonList', function() {
        it ('range', function() {
            const newMoons = moonNewList(2010, 2020);
            const lightTimeJT = 1.495978707e9 / (3e6 * 86400.0);

            for (const JT of newMoons)
            {

                const rEcl = elp2000(JT);

                let {r, v} = vsop87('earth', JT - lightTimeJT);
                const rSun = vecMul(r, -1);
                const vSun = vecMul(v, -1);

                const eclLonSun = limitAngleDeg(atan2d(rSun[1], rSun[0]));
                const eclLonMoon= limitAngleDeg(atan2d(rEcl[1], rEcl[0]));

                const lonDiff = angleDiff(eclLonSun, eclLonMoon);
                const maxAngle = 1 / 3600; //360 / (27 * 24 * 60);
                //console.log(lonDiff);
                checkFloat(lonDiff, 0.0, maxAngle); 
            }
        });
    });
});
*/
describe('Integration', function() {
    describe('timeStepping', function() {
        it('Scalar', function() {
            let t = 0.0;
            let h = 1.0;
            let y = [1.0];

            for (let timeStep = 0; timeStep < 100; timeStep++)
            {
                let g = (t, y) => [-0.1 * y[0]];
                y = integrateRk4(y, h, t, g);
                //console.log(y.toString());
                t += h;
            }
            //console.log('Test');
        });
    });
    describe('Numerical Integration', function() {
        it('Planetary Orbits', function() {
            const osvList = [
                {
                    name : 'Sun',
                    m : 1.98847e30,
                    r : [-1.357492091321442E+09, 1.876969581620733E+08, 3.009272397084278E+07],
                    v : [-1.080283285965152E-00,-1.575090335755431E+01, 1.473373003882065E-01]
                },
                {
                    name : 'Mercury',
                    m : 3.3301e23,
                    r : [-9.704674561146416E+09, -6.886255271164888E+10, -4.847000212102775E+09],
                    v : [3.858893783387715E+04, -3.381634495904644E+03, -3.814639868134951E+03]
                },
                {
                    name : 'Venus',
                    m : 4.8673e24,
                    r : [-4.734315096511355E+10, 9.727993181805186E+10, 4.016470458974592E+09],
                    v : [-3.176979590989674E+04, -1.520117286212005E+04, 1.624808519116792E+03]
                },
                {
                    name : 'Earth',
                    m : 5.9722e24,
                    r : [1.327033003447463E+11, -6.973671264097586E+10, 3.290386209294572E+07],
                    v : [1.329056551879737E+04,  2.628355871104155E+04,-1.252009662415787E-00]
                },
                {
                    name : 'Mars',
                    m : 6.4169e23,
                    r : [2.002533766386017E+11, 6.253088819541759E+10, -3.608745034563061E+09],
                    v : [-6.231751604101030E+03, 2.520509850340859E+04, 6.815686090340929E+02]
                },
                {
                    name : 'Jupiter',
                    m : 1.89813e27,
                    r : [7.400373272229347E+11, 6.245049726401265E+09, -1.658245994137447E+10],
                    v : [-2.617940724274189E+02,  1.367742196347076E+04, -5.089299056358065E+01]
                },
                {
                    name : 'Saturn',
                    m : 5.6832e26,
                    r : [1.160551189465487E+12, -9.096481296170596E+11, -3.039021085251743E+10],
                    v : [5.418089146795277E+03, 7.583713152161345E+03, -3.476005962942472E+02]
                },
                {
                    name : 'Uranus',
                    m : 8.6811e25,
                    r : [2.053897755751045E+12,  2.109924822066306E+12, -1.877229127243829E+10],
                    v : [-4.929730712104451E+03, 4.432941605670011E+03, 8.032950534016181E+01]
                },
                {
                    name : 'Neptune',
                    m : 1.02409e26,
                    r : [4.444884578366961E+12, -5.003570212387115E+11, -9.213298410866863E+10],
                    v : [5.720204680141608E+02,  5.433403917784009E+03, -1.250730705439735E+02]
                },
            ];

            const g = osvToRhsPM(osvList);
            //const state = [-1.357492091321442E+09, 1.876969581620733E+08, 3.009272397084278E+07, 1.327033003447463E+11, -6.973671264097586E+10, 3.290386209294572E+07,
            //               -1.080283285965152E-00,-1.575090335755431E+01, 1.473373003882065E-01, 1.329056551879737E+04,  2.628355871104155E+04,-1.252009662415787E+00];
            const state = osvStatePM(osvList);
            updateOsvPM(osvList, state, 0);
            //console.log(osvList);

            const state2 = timeStepping(state, 3600, 0, 86400*365, g, integrateRk8);
            updateOsvPM(osvList, state2, 0);
            //console.log(osvList);

            let osvExpected = [
                {
                    name : 'Sun',
                    m : 1.989e30,
                    r : [-1.273917113620407E+09,-2.888888826377319E+08, 3.208239966999389E+07],
                    v : [6.151797081210703E-00, -1.402223256634532E+01, -2.409049524268285E-02]
                },
                {
                    name : 'Mercury',
                    m : 3.285e23,
                    r : [3.238735912709232E+10, -5.547468130260617E+10, -7.565297130306117E+09],
                    v : [3.186462486142250E+04,  2.775098945738187E+04, -6.532492199630759E+02]
                },
                {
                    name : 'Venus',
                    m : 4.867e24,
                    r : [1.008359441007218E+11, -3.745398841497005E+10, -6.370034480185138E+09],
                    v : [1.179411907794366E+04,  3.274222895580037E+04, -2.304009011745602E+02]
                },
                {
                    name : 'Earth',
                    m : 5.972e24,
                    r : [1.324896895487617E+11, -7.080093671066168E+10, 3.501370232814550E+07],
                    v : [1.341201291521681E+04,  2.622495168961413E+04,-1.522320181436498E-00]
                },
                {
                    name : 'Mars',
                    m : 6.39e23,
                    r : [-2.369436349909702E+11, -6.231298869428617E+10, 4.513081905836020E+09],
                    v : [7.076459859722124E+03, -2.137729254868981E+04, -6.211828220060012E+02]
                },
                {
                    name : 'Jupiter',
                    m : 1.898e27,
                    r : [6.151964536917659E+11, 4.136358018840177E+11, -1.547973404857859E+10],
                    v : [-7.435426899442708E+03, 1.145943094177528E+04, 1.188089509955779E+02]
                },
                {
                    name : 'Saturn',
                    m : 5.683e26,
                    r : [1.306230763155282E+12,-6.533220146648834E+11,-4.064761531019002E+10],
                    v : [3.781063879572041E+03, 8.620526316334590E+03, -3.004380168962819E+02]
                },
                {
                    name : 'Uranus',
                    m : 8.681e25,
                    r : [1.893241502741150E+12, 2.244127994725322E+12, -1.619254398310542E+10],
                    v : [-5.255089481368775E+03, 4.073951815810950E+03, 8.321019611470382E+01]
                },
                {
                    name : 'Neptune',
                    m : 1.024e26,
                    r : [4.459638989683614E+12, -3.286821477955707E+11, -9.600832535205008E+10],
                    v : [3.635575147752985E+02,  5.452809376482286E+03, -1.206687134329898E+02]
                }
            ];

            for (let indOsv = 0; indOsv < osvExpected.length; indOsv++)
            {
                let osv = osvList[indOsv];
                let osvExp = osvExpected[indOsv];

                let rError = norm(vecDiff(osv.r, osvExp.r)) / norm(osv.r);
                let vError = norm(vecDiff(osv.v, osvExp.v)) / norm(osv.v);

                
                //console.log(osv.name);
                //console.log(' r    : ' + osv.r);
                //console.log(' rExp : ' + osvExp.r + ' (error: ' + rError + ')');
                const rBary = vecMul(vsop87ABary(2460182.500000000 - 69/86400).r, -1);
                if (osv.name != 'Sun')
                {
                    let osvSun = osvExpected[0];
                    let {r, v} = vsop87(osv.name.toLowerCase(), 2460182.500000000 - 69/86400);

                    r = vecSum(r, rBary);
                    //console.log(' rVSOP: ' + r);
                }
                else 
                {
                    const r = vecMul(vsop87ABary(2460182.500000000 - 69/86400).r, -1);
                    //console.log(' rVSOP: ' + r);
                }
                //console.log(' v    : ' + osv.v);
                //console.log(' vExp : ' + osvExp.v + ' (error: ' + vError + ')');           
                

                checkFloatArray(osv.r, osvExp.r, norm(osv.r)/100.0);
            }
        });
    });
});

describe('Eclipses', function() {
    describe('solarEclipses', function() {
        it('List of known Solar Eclipses', function() {
            let toFixed = function(num)
            {
                if (num < 10) {
                    return "0" + num;
                }
                else 
                {
                    return num;
                }
            }
            let toFixedFloat = function(num, fixed)
            {
                let str = "";
                if (num >= 0) {
                    str = str + " ";
                }
                if (Math.abs(num) < 100)
                {
                    str = str + " ";
                }
                if (Math.abs(num) < 10)
                {
                    str = str + " ";
                }
                str = str + num.toFixed(fixed);
                return str;
            }

            const JT = timeJulianTs(new Date("2022-05-15T23:53:20Z")).JT;
            //console.log(JT);

            const expectedEclipses = [
                {type : "Total",   JTmax : timeJulianTs(new Date("2001-06-21T12:04:46Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2001-12-14T20:53:01Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2002-06-10T23:45:22Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2002-12-04T07:32:16Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2003-05-31T04:09:22Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2003-11-23T22:50:22Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2004-04-19T13:35:05Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2004-10-14T03:00:23Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2005-04-08T20:36:51Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2005-10-03T10:32:47Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2006-03-29T10:12:23Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2006-09-22T11:41:16Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2007-03-19T02:32:57Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2007-09-11T12:32:24Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2008-02-07T03:56:10Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2008-08-01T10:22:12Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2009-01-26T07:59:45Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2009-07-22T02:36:25Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2010-01-15T07:07:39Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2010-07-11T19:34:38Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-01-04T08:51:42Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-06-01T21:17:18Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-07-01T08:39:30Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-11-25T06:21:34Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2012-05-20T23:53:54Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2012-11-13T22:12:55Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2013-05-10T00:26:20Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2013-11-03T12:47:36Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2014-04-29T06:04:33Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2014-10-23T21:45:39Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2015-03-20T09:46:47Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2015-09-13T06:55:19Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2016-03-09T01:58:19Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2016-09-01T09:08:02Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2017-02-26T14:54:33Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2017-08-21T18:26:40Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-02-15T20:52:33Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-07-13T03:02:16Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-08-11T09:47:28Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2019-01-06T01:42:38Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2019-07-02T19:24:08Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2019-12-26T05:18:53Z")).JT}
            ];

            const listEclipses = solarEclipses(2001.1, 2019);
            
            for (let indEclipse = 0; indEclipse < listEclipses.length; indEclipse++)
            {
                const eclipse = listEclipses[indEclipse];
                //console.log(eclipse);
                const timeGreg = timeGregorian(eclipse.JTmax);
                //console.log("Computed : " + timeGreg.year + "-" + toFixed(timeGreg.month) + "-" + toFixed(timeGreg.mday) + 
                //"T" + toFixed(timeGreg.hour) + ":" + toFixed(timeGreg.minute)
                //+ ":" + toFixed(Math.floor(timeGreg.second)) + " " + eclipse.type);

                const eclipse2 = expectedEclipses[indEclipse];
                //console.log(eclipse);

                const timeErr = 86400 * Math.abs(eclipse.JTmax - eclipse2.JTmax);

                assert.equal(timeErr < 120.0, true);

                const timeGreg2 = timeGregorian(eclipse2.JTmax);
                //console.log("Expected : " + timeGreg2.year + "-" + toFixed(timeGreg2.month) + "-" + toFixed(timeGreg2.mday) + 
                //"T" + toFixed(timeGreg2.hour) + ":" + toFixed(timeGreg2.minute)
                //+ ":" + toFixed(Math.floor(timeGreg2.second)) + " " + eclipse2.type + " Error " + timeErr.toFixed(2) + " s");
            }            
        });
    });
});

describe('TimeCorrelation', function() {
    describe('correlationUt1Tai', function() {
        it('conversions', function() {
            const JD1899Ut1 = dateJulianYmd(1899, 1, 1);
            const JD2000Ut1 = dateJulianYmd(2000, 1, 1);
            const JD2020Ut1 = dateJulianYmd(2020, 1, 1);
            const JD2040Ut1 = dateJulianYmd(2040, 1, 1);
            const JD1899Tai = correlationUt1Tai(JD1899Ut1);
            const JD2000Tai = correlationUt1Tai(JD2000Ut1);
            const JD2020Tai = correlationUt1Tai(JD2020Ut1);
            const JD2040Tai = correlationUt1Tai(JD2040Ut1);
            const JD1899Tdb = correlationUt1Tdb(JD1899Ut1);
            const JD2000Tdb = correlationUt1Tdb(JD2000Ut1);
            const JD2020Tdb = correlationUt1Tdb(JD2020Ut1);
            const JD2040Tdb = correlationUt1Tdb(JD2040Ut1);
            const JD1899Ut1_2 = correlationTaiUt1(JD1899Tai);
            const JD2000Ut1_2 = correlationTaiUt1(JD2000Tai);
            const JD2020Ut1_2 = correlationTaiUt1(JD2020Tai);
            const JD2040Ut1_2 = correlationTaiUt1(JD2040Tai);
            const JD1899Ut1_3 = correlationTdbUt1(JD1899Tdb);
            const JD2000Ut1_3 = correlationTdbUt1(JD2000Tdb);
            const JD2020Ut1_3 = correlationTdbUt1(JD2020Tdb);
            const JD2040Ut1_3 = correlationTdbUt1(JD2040Tdb);

            checkFloat(JD1899Tai - JD1899Ut1, 0.0001433/86400, 1e-8);
            checkFloat(JD2000Tai - JD2000Ut1, 31.6432070/86400, 1e-8);
            checkFloat(JD2020Tai - JD2020Ut1, 37.177333/86400, 1e-8);
            checkFloat(JD2040Tai - JD2040Ut1, 37.1098410/86400, 1e-8);
            checkFloat(JD1899Tdb - JD1899Ut1, (32.184 + 0.0001433)/86400, 1e-8);
            checkFloat(JD2000Tdb - JD2000Ut1, (32.184 + 31.6432070)/86400, 1e-8);
            checkFloat(JD2020Tdb - JD2020Ut1, (32.184 + 37.177333)/86400, 1e-8);
            checkFloat(JD2040Tdb - JD2040Ut1, (32.184 + 37.1098410)/86400, 1e-8);
            checkFloat(JD1899Ut1_2, JD1899Ut1, 1e-10);
            checkFloat(JD2000Ut1_2, JD2000Ut1, 1e-10);
            checkFloat(JD2020Ut1_2, JD2020Ut1, 1e-10);
            checkFloat(JD2040Ut1_2, JD2040Ut1, 1e-10);
            checkFloat(JD1899Ut1_3, JD1899Ut1, 1e-10);
            checkFloat(JD2000Ut1_3, JD2000Ut1, 1e-10);
            checkFloat(JD2020Ut1_3, JD2020Ut1, 1e-10);
            checkFloat(JD2040Ut1_3, JD2040Ut1, 1e-10);
        });
    });    
});

describe('Elp2000-82b', function() {
    describe('elp2000', function() {
        // Compare to data from the Fortran reference implementation.
        it('ELP2000-82b Reference Implementation 1900-2100 monthly', function() {
            const errInfo = checkArrayElp2000(horizons_data_moon_1900_2100);
            // Max error below 250 m.
            assert.equal(errInfo.maxError < 0.25, true);
        });
    });
});
