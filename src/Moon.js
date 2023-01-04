import { nutationTerms } from "./Nutation.js";
import {cosd, sind, tand, atan2d, asind, vecDiff, vecMul} from "./MathUtils.js";
import {coordTodMod, coordModJ2000, coordEqEcl} from "./Frames.js";
import {vsop87} from "./Vsop87A.js";
import {angleDiff} from "./Angles.js";
import { elp2000 } from "./Elp2000-82b.js";
import { aberrationStellarCart } from "./Aberration.js";

// Periodic terms for the longitude and distance of the Moon.
// The unit is 0.000 001 degree for longitude and 0.001 kilometer for distance.
// Table 47.A in Meeus - Astronomical algorithms 1998.
const lonTerms = [
//   Multiple of    Coeff.sine Coeff. cosine
//    D  Ms  Mm   F     
    [ 0,  0,  1,  0,    6288774,  -20905355],
    [ 2,  0, -1,  0,    1274027,   -3699111],
    [ 2,  0,  0,  0,     658314,   -2955968],
    [ 0,  0,  2,  0,     213618,    -569925],
    [ 0,  1,  0,  0,    -185116,      48888],
    [ 0,  0,  0,  2,    -114332,      -3149],
    [ 2,  0, -2,  0,      58793,     246158],
    [ 2, -1, -1,  0,      57066,    -152138],
    [ 2,  0,  1,  0,      53322,    -170733],
    [ 2, -1,  0,  0,      45758,    -204586],
    [ 0,  1, -1,  0,     -40923,    -129620],
    [ 1,  0,  0,  0,     -34720,     108743],
    [ 0,  1,  1,  0,     -30383,     104755],
    [ 2,  0,  0, -2,      15327,      10321],
    [ 0,  0,  1,  2,     -12528,          0],
    [ 0,  0,  1, -2,      10980,      79661],
    [ 4,  0, -1,  0,      10675,     -34782],
    [ 0,  0,  3,  0,      10034,     -23210],
    [ 4,  0, -2,  0,       8548,     -21636],
    [ 2,  1, -1,  0,      -7888,      24208],
    [ 2,  1,  0,  0,      -6766,      30824],
    [ 1,  0, -1,  0,      -5163,      -8379],
    [ 1,  1,  0,  0,       4987,     -16675],
    [ 2, -1,  1,  0,       4036,     -12831],
    [ 2,  0,  2,  0,       3994,     -10445],
    [ 4,  0,  0,  0,       3861,     -11650],
    [ 2,  0, -3,  0,       3665,      14403],
    [ 0,  1, -2,  0,      -2689,      -7003],
    [ 2,  0, -1,  2,      -2602,          0],
    [ 2, -1, -2,  0,       2390,      10056],
    [ 1,  0,  1,  0,      -2348,       6322],
    [ 2, -2,  0,  0,       2236,      -9884],
    [ 0,  1,  2,  0,      -2120,       5751],
    [ 0,  2,  0,  0,      -2069,          0],
    [ 2, -2, -1,  0,       2048,      -4950],
    [ 2,  0,  1, -2,      -1773,       4130],
    [ 2,  0,  0,  2,      -1595,          0],
    [ 4, -1, -1,  0,       1215,      -3958],
    [ 0,  0,  2,  2,      -1110,          0],
    [ 3,  0, -1,  0,       -892,       3258],
    [ 2,  1,  1,  0,       -810,       2616],
    [ 4, -1, -2,  0,        759,      -1897],
    [ 0,  2, -1,  0,       -713,      -2117],
    [ 2,  2, -1,  0,       -700,       2354],
    [ 2,  1, -2,  0,        691,          0],
    [ 2, -1,  0, -2,        596,          0],
    [ 4,  0,  1,  0,        549,      -1423],
    [ 0,  0,  4,  0,        537,      -1117],
    [ 4, -1,  0,  0,        520,      -1571],
    [ 1,  0, -2,  0,       -487,      -1739],
    [ 2,  1,  0, -2,       -399,          0],
    [ 0,  0,  2, -2,       -381,      -4421],
    [ 1,  1,  1,  0,        351,          0],
    [ 3,  0, -2,  0,       -340,          0],
    [ 4,  0, -3,  0,        330,          0],
    [ 2, -1,  2,  0,        327,          0],
    [ 0,  2,  1,  0,       -323,       1165],
    [ 1,  1, -1,  0,        299,          0],
    [ 2,  0,  3,  0,        294,          0],
    [ 2,  0, -1, -2,          0,       8752]
];

