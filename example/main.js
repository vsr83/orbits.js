const elemObsLatDeg = document.getElementById("observer_latitude_degrees");
const elemObsLatMin = document.getElementById("observer_latitude_minutes");
const elemObsLatSec = document.getElementById("observer_latitude_seconds");
const elemObsLonDeg = document.getElementById("observer_longitude_degrees");
const elemObsLonMin = document.getElementById("observer_longitude_minutes");
const elemObsLonSec = document.getElementById("observer_longitude_seconds");

const elemObsLatDegFrac = document.getElementById("observer_latitude_degrees_frac");
const elemObsLonDegFrac = document.getElementById("observer_longitude_degrees_frac");
const elemObsAlt = document.getElementById("observer_altitude_meters");
const elemTimeStepNumber = document.getElementById("number_timestep");
const elemTimeStepSize = document.getElementById("size_timestep");

const timeStart = document.getElementById("timestamp_start");
const timeEnd = document.getElementById("timestamp_end");
const julianStart = document.getElementById("julian_start");
const julianEnd = document.getElementById("julian_end");

// List of satellite records for satellite.js.
var satellites = [];
// Indices of satellite records according to satellite name.
var satNameToIndex = [];        

function isValid()
{
    return true;
}

/**
 * Generate configuration JSON from the form elements.
 * 
 * @returns The JSON.
 */
function getJson()
{
    const observer = {
        lat : parseFloat(elemObsLatDegFrac.value),
        lon : parseFloat(elemObsLonDegFrac.value),
        alt : parseInt(elemObsAlt.value)
    };

    const time = {
        timeStart : timeStart.value,
        timeEnd : timeEnd.value,
        timeStepNumber : parseInt(elemTimeStepNumber.value),
        timeStepSize : elemTimeStepSize.value
    };

    const corrections = 
    {
        refraction : document.getElementById("cb_refraction").checked,
        lightTime  : document.getElementById("cb_light_time").checked,
        properMotion : document.getElementById("cb_proper_motion").checked,
        aberrationStellar : document.getElementById("cb_aber_stel").checked,
        aberrationDiurnal : document.getElementById("cb_aber_diur").checked,
        polarMotionDx : parseFloat(document.getElementById("polar_motion_dx").value)/3600.0,
        polarMotionDy : parseFloat(document.getElementById("polar_motion_dy").value)/3600.0,
        dUt1Utc : parseFloat(document.getElementById("utcut1_diff").value)
    };
    
    const coordOutputs = {
        cart : {
            ecl   : document.getElementById("cb_cart_ecliptic").checked,
            eclGeo: document.getElementById("cb_cart_ecliptic_geo").checked,
            j2000 : document.getElementById("cb_cart_j2000").checked,
            mod   : document.getElementById("cb_cart_mod").checked,
            tod   : document.getElementById("cb_cart_tod").checked,
            pef   : document.getElementById("cb_cart_pef").checked,
            efi   : document.getElementById("cb_cart_efi").checked,
            enu   : document.getElementById("cb_cart_enu").checked
        },
        sph : {
            ecl   : document.getElementById("cb_sph_ecliptic").checked,
            eclGeo: document.getElementById("cb_sph_ecliptic_geo").checked,
            j2000 : document.getElementById("cb_sph_j2000").checked,
            mod   : document.getElementById("cb_sph_mod").checked,
            tod   : document.getElementById("cb_sph_tod").checked,
            pef   : document.getElementById("cb_sph_pef").checked,
            efi   : document.getElementById("cb_sph_efi").checked,
            enu   : document.getElementById("cb_sph_enu").checked
        },
    };

    const target = document.getElementById('autoComplete').value;

    const atmosphere = {
        temperature : parseFloat(document.getElementById("air_temperature").value),
        pressure : parseFloat(document.getElementById("air_pressure").value)
    };

    const conf = {
        target : target,
        observer : observer, 
        time : time, 
        corrections : corrections,
        coordOutputs : coordOutputs,
        atmosphere : atmosphere
    };

    return conf;
}

/**
 * Limit angle to [-180, 180) range.
 * 
 * @param {*} deg 
 *      Angle in degrees.
 * @returns Limited angle.
 */
function limitDeg180(deg)
{
    if (deg > 180)
    {
        return deg - 360;
    }

    return deg;
}

/**
 * Handle onchange event of number inputs for the latitude and longitude.
 * 
 * @param {*} event 
 *      The event.
 * @returns The event.
 */
