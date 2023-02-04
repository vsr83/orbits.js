// Extract orbit state vectors from Vector Data from JPL Horizons system to
// a JSON array.
//
// The first argument is the filename. The second argument is the name of the
// object field.
//
// The output fill be written to STDOUT.

import {readFileSync} from 'fs';

let content;
try 
{
    content = readFileSync(process.argv[2]).toString().split("\n");
}
catch (err)
{
    console.error(err);
}

let lines = [];


const X = [];
const Y = [];
const Z = [];
const VX = [];
const VY = [];
const VZ = [];
const JT = [];

console.log(process.argv[3] + " :[");

// Ignore the title line:
for (let indLine = 0; indLine < content.length; indLine++)
{
    let line = content[indLine];
    line = line.replace(" ", "");

    //console.log(line);

    if (line.includes("X =")){
        line = line.replace("X =", "");
        line = line.replace(" Y =", ",");
        line = line.replace(" Z =", ",");
        const strlist = line.split(",");

        X.push(parseFloat(strlist[0]));
        Y.push(parseFloat(strlist[1]));
        Z.push(parseFloat(strlist[2]));
    }
    if (line.includes("VX=")){
        line = line.replace("VX=", "");
        line = line.replace(" VY=", ",");
        line = line.replace(" VZ=", ",");
        const strlist = line.split(",");

        VX.push(parseFloat(strlist[0]));
        VY.push(parseFloat(strlist[1]));
        VZ.push(parseFloat(strlist[2]));
    }
    if (line.includes("TDB") && !line.includes("JDTDB") && !line.includes("time")){
        const strlist = line.split(",");

        JT.push(parseFloat(strlist[0]));
    }
}
//console.log(times.length);
//console.log(coords.length);

//console.log(X);
//console.log(Y);
//console.log(Z);
//console.log(JT);

for (let ind = 0; ind < X.length; ind++)
{
    if (ind < X.length - 1)
    {
        console.log("[" + JT[ind] + "," + X[ind] +","+ Y[ind]+","+ Z[ind]+ "," + VX[ind] +","+ VY[ind]+","+ VZ[ind] + "],");
    }
    else 
    {
        console.log("[" + JT[ind] + "," + X[ind] +","+ Y[ind]+","+ Z[ind] + "," + VX[ind] +","+ VY[ind]+","+ VZ[ind] + "]],");
    }
}