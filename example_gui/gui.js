// GoldenLayout configuration. 
var config = {
    settings: 
    {
        showPopoutIcon: false
    },
    dimensions :
    {
        minItemWidth : 420
    },
    content: [
        {
            type: 'row',
            content:[
                {
                    type: 'component',
                    componentName: 'Configuration',
                    componentState: { label: 'A' },
                    isClosable: false,
                    showPopoutIcon: false,
                },

                {
                    type: 'column',
                    content : [
                        {
                            type: 'component',
                            componentName: 'CSV Output',
                            componentState: { label: 'B' },
                            isClosable: false,
                            showPopoutIcon: false,
                        }
                    ]
                }
            ]
        }
    ]
};

var myLayout = new GoldenLayout( config );

// Elements are updated when the configuration form content is moved to a new
// element.
let elemObsLatDeg = document.getElementById("observer_latitude_degrees");
let elemObsLatMin = document.getElementById("observer_latitude_minutes");
let elemObsLatSec = document.getElementById("observer_latitude_seconds");
let elemObsLonDeg = document.getElementById("observer_longitude_degrees");
let elemObsLonMin = document.getElementById("observer_longitude_minutes");
let elemObsLonSec = document.getElementById("observer_longitude_seconds");

let elemObsLatDegFrac = document.getElementById("observer_latitude_degrees_frac");
let elemObsLonDegFrac = document.getElementById("observer_longitude_degrees_frac");
let elemObsAlt = document.getElementById("observer_altitude_meters");
let elemTimeStepNumber = document.getElementById("number_timestep");
let elemTimeStepSize = document.getElementById("size_timestep");

let timeStart = document.getElementById("timestamp_start");
let timeEnd = document.getElementById("timestamp_end");
let julianStart = document.getElementById("julian_start");
let julianEnd = document.getElementById("julian_end");

// List of satellite records for satellite.js.
var satellites = [];
// Indices of satellite records according to satellite name.
var satNameToIndex = [];        

// TODO:
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

    const plotOptions = {
        timeZone : document.getElementById("plot_time_zone").value,
        //elevFormat : document.getElementById("plot_elevation_format").value,
        //aziFormat : document.getElementById("plot_azimuth_format").value,
        //raFormat : document.getElementById("plot_RA_format").value,
        drawAzi : document.getElementById("plot_draw_az").checked,
        drawEl : document.getElementById("plot_draw_el").checked,
        limit180 : document.getElementById("plot_limit_180").checked
    };

    const csvOptions = {
        timeFormat : document.getElementById("csv_time_zone").value,
        separator : document.getElementById("csv_separator").value,
        printTitle : document.getElementById("csv_title").checked        
    };

    const conf = {
        target : target,
        observer : observer, 
        time : time, 
        corrections : corrections,
        coordOutputs : coordOutputs,
        atmosphere : atmosphere,
        plotOptions : plotOptions,
        csvOptions : csvOptions
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

    console.log(satellites.length + " satellites processed.");
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
 * @param {*} format 
 *      UTC, local or julian. If undefined, UTC is used.
 * @returns Timestamp.
 */
function dateToTs(d, format)
{
    if (format === undefined)
    {
        format = "UTC"
    }

    if (format == "UTC")
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
    else if (format == "local")
    {
        const yearStr = d.getFullYear().toString().padStart(4, '0');
        const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = d.getDate().toString().padStart(2, '0');
        const hourStr = d.getHours().toString().padStart(2, '0');
        const minuteStr = d.getMinutes().toString().padStart(2, '0');
        const secondsStr = d.getSeconds().toString().padStart(2, '0');

        return yearStr + '-' + monthStr + '-' + dayStr + 'T' + 
            hourStr + ':' + minuteStr + ':' + secondsStr;
    }
    else if (format == "julian")
    {
        return orbitsjs.timeJulianTs(d).JT;        
    }
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
 * Create a plot.
 */
function createPlot()
{
    const configuration = getJson();

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

    plotCreate(configuration, results);
}

/**
 * Create a CSV.
 */
function createCsv()
{
    const configuration = getJson();

    console.log(configuration);

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

    csvPrint(configuration, results);
}
 
/**
 * Clear CSV textarea.
 */
function clearOutput()
{
    document.getElementById("textarea_output").value = "";
}

// Register the CSV textarea as a window.
myLayout.registerComponent( 'CSV Output', function( container, componentState ){
    const elem = document.getElementById('csv_output');
    const elemHtml = elem.innerHTML;
    elem.remove();

    container.getElement().html(elemHtml);

    container.on('resize', function() {
        const elemText = document.getElementById("textarea_output");
        console.log("CSV Resize: " + container.width + " " + container.height);
        elemText.style.width = container.width;
        elemText.style.height = container.height;
    });
});

// Register configuration form as a window.
myLayout.registerComponent( 'Configuration', function( container, componentState ) {
    const elem = document.getElementById('Configuration');
    // Remove the configuration element and copy its contents into a new element.
    const elemHtml = elem.innerHTML;
    elem.remove();
    container.getElement().html(elemHtml);

    container.on('open', function() {
        const conf2 = document.getElementById("Configuration2");
        conf2.style.display = 'inline-block';
        conf2.style.position = 'relative';

        // Update DOM element references.
        elemObsLatDeg = document.getElementById("observer_latitude_degrees");
        elemObsLatMin = document.getElementById("observer_latitude_minutes");
        elemObsLatSec = document.getElementById("observer_latitude_seconds");
        elemObsLonDeg = document.getElementById("observer_longitude_degrees");
        elemObsLonMin = document.getElementById("observer_longitude_minutes");
        elemObsLonSec = document.getElementById("observer_longitude_seconds");
        
        elemObsLatDegFrac = document.getElementById("observer_latitude_degrees_frac");
        elemObsLonDegFrac = document.getElementById("observer_longitude_degrees_frac");
        elemObsAlt = document.getElementById("observer_altitude_meters");
        elemTimeStepNumber = document.getElementById("number_timestep");
        elemTimeStepSize = document.getElementById("size_timestep");
        
        timeStart = document.getElementById("timestamp_start");
        timeEnd = document.getElementById("timestamp_end");
        julianStart = document.getElementById("julian_start");
        julianEnd = document.getElementById("julian_end");

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

        // Initialize target list from Hipparcos catalog.
        targetList = Object.keys(orbitsjs.hipparcosData);
        targetType = [];
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
        container.setSize(440, 1000);
    });
    container.on('resize', function() {
        console.log(container.width + " " + container.height);
    });
});

// Initialize target list from Hipparcos catalog.
let targetList = Object.keys(orbitsjs.hipparcosData);
let targetType = [];

myLayout.init();