function handleInteger(event)
{
    const targetElem = document.getElementById(event.target.id);
    let value = parseInt(targetElem.value);

    console.log(targetElem.max);
    if (value < targetElem.min)
    {
        value = targetElem.min;
    }
    if (value > targetElem.max)
    {
        value = targetElem.max;
    }

    targetElem.value = value;
    updateDegrees();

    return event;
}


/**
 * Update degrees from degree-minute-second forms.
 */
function updateDegrees()
{
    const latDeg = parseInt(elemObsLatDeg.value);
    const latMin = parseInt(elemObsLatMin.value);
    const latSec = parseInt(elemObsLatSec.value);
    const lonDeg = parseInt(elemObsLonDeg.value);
    const lonMin = parseInt(elemObsLonMin.value);
    const lonSec = parseInt(elemObsLonSec.value);

    const latDegFrac = orbitsjs.angleArcDeg(latDeg, latMin, latSec);
    const lonDegFrac = orbitsjs.angleArcDeg(lonDeg, lonMin, lonSec);

    elemObsLatDegFrac.value = limitDeg180(latDegFrac).toFixed(4);
    elemObsLonDegFrac.value = limitDeg180(lonDegFrac).toFixed(4);
}

/**
 * Update degree-minute-second from degrees form.
 */
function updateArc()
{
    const latValues = orbitsjs.angleDegArc(elemObsLatDegFrac.value);
    elemObsLatDeg.value = limitDeg180(latValues.deg);
    elemObsLatMin.value = latValues.arcMin;
    elemObsLatSec.value = Math.round(latValues.arcSec);

    const lonValues = orbitsjs.angleDegArc(elemObsLonDegFrac.value);
    elemObsLonDeg.value = limitDeg180(lonValues.deg);
    elemObsLonMin.value = lonValues.arcMin;
    elemObsLonSec.value = Math.round(lonValues.arcSec);
}

/**
 * Process list of TLEs.
 */
function processTleList()
{
    const TLEinput = document.getElementById('TLEListinput');
    const tleIn = TLEinput.value;
    const lines = tleIn.split('\n');
    const numElem = (lines.length + 1) / 3;

    satellites = [];
    satNameToIndex = [];

    for (let indElem = 0; indElem < Math.floor(numElem); indElem++)
    {
        const title = lines[indElem * 3];
        const tleLine1 = lines[indElem * 3 + 1];
        const tleLine2 = lines[indElem * 3 + 2];
        const satrec = satellite.twoline2satrec(tleLine1, tleLine2);

        satellites.push(satrec);
        satNameToIndex[title] = indElem;
        targetType[title] = 'satellite'
        targetList.push(title);
    }

    console.log(satelliteNames.length + " satellites processed.");
}

/**
 * Update Julian time texts according to start and end timestamps.
 */
function updateJulian()
{
    julianStart.value = orbitsjs.timeJulianTs(tsToDate(timeStart.value)).JT;
    julianEnd.value = orbitsjs.timeJulianTs(tsToDate(timeEnd.value)).JT;
}

/**
 * Update location forms from GPS.
 */
function locationGps()
{
    if (navigator.geolocation)
    {
        navigator.geolocation.getCurrentPosition(function(position) {
            elemObsLatDegFrac.value = limitDeg180(position.coords.latitude).toFixed(4);
            elemObsLonDegFrac.value = limitDeg180(position.coords.longitude).toFixed(4);
            //console.log(position.coords);
            updateArc();
        });
    }                
}

/**
 * Convert Javascript date to a timestamp.
 * 
 * @param {*} d 
 *      Javascript date.
 * @returns Timestamp.
 */
function dateToTs(d)
{
    const yearStr = d.getUTCFullYear().toString().padStart(4, '0');
    const monthStr = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const dayStr = d.getUTCDate().toString().padStart(2, '0');
    const hourStr = d.getUTCHours().toString().padStart(2, '0');
    const minuteStr = d.getUTCMinutes().toString().padStart(2, '0');
    const secondsStr = d.getUTCSeconds().toString().padStart(2, '0');

    return yearStr + '-' + monthStr + '-' + dayStr + 'T' + 
           hourStr + ':' + minuteStr + ':' + secondsStr;
}

/**
 * Convert timestamp to Javascript date.
 * 
 * @param {*} ts 
 *      The timestamp.
 * @returns Javascript date.
 */
