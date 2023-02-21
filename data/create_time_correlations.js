// This script generates the UT1-TAI, UTC-UT1 differences and polar motion data from 
// the downloaded time correlation data files.
// The script should be executed only after download_time_correlations.js.

import {readFileSync} from 'fs';

/**
 * 
 * @param {*} year 
 *      Year as an integer.
 * @param {*} month 
 *      Month (1-12).
 * @param {*} mday 
 *      Day of the month (1-31).
 * @returns Julian date.
 */
export function dateJulianYmd(year, month, mday)
{
    if (month < 3)
    {
        year--;
        month += 12;
    }

    const A = Math.floor(year / 100.0);
    const B = Math.floor(A / 4.0);
    const C = Math.floor(2.0 - A + B);
    const E = Math.floor(365.25 * (year + 4716.0));
    const F = Math.floor(30.6001 * (month + 1.0));

    return C + mday + E + F - 1524.5;    
}


/**
 * Parse UT1-TAI differences from.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parseUt1Tai(fileName)
{
    let content;

    try 
    {
        content = readFileSync(fileName).toString().split("\n");
    }
    catch (err)
    {
        console.error(err);
    }

    //console.log(content);

    let data = {};
    const diffUt1Tai = [];
    let minYear = 1900;
    let maxYear = 1900;

    let diffPrev = 0;
    for (let indLine = 1; indLine < content.length-1; indLine++)
    {
        const line = content[indLine];

        const fracYear = parseFloat(line.substring(0, 10));
        const diffUt1TaiLine = parseFloat(line.substring(58, 70));

        const JD = dateJulianYmd(Math.floor(fracYear), 1, 1) + 365.25 * (fracYear % 1.0);
        //console.log(fracYear + " " + JD + " " + diffUt1Tai + " " + (diffUt1Tai - diffPrev));

        if (fracYear % 1.0 != 0)
        {
            continue;
        }
        //console.log(fracYear + " " + JD + " " + diffUt1TaiLine + " " + (diffUt1TaiLine - diffPrev));

        diffUt1Tai.push([JD, diffUt1TaiLine]);

        if (fracYear > maxYear)
        {
            maxYear = fracYear;
        }

        diffPrev = diffUt1TaiLine;
    }

    data.data = diffUt1Tai;
    data.minJD = dateJulianYmd(minYear, 1, 1);
    data.maxJD = dateJulianYmd(maxYear, 1, 1);

    return data;
}


/**
 * Parse UTC-UT1 differences from EOP (IERS) 14 C04 time series data.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parseUtcUt1(fileName)
{
    let content;
    const utcUt1 = [];
    const data = {data : utcUt1};

    try 
    {
        content = readFileSync(fileName).toString().split("\n");
    }
    catch (err)
    {
        console.error(err);
    }

    let JDmin = 1e12;
    let JDmax = -1e12;

    for (let indLine = 1; indLine < content.length-1; indLine++)
    {
        const line = content[indLine];

        const MJD = parseFloat(line.substring(13, 19));
        const JD = MJD + 2400000.5;
        const polarX = parseFloat(line.substring(21, 30));
        const polarY = parseFloat(line.substring(32, 41));
        const diffUt1Utc = parseFloat(line.substring(43, 53));

        if (utcUt1.length != 0 && indLine != content.length - 2 && indLine % 7 != 0)
        {
            continue;
        }

        if (!isNaN(MJD))
        {
            JDmin = Math.min(JDmin, JD);
            JDmax = Math.max(JDmax, JD);
            utcUt1.push([JD, diffUt1Utc]);
        }
    }
    data.minJD = JDmin;
    data.maxJD = JDmax;

    return data;
}

/**
 * Parse polar motion from EOP (IERS) 14 C04 time series data.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parsePolar(fileName)
{
    let content;
    const utcUt1 = [];
    const data = {data : utcUt1};

    try 
    {
        content = readFileSync(fileName).toString().split("\n");
    }
    catch (err)
    {
        console.error(err);
    }

    let JDmin = 1e12;
    let JDmax = -1e12;

    for (let indLine = 1; indLine < content.length-1; indLine++)
    {
        const line = content[indLine];

        const MJD = parseFloat(line.substring(13, 19));
        const JD = MJD + 2400000.5;
        const polarX = parseFloat(line.substring(21, 30));
        const polarY = parseFloat(line.substring(32, 41));
        const diffUt1Utc = parseFloat(line.substring(43, 53));

        if (utcUt1.length != 0 && indLine != content.length - 2 && indLine % 7 != 0)
        {
            continue;
        }

        if (!isNaN(MJD))
        {
            JDmin = Math.min(JDmin, JD);
            JDmax = Math.max(JDmax, JD);
            utcUt1.push([JD, polarX, polarY]);
        }
    }
    data.minJD = JDmin;
    data.maxJD = JDmax;

    return data;
}



const jsonArrayUt1Tai = parseUt1Tai("EOP_C01_IAU1980_1900-now.txt");
const jsonArrayUt1Utc = parseUtcUt1("EOP_14_C04_IAU1980_one_file_1962-now.txt");
const jsonArrayPolar = parsePolar("EOP_14_C04_IAU1980_one_file_1962-now.txt");
const correlationData = {
    ut1Tai : jsonArrayUt1Tai,
    ut1Utc : jsonArrayUt1Utc,
    polar  : jsonArrayPolar
};
//console.log(jsonArray);
//console.log(JSON.stringify(jsonArray));
//console.log(JSON.stringify(jsonArrayUtcUt1));

console.log(JSON.stringify(correlationData));