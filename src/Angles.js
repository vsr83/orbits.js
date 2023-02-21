
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
 * Limit angle to [-180, 180.0) interval.
 * 
 * @param {*} deg 
 *      The angle in degrees.
 * @returns Angle limited to the interval [-180, 180).
 */
export function limitAngleDeg180(deg)
{
    deg = limitAngleDeg(deg);

    if (deg > 180)
    {
        return deg - 360;
    }
    else
    {
        return deg;
    }
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
    let sign = 1;

    if (deg == 0 && arcMin == 0)
    {
        return limitAngleDeg(arcSec / 3600.0);
    }
    else if (deg == 0)
    {
        sign = Math.sign(arcMin);
    }
    else 
    {
        sign = Math.sign(deg);
    }

    return limitAngleDeg(deg + sign*arcMin/60.0 + sign*arcSec/3600.0);
}

/**
 * Convert angle in degrees to degree-arcmin-arcsec format.
 * 
 * @param {*} degIn 
 *      The angle in degrees.
 * @param {*} limit360
 *      Limit to range [0, 360).
 * @returns An object with deg, arcMin and arcSec fields.
 */
export function angleDegArc(degIn, limit360) 
{
    let angle = 0;
    if (limit360 === undefined)
    {
        limit360 = false;
    }
    if (limit360)
    {
        angle = limitAngleDeg(degIn);
    }
    else 
    {
        angle = limitAngleDeg180(degIn);
    }

    const angleSign = Math.sign(angle);
    const angleSize = Math.abs(angle);

    let degOut = Math.floor(angleSize);
    let arcMin = Math.floor((angleSize - degOut) * 60.0);
    let arcSec = (angleSize - degOut - arcMin / 60.0) * 3600.0;

    let signDeg = 1;
    let signMin = 1;
    let signSec = 1;

    if (degOut == 0 && arcMin == 0)
    {
        signSec = angleSign;
    }
    else if (degOut == 0)
    {
        signMin = angleSign;
    }
    else 
    {
        signDeg = angleSign;
    }

    return {deg : signDeg * degOut, arcMin : signMin * arcMin, arcSec : signSec * arcSec};
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