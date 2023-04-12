import {norm, vecDiff, vecMul, acosd, asind, sind, cosd, dot, atand, atan2d} from "./MathUtils.js";
import { rotateCart1d, rotateCart2d, rotateCart3d } from "./Rotations.js";
import { keplerSolve } from "./Kepler.js";
import { coordPerIne } from "./Frames.js";

export const planetData = {
    mercury : {
        diameter    : 4879400,
        polarRadius : 2439700,
        eqRadius    : 2439700,
        mass        : 3.285e23
    },
    venus : {
        diameter    : 12104000,
        polarRadius : 6051800,
        eqRadius    : 6051800,
        mass        : 4.867e24
    },
    earth : {
        diameter    : 12742000,
        polarRadius : 6356752,
        eqRadius    : 6378137,
        mass        : 5.972e24
    },
    mars : {
        diameter    : 6779000,
        polarRadius : 3376200,
        eqRadius    : 3396200,
        mass        : 6.39e23
    },
    jupiter : {
        diameter    : 139820000,
        polarRadius : 66854000,
        eqRadius    : 71492000,
        mass        : 1.898e27
    },
    saturn : {
        diameter    : 116460000,
        polarRadius : 54364000,
        eqRadius    : 60268000,
        mass        : 5.683e26
    },
    uranus : {
        diameter    : 50724000,
        polarRadius : 24973000,
        eqRadius    : 25559000,
        mass        : 8.681e25
    },
    neptune : {
        diameter    : 49244000,
        polarRadius : 24341000,
        eqRadius    : 24764000,
        mass        : 1.024e26
    },
    sun : {
        diameter : 1.3927e9,
        mass : 1.989e30
    }
};

/**
 * Compute magnitude data for a planet including the illuminated fraction, 
 * magnitude and surface brightness.
 * 
 * @param {*} planetName 
 *      Name of the planet.
 * @param {*} posTargetEclHel
 *      Position of the planet in the Heliocentric Ecliptic frame. 
 * @param {*} posTargetEclGeo 
 *      Position of the planet in the Geocentric Ecliptic frame.
 * @returns Object with fields fracIlluminated, magnitude and surfaceBrightness.
 */
export function planetMagnitude(planetName, posTargetEclHel, posTargetEclGeo)
{
    const outputs = {};

    if (planetName === "sun")
    {
        outputs.fracIlluminated = 1.0;
        outputs.magnitude = -26.74;
        outputs.surfaceBrightness = NaN;
        return outputs;        
    }

    // To compute the phase
    const targetSunDist = norm(posTargetEclHel);
    const earthSunDist = norm(vecDiff(posTargetEclHel, posTargetEclGeo));
    // Approximation: ENU distance ~ geocentric distance.
    const targetEarthDist = norm(posTargetEclGeo);

    // Phase angle (in the range [0, 180]).
    const i = acosd(dot(posTargetEclHel, posTargetEclGeo) 
            / (targetSunDist * targetEarthDist));

    // Illuminated fraction:
    outputs.fracIlluminated = 0.5 * (1.0 + cosd(i));
    
    // Astronomical unit:
    const au = 1.495978707e11;
    const logTerm = 5 * Math.log10(targetSunDist * targetEarthDist / (au * au));

    // (10.6)
    const eqRadiusArcSec    = atand(planetData[planetName].eqRadius    / targetEarthDist) * 3600.0;
    const polarRadiusArcSec = atand(planetData[planetName].polarRadius / targetEarthDist) * 3600.0;
    outputs.apparentDisk = Math.PI * eqRadiusArcSec * polarRadiusArcSec;

    // Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 3rd edition, 2012
    // Table 10.6 and equation (10.4):

    if (planetName === "mercury")
    {
        const V10 = -0.6;
        const dmi = 0.0498 * i - 0.000488 * i * i + 3.02e-6 * i * i * i;

        outputs.magnitude = V10 + logTerm + dmi;
    }
    else if (planetName === "venus")
    {
        // The following does not seem accurate.
        if (i < 163.6)
        {
            const V10 = -5.18;
            const dmi = 0.0103 * i + 0.000057 * i * i + 0.13e-6 * i * i * i;
            outputs.magnitude = V10 + logTerm + dmi;
        }
        else 
        {
            const V10 = 0.17;
            const dmi = -0.0096 * i;
            outputs.magnitude = V10 + logTerm + dmi;
        }
    }
    else if (planetName === "mars")
    {
        const V10 = -1.52;
        const dmi = 0.016 * i;
        outputs.magnitude = V10 + logTerm + dmi;
    }
    else if (planetName === "jupiter")
    {
        const V10 = -9.40;
        const dmi = 0.005 * i;
        outputs.magnitude = V10 + logTerm + dmi;
    }
    else if (planetName === "saturn")
    {
        const V10 = -8.88;
        const dmi = 0.044 * i;
        outputs.magnitude = V10 + logTerm + dmi;
    }
    else if (planetName === "uranus")
    {
        const V10 = -7.19;
        const dmi = 0.0028 * i;
        outputs.magnitude = V10 + logTerm + dmi;
    }
    else if (planetName === "neptune")
    {
        const V10 = -6.87;
        const dmi = 0.041 * i;
        outputs.magnitude = V10 + logTerm + dmi;
    }

    outputs.surfaceBrightness = outputs.magnitude 
        + 2.5 * Math.log10(outputs.fracIlluminated * outputs.apparentDisk);

    return outputs;
}

