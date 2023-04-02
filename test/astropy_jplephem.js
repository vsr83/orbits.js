import ephemData from '../data/astropy_jplephem_data.json'  assert {type: "json"};
import { correlationUt1Tdb, correlationUt1Utc, correlationUtcUt1 } from '../src/TimeCorrelation.js';
import { vsop87 } from '../src/Vsop87A.js';
import {AssertionError, strict as assert} from 'assert';
import {norm, vecMul, vecSum, atand, atan2d, asind, linComb, vecDiff, tand, sind, cosd} from "../src/MathUtils.js";
import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef, coordEfiWgs84, coordWgs84Efi, 
    coordEfiEnu, coordEnuEfi, coordEnuAzEl, coordAzElEnu, coordPerIne, coordInePer } from '../src/Frames.js';
import { aberrationStellarCart } from '../src/Aberration.js';
import { limitAngleDeg } from '../src/Angles.js';
import mjdPolar from '../data/mjd_polar.json' assert {type : "json"};
import { computePlanet, computeStar } from '../src/Positions.js';

function polarMotion(JT)
{
    let dxOut = 0;
    let dyOut = 0;

    for (let indLine = 0; indLine < mjdPolar.length - 1; indLine++)
    {
        let JTcurrent = mjdPolar[indLine][0] + 2400000.5;
        let JTnext = mjdPolar[indLine + 1][0] + 2400000.5;
        let dx = mjdPolar[indLine][1];
        let dxNext = mjdPolar[indLine + 1][1];
        let dy = mjdPolar[indLine][2];
        let dyNext = mjdPolar[indLine + 1][2];

        if (JT >= JTcurrent && JT <= JTnext)
        {
            dxOut = dx + (dxNext - dx) * (JT - JTcurrent) / (JTnext - JTcurrent);
            dyOut = dy + (dyNext - dy) * (JT - JTcurrent) / (JTnext - JTcurrent);
        }
    }
    //console.log(dxOut + " " + dyOut);
    return [dxOut, dyOut];
}


