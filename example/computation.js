/**
 * Compute right ascension from Cartesian coordinates in an equatorial frame.
 * 
 * @param {*} r 
 *      The Cartesian coordinates.
 * @returns The right ascension.
 */
 function getRa(r)
 {
     return orbitsjs.atan2d(r[1], r[0]);
 }
 
 /**
  * Compute declination from Cartesian coordinates in an equatorial frame.
  * 
  * @param {*} r 
  *      The Cartesian coordinates.
  * @returns The right ascension.
  */
  function getDecl(r)
 {
     return orbitsjs.asind(r[2] / orbitsjs.norm(r));
 }
 
 /**
  * Compute azimuth from Cartesian coordinates in ENU frame.
  * 
  * @param {*} r 
  *      The Cartesian coordinates.
  * @returns The azimuth.
  */
 function getAz(r)
 {
     return orbitsjs.atan2d(r[0], r[1]);
 }
 
/**
 * Compute the OSV for the Sun in J2000 frame.
 * 
 * @param {*} configuration 
 *      The configuration.
 * @param {*} timeStamp 
 *      The Javascript time stamp.
 * @returns The OSV.
 */
 function processSun(configuration, timeStamp)
 {
     const {JD, JT} = orbitsjs.timeJulianTs(timeStamp);
 
     const posVelEarthInitial = orbitsjs.vsop87('earth', JT);
 
     const diffPosInitial = orbitsjs.vecDiff([0, 0, 0], posVelEarthInitial.r);
     const diffVelInitial = orbitsjs.vecDiff([0, 0, 0], posVelEarthInitial.v);
 
     if (configuration.corrections.lightTime)
     {
         const distInitial = orbitsjs.norm(diffPosInitial);
         const lightTimeInitial = distInitial / 299792458.0;
 
         const posVelEarthUpdated = orbitsjs.vsop87('earth', 
                 JT - lightTimeInitial / 86400.0);
 
         const diffPosUpdated = orbitsjs.vecDiff([0, 0, 0], posVelEarthUpdated.r);
         const diffVelUpdated = orbitsjs.vecDiff([0, 0, 0], posVelEarthUpdated.v);
 
         return orbitsjs.coordEclEq({r: diffPosUpdated, v: diffVelUpdated, JT : JT});
     }
     else 
     {
         return orbitsjs.coordEclEq({r: diffPosInitial, v: diffVelInitial, JT : JT});
     }
 }
 
 
 /**
  * Compute the OSV for the Moon in J2000 frame.
  * 
  * @param {*} configuration 
  *      The configuration.
  * @param {*} timeStamp 
  *      The Javascript time stamp.
  * @returns The OSV.
  */
 function processMoon(configuration, timeStamp)
 {
     const {JD, JT} = orbitsjs.timeJulianTs(timeStamp);
 
     const rMoon = orbitsjs.moonPositionTod(JT);
     const osvTod = {r: rMoon, v: [0, 0, 0], JT: JT};
     const osvMod = orbitsjs.coordTodMod(osvTod);
     const osvJ2000 = orbitsjs.coordModJ2000(osvMod);
 
     return osvJ2000;
 }
  
 
 /**
  * Compute the OSV for a planet in J2000 frame.
  * 
  * @param {*} configuration 
  *      The configuration.
  * @param {*} timeStamp 
  *      The Javascript time stamp.
  * @returns The OSV.
  */
 function processPlanet(configuration, timeStamp)
 {
     const {JD, JT} = orbitsjs.timeJulianTs(timeStamp);
 
     const posVelEarth = orbitsjs.vsop87('earth', JT);
     const posVelInitial = orbitsjs.vsop87(configuration.target.toLowerCase(), JT);
 
     const diffPosInitial = orbitsjs.vecDiff(posVelInitial.r, posVelEarth.r);
     const diffVelInitial = orbitsjs.vecDiff(posVelInitial.v, posVelEarth.v);
 
     if (configuration.corrections.lightTime)
     {
         const distInitial = orbitsjs.norm(diffPosInitial);
         const lightTimeInitial = distInitial / 299792458.0;
 
         const posVelUpdated = orbitsjs.vsop87(configuration.target.toLowerCase(), 
                 JT - lightTimeInitial / 86400.0);
 
         const diffPosUpdated = orbitsjs.vecDiff(posVelUpdated.r, posVelEarth.r);
         const diffVelUpdated = orbitsjs.vecDiff(posVelUpdated.v, posVelEarth.v);
 
         return orbitsjs.coordEclEq({r: diffPosUpdated, v: diffVelUpdated, JT : JT});
     }
     else 
     {
         return orbitsjs.coordEclEq({r: diffPosInitial, v: diffVelInitial, JT : JT});
     }
 }
 
 /**
  * Compute the OSV for a satellite in J2000 frame.
  * 
  * @param {*} configuration 
  *      The configuration.
  * @param {*} timeStamp 
  *      The Javascript time stamp.
  * @returns The OSV.
  */
 function processSatellite(configuration, timeStamp)
 {
     const {JD, JT} = orbitsjs.timeJulianTs(timeStamp);
 
     let indElem = satNameToIndex[configuration.target];
     let satrec = satellites[indElem];
 
     const positionAndVelocity = satellite.propagate(satrec, timeStamp);
     // The position_velocity result is a key-value pair of ECI coordinates.
     // These are the base results from which all other coordinates are derived.
     const positionEci = positionAndVelocity.position;
     const velocityEci = positionAndVelocity.velocity;
 
     const rJ2000 = [positionEci.x * 1000, positionEci.y * 1000, positionEci.z * 1000];
     const vJ2000 = [velocityEci.x * 1000, velocityEci.y * 1000, velocityEci.z * 1000];
 
     return {JT : JT, r : rJ2000, v : vJ2000};
 }
 
 
 /**
  * Compute the OSV for a star in J2000 frame.
  * 
  * @param {*} configuration 
  *      The configuration.
  * @param {*} timeStamp 
  *      The Javascript time stamp.
  * @returns The OSV.
  */
 function processStar(configuration, timeStamp)
 {
     const {JD, JT} = orbitsjs.timeJulianTs(timeStamp);
 
     let hipData = null;
     if (configuration.corrections.properMotion)
     {
         hipData = orbitsjs.hipparchusGet(configuration.target, JT);
     }
     else 
     {
         hipData = orbitsjs.hipparchusGet(configuration.target);
     }
     //console.log(hipData);
 
     // The accurate distance of stars is not important except for angle computation.
     // However, since the computation is performed using Cartesian coordinates, we 
     // need some large distance.
 
     //hipData.RA = 279.23473479;
     //hipData.DE = 38.78368896;
 
     const lightYear = 9.461e15;
     const rJ2000 = [lightYear * orbitsjs.cosd(hipData.DE) * orbitsjs.cosd(hipData.RA),
                     lightYear * orbitsjs.cosd(hipData.DE) * orbitsjs.sind(hipData.RA),
                     lightYear * orbitsjs.sind(hipData.DE)];
     const vJ2000 = [0, 0, 0];
 
     return {JT : JT, r : rJ2000, v : vJ2000};
 }
 
 /**
 * Process one time step.
 * 
 * @param {*} configuration 
 *      Configuration.
 * @param {*} timeStamp
 *      Time stamp. 
 * @returns Object with the results.
 */
