import {moonNodePassages, moonNewList, moonPositionEcl, moonPositionTod} from './Moon.js';
import {nutationTerms} from './Nutation.js';
import {vecDiff, asind, norm, atan2d, atand, tand, vecMul, vecSum, cosd, sind} from './MathUtils.js';
import {vsop87} from './Vsop87A.js';
import { coordEclEq, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod, coordWgs84Efi } from './Frames.js';
import { timeGast } from './Time.js';
import {rotateCart1d, rotateCart3d} from './Rotations.js';
import {aberrationStellarCart} from './Aberration.js';

/**
 * Compute longitude rate of the Moon. This estimates the first-order
 * derivative.
 * 
 * @param {*} JT 
 *      Julian time.
 * @param {*} stepSeconds 
 *      Step in seconds.
 */
function moonLonRateNode(JT, stepSeconds)
{
    const T = (JT - 2451545.0)/36525.0;
    const nutTerms = nutationTerms(T);
    const posEcl = moonPositionEcl(JT, nutTerms);
    const posEcl2 = moonPositionEcl(JT + stepSeconds/86400.0, nutTerms);

    return (atan2d(posEcl2[1], posEcl2[0]) -atan2d(posEcl[1], posEcl[0])) 
           / stepSeconds;
}

/**
 * Compute inclination of the Moon at a node.
 * 
 * @param {*} JTnode 
 *      Julian time at a node.
 * @param {*} stepSeconds 
 *      Step in seconds.
 * @returns The inclination at the node.
 */
function moonNodeInclination(JTnode, stepSeconds)
{
    const T = (JTnode - 2451545.0)/36525.0;
    const nutTerms = nutationTerms(T);
    const posEcl = moonPositionEcl(JTnode, nutTerms);
    const posEcl2 = moonPositionEcl(JTnode + stepSeconds/86400.0, nutTerms);
    const rDiff = vecDiff(posEcl2, posEcl);

    return asind(rDiff[2] / norm(rDiff));
}

/**
 * Compute occurrence of Solar Eclipses.
 * 
 * @param {*} startYear 
 *      Start year.
 * @param {*} endYear
 *      End year. 
 * @returns List of Solar Eclipses.
 */
export function solarEclipses(startYear, endYear)
{
    // This computation is based on the section 11.2 of
    // Urban, Seidelmann - Explanatory Supplement to the Astronomcal Almanac
    // 3rd Edition, 2012.

    // List of eclipses.
    const eclipseList = [];

    // Average light traveltime from the Sun to the Earth.
    const lightTimeJT = 1.495978707e8 / (3e5 * 86400.0);

    // Find all nodes of Moon's orbit during the period.
    const nodePassages = moonNodePassages(startYear, endYear + 1);
    // Find all new Moons during the period.
    const newMoons = moonNewList(startYear, endYear + 1);

    // Inclination at each node:
    const nodeInclinations = [];
    // Longitude rate at each node.
    const nodeLonRates = [];

    // Find index of the closest match;
    let findClosests = function(arrayIn, JT)
    {
        let distMax = 1e10;
        let value = undefined;

        for (let indItem = 0; indItem < arrayIn.length; indItem++)
        {
            const item = arrayIn[indItem];
            const distNew = Math.abs(item - JT);

            if (distNew < distMax)
            {
                value = indItem;
                distMax = distNew;
            }
        }

        return value;
    }

    // Compute inclinations and longitude rates at nodes:
    for (let JT of nodePassages)
    {
        nodeInclinations.push(moonNodeInclination(JT, 60));
        nodeLonRates.push(moonLonRateNode(JT, 60));
    }

    for (let JT of newMoons)
    {
        const T = (JT - 2451545.0)/36525.0;
        const nutTerms = nutationTerms(T);
        // Find the index and time of closest (w.r.t. time) node of Moon's orbit.
        const indClosest = findClosests(nodePassages, JT);
        const JTclosests = nodePassages[indClosest];

        const posEcl = moonPositionEcl(JT, nutTerms);
        // Angular distance of the Moon from the Ecliptic.
        const beta_m = asind(posEcl[2] / norm(posEcl));
        // Inclination of the Moon's orbit computed at the closest node.
        const incl = nodeInclinations[indClosest];

        // Compute the Ratio of longtudal motions of the Moon and 
        // the Sun (11.1): 
        const lonRate = nodeLonRates[indClosest];
        const lonRateSun = 360 / (365.256 * 86400.0);
        const lambda = lonRate / lonRateSun;

        // (11.6)
        const gamma = atand(lambda * tand(incl) 
                    / (Math.pow(lambda - 1, 2) + lambda*lambda*tand(incl)*tand(incl)));

        // Minimum angular distance between Moon and the Sun near the 
        // new Moon (11.7)
        const sigma = beta_m * (lambda - 1) 
                    / Math.sqrt(Math.pow(lambda - 1, 2) + lambda * lambda * tand(incl) * tand(incl));

        // Sun longitude dfference to the minimum distance between Moon 
        // and the Sun.
        const lonDiffMin = beta_m * tand(gamma);
        // Julian time at minimum distance.
        const JTmax = JT - (1 / 86400) * lonDiffMin / lonRateSun;

        // Position of the Earth in Heliocentric Ecliptic Frame.
        // Used only for the computation of the distance to the Sun.
        const osvEarth = vsop87('earth', JT - lightTimeJT);
        // Semidiameter of the Moon at new Moon:
        const semiMoon = atand(1737400.0 / norm(posEcl));
        // Semidiameter of the Sun at new Moon:
        const semiSun  = atand(696340000 / norm(osvEarth.r));
        // Horizontal parallax of the Moon at new Moon:
        const horiMoon = atand(6371000 / norm(posEcl));
        // Horizontal parallax of the Sun at new Moon:
        const horiSun  = atand(6371000 / norm(osvEarth.r));

        // Limit for partial Solar Eclipse (11.21):
        const partialLimit = semiSun + semiMoon + horiMoon - horiSun;
        // Limit for total/annular Solar Eclipse (11.23):
        const totalLimit   = semiSun - semiMoon + horiMoon - horiSun;

        if (Math.abs(sigma) < partialLimit)
        {
            let eclipseType = "Partial";
            if (Math.abs(sigma) < totalLimit)
            {
                if (semiSun < semiMoon)
                {
                    eclipseType = "Total";
                }
                else 
                {
                    eclipseType = "Annular";
                }
            }

            let eclipseInfo = {
                JTnewMoon : JT,
                JTmax : JTmax,
                type : eclipseType, 
                sigma : sigma,
                beta_m : beta_m, 
                gamma : gamma
            };

            eclipseList.push(eclipseInfo);
        }
    }

    return eclipseList;
}

