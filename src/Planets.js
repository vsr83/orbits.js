import {norm, vecDiff, vecMul, acosd, asind, sind, cosd, tand, dot, atand, atan2d} from "./MathUtils.js";
import { rotateCart1d, rotateCart2d, rotateCart3d } from "./Rotations.js";
import { keplerSolve } from "./Kepler.js";

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

    const rBcrsJ2000_1 = coordB1950J2000({r : rBcrs1950_1, v : [0, 0, 0], JT : JTtdb}).r;
    const rBcrsJ2000_2 = coordB1950J2000({r : rBcrs1950_2, v : [0, 0, 0], JT : JTtdb}).r;
    const rBcrsJ2000_3 = coordB1950J2000({r : rBcrs1950_3, v : [0, 0, 0], JT : JTtdb}).r;
    const rBcrsJ2000_4 = coordB1950J2000({r : rBcrs1950_4, v : [0, 0, 0], JT : JTtdb}).r;

    return {io : rBcrsJ2000_1, europa : rBcrsJ2000_2, ganymede : rBcrsJ2000_3, 
        callisto : rBcrsJ2000_4};
}

/**
 * Compute positions of the major moons of Saturn.
 * This method is based on the section 9.9 of 
 * Urban, Seidelmann - Explanatory Supplement to the Astronomical Almanac, 3rd edition, 2012.
 * 
 * @param {*} JTtdb 
 *      Julian time (TDB).
 * @returns Position vector for each satellite.
 */
