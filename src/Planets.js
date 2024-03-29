import {norm, vecDiff, vecMul, acosd, asind, sind, cosd, tand, dot, atand, atan2d, deg2Rad, rad2Deg} from "./MathUtils.js";
import { rotateCart1d, rotateCart2d, rotateCart3d } from "./Rotations.js";
import { keplerSolve, keplerPerifocal } from "./Kepler.js";
import { coordEqEcl } from "./Frames.js";

export const planetData = {
    mercury : {
        diameter    : 4879400,
        polarRadius : 2439700,
        eqRadius    : 2439700,
        mass        : 3.285e23,
        mu          : 2.2032e13
    },
    venus : {
        diameter    : 12104000,
        polarRadius : 6051800,
        eqRadius    : 6051800,
        mass        : 4.867e24,
        mu          : 3.24859e14
    },
    earth : {
        diameter    : 12742000,
        polarRadius : 6356752,
        eqRadius    : 6378137,
        mass        : 5.972e24,
        mu          : 3.986004418e14
    },
    mars : {
        diameter    : 6779000,
        polarRadius : 3376200,
        eqRadius    : 3396200,
        mass        : 6.39e23,
        mu          : 4.282837e13
    },
    jupiter : {
        diameter    : 139820000,
        polarRadius : 66854000,
        eqRadius    : 71492000,
        mass        : 1.898e27,
        mu          : 1.26686534e17
    },
    saturn : {
        diameter    : 116460000,
        polarRadius : 54364000,
        eqRadius    : 60268000,
        mass        : 5.683e26,
        mu          : 3.7931187e16
    },
    uranus : {
        diameter    : 50724000,
        polarRadius : 24973000,
        eqRadius    : 25559000,
        mass        : 8.681e25,
        mu          : 5.793939e15
    },
    neptune : {
        diameter    : 49244000,
        polarRadius : 24341000,
        eqRadius    : 24764000,
        mass        : 1.024e26,
        mu          : 6.836529e15
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

    // TODO: This is inaccurate.
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
        
    // TODO: This is inaccurate.
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

    const vJ2000x = 0.9999256794956877 * osv.v[0] 
                  - 0.0111814832204662 * osv.v[1]
                  - 0.0048590038153592 * osv.v[2];
    const vJ2000y = 0.0111814832391717 * osv.v[0] 
                  + 0.9999374848933135 * osv.v[1]
                  - 0.0000271625947142 * osv.v[2];
    const vJ2000z = 0.0048590037723143 * osv.v[0] 
                  - 0.0000271702937440 * osv.v[1]
                  + 0.9999881946023742 * osv.v[2];

    return {r : [rJ2000x, rJ2000y, rJ2000z], v : [vJ2000x, vJ2000y, vJ2000z], JT : osv.JT};
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
    /**
     * Compute J2000 position w.r.t. center of Mars from Keplerian elements.
     * 
     * @param {*} kepler 
     *      Object with the Keplerian elements.
     * @returns Position vector.
     */
    function computeKeplerian(kepler)
    {
        // (9.17)/(9.50) : Note that the mean anomaly is independent of the plane
        // since it is determined by the angle w.r.t. perihelion.
        kepler.M = kepler.L - kepler.P;

        // (9.18) : Solve Kepler's equation with NR iteration.
        kepler.E = keplerSolve(kepler.M, kepler.e, 1e-6, 20);

        kepler.b = kepler.a * Math.sqrt(1 - kepler.e * kepler.e);
        const osvPer = keplerPerifocal(kepler.a, kepler.b, kepler.E, planetData['mars'].mu, JTtdb);


        // (9.19) : Solve coordinates on the orbital plane (Perifocal coordinates).
        //const rPer = [kepler.a * (cosd(kepler.E) - kepler.e),
        //            kepler.a * Math.sqrt(1 - kepler.e * kepler.e) * sind(kepler.E),
        //            0];
        const N = kepler.Na + atan2d(sind(kepler.gamma) * sind(kepler.theta), 
                cosd(kepler.gamma) * sind(kepler.Ja) 
                + sind(kepler.gamma) * cosd(kepler.Ja) * cosd(kepler.theta));
        const J = asind(sind(kepler.gamma) * sind(kepler.theta) / sind(N - kepler.Na));

        const EC = atan2d(sind(kepler.Ja)*sind(kepler.theta), 
                        cosd(kepler.Ja)*sind(kepler.gamma) 
                        + sind(kepler.Ja)*cosd(kepler.gamma)*cosd(kepler.theta));
        const CD = kepler.P - kepler.Na - kepler.theta;

        const rBCRS = rotateCart3d(rotateCart1d(rotateCart3d(osvPer.r, -EC-CD), -J), -N);
        // TBD: There might be some error from change in the Keplerian parameters.
        const vBCRS = rotateCart3d(rotateCart1d(rotateCart3d(osvPer.v, -EC-CD), -J), -N);

        return {r : rBCRS, v : vBCRS, JT : JTtdb};
    }


    const phobos = {};
    const deimos = {};

    // Number of days after 1971-11-11 00:00:00.
    const d = JTtdb - 2441266.5;
    // Fractional years of days after 1971-11-11 00:00:00.
    const y = d / 365.25;

    const au = 1.495978707e11;
    // Semi-major axis (m).
    phobos.a = 6.26974e-5 * au;
    deimos.a = 1.56828e-4 * au;
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

/**
 * Compute positions of the Galilean satellites of Jupiter in Jupiter-centric 
 * J2000 frame.
 * This method is based on the section 9.8 of 
 * Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 3rd edition, 2012.
 * 
 * @param {*} JTtdb 
 *      Julian time (TDB).
 * @returns Position vector for each satellite.
 */
export function jupiterSatellites(JTtdb)
{
    // (9.52)
    // fractional days after 1976-08-10 00:00:00.
    const t = JTtdb - 2443000.5;

    // Mean longitudes of satellites 1-4:
    const L_1 = 106.078590000 + 203.4889553630643 * t;
    const L_2 = 175.733787000 + 101.3747245566245 * t;
    const L_3 = 120.561385500 + 50.31760915340462 * t;
    const L_4 =  84.455823000 + 21.57107087517961 * t;

    const phi_l = 184.415351000 + 0.17356902 * t;
    // Proper periapses of satellites 1-4.
    const P_1 = 82.380231000 + 0.16102275 * t;
    const P_2 = 128.960393000 + 0.04645644 * t;
    const P_3 = 187.550171000 + 0.00712408 * t;
    const P_4 = 335.309254000 + 0.00183939 * t;
    const Pi_J = 13.470395000;

    // Proper nodes of satellites 1-4.
    const theta_1 = 308.365749000 - 0.13280610 * t;
    const theta_2 = 100.438938000 - 0.03261535 * t;
    const theta_3 = 118.908928000 - 0.00717678 * t;
    const theta_4 = 322.746564000 - 0.00176018 * t;
    
    // Longitude of the origin of the coordinates (Jupiter's pole).
    const Psi = 316.500101000 - 0.00000248 * t;
    // Mean anomalies of Saturn and Jupiter.
    const Gdot = 31.9785280244 + 0.033459733896 * t;
    const G = 30.2380210168 + 0.08309256178969453 * t;
    const phi_2 = 52.1445966929;


    // (9.51)
    const fac = 1e-7;
    const xi_1 = fac * (-41279 * cosd(2*L_1 - 2*L_2));
    const nu_1 = fac * (-5596 * sind(P_3 - P_4) - 2198 * sind(P_1 + P_3 - 2*Pi_J - 2*G)
               + 1321 * sind(phi_l) - 1157 * sind(L_1 - 2*L_2 + P_4)
               - 1940 * sind(L_1 - 2*L_2 + P_3) - 791 * sind(L_1 - 2*L_2 + P_2)
               + 791 * sind(L_1 - 2*L_2 - P_2) + 82363 * sind(2*L_1 - 2*L_2));
    const zeta_1 = fac * (7038 * sind(L_1 - theta_1) + 1835 * sind(L_1 - theta_2));
    
    const xi_2 = fac * (-3187 * cosd(L_2 - P_3) - 1738 * cosd(L_2 - P_4)
               + 93748 * cosd(L_1 - L_2));
    const nu_2 = fac * (-1158 * sind(-2*Pi_J + 2*Psi) + 1715 * sind(-2*Pi_J + theta_3 + Psi - 2*G)
               - 1846 * sind(G) + 2397 * sind(P_3 - P_4) - 3172 * sind(phi_l)
               - 1993 * sind(L_2 - L_3) + 1844 * sind(L_2 - P_2)
               + 6394 * sind(L_2 - P_3) + 3451 * sind(L_2 - P_4)
               + 4159 * sind(L_1 - 2*L_2 + P_4) + 7571 * sind(L_1 - 2*L_2 + P_3)
               - 1491 * sind(L_1 - 2*L_2 + P_2) - 185640 * sind(L_1 - L_2)
               - 803 * sind(L_1 - L_3) + 915 * sind(2*L_1 - 2*L_2));
    const zeta_2 = fac * (81575 * sind(L_2 - theta_2) + 4512 * sind(L_2 - theta_3)
                 - 3286 * sind(L_2 - Psi));
    
    const xi_3 = fac * (-14691 * cosd(L_3 - P_3) - 1758 * cosd(2*L_3 - 2*L_4)
               + 6333 * cosd(L_2 - L_3) - 7894 * sind(L_3 - P_4));
    const nu_3 = fac * (-1488 * sind(-2*Pi_J + 2*Psi) + 411 * sind(-theta_3 + Psi)
               + 346 * sind(-theta_4 + Psi) - 2338 * sind(G)
               + 6558 * sind(P_3 - P_4) + 523 * sind(P_1 + P_3 - 2*Pi_J - 2*G)
               + 314 * sind(phi_l) - 943 * sind(L_3 - L_4)
               + 29387 * sind(L_3 - P_3) + 15800 * sind(L_3 - P_4)
               + 3218 * sind(2*L_3 - 2*L_4) + 226 * sind(3*L_3 - 2*L_4)
               - 12038 * sind(L_2 - L_3) - 662 * sind(L_1 - 2*L_2 + P_4)
               - 1246 * sind(L_1 - 2*L_2 + P_3) + 699 * sind(L_1 - 2*L_2 + P_2)
               + 217 * sind(L_1 - L_3));
    const zeta_3 = fac * (-2793 * sind(L_3 - theta_2) + 32387 * sind(L_3 - theta_3)
               + 6871 * sind(L_3 - theta_4) - 16876 * sind(L_3 - Psi));
    
    const xi_4 = fac * (1656 * cosd(L_4 - P_3) - 73328 * cosd(L_4 - P_4)
               + 182 * cosd(L_4 - Pi_J) - 541 * cosd(L_4 + P_4 - 2*Pi_J - 2*G)
               - 269 * cosd(2*L_4 - 2*P_4) + 974 * cosd(L_3 - L_4));
    const nu_4 = fac * (-407 * sind(-2*P_4 + 2*Psi) + 309 * sind(-2*P_4 + theta_4 + Psi)
               - 4840 * sind(-2*Pi_J + 2*Psi) + 2074 * sind(-theta_4 + Psi)
               - 5605 * sind(G) - 204 * sind(2*G)
               - 495 * sind(5*Gdot - 2*G + phi_2) + 234 * sind(P_4 - Pi_J)
               - 6112 * sind(P_3 - P_4) - 3318 * sind(L_4 - P_3)
               + 146673 * sind(L_4 - P_4) + 178 * sind(L_4 - Pi_J - G)
               - 363 * sind(L_4 - Pi_J) + 1085 * sind(L_4 + P_4 - 2*Pi_J - 2*G)
               + 672 * sind(2*L_4 - 2*P_4) + 218 * sind(2*L_4 - 2*Pi_J - 2*G)
               + 167 * sind(2*L_4 - theta_4 - Psi) - 142 * sind(2*L_4 - 2*Psi)
               + 148 * sind(L_3 - 2*L_4 + P_4) - 390 * sind(L_3 - L_4)
               - 195 * sind(2*L_3 - 2*L_4) + 185 * sind(3*L_3 - 7*L_4 + 4*P_4));
    const zeta_4 = fac * (773 * sind(L_4 - 2*Pi_J + Psi - 2*G) - 5075 * sind(L_4 - theta_3)
                 + 44300 * sind(L_4 - theta_4) - 76493 * sind(L_4 - Psi));

    const au = 1.495978707e11;
    const a_1 = 0.002819347 * au;
    const a_2 = 0.004485872 * au;
    const a_3 = 0.007155352 * au;
    const a_4 = 0.012585436 * au;

    // Positions in moving Jovian frame (9.53):
    const r_1 = [a_1 * (1 + xi_1) * cosd(L_1 - Psi + nu_1),
                 a_1 * (1 + xi_1) * sind(L_1 - Psi + nu_1),
                 a_1 * zeta_1];
    const r_2 = [a_2 * (1 + xi_2) * cosd(L_2 - Psi + nu_2),
                 a_2 * (1 + xi_2) * sind(L_2 - Psi + nu_2),
                 a_2 * zeta_2];
    const r_3 = [a_3 * (1 + xi_3) * cosd(L_3 - Psi + nu_3),
                 a_3 * (1 + xi_3) * sind(L_3 - Psi + nu_3),
                 a_3 * zeta_3];
    const r_4 = [a_4 * (1 + xi_4) * cosd(L_4 - Psi + nu_4),
                 a_4 * (1 + xi_4) * sind(L_4 - Psi + nu_4),
                 a_4 * zeta_4];

    const eps = 23.44578888888889;
    const Omega = 99.99754;
    const J = 1.30691;
    const Phi = Psi - Omega;
    const I = 3.10401;

    function rotateToBcrs1950(r, eps, Omega, J, Phi, I)
    {
        return rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            rotateCart1d(r, -I), -Phi), -J), -Omega), -eps);
    }
    const rBcrs1950_1 = rotateToBcrs1950(r_1, eps, Omega, J, Phi, I);
    const rBcrs1950_2 = rotateToBcrs1950(r_2, eps, Omega, J, Phi, I);
    const rBcrs1950_3 = rotateToBcrs1950(r_3, eps, Omega, J, Phi, I);
    const rBcrs1950_4 = rotateToBcrs1950(r_4, eps, Omega, J, Phi, I);

    // TODO: The above computation method does not allow easy extraction of velocities unless 
    // we compute difference between two positions.
    const osvBcrsJ2000_1 = coordB1950J2000({r : rBcrs1950_1, v : [0, 0, 0], JT : JTtdb});
    const osvBcrsJ2000_2 = coordB1950J2000({r : rBcrs1950_2, v : [0, 0, 0], JT : JTtdb});
    const osvBcrsJ2000_3 = coordB1950J2000({r : rBcrs1950_3, v : [0, 0, 0], JT : JTtdb});
    const osvBcrsJ2000_4 = coordB1950J2000({r : rBcrs1950_4, v : [0, 0, 0], JT : JTtdb});

    return {io : osvBcrsJ2000_1, europa : osvBcrsJ2000_2, ganymede : osvBcrsJ2000_3, 
        callisto : osvBcrsJ2000_4};
}