// Periodic terms for the latitude of the moon.
// The unit is 0.000 001 degree for longitude and 0.001 kilometer for distance.
// Table 47.B in Meeus - Astronomical algorithms 1998.
const latTerms = [
//  Multiple of    Coeff.sine 
//  D  Ms  Mm   F     
    [ 0,  0,  0,  1,    5128122],
    [ 0,  0,  1,  1,     280602],
    [ 0,  0,  1, -1,     277693],
    [ 2,  0,  0, -1,     173237],
    [ 2,  0, -1,  1,      55413],
    [ 2,  0, -1, -1,      46271],
    [ 2,  0,  0,  1,      32573],
    [ 0,  0,  2,  1,      17198],
    [ 2,  0,  1, -1,       9266],
    [ 0,  0,  2, -1,       8822],
    [ 2, -1,  0, -1,       8216],
    [ 2,  0, -2, -1,       4324],
    [ 2,  0,  1,  1,       4200],
    [ 2,  1,  0, -1,      -3359],
    [ 2, -1, -1,  1,       2463],
    [ 2, -1,  0,  1,       2211],
    [ 2, -1, -1, -1,       2065],
    [ 0,  1, -1, -1,      -1870],
    [ 4,  0, -1, -1,       1828],
    [ 0,  1,  0,  1,      -1794],
    [ 0,  0,  0,  3,      -1749],
    [ 0,  1, -1,  1,      -1565],
    [ 1,  0,  0,  1,      -1491],
    [ 0,  1,  1,  1,      -1475],
    [ 0,  1,  1, -1,      -1410],
    [ 0,  1,  0, -1,      -1344],
    [ 1,  0,  0, -1,      -1335],
    [ 0,  0,  3,  1,       1107],
    [ 4,  0,  0, -1,       1021],
    [ 4,  0, -1,  1,        833],
    [ 0,  0,  1, -3,        777],
    [ 4,  0, -2,  1,        671],
    [ 2,  0,  0, -3,        607],
    [ 2,  0,  2, -1,        596],
    [ 2, -1,  1, -1,        491],
    [ 2,  0, -2,  1,       -451],
    [ 0,  0,  3, -1,        439],
    [ 2,  0,  2,  1,        422],
    [ 2,  0, -3, -1,        421],
    [ 2,  1, -1,  1,       -366],
    [ 2,  1,  0,  1,       -351],
    [ 4,  0,  0,  1,        331],
    [ 2, -1,  1,  1,        315],
    [ 2, -2,  0, -1,        302],
    [ 0,  0,  1,  3,       -283],
    [ 2,  1,  1, -1,       -229],
    [ 1,  1,  0, -1,        223],
    [ 1,  1,  0,  1,        223],
    [ 0,  1, -2, -1,       -220],
    [ 2,  1, -1, -1,       -220],
    [ 1,  0,  1,  1,       -185],
    [ 2, -1, -2, -1,        181],
    [ 0,  1,  2,  1,       -177],
    [ 4,  0, -2, -1,        176],
    [ 4, -1, -1, -1,        166],
    [ 1,  0,  1, -1,       -164],
    [ 4,  0,  1, -1,        132],
    [ 1,  0, -1, -1,       -119],
    [ 4, -1,  0, -1,        115],
    [ 2, -2,  0,  1,        107]
];
 
/**
 * Map angle to the interval [0, 2*pi].
 *  
 * @param {Number} rad 
 *     The angle (in radians).
 * @returns The mapped angle.
 */
function limitAngleRad(rad)
{
    const interval = 2 * Math.PI;
    if (rad < 0)
    {
        rad += (1 + Math.floor(-rad / interval)) * interval;
    }
    else
    {
        rad = rad % interval;
    }
    return rad;
}
       
/**
 * Compute equitorial coordinates of the Moon.
 * 
 * @param {*} JT 
 *     Julian time.
 * @param {*} nutTerms
 *     Nutation terms. If parameter is missing, terms are computed.
 * @returns Right ascension and declination.
 */
