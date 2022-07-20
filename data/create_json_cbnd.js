// This script generates constellation boundary JSON from the downloaded 
// data files.
// The script should be executed only after download_cbnd.js.

import {readFileSync} from 'fs';

const magLimit = 6;

let content;

try 
{
    content = readFileSync("bound.dat").toString().split("\n");
}
catch (err)
{
    console.error(err);
}

//console.log(content);

const bound = {};

for (let indLine = 0; indLine < content.length - 1; indLine++)
{
    const line = content[indLine];

    const hRaJ2000 = parseFloat(line.substring(0, 10));
    const declJ2000 = line.substring(11, 22);
    const cAbbr = line.substring(23, 26);
    //console.log(line);
    //console.log(hRaJ2000 + "|" + declJ2000 + "|" + cAbbr + "|");

    const hRa = hRaJ2000 * 360.0 / 24.0;

    if (!(cAbbr in bound))
    {
        bound[cAbbr] = [];
    }
    bound[cAbbr].push([hRa, declJ2000]);
}

console.log(JSON.stringify(bound));