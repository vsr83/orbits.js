import { rotateCart1d, rotateCart2d, rotateCart3d } from "./Rotations.js";
import { nutationTerms } from "./Nutation.js";
import { timeGast } from "./Time.js";
import { cosd, sind, vecDiff, norm, atand, atan2d, asind, rad2Deg, vecSum } from "./MathUtils.js";

/*
 * References:
 *  [1] E. Suirana, J. Zoronoza, M. Hernandez-Pajares - GNSS Data Processing -
 *  Volume I: Fundamentals and Algorithms, ESA 2013. 
 */

/**
 * Convert coordinates from ecliptic to equatorial system.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ecliptic frame.
 * 
 * @returns Orbit state vector in equatorial frame.
 */
export function coordEclEq(osv)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;
    const T2 = T*T;
    const T3 = T2*T;
    const T4 = T3*T;
    const T5 = T4*T;

    const eps = 23.439279444444445 - 0.013010213611111*T - 5.086111111111112e-08*T2 
        + 0.565e-07*T3 - 1.6e-10*T4 - 1.205555555555555e-11*T5;
    const rEq = rotateCart1d(osv.r, -eps);

    // The change in eps is less than arcminute in century. Thus, the influence to the
    // velocity of objects in the solar system is small.
    const vEq = rotateCart1d(osv.v, -eps);

    return {r : rEq, v : vEq, JT : osv.JT};
}