/**
 * Convert coordinates from true-of-date (ToD) to the fundamental system.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ToDframe.
 * @param {*} a 
 *      Geocentric equatorial right-ascension (degrees).
 * @param {*} d
 *      Geocentric equatorial declination (degrees).
 * 
 * @returns Orbit state vector in fundamental frame.
 */
 function coordTodFund(osv, a, d)
{
    const rFund = rotateCart1d(rotateCart3d(osv.r, a + 90), 90 - d);
    // TODO: Additional term
    const vFund = rotateCart1d(rotateCart3d(osv.r, a + 90), 90 - d);

    return {r : rFund, v : vFund, JT : osv.JT};
}

/**
 * Compute Besselian elements for a Solar Eclipse.
 * 
 * @param {*} eclipse 
 *     The eclipse JSON.
 */
export function besselianSolar(eclipse, JT)
{
    // Average light traveltime from the Sun to the Earth.

    let earthEcl = vsop87('earth', JT);
    const lightTimeJT = norm(earthEcl.r) / (3e8 * 86400.0);
    earthEcl = vsop87('earth', JT - lightTimeJT);

    const sunEcl = {r : vecMul(earthEcl.r, -1), v : vecMul(earthEcl.v, -1), JT : JT};
    let sunJ2000 = coordEclEq(sunEcl);
    //sunJ2000.r = aberrationStellarCart(JT, sunJ2000.r);
    const sunMoD = coordJ2000Mod(sunJ2000);
    const sunToD = coordModTod(sunMoD);
    
    let moonPosToD = moonPositionTod(JT);
    
    // The direction vector from Sun to the Moon.
    let g = vecDiff(sunToD.r, moonPosToD);
    const gUnit = vecMul(g, 1/norm(g));
    //console.log(gUnit);

    const a = atan2d(gUnit[1], gUnit[0]);
    const d = asind(gUnit[2]);
    const gast = timeGast(JT);
    const mu = gast - a;

    const moonFund = coordTodFund({r : moonPosToD, v : [0, 0, 0], JT : JT}, a, d);

    // Radius of the Sun.
    const ds = 696340e3;
    // Radius of the Moon.
    const dm = 1737400;
    // Radius of the Earth.
    const de = 6371000;

    const x = moonFund.r[0] / de;
    const y = moonFund.r[1] / de;
    const z = moonFund.r[2] / de;
    //console.log("Moon_fund = " + moonFund.r);

    const k = dm / de;
    const f1 = asind((ds + dm) / norm(g));
    const f2 = asind((ds - dm) / norm(g));
    const c1 = z + k / sind(f1);
    const c2 = z - k / sind(f2);
    const l1 = c1 * tand(f1);
    const l2 = c2 * tand(f2);

    /*console.log(vecMul(intersection, 1/6371000));
    console.log("tan f1 " + tand(f1));
    console.log("tan f2 " + tand(f2));
    console.log("l1 " + l1);
    console.log("l2 " + l2);
    console.log("mu " + mu);
    console.log("d " + d);*/

    const delta_m = asind(moonPosToD[2] / norm(moonPosToD));
    const alpha_m = atan2d(moonPosToD[1], moonPosToD[0]);

    return {
        x : x, 
        y : y, 
        sin_d : sind(d),
        cos_d : cosd(d),
        mu : mu, 
        l1 : l1, 
        l2 : l2, 
        tan_f1 : tand(f1), 
        tan_f2 : tand(f2), 
    };
}