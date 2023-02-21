import corrData from '../data/time_correlation_data.json'  assert {type: "json"};

const ut1Tai = corrData.ut1Tai;
const ut1Utc = corrData.ut1Utc;

function interpolateSearch(data, JT)
{
    if (JT <= data.minJD)
    {
        return data.data[0];
    }
    if (JT >= data.maxJD)
    {
        return data.data[data.data.length - 1];
    }

    let pointerStart = 0;
    let pointerEnd = data.data.length - 1;
    let done = false;

    while (!done)
    {
        let firstHalfStart = pointerStart;
        let secondHalfStart = Math.floor(0.5 * (pointerStart + pointerEnd));
        let JTstart = data.data[firstHalfStart][0];
        let JTmiddle = data.data[secondHalfStart][0];
        let JTend = data.data[pointerEnd][0];

        if (JT >= JTstart && JT <= JTmiddle)
        {
            pointerEnd = secondHalfStart;
        }
        else 
        {
            pointerStart = secondHalfStart;
        }

        if (pointerEnd - pointerStart <= 1)
        {
            done = true;
        }

        //console.log(pointerStart + " " + pointerEnd + " " + done + " " + data.data.length);
    }

    if (pointerStart == pointerEnd)
    {
        return data.data[pointerStart];
    }
    else 
    {
        const dataFirst = data.data[pointerStart];
        const dataSecond = data.data[pointerEnd];

        let dataOut = [JT];
        for (let indData = 1; indData < dataFirst.length; indData++)
        {
            const value = dataFirst[indData];
            const valueNext = dataSecond[indData];
            const JTcurrent = dataFirst[0];
            const JTnext = dataSecond[0];

            dataOut.push(value + (valueNext - value) * (JT - JTcurrent) / (JTnext - JTcurrent));
        }

        return dataOut;
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
    return JTut1 - interpolateSearch(ut1Tai, JTut1)[1] / 86400.0;
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
    return JTtai + interpolateSearch(ut1Tai, JTtai)[1] / 86400.0;
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

/**
 * Convert UT1 to UTC time.
 * 
 * @param {*} JT 
 *      UT1 Julian time.
 * @returns UTC Julian time.
 */
export function correlationUt1Utc(JTut1)
{
    return JTut1 - interpolateSearch(ut1Utc, JTut1)[1] / 86400.0
}

/**
 * Convert UTC to UT1 time.
 * 
 * @param {*} JT 
 *      UTC Julian time.
 * @returns UT1 Julian time.
 */
export function correlationUtcUt1(JTutc)
{
    return JTut1 + interpolateSearch(ut1Utc, JTutc)[1] / 86400.0
}