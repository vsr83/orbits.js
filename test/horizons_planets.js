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
import { computePlanet } from '../src/Positions.js';

describe('JPL Horizons - Planets', function() {
    it('Mercury', function() {
        /*************************************************************************************************
        Date_________JDUT       APmag   S-brt      Illu%  Def_illu  Ang-diam  1-way_down_LT        TDB-UT
        *************************************************************************************************
        $$SOE
        2458849.500000000      -0.903   2.179   98.86283    0.0533  4.691478    11.92641484     69.183901
        2458880.500000000      -1.048   2.268   84.75968    0.8603  5.644740     9.91232772     69.184782
        2458909.500000000       3.624   5.037    4.11641   10.2214  10.66025     5.24870377     69.185405
        2458940.500000000  m    0.116   3.458   63.49244    2.4098  6.600750     8.47669002     69.185679
        2458970.500000000 Nm   -1.745   1.502   98.48875    0.0767  5.072832    11.02983774     69.185498
        2459001.500000000 Cm    0.237   3.495   44.81507    4.1710  7.558184     7.40290471     69.184910
        2459031.500000000 C     5.752   5.557    0.74267   11.8769  11.96572     4.67606749     69.184109
        2459062.500000000 N    -0.791   2.492   69.57545    1.8673  6.137459     9.11656058     69.183255
        2459093.500000000 Am   -0.689   2.465   92.18178    0.3926  5.021841    11.14183222     69.182597
        2459123.500000000  m    0.086   3.427   61.21317    2.6055  6.717362     8.32953669     69.182319
        2459154.500000000  m    1.400   3.776   14.03558    7.7344  8.997248     6.21884780     69.182487
        2459184.500000000  m   -0.786   2.365   95.49916    0.2217  4.925952    11.35871974     69.183057
        2459215.500000000  m   -0.987   2.152   97.90131    0.1016  4.841240    11.55747607     69.183909
        $$EOE
        *************************************************************************************************/

        const JTlist = [
            2458849.500000000,
            2458880.500000000,
            2458909.500000000,
            2458940.500000000,
            2458970.500000000,
            2459001.500000000,
            2459031.500000000,
            2459062.500000000,
            2459093.500000000,
            2459123.500000000,
            2459154.500000000,
            2459184.500000000,
            2459215.500000000];

        for (let indJT = 0; indJT < JTlist.length; indJT++)
        {
            const JT = JTlist[indJT];

            const outData = computePlanet("jupiter", JT);
            console.log(JT + " " + 
                outData.target.magnitude + " " + 
                outData.target.fracIlluminated * 100 + " " +
                outData.target.angDiameter*3600 + " " + 
                outData.parameters.lightTimeSeconds/60);
        }
    });
});