import { tand } from "./MathUtils.js";

/**
 * Compute the refracted elevation. The applied approach uses the formula from 
 * Sæmundsson formula with additional correction factor for the temperature and
 * pressure as shown in Chapter 16 of Meeus - Astronomical Algorithms, 1998.
 * 
 * @param {*} trueEl
 *      True (no atmosphere) elevation in degrees above horizon.
 * @param {*} temperature 
 *      Temperature of the air in Celsius.
 * @param {*} pressure 
 *      Pressure at the surface of Earth in millibars.
 * @returns Refracted elevation
 */
export function refractionSamuelsson(trueEl, temperature, pressure)
{
    // Meeus 16.4
    let R = (1.02 / 60.0) / tand(trueEl + 10.3 / (trueEl + 5.11));
    // Correction to make refraction 0 at 90 deg altitude.
    R += 0.00192792040346393;
    R *= (pressure / 1010.0) * 283.0 / (273.0 + temperature);

    return R + trueEl;
}
 