/**
 * Compute approximate rotational parameters of a planet. This code
 * is based on Table 10.1 of:
 * Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 
 * 3rd edition, 2012.
 * 
 * @param {*} planetName
 *      Name of the planet. 
 * @param {*} JTut1 
 *      Julian time (UT1).
 * @returns Object with fields alpha_0, delta_0 and W.
 */
export function planetRotationParams(planetName, JTut1)
{
    // Julian centuries after J2000.0 epoch.
    const T = (JTut1 - 2451545.0) / 36525.0;
    // Days after J2000.0 epoch.
    const t = JTut1 - 2451545.0;

    // The CCW position of the (rising) node (intersection BCRS and planet equators) 
    // along the BCRS plane minus 90 degrees.
    let alpha_0 = 0;
    // 90 - delta_0 is the CW rotation of the planet equator w.r.t. BCRS equator.
    let delta_0 = 0;
    // CCW rotation of the prime meridian w.r.t. the node.
    let W = 0;

    if (planetName === "mercury")
    {
        const M1 = 174.791086 +  4.092335 * t;
        const M2 = 349.582171 +  8.184670 * t;
        const M3 = 164.373257 + 12.277005 * t; 
        const M4 = 339.164343 + 16.369340 * t;
        const M5 = 153.955429 + 20.461675 * t;

        alpha_0 = 281.0097 - 0.0328 * T;
        delta_0 =  61.4143 - 0.0049 * T;
        W = 329.5469 + 6.1385205 * t 
          + 0.00993822 * sind(M1)
          - 0.00104581 * sind(M2)
          - 0.00010280 * sind(M3)
          - 0.00002364 * sind(M4)
          - 0.00000532 * sind(M5);
    }
    else if (planetName === "venus")
    {
        alpha_0 = 272.76;
        delta_0 = 67.16;
        W = 160.20 - 1.4813688 * t;
    }
    else if (planetName === "earth")
    {
        alpha_0 = 0.00 - 0.641 * T;
        delta_0 = 90.00 - 0.557 * T;
        W = 190.147 + 360.9856235 * t;
    }
    else if (planetName === "mars")
    {
        alpha_0 = 317.68143 - 0.1061 * T;
        delta_0 =  52.88650 - 0.0609 * T;
        W = 176.630 + 350.89198226 * t;
    }
    else if (planetName === "jupiter")
    {
        const J1 =  99.360714 + 4850.4046 * T;
        const J2 = 175.895369 + 1191.9605 * T;
        const J3 = 300.323162 +  262.5475 * T;
        const J4 = 114.012305 + 6070.2476 * T;
        const J5 =  49.511251 +   64.3000 * T;

        alpha_0 = 268.056595 - 0.006499 * T
                + 0.000117 * sind(J1)
                + 0.000938 * sind(J2)
                + 0.001432 * sind(J3)
                + 0.000030 * sind(J4)
                + 0.002150 * sind(J5);
        delta_0 = 64.495303 + 0.002413 * T 
                + 0.000050 * cosd(J1)
                + 0.000404 * cosd(J2)
                + 0.000617 * cosd(J3)
                - 0.000013 * cosd(J4)
                + 0.000926 * cosd(J5);
        // The linear term seems suspicious but seems to be used elsewhere.
        W = 284.95 + 870.536 * t;
    }
    else if (planetName === "saturn")
    {
        alpha_0 = 40.589 - 0.036 * T;
        delta_0 = 83.537 - 0.004 * T;
        W = 38.90 + 810.7939024 * t;
    }
    else if (planetName === "uranus")
    {
        alpha_0 = 257.311;
        delta_0 = -15.175;
        W = 203.81 - 501.1600928 * t;
    }
    else if (planetName === "neptune")
    {
        const N = 357.85 + 52.316 * T;
        alpha_0 = 299.36 + 0.70 * sind(N);
        delta_0 = 43.46 - 0.51 * cosd(N);
        W = 253.18 + 536.3128492 * t - 0.48 *sind(N);
    }

    return {alpha_0 : alpha_0, delta_0 : delta_0, W : W};
}

