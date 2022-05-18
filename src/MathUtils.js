/**
 * Compute sin of argument in degrees.
 * 
 * @param {*} angle 
 *      The argument in degrees.
 * @returns The value.
 */
export function sind(angle)
{
    return Math.sin(angle * Math.PI / 180.0);
}

/**
 * Compute cos of argument in degrees.
 * 
 * @param {*} angle 
 *      The argument in degrees.
 * @returns The value.
 */
export function cosd(angle)
{
    return Math.cos(angle * Math.PI / 180.0);
}

/**
 * Compute cross product of two 3d vectors.
 * 
 * @param {*} u
 *      The first 3d vector. 
 * @param {*} v 
 *      The second 3d vector.
 * @returns The cross product.
 */
export function cross(u, v)
{
    return [u[1]*v[2] - u[2]*v[1], 
            u[2]*v[0] - u[0]*v[2], 
            u[0]*v[1] - u[1]*v[0]];
}

/**
 * Compute norm with a vector.
 * 
 * @param {*} u 
 *      The 3d vector.
 * @returns The norm.
 */
export function norm(u)
{
    return Math.sqrt(u[0]*u[0] + u[1]*u[1] + u[2]*u[2]);
}

/**
 * Compute sum of two 3d vectors.
 * 
 * @param {*} u 
 *      The first vector.
 * @param {*} v
 *      The second vector.
 * @returns The sum.
 */
 export function vecSum(u, v)
 {
     return [u[0]+v[0], u[1]+v[1], u[2]+v[2]];
 }

/**
 * Compute difference of two 3d vectors.
 * 
 * @param {*} u 
 *      The first vector.
 * @param {*} v
 *      The second vector.
 * @returns The difference.
 */
 export function vecDiff(u, v)
 {
     return [u[0]-v[0], u[1]-v[1], u[2]-v[2]];
 }
 
/**
 * Convert degrees to radians.
 * 
 * @param {*} deg 
 *      Value in degrees.
 * @returns The value in radians.
 */
export function deg2Rad(deg)
{
    return 2.0 * Math.PI * deg / 360.0;
}

/**
 * Convert radians to degrees.
 * 
 * @param {*} rad 
 *      Value in radians.
 * @returns  The value in degrees.
 */
export function rad2Deg(rad)
{
    return 180.0 * rad / (Math.PI);
}

/**
 * Compute tan in degrees.
 * 
 * @param {*} deg 
 *      In degrees.
 * @returns The value.
 */
export function tand(deg)
{
    return Math.tan(deg2Rad(deg));
}

/**
 * Compute arcsin in degrees.
 * 
 * @param {*} val 
 *      The value.
 * @returns The angle in degrees.
 */
export function asind(val)
{
    return rad2Deg(Math.asin(val));
}

/**
 * Compute arccos in degrees.
 * 
 * @param {*} val 
 *      The value.
 * @returns The angle in degrees.
 */
export function acosd(val)
{
    return rad2Deg(Math.acos(val));
}

/**
 * Compute atan2
 * 
 * @param {*} y 
 *      The y value.
 * @param {*} x
 *      The x value.
 * @returns The angle in degrees.
 */
export function atan2d(y, x)
{
    return rad2Deg(Math.atan2(y, x));
}

/**
 * Compute arctab in degrees.
 * 
 * @param {*} val 
 *      The value.
 * @returns The angle in degrees.
 */
 export function atand(val)
{
    return rad2Deg(Math.atan(val));
}