export function moonEquitorial(JT, nutTerms)
{
    const T = (JT - 2451545.0)/36525.0;
    const T2 = T * T;
    const T3 = T2 * T;
    const T4 = T3 * T;

    // Meeus - Astronomical Algorithms 1998 Chapter 47.

    // Mean longitude of the Moon.
    const Lm = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841.0 - T4 / 65194000.0;
    // Mean elongation of the Moon from the Sun.
    const D  = 297.8501921 + 445267.11140340 * T - 0.0018819 * T2 + T3 / 545868.0 - T4 / 113065000.0;
    // Mean anomaly of the Sun (Earth).
    const Ms = 357.5291092 + 35999.050290900 * T - 0.0001536 * T2 + T3 / 24490000.0;
    // Mean anomaly of the Moon:
    const Mm = 134.9633964 + 477198.86750550 * T + 0.0087414 * T2 + T3 / 69699.0 - T4 / 14712000.0;
    // Moon's argument of latitude:
    const F  =  93.2720950 + 483202.01752330 * T - 0.0036539 * T2 - T3 / 3526000.0 + T4 / 863310000.0;

    const A1 = 119.75 + 131.849 * T;
    const A2 =  53.09 + 479264.290 * T;
    const A3 = 313.45 + 481266.484 * T;

    // Compute periodic terms for longitude, latitude and distance.
    const sigmaTerms = moonSigmaTerms(D, Ms, Mm, F, T);
    let sigmaL = sigmaTerms.sigmaL;
    const sigmaR = sigmaTerms.sigmaR;
    let sigmaB = sigmaTerms.sigmaB;

    sigmaL +=  3958 * sind(A1)     + 1962* sind(Lm - F)  + 318 * sind(A2);
    sigmaB += -2235 * sind(Lm)     + 382 * sind(A3)      + 175 * sind(A1 - F) 
           +    175 * sind(A1 + F) + 127 * sind(Lm - Mm) - 115 * sind(Lm + Mm);

    // Ecliptic longitude, latitude and distance.
    let lambda = Lm + sigmaL / 1000000.0;
    const beta   = sigmaB / 1000000.0;
    const Delta  = 385000.56 + sigmaR/1000.0;

    // Compute nutation terms, if missing.
    if (nutTerms === undefined)
    {
        nutTerms = nutationTerms(T);
    }
    const dpsi = nutTerms.dpsi;
    const deps = nutTerms.deps;

    lambda = lambda + dpsi;
    const eps = 23.4392911111 + deps;

    // Apparent Right-Ascension and declination.
    const alpha = atan2d(sind(lambda) * cosd(eps) - tand(beta) * sind(eps), cosd(lambda));
    const delta = asind(sind(beta) * cosd(eps) + cosd(beta) * sind(eps) * sind(lambda));
    
    return {rA : alpha, decl : delta, dist : Delta * 1000};
}

/**
 * Compute position of the Moon in the ToD frame.
 * 
 * @param {*} JT 
 *     Julian time.
 * @param {*} nutTerms
 *     Nutation terms. If parameter is missing, terms are computed.
 * @returns The position.
 */
export function moonPositionTod(JT, nutTerms)
{
    let {rA, decl, dist} = moonEquitorial(JT, nutTerms);

    const rTod = [dist * cosd(decl) * cosd(rA),
                  dist * cosd(decl) * sind(rA),
                  dist * sind(decl)];
    return rTod;
}
 
/**
 * Compute periodic terms term.
 * 
 * @param {*} D 
 *      Mean elongation of the Moon from the Sun
 * @param {*} Ms 
 *      Mean anomaly of the Sun (Earth).
 * @param {*} Mm 
 *      Mean anomaly of the Moon.
 * @param {*} F 
 *      Moon's argument of latitude.
 * @param {*} T 
 * @returns 
 */
function moonSigmaTerms(D, Ms, Mm, F, T)
{
    const Ecorr = 1.0 - 0.002516 * T - 0.0000074 * T*T;
    const Ecorr2 = Ecorr * Ecorr;

    let sigmaL = 0.0; 
    let sigmaR = 0.0;
    let sigmaB = 0.0;

    let numTermsLon = lonTerms.length;
    for (let indTerm = 0; indTerm < numTermsLon; indTerm++)
    {
        let term = lonTerms[indTerm];
        
        let arg = term[0] * D + term[1] * Ms + term[2] * Mm + term[3] * F;

        let coeffSin = term[4];
        let coeffCos = term[5];

        if (term[1] == -1 || term[1] == 1)
        {
            coeffSin *= Ecorr;
            coeffCos *= Ecorr;
        }
        else if (term[1] == -2 || term[1] == 2)
        {
            coeffSin *= Ecorr2;
            coeffCos *= Ecorr2;
        }

        sigmaL += coeffSin * sind(arg);
        sigmaR += coeffCos * cosd(arg);
    }

    let numTermsLat = latTerms.length;
    for (let indTerm = 0; indTerm < numTermsLat; indTerm++)
    {
        let term = latTerms[indTerm];
        
        let arg = term[0] * D + term[1] * Ms + term[2] * Mm + term[3] * F;

        let coeffSin = term[4];

        if (term[1] == -1 || term[1] == 1)
        {
            coeffSin *= Ecorr;
        }
        else if (term[1] == -2 || term[1] == 2)
        {
            coeffSin *= Ecorr2;
        }

        sigmaB += coeffSin * sind(arg);
    }

    return {sigmaL : sigmaL, sigmaR : sigmaR, sigmaB : sigmaB};
}  