/**
 * Convert coordinates from equatorial to ecliptic system.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in equatorial frame.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordEqEcl(osv)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;
    const T2 = T*T;
    const T3 = T2*T;
    const T4 = T3*T;
    const T5 = T4*T;

    const eps = 23.439279444444445 - 0.013010213611111*T - 5.086111111111112e-08*T2 
        + 0.565e-07*T3 - 1.6e-10*T4 - 1.205555555555555e-11*T5;
    T = matrix_rot1d(-eps);

    const rEcl = rotateCart1d(osv.r, eps);
    const vEcl = rotateCart1d(osv.v, eps);

    return {r : rEcl, v : vEcl, JT : osv.JT}
}

/**
 * Convert coordinates from J2000 to the Mean-of-Date (MoD) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in J2000 frame.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordJ2000Mod(osv)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;
    const T2 = T*T;
    const T3 = T2*T;

    const z =      0.6406161388 * T + 3.0407777777e-04 * T2 + 5.0563888888e-06 * T3;
    const theta =  0.5567530277 * T - 1.1851388888e-04 * T2 - 1.1620277777e-05 * T3;
    const zeta =   0.6406161388 * T + 8.3855555555e-05 * T2 + 4.9994444444e-06 * T3;

    const rMod = rotateCart3d(rotateCart2d(rotateCart3d(osv.r, -zeta), theta), -z);
    const vMod = rotateCart3d(rotateCart2d(rotateCart3d(osv.v, -zeta), theta), -z);

    return {r : rMod, v : vMod, JT : osv.JT};
}

/**
 * Convert coordinates from Mean-of-Date (MoD) to the J2000 frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in J2000 frame.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordModJ2000(osv)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;
    const T2 = T*T;
    const T3 = T2*T;

    const z =      0.6406161388 * T + 3.0407777777e-04 * T2 + 5.0563888888e-06 * T3;
    const theta =  0.5567530277 * T - 1.1851388888e-04 * T2 - 1.1620277777e-05 * T3;
    const zeta =   0.6406161388 * T + 8.3855555555e-05 * T2 + 4.9994444444e-06 * T3;

    const rJ2000 = rotateCart3d(rotateCart2d(rotateCart3d(osv.r, z), -theta), zeta);
    const vJ2000 = rotateCart3d(rotateCart2d(rotateCart3d(osv.v, z), -theta), zeta);

    return {r : rJ2000, v : vJ2000, JT : osv.JT};
}

/**
 * Convert coordinates from Mean-of-Date (MoD) to the True-of-Date (ToD) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in MoD frame.
 * @param {*} nutTerms 
 *      Nutation terms object with fields eps, deps and dpsi. If empty, nutation 
 *      is computed.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordModTod(osv, nutTerms)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;

    if (nutTerms === undefined)
    {
        nutTerms = nutationTerms(T);
    }

    const rTod = rotateCart1d(rotateCart3d(rotateCart1d(osv.r, nutTerms.eps), -nutTerms.dpsi), 
        - nutTerms.eps - nutTerms.deps);
    const vTod = rotateCart1d(rotateCart3d(rotateCart1d(osv.v, nutTerms.eps), -nutTerms.dpsi),
        - nutTerms.eps - nutTerms.deps);

    return {r : rTod, v : vTod, JT : osv.JT};
}

/**
 * Convert coordinates from True-of-Date (ToD) to the Mean-of-Date (MoD) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ToD frame.
 * @param {*} nutTerms 
 *      Nutation terms object with fields eps, deps and dpsi. If empty, nutation 
 *      is computed.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordTodMod(osv, nutTerms)
{
    // Julian centuries after J2000.0 epoch.
    const T = (osv.JT - 2451545.0) / 36525.0;

    if (nutTerms === undefined)
    {
        nutTerms = nutationTerms(T);
    }

    const rMod = rotateCart1d(rotateCart3d(rotateCart1d(osv.r, nutTerms.eps + nutTerms.deps), 
        nutTerms.dpsi), -nutTerms.eps);
    const vMod = rotateCart1d(rotateCart3d(rotateCart1d(osv.v, nutTerms.eps + nutTerms.deps), 
        nutTerms.dpsi), -nutTerms.eps);

    return {r : rMod, v : vMod, JT : osv.JT};
}

/**
 * Convert coordinates from True-of-Date (ToD) to the Pseudo-Earth-Fixed (PEF)
 * frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ToD frame.
 * @param {*} nutTerms 
 *      Nutation terms object with fields eps, deps and dpsi. If empty, nutation 
 *      is computed.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordTodPef(osv, nutParams)
{
    const GAST = timeGast(osv.JT, nutParams);
    const rPef = rotateCart3d(osv.r, GAST);
    const vPef = rotateCart3d(osv.v, GAST);

    // Alternative expression for the GMST is \sum_{i=0}^3 k_i MJD^i.
    const k1 = 360.985647366;
    const k2 = 2.90788e-13;
    const k3 = -5.3016e-22;
    const MJD = osv.JT - 2451544.5;
    
    // Compute time-derivative of the GAST to convert velocities:
    const dGASTdt = (1/86400.0) * (k1 + 2*k2*MJD + 3*k3*MJD*MJD);
    vPef[0] += dGASTdt * (Math.PI/180.0) * (-sind(GAST) * osv.r[0] + cosd(GAST) * osv.r[1]);
    vPef[1] += dGASTdt * (Math.PI/180.0) * (-cosd(GAST) * osv.r[0] - sind(GAST) * osv.r[1]);

    return {r : rPef, v : vPef, JT : osv.JT};
}

/**
 * Convert coordinates from Pseudo-Earth-Fixed (PEF) to the True-of-Date (ToD) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in PEF frame.
 * @param {*} nutTerms 
 *      Nutation terms object with fields eps, deps and dpsi. If empty, nutation 
 *      is computed.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
 export function coordPefTod(osv, nutParams)
 {
     const GAST = timeGast(osv.JT, nutParams);
     const rTod = rotateCart3d(osv.r, -GAST);
 
     // Alternative expression for the GMST is \sum_{i=0}^3 k_i MJD^i.
     const k1 = 360.985647366;
     const k2 = 2.90788e-13;
     const k3 = -5.3016e-22;
     const MJD = osv.JT - 2451544.5;
     
     // Compute time-derivative of the GAST to convert velocities:     
     const dGASTdt = (1/86400.0) * (k1 + 2*k2*MJD + 3*k3*MJD*MJD);

     let dRdt_rTod = [0, 0, 0];
     dRdt_rTod[0] = dGASTdt * (Math.PI/180.0) * (-sind(GAST) * rTod[0] + cosd(GAST) * rTod[1]); 
     dRdt_rTod[1] = dGASTdt * (Math.PI/180.0) * (-cosd(GAST) * rTod[0] - sind(GAST) * rTod[1]); 

     const vTod = rotateCart3d([osv.v[0] - dRdt_rTod[0], 
                                osv.v[1] - dRdt_rTod[1], 
                                osv.v[2]], -GAST);
 
     return {r : rTod, v : vTod, JT : osv.JT};
 }

 /**
 * Convert coordinates from PEF to the Earth-Fixed (EFI) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in PEF frame.
 * @param {*} xp 
 *      Polar motion parameter (in degrees).
 * @param {*} yp
 *      Polar motion parameter (in degrees).
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordPefEfi(osv, xp, yp)
{
    const rEfi = rotateCart2d(rotateCart1d(osv.r, -yp), -xp);
    const vEfi = rotateCart2d(rotateCart1d(osv.v, -yp), -xp);

    return {r : rEfi, v : vEfi, JT : osv.JT};
}

 /**
 * Convert coordinates from Earth-Fixed (EFI) to the PEF frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in EFI frame.
 * @param {*} xp 
 *      Polar motion parameter (in degrees).
 * @param {*} yp
 *      Polar motion parameter (in degrees).
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordEfiPef(osv, xp, yp)
{
    const rPef = rotateCart1d(rotateCart2d(osv.r, xp), yp);
    const vPef = rotateCart1d(rotateCart2d(osv.v, xp), yp);

    return {r : rPef, v : vPef, JT : osv.JT};
}
  
/**
 * Compute the latitude, longitude and height in the WGS84 system from EFI
 * position.
 * 
 * @param {*} r 
 *      The position in EFI (in meters).
 * @param {*} maxIter 
 *      The maximum number of iterations (default 5)
 * @param {*} maxErr 
 *      The maximum relative error in meters (default 1e-10)
 * @param {*} verbose 
 *      Display convergence information to console.
 * @returns Object with fields lat, lon, h for latitude (degrees), 
 *          longitude (degrees) and height above the ellipsoid (meters).
 */
