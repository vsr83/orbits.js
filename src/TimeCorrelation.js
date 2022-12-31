import dataUt1Tai from '../data/correlation_ut1tai.json'  assert {type: "json"};

/**
 * Interpolate UT1-TAI difference from the table.
 * 
 * @param {*} JT 
 *      Julian time.
 */
function correlationInterpolate(JT)
{
    // This obviously could be made faster with simple binary search.

    if (JT < dataUt1Tai.diffUt1TaiMinJD)
    {
        return dataUt1Tai.diffUt1Tai[0][2];
    }
    if (JT > dataUt1Tai.diffUt1TaiMaxJD)
    {
        return dataUt1Tai.diffUt1Tai[dataUt1Tai.diffUt1Tai.length - 1][2];
    }

    for (let indLine = 0; indLine < dataUt1Tai.diffUt1Tai.length - 1; indLine++)
    {
        let JTcurrent = dataUt1Tai.diffUt1Tai[indLine][0];
        let JTnext = dataUt1Tai.diffUt1Tai[indLine + 1][0];
        let value = dataUt1Tai.diffUt1Tai[indLine][2];
        let valueNext = dataUt1Tai.diffUt1Tai[indLine + 1][2];

        if (JT >= JTcurrent && JT <= JTnext)
        {
            return value + (valueNext - value) * (JT - JTcurrent) / (JTnext - JTcurrent);
        }
    }
}

/**
 * Convert UT1 to TAI time.
 * 
 * @param {*} JTut1 
 *      Julian time.
 * @returns TAI Julian time.
 */
export function correlationUt1Tai(JTut1)
{
    return JTut1 - correlationInterpolate(JTut1) / 86400.0;
}

/**
 * Convert TAI to UT1 time.
 * 
 * @param {*} JTtai
 *      Julian time.
 * @returns UT1 Julian time.
 */
export function correlationTaiUt1(JTtai)
{
    return JTtai + correlationInterpolate(JTtai) / 86400.0;
}

/**
 * Convert TDB to UT1 time.
 * 
 * @param {*} JTtdb
 *      TDB Julian time.
 * @returns UT1 Julian time.
 */
export function correlationTdbUt1(JTtdb)
{
    const JTtai = JTtdb - 32.184 / 86400.0;
    return correlationTaiUt1(JTtai);
}

/**
 * Convert UT1 to TDB time.
 * 
 * @param {*} JTut1
 *      UT1 Julian time.
 * @returns TDB Julian time.
 */
export function correlationUt1Tdb(JTut1)
{
    const JTtai = correlationUt1Tai(JTut1);
    return JTtai + 32.184 / 86400.0;
}