/**
 * Compute position of the Moon in the J2000 Ecliptic frame.
 * 
 * @param {*} JT 
 *     Julian time.
 * @param {*} nutTerms
 *     Nutation terms. If parameter is missing, terms are computed.
 * @returns The position.
 */
 export function moonPositionEcl(JT, nutTerms)
{
    /*if (nutTerms === undefined)
    {
        const T = (JT - 2451545.0)/36525.0;
        nutTerms = nutationTerms(T);
    }*/

    /*const rTod = moonPositionTod(JT, nutTerms);
    const osvMod = coordTodMod({r : rTod, v : [0, 0, 0], JT : JT}, nutTerms)
    //const osvMod = {r : rTod, v : [0, 0, 0], JT : JT};
    const osvJ2000 = coordModJ2000(osvMod);
    const osvEcl = coordEqEcl(osvJ2000);

    return osvEcl.r;*/

    return elp2000(JT);
}

/**
 * Compute a list of time for passage of the Moon through the Ecliptic 
 * Plane.
 * 
 * @param {*} yearStart 
 *      Start year.
 * @param {*} yearEnd
 *      End year. 
 * @returns Julian time (TDT) for each passage.
 */
export function moonNodePassages(yearStart, yearEnd)
{
    // List of Julian times.
    const listJT = [];
    // The algorithm follows Meeus - Astronomical Algorithms Ch. 51
    // to obtain the initial position for each individual value of k.

    const kStart = Math.floor((yearStart - 2000.05) * 13.4223);
    const kEnd   = Math.ceil((yearEnd - 2000.05) * 13.4223);

    for (let k = kStart; k < kEnd ; k++)
    {
        // Ascending node.
        listJT.push(moonNodePassage(k));
        // Descending node.
        listJT.push(moonNodePassage(k + 0.5));
    }

    // Fine tune positions assuming constant velocity of the Moon:
    for (let indList = 0; indList < listJT.length; indList++)
    {
        const JTinitial = listJT[indList];
        const JTminute  = listJT[indList] + 1/(24*60);

        const posMoonInitial = moonPositionEcl(JTinitial);
        const posMoonMinute  = moonPositionEcl(JTminute);
        const diffZ = posMoonMinute[2] - posMoonInitial[2];

        // posMoonInitial[2] + numMinutes * diffZ = 0;
        const numMinutes = -posMoonInitial[2] / diffZ;
        listJT[indList] = JTinitial + numMinutes / (24 * 60);
        // const posMoonNew = moonPositionEcl(listJT[indList]);
        // console.log(posMoonInitial[2] + " " + posMoonNew[2]);
    }

    return listJT;
}

/**
 * Compute a list of times for new Moon.
 * 
 * @param {*} yearStart 
 *      Start year.
 * @param {*} yearEnd
 *      End year. 
 * @returns List of Julian times (TDT) for new Moons.
 */
