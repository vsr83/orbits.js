import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import { vsop87 } from '../src/Vsop87A.js';
import { vecMul, vecDiff, asind, atan2d, norm } from '../src/MathUtils.js';
import { dateJulianYmd } from '../src/Time.js';
import { horizons_data_planets_1900_2100 } from '../data/horizons_data_planets_1900_2100.js';

describe('Vsop87A', function() {
    describe('Heliocentric', function() {
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