function processTimeStep(configuration, timeStamp)
{
    //console.log(timeStamp);
    console.log(targetType[configuration.target]);

    let targetOsvJ2000 = null;

    const results = {
        timeStamp: timeStamp,
    };

    switch (targetType[configuration.target])
    {
        case "star":
            targetOsvJ2000 = processStar(configuration, timeStamp);
            //console.log(targetOsvJ2000);
            break;
        case "moon":
            targetOsvJ2000 = processMoon(configuration, timeStamp);
            //console.log(targetOsvJ2000);
            break;
        case "solar_system":
            if (configuration.target === "Sun")
            {
                targetOsvJ2000 = processSun(configuration, timeStamp);
            }
            else
            {
                targetOsvJ2000 = processPlanet(configuration, timeStamp);
            }
            break;
        case "satellite":
            targetOsvJ2000 = processSatellite(configuration, timeStamp);
            break;
    }

    // Add UT1-UTC difference to the OSV timestamp.
    targetOsvJ2000.JT += configuration.corrections.dUt1Utc / 86400.0;

    // Compute diurnal aberration.
    let vDiurnal = [0, 0, 0];
    if (configuration.corrections.aberrationDiurnal)
    {
        const rObsEfi = orbitsjs.coordWgs84Efi(configuration.observer.lat, 
            configuration.observer.lon, configuration.observer.alt);
        const osvObsPef = orbitsjs.coordEfiPef({r : rObsEfi, v: [0, 0, 0], JT: targetOsvJ2000.JT}, 0, 0);
        const osvObsTod = orbitsjs.coordPefTod(osvObsPef);
        const osvObsMod = orbitsjs.coordTodMod(osvObsTod);
        const osvObsJ2000 = orbitsjs.coordTodMod(osvObsMod);

        vDiurnal = osvObsJ2000.v;
    }

    // Compute stellar aberration.
    if (configuration.corrections.aberrationStellar)
    {
        targetOsvJ2000.r = orbitsjs.aberrationStellarCart(targetOsvJ2000.JT, 
            targetOsvJ2000.r, vDiurnal);
    }

    // We always compute target location in every system.
    const targetOsvEclGeo = orbitsjs.coordEqEcl(targetOsvJ2000);
    const posVelEarth = orbitsjs.vsop87('earth', targetOsvEclGeo.JT);
    // Heliocentric:
    const targetOsvEcl = {
        r: orbitsjs.vecSum(targetOsvEclGeo.r, posVelEarth.r),
        v: orbitsjs.vecSum(targetOsvEclGeo.v, posVelEarth.v),
        JT : targetOsvEclGeo.JT};

    const targetOsvMod = orbitsjs.coordJ2000Mod(targetOsvJ2000);
    const targetOsvTod = orbitsjs.coordModTod(targetOsvMod);
    const targetOsvPef = orbitsjs.coordTodPef(targetOsvTod);
    const targetOsvEfi = orbitsjs.coordPefEfi(targetOsvPef, 
        configuration.corrections.polarMotionDx, 
        configuration.corrections.polarMotionDy);
    const targetOsvEnu = orbitsjs.coordEfiEnu(targetOsvEfi, 
        configuration.observer.lat, configuration.observer.lon, 
        configuration.observer.alt);
    const targetAzElEnu = orbitsjs.coordEnuAzEl(targetOsvEnu);

    results.osv = {
        eclHel : targetOsvEcl,
        eclGeo : targetOsvEclGeo,
        J2000  : targetOsvJ2000,
        mod    : targetOsvMod, 
        tod    : targetOsvTod, 
        pef    : targetOsvPef,
        efi    : targetOsvEfi, 
        enu    : targetOsvEnu
    };

    // Compute atmospheric refraction for the elevation angle in the ENU frame.
    if (configuration.corrections.refraction)
    {
        targetAzElEnu.el = elevationRefraction(targetAzElEnu.el, 
            configuration.atmosphere.temperature, configuration.atmosphere.pressure);
    }

    let s = dateToTs(timeStamp);

    results.sph = {
        eclHel : {
            RA   : getRa(targetOsvEcl.r), 
            decl : getDecl(targetOsvEcl.r), 
            dist : orbitsjs.norm(targetOsvEcl.r)
        },
        eclGeo : {
            RA  : getRa(targetOsvEclGeo.r), 
            decl : getDecl(targetOsvEclGeo.r), 
            dist : orbitsjs.norm(targetOsvEclGeo.r)
        },
        J2000 : {
            RA  : getRa(targetOsvJ2000.r), 
            decl : getDecl(targetOsvJ2000.r), 
            dist : orbitsjs.norm(targetOsvJ2000.r)
        },
        mod : {
            RA  : getRa(targetOsvMod.r), 
            decl : getDecl(targetOsvMod.r), 
            dist : orbitsjs.norm(targetOsvMod.r)
        },
        tod : {
            RA  : getRa(targetOsvTod.r), 
            decl : getDecl(targetOsvTod.r), 
            dist : orbitsjs.norm(targetOsvTod.r)
        },
        pef : {
            RA  : getRa(targetOsvPef.r), 
            decl : getDecl(targetOsvPef.r), 
            dist : orbitsjs.norm(targetOsvPef.r)
        },
        efi : {
            RA  : getRa(targetOsvEfi.r), 
            decl : getDecl(targetOsvEfi.r), 
            dist : orbitsjs.norm(targetOsvEfi.r)
        },
        enu : {
            az  : getAz(targetOsvEnu.r), 
            el : getDecl(targetOsvEnu.r), 
            dist : orbitsjs.norm(targetOsvEnu.r)
        }
    };

    //console.log(dateToTs(timeStamp) + " " + targetAzElEnu.az + " " + targetAzElEnu.el);
    //console.log(results);
    return results;
}

