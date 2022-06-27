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

    const results = [];

    // Process individual time steps.
    for (let indTimeStep = 0; indTimeStep < timeSteps.length; indTimeStep++)
    {
        results.push(processTimeStep(configuration, timeSteps[indTimeStep]));
    }
    //console.log(results);

    printResults(configuration, results);
}

/**
 * Print results.
 * 
 * @param {*} configuration 
 *      Configuration JSON from the GUI.
 * @param {*} results 
 *      Array of results.
 */
function printResults(configuration, results)
{
    // Display CSV title.
    console.log(generateCsvTitle(configuration));
    addToOutput(generateCsvTitle(configuration));

    for (let timeStep = 0; timeStep < results.length; timeStep++) 
    {
        const output = results[timeStep];

        let s = dateToTs(output.timeStamp);

        if (configuration.coordOutputs.cart.ecl)
        {
            s += "," + output.osv.eclHel.r;
        }
        if (configuration.coordOutputs.sph.ecl)
        {
            s += "," + output.sph.eclHel.RA + "," + output.sph.eclHel.decl + "," + output.sph.eclHel.dist;
        }
        if (configuration.coordOutputs.cart.eclGeo)
        {
            s += "," + output.osv.eclGeo.r;
        }
        if (configuration.coordOutputs.sph.eclGeo)
        {
            s += "," + output.sph.eclGeo.RA + "," + output.sph.eclGeo.decl + "," + output.sph.eclGeo.dist;
        }
        if (configuration.coordOutputs.cart.j2000)
        {
            s += "," + output.osv.J2000.r;
        }
        if (configuration.coordOutputs.sph.j2000)
        {
            s += "," + output.sph.J2000.RA + "," + output.sph.J2000.decl + "," + output.sph.J2000.dist;
        }
        if (configuration.coordOutputs.cart.mod)
        {
            s += "," + output.osv.mod.r;
        }
        if (configuration.coordOutputs.sph.mod)
        {
            s += "," + output.sph.mod.RA + "," + output.sph.mod.decl + "," + output.sph.mod.dist;
        }
        if (configuration.coordOutputs.cart.tod)
        {
            s += "," + output.osv.tod.r;
        }
        if (configuration.coordOutputs.sph.tod)
        {
            s += "," + output.sph.tod.RA + "," + output.sph.tod.decl + "," + output.sph.tod.dist;
        }
        if (configuration.coordOutputs.cart.pef)
        {
            s += "," + output.osv.pef.r;
        }
        if (configuration.coordOutputs.sph.pef)
        {
            s += "," + output.sph.pef.RA + "," + output.sph.pef.decl + "," + output.sph.pef.dist;
        }
        if (configuration.coordOutputs.cart.efi)
        {
            s += "," + output.osv.efi.r;
        }
        if (configuration.coordOutputs.sph.efi)
        {
            s += "," + output.sph.efi.RA + "," + output.sph.efi.decl + "," + output.sph.efi.dist;
        }
        if (configuration.coordOutputs.cart.enu)
        {
            s += "," + output.osv.enu.r;
        }
        if (configuration.coordOutputs.sph.enu)
        {
            s += "," + output.sph.enu.az + "," + output.sph.enu.el + "," + output.sph.enu.dist;
        }
    
        console.log(s);
        addToOutput(s);
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