/**
 * Compute positions of the major satellites of Saturn.
 * 
 * This method was originally based on the section 9.9 of 
 * Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 3rd edition, 2012.
 * Due to issues with implementation, the method was rewritten to be based on 
 * Harper, Taylor - The orbits of major satellites of Saturn, Astronomy and Astrophysics, 1993.
 * 
 * @param {*} JTtdb 
 *      Julian time (TDB).
 * @returns Object with OSV for each major satellite.
 */
export function saturnSatellites(JTtdb)
{
    // Longitude of ascending node in the orbit of Saturn w.r.t. B1950.0 ecliptic.
    const Omega_e = 168.8387;
    // Inclination of the orbit of Saturn w.r.t. B1950.0 ecliptic.
    const i_e = 28.0653;
    // Mimas - Tethys libration:
    const A_1 = -43.635;
    const x_13 = 0.09539;
    const nu_13 = 5.0866;
    const tau_0 = 1866.261;
    // Enceladus-Dione libration:
    const p_2 = 0.297;
    const p_4 = -0.0262;
    const mu_24 = 314.3;
    const nu_24 = 32.567;
    // Conversion factor from radians to degrees:
    const kappa = 57.29578;

    // Astronomical unit:
    const au = 1.495978707e11;
    // This is for J2000.0 epoch, which is probably inaccurate for B1950.0.
    const eps = 23.439279444444445;

    // Epoch (January 24 0h 1930 Ephemeris time)
    const JT0 = 2426000.5;

    // Table 2a, 2b:
    const mimas = {
        a_0  :  0.00124151,
        L_0  :  230.894,
        e_0  :  0.02014,
        P_0  :  266.73,
        gamma_0 : 1.585,
        N_0  :  272.85,
        n    :  381.9945087,
        Ndot : -365.063,
        Pdot :  365.532
    };
    const enceladus = {
        a_0  : 0.00159263,
        L_0  : 76.1250,
        e_0  : 0.004795,
        P_0  : 307.3348,
        gamma_0 : 0.016,
        N_0  : 310.0,
        n    : 262.73190058,
        Ndot : -151.43
    };
    const tethys = {
        a_0  : 0.00197195,
        L_0  : 194.4419,
        e_0  : 0.0001,
        P_0  : 56.0,
        gamma_0 : 1.0895,
        N_0  : 42.75,
        n    : 190.69791196,
        Ndot : -72.2351,
        Pdot : 70.03
    };
    const dione = {
        a_0  : 0.00252486,
        L_0  : 191.7299,
        e_0  : 0.002147,
        P_0  : 353.0,
        gamma_0 : 0.0126,
        N_0  : 38.0,
        n    : 131.53493186,
        Ndot : -30.30,
        Pdot : 30.887
    };
    const rhea = {
        a_0  : 0.00352559,
        lambda_0 : 338.6372,
        e_0  : 0.000172,
        pi_0 : 42.0,
        gamma_0 : 0.3472,
        N_0  : 294.00,
        n    : 79.69004687
    };
    const titan = {
        a_0  : 0.00817006,
        lambda_0 : 138.8328,
        e_0  : 0.028905,
        varpi_0 : 297.278,
        gamma_0 : 0.2949,
        N_0  : 19.56,
        n    : 22.57697682,
        varpi_dot : 0.51273
    };
    const iapetus = {
        a_0  : 0.02381170,
        lambda_0 : 216.99743,
        e_0  : 0.0288367,
        varpi_0 : 357.824,
        i_0  : 18.02066,
        Omega_0 : 141.475,
        n    : 4.53795165,
        Omega_dot : -3.7119,
        varpi_dot : 12.285
    };

    const d = JTtdb - JT0;
    const t = d / 365.25;
    const T = d / 36525.0;

    // (2)
    mimas.tau = 1950.0 + (JTtdb - 2433282.423) / 365.2422;
    mimas.psi = nu_13 * (mimas.tau - tau_0);

    mimas.deltaL = A_1 * sind(mimas.psi)
                 - 0.72 * sind(3.0 * mimas.psi)
                 - 0.02144 * sind(5.0 * mimas.psi);

    // (1) 
    mimas.a = au * mimas.a_0;
    mimas.lambda = (mimas.L_0 + mimas.n * d + mimas.deltaL) % 360.0;
    mimas.e = mimas.e_0;
    mimas.P = (mimas.P_0 + mimas.Pdot * t) % 360.0;
    mimas.gamma = mimas.gamma_0;
    mimas.N = (mimas.N_0 + mimas.Ndot * t) % 360.0;

    mimas.M = (mimas.lambda - mimas.P) % 360.0;
    mimas.E = keplerSolve(mimas.M, mimas.e, 1e-6, 20);

    mimas.b = mimas.a * Math.sqrt(1 - mimas.e * mimas.e);
    mimas.osvPeri = keplerPerifocal(mimas.a, mimas.b, mimas.E, planetData['saturn'].mu, JTtdb);

    // (4)

    // Here the second term is from [].
    // According to [1], 
    //  \lambda_2 =  76.1250 + 262.73190058 * d
    //  \lambda_4 = 191.7299 + 131.53493186 * d
    //  P_2 = 2*lambda_4 - lambda_2
    //      = 307.3348 + 123.441036885 * t
    // [2] contains the expression
    //  P_2 = 312.7 + 123.42 * (JT - 2411093) / 365.25,
    // which may yield error of ~2 degrees around 2040.

    enceladus.P = (307.3348 + 123.441036885 * t) % 360.0;

    // The second Enceladus-Dione libration term in [1] is written in terms of mean longitudes
    // and longitude of pericenter:
    //   12.53' * sin(2 \lambda_4 - \lambda_2 - \varpi_4)
    // = 12.53' * sin(314.3348 + 92.55404 * t),
    // where 
    // P_4 = 353.0 + 30.887 * t
    // The libration term angle seems to differ around 40-50 degrees from [2], which
    // uses the term
    //   13.04' * sind(119.2 + 93.18 * (JT - 2411093) / 365.25).

    enceladus.deltaL = p_2 * sind(nu_24 * t + mu_24) 
                     + (12.53/60.0) * sind(314.3348 + 92.55404 * t);

    // (3) Model for Enceladus:
    enceladus.a = au * enceladus.a_0;
    enceladus.lambda = (enceladus.L_0 + enceladus.n * d + enceladus.deltaL) % 360.0;
    enceladus.e = enceladus.e_0;
    enceladus.gamma = enceladus.gamma_0;
    enceladus.N = (enceladus.N_0 + enceladus.Ndot * t) % 360.0;

    enceladus.M = (enceladus.lambda - enceladus.P) % 360.0;
    enceladus.E = keplerSolve(enceladus.M, enceladus.e, 1e-6, 20);

    enceladus.b = enceladus.a * Math.sqrt(1 - enceladus.e * enceladus.e);
    enceladus.osvPeri = keplerPerifocal(enceladus.a, enceladus.b, enceladus.E, planetData['saturn'].mu, JTtdb);

    // (4)
    tethys.tau = 1950.0 + (JTtdb - 2433282.423) / 365.2422;
    tethys.psi = nu_13 * (tethys.tau - tau_0);
    tethys.deltaL = -x_13 * (A_1 * sind(tethys.psi) - 0.72 * sind(3*tethys.psi) - 0.02144 * sind(5*tethys.psi));

    // (5)
    tethys.a = au * tethys.a_0;
    tethys.lambda = (tethys.L_0 + tethys.n * d + tethys.deltaL) % 360.0;
    tethys.e = tethys.e_0;
    tethys.P = (tethys.P_0 + tethys.Pdot * t) % 360.0;
    tethys.gamma = tethys.gamma_0;
    tethys.N = (tethys.N_0 + tethys.Ndot * t) % 360.0;

    tethys.M = (tethys.lambda - tethys.P) % 360.0;
    tethys.E = keplerSolve(tethys.M, tethys.e, 1e-6, 20);
    tethys.b = tethys.a * Math.sqrt(1 - tethys.e * tethys.e);
    tethys.osvPeri = keplerPerifocal(tethys.a, tethys.b, tethys.E, planetData['saturn'].mu, JTtdb);

    // (8)
    dione.deltaL = p_4 * sind(nu_24 * t + mu_24) - (1.04 / 60.0) * sind(314.3348 + 92.55404 * t);
    dione.a = au * dione.a_0;
    dione.lambda = (dione.L_0 + dione.n * d + dione.deltaL) % 360.0;
    dione.e = dione.e_0;
    dione.P = (dione.P_0 + dione.Pdot * t) % 360.0;
    dione.gamma = dione.gamma_0;
    dione.N = (dione.N_0 + dione.Ndot * t) % 360.0;

    dione.M = (dione.lambda - dione.P) % 360.0;
    dione.E = keplerSolve(dione.M, dione.e, 1e-6, 20);
    dione.b = dione.a * Math.sqrt(1 - dione.e * dione.e);
    dione.osvPeri = keplerPerifocal(dione.a, dione.b, dione.E, planetData['saturn'].mu, JTtdb);


    // (12)
    titan.a = au * titan.a_0;
    titan.Ndot = -titan.varpi_dot;
    titan.N = titan.N_0 + titan.Ndot * t;
    titan.Omega_a = Omega_e - 0.1418 + kappa * sind(titan.gamma_0) * sind(titan.N) / sind(i_e);
    titan.i_a = i_e - 0.6204 + kappa * sind(titan.gamma_0) * cosd(titan.N);

    // (14)
    const T_s = (JTtdb - 2415020.0) / 36525.0;
    titan.l_s      = 175.4762 + 1221.5515 * T_s - 0.0005 * T_s*T_s;
    titan.lambda_s = 267.2635 + 1222.1136 * T_s;
    titan.i_s      = 2.489139 + 0.0024350 * T_s - 0.000034 * T_s*T_s;
    titan.Omega_s =113.349952 - 0.2596790 * T_s - 0.000038 * T_s*T_s;

    titan.Psi = atan2d(sind(titan.i_s)*sind(titan.Omega_a - titan.Omega_s),
                       cosd(titan.i_s)*sind(titan.i_a) 
                     - sind(titan.i_s)*cosd(titan.i_a)*cosd(titan.Omega_a - titan.Omega_s));
    titan.Gamma = atan2d(sind(titan.i_s)*sind(titan.Omega_a - titan.Omega_s)/sind(titan.Psi),
                         cosd(titan.i_s)*cosd(titan.i_a) 
                       + sind(titan.i_s)*sind(titan.i_a)*cosd(titan.Omega_a - titan.Omega_s));
    titan.Theta_dot = atan2d(sind(titan.i_a)*sind(titan.Omega_a - titan.Omega_s),
                           - sind(titan.i_s)*cosd(titan.i_a) 
                           + cosd(titan.i_s)*sind(titan.i_a)*cosd(titan.Omega_a - titan.Omega_s));
    titan.Theta = titan.Theta_dot + titan.Omega_s;
    titan.L_s = titan.lambda_s - (titan.Theta - titan.Omega_s) - titan.Omega_s;

    // Consistency check:
    //console.log(cosd(titan.Gamma)+ " " + (cosd(titan.i_s)*cosd(titan.i_a) + sind(titan.i_s)*sind(titan.i_a)*cosd(titan.Omega_a - titan.Omega_s)));
    //console.log(sind(titan.Gamma)*sind(titan.Psi) + " " + sind(titan.i_s)*sind(titan.Omega_a - titan.Omega_s));
    //console.log((sind(titan.Gamma)*cosd(titan.Psi)) + " " + (cosd(titan.i_s)*sind(titan.i_a) - sind(titan.i_s)*cosd(titan.i_a)* cosd(titan.Omega_a - titan.Omega_s)));
    //console.log(sind(titan.Gamma)*sind(titan.Theta_dot) + " " + sind(titan.i_a)*sind(titan.Omega_a - titan.Omega_s));
    //console.log(sind(titan.Gamma)*cosd(titan.Theta_dot) + " " + (-sind(titan.i_s)*cosd(titan.i_a) + cosd(titan.i_s)*sind(titan.i_a)*cosd(titan.Omega_a - titan.Omega_s)));

    titan.varpi_a = titan.varpi_0 + titan.varpi_dot * t;
    titan.g = titan.varpi_a - titan.Omega_a - titan.Psi;

    titan.lambda = (titan.lambda_0 + titan.n * d
                 + kappa * (sind(titan.gamma_0)*tand(0.5*i_e)*sind(titan.N)
                 - 0.0001757 * sind(titan.l_s)
                 - 0.0002151 * sind(2.0 * titan.L_s)
                 + 0.0000567 * sind(2.0 * titan.L_s + titan.Psi))) % 360.0;
    titan.e = titan.e_0 
            - 0.0001841 * cosd(2.0 * titan.g) 
            + 0.0000731 * cosd(2.0 * (titan.L_s - titan.g));
    titan.varpi = titan.varpi_a + kappa * (0.0063044 * sind(2.0 * titan.g)
                + 0.0025027 * sind(2.0 * (titan.L_s - titan.g)));
    titan.i = titan.i_a + 0.0002320 * kappa * cosd(2.0 * titan.L_s + titan.Psi);
    titan.Omega = titan.Omega_a + 0.0005034 * kappa * sind(2.0 * titan.L_s + titan.Psi);
    titan.M = (titan.lambda - titan.varpi) % 360.0;

    titan.E = keplerSolve(titan.M, titan.e, 1e-6, 20);
    titan.b = titan.a * Math.sqrt(1 - titan.e * titan.e);
    titan.osvPeri = keplerPerifocal(titan.a, titan.b, titan.E, planetData['saturn'].mu, JTtdb);

    titan.osvBcrs1950 = { 
        r: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            titan.osvPeri.r,
        -(titan.g + titan.Psi)), -titan.i_a), -titan.Omega_a), -eps),
        v: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            titan.osvPeri.v,
        -(titan.g + titan.Psi)), -titan.i_a), -titan.Omega_a), -eps),
        JT : titan.osvPeri.JT
    }

    // (10)
    rhea.pi = rhea.pi_0 + 10.057 * t;
    rhea.N = rhea.N_0 - 10.057 * t;
    rhea.varpi_6 = titan.varpi_0 + titan.varpi_dot * t;
    rhea.N_6 = titan.N_0 + titan.Ndot * t;

    rhea.a = au * rhea.a_0;
    rhea.lambda = rhea.lambda_0 + rhea.n * d 
                + kappa * sind(rhea.gamma_0)*tand(0.5*i_e)*sind(rhea.N);
    rhea.varpi = atan2d(rhea.e_0 * sind(rhea.pi) + 0.001 * sind(rhea.varpi_6),
                        rhea.e_0 * cosd(rhea.pi) + 0.001 * cosd(rhea.varpi_6));
    rhea.e = Math.sqrt(Math.pow(rhea.e_0 * sind(rhea.pi) + 0.001 * sind(rhea.varpi_6), 2.0),
                       Math.pow(rhea.e_0 * cosd(rhea.pi) + 0.001 * cosd(rhea.varpi_6), 2.0));
    rhea.i = i_e - 0.0455 
           + kappa * sind(rhea.gamma_0)*cosd(rhea.N)
           + 0.02007 * cosd(rhea.N_6);
    rhea.Omega = Omega_e - 0.007792
               + (kappa * sind(rhea.gamma_0)*sind(rhea.N) + 0.02007*sind(rhea.N_6))
               / sind(i_e);
    rhea.M = (rhea.lambda - rhea.varpi) % 360.0;

    rhea.E = keplerSolve(rhea.M, rhea.e, 1e-6, 20);
    rhea.b = rhea.a * Math.sqrt(1 - rhea.e * rhea.e);
    rhea.osvPeri = keplerPerifocal(rhea.a, rhea.b, rhea.E, planetData['saturn'].mu, JTtdb);
           
    rhea.osvBcrs1950 = { 
        r: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            rhea.osvPeri.r,
        -(rhea.varpi - rhea.Omega)), -rhea.i), -rhea.Omega), -eps),
        v: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            rhea.osvPeri.v,
        -(rhea.varpi - rhea.Omega)), -rhea.i), -rhea.Omega), -eps),
        JT : titan.osvPeri.JT
    }

    // Periodic perturbations for Iapetus:
    iapetus.eDot = 0.001156;
    iapetus.i_a = -1.0125;
    iapetus.i_b = -0.0648;
    iapetus.i_c =  0.0054;
    iapetus.Omega_b = 0.127;
    iapetus.Omega_c = 0.008;

    iapetus.a = iapetus.a_0 * au;
    iapetus.lambda = iapetus.lambda_0 + iapetus.n * d;
    iapetus.e = iapetus.e_0 + iapetus.eDot * T;
    iapetus.varpi = iapetus.varpi_0 + iapetus.varpi_dot * T;
    iapetus.i = iapetus.i_0 
              + iapetus.i_a * T 
              + iapetus.i_b * T*T 
              + iapetus.i_c * T*T*T;
    iapetus.Omega = iapetus.Omega_0 
                  + iapetus.Omega_dot * T
                  + iapetus.Omega_b * T*T
                  + iapetus.Omega_c * T*T*T; 

    iapetus.lambda_s = 267.263 + 1221.114 * T_s;
    iapetus.varpi_s =  91.796 + 0.562 * T_s;
    iapetus.theta   =   4.367 - 0.195 * T_s;
    iapetus.Theta   = 146.819 - 3.918 * T_s; 
    iapetus.lambda_T= 261.319 + 22.576974 * (JTtdb - 2411368.0);
    iapetus.varpi_T = 277.102 + 0.001389 * (JTtdb - 2411368);
    iapetus.phi     =  60.470 + 1.521 * T_s;
    iapetus.Phi     = 205.055 - 2.091 * T_s;

    iapetus.l =   iapetus.lambda   - iapetus.varpi;
    iapetus.g =   iapetus.varpi    - iapetus.Omega - iapetus.phi;
    iapetus.g_1 = iapetus.varpi    - iapetus.Omega - iapetus.phi;
    iapetus.l_s = iapetus.lambda_s - iapetus.varpi_s;
    iapetus.g_s = iapetus.varpi_s  - iapetus.Theta;
    iapetus.l_T = iapetus.lambda_T - iapetus.varpi_T;
    iapetus.g_T = iapetus.varpi_T  - iapetus.Phi;

    iapetus.delta_a = 1e-5 * iapetus.a_0 * au * (
          7.87 * cosd(2.0*(iapetus.l + iapetus.g - iapetus.l_s - iapetus.g_s))
       + 98.79 * cosd(iapetus.l + iapetus.g_1 - iapetus.l_T - iapetus.g_T)
    );
    iapetus.delta_lambda = -0.04299 * sind(iapetus.l + iapetus.g_1 - iapetus.l_T - iapetus.g_T)
                           -0.00356 * sind(5.0*iapetus.l - iapetus.l_T + 5.0*iapetus.g_1 - iapetus.g_T)
                           -0.00087 * sind(5.0*iapetus.l - iapetus.l_T + 5.0*iapetus.g_1 - 3.0*iapetus.g_T)
                           +0.00519 * sind(5.0*iapetus.l - iapetus.l_T + 4.0*iapetus.g_1 - 2.0*iapetus.g_T)
                           -0.00794 * sind(5.0*iapetus.l - iapetus.l_T + 3.0*iapetus.g_1 - iapetus.g_T)
                           -0.00789 * sind(2.0*(iapetus.l + iapetus.g - iapetus.l_s - iapetus.g_s))
                           -0.06312 * sind(iapetus.l_s)
                           -0.00295 * sind(2.0 * iapetus.l_s)
                           -0.02231 * sind(2.0*iapetus.l_s + 2.0*iapetus.g_s)
                           +0.00650 * sind(2.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta);
    iapetus.delta_e = 1e-5 * (
        -140.97 * cosd(iapetus.g_1 - iapetus.g_T)
        + 24.08 * cosd(iapetus.l)
        + 37.33 * cosd(2.0 * iapetus.l_s + 2.0 * iapetus.g_s - 2.0 * iapetus.g)
        +  0.50 * cosd(3.0 * iapetus.l_s + 2.0 * iapetus.g_s - 2.0 * iapetus.g)
        + 11.80 * cosd(iapetus.l + 2.0 * iapetus.g - 2.0 * iapetus.l_s - 2.0 * iapetus.g_s)
        + 28.49 * cosd(2.0 * iapetus.l + iapetus.g_1 - iapetus.l_T - iapetus.g_T)
        + 61.90 * cosd(iapetus.l_T + iapetus.g_T - iapetus.g_1)
    );
    iapetus.delta_varpi = iapetus.e * (
          0.08077 * sind(iapetus.g_1 - iapetus.g_T)
        + 0.02139 * sind(2.0*iapetus.l_s + 2.0*iapetus.g_s - 2.0*iapetus.g)
        + 0.00028 * sind(3.0*iapetus.l_s + 2.0*iapetus.g_s - 2.0*iapetus.g)
        - 0.00676 * sind(iapetus.l + 2.0*iapetus.g - 2.0*iapetus.l_s - 2.0*iapetus.g_s)
        + 0.01380 * sind(iapetus.l)
        + 0.01632 * sind(2.0*iapetus.l + iapetus.g_1 - iapetus.l_T - iapetus.g_T)
        + 0.03547 * sind(iapetus.l_T + iapetus.g_T - iapetus.g_1)
    );
    iapetus.delta_i = 0.00106 * cosd(iapetus.l_s)
                    - 0.00242 * cosd(iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
                    + 0.04204 * cosd(2.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
                    + 0.00565 * cosd(3.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
                    + 0.00057 * cosd(4.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
                    + 0.00035 * cosd(2.0*iapetus.l_s + 2.0*iapetus.g_s + 2.0*iapetus.g + iapetus.theta)
                    + 0.00235 * cosd(iapetus.l + iapetus.g_1 + iapetus.l_T + iapetus.g_T + iapetus.phi)
                    + 0.00360 * cosd(iapetus.l + iapetus.g_1 - iapetus.l_T - iapetus.g_T - iapetus.phi);

    iapetus.delta_Omega = (
        -0.01449 * sind(iapetus.l_s)
        -0.00060 * sind(2.0*iapetus.l_s)
        +0.00242 * sind(iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
        +0.04204 * sind(2.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
        +0.00565 * sind(3.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
        +0.00057 * sind(4.0*iapetus.l_s + 2.0*iapetus.g_s + iapetus.theta)
        +0.00035 * sind(2.0*iapetus.l_s + 2.0*iapetus.g_s + 2.0*iapetus.g + iapetus.theta)
        +0.00235 * sind(iapetus.l_s + iapetus.g_1 + iapetus.l_T + iapetus.g_T + iapetus.theta)
        +0.00358 * sind(iapetus.l_s + iapetus.g_1 - iapetus.l_T - iapetus.g_T - iapetus.theta)
    ) / sind(iapetus.i);


    /*iapetus.a += iapetus.delta_a;
    iapetus.lambda += iapetus.delta_lambda;
    iapetus.e += iapetus.delta_e;
    iapetus.varpi += iapetus.delta_varpi;
    iapetus.i += iapetus.delta_i;
    iapetus.Omega += iapetus.delta_Omega;*/

    iapetus.M = (iapetus.lambda - iapetus.varpi) % 360.0;
    iapetus.E = keplerSolve(iapetus.M, iapetus.e, 1e-6, 20);
    iapetus.b = iapetus.a * Math.sqrt(1 - iapetus.e * iapetus.e);
    iapetus.osvPeri = keplerPerifocal(iapetus.a, iapetus.b, iapetus.E, planetData['saturn'].mu, JTtdb);

    iapetus.osvBcrs1950 = { 
        r: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            iapetus.osvPeri.r,
        -(iapetus.varpi - iapetus.Omega)), -iapetus.i), -iapetus.Omega), -eps),
        v: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
            iapetus.osvPeri.v,
        -(iapetus.varpi - iapetus.Omega)), -iapetus.i), -iapetus.Omega), -eps),
        JT : iapetus.osvPeri.JT
    }


    /**
     * Rotate perifocal to BCRS frame. This is used for Mimas, Enceladus, Tethys
     * and Dione.
     * 
     * @param {*} satellite 
     *      Object with perifocal coordinates and required Keplerian elements.
     */
    function rotateToBcrs2000(satellite)
    {
        // To compute B1950.0 Earth equatorial coordinates, compute rotations:
        // - From pericenter to satellite node w.r.t. the equator of Saturn (z).
        // - From the plane of the satellite to the equatorial plane of Saturn (x).
        // - From the node of the satellite to the node of Saturn's orbit w.r.t the ecliptic (z).
        // - From the equatorial plane of Saturn to the plane of the ecliptic (x).
        // - From the node of the orbit to the B1950.0 vernal equinox (z).
        // - From the plane of the ecliptic to the B1950 equatorial plane of Earth (x).
        satellite.osvBcrs1950 = { 
            r: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
                satellite.osvPeri.r,
            -(satellite.P - satellite.N)), -satellite.gamma), -(satellite.N - Omega_e)), -i_e), -Omega_e), -eps),
            // TBD: There might be some error from change in the Keplerian parameters.
            v: rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(
                satellite.osvPeri.v,
            -(satellite.P - satellite.N)), -satellite.gamma), -(satellite.N - Omega_e)), -i_e), -Omega_e), -eps),
            JT : satellite.osvPeri.JT
        }
        // J2000.0 equatorial.
        satellite.osvBcrsJ2000 = coordB1950J2000(satellite.osvBcrs1950);
    }

    rotateToBcrs2000(mimas);
    rotateToBcrs2000(enceladus);
    rotateToBcrs2000(tethys);
    rotateToBcrs2000(dione);
    rhea.osvBcrsJ2000 = coordB1950J2000(rhea.osvBcrs1950);
    titan.osvBcrsJ2000 = coordB1950J2000(titan.osvBcrs1950);
    iapetus.osvBcrsJ2000 = coordB1950J2000(iapetus.osvBcrs1950);

    /*console.log(mimas);
    console.log(enceladus);
    console.log(tethys);
    console.log(dione);
    console.log(titan);
    console.log(rhea);
    console.log(iapetus);*/

    return {
        mimas : mimas.osvBcrsJ2000,
        enceladus : enceladus.osvBcrsJ2000,
        tethys : tethys.osvBcrsJ2000,
        dione : dione.osvBcrsJ2000,
        rhea : rhea.osvBcrsJ2000,
        titan : titan.osvBcrsJ2000,
        iapetus : iapetus.osvBcrsJ2000
    }
}

