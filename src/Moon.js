import { nutationTerms } from "./Nutation.js";
import {cosd, sind, tand, atan2d, asind, vecDiff, vecMul} from "./MathUtils.js";
import {vsop87} from "./Vsop87A.js";
import {angleDiff} from "./Angles.js";
import { elp2000 } from "./Elp2000-82b.js";
        
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