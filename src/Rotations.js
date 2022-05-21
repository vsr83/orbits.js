import {cosd, sind} from './MathUtils.js';

/**
 * Create rotation matrix w.r.t. the first coordinate.
 * 
 * @param {*} p 
 *      Vector.
 * @param {*} angle
 *      Angle in degrees. 
 * @returns The rotated vector.
 */
export function rotateCart1d(p, angle)
{
    return [p[0], 
            cosd(angle) * p[1] + sind(angle) * p[2],
            -sind(angle) * p[1] + cosd(angle) * p[2]];
}

/**
 * Create rotation matrix w.r.t. the second coordinate.
 * 
 * @param {*} p 
 *      Vector.
 * @param {*} angle
 *      Angle in degrees. 
 * @returns The rotated vector.
 */
export function rotateCart2d(p, angle)
{
    return [cosd(angle) * p[0] - sind(angle) * p[2], 
            p[1],
            sind(angle) * p[0] + cosd(angle) * p[2]];
}

/**
 * Create rotation matrix w.r.t. the third coordinate.
 * 
 * @param {*} p 
 *      Vector.
 * @param {*} angle
 *      Angle in degrees. 
 * @returns The rotated vector.
 */
export function rotateCart3d(p, angle)
{
    return [cosd(angle) * p[0] + sind(angle) * p[1], 
            -sind(angle) * p[0] + cosd(angle) * p[1],
            p[2]];
}