function tsToDate(ts)
{
    const year = ts.substr(0, 4);
    const month = ts.substr(5, 2) - 1;
    const day = ts.substr(8, 2);
    const hour = ts.substr(11, 2);
    const minute = ts.substr(14, 2);
    const seconds = ts.substr(17, 2);

    const d = new Date();
    d.setUTCFullYear(year);
    d.setUTCMonth(month);
    d.setUTCDate(day);
    d.setUTCHours(hour);
    d.setUTCMinutes(minute);
    d.setUTCSeconds(seconds);
    d.setUTCMilliseconds(0);

    return d;
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

/**
 * Perform the actual computation.
 */
function compute()
{
    const configuration = getJson();

    //console.log(configuration.target);

    // If the target is not found, display a dialog and stop.
    if (!targetList.includes(configuration.target))
    {
        window.alert("Target \"" + configuration.target + "\" not found!");
        return;
    }

    const timeSteps = getTimeSteps(configuration.time);

    // Display CSV title.
    console.log(generateCsvTitle(configuration));
    addToOutput(generateCsvTitle(configuration));

    // Process individual time steps.
    for (let indTimeStep = 0; indTimeStep < timeSteps.length; indTimeStep++)
    {
        processTimeStep(configuration, timeSteps[indTimeStep]);
    }
}

/**
 * Add line to output textarea.
 * 
 * @param {*} s 
 *      The line to be added.
 */
function addToOutput(s)
{
    document.getElementById("textarea_output").value += (s + '\r\n');
}

/**
 * Clear output textarea.
 */
function clearOutput()
{
    document.getElementById("textarea_output").value = "";
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
 * Generate title for the CSV output.
 * 
 * @param {*} configuration 
 *      The configuration.
 * @returns 
 */
function generateCsvTitle(configuration)
{
    let s = 'Timestamp'

    if (configuration.coordOutputs.cart.ecl)
    {
        s += ",EclHel_x,EclHel_y,EclHel_z";
    }
    if (configuration.coordOutputs.sph.ecl)
    {
        s += ",EclHel_RA,EclHel_decl,EclHel_dist";
    }
    if (configuration.coordOutputs.cart.eclGeo)
    {
        s += ",EclGeo_x,EclGeo_y,EclGeo_z";
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        s += ",EclGeo_RA,EclGeo_decl,EclGeo_dist";
    }
    if (configuration.coordOutputs.cart.j2000)
    {
        s += ",J2000_x,J2000_y,J2000_z";
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        s += ",J2000_RA,J2000_decl,J2000_dist";
    }
    if (configuration.coordOutputs.cart.mod)
    {
        s += ",MoD_x,MoD_y,MoD_z";
    }
    if (configuration.coordOutputs.sph.mod)
    {
        s += ",MoD_RA,MoD_decl,MoD_dist";
    }
    if (configuration.coordOutputs.cart.tod)
    {
        s += ",ToD_x,ToD_y,ToD_z";
    }
    if (configuration.coordOutputs.sph.tod)
    {
        s += ",ToD_RA,ToD_decl,ToD_dist";
    }
    if (configuration.coordOutputs.cart.pef)
    {
        s += ",PEF_x,PEF_y,PEF_z";
    }
    if (configuration.coordOutputs.sph.pef)
    {
        s += ",PEF_RA,PEF_decl,PEF_dist";
    }
    if (configuration.coordOutputs.cart.efi)
    {
        s += ",EFI_x,EFI_y,EFI_z";
    }
    if (configuration.coordOutputs.sph.efi)
    {
        s += ",EFI_RA,EFI_decl,EFI_dist";
    }
    if (configuration.coordOutputs.cart.enu)
    {
        s += ",ENU_x,ENU_y,ENU_z";
    }
    if (configuration.coordOutputs.sph.enu)
    {
        s += ",Azi,Elev,ENU_dist";
    }

    return s;
}

/**
 * Process one time step.
 * 
 * @param {*} configuration 
 *      Configuration.
 * @param {*} timeStamp
 *      Time stamp. 
 */
function processTimeStep(configuration, timeStamp)
{
    //console.log(timeStamp);
    //console.log(targetType[configuration.target]);

    let targetOsvJ2000 = null;

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

    // Compute atmospheric refraction for the elevation angle in the ENU frame.
    if (configuration.corrections.refraction)
    {
        targetAzElEnu.el = elevationRefraction(targetAzElEnu.el, 
            configuration.atmosphere.temperature, configuration.atmosphere.pressure);
    }

    let s = dateToTs(timeStamp);

    if (configuration.coordOutputs.cart.ecl)
    {
        s += "," + targetOsvEcl.r;
    }
    if (configuration.coordOutputs.sph.ecl)
    {
        s += "," + getRa(targetOsvEcl.r) + "," + getDecl(targetOsvEcl.r) + ',' + orbitsjs.norm(targetOsvEcl.r);
    }
    if (configuration.coordOutputs.cart.eclGeo)
    {
        s += "," + targetOsvEclGeo.r;
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        s += "," + getRa(targetOsvEclGeo.r) + "," + getDecl(targetOsvEclGeo.r) + ',' + orbitsjs.norm(targetOsvEclGeo.r);
    }
    if (configuration.coordOutputs.cart.j2000)
    {
        s += "," + targetOsvJ2000.r;
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        s += "," + getRa(targetOsvJ2000.r) + "," + getDecl(targetOsvJ2000.r) + ',' + orbitsjs.norm(targetOsvJ2000.r);
    }
    if (configuration.coordOutputs.cart.mod)
    {
        s += "," + targetOsvMod.r;
    }
    if (configuration.coordOutputs.sph.mod)
    {
        s += "," + getRa(targetOsvMod.r) + "," + getDecl(targetOsvMod.r) + ',' + orbitsjs.norm(targetOsvMod.r);
    }
    if (configuration.coordOutputs.cart.tod)
    {
        s += "," + targetOsvTod.r;
    }
    if (configuration.coordOutputs.sph.tod)
    {
        s += "," + getRa(targetOsvTod.r) + "," + getDecl(targetOsvTod.r) + ',' + orbitsjs.norm(targetOsvTod.r);
    }
    if (configuration.coordOutputs.cart.pef)
    {
        s += "," + targetOsvPef.r;
    }
    if (configuration.coordOutputs.sph.pef)
    {
        s += "," + getRa(targetOsvPef.r) + "," + getDecl(targetOsvPef.r) + ',' + orbitsjs.norm(targetOsvPef.r);
    }
    if (configuration.coordOutputs.cart.efi)
    {
        s += "," + targetOsvEfi.r;
    }
    if (configuration.coordOutputs.sph.efi)
    {
        s += "," + getRa(targetOsvEfi.r) + "," + getDecl(targetOsvEfi.r) + ',' + orbitsjs.norm(targetOsvEfi.r);
    }
    if (configuration.coordOutputs.cart.enu)
    {
        s += "," + targetOsvEnu.r;
    }
    if (configuration.coordOutputs.sph.enu)
    {
        s += "," + targetAzElEnu.az + "," + targetAzElEnu.el + ',' + orbitsjs.norm(targetOsvEnu.r);
    }

    console.log(s);
    addToOutput(s);
    //console.log(dateToTs(timeStamp) + " " + targetAzElEnu.az + " " + targetAzElEnu.el);
}

// Initialize time configuration.
let prevMidnight = new Date();
let nextMidnight = new Date();
prevMidnight.setUTCHours(0, 0, 0, 0);
prevMidnight.setUTCMilliseconds(0);
nextMidnight.setUTCHours(24, 0, 0, 0);
nextMidnight.setUTCMilliseconds(0);
timeStart.value = dateToTs(prevMidnight);
timeEnd.value = dateToTs(nextMidnight);
// Initialize Julian according to time stamps above.
updateJulian();

// Initialize target list from Hipparchus catalog.
let targetList = Object.keys(orbitsjs.hipparchusData);
let targetType = [];
targetList.forEach(function(target) {
    targetType[target] = "star";
});
// Add planets to the target list.
const solarSystemTargets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Sun'];
solarSystemTargets.forEach(function(target) {
    targetType[target] = 'solar_system'
    targetList.push(target);
});
// Add Moon to the target list.
targetList.push('Moon');
targetType['Moon'] = 'moon';

// Initialize autocomplete.
const autoCompleteJS = new autoComplete({
    placeHolder: "Search for a target",
    data: {
        src: targetList, 
        cache: true,
    },
    resultItem: {
        highlight: true
    },
    resultsList:{
        tabSelect: true,
        noResults: true
    },
    events: {
        input: {
            selection: (event) => {
                const selection = event.detail.selection.value;
                autoCompleteJS.input.value = selection;
            }
        }
    }
});