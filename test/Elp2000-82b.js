import {AssertionError, strict as assert} from 'assert';
import { horizons_data_moon_1900_2100 } from '../data/horizons_data_moon_1900_2100.js';
import { vecMul } from '../src/MathUtils.js';
import { elp2000 } from '../src/Elp2000-82b.js';

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
