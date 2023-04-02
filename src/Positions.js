import { correlationUt1Tdb, correlationUt1Utc, polarMotion } from "./TimeCorrelation.js";
import { vsop87 } from '../src/Vsop87A.js';
import {norm, vecMul, vecSum, atand, acosd, atan2d, asind, linComb, vecDiff, tand, sind, cosd, dot} from "../src/MathUtils.js";
import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef, coordEfiWgs84, coordWgs84Efi, 
    coordEfiEnu, coordEnuEfi, coordEnuAzEl, coordAzElEnu, coordPerIne, coordInePer } from '../src/Frames.js';
import { aberrationStellarCart } from '../src/Aberration.js';
import { limitAngleDeg } from "./Angles.js";
import { planetMagnitude } from "./Planets.js";
import { hipparcosGet, annualParallax, parallaxToDistance } from "./Hipparcos.js";

const planetData = {
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

export const defaultCorrections = {
    refraction : false,
    refractionParameters : {
        temperature : 10.0,
        pressure : 1010.0
    },
    lightTime : true,
    properMotion : true,
    stellarAberration : true,
    diurnalAberration : true,
    polarMotion : true
};

export const defaultOutputs = {
    last : true,
    angularDiam : true,
    lightTime : true,
    deltaT : true,
    fracIlluminated : true,
    anglesPrecession : true,
    anglesNutation : true,
    anglesEarthRot : true,
    anglesPolar : true
};

export const defaultObserver = {
    lon : 23.8283,
    lat : 61.4945763,
    h   : 121.9157
};

/**
 * Compute right ascension from Cartesian coordinates in an equatorial frame.
 * 
 * @param {*} r 
 *      The Cartesian coordinates.
 * @param {*} limit180 
 *      Limit to [-180, 180) degree interval.
 * @returns The right ascension.
 */
function getRa(r, limit180)
{
    if (limit180 === undefined)
    {
        limit180 = false;
    }

    if (limit180)
    {
        return atan2d(r[1], r[0]);
    }
    else 
    {
        return limitAngleDeg(atan2d(r[1], r[0]));
    }
}
 
/**
 * Compute declination from Cartesian coordinates in an equatorial frame.
 * 
 * @param {*} r 
 *      The Cartesian coordinates.
 * @returns The right ascension.
 */
function getDec(r)
{
    return asind(r[2] / norm(r));
}
 
 /**
  * Compute azimuth from Cartesian coordinates in ENU frame.
  * 
  * @param {*} r 
  *      The Cartesian coordinates.
  * @param {*} limit180 
  *      Limit to [-180, 180) degree interval.
  * @returns The azimuth.
  */
function getAz(r, limit180)
{
    if (limit180 === undefined)
    {
        limit180 = false;
    }

    if (limit180)
    {
        return atan2d(r[0], r[1]);
    }
    else
    {
        return limitAngleDeg(atan2d(r[0], r[1]));
    }
}

/**
 * Compute outputs for a planet or the Sun.
 * 
 * @param {*} planetName 
 *      Name of the target ("mercury", "venus", "sun", "mars", ..)
 * @param {*} JTut1
 *      Julian time (UT1) 
 * @param {*} observer 
 *      Observer object with fields lat (degrees), lon (degrees) and
 *      h (meters).
 * @param {*} corrections 
 *      Set of corrections. If undefined, defaults are used.
 * @returns outputs
 */
export function computePlanet(planetName, JTut1, observer, corrections)
{
    if (observer === undefined)
    {
        observer = defaultObserver;
    }

    if (corrections === undefined)
    {
        corrections = defaultCorrections;
    }

    const JTutc = correlationUt1Utc(JTut1);
    const JTtdb = correlationUt1Tdb(JTut1);

    const outputs = {
        target : {
            name : planetName
        },
        time : {
            JTut1 : JTut1,
            JTtdb : JTtdb,
            JTutc : JTutc,
            deltaT : JTtdb - JTut1
        }, 
        parameters : {
        },
        osv : {
        },
        angles : {
        }
    };

    // Compute position of the target for light time evaluation:
    let lightTimeJT = 0.0;

    let posEclInitial;
    if (planetName == "sun")
    {
        const osvPlanet = vsop87('earth', JTtdb); 
        posEclInitial = osvPlanet.r;
        outputs.osv.eclHel = osvPlanet;
    }
    else 
    {
        const osvPlanet = vsop87(planetName, JTtdb);
        posEclInitial = vecDiff(osvPlanet.r, vsop87("earth", JTtdb).r);
        outputs.osv.eclHel = osvPlanet;
    }
    
    // Light-time in Julian days.
    if (corrections.lightTime)
    {
        lightTimeJT = (norm(posEclInitial) / 299.792458e6) / 86400.0;
    }
    outputs.parameters.lightTimeSeconds = lightTimeJT * 86400.0;

    // Compute position w.r.t. the center of the Earth.
    let osvEcl;
    if (planetName == "sun")
    {
        osvEcl = vsop87('earth', JTtdb - lightTimeJT);
        osvEcl.r = vecMul(osvEcl.r, -1);
        osvEcl.v = vecMul(osvEcl.v, -1);
        outputs.parameters.earthPos = osvEcl.r;
    }
    else 
    {
        const osvEclEarth = vsop87('earth', JTtdb);
        osvEcl = vsop87(planetName, JTtdb - lightTimeJT);
        osvEcl.r = vecDiff(osvEcl.r, osvEclEarth.r);
        osvEcl.v = vecDiff(osvEcl.v, osvEclEarth.v);
        outputs.parameters.earthPos = osvEclEarth.r;
    }

    osvEcl.JT = JTtdb;
    const osvJ2000 = coordEclEq(osvEcl);

    // Handle stellar and diurnal aberration:
    if (!(planetName == "sun") && corrections.stellarAberration)
    {
        let vDiurnal = [0, 0, 0];

        if (corrections.diurnalAberration)
        {
            const rObsEfi = coordWgs84Efi(observer.lat, observer.lon, observer.h);
            const osvObsPef = coordEfiPef({r : rObsEfi, v: [0, 0, 0], JT: JTut1}, 0, 0);
            const osvObsTod = coordPefTod(osvObsPef);
            const osvObsMod = coordTodMod(osvObsTod);
            const osvObsJ2000 = coordTodMod(osvObsMod);
            vDiurnal = osvObsJ2000.v;
        }

        osvJ2000.r = aberrationStellarCart(osvJ2000.JT, osvJ2000.r, vDiurnal);
    }

    // Perform conversions between geocentric systems.
    const osvMod = coordJ2000Mod(osvJ2000);
    const osvTod = coordModTod(osvMod);
    osvTod.JT = JTut1;
    const osvPef = coordTodPef(osvTod);
    // Apply polar motion.
    let dx = 0;
    let dy = 0;
    if (corrections.polarMotion)
    {
        [dx, dy] = polarMotion(JTut1);
    }
    const osvEfi = coordPefEfi(osvPef, dx, dy);
    const osvEnu = coordEfiEnu(osvEfi, observer.lat, observer.lon, observer.h);

    // Export OSVs:
    outputs.osv.eclGeo = osvEcl;
    outputs.osv.J2000 = osvJ2000;
    outputs.osv.mod = osvMod;
    outputs.osv.tod = osvTod;
    outputs.osv.pef = osvPef;
    outputs.osv.efi = osvEfi;
    outputs.osv.enu = osvEnu;

    // Convert OSV locations to angles:
    outputs.angles.eclHel = {
        lon  : getRa(outputs.osv.eclHel.r, true),
        lat  : getDec(outputs.osv.eclHel.r),
        dist : norm(outputs.osv.eclHel.r)
    };
    outputs.angles.eclGeo = {
        lon : getRa(outputs.osv.eclGeo.r, false),
        lat : getDec(outputs.osv.eclGeo.r),
        dist : norm(outputs.osv.eclGeo.r)
    };
    outputs.angles.J2000 = {
        ra   : getRa(outputs.osv.J2000.r, false),
        dec  : getDec(outputs.osv.J2000.r),
        dist : norm(outputs.osv.J2000.r)
    };
    outputs.angles.mod = {
        ra   : getRa(outputs.osv.mod.r, false),
        dec  : getDec(outputs.osv.mod.r),
        dist : norm(outputs.osv.mod.r)
    };
    outputs.angles.tod = {
        ra   : getRa(outputs.osv.tod.r, false),
        dec  : getDec(outputs.osv.tod.r),
        dist : norm(outputs.osv.tod.r)
    };
    outputs.angles.pef = {
        lon  : getRa(outputs.osv.pef.r, false),
        lat  : getDec(outputs.osv.pef.r),
        dist : norm(outputs.osv.pef.r)
    };
    outputs.angles.efi = {
        lon  : getRa(outputs.osv.efi.r, true),
        lat  : getDec(outputs.osv.efi.r),
        dist : norm(outputs.osv.efi.r)
    };
    outputs.angles.enu = {
        az   : getAz(outputs.osv.enu.r, true),
        alt  : getDec(outputs.osv.enu.r),
        dist : norm(outputs.osv.enu.r)
    };

    outputs.target.angDiameter = 2.0 * atand(planetData[planetName].diameter 
        / (2.0 * outputs.angles.enu.dist));

    const magData = planetMagnitude(planetName, outputs.osv.eclHel.r, outputs.osv.eclGeo.r);
    outputs.target.fracIlluminated = magData.fracIlluminated;
    outputs.target.magnitude = magData.magnitude;
    outputs.target.apparentDisk = magData.apparentDisk;
    outputs.target.surfaceBrightness = magData.surfaceBrightness;


    return outputs;
}

/**
 * Compute outputs for a star.
 * 
 * @param {*} starName 
 *      Name of the target 
 * @param {*} JTut1
 *      Julian time (UT1) 
 * @param {*} observer 
 *      Observer object with fields lat (degrees), lon (degrees) and
 *      h (meters).
 * @param {*} corrections 
 *      Set of corrections. If undefined, defaults are used.
 * @param {*} osvEarthEcl
 *      OSV of the Earth in the ecliptic heliocentric frame.
 * @returns outputs
 */
export function computeStar(starName, JTut1, observer, corrections, osvEarthEcl)
{
    if (observer === undefined)
    {
        observer = defaultObserver;
    }

    if (corrections === undefined)
    {
        corrections = defaultCorrections;
    }

    const JTutc = correlationUt1Utc(JTut1);
    const JTtdb = correlationUt1Tdb(JTut1);

    const outputs = {
        target : {
            name : starName
        },
        time : {
            JTut1 : JTut1,
            JTtdb : JTtdb,
            JTutc : JTutc,
            deltaT : JTtdb - JTut1
        }, 
        parameters : {
        },
        osv : {
        },
        angles : {
        }
    };

    let hipData = hipparcosGet(starName, JTtdb);

    // Position of the Earth is required for parallax correction.
    if (osvEarthEcl === undefined)
    {
        osvEarthEcl = vsop87('earth', JTtdb);
    }
    const osvEarthEq = coordEclEq(osvEarthEcl);

    hipData = annualParallax(hipData, osvEarthEq.r);

    const distance = parallaxToDistance(hipData.Plx / (3600.0 * 1000.0));

    console.log(distance + " " + hipData.DE + " " + hipData.RA);

    const rJ2000 = [distance * cosd(hipData.DE) * cosd(hipData.RA),
                    distance * cosd(hipData.DE) * sind(hipData.RA),
                    distance * sind(hipData.DE)];
    const vJ2000 = [0, 0, 0];

    const osvJ2000 = {r : rJ2000, v : vJ2000, JT : JTtdb};

    // Handle stellar and diurnal aberration:
    if (corrections.stellarAberration)
    {
        let vDiurnal = [0, 0, 0];

        if (corrections.diurnalAberration)
        {
            const rObsEfi = coordWgs84Efi(observer.lat, observer.lon, observer.h);
            const osvObsPef = coordEfiPef({r : rObsEfi, v: [0, 0, 0], JT: JTut1}, 0, 0);
            const osvObsTod = coordPefTod(osvObsPef);
            const osvObsMod = coordTodMod(osvObsTod);
            const osvObsJ2000 = coordTodMod(osvObsMod);
            vDiurnal = osvObsJ2000.v;
        }

        osvJ2000.r = aberrationStellarCart(osvJ2000.JT, osvJ2000.r, vDiurnal);
    }

    // Perform conversions between geocentric systems.
    const osvGeo = coordEqEcl(osvJ2000);
    const osvEcl = {r : vecSum(osvGeo.r, osvEarthEcl.r), v : osvGeo.v, JT : osvGeo.JT};
    const osvMod = coordJ2000Mod(osvJ2000);
    const osvTod = coordModTod(osvMod);
    osvTod.JT = JTut1;
    const osvPef = coordTodPef(osvTod);
    // Apply polar motion.
    let dx = 0;
    let dy = 0;
    if (corrections.polarMotion)
    {
        [dx, dy] = polarMotion(JTut1);
    }
    const osvEfi = coordPefEfi(osvPef, dx, dy);
    const osvEnu = coordEfiEnu(osvEfi, observer.lat, observer.lon, observer.h);

    // Export OSVs:
    outputs.osv.eclHel = osvEcl;
    outputs.osv.eclGeo = osvGeo;
    outputs.osv.J2000 = osvJ2000;
    outputs.osv.mod = osvMod;
    outputs.osv.tod = osvTod;
    outputs.osv.pef = osvPef;
    outputs.osv.efi = osvEfi;
    outputs.osv.enu = osvEnu;

    // Convert OSV locations to angles:
    outputs.angles.eclHel = {
        lon  : getRa(outputs.osv.eclHel.r, false),
        lat  : getDec(outputs.osv.eclHel.r),
        dist : norm(outputs.osv.eclHel.r)
    };
    outputs.angles.eclGeo = {
        lon : getRa(outputs.osv.eclGeo.r, false),
        lat : getDec(outputs.osv.eclGeo.r),
        dist : norm(outputs.osv.eclGeo.r)
    };
    outputs.angles.J2000 = {
        ra   : getRa(outputs.osv.J2000.r, false),
        dec  : getDec(outputs.osv.J2000.r),
        dist : norm(outputs.osv.J2000.r)
    };
    outputs.angles.mod = {
        ra   : getRa(outputs.osv.mod.r, false),
        dec  : getDec(outputs.osv.mod.r),
        dist : norm(outputs.osv.mod.r)
    };
    outputs.angles.tod = {
        ra   : getRa(outputs.osv.tod.r, false),
        dec  : getDec(outputs.osv.tod.r),
        dist : norm(outputs.osv.tod.r)
    };
    outputs.angles.pef = {
        lon  : getRa(outputs.osv.pef.r, true),
        lat  : getDec(outputs.osv.pef.r),
        dist : norm(outputs.osv.pef.r)
    };
    outputs.angles.efi = {
        lon  : getRa(outputs.osv.efi.r, true),
        lat  : getDec(outputs.osv.efi.r),
        dist : norm(outputs.osv.efi.r)
    };
    outputs.angles.enu = {
        az   : getAz(outputs.osv.enu.r, false),
        alt  : getDec(outputs.osv.enu.r),
        dist : norm(outputs.osv.enu.r)
    };

    outputs.target.magnitude = hipData.mag;
    outputs.target.angDiameter = 0.0;
    outputs.target.fracIlluminated = 1.0;
    outputs.target.apparentDisk = 0.0;
    outputs.target.surfaceBrightness = 0.0;

    return outputs;
}