/**
 * Convert OSV from Planet-fixed to BCRS frame-
 * 
 * @param {*} osv 
 *     OSV in Planet-fixed frame.
 * @param {*} rotParams 
 * @returns 
 */
export function coordFixedBCRS(osv, rotParams)
{
    const rBCRS = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.r, -rotParams.W), rotParams.delta_0 - 90), -rotParams.alpha_0 - 90);
    // TODO: This is incorrect.
    const vBCRS = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.v, -rotParams.W), rotParams.delta_0 - 90), -rotParams.alpha_0 - 90);

    return {r : rBCRS, v : vBCRS, JT : osv.JT};
}

/**
 * Convert OSV from BCRS to Planet-fixed frame.
 * 
 * @param {*} osv 
 *      OSV in BCRS frame.
 * @param {*} rotParams 
 *      Rotational parameters alpha_0, delta_0 and W in degrees.
 * @returns OSV in planet-fixed frame.
 */
export function coordBCRSFixed(osv, rotParams)
{
    const rECEF = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.r, rotParams.alpha_0 + 90), 90 - rotParams.delta_0), rotParams.W);
    // TODO: This is incorrect.
    const vECEF = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.v, rotParams.alpha_0 + 90), 90 - rotParams.delta_0), rotParams.W);
    
    return {r : rECEF, v : vECEF, JT : osv.JT};
}

/**
 * Convert OSV from B1950.0 frame to the J2000.0 frame.
 * 
 * @param {*} osv 
 *      Orbit state vector in B1950.0 frame.
 * @returns Orbit state vector in J2000.0 frame.
 */
export function coordB1950J2000(osv)
{
    // Murray - The transformation of coordinates between the systems of B1950.0
    // and J2000.0, and the principal galactic axes referred to J2000.0.
    // Equation (25):

    // This is probably somewhat incorrectly applied.
    const rJ2000x = 0.9999256794956877 * osv.r[0] 
                  - 0.0111814832204662 * osv.r[1]
                  - 0.0048590038153592 * osv.r[2];
    const rJ2000y = 0.0111814832391717 * osv.r[0] 
                  + 0.9999374848933135 * osv.r[1]
                  - 0.0000271625947142 * osv.r[2];
    const rJ2000z = 0.0048590037723143 * osv.r[0] 
                  - 0.0000271702937440 * osv.r[1]
                  + 0.9999881946023742 * osv.r[2];

    return {r : [rJ2000x, rJ2000y, rJ2000z], v : [0, 0, 0], JT : osv.JT};
}

