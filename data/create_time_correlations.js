// This script generates the UT1-TAI differences from the downloaded time correlation
// data files.
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

        diffUt1Tai.push([JD, fracYear, diffUt1TaiLine]);

        if (fracYear > maxYear)
        {
            maxYear = fracYear;
        }

        diffPrev = diffUt1TaiLine;
    }

    data.diffUt1Tai = diffUt1Tai;
    data.diffUt1TaiMinYear = minYear;
    data.diffUt1TaiMaxYear = maxYear;
    data.diffUt1TaiMinJD = dateJulianYmd(minYear, 1, 1);
    data.diffUt1TaiMaxJD = dateJulianYmd(maxYear, 1, 1);

    return data;
}


const jsonArray = parseUt1Tai("EOP_C01_IAU1980_1900-now.txt");

//console.log(jsonArray);
console.log(JSON.stringify(jsonArray));