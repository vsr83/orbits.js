import vsop87AData from '../data/vsop87a.json'  assert {type: "json"};
import {vecMul} from './MathUtils.js';

/**
 * Compute position and velocity of a planet with VSOP87A in the J2000 frame.
 * 
 * @param {*} target 
 *      Name of the target planet (mercury, venus, earth, mars, jupiter, saturn,
 *      neptune).
 * @param {*} JT 
 *      Julian time.
 */
export function vsop87(target, JT) 
{
    const json = vsop87AData[target];

    let pos = [0, 0, 0];
    let vel = [0, 0, 0];
    const t = (JT - 2451545.0) / 365250;

    for (let indDim = 0; indDim < 3; indDim++)
    {
        for (let indPower = 0; indPower < 6; indPower++)
        {
            const coeffs = json[indDim][indPower];
            const tPower = Math.pow(t, indPower);

            for (let indCoeff = 0; indCoeff < coeffs.length; indCoeff++)
            {
                const coeff0 = coeffs[indCoeff][0];
                const coeff1 = coeffs[indCoeff][1];
                const coeff2 = coeffs[indCoeff][2];

                pos[indDim] += tPower * coeff0 * Math.cos(coeff1 + coeff2 * t);
                vel[indDim] -= tPower * coeff0 * coeff2 * Math.sin(coeff1 + coeff2 * t);
            }
        }
    }

    // Convert units from au and au/s to m and m/s.
    const auMeters = 149597870700;
    // [v] = au / (1000 * year) = 149597870700 m / (365250 * 86400 s) = 4.740470463533349 m/s
    const vFactor = 4.740470463533349;

    return {r : vecMul(pos, auMeters), v: vecMul(vel, vFactor)};
}

export {vsop87AData};