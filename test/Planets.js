import { checkFloat, checkFloatArray} from './common.js';
import { timeJulianTs, timeJulianYmdhms } from '../src/Time.js';
import { vsop87 } from '../src/Vsop87A.js';
import { marsSatellites, saturnSatellites, jupiterSatellites, uranusSatellites, neptuneSatellites } from '../src/Planets.js';
import { coordEqEcl } from '../src/Frames.js';
import { norm, vecMul, vecDiff } from '../src/MathUtils.js';
import {AssertionError, strict as assert} from 'assert';

import { horizons_moondata } from '../data/horizons_planets_moondata.js';

function testMarsMoon(moonName, osvListExp)
{
    let maxAbsErr = 0;
    let maxRelErr = 0;
    let avgAbsErr = 0;
    let avgRelErr = 0;

    for (let indOsv = 0; indOsv < osvListExp.length; indOsv++)
    {
        let osvExp = osvListExp[indOsv];
        let r = coordEqEcl(marsSatellites(osvExp.JT)[moonName]).r;
        let v = coordEqEcl(marsSatellites(osvExp.JT)[moonName]).v;

        const rAbsErr = norm(vecDiff(r, vecMul(osvExp.r, 1000)));
        const rRelErr = rAbsErr / norm(r);

        maxAbsErr = Math.max(rAbsErr, maxAbsErr);
        maxRelErr = Math.max(rRelErr, maxRelErr);
        avgAbsErr += rAbsErr;
        avgRelErr += rRelErr;
        //console.log(v + " " + osvExp.v);
        //console.log(osv.r + " " + vecMul(osvExp.r, 1000) + " " + rAbsErr+ " " + rRelErr);
    }
    avgAbsErr /= osvListExp.length;
    avgRelErr /= osvListExp.length;
    console.log(moonName + " : abs max/avg " + maxAbsErr.toFixed(1) +  " " + avgAbsErr.toFixed(1) + " rel max/avg " +  maxRelErr.toFixed(5) + " " +  avgRelErr.toFixed(5));
}

function testSaturnMoon(moonName, osvListExp)
{
    let maxAbsErr = 0;
    let maxRelErr = 0;
    let avgAbsErr = 0;
    let avgRelErr = 0;

    for (let indOsv = 0; indOsv < osvListExp.length; indOsv++)
    {
        let osvExp = osvListExp[indOsv];
        let osv = coordEqEcl(saturnSatellites(osvExp.JT)[moonName]);

        const rAbsErr = norm(vecDiff(osv.r, vecMul(osvExp.r, 1000)));
        const rRelErr = rAbsErr / norm(osv.r);

        maxAbsErr = Math.max(rAbsErr, maxAbsErr);
        maxRelErr = Math.max(rRelErr, maxRelErr);
        avgAbsErr += rAbsErr;
        avgRelErr += rRelErr;
        //console.log(osv.r + " " + vecMul(osvExp.r, 1000) + " " + rAbsErr+ " " + rRelErr);
    }
    avgAbsErr /= osvListExp.length;
    avgRelErr /= osvListExp.length;
    console.log(moonName + " : abs max/avg " + maxAbsErr.toFixed(1) +  " " + avgAbsErr.toFixed(1) + " rel max/avg " +  maxRelErr.toFixed(5) + " " +  avgRelErr.toFixed(5));
}

function testJupiterMoon(moonName, osvListExp)
{
    let maxAbsErr = 0;
    let maxRelErr = 0;
    let avgAbsErr = 0;
    let avgRelErr = 0;

    for (let indOsv = 0; indOsv < osvListExp.length; indOsv++)
    {
        let osvExp = osvListExp[indOsv];
        let r = coordEqEcl(jupiterSatellites(osvExp.JT)[moonName]).r;

        const rAbsErr = norm(vecDiff(r, vecMul(osvExp.r, 1000)));
        const rRelErr = rAbsErr / norm(r);

        maxAbsErr = Math.max(rAbsErr, maxAbsErr);
        maxRelErr = Math.max(rRelErr, maxRelErr);
        avgAbsErr += rAbsErr;
        avgRelErr += rRelErr;
        //console.log(osv.r + " " + vecMul(osvExp.r, 1000) + " " + rAbsErr+ " " + rRelErr);
    }
    avgAbsErr /= osvListExp.length;
    avgRelErr /= osvListExp.length;
    console.log(moonName + " : abs max/avg " + maxAbsErr.toFixed(1) +  " " + avgAbsErr.toFixed(1) + " rel max/avg " +  maxRelErr.toFixed(5) + " " +  avgRelErr.toFixed(5));
}