describe('Astropy - JPL Ephemeris', function() {
    it('Time correlations', function() {
        for (const [objName, objData] of Object.entries(ephemData))
        {
            const JTutcList = objData.utc;
            const JTut1List = objData.ut1;
            const JTtdbList = objData.tdb;

            const numTimestamps = JTutcList.length;

            for (let indTimestamp = 0; indTimestamp < numTimestamps; indTimestamp++)
            {
                const JTut1 = JTut1List[indTimestamp];
                const JTtdbExp = JTtdbList[indTimestamp];
                const JTutcExp = JTutcList[indTimestamp];
                const JTtdb = correlationUt1Tdb(JTut1);
                const JTutc = correlationUt1Utc(JTut1);
                const JTut12 = correlationUtcUt1(JTutc);

                const deltaErrTdb = 86400.0 * Math.abs(JTtdb - JTtdbExp);
                const deltaErrUtc = 86400.0 * Math.abs(JTutc - JTutcExp);
                const deltaErrUt1 = 86400.0 * Math.abs(JTut1 - JTut12);

                if (JTut1 > 2441712.5) 
                {
                    assert.equal(deltaErrTdb < 0.1, true);
                }

                if (JTutc > 2441712.5)
                {
                    assert.equal(deltaErrUtc < 0.1, true);                    
                }
            }
        }
    });

    it('Positions', function() {
        for (const [objName, objData] of Object.entries(ephemData))
        {
            console.log(objName);

            const JTutcList = objData.utc;
            const JTut1List = objData.ut1;
            const JTtdbList = objData.tdb;
            const raList = objData.gcrs_ra;
            const decList = objData.gcrs_dec;
            const azList = objData.enu_az;
            const altList = objData.enu_alt;
            const efiList = objData.itrs;
            const icrsRaList = objData.icrs_ra;
            const icrsDecList = objData.icrs_dec;

            const numTimestamps = JTutcList.length;

            let lat = 61.4945763;
            let lon = 23.8283;

            //lat = 0;
            //lon = 0;

            const h = 121.9157;

            let raErrMax = 0.0;
            let decErrMax = 0.0;
            let raErrAvg = 0.0;
            let decErrAvg = 0.0;

            let azErrMax = 0.0;
            let altErrMax = 0.0;
            let azErrAvg = 0.0;
            let altErrAvg = 0.0;

            for (let indTimestamp = 0; indTimestamp < numTimestamps; indTimestamp++)
            {
                const JTut1 = JTut1List[indTimestamp];
                const JTtdbExp = JTtdbList[indTimestamp];
                const JTtdb = correlationUt1Tdb(JTut1);
                const raExp = raList[indTimestamp];
                const decExp = decList[indTimestamp];
                const azExp = azList[indTimestamp];
                const altExp = altList[indTimestamp];
                const efiExp = vecMul(efiList[indTimestamp], 1000.0);
    
                let posEclInitial;
                if (objName == "sun")
                {
                    posEclInitial = vsop87('earth', JTtdb).r;
                }
                else 
                {
                    posEclInitial = vecDiff(vsop87(objName, JTtdb).r, vsop87("earth", JTtdb).r);
                }
                
                const lightTimeJT = (norm(posEclInitial) / 299.792458e6) / 86400.0;

                let osvEcl;
                if (objName == "sun")
                {
                    osvEcl = vsop87('earth', JTtdb - lightTimeJT);
                    osvEcl.r = vecMul(osvEcl.r, -1);
                    osvEcl.v = vecMul(osvEcl.v, -1);
                }
                else 
                {
                    const osvEclEarth = vsop87('earth', JTtdb);
                    osvEcl = vsop87(objName, JTtdb - lightTimeJT);
                    osvEcl.r = vecDiff(osvEcl.r, osvEclEarth.r);
                    osvEcl.v = vecDiff(osvEcl.v, osvEclEarth.v);
                }

                osvEcl.JT = JTtdb;
                const osvJ2000 = coordEclEq(osvEcl);
                if (!(objName == "sun"))
                {
                    let vDiurnal = [0, 0, 0];

                    const rObsEfi = coordWgs84Efi(lat, lon, h);
                    const osvObsPef = coordEfiPef({r : rObsEfi, v: [0, 0, 0], JT: JTut1}, 0, 0);
                    const osvObsTod = coordPefTod(osvObsPef);
                    const osvObsMod = coordTodMod(osvObsTod);
                    const osvObsJ2000 = coordTodMod(osvObsMod);
            
                    vDiurnal = osvObsJ2000.v;                    
                    osvJ2000.r = aberrationStellarCart(osvJ2000.JT, osvJ2000.r, vDiurnal);
                }
                const ra = limitAngleDeg(atan2d(osvJ2000.r[1], osvJ2000.r[0]));
                const dec = asind(osvJ2000.r[2] / norm(osvJ2000.r));

                const raErr = Math.abs(ra - raExp) * 3600.0;
                const decErr = Math.abs(dec - decExp) * 3600.0;
                raErrMax = Math.max(raErr, raErrMax);
                decErrMax = Math.max(decErr, decErrMax);
                raErrAvg += raErr;
                decErrAvg += decErr;

                //osvJ2000.r = vecMul([cosd(decExp) * cosd(raExp), cosd(decExp) * sind(raExp), sind(decExp)], norm(osvJ2000.r));

                const osvMod = coordJ2000Mod(osvJ2000);
                const osvTod = coordModTod(osvMod);
                osvTod.JT = JTut1;
                const osvPef = coordTodPef(osvTod);

                let [dx, dy] = polarMotion(JTut1);

                const osvEfi = coordPefEfi(osvPef, dx/3600, dy/3600);
                const osvEnu = coordEfiEnu(osvEfi, lat, lon, h);

                let az = limitAngleDeg(atan2d(osvEnu.r[0], osvEnu.r[1]));
                let alt = asind(osvEnu.r[2] / norm(osvEnu.r));

                //
                const outputs = computePlanet(objName, JTut1, {lat : lat, lon : lon, h : h});
                //console.log(outputs.angles.enu.az + " " + az);
                //az = outputs.angles.enu.az;
                //alt = outputs.angles.enu.alt;
                //

                const azErr = Math.abs(az - azExp) * 3600;
                const altErr = Math.abs(alt - altExp) * 3600;
                azErrMax = Math.max(azErr, azErrMax);
                altErrMax = Math.max(altErr, altErrMax);
                azErrAvg += azErr;
                altErrAvg += altErr;
                //console.log(azErr + " " + altErr);
                //console.log(raErr + " " + decErr);
                //console.log(objName + " " + JTut1 + " " + azErr + " " + altErr + " " + raErr + " " + decErr);
                //console.log(objName + " " + norm(vecDiff(efiExp, osvEfi.r)));
                //console.log(objName + " " + JTut1 + " " + raExp + " " + decExp);
                //console.log(objName + " " + JTtdb + " " + icrsRaList[indTimestamp] + " " +
                //            icrsDecList[indTimestamp]);

            }
           raErrAvg /= numTimestamps;
           decErrAvg /= numTimestamps;
           azErrAvg /= numTimestamps;
           altErrAvg /= numTimestamps;
           console.log("ENU - AZ error avg/max : " + azErrAvg + " / " + azErrMax + " arcseconds");
           console.log("ENU - ALT error avg/max : " + altErrAvg + " / " + altErrMax + " arcseconds");

        }
    });
});

describe('tmp', function() 
{
    it('tmp2', function() 
    {
        console.log(computeStar("3 Alpha Lyrae (Vega)", 2460035.5));
    })
});