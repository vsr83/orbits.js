// This script generates the hipparchus JSON from the downloaded XHIP
// data files.
// The script should be executed only after download_xhip.js.

import {readFileSync} from 'fs';
import constellations from './constellations.json'  assert {type: "json"};

const magLimit = 6;

// We wish to include all stars that are used in the constellation lines
// regardless of their magnitude:
const constStarList = [];

for (const [abbr, value] of Object.entries(constellations))
{

    const lines = value.hip;
    for (let indLine = 0; indLine < lines.length; indLine++)
    {
        const line = lines[indLine];
        if (!constStarList.includes(line[0]))
        {
            constStarList.push(line[0]);
        }
        if (!constStarList.includes(line[1]))
        {
            constStarList.push(line[1]);
        }
    }
}


let contentBiblio;
let contentPhoto;
let contentMain;

try 
{
    contentBiblio = readFileSync("biblio.dat").toString().split("\n");
    contentPhoto = readFileSync("photo.dat").toString().split("\n");
    contentMain = readFileSync("main.dat").toString().split("\n");
}
catch (err)
{
    console.error(err);
}

const output = {};
const numLines = contentBiblio.length;

for (let indLine = 0; indLine < numLines-1; indLine++)
{
    const elemsBiblio = contentBiblio[indLine].split('|');   
    const elemsPhoto  = contentPhoto[indLine].split('|');   
    const elemsMain   = contentMain[indLine].split('|');   

    const idData = elemsMain[0].trim();
    const constellation = elemsBiblio[2].trim();
    const RAdeg_1991 = parseFloat(elemsMain[4]);
    const DEdeg_1991 = parseFloat(elemsMain[5]);
    const RAdeg_proper = parseFloat(elemsMain[7]);
    const DEdeg_proper = parseFloat(elemsMain[8]);
    const dist = parseFloat(elemsMain[18]);

    const HPmag = parseFloat(elemsPhoto[1]);
    let name = elemsBiblio[5].trim();

    if (name.length == 0)
    {
        name = 'XHIP_' + idData;
    }

    if (HPmag <= magLimit || constStarList.includes[parseInt(idData)])
    {
        const data = {
            id : parseInt(idData),
            RA : RAdeg_1991,
            DE : DEdeg_1991,
            RA_delta : RAdeg_proper,
            DE_delta : DEdeg_proper,
            mag : HPmag, 
            constellation : constellation.toUpperCase()
        };
        output[name] = data;
    }
}

console.log(JSON.stringify(output));