/**
 * Compute positions of the satellites of Uranus.
 * 
 * This implementation is based on the GUST86 theory. The naming of coefficients is taken
 * from 
 * https://ftp.imcce.fr/pub/ephem/satel/gust86/gust86.f
 * but the actual computation has been rewritten for more clarity.
 * 
 * @param {*} JTtdb 
 *      Julian time (TDB).
 * @returns Object with OSV for each major satellite.
 */
export function uranusSatellites(JTtdb)
{
    // Section 2.1.
    const T = JTtdb - 2444239.5;

    // Gravitational parameters (mu) of the satellites (km^3/s^2):
    const muSatellite = {
        miranda : 4.4, 
        ariel   : 86.1, 
        umbriel : 84.0, 
        titania : 230.0, 
        oberon  : 200.0
    };
    // Gravitational parameter of the planet without the satellites (km^3/s^2)
    const muPlanet = 5793950;
    
    // According to equation (5) , the constants E_i and I_i, i = 1, .., 5 are computed as
    //     E_i = c_i * T + phi_i
    //     I_i = c_i * T + phi_i
    // Table 2a - Frequency c_i for E_1, .., E_5, I_1, .., I_5.
    const c_i_E = [ 20.082,  6.217,  2.865,  2.078,  0.386];
    const c_i_I = [-20.309, -6.288, -2.836, -1.843, -0.259];

    // Table 4 - phi_i for E_i and I_i
    const phi_i_E = [0.611392, 2.408974, 2.067774, 0.735131, 0.426767];
    const phi_i_I = [5.702313, 0.395757, 0.589326, 1.746237, 4.206896];

    // The mean mean motion is computed as
    //      N_i = N'_i * T + \lambda_{0i}
    // Table 2b - Other parameters determined by Voyager and Earth based data (FQN, PHN) 
    // N_i' (rad/day) - Linear part of mean mean motion.
    // lambda_0i (rad) - Mean mean motion at epoch.
    const N_i = [4445190.550e-6, 2492952.519e-6, 1516148.111e-6, 721718.509e-6, 466692.120e-6];
    const lambda_0_i = [-238051e-6, 3098046e-6, 2285402.0e-6, 856359.0e-6, -915592.0e-6];

    // Compute coefficients N_i, E_i and I_i:
    const AN = [];
    const AE = [];
    const AI = [];
    for (let i = 0; i < 5; i++)
    {
        AN.push((N_i[i] * T + lambda_0_i[i]) % (2.0 * Math.PI));
        AE.push(((deg2Rad(c_i_E[i]) / 365.25) * T + phi_i_E[i]) % (2.0 * Math.PI));
        AI.push(((deg2Rad(c_i_I[i]) / 365.25) * T + phi_i_I[i]) % (2.0 * Math.PI));
    }

    // The following variables are defined Tables 6-10 of [1] as follows:
    // - RN : Mean motion (rads/day).
    // - RL : Mean longitude (rads)
    // - RK + j * RH = e * exp(j * varpi), where:
    //    * j = sqrt(-1)
    //    * e is the eccentricity
    //    * varpi is the longitude of perigee
    // - RQ + j * RP = sin(i/2) * exp(j * Omega),
    //    * i is the inclination
    //    * Omega is the longitude of ascending node.
    const miranda = {
        mu : muPlanet + muSatellite.miranda,
        RN :  4443522.67e-6
           -       37.92e-6 * Math.cos(      AN[0] - 3.0 * AN[1] + 2.0 * AN[2])
           +        8.47e-6 * Math.cos(2.0 * AN[0] - 6.0 * AN[1] + 4.0 * AN[2])
           +        1.31e-6 * Math.cos(3.0 * AN[0] - 9.0 * AN[1] + 6.0 * AN[2])
           -       52.28e-6 * Math.cos(      AN[0] -       AN[1])
           -      136.65e-6 * Math.cos(2.0 * AN[0] - 2.0 * AN[1]),
        RL :  -238051.58e-6
           +  4445190.55e-6 * T
           +    25472.17e-6 * Math.sin(      AN[0] - 3.0  * AN[1] + 2.0 * AN[2])
           -     3088.31e-6 * Math.sin(2.0 * AN[0] - 6.0  * AN[1] + 4.0 * AN[2])
           -      318.10e-6 * Math.sin(3.0 * AN[0] - 9.0  * AN[1] + 6.0 * AN[2])
           -       37.49e-6 * Math.sin(4.0 * AN[0] - 12.0 * AN[1] + 8.0 * AN[2])
           -       57.85e-6 * Math.sin(      AN[0] -        AN[1])
           -       62.32e-6 * Math.sin(2.0 * AN[0] - 2.0  * AN[1])
           -       27.95e-6 * Math.sin(3.0 * AN[0] - 3.0  * AN[1]),
        RK :     1312.38e-6 * Math.cos(AE[0])
           +       71.81e-6 * Math.cos(AE[1])
           +       69.77e-6 * Math.cos(AE[2])
           +        6.75e-6 * Math.cos(AE[3])
           +        6.27e-6 * Math.cos(AE[4])
           -      123.31e-6 * Math.cos(-AN[0]+2.0*AN[1])
           +       39.52e-6 * Math.cos(-2.0*AN[0]+3.0*AN[1])
           +      194.10e-6 * Math.cos(AN[0]),
        RH :     1312.38e-6 * Math.sin(AE[0])
           +       71.81e-6 * Math.sin(AE[1])
           +       69.77e-6 * Math.sin(AE[2])
           +        6.75e-6 * Math.sin(AE[3])
           +        6.27e-6 * Math.sin(AE[4])
           -      123.31e-6 * Math.sin(-AN[0]+2.0*AN[1])
           +       39.52e-6 * Math.sin(-2.0*AN[0]+3.0*AN[1])
           +      194.10e-6 * Math.sin(AN[0]),
        RQ :    37871.71e-6 * Math.cos(AI[0])
           +       27.01e-6 * Math.cos(AI[1])
           +       30.76e-6 * Math.cos(AI[2])
           +       12.18e-6 * Math.cos(AI[3])
           +        5.37e-6 * Math.cos(AI[4]),
        RP :    37871.71e-6 * Math.sin(AI[0])
           +       27.01e-6 * Math.sin(AI[1])
           +       30.76e-6 * Math.sin(AI[2])
           +       12.18e-6 * Math.sin(AI[3])
           +        5.37e-6 * Math.sin(AI[4])
    };

    const ariel = {
        mu : muPlanet + muSatellite.ariel,
        RN :  2492542.57e-6
           +        2.55e-6 * Math.cos(AN[0] - 3.0 * AN[1] + 2.0 * AN[2])
           -       42.16e-6 * Math.cos(              AN[1] -       AN[2])
           -      102.56e-6 * Math.cos(        2.0 * AN[1] - 2.0 * AN[2]),
        RL :  3098046.41e-6
           +  2492952.52e-6 * T
           -     1860.50e-6 * Math.sin(      AN[0] -  3.0 * AN[1] + 2.0 * AN[2])
           +      219.99e-6 * Math.sin(2.0 * AN[0] -  6.0 * AN[1] + 4.0 * AN[2])
           +       23.10e-6 * Math.sin(3.0 * AN[0] -  9.0 * AN[1] + 6.0 * AN[2])
           +        4.30e-6 * Math.sin(4.0 * AN[0] - 12.0 * AN[1] + 8.0 * AN[2])
           -       90.11e-6 * Math.sin(                     AN[1] -       AN[2])
           -       91.07e-6 * Math.sin(               2.0 * AN[1] - 2.0 * AN[2])
           -       42.75e-6 * Math.sin(               3.0 * AN[1] - 3.0 * AN[2])
           -       16.49e-6 * Math.sin(               2.0 * AN[1]               - 2.0 * AN[3]),
        RK :       -3.35e-6 * Math.cos(AE[0])
           +     1187.63e-6 * Math.cos(AE[1])
           +      861.59e-6 * Math.cos(AE[2])
           +       71.50e-6 * Math.cos(AE[3])
           +       55.59e-6 * Math.cos(AE[4])
           -       84.60e-6 * Math.cos(      -AN[1] + 2.0 * AN[2])
           +       91.81e-6 * Math.cos(-2.0 * AN[1] + 3.0 * AN[2])
           +       20.03e-6 * Math.cos(      -AN[1] + 2.0 * AN[3])
           +       89.77e-6 * Math.cos(       AN[1]),
        RH :       -3.35e-6 * Math.sin(AE[0])
           +     1187.63e-6 * Math.sin(AE[1])
           +      861.59e-6 * Math.sin(AE[2])
           +       71.50e-6 * Math.sin(AE[3])
           +       55.59e-6 * Math.sin(AE[4])
           -       84.60e-6 * Math.sin(      -AN[1] + 2.0 * AN[2])
           +       91.81e-6 * Math.sin(-2.0 * AN[1] + 3.0 * AN[2])
           +       20.03e-6 * Math.sin(      -AN[1] + 2.0 * AN[3])
           +       89.77e-6 * Math.sin(       AN[1]),
        RQ :     -121.75e-6 * Math.cos(AI[0])
           +      358.25e-6 * Math.cos(AI[1])
           +      290.08e-6 * Math.cos(AI[2])
           +       97.78e-6 * Math.cos(AI[3])
           +       33.97e-6 * Math.cos(AI[4]),      
        RP :     -121.75e-6 * Math.sin(AI[0])
           +      358.25e-6 * Math.sin(AI[1])
           +      290.08e-6 * Math.sin(AI[2])
           +       97.78e-6 * Math.sin(AI[3])
           +       33.97e-6 * Math.sin(AI[4])    
        };

    const umbriel = {
        mu : muPlanet + muSatellite.umbriel,
        RN :  1515954.90e-6
          +         9.74e-6 * Math.cos(                    AN[2] - 2.0 * AN[3] + AE[2])
          -       106.00e-6 * Math.cos(      AN[1] -       AN[2])
          +        54.16e-6 * Math.cos(2.0 * AN[1] - 2.0 * AN[2])
          -        23.59e-6 * Math.cos(                    AN[2]  -      AN[3])
          -        70.70e-6 * Math.cos(              2.0 * AN[2] - 2.0 * AN[3])
          -        36.28e-6 * Math.cos(              3.0 * AN[2] - 3.0 * AN[3]),
        RL :  2285401.69e-6
           +  1516148.11e-6 * T
           +      660.57e-6 * Math.sin(      AN[0] -  3.0 * AN[1] + 2.0 * AN[2])
           -       76.51e-6 * Math.sin(2.0 * AN[0] -  6.0 * AN[1] + 4.0 * AN[2])
           -        8.96e-6 * Math.sin(3.0 * AN[0] -  9.0 * AN[1] + 6.0 * AN[2])
           -        2.53e-6 * Math.sin(4.0 * AN[0] - 12.0 * AN[1] + 8.0 * AN[2])
           -       52.91e-6 * Math.sin(                                   AN[2] - 4.0 * AN[3] + 3.0 * AN[4])
           -        7.34e-6 * Math.sin(                                   AN[2] - 2.0 * AN[3]       + AE[4])
           -        1.83e-6 * Math.sin(                                   AN[2] - 2.0 * AN[3]       + AE[3])
           +      147.91e-6 * Math.sin(                                   AN[2] - 2.0 * AN[3] +       AE[2])
           -        7.77e-6 * Math.sin(                                   AN[2] - 2.0 * AN[3]       + AE[1])
           +       97.76e-6 * Math.sin(                     AN[1] -       AN[2])
           +       73.13e-6 * Math.sin(               2.0 * AN[1] - 2.0 * AN[2])
           +       34.71e-6 * Math.sin(               3.0 * AN[1] - 3.0 * AN[2])
           +       18.89e-6 * Math.sin(               4.0 * AN[1] - 4.0 * AN[2])
           -       67.89e-6 * Math.sin(                                   AN[2] -       AN[3])
           -       82.86e-6 * Math.sin(                             2.0 * AN[2] - 2.0 * AN[3])
           -       33.81e-6 * Math.sin(                             3.0 * AN[2] - 3.0 * AN[3])
           -       15.79e-6 * Math.sin(                             4.0 * AN[2] - 4.0 * AN[3])
           -       10.21e-6 * Math.sin(                                   AN[2]               -       AN[4])
           -       17.08e-6 * Math.sin(                             2.0 * AN[2]               - 2.0 * AN[4]),
        RK :       -0.21e-6 * Math.cos(AE[0])
           -      227.95e-6 * Math.cos(AE[1])
           +     3904.69e-6 * Math.cos(AE[2])
           +      309.17e-6 * Math.cos(AE[3])
           +      221.92e-6 * Math.cos(AE[4])
           +       29.34e-6 * Math.cos(AN[1])
           +       26.20e-6 * Math.cos(AN[2])
           +       51.19e-6 * Math.cos(      -AN[1] + 2.0 * AN[2])
           -      103.86e-6 * Math.cos(-2.0 * AN[1] + 3.0 * AN[2])
           -       27.16e-6 * Math.cos(-3.0 * AN[2] + 4.0 * AN[2])
           -       16.22e-6 * Math.cos(                                   AN[3])
           +      549.23e-6 * Math.cos(                    -AN[2] + 2.0 * AN[3])
           +       34.70e-6 * Math.cos(              -2.0 * AN[2] + 3.0 * AN[3])
           +       12.81e-6 * Math.cos(              -3.0 * AN[2] + 4.0 * AN[3])
           +       21.81e-6 * Math.cos(                    -AN[2]                + 2.0 * AN[4])
           +       46.25e-6 * Math.cos(                     AN[2]),
        RH :       -0.21e-6 * Math.sin(AE[0])
           -      227.95e-6 * Math.sin(AE[1])
           +     3904.69e-6 * Math.sin(AE[2])
           +      309.17e-6 * Math.sin(AE[3])
           +      221.92e-6 * Math.sin(AE[4])
           +       29.34e-6 * Math.sin(AN[1])
           +       26.20e-6 * Math.sin(AN[2])
           +       51.19e-6 * Math.sin(      -AN[1] + 2.0 * AN[2])
           -      103.86e-6 * Math.sin(-2.0 * AN[1] + 3.0 * AN[2])
           -       27.16e-6 * Math.sin(-3.0 * AN[2] + 4.0 * AN[2])
           -       16.22e-6 * Math.sin(                                   AN[3])
           +      549.23e-6 * Math.sin(                    -AN[2] + 2.0 * AN[3])
           +       34.70e-6 * Math.sin(              -2.0 * AN[2] + 3.0 * AN[3])
           +       12.81e-6 * Math.sin(              -3.0 * AN[2] + 4.0 * AN[3])
           +       21.81e-6 * Math.sin(                    -AN[2]                + 2.0 * AN[4])
           +       46.25e-6 * Math.sin(                     AN[2]),
        RQ :      -10.86e-6 * Math.cos(AI[0])
           -       81.51e-6 * Math.cos(AI[1])
           +     1113.36e-6 * Math.cos(AI[2])
           +      350.14e-6 * Math.cos(AI[3])
           +      106.50e-6 * Math.cos(AI[4]),
        RP :      -10.86e-6 * Math.sin(AI[0])
           -       81.51e-6 * Math.sin(AI[1])
           +     1113.36e-6 * Math.sin(AI[2])
           +      350.14e-6 * Math.sin(AI[3])
           +      106.50e-6 * Math.sin(AI[4])
    };

    const titania = {
        mu : muPlanet + muSatellite.titania,
        RN : 721663.16e-6
           -      2.64e-6 * Math.cos(AN[2]-2.0*AN[3]+AE[2])
           -      2.16e-6 * Math.cos(      2.0*AN[3]-3.0*AN[4]+AE[4])
           +      6.45e-6 * Math.cos(      2.0*AN[3]-3.0*AN[4]+AE[3])
           -      1.11e-6 * Math.cos(      2.0*AN[3]-3.0*AN[4]+AE[2])
           -     62.23e-6 * Math.cos(AN[1] -   AN[3])
           -     56.13e-6 * Math.cos(AN[2] -   AN[3])
           -     39.94e-6 * Math.cos(          AN[3] -   AN[4])
           -     91.85e-6 * Math.cos(      2.0*AN[3]-2.0*AN[4])
           -     58.31e-6 * Math.cos(      3.0*AN[3]-3.0*AN[4])
           -     38.60e-6 * Math.cos(      4.0*AN[3]-4.0*AN[4])
           -     26.18e-6 * Math.cos(      5.0*AN[3]-5.0*AN[4])
           -     18.06e-6 * Math.cos(      6.0*AN[3]-6.0*AN[4]),
        RL :  856358.79e-6
           + 721718.51e-6 * T
           +     20.61e-6 * Math.sin(AN[2]-4.0*AN[3]+3.0*AN[4])
           -      2.07e-6 * Math.sin(AN[2]-2.0*AN[3]          +AE[4])
           -      2.88e-6 * Math.sin(AN[2]-2.0*AN[3]          +AE[3])
           -     40.79e-6 * Math.sin(AN[2]-2.0*AN[3]          +AE[2])
           +      2.11e-6 * Math.sin(AN[2]-2.0*AN[3]          +AE[1])
           -     51.83e-6 * Math.sin(      2.0*AN[3]-3.0*AN[4]+AE[4])
           +    159.87e-6 * Math.sin(      2.0*AN[3]-3.0*AN[4]+AE[3])
           -     35.05e-6 * Math.sin(      2.0*AN[3]-3.0*AN[4]+AE[2])
           -      1.56e-6 * Math.sin(      3.0*AN[3]-4.0*AN[4]+AE[4])
           +     40.54e-6 * Math.sin(AN[1]-    AN[3])
           +     46.17e-6 * Math.sin(AN[2]-    AN[3])
           -    317.76e-6 * Math.sin(          AN[3]-    AN[4])
           -    305.59e-6 * Math.sin(      2.0*AN[3]-2.0*AN[4])
           -    148.36e-6 * Math.sin(      3.0*AN[3]-3.0*AN[4])
           -     82.92e-6 * Math.sin(      4.0*AN[3]-4.0*AN[4])
           -     49.98e-6 * Math.sin(      5.0*AN[3]-5.0*AN[4])
           -     31.56e-6 * Math.sin(      6.0*AN[3]-6.0*AN[4])
           -     20.56e-6 * Math.sin(      7.0*AN[3]-7.0*AN[4])
           -     13.69e-6 * Math.sin(      8.0*AN[3]-8.0*AN[4]),
        RK :     -0.02e-6 * Math.cos(AE[0])
           -      1.29e-6 * Math.cos(AE[1])
           -    324.51e-6 * Math.cos(AE[2])
           +    932.81e-6 * Math.cos(AE[3])
           +   1120.89e-6 * Math.cos(AE[4])
           +     33.86e-6 * Math.cos(AN[1])
           +     17.46e-6 * Math.cos(AN[3])
           +     16.58e-6 * Math.cos(-AN[1]+2.0*AN[3])
           +     28.89e-6 * Math.cos(AN[2])
           -     35.86e-6 * Math.cos(-AN[2]+2.0*AN[3])
           -     17.86e-6 * Math.cos(AN[3])
           -     32.10e-6 * Math.cos(AN[4])
           -    177.83e-6 * Math.cos(    -AN[3]+2.0*AN[4])
           +    793.43e-6 * Math.cos(-2.0*AN[3]+3.0*AN[4])
           +     99.48e-6 * Math.cos(-3.0*AN[3]+4.0*AN[4])
           +     44.83e-6 * Math.cos(-4.0*AN[3]+5.0*AN[4])
           +     25.13e-6 * Math.cos(-5.0*AN[3]+6.0*AN[4])
           +     15.43e-6 * Math.cos(-6.0*AN[3]+7.0*AN[4]),
        RH :     -0.02e-6 * Math.sin(AE[0])
           -      1.29e-6 * Math.sin(AE[1])
           -    324.51e-6 * Math.sin(AE[2])
           +    932.81e-6 * Math.sin(AE[3])
           +   1120.89e-6 * Math.sin(AE[4])
           +     33.86e-6 * Math.sin(AN[1])
           +     17.46e-6 * Math.sin(AN[3])
           +     16.58e-6 * Math.sin(-AN[1]+2.0*AN[3])
           +     28.89e-6 * Math.sin(AN[2])
           -     35.86e-6 * Math.sin(-AN[2]+2.0*AN[3])
           -     17.86e-6 * Math.sin(AN[3])
           -     32.10e-6 * Math.sin(AN[4])
           -    177.83e-6 * Math.sin(    -AN[3]+2.0*AN[4])
           +    793.43e-6 * Math.sin(-2.0*AN[3]+3.0*AN[4])
           +     99.48e-6 * Math.sin(-3.0*AN[3]+4.0*AN[4])
           +     44.83e-6 * Math.sin(-4.0*AN[3]+5.0*AN[4])
           +     25.13e-6 * Math.sin(-5.0*AN[3]+6.0*AN[4])
           +     15.43e-6 * Math.sin(-6.0*AN[3]+7.0*AN[4]),
        RQ :     -1.43e-6 * Math.cos(AI[0])
           -      1.06e-6 * Math.cos(AI[1])
           -    140.13e-6 * Math.cos(AI[2])
           +    685.72e-6 * Math.cos(AI[3])
           +    378.32e-6 * Math.cos(AI[4]),
        RP :     -1.43e-6 * Math.sin(AI[0])
                 -1.06e-6 * Math.sin(AI[1])
               -140.13e-6 * Math.sin(AI[2])
               +685.72e-6 * Math.sin(AI[3])
               +378.32e-6 * Math.sin(AI[4])
    };

    const oberon = {
        mu : muPlanet + muSatellite.oberon,
        RN : 466580.54e-6
           +      2.08e-6 * Math.cos(2.0*AN[3]-3.0*AN[4]+AE[4])
           -      6.22e-6 * Math.cos(2.0*AN[3]-3.0*AN[4]+AE[3])
           +      1.07e-6 * Math.cos(2.0*AN[3]-3.0*AN[4]+AE[2])
           -     43.10e-6 * Math.cos(AN[1]-AN[4])
           -     38.94e-6 * Math.cos(AN[2]-AN[4])
           -     80.11e-6 * Math.cos(AN[3]-AN[4])
           +     59.06e-6 * Math.cos(2.0*AN[3]-2.0*AN[4])
           +     37.49e-6 * Math.cos(3.0*AN[3]-3.0*AN[4])
           +     24.82e-6 * Math.cos(4.0*AN[3]-4.0*AN[4])
           +     16.84e-6 * Math.cos(5.0*AN[3]-5.0*AN[4]),
        RL :-915591.80e-6
           + 466692.12e-6 * T
           -      7.82e-6 * Math.sin(AN[2]-4.0*AN[3]+3.0*AN[4])
           +     51.29e-6 * Math.sin(2.0*AN[3]-3.0*AN[4]+AE[4])
           -    158.24e-6 * Math.sin(2.0*AN[3]-3.0*AN[4]+AE[3])
           +     34.51e-6 * Math.sin(2.0*AN[3]-3.0*AN[4]+AE[2])
           +     47.51e-6 * Math.sin(AN[1]-AN[4])
           +     38.96e-6 * Math.sin(AN[2]-AN[4])
           +    359.73e-6 * Math.sin(AN[3]-AN[4])
           +    282.78e-6 * Math.sin(2.0*AN[3]-2.0*AN[4])
           +    138.60e-6 * Math.sin(3.0*AN[3]-3.0*AN[4])
           +     78.03e-6 * Math.sin(4.0*AN[3]-4.0*AN[4])
           +     47.29e-6 * Math.sin(5.0*AN[3]-5.0*AN[4])
           +     30.00e-6 * Math.sin(6.0*AN[3]-6.0*AN[4])
           +     19.62e-6 * Math.sin(7.0*AN[3]-7.0*AN[4])
           +     13.11e-6 * Math.sin(8.0*AN[3]-8.0*AN[4]),
        RK :     0.00e-6 * Math.cos(AE[0])
           -     0.35e-6 * Math.cos(AE[1])
           +    74.53e-6 * Math.cos(AE[2])
           -   758.68e-6 * Math.cos(AE[3])
           +  1397.34e-6 * Math.cos(AE[4])
           +    39.00e-6 * Math.cos(AN[1])
           +    17.66e-6 * Math.cos(-AN[1]+2.0*AN[4])
           +    32.42e-6 * Math.cos(AN[2])
           +    79.75e-6 * Math.cos(AN[3])
           +    75.66e-6 * Math.cos(AN[4])
           +   134.04e-6 * Math.cos(-AN[3]+2.0*AN[4])
           -   987.26e-6 * Math.cos(-2.0*AN[3]+3.0*AN[4])
           -   126.09e-6 * Math.cos(-3.0*AN[3]+4.0*AN[4])
           -    57.42e-6 * Math.cos(-4.0*AN[3]+5.0*AN[4])
           -    32.41e-6 * Math.cos(-5.0*AN[3]+6.0*AN[4])
           -    19.99e-6 * Math.cos(-6.0*AN[3]+7.0*AN[4])
           -    12.94e-6 * Math.cos(-7.0*AN[3]+8.0*AN[4]),
        RH :     0.00e-6 * Math.sin(AE[0])
           -     0.35e-6 * Math.sin(AE[1])
           +    74.53e-6 * Math.sin(AE[2])
           -   758.68e-6 * Math.sin(AE[3])
           +  1397.34e-6 * Math.sin(AE[4])
           +    39.00e-6 * Math.sin(AN[1])
           +    17.66e-6 * Math.sin(-AN[1]+2.0*AN[4])
           +    32.42e-6 * Math.sin(AN[2])
           +    79.75e-6 * Math.sin(AN[3])
           +    75.66e-6 * Math.sin(AN[4])
           +   134.04e-6 * Math.sin(-AN[3]+2.0*AN[4])
           -   987.26e-6 * Math.sin(-2.0*AN[3]+3.0*AN[4])
           -   126.09e-6 * Math.sin(-3.0*AN[3]+4.0*AN[4])
           -    57.42e-6 * Math.sin(-4.0*AN[3]+5.0*AN[4])
           -    32.41e-6 * Math.sin(-5.0*AN[3]+6.0*AN[4])
           -    19.99e-6 * Math.sin(-6.0*AN[3]+7.0*AN[4])
           -    12.94e-6 * Math.sin(-7.0*AN[3]+8.0*AN[4]),
        RQ :    -0.44e-6 * Math.cos(AI[0])
           -     0.31e-6 * Math.cos(AI[1])
           +    36.89e-6 * Math.cos(AI[2])
           -   596.33e-6 * Math.cos(AI[3])
           +   451.69e-6*Math.cos(AI[4]),
        RP :    -0.44e-6 * Math.sin(AI[0])
           -     0.31e-6 * Math.sin(AI[1])
           +    36.89e-6 * Math.sin(AI[2])
           -   596.33e-6 * Math.sin(AI[3])
           +   451.69e-6 * Math.sin(AI[4])
    };

    /**
     * Transform from EME50 to BCRS 1950.0 equatorial frame.
     * 
     * @param {*} r 
     *      Position in EME50 frame.
     * @returns Position in BCRS 1950.0 equatorial frame.
     */
    function coordEme50Bcrs1950(r)
    {
        // Table 2b.
        const alpha = deg2Rad(76.6067);
        const delta = deg2Rad(15.0322);
        
        // (11)
        const M = [
            [ Math.sin(alpha),  Math.cos(alpha)*Math.sin(delta), Math.cos(alpha)*Math.cos(delta)],
            [-Math.cos(alpha),  Math.sin(alpha)*Math.sin(delta), Math.sin(alpha)*Math.cos(delta)],
            [ 0,                -Math.cos(delta),                Math.sin(delta)]
        ];

        // (10)
        return [
            M[0][0] * r[0] + M[0][1] * r[1] + M[0][2] * r[2],
            M[1][0] * r[0] + M[1][1] * r[1] + M[1][2] * r[2],
            M[2][0] * r[0] + M[2][1] * r[1] + M[2][2] * r[2]
        ];
    }

    /**
     * Compute position of the satellite.
     * 
     * @param {*} satelliteData 
     *      Satellite data.
     */
    function process(satelliteData)
    {
        // Semi-major axis (km).
        satelliteData.a = Math.pow(satelliteData.mu * (86400.0 * 86400.0) * Math.pow(satelliteData.RN, -2.0), 1/3);
        // Eccentricity.
        satelliteData.ecc = Math.sqrt(satelliteData.RK * satelliteData.RK + satelliteData.RH * satelliteData.RH);
        // Longitude of periapsis (rad).
        satelliteData.varpi = Math.atan2(satelliteData.RH, satelliteData.RK);
        // Longitude of ascending node (rad).
        satelliteData.Omega = Math.atan2(satelliteData.RP, satelliteData.RQ);
        // Inclination (rad).
        satelliteData.incl = 2.0 * Math.asin(Math.sqrt(satelliteData.RP*satelliteData.RP + satelliteData.RQ*satelliteData.RQ));
        // Mean longitude (rad).
        satelliteData.lambda = satelliteData.RL;
        // Mean motion (rad / day).
        satelliteData.n = satelliteData.RN;
        // Semi-minor axis
        satelliteData.b = Math.sqrt(satelliteData.a * satelliteData.a * (1 - satelliteData.ecc * satelliteData.ecc));
        // Mean anomaly (rad).
        satelliteData.M = satelliteData.lambda - satelliteData.varpi;
        // Solve eccentric anomaly (rad).
        satelliteData.E = deg2Rad(keplerSolve(rad2Deg(satelliteData.M), satelliteData.ecc, 1.0e-10, 10));
        // Compute perifocal coordinates.
        satelliteData.osvPeri = keplerPerifocal(satelliteData.a, satelliteData.b, rad2Deg(satelliteData.E), satelliteData.mu, JTtdb);
        //
        satelliteData.rTmp = rotateCart3d(satelliteData.osvPeri.r, rad2Deg(-satelliteData.varpi));
        // TBD: There might be some error from change in the Keplerian parameters.
        satelliteData.vTmp = rotateCart3d(satelliteData.osvPeri.v, rad2Deg(-satelliteData.varpi));

        satelliteData.rUme50 = rotateCart3d(rotateCart1d(rotateCart3d(
            satelliteData.rTmp, rad2Deg(satelliteData.Omega)), -rad2Deg(satelliteData.incl)), -rad2Deg(satelliteData.Omega));
        // TBD: There might be some error from change in the Keplerian parameters.
        satelliteData.vUme50 = rotateCart3d(rotateCart1d(rotateCart3d(
            satelliteData.vTmp, rad2Deg(satelliteData.Omega)), -rad2Deg(satelliteData.incl)), -rad2Deg(satelliteData.Omega));
        satelliteData.rBcrs1950 = vecMul(coordEme50Bcrs1950(satelliteData.rUme50), 1000.0);
        satelliteData.vBcrs1950 = vecMul(coordEme50Bcrs1950(satelliteData.vUme50), 1000.0);

        satelliteData.osvBcrs1950 = {r : satelliteData.rBcrs1950, v : satelliteData.vBcrs1950, JT : JTtdb};
        satelliteData.osvBcrs1950Ecl = coordEqEcl(satelliteData.osvBcrs1950);
        satelliteData.osvBcrs2000 = coordB1950J2000(satelliteData.osvBcrs1950);
        satelliteData.osvBcrs2000Ecl = coordEqEcl(satelliteData.osvBcrs2000);
    }

    process(miranda);
    process(ariel);
    process(umbriel);
    process(titania);
    process(oberon);

    return {
        miranda : miranda.osvBcrs2000,
        ariel   : ariel.osvBcrs2000,
        umbriel : umbriel.osvBcrs2000,
        titania : titania.osvBcrs2000,
        oberon  : oberon.osvBcrs2000
    };
}



export function neptuneSatellites(JTtdb)
{
    const T = (JTtdb - 2451545.5) / 36525.0;

    const triton = {
        t_0   : 2433282.5,
        a     : 354611.773,
        e     : Math.sqrt((0)),
        n     : 61.2588532,
        L_0   : 200.913,
        gamma : 158.996,
        N     : 359.28 + 54.308 * T
    };

    triton.alpha_p = 298.72 + 2.58 * sind(triton.N) - 0.04 * sind(2.0 * triton.N);
    triton.delta_p =  42.63 - 1.90 * cosd(triton.N) + 0.01 * cosd(2.0 * triton.N);
    triton.N_e     = triton.alpha_p + 90.0;
    triton.J_e     = 90.0 - triton.delta_p;
    triton.theta = 151.401 + 0.57806 * (JTtdb - triton.t_0)/ 365.25;

    triton.CB = asind(sind(triton.N - triton.N_e) * sind(triton.J_e) / sind(triton.gamma));

    triton.M = triton.L - triton.P;
    triton.E = keplerSolve(triton.M, triton.e, 1e-6, 20);
    triton.b = triton.a * Math.sqrt(1 - triton.e * triton.e);
    triton.N = triton.N_e + atan2d(sind(triton.gamma) * sind(triton.theta), 
                                   cosd(triton.gamma) * sind(triton.J_e) + sind(triton.gamma) * cosd(triton.J_e) * cosd(triton.theta));
    triton.J = sind(triton.gamma) * sind(triton.theta) / sind(triton.N - triton.N_e);

    triton.osvPeri = keplerPerifocal(triton.a, triton.b, triton.E, planetData['saturn'].mu, JTtdb);


    console.log(triton);
}