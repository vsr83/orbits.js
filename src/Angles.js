
/**
 * Limit angle to [0, 360.0) interval.
 * 
 * @param {*} deg 
 *      The angle in degrees.
 * @returns Angle limited to the interval [0, 360).
 */
 export function limitAngleDeg(deg)
 {
     return deg - 360.0 * Math.floor(deg / 360.0);
 }

 /**
  * Compute (signed) difference in angle between the angles.
  * 
  * @param {*} deg1 
  *      The first angle in degrees.
  * @param {*} deg2 
  *      The second angle in degrees.
  * @returns Shortest rotation deg1 -> deg2.
  */
 export function angleDiff(deg1, deg2)
 {
     // Handle missing arguments to avoid recursion.
     if (deg1 === undefined)
     {
         deg1 = 0;
     }
     if (deg2 === undefined)
     {
         deg2 = 0;
     }

     const deg1Lim = limitAngleDeg(deg1);
     const deg2Lim = limitAngleDeg(deg2);

     if (deg1Lim <= deg2Lim)
     {
         const diff = deg2Lim - deg1Lim;
         
         if (diff <= 180.0)
         {
             return diff;
         }
         else 
         {
             // 30 350 -> 350 - 390 = -40
             return deg2Lim - (deg1Lim + 360.0); 
         }
     }
     else 
     {
         return -angleDiff(deg2, deg1)
     }
 }

/**
  * Convert angle in degree-arcmin-arcsec format to degrees.
  * 
  * @param {*} deg
  *      Degrees.
  * @param {*} arcMin
  *      Arcminutes
  * @param {*} arcSec
  *      Arcseconds.
  * @returns The angle in degrees.
  */
export function angleArcDeg(deg, arcMin, arcSec)
{
    return limitAngleDeg(deg + arcMin/60.0 + arcSec/3600.0);
}

/**
 * Convert angle in degrees to degree-arcmin-arcsec format.
 * 
 * @param {*} degIn 
 *      The angle in degrees.
 * @returns An object with deg, arcMin and arcSec fields.
 */
export function angleDegArc(degIn) 
{
    let angle = limitAngleDeg(degIn);
    let degOut = Math.floor(angle);
    let arcMin = Math.floor((angle - degOut) * 60.0);
    let arcSec = (angle - degOut - arcMin / 60.0) * 3600.0;

    return {deg : degOut, arcMin : arcMin, arcSec : arcSec};
}

/**
 * Convert angle in degrees to hour-min-sec format.
 * 
 * @param {*} deg
 *      The angle in degrees.
 * @returns An object with hour, minute, second fields.
 */
export function angleDegHms(deg) 
{
    const hourSize = 360.0 / 24.0;
    const minuteSize = hourSize / 60.0;
    const secondSize = minuteSize / 60.0;

    let angle = limitAngleDeg(deg);

    const hour = Math.floor(angle / hourSize);
    const minute = Math.floor((angle - hour * hourSize) / minuteSize);
    const second = (angle - hour*hourSize - minute*minuteSize) / secondSize;

    return {hour : hour, minute : minute, second : second};
}

/**
 * Convert angle in hour-min-sec format to degrees.
 * 
 * @param {*} hour 
 *      Hours.
 * @param {*} minute
 *      Minutes. 
 * @param {*} second 
 *      Seconds
 * @returns The angle in degrees.
 */
export function angleHmsDeg(hour, minute, second)
{
    const hourSize = 360.0 / 24.0;
    const minuteSize = hourSize / 60.0;
    const secondSize = minuteSize / 60.0;

    return limitAngleDeg(hour*hourSize + minute*minuteSize + second*secondSize);
}