export function moonNewList(yearStart, yearEnd)
{
    const kStart = Math.floor((yearStart - 2000) * 12.3685);
    const kEnd = Math.ceil((yearEnd - 2000) * 12.3685);
    const listJT = [];

    // Approximate light travel time from the Sun to the Earth.
    const lightTimeJT = 1.495978707e9 / (3e6 * 86400.0);

    for (let k = kStart; k < kEnd; k++)
    {
        const JTinitial = moonNew(k);

        // Update initial estimate assuming linear increase in longitude
        // of the Sun and the Moon until the more accurate New Moon:
        const JTminute = JTinitial + 1/(24*60);

        const posStart  = moonPositionEcl(JTinitial);
        const posMinute = moonPositionEcl(JTminute);
        const osvStart = vsop87("earth", JTinitial - lightTimeJT);
        const osvMinute = vsop87("earth", JTminute - lightTimeJT);
        let sunStart = vecMul(osvStart.r, -1);
        let sunMinute = vecMul(osvMinute.r, -1);

        const lonSunStart = atan2d(sunStart[1], sunStart[0]);
        const lonSunMinute = atan2d(sunMinute[1], sunMinute[0]);
        const lonMoonStart = atan2d(posStart[1], posStart[0]);
        const lonMoonMinute = atan2d(posMinute[1], posMinute[0]);

        const diffSun = angleDiff(lonSunMinute, lonSunStart);
        const diffMoon = angleDiff(lonMoonMinute, lonMoonStart);

        // sunStart + diffSun * numMin = moonStart + diffMoon * numMin
        // => sunStart - moonStart = numMin * (diffMoon - diffSun)
        
        const numMin = angleDiff(lonSunStart, lonMoonStart) / (diffMoon - diffSun);

        const JTnew = JTinitial + numMin / (24*60);
        //const posNew  = moonPositionEcl(JTnew);
        //const osvNew = vsop87("earth", JTnew);
        //const sunNew = vecMul(osvNew.r, -1);
        //const lonSunNew = atan2d(sunNew[1], sunNew[0]);
        //const lonMoonNew = atan2d(posNew[1], posNew[0]);
        //console.log(lonSunNew + " " + lonMoonNew);

        listJT.push(JTnew);
    }

    return listJT;
}

/**
 * Compute new moon time for integer k.
 * 
 * @param {*} k 
 *      Integer k as defined in Chapter 49 of Meeus.
 * @returns Julian time (TDT) of the new Moon.
 */
export function moonNew(k)
{
    // Meeus - Astronomical Algorithms Ch 49.
    let T = k/1236.85;
    let JDE = 2451550.09766 + 29.530588861*k;

    const T2 = T*T;
    const T3 = T2*T;
    const T4 = T3*T;
    JDE += 0.00015437*T2 - 0.000000150*T3 + 0.00000000073*T4;
    //T = (JDE - 2451545.0)/36525.0;
    //console.log(T);
    const M = 2.5534 + 29.10535670 * k - 0.0000014*T2 - 0.00000011*T3;
    const Mdot = 201.5643 + 385.81693528*k + 0.0107582*T2 + 0.00001238*T3 - 0.000000058*T4;
    const F = 160.7108 + 390.67050284*k - 0.0016118*T2 - 0.00000227*T3 + 0.000000011*T4;
    const Omega = 124.7746 - 1.56375588*k + 0.0020672*T2 + 0.00000215*T3;

    const A1 = 299.77 + 0.107408*k - 0.009173*T2;
    const A2 = 251.88 + 0.016321*k;
    const A3 = 251.83 + 26.651886*k;
    const A4 = 349.42 + 36.412478*k; 
    const A5 = 84.66 + 18.206239*k;
    const A6 = 141.74 + 53.303771*k;
    const A7 = 207.14 + 2.453732*k;
    const A8 = 154.84 + 7.306860*k;
    const A9 = 34.52 + 27.261239*k;
    const A10 = 207.19 + 0.121824*k;
    const A11 = 291.34 + 1.844379*k;
    const A12 = 161.72 + 24.198154*k;
    const A13 = 239.56 + 25.513099*k;
    const A14 = 331.55 + 3.592518*k;

    const E = 1.0 - 0.002516 * T - 0.0000074 * T*T;
    const JDEcorr1 = -0.40720 * sind(Mdot)
           +0.17241 * E * sind(M)
           + 0.01608 * sind(2*Mdot)
           + 0.01039 * sind(2*F)
           + 0.00739 * E * sind(Mdot - M)
           - 0.00514 * E * sind(Mdot + M)
           + 0.00208 * E*E * sind(2*M)
           - 0.00111 * sind(Mdot - 2*F)
           - 0.00057 * sind(Mdot + 2*F)
           + 0.00056 * E * sind(2*Mdot + M)
           - 0.00042 * sind(3*Mdot)
           + 0.00042 * E * sind(M + 2*F)
           + 0.00038 * E * sind(M - 2*F)
           - 0.00024 * E * sind(2*Mdot - M)
           - 0.00017 * sind(Omega)
           - 0.00007 * sind(Mdot + 2*M)
           + 0.00004 * sind(2*Mdot - 2*F)
           + 0.00004 * sind(3*M)
           + 0.00003 * sind(Mdot + M - 2*F)
           + 0.00003 * sind(2*Mdot + 2*F)
           - 0.00003 * sind(Mdot + M + 2*F)
           + 0.00003 * sind(Mdot - M + 2*F)
           - 0.00002 * sind(Mdot - M - 2*F)
           - 0.00002 * sind(3*Mdot + M)
           + 0.00002 * sind(4*Mdot);

    const JDEcorr2 = 0.000325 * sind(A1) 
                   + 0.000165 * sind(A2)
                   + 0.000164 * sind(A3)
                   + 0.000126 * sind(A4)
                   + 0.000110 * sind(A5)
                   + 0.000062 * sind(A6)
                   + 0.000060 * sind(A7)
                   + 0.000056 * sind(A8)
                   + 0.000047 * sind(A9)
                   + 0.000042 * sind(A10)
                   + 0.000040 * sind(A11)
                   + 0.000037 * sind(A12)
                   + 0.000035 * sind(A13)
                   + 0.000023 * sind(A14);                   

    // console.log(E);
    // console.log(M % 360+360);
    // console.log(Mdot % 360+360);
    // console.log(F % 360+360);
    // console.log(Omega % 360);
    // console.log(JDEcorr1);
    // console.log(JDEcorr2);
    JDE += JDEcorr1 + JDEcorr2;
    // console.log(JDE);
    return JDE;
}