export function coordEfiWgs84(r, maxIter, maxErr, verbose)
{
    if (verbose === undefined)
    {
        verbose = false;
    }
    if (maxIter === undefined)
    {
        maxIter = 5;
    }
    if (maxErr === undefined)
    {
        maxErr = 1e-10;
    }

    // Semi-major axis:
    const a = 6378137;
    // Semi-major axis:
    const b = 6356752.314245;
    // Eccentricity sqrt(1 - (b*b)/(a*a))
    const ecc = 0.081819190842966;
    const ecc2 = ecc*ecc;
    
    // Longitude (B.4)
    const lon = atan2d(r[1], r[0]);
    // Initial value for latitude (B.5)
    const p = Math.sqrt(r[0]*r[0] + r[1]*r[1]);
    let lat = atand((r[2] / p) / (1.0 - ecc2)); 
    let h = 0;

    for (let iter = 0; iter < maxIter; iter++)
    {
        // Iteration (B.6)
        const N = a/Math.sqrt(1 - Math.pow(ecc * sind(lat), 2));
        h = p/cosd(lat) - N;
        lat = atand((r[2]/p)/(1 - ecc2*(N/(N + h))));

        const rIter = coordWgs84Efi(lat, lon, h);
        const err = norm(vecDiff(rIter, r)) / norm(r);

        if (verbose)
        {
            console.log("iter " + iter + " lat " + lat + " error " + err);
        }

        if (err < maxErr)
        { 
            break;
        }
    }

    return {lat : lat, lon : lon, h : h};
}

/**
 * Convert the latitude, longitude and height in the WGS84 system to the EFI
 * position.
 * 
 * @param {*} lat
 *      The latitude (in degrees).
 * @param {*} lon
 *      The longitude (in degrees).
 * @param {*} h
 *      The height above the ellipsoid (in meters).
 * @returns Position in EFI frame.
 */
export function coordWgs84Efi(lat, lon, h)
{
    // Semi-major axis:
    const a = 6378137;
    //  Eccentricity sqrt(1 - (b*b)/(a*a))
    const ecc = 0.081819190842966;
    const ecc2 = ecc*ecc;
    
    const N = a/Math.sqrt(1 - Math.pow(ecc*sind(lat), 2));
    const r = [(N + h) * cosd(lat)*cosd(lon),
               (N + h) * cosd(lat)*sind(lon),
               ((1 - ecc2)*N + h)*sind(lat)];

    return r;
}

 /**
 * Convert coordinates from EFI to the East-North-Up (ENU) frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in EFI frame.
 * @param {*} lat
 *      Topoentric latitude (in degrees).
 * @param {*} lon
 *      Topocentric longitude (in degrees).
 * @param {*} h
 *      Observer altitude (in meters).
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordEfiEnu(osv, lat, lon, h)
{
    const rObs = coordWgs84Efi(lat, lon, h);
    const rEnu = rotateCart1d(rotateCart3d(vecDiff(osv.r, rObs), 90 + lon), 
                            90 - lat);
    const vEnu = rotateCart1d(rotateCart3d(osv.v, 90 + lon), 90 - lat);
    
    return {r : rEnu, v : vEnu, JT : osv.JT};
}

 /**
 * Convert coordinates from ENU to the EFI frame.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ENU frame.
 * @param {*} lat
 *      Topoentric latitude (in degrees).
 * @param {*} lon
 *      Topocentric longitude (in degrees).
 * @param {*} h
 *      Observer altitude (in meters).
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function coordEnuEfi(osv, lat, lon, h)
{
    const rObs = coordWgs84Efi(lat, lon, h);
    const rEnu = vecSum(rotateCart3d(rotateCart1d(osv.r, lat - 90), -90 - lon), rObs);
    const vEnu = rotateCart3d(rotateCart1d(osv.v, lat - 90), -90 - lon);
    
    return {r : rEnu, v : vEnu, JT : osv.JT};
}
  
/**
 * Compute azimuth and elevation from ENU coordinates. The azimuth is
 * measured clockwise from North.
 * 
 * @param {*} osv
 *      Orbit state vector with fields r, v and JT in ENU frame.
 * @returns Object with az, el fields for azimuth and elevation.
 */
export function coordEnuAzEl(osv)
{
    const rNorm = norm(osv.r);
    const ru = [osv.r[0]/rNorm, osv.r[1]/rNorm, osv.r[2]/rNorm];

    const az = atan2d(ru[0], ru[1]);
    const el = asind(ru[2]);

    // TODO:
    const dazdt = 0;
    const deldt = 0;

    return {az : az, el : el, dazdt : 0, deldt : 0, dist : rNorm, JT : osv.JT};
}

/**
 * Compute ENU coordinates from azimuth and elevation. 
 * 
 * @param {*} osv
 *      Orbit state vector with fields az, el, dazdt, deldt and dist.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
 export function coordAzElEnu(osv)
 {
    const r = [osv.dist * sind(osv.az) * cosd(osv.el), 
               osv.dist * cosd(osv.az) * cosd(osv.el), 
               osv.dist * sind(osv.el)];

    const v = [0, 0, 0];
 
    return {r : r, v : v, JT : osv.JT};
}
