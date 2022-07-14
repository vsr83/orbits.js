// This script generates the vsop87a.json from the downloaded VSOP87A
// data files.
// The script should be executed only after download_vsop87.js.

import {readFileSync} from 'fs';

// VSOP87A base polynomial identifiers in the first column:
const inds = [
    [1010, 1011, 1012, 1013, 1014, 1015],
    [1020, 1021, 1022, 1023, 1024, 1025],
    [1030, 1031, 1032, 1033, 1034, 1035]
];
// Offsets for the identifiers by planet:
const indOffset = {
    mercury : 100,
    venus : 200,
    earth : 300,
    mars : 400,
    jupiter : 500,
    saturn : 600,
    uranus : 700,
    neptune : 800
};

/**
 * Create structure mapping indices to coefficient arrays.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parseVsopLines(fileName, planet)
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

    for (let indLine = 0; indLine < content.length; indLine++)
    {
        const line = content[indLine];

        if (line.includes("VSOP") || line.length == 0)
        {
            continue;
        }

        const strIndex = parseInt(line.substring(1, 5));
        const coeff1 = parseFloat(line.substring(83, 97));
        const coeff2 = parseFloat(line.substring(98, 112));
        const coeff3 = parseFloat(line.substring(113));
        
        // console.log(line);
        // console.log(strIndex + " " + coeff1 + " " + coeff2 + " " + coeff3);

        if (!(strIndex in data))
        {
            data[strIndex] = [];
        }

        data[strIndex].push([coeff1, coeff2, coeff3]);
    }

    return data;
}

/**
 * Parse VSOP87A array into an array.
 * 
 * @param {*} vsopArray 
 *      The array parsed.
 * @param {*} planet 
 *      The planet.
 * @returns The array.
 */
function parseVsopArray(vsopArray, planet)
{
    const outputArray = [];

    for (let indDim = 0; indDim < 3; indDim++)
    {
        const dimArray = [];

        for (let indCoeff = 0; indCoeff < 6; indCoeff++)
        {
            const id = inds[indDim][indCoeff] + indOffset[planet]
            let array = vsopArray[id];

            if (array === undefined)
            {
                array = [];
            }
            dimArray.push(array);
        }
        outputArray.push(dimArray);
    }

    return outputArray;
}

const jsonArray = {
    mercury : parseVsopArray(parseVsopLines('VSOP87A.mer'), 'mercury'),
    venus   : parseVsopArray(parseVsopLines('VSOP87A.ven'), 'venus'),
    earth   : parseVsopArray(parseVsopLines('VSOP87A.ear'), 'earth'),
    mars    : parseVsopArray(parseVsopLines('VSOP87A.mar'), 'mars'),
    jupiter : parseVsopArray(parseVsopLines('VSOP87A.jup'), 'jupiter'),
    saturn  : parseVsopArray(parseVsopLines('VSOP87A.sat'), 'saturn'),
    uranus  : parseVsopArray(parseVsopLines('VSOP87A.ura'), 'uranus'),
    neptune : parseVsopArray(parseVsopLines('VSOP87A.nep'), 'neptune')
};

console.log(JSON.stringify(jsonArray));