/**
 * Compute time of passage of the Moon through the node.
 * 
 * @param {*} k 
 *      Variable k in Meeus - Astronomical Algorithms Ch. 51
 * @returns Julian time TDT of the passage of the Moon through the node.
 */
export function moonNodePassage(k) 
{
    const T = k / 1342.23;
    const T2 = T*T;
    const T3 = T2*T;
    const T4 = T3*T;
    const D = 183.6380 + 331.73735682*k + 0.0014852*T2 + 0.00000209*T3 - 0.00000001 * T4;
    const M = 17.4006 + 26.82037250*k + 0.0001186*T2 + 0.00000006*T3;
    const Mdot = 38.3776 + 355.52747313*k + 0.0123499*T2 + 0.000014627*T3 - 0.000000069*T4;
    const Omega = 123.9767 - 1.44098956*k + 0.0020608*T2 + 0.00000214*T3  - 0.000000016*T4;
    const V = 299.75 + 132.85*T - 0.009173*T2;
    const P = Omega + 272.75 - 2.3 * T;

    // Meeus Example 51.a with k = -170, triggered by the test.
    //console.log("T " + T + ", Expected -0.126655");
    //console.log("D " + (360 + D%360.0) + ", Expected 308.28736");
    //console.log("M " + (360 + M%360.0) + ", Expected 137.93728");
    //console.log("Mdot " + (360 + Mdot%360.0) + ", Expected 78.70737");
    //console.log("Omega " + (Omega%360.0) + ", Expected 8.9449");
    //console.log("V " + V + ", Expected 282.92");
    //console.log("P " + P + ", Expected 281.99");
    //console.log("E " + E);

    const JDE = 2451565.1619 + 27.212220817*k
              + 0.0002762*T2 + 0.000000021*T3 - 0.000000000088*T4
              - 0.4721 * sind(Mdot)
              - 0.1649 * sind(2*D)
              - 0.0868 * sind(2*D - Mdot)
              + 0.0084 * sind(2*D + Mdot)
              - 0.0083 * sind(2*D - M)
              - 0.0039 * sind(2*D - M - Mdot)
              + 0.0034 * sind(2*Mdot)
              - 0.0031 * sind(2*D - 2*Mdot)
              + 0.0030 * sind(2*D + M)
              + 0.0028 * sind(M - Mdot)
              + 0.0026 * sind(M)
              + 0.0025 * sind(4*D)
              + 0.0024 * sind(D)
              + 0.0022 * sind(M + Mdot)
              + 0.0017 * sind(Omega)
              + 0.0014 * sind(4*D - Mdot)
              + 0.0005 * sind(2*D + M - Mdot)
              + 0.0004 * sind(2*D - M + Mdot)
              - 0.0003 * sind(2*D - 2*M)
              + 0.0003 * sind(4*D - M)
              + 0.0003 * sind(V)
              + 0.0003 * sind(P);

    return JDE;
}