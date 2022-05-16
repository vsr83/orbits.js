import {AssertionError, strict as assert} from 'assert';
import {angleDiff, limitAngleDeg, angleDegArc, angleArcDeg, angleDegHms, angleHmsDeg} from "../src/Angles.js";
import {nutationTerms} from "../src/Nutation.js";
import {timeGast, timeGmst, timeJulianTs, timeJulianYmdhms, dateJulianYmd } from '../src/Time.js';
import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef } from '../src/Frames.js';

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