/**
 * Get Javascript timestamps from the JSON time configuration.
 * 
 * @param {*} time 
 *      The JSON time configuration.
 * @returns List of timestamps.
 */
 function getTimeSteps(time)
 {
     // TBD: Should this be configurable.
     const maxTimesteps = 1000000;
 
     const timeStart = tsToDate(time.timeStart).getTime();
     const timeEnd = tsToDate(time.timeEnd).getTime();
     
     // List of time stamps.
     let timeStamps = [new Date(timeStart)];
     
     // Integer representation of the start time in milliseconds.
     let timeCurrent = timeStart;
 
     // Get time step size in milliseconds.
     let timeStepSize = 1000;
     switch (elemTimeStepSize.value)
     {
         case "second":
             timeStepSize = 1000;
             break;
         case "minute":
             timeStepSize = 1000 * 60;
             break;
         case "hour":
             timeStepSize = 1000 * 3600;
             break;
         case "day":
             timeStepSize = 1000 * 3600 * 24;
             break;
     }
 
     while (timeCurrent < timeEnd)
     {
         timeCurrent += timeStepSize;
 
         if (timeCurrent <= timeEnd)
         {
             timeStamps.push(new Date(timeCurrent));
         }
         if (timeStamps.length > maxTimesteps)
         {
             break;
         }
     }
 
     return timeStamps;
 } 

/**
 * Compute the refracted elevation. The applied approach uses the formula from 
 * Sæmundsson formula with additional correction factor for the temperature and
 * pressure as shown in Chapter 16 of Meeus - Astronomical Algorithms, 1998.
 * 
 * @param {*} trueEl
 *      True (no atmosphere) elevation in degrees above horizon.
 * @param {*} temperature 
 *      Temperature of the air in Celsius.
 * @param {*} pressure 
 *      Pressure at the surface of Earth in millibars.
 * @returns 
 */
 function elevationRefraction(trueEl, temperature, pressure)
 {
     // Meeus 16.4
     let R = (1.02 / 60.0) / orbitsjs.tand(trueEl + 10.3 / (trueEl + 5.11));
     // Correction to make refraction 0 at 90 deg altitude.
     R += 0.00192792040346393;
     R *= (pressure / 1010.0) * 283.0 / (273.0 + temperature);
 
     return R + trueEl;
 }
  