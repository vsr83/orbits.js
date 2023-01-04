import {moonNodePassages, moonNewList, moonPositionEcl, moonPositionTod} from './Moon.js';
import {nutationTerms} from './Nutation.js';
import {vecDiff, asind, acosd,  norm, dot, atan2d, atand, tand, cross, vecMul, vecSum, cosd, sind} from './MathUtils.js';
import {vsop87} from './Vsop87A.js';
import { coordEclEq, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod, coordTodPef, coordPefEfi, coordEfiEnu, coordWgs84Efi } from './Frames.js';
import { timeGast } from './Time.js';
import {rotateCart1d, rotateCart3d} from './Rotations.js';
import {aberrationStellarCart} from './Aberration.js';
import { limitAngleDeg } from './Angles.js';
import { correlationTdbUt1 } from './TimeCorrelation.js';
import { elp2000 } from './Elp2000-82b.js';

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
 * Convert coordinates from the fundamental system to the true-of-date (ToD)
 * system.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in the fundamental frame.
 * @param {*} a 
 *      Geocentric equatorial right-ascension (degrees).
 * @param {*} d
 *      Geocentric equatorial declination (degrees).
 * 
 * @returns Orbit state vector in fundamental frame.
 */
export function coordFundTod(osv, a, d)
{
    const rToD = rotateCart3d(rotateCart1d(osv.r, -(90 - d)), -(a + 90));
    // TODO: Additional term
    const vToD = rotateCart3d(rotateCart1d(osv.v, -(90 - d)), -(a + 90));

    return {r : rToD, v : vToD, JT : osv.JT};
}

/**
 * Compute Besselian elements for a Solar Eclipse.
 * 
 * @param {*} eclipse 
 *     The eclipse JSON.
 * @param {*} JT 
 *     Julian time.
 * @param {*} nutParams
 *     Nutation parameters. Computed, if undefined.
 */