function computeKeplerian(kepler)
{
    // (9.17)/(9.50) : Note that the mean anomaly is independent of the plane
    // since it is determined by the angle w.r.t. perihelion.
    kepler.M = kepler.L - kepler.P;

    // (9.18) : Solve Kepler's equation with NR iteration.
    kepler.E = keplerSolve(kepler.M, kepler.e, 1e-6, 20);

    // (9.19) : Solve coordinates on the orbital plane (Perifocal coordinates).
    const rPer = [kepler.a * (cosd(kepler.E) - kepler.e),
                  kepler.a * Math.sqrt(1 - kepler.e * kepler.e) * sind(kepler.E),
                  0];
    const N = kepler.Na + atan2d(sind(kepler.gamma) * sind(kepler.theta), 
              cosd(kepler.gamma) * sind(kepler.Ja) 
            + sind(kepler.gamma) * cosd(kepler.Ja) * cosd(kepler.theta));
    const J = asind(sind(kepler.gamma) * sind(kepler.theta) / sind(N - kepler.Na));

    const EC = atan2d(sind(kepler.Ja)*sind(kepler.theta), 
                      cosd(kepler.Ja)*sind(kepler.gamma) 
                    + sind(kepler.Ja)*cosd(kepler.gamma)*cosd(kepler.theta));
    const CD = kepler.P - kepler.Na - kepler.theta;

    /*console.log(kepler);
    console.log(rPer);
    console.log(N);
    console.log(J);
    console.log(EC);
    console.log(CD);
   */ 
    const rBCRS = rotateCart3d(rotateCart1d(rotateCart3d(rPer, -EC-CD), -J), -N);
    const au = 1.495978707e11;

    return vecMul(rBCRS, au);
}

/**
 * Compute positions of the moons of Mars. 
 * This method is based on the section 9.7 of 
 * Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 3rd edition, 2012.
 * 
 * @param {*} JTtdb 
 *      Julian time (TDB).
 * @returns BCRS Mars-centric position.
 *          
 */
export function marsSatellites(JTtdb)
{
    const phobos = {};
    const deimos = {};

    // Number of days after 1971-11-11 00:00:00.
    const d = JTtdb - 2441266.5;
    // Fractional years of days after 1971-11-11 00:00:00.
    const y = d / 365.25;

    // Semi-major axis (au).
    phobos.a = 6.26974e-5;
    deimos.a = 1.56828e-4;
    // Mean motion (degrees/day).
    phobos.n = 1128.844556;
    deimos.n = 285.161888;
    // Eccentricity
    phobos.e = 0.0150;
    deimos.e = 0.0004;
    // Inclination (Laplacian plane, degrees).
    phobos.gamma = 1.10;
    deimos.gamma = 1.79;
    // Longitude of the ascending node (Laplacian plane, degrees).
    phobos.theta = 327.90 - 0.43533 * d;
    deimos.theta = 240.38 - 0.01801 * d;

    const h = 196.55 - 0.01801 * d;
    // Mean longitude (Laplacian plane, degrees).
    phobos.L = 232.41 + phobos.n*d + 0.00124 * y*y;
    deimos.L = 28.96 + deimos.n*d - 0.27 * sind(h);
    // Longitude of the Pericenter (Laplacian plane, degrees).
    phobos.P = 278.96 + 0.43526 * d;
    deimos.P = 111.7 + 0.01798 * d;
    // Longitude of the ascending node of the Laplacian plane (Earth equator, degrees).
    phobos.Na = 47.39 - 0.0014 * y;
    deimos.Na = 46.37 - 0.0014 * y;
    // Inclination of the Laplacian plane (Earth equator, degrees).
    phobos.Ja = 37.27 + 0.0008 * y;
    deimos.Ja = 36.62 + 0.0008 * y;

    const rPhobos = computeKeplerian(phobos);
    const rDeimos = computeKeplerian(deimos);

    return {phobos : rPhobos, deimos : rDeimos};
}

function jupiterSatellite(satelliteName, JTtdb)
{

}