function testUranusMoon(moonName, osvListExp)
{
    let maxAbsErr = 0;
    let maxRelErr = 0;
    let avgAbsErr = 0;
    let avgRelErr = 0;

    for (let indOsv = 0; indOsv < osvListExp.length; indOsv++)
    {
        let osvExp = osvListExp[indOsv];
        //console.log(uranusSatellites(osvExp.JT))
        let r = coordEqEcl(uranusSatellites(osvExp.JT)[moonName]).r;
        let v = coordEqEcl(uranusSatellites(osvExp.JT)[moonName]).v;

        const rAbsErr = norm(vecDiff(r, vecMul(osvExp.r, 1000)));
        const rRelErr = rAbsErr / norm(r);

        maxAbsErr = Math.max(rAbsErr, maxAbsErr);
        maxRelErr = Math.max(rRelErr, maxRelErr);
        avgAbsErr += rAbsErr;
        avgRelErr += rRelErr;
        
        //console.log(r + " " + vecMul(osvExp.r, 1000) + " " + rAbsErr+ " " + rRelErr);
        //console.log(v + " " + vecMul(osvExp.v, 1000.0));
    }
    avgAbsErr /= osvListExp.length;
    avgRelErr /= osvListExp.length;
    console.log(moonName + " : abs max/avg " + maxAbsErr.toFixed(1) +  " " + avgAbsErr.toFixed(1) + " rel max/avg " +  maxRelErr.toFixed(5) + " " +  avgRelErr.toFixed(5));

}



describe('Planets', function() {
    describe('neptuneSatellites', function() {
        neptuneSatellites(2455197.500000000);
    });

    describe('uranusSatellites', function() {
        //uranusSatellites(2449909.0833333);
    });

    describe('marsSatellites', function() {
        testMarsMoon('phobos', horizons_moondata.mars_phobos_bcrs2000);
        testMarsMoon('deimos', horizons_moondata.mars_deimos_bcrs2000);
    });

    describe('jupiterSatellites', function() {
        testJupiterMoon('io',       horizons_moondata.jupiter_io_bcrs2000);
        testJupiterMoon('europa',   horizons_moondata.jupiter_europa_bcrs2000);
        testJupiterMoon('ganymede', horizons_moondata.jupiter_ganymede_bcrs2000);
        testJupiterMoon('callisto', horizons_moondata.jupiter_callisto_bcrs2000);
    });

    describe('saturnSatellites', function() {
        testSaturnMoon('mimas',     horizons_moondata.saturn_mimas_bcrs2000);
        testSaturnMoon('enceladus', horizons_moondata.saturn_enceladus_bcrs2000);
        testSaturnMoon('tethys',    horizons_moondata.saturn_tethys_bcrs2000);
        testSaturnMoon('dione',     horizons_moondata.saturn_dione_bcrs2000);
        testSaturnMoon('rhea',      horizons_moondata.saturn_rhea_bcrs2000);
        testSaturnMoon('titan',     horizons_moondata.saturn_titan_bcrs2000);
        testSaturnMoon('iapetus',   horizons_moondata.saturn_iapetus_bcrs2000);
    });

    describe('uranusSatellites', function() {
        testUranusMoon('miranda',   horizons_moondata.uranus_miranda_bcrs2000);
        testUranusMoon('ariel',     horizons_moondata.uranus_ariel_bcrs2000);
        testUranusMoon('titania',   horizons_moondata.uranus_titania_bcrs2000);
        testUranusMoon('oberon',    horizons_moondata.uranus_oberon_bcrs2000);
        testUranusMoon('umbriel',   horizons_moondata.uranus_umbriel_bcrs2000);
    });
});