export function besselianSolar(eclipse, JT, nutParams)
{
    // Average light traveltime from the Sun to the Earth.

    let earthEcl = vsop87('earth', JT);
    const lightTimeJT = norm(earthEcl.r) / (3e8 * 86400.0);
    earthEcl = vsop87('earth', JT - lightTimeJT);

    const sunEcl = {r : vecMul(earthEcl.r, -1), v : vecMul(earthEcl.v, -1), JT : JT};
    let sunJ2000 = coordEclEq(sunEcl);
    sunJ2000.r = aberrationStellarCart(JT, sunJ2000.r);

    //sunJ2000.r = aberrationStellarCart(JT, sunJ2000.r);
    const sunMoD = coordJ2000Mod(sunJ2000);
    const sunToD = coordModTod(sunMoD, nutParams);
    
    //let moonPosToD = moonPositionTod(JT);
    let moonPosEq = elp2000(JT);
    const moonPosJ2000 = coordEclEq({r : moonPosEq, v : [0, 0, 0], JT : JT});
    const osvMoonMod = coordJ2000Mod({r : moonPosJ2000.r, v : [0, 0, 0], JT : JT});
    const osvMoonTod = coordModTod(osvMoonMod, nutParams);
    const moonPosToD = osvMoonTod.r;

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
    const de = 6378137;

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
        a : a, 
        d : d,
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

/**
 * Compute Besselian elements 
 * 
 * @param {*} eclipse
 *      Eclipse JSON. 
 * @param {*} JT 
 *      Julian time
 * @param {*} JTdelta 
 *      Delta-time used for the computation of the derivative.
 * @param {*} nutParams
 *     Nutation parameters. Computed, if undefined.
 */
export function besselianSolarWithDelta(eclipse, JT, JTdelta, nutParams)
{
    const bessel0 = besselianSolar(eclipse, JT, nutParams);
    const bessel1 = besselianSolar(eclipse, JT + JTdelta, nutParams);

    bessel0.a_dot = (bessel1.a - bessel0.a) / JTdelta;
    bessel0.d_dot = (bessel1.d - bessel0.d) / JTdelta;
    bessel0.x_dot = (bessel1.x - bessel0.x) / JTdelta;
    bessel0.y_dot = (bessel1.y - bessel0.y) / JTdelta;
    bessel0.mu_dot = (bessel1.mu - bessel0.mu) / JTdelta;
    bessel0.l1_dot = (bessel1.l1 - bessel0.l1) / JTdelta;
    bessel0.l2_dot = (bessel1.l2 - bessel0.l2) / JTdelta;

    return bessel0;
}

/**
 * Compute point on a central line. The method will return zeta = NaN 
 * when the central line does not intersect the Earth. Note that this
 * implies zeta = NaN for all coordinates of a partial Eclipse.
 * 
 * @param {*} eclipse 
 *     The eclipse JSON.
 * @param {*} bessel 
 *     The Besselian elements.
 * @param {*} JT
 *     The Julian time (TDT).
 */
export function besselianCentralLine(eclipse, bessel, JT) 
{
    // (11.61) Auxiliary Besselian Elements and Summary.

    // Semi-major axis of the Earth ellipsoid.
    const a = 6378137;
    // Semi-minor axis of the Earth ellipsoid.
    const b = 6356752.3142;
    // Square of ellipticity (not flattening).
    const el2 = 1 - b*b/(a*a);
    const rho1 = Math.sqrt(1 - el2 * bessel.cos_d * bessel.cos_d);
    const rho2 = Math.sqrt(1 - el2 * bessel.cos_d * bessel.sin_d);
    const sin_d1 = bessel.sin_d / rho1;
    const cos_d1 = Math.sqrt(1 - el2) * bessel.cos_d / rho1;
    const sin_d1d2 = el2 * bessel.sin_d * bessel.cos_d / (rho1 * rho2);
    const cos_d1d2 = Math.sqrt(1 - el2) / (rho1 * rho2);

    // Coordinate conversions.
    const xi  = bessel.x;
    const eta = bessel.y;
    const eta1 = eta / rho1;
    const zeta1 = Math.sqrt(1 - xi*xi - eta1*eta1);
    const zeta = rho2 * (zeta1 * cos_d1d2 - eta1 * sin_d1d2);

    return {rho1 : rho1, rho2 : rho2, sin_d1 : sin_d1, cos_d1 : cos_d1, 
    sin_d1d2 : sin_d1d2, cos_d1d2 : cos_d1d2, xi : xi, eta : eta, zeta : zeta};
}

/**
 * Compute Rise and Setting Curves.
 * 
 * @param {*} bessel 
 *     The Besselian elements.
 */
 export function besselianRiseSet(bessel) 
 {
    const r0 = 1;
    const r1 = bessel.l1;

    const p0 = [0, 0, 0];
    const p1 = [bessel.x, bessel.y, 0];
    const d = Math.sqrt(bessel.x * bessel.x + bessel.y * bessel.y);
    const a = (r0*r0 - r1*r1 + d*d) / (2*d);

    if (r0*r0 - a*a < 0) 
    {
        return [];
    }

    const h = Math.sqrt(r0*r0 - a*a);
    const p2 = vecSum(vecMul(vecDiff(p1, p0), a/d), p0);

    const x3 = p2[0] + h * (p1[1] - p0[1]) / d;
    const y3 = p2[1] - h * (p1[0] - p0[0]) / d;
    const x4 = p2[0] - h * (p1[1] - p0[1]) / d;
    const y4 = p2[1] + h * (p1[0] - p0[0]) / d;

    return [[x3, y3], [x4, y4]];
} 


/**
 * Implement solution of (11.81).
 * 
 * @param {*} a_dot 
 *      Term a_dot in (11.77)
 * @param {*} b_dot 
 *      Term b_dot in (11.77)
 * @param {*} c_dot 
 *      Term c_dot in (11.77)
 * @param {*} d 
 * @param {*} d_dot 
 * @param {*} mu_dot 
 * @param {*} f 
 * @param {*} zeta
 */
function limitsIteration(a_dot, b_dot, c_dot, d, d_dot, mu_dot, tan_f, zeta)
{
    // Initial b cos Q + c sin Q = 0
    //     <=> b cos Q = -c sin Q
    //     Q = atan2(b, c)
    let Q_initial = limitAngleDeg(-atan2d(b_dot, c_dot));

    let sign = 0;
    let value_prev = 0;
    let root_1 = NaN; 
    let root_2 = NaN;

    for (let Q_delta = 0; Q_delta <= 361; Q_delta++)
    {
        const Q = Q_initial + Q_delta;
        // Evaluate (11.81)
        const value = a_dot - b_dot * cosd(Q) + c_dot * sind(Q)
                    + zeta * (1 + Math.pow(tan_f, 2)) 
                    * (d_dot * cosd(Q) - mu_dot * cosd(d) * sind(Q));
        //console.log(sign + " " + value + " " + limitAngleDeg(Q));
        if (sign == 0)
        {
            //console.log("New sign " + Math.sign(value));
            sign = Math.sign(value);
            continue;
        }

        if (Math.sign(value) != sign)
        {
            sign = Math.sign(value);
            const diff = value - value_prev;
            const Q_delta_frac = Math.abs(value_prev) / Math.abs(diff);
            const root = limitAngleDeg(Q - 1 + Q_delta_frac);
            //console.log("New root " + root);

            if (isNaN(root_1))
            {
                root_1 = root;
            } 
            else 
            {
                root_2 = root;
                break;
            }
        }
        value_prev = value;
    }
    return [root_1, root_2];
}

/**
 * Compute magnitude of a Solar Eclipse at any specific moment.
 * 
 * @param {*} rEnuSun 
 *     Position of the Sun in ENU frame.
 * @param {*} rEnuMoon 
 *     Position of the Moon in ENU frame.
 * @returns Magnitude of the Eclipse and whether the point is in umbra.
 */
export function eclipseMagnitude(rEnuSun, rEnuMoon, signed) 
{
    // Radius of the Moon.
    const rMoon = 1737400;
    // Radius of the Sun.
    const rSun  = 696340000;
    // Angular diameter of the Sun.
    const angularDiamSun  = 2.0 * atand(rSun / norm(rEnuSun)); 
    // Angular diameter of the Moon.
    const angularDiamMoon = 2.0 * atand(rMoon / norm(rEnuMoon));
    // Angular distance between the Moon and the Sun.
    const angularDistance = acosd(dot(rEnuSun, rEnuMoon) / (norm(rEnuSun) * norm(rEnuMoon)));
    // Altitude of the Sun.
    const sunAltitude = asind(rEnuSun[2] / norm(rEnuSun));

    // console.log(angularDiamSun + " " + angularDiamMoon + " " + angularDistance);

    // Magnitude is zero when the Sun is below horizon.
    if (sunAltitude < - 0.5 * angularDiamSun)
    {
        return {mag : 0.0, inUmbra : false};
    }

    if (angularDistance < 0.5 * Math.abs(angularDiamSun - angularDiamMoon))
    {
        // Moon is entirely inside the Sun (Annular Eclipse) or the Sun 
        // is entirely inside the Moon (Total Eclipse).

        return {mag : angularDiamMoon / angularDiamSun, inUmbra : true};
    }
    else if (angularDistance > 0.5 * (angularDiamSun + angularDiamMoon))
    {
        // Moon is entirely outside the Sun.
        if (signed)
        {
            return {mag : ((-angularDistance + 0.5 * (angularDiamSun + angularDiamMoon))
                    / angularDiamSun), inUmbra : false};
        }
        return {mag : 0.0, inUmbra : false};
    }
    else 
    {
        // Moon boundary intersects Sun boundary.
        const moonDiamOut = angularDistance + 0.5 * (angularDiamMoon - angularDiamSun);
        const moonDiamIn = angularDiamMoon - moonDiamOut;

        return {mag : moonDiamIn / angularDiamSun, inUmbra : false};
    }
}

export function computeOsvSunEfi(JTtdb, nutParams)
{
    const lightTimeJT = 1.495978707e8 / (3e5 * 86400.0);
    // Position of the Earth in the Heliocentric Ecliptic frame:
    const osvEarth = vsop87('earth', JTtdb - lightTimeJT);
    // Position of the Sun in the Geocentric Ecliptic frame.
    osvEarth.JT = JTtdb;
    const osvSunEcl = {
        r : vecMul(osvEarth.r, -1), 
        v : vecMul(osvEarth.v, -1), 
        JT : osvEarth.JT
    };

    // Transform the positions of the Sun and the Moon to the EFI frame:
    const osvSunJ2000 = coordEclEq(osvSunEcl);
    osvSunJ2000.r = aberrationStellarCart(JTtdb, osvSunJ2000.r);

    const osvSunMod = coordJ2000Mod(osvSunJ2000);
    const osvSunTod = coordModTod(osvSunMod, nutParams);
    osvSunTod.JT = correlationTdbUt1(osvSunTod.JT);
    const osvSunPef = coordTodPef(osvSunTod);
    const osvSunEfi = coordPefEfi(osvSunPef, 0, 0);

    return osvSunEfi;
}

export function computeOsvMoonEfi(JTtdb)
{
    // Position of the Moon in the ToD frame.
    //let moonPosToD = moonPositionTod(JTtdb);

    //const JTut1 = correlationTdbUt1(JTtdb);
    //const osvMoonPef = coordTodPef({r : moonPosToD, v : [0, 0, 0], JT : JTut1});
    //const osvMoonEfi = coordPefEfi(osvMoonPef, 0, 0);

    const moonPosEq = elp2000(JTtdb);
    const moonPosJ2000 = coordEclEq({r : moonPosEq, v : [0, 0, 0], JT : JTtdb});
    const osvMoonMod2 = coordJ2000Mod({r : moonPosJ2000.r, v : [0, 0, 0], JT : JTtdb});
    const osvMoonTod2 = coordModTod(osvMoonMod2);
    osvMoonTod2.JT = correlationTdbUt1(osvMoonTod2.JT);
    const osvMoonPef2 = coordTodPef(osvMoonTod2);
    const osvMoonEfi2 = coordPefEfi(osvMoonPef2, 0, 0);
    //console.log(osvMoonEfi2.r + " " + osvMoonEfi.r);

    return osvMoonEfi2;
}

/**
 * Compute maximum values of the eclipse magnitude.
 * 
 * @param {*} JTstart 
 *      Start Julian Time.
 * @param {*} JTend 
 *      End Julian Time.
 * @param {*} JTstep 
 *      Step in Julian Time.
 * @param {*} lonStart 
 *      Longitude start (deg).
 * @param {*} lonEnd 
 *      Longitude end (deg).
 * @param {*} latStart
 *      Latitude start (deg). 
 * @param {*} latEnd 
 *      Latitude end (deg).
 * @param {*} lonLatStep 
 *      Latitude/Longitude step (deg).
 * @returns Grid of maximum magnitudes.
 */
export function eclipseMagGrid(JTstart, JTend, JTstep, lonStart, lonEnd, latStart, latEnd, lonLatStep)
{
    // Handle cases where the grid intersects the zero-degree boundary.
    if (lonStart > lonEnd)
    {
        lonEnd += 360;
    }
    if (latStart > latEnd)
    {
        latEnd += 360;
    }

    // Number of longitude and latitude steps.
    const numLon = Math.floor((lonEnd - lonStart) / lonLatStep) + 1;
    const numLat = Math.floor((latEnd - latStart) / lonLatStep) + 1;

    // Compute nutation parameters at the center of the time range.
    const JTnutation = 0.5 * (JTstart + JTend);
    const T = (JTnutation - 2451545.0) / 36525.0;
    const nutParams = nutationTerms(T);

    // Initialize the array.
    const magArray = [];
    const inUmbraArray = [];
    for (let indLat = 0; indLat < numLat; indLat++)
    {
        magArray[indLat] = [];
        inUmbraArray[indLat] = [];

        for (let indLon = 0; indLon < numLon; indLon++)
        {
            magArray[indLat][indLon] = -Infinity;
            inUmbraArray[indLat][indLon] = 0.0;
        }
    }

    const lightTimeJT = 1.495978707e8 / (3e5 * 86400.0);

    let latMax = -91;
    let lonMax = -181;
    let latMin = 91;
    let lonMin = 181;
    let JTmin = 1e9;
    let JTmax = 0;

    // Compute the grid values:
    for (let JT = JTstart; JT <= JTend; JT += JTstep)
    {
        const osvSunEfi = computeOsvSunEfi(JT, nutParams);
        const osvMoonEfi = computeOsvMoonEfi(JT);

        // Compute value for each point of the grid:
        for (let indLat = 0; indLat < numLat; indLat++)
        {
            const lat = latStart + indLat * lonLatStep;

            for (let indLon = 0; indLon < numLon; indLon++)
            {
                const lon = lonStart + indLon * lonLatStep;

                const osvMoonEnu = coordEfiEnu(osvMoonEfi, lat, lon, 0);
                const osvSunEnu = coordEfiEnu(osvSunEfi, lat, lon, 0);

                const {mag, inUmbra} = eclipseMagnitude(osvSunEnu.r, osvMoonEnu.r, false);
                
                magArray[indLat][indLon] = Math.max(magArray[indLat][indLon], mag);

                if (inUmbra)
                {
                    inUmbraArray[indLat][indLon] = 1.0;
                }

                if (mag > 0)
                {
                    JTmax = Math.max(JTmax, JT);
                    JTmin = Math.min(JTmin, JT);
                }
            }
        }
    }

    // Compute value for each point of the grid:
    for (let indLat = 0; indLat < numLat; indLat++)
    {
        const lat = latStart + indLat * lonLatStep;

        for (let indLon = 0; indLon < numLon; indLon++)
        {
            const lon = lonStart + indLon * lonLatStep;

            if (magArray[indLat][indLon] > 0)
            {
                latMin = Math.min(latMin, lat);
                latMax = Math.max(latMax, lat);
                lonMin = Math.min(lonMin, lon);
                lonMax = Math.max(lonMax, lon);
            }
        }
    }

    return {magArray : magArray, 
            inUmbraArray : inUmbraArray,
            latMin : latMin, 
            latMax : latMax, 
            lonMin : lonMin, 
            lonMax : lonMax,
            JTmax : JTmax, 
            JTmin : JTmin};
}

export function createContours(lonStart, lonEnd, latStart, latEnd, lonLatStep, gridArray, values, values_skip)
{
    // Handle cases where the grid intersects the zero-degree boundary.
    if (lonStart > lonEnd)
    {
        lonEnd += 360;
    }
    if (latStart > latEnd)
    {
        latEnd += 360;
    }

    // Number of longitude and latitude steps.
    const numLon = Math.floor((lonEnd - lonStart) / lonLatStep) + 1;
    const numLat = Math.floor((latEnd - latStart) / lonLatStep) + 1;

    const contours = [];

    // Note that it is assumed here that the first and last values w.r.t. 
    // longitude and latitude are equal in the case that the values go 
    // through the entire 360/180 range.

    for (let indValue = 0; indValue < values.length; indValue++)
    {
        contours[values[indValue]] = [];
    }

    // Compute value for each point of the grid:
    for (let indLat = 0; indLat < numLat - 1; indLat++)
    {
        const lat = latStart + indLat * lonLatStep;

        for (let indLon = 0; indLon < numLon - 1; indLon++)
        {
            const lon = lonStart + indLon * lonLatStep;

            const value_00 = gridArray[indLat][indLon]; 
            const value_01 = gridArray[indLat][indLon + 1]; 
            const value_11 = gridArray[indLat + 1][indLon + 1]; 
            const value_10 = gridArray[indLat + 1][indLon];

            const latTop = lat + lonLatStep;
            const lonRight = lon + lonLatStep;

            for (let indValue = 0; indValue < values.length; indValue++)
            {
                const value = values[indValue];

                // latTop 10 -------- 11
                //         |          |
                //         |          |
                // lat -- 00 -------- 01
                //        lon       lonRight
                // Values at the corners of the rectangle.

                const grid_00 = value_00 - value;
                const grid_01 = value_01 - value;
                const grid_11 = value_11 - value;
                const grid_10 = value_10 - value;

                const points = [];
                if (Math.sign(grid_00) != Math.sign(grid_01) && 
                   !values_skip.includes(value_00) && 
                   !values_skip.includes(value_01))
                {
                    // Value intersects the top line.
                    // grid_00 + lonDelta * (grid_01 - grid_00) / lonStep = 0
                    // => -grid_00 * lonStep = lonDelta * (grid_01 - grid_00)
                    // lonDelta = -grid_00 * lonStep / (grid_01 - grid_00)
                    const lonZero = lon - grid_00 * lonLatStep / (grid_01 - grid_00);

                    points.push([lat, lonZero]);
                }
                if (Math.sign(grid_00) != Math.sign(grid_10) && 
                   !values_skip.includes(value_00) && 
                   !values_skip.includes(value_10))
                {
                    const latZero = lat - grid_00 * lonLatStep / (grid_10 - grid_00);
                    points.push([latZero, lon]);
                }
                if (Math.sign(grid_10) != Math.sign(grid_11) && 
                   !values_skip.includes(value_10) && 
                   !values_skip.includes(value_11))
                {
                    const lonZero = lon - grid_10 * lonLatStep / (grid_11 - grid_10);
                    points.push([latTop, lonZero]);
                }
                if (Math.sign(grid_01) != Math.sign(grid_11) && 
                   !values_skip.includes(value_01) && 
                   !values_skip.includes(value_11))
                {
                    const latZero = lat - grid_01 * lonLatStep / (grid_11 - grid_01);
                    points.push([latZero, lonRight]);
                }

                if (points.length == 2)
                {
                    contours[value].push(points);
                }
            }
        }
    }

    return contours;
}


/**
 * Compute time derivative of the eclipse magnitude on a grid.
 * 
 * @param {*} JT
 *      Julian Time.
 * @param {*} lonStart 
 *      Longitude start (deg).
 * @param {*} lonEnd 
 *      Longitude end (deg).
 * @param {*} latStart
 *      Latitude start (deg). 
 * @param {*} latEnd 
 *      Latitude end (deg).
 * @param {*} lonLatStep 
 *      Latitude/Longitude step (deg).
 * @returns Grid of maximum magnitudes.
 */
export function eclipseMagDerGrid(JT, lonStart, lonEnd, latStart, latEnd, lonLatStep)
{
    // Handle cases where the grid intersects the zero-degree boundary.
    if (lonStart > lonEnd)
    {
        lonEnd += 360;
    }
    if (latStart > latEnd)
    {
        latEnd += 360;
    }
 
    // Number of longitude and latitude steps.
    const numLon = Math.floor((lonEnd - lonStart) / lonLatStep) + 1;
    const numLat = Math.floor((latEnd - latStart) / lonLatStep) + 1;

    // Compute nutation parameters at the center of the time range.
    const T = (JT - 2451545.0) / 36525.0;
    const nutParams = nutationTerms(T);

    // Initialize the array.
    const magDerArray = [];
    for (let indLat = 0; indLat < numLat; indLat++)
    {
        magDerArray[indLat] = [];

        for (let indLon = 0; indLon < numLon; indLon++)
        {
            magDerArray[indLat][indLon] = 0.0;
        }
    }

    const lightTimeJT = 1.495978707e8 / (3e5 * 86400.0);

    // Use 1 minute timestep in evaluation of the time derivative.
    const JTdelta = 1.0/1440.0;

    const osvSunEfiMinus = computeOsvSunEfi(JT - JTdelta, nutParams);
    const osvMoonEfiMinus = computeOsvMoonEfi(JT - JTdelta);
    const osvSunEfiPlus = computeOsvSunEfi(JT + JTdelta, nutParams);
    const osvMoonEfiPlus = computeOsvMoonEfi(JT + JTdelta);

    // Compute value for each point of the grid:
    for (let indLat = 0; indLat < numLat; indLat++)
    {
        const lat = latStart + indLat * lonLatStep;

        for (let indLon = 0; indLon < numLon; indLon++)
        {
            const lon = lonStart + indLon * lonLatStep;

            const osvMoonEnuMinus = coordEfiEnu(osvMoonEfiMinus, lat, lon, 0);
            const osvSunEnuMinus = coordEfiEnu(osvSunEfiMinus, lat, lon, 0);
            const osvMoonEnuPlus = coordEfiEnu(osvMoonEfiPlus, lat, lon, 0);
            const osvSunEnuPlus = coordEfiEnu(osvSunEfiPlus, lat, lon, 0);

            const magMinus = eclipseMagnitude(osvSunEnuMinus.r, osvMoonEnuMinus.r, true).mag;
            const magPlus = eclipseMagnitude(osvSunEnuPlus.r, osvMoonEnuPlus.r, true).mag;

            if (magPlus > 0.0 && magMinus > 0.0)
            {
                magDerArray[indLat][indLon] = (magPlus - magMinus) / (2.0 * JTdelta);
            }
            else 
            {
                magDerArray[indLat][indLon] = 100.0;
            }
        }
    }
  
    return magDerArray;
}
 

/**
 * Compute curves for the North-South limits of the umbra and penumbra.
 * 
 * @param {*} bessel 
 *      Besselian elements with derivatives.
 */
export function besselianLimits(bessel)
{
    // Equation (11.77) with _1 and _2 corresponding to penumbra and umbra, respectively.
    //console.log(bessel);
    const a_dot_1 = - bessel.l1_dot 
                    - bessel.mu_dot * bessel.x * cosd(bessel.d) * bessel.tan_f1
                    + bessel.y * bessel.d_dot * bessel.tan_f1;
    const a_dot_2 = - bessel.l2_dot 
                    - bessel.mu_dot * bessel.x * cosd(bessel.d) * bessel.tan_f2
                    + bessel.y * bessel.d_dot * bessel.tan_f2;
    const b_dot_1 = - bessel.y_dot
                    + bessel.mu_dot * bessel.x * sind(bessel.d)
                    + bessel.l1 * bessel.d_dot * bessel.tan_f1;
    const b_dot_2 = - bessel.y_dot
                    + bessel.mu_dot * bessel.x * sind(bessel.d)
                    + bessel.l2 * bessel.d_dot * bessel.tan_f2;
    const c_dot_1 =   bessel.x_dot
                    + bessel.mu_dot * bessel.y * sind(bessel.d)
                    + bessel.l1 * bessel.mu_dot * bessel.tan_f1 * cosd(bessel.d);
    const c_dot_2 =   bessel.x_dot
                    + bessel.mu_dot * bessel.y * sind(bessel.d)
                    + bessel.l2 * bessel.mu_dot * bessel.tan_f2 * cosd(bessel.d);

    // Semi-major axis of the Earth ellipsoid.
    const a = 6378137;
    // Semi-minor axis of the Earth ellipsoid.
    const b = 6356752.3142;
    // Square of ellipticity (not flattening).
    const el2 = 1 - b*b/(a*a);
    const rho1 = Math.sqrt(1 - el2 * bessel.cos_d * bessel.cos_d);
    const rho2 = Math.sqrt(1 - el2 * bessel.cos_d * bessel.sin_d);
    const sin_d1 = bessel.sin_d / rho1;
    const cos_d1 = Math.sqrt(1 - el2) * bessel.cos_d / rho1;
    const sin_d1d2 = el2 * bessel.sin_d * bessel.cos_d / (rho1 * rho2);
    const cos_d1d2 = Math.sqrt(1 - el2) / (rho1 * rho2);

    function compute_zeta(Q, l, zeta_old, tan_f, x, y)
    {
        const L = l - zeta_old * tan_f;
        const xi = x - L * sind(Q);
        const eta1 = (y - L * cosd(Q))/rho1; 
        const zeta1 = Math.sqrt(1 - xi*xi - eta1*eta1);
       // console.log(1 - xi*xi - eta1*eta1);

        //console.log(L + " " + xi + " " + eta1 + " " + zeta1);

        let zeta = rho2 * (zeta1 * cos_d1d2 - eta1 * sin_d1d2);
        if (isNaN(zeta))
        {
            zeta = 0;
        }
        return zeta;
    }

    function err(Q, zeta)
    {
        const L = bessel.l1 - zeta * bessel.tan_f1;

        const eta1 = (bessel.y - L * cosd(Q))/rho1;
        const zeta1 = (zeta / rho2 + eta1 * sin_d1d2) / cos_d1d2;
        const rho = [bessel.x - L * sind(Q), 
                     eta1, 
                     zeta1];
        return Math.abs(1 - norm(rho));
    }

    let zeta_1 = 0;
    let zeta_2 = 0;
    let Q_1 = 0;
    let Q_2 = 0;

    for (let indIter = 0; indIter < 20; indIter++)
    {    
        const roots = limitsIteration(a_dot_1, b_dot_1, c_dot_1, 
            bessel.d, bessel.d_dot, bessel.mu_dot, bessel.tan_f1, zeta_1);
        const roots2 = limitsIteration(a_dot_1, b_dot_1, c_dot_1, 
            bessel.d, bessel.d_dot, bessel.mu_dot, bessel.tan_f1, zeta_2);

        zeta_1 = compute_zeta(roots[0], bessel.l1, zeta_1, bessel.tan_f1, bessel.x, bessel.y);
        zeta_2 = compute_zeta(roots2[1], bessel.l1, zeta_2, bessel.tan_f1, bessel.x, bessel.y);

        //console.log(zeta_2);
        // console.log("ERR" + err(roots[0], zeta_11) + " " +err(roots[1], zeta_12) + " " 
        // + err(roots2[0], zeta_21) + " " + err(roots2[1], zeta_22));
        Q_1 = roots[0];
        Q_2 = roots2[1];

        const err_1 = a_dot_1 - b_dot_1 * cosd(Q_1) + c_dot_1 * sind(Q_1)
                    + zeta_1 * (1 + Math.pow(bessel.tan_f1, 2)) 
                    * (bessel.d_dot * cosd(Q_1) - bessel.mu_dot * cosd(bessel.d) * sind(Q_1));
        const err_2 = a_dot_1 - b_dot_1 * cosd(Q_2) + c_dot_1 * sind(Q_2)
                    + zeta_2 * (1 + Math.pow(bessel.tan_f1, 2)) 
                    * (bessel.d_dot * cosd(Q_2) - bessel.mu_dot * cosd(bessel.d) * sind(Q_2));

        //console.log(roots);
        //console.log("ERROR" + roots + " " + zeta_1 + " " + zeta_2 + " " + err_1 + " " + err_2);
    }
    const L_1 = bessel.l1 - zeta_1 * bessel.tan_f1;
    const L_2 = bessel.l1 - zeta_2 * bessel.tan_f1;
    
    const rho_1 = [bessel.x - L_1 * sind(Q_1), 
                   bessel.y - L_1 * cosd(Q_1), 
                   zeta_1];
    const rho_2 = [bessel.x - L_2 * sind(Q_2), 
                   bessel.y - L_2 * cosd(Q_2), 
                   zeta_2];
          
    return {rho_1 : rho_1, rho_2 : rho_2};
}