export function saturnSatellites(JTtdb)
{
    // (9.56)-(9.68)
    // fractional days after 1889-03-31 12:00:00.
    const d = JTtdb - 2411093.0;
    const t = d/365.25;

    const T = 5.0616 * ((JTtdb - 2433282.423) / 365.25 + 1950.0 - 1866.06);
    
    // Astronomical unit:
    const au = 1.495978707e11;

    // Semi-major axis (m) (9.65-9.68)
    const a_1 = 0.00124171 * au;
    const a_2 = 0.00158935 * au;
    const a_3 = 0.00197069 * au;
    const a_4 = 0.00252413 * au;

    // Mean motion (degrees / day) (9.65-9.68)
    const n_1 = 381.994516;
    const n_2 = 262.7319052;
    const n_3 = 190.697920278;
    const n_4 = 131.534920026;

    // Eccentricity (9.65-9.68)
    const e_1 = 0.01986;
    const e_2 = 0.00532;
    const e_3 = 0.000212;
    const e_4 = 0.001715;

    // Inclination of the orbit w.r.t. equatorial plane of Saturn (degrees) (9.65-9.68).
    const gamma_1 = 1.570;
    const gamma_2 = 0.036;
    const gamma_3 = 1.1121;
    const gamma_4 = 0.0289;

    // Longitude of the ascending node (degrees) (9.65-9.68).
    const theta_1_1 = 49.4 - 365.025 * t;
    const theta_1_2 = 145.0 - 152.7 * t;
    const theta_1_3 = 111.41 - 72.24754 * t;
    const theta_1_4 = 228.0 - 30.6197 * t;

    // Mean longitude (degrees) (9.65-9.68).
    const L_1_1 = 128.839 + n_1 * d 
                - 43.415 * sind(T) 
                -  0.714 * sind(3.0*T) 
                -  0.020 * sind(5.0*T);
    const L_1_2 = 200.155 + n_2 * d 
                + (15.38 / 60.0) * sind(59.4 + 32.72*t) 
                + (13.04 / 60.0) * sind(119.2 + 93.18*t);
    const L_1_3 = 284.9982 + n_3 * d
                + 2.0751 * sind(T)
                + 0.0341 * sind(3.0*T)
                + 0.0010 * sind(5.0*T);
    const L_1_4 = 255.1183 + n_4 * d
                - (0.88 / 60.0) * sind(59.4 + 32.73*t)
                - (0.75 / 60.0) * sind(119.2 + 93.18*t);

    // Longitude of the pericenter w.r.t. vernal equinox (degrees) (9.65-9.68).
    const P_1 = 107.0 + 365.560 * t;
    const P_2 = 312.7 +  123.42 * t;
    const P_3 =  97.0 +   72.29 * t;
    const P_4 = 173.6 + 30.8381 * t;

    // This is for J2000.0 epoch, which is probably incorrect.
    const eps = 23.439279444444445;

    // Angle along ecliptic between the vernal equinox and the corresponding 
    // point on the equatorial plane of Saturn (degrees) (Figure 9.13).
    const Omega_e = 168.8387;

    // Obliquity of ecliptic for Saturn (degrees) (Figure 9.13).
    const i_e = 28.0653;

    function positionBcrs(a, e, gamma, theta_1, L_1, P)
    {
        // This is for J2000.0 epoch, which is probably incorrect.
        const eps = 23.439279444444445;

        const Omega_e = 168.8387;
        const i_e = 28.0653;

        // Distance between the intersection of equatorial and ecliptic planes and the ecliptic
        // node of the satellite (9.69)
        const BF = atan2d(sind(gamma)*sind(theta_1 - Omega_e), 
                          cosd(gamma)*sind(i_e) + sind(gamma)*cosd(i_e)*cosd(theta_1 - Omega_e));
        // Inclination of the satellite orbits w.r.t. ecliptic.
        const i = asind((sind(gamma) * sind(theta_1 - Omega_e)) / sind(BF));
        // Equation (9.70)
        const FC = atan2d(sind(theta_1 - Omega_e)*sind(i_e),
                         cosd(i_e)*sind(gamma) + sind(i_e)*cosd(gamma)*cosd(theta_1 - Omega_e));
        // Angle between the vernal equinox and the node of the satellite orbit w.r.t. the equator
        // of Earth (9.71).
        const N = atan2d(sind(i)*sind(Omega_e + BF), 
                         cosd(i)*cosd(eps) + sind(i)*cosd(eps)*cosd(Omega_e + BF));
        // Inclination of the satellite orbits w.r.t. Earth equator.
        const J = asind(sind(i)*sind(Omega_e + BF) / sind(N));

        // Angle between satellite orbit nodes w.r.t. Earth and Ecliptic (9.72).
        const EF = atan2d(sind(Omega_e + BF)*sind(eps), 
                          cosd(eps)*sind(i) + sind(eps)*cosd(i)*cosd(Omega_e + BF));

        // Angle between intersections of the equatorial plane of Saturn with the ecliptic 
        // and Earth equator planes (9.74).
        const AB = atan2d(sind(eps)*sind(Omega_e), 
                          cosd(eps)*sind(i_e) + sind(eps)*cosd(i_e)*cosd(Omega_e));
        const J_e = asind(sind(eps)*sind(Omega_e) / sind(AB));
        
        // Angle from the intersection of the orbital plane with the equator of Saturn
        // to the pericenter.
        const CD = P - theta_1;

        // Mean anomaly (9.75).
        const M = L_1 - P;

        // Solve eccentric anomaly.
        const E = keplerSolve(M, e, 1e-6, 20);
    
        // (9.19) : Solve coordinates on the orbital plane (Perifocal coordinates).
        const rPer = [a * (cosd(E) - e),
                      a * Math.sqrt(1 - e * e) * sind(E),
                      0];

        // B1950.0 Earth equatorial coordinates.
        const rBcrs1950 = rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(rPer,
                            -FC - CD), -i), -Omega_e - BF), -eps);
        // J2000.0 equatorial.
        const rBcrsJ2000 = coordB1950J2000({r : rBcrs1950, v : [0, 0, 0], JT : JTtdb}).r;

        return rBcrsJ2000;
    }

    // Compute positions
    const rBcrsJ2000_1 = positionBcrs(a_1, e_1, gamma_1, theta_1_1, L_1_1, P_1);
    const rBcrsJ2000_2 = positionBcrs(a_2, e_2, gamma_2, theta_1_2, L_1_2, P_2);
    const rBcrsJ2000_3 = positionBcrs(a_3, e_3, gamma_3, theta_1_3, L_1_3, P_3);
    const rBcrsJ2000_4 = positionBcrs(a_4, e_4, gamma_4, theta_1_4, L_1_4, P_4);

    // (9.76) - (9.77)
    const a_5 = 0.003524 * au;
    const n_5 = 79.6900400700;
    const gamma_0_5 = 0.3305;
    const pi_5 = 305.0 + 10.2077 * t;
    const omega_T_5 = 276.49 + 0.5219 * (JTtdb - 2411368.0) / 365.25;
    const N_T_5 = 44.5 - 0.5219 * (JTtdb - 2411368.0) / 365.25;
    const kappa = 57.29578;
    const e_sin_omega_5 = 0.000210 * sind(pi_5) + 0.00100 * sind(omega_T_5);
    const e_cos_omega_5 = 0.000210 * cosd(pi_5) + 0.00100 * cosd(omega_T_5);

    // e^2 * sin^2 x + e^2 * cos^2 x = e^2
    const e_5 = Math.sqrt(e_sin_omega_5*e_sin_omega_5 + e_cos_omega_5*e_cos_omega_5);
    const omega_5 = atan2d(e_sin_omega_5, e_cos_omega_5) / e_5;

    const lambda_5 = 359.4727 + n_5 * d 
                   + kappa * sind(gamma_0_5) * tand(0.5 * i_e) * sind(356.87 - 10.2077*t);
    const i_5 = i_e - 0.0455 
              + kappa * sind(gamma_0_5) * cosd(356.87 - 10.2077*t)
              + 0.0201 * cosd(N_T_5);
    const Omega_5 = Omega_e - 0.0078 
                  + (kappa * sind(gamma_0_5) * sind(356.87 - 10.2077*t)
                  +  0.0201 * sind(N_T_5)) / sind(i_e);

    const M_5 = lambda_5 - omega_5;
    const E_5 = keplerSolve(M_5, e_5, 1e-6, 20);

    // (9.19) : Solve coordinates on the orbital plane (Perifocal coordinates).
    const rPer_5 = [a_5 * (cosd(E_5) - e_5),
                    a_5 * Math.sqrt(1 - e_5 * e_5) * sind(E_5),
                    0];

    // B1950.0 Earth equatorial coordinates.
    const rBcrs1950_5 = rotateCart1d(rotateCart3d(rotateCart1d(rotateCart3d(rPer_5,
                        Omega_5 - omega_5), -i_5), -Omega_5), -eps);
    // J2000.0 equatorial.
    const rBcrsJ2000_5 = coordB1950J2000({r : rBcrs1950_5, v : [0, 0, 0], JT : JTtdb}).r;

    return {
        mimas     : rBcrsJ2000_1, 
        enceladus : rBcrsJ2000_2, 
        tethys    : rBcrsJ2000_3, 
        dione     : rBcrsJ2000_4,
        rhea      : rBcrsJ2000_5
    };
}