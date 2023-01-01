// This script generates the elp2000.json from the downloaded ELP2000-82b
// data files.
// The script should be executed only after download_elp2000.js.

import {readFileSync} from 'fs';


/**
 * Create structure mapping indices to coefficient arrays.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parseMainProblem(fileName)
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

    let lines = [];

    // Ignore the title line:
    for (let indLine = 1; indLine < content.length - 1; indLine++)
    {
        const line = content[indLine];

        const i1 = parseInt(line.substring(0, 3));
        const i2 = parseInt(line.substring(3, 6));
        const i3 = parseInt(line.substring(6, 9));
        const i4 = parseInt(line.substring(9, 12));
        const A  = parseFloat(line.substring(12, 27));
        const B1 = parseFloat(line.substring(27, 39));
        const B2 = parseFloat(line.substring(39, 51));
        const B3 = parseFloat(line.substring(51, 63));
        const B4 = parseFloat(line.substring(63, 75));
        const B5 = parseFloat(line.substring(75, 87));
        const B6 = parseFloat(line.substring(87, 99));
        
        lines.push({i1 : i1, i2 : i2, i3 : i3, i4 : i4, 
                    A : A, B1 : B1, B2 : B2, B3 : B3, B4 : B4, B5 : B5, B6 : B6});
    }

    return lines;
}

/**
 * Create structure mapping indices to coefficient arrays.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parsePerturbationsEarthFig(fileName)
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

    let lines = [];

    // Ignore the title line:
    for (let indLine = 1; indLine < content.length - 1; indLine++)
    {
        const line = content[indLine];

        const i1 = parseInt(line.substring(0, 3));
        const i2 = parseInt(line.substring(3, 6));
        const i3 = parseInt(line.substring(6, 9));
        const i4 = parseInt(line.substring(9, 12));
        const i5 = parseInt(line.substring(12, 15));
        const phi= parseFloat(line.substring(15, 25));
        const A  = parseFloat(line.substring(25, 35));
        const B  = parseFloat(line.substring(35, 45));
        
        lines.push({i1 : i1, i2 : i2, i3 : i3, i4 : i4, i5 : i5,
                    phi : phi, A : A, B : B});
    }

    return lines;
}

/**
 * Create structure mapping indices to coefficient arrays.
 * 
 * @param {*} fileName 
 *     Path of the file.
 */
function parsePerturbationsPlanetaryTable(fileName)
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

    let lines = [];

    // Ignore the title line:
    for (let indLine = 1; indLine < content.length - 1; indLine++)
    {
        const line = content[indLine];

        const i1 = parseInt(line.substring(0, 3));
        const i2 = parseInt(line.substring(3, 6));
        const i3 = parseInt(line.substring(6, 9));
        const i4 = parseInt(line.substring(9, 12));
        const i5 = parseInt(line.substring(12, 15));
        const i6 = parseInt(line.substring(15, 18));
        const i7 = parseInt(line.substring(18, 21));
        const i8 = parseInt(line.substring(21, 24));
        const i9 = parseInt(line.substring(24, 27));
        const i10= parseInt(line.substring(27, 30));
        const i11= parseInt(line.substring(30, 33));
        const phi= parseFloat(line.substring(33, 43));
        const A  = parseFloat(line.substring(43, 53));
        const B  = parseFloat(line.substring(53, 63));
        
        lines.push({i1 : i1, i2 : i2, i3 : i3, i4 : i4, i5 : i5,
                    i6 : i6, i7 : i7, i8 : i8, i9 : i9, i10 : i10, 
                    i11 : i11, phi : phi, A : A, B : B});
    }

    return lines;
}


// Longitude periodic terms (sine)
const ELP01 = parseMainProblem("elpseries/ELP01");
// Latitude (sine)
const ELP02 = parseMainProblem("elpseries/ELP02");
// Distance (cosine)
const ELP03 = parseMainProblem("elpseries/ELP03");
// Earth figure perturbations - Longitude
const ELP04 = parsePerturbationsEarthFig("elpseries/ELP04");
// Earth figure perturbations - Latitude
const ELP05 = parsePerturbationsEarthFig("elpseries/ELP05");
// Earth figure perturbations - Distance
const ELP06 = parsePerturbationsEarthFig("elpseries/ELP06");
// Earth figure perturbations - Longitude/t
const ELP07 = parsePerturbationsEarthFig("elpseries/ELP07");
// Earth figure perturbations - Latitude/t
const ELP08 = parsePerturbationsEarthFig("elpseries/ELP08");
// Earth figure perturbations - Distance/t
const ELP09 = parsePerturbationsEarthFig("elpseries/ELP09");

// Planetary perturbations Table 1 - Longitude
const ELP10 = parsePerturbationsPlanetaryTable("elpseries/ELP10");
// Planetary perturbations Table 1 - Latitude
const ELP11 = parsePerturbationsPlanetaryTable("elpseries/ELP11");
// Planetary perturbations Table 1 - Distance
const ELP12 = parsePerturbationsPlanetaryTable("elpseries/ELP12");
// Planetary perturbations Table 1 - Longitude/t
const ELP13 = parsePerturbationsPlanetaryTable("elpseries/ELP13");
// Planetary perturbations Table 1 - Latitude/t
const ELP14 = parsePerturbationsPlanetaryTable("elpseries/ELP14");
// Planetary perturbations Table 1 - Distance/t
const ELP15 = parsePerturbationsPlanetaryTable("elpseries/ELP15");

// Planetary perturbations Table 2 - Longitude
const ELP16 = parsePerturbationsPlanetaryTable("elpseries/ELP16");
// Planetary perturbations Table 2 - Latitude
const ELP17 = parsePerturbationsPlanetaryTable("elpseries/ELP17");
// Planetary perturbations Table 2 - Distance
const ELP18 = parsePerturbationsPlanetaryTable("elpseries/ELP18");
// Planetary perturbations Table 2 - Longitude/t
const ELP19 = parsePerturbationsPlanetaryTable("elpseries/ELP19");
// Planetary perturbations Table 2 - Latitude/t
const ELP20 = parsePerturbationsPlanetaryTable("elpseries/ELP20");
// Planetary perturbations Table 2 - Distance/t
const ELP21 = parsePerturbationsPlanetaryTable("elpseries/ELP21");

// Tidal effects - Longitude
const ELP22 = parsePerturbationsEarthFig("elpseries/ELP22");
// Tidal effects - Latitude
const ELP23 = parsePerturbationsEarthFig("elpseries/ELP23");
// Tidal effects - Distance
const ELP24 = parsePerturbationsEarthFig("elpseries/ELP24");
// Tidal effects - Longitude/t
const ELP25 = parsePerturbationsEarthFig("elpseries/ELP25");
// Tidal effects - Latitude7t
const ELP26 = parsePerturbationsEarthFig("elpseries/ELP26");
// Tidal effects - Distance/t
const ELP27 = parsePerturbationsEarthFig("elpseries/ELP27");

// Moon figure perturbations - Longitude
const ELP28 = parsePerturbationsEarthFig("elpseries/ELP28");
// Moon figure perturbations - Latitude
const ELP29 = parsePerturbationsEarthFig("elpseries/ELP29");
// Moon figure perturbations - Distance
const ELP30 = parsePerturbationsEarthFig("elpseries/ELP30");
// Relativistic perturbations - Longitude
const ELP31 = parsePerturbationsEarthFig("elpseries/ELP31");
// Relativistic perturbations - Latitude
const ELP32 = parsePerturbationsEarthFig("elpseries/ELP32");
// Relativistic perturbations - Distance
const ELP33 = parsePerturbationsEarthFig("elpseries/ELP33");
// Planetary perturbations (solar eccentricity) - Longitude/t^2
const ELP34 = parsePerturbationsEarthFig("elpseries/ELP34");
// Planetary perturbations (solar eccentricity) - Latitude/t^2
const ELP35 = parsePerturbationsEarthFig("elpseries/ELP35");
// Planetary perturbations (solar eccentricity) - Distance/t^2
const ELP36 = parsePerturbationsEarthFig("elpseries/ELP36");

const jsonExport = {
    ELP01 : ELP01,
    ELP02 : ELP02,
    ELP03 : ELP03,
    ELP04 : ELP04,
    ELP05 : ELP05,
    ELP06 : ELP06,
    ELP07 : ELP07,
    ELP08 : ELP08,
    ELP09 : ELP09,
    ELP10 : ELP10,
    ELP11 : ELP11,
    ELP12 : ELP12,
    ELP13 : ELP13,
    ELP14 : ELP14,
    ELP15 : ELP15,
    ELP16 : ELP16,
    ELP17 : ELP17,
    ELP18 : ELP18,
    ELP19 : ELP19,
    ELP20 : ELP20,
    ELP21 : ELP21,
    ELP22 : ELP22,
    ELP23 : ELP23,
    ELP24 : ELP24,
    ELP25 : ELP25,
    ELP26 : ELP26,
    ELP27 : ELP27,
    ELP28 : ELP28,
    ELP29 : ELP29,
    ELP30 : ELP30,
    ELP31 : ELP31,
    ELP32 : ELP32,
    ELP33 : ELP33,
    ELP34 : ELP34,
    ELP35 : ELP35,
    ELP36 : ELP36
};

console.log(JSON.stringify(jsonExport));
