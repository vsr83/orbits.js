var config = {
    content: [
        {
            type: 'row',
            content:[
                {
                    type: 'component',
                    componentName: 'confComponent',
                    componentState: { label: 'A' }
                },

                {
                    type: 'column',
                    content : [
                        {
                            type: 'component',
                            componentName: 'csvComponent',
                            componentState: { label: 'B' }
                        }/*,
                        {
                            type: 'component',
                            componentName: 'plotComponent',
                            componentState: { label: 'C' }
                        }*/
                    ]
                }
            ]
        }
        /*,{
            type: 'column',
            content:[{
                type: 'component',
                componentName: 'tableComponent',
                componentState: { label: 'B' }
            },{
                type: 'component',
                componentName: 'testComponent',
                componentState: { label: 'C' }
            }]
        }]*/
    ]
};

var myLayout = new GoldenLayout( config );

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

let indPlot = 0;

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

    console.log(target);
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
    //console.log(results);

    printResults(configuration, results);
    createPlot(configuration, results);
}

function createPlotData(configuration, results)
{
    const dataFull = [
        Array(results.length),

        Array(results.length),
        Array(results.length),
        Array(results.length),
        Array(results.length),

        Array(results.length),
        Array(results.length),
        Array(results.length),
        Array(results.length),

        Array(results.length),
        Array(results.length),
        Array(results.length),
        Array(results.length),

        Array(results.length),
        Array(results.length),
        Array(results.length),
        Array(results.length),
    ];

    for (let timeStep = 0; timeStep < results.length; timeStep++) 
    {
        const output = results[timeStep];    
        dataFull[0][timeStep] = output.timeStamp.getTime() / 1000.0;

        dataFull[1][timeStep]  = output.sph.eclHel.RA;
        dataFull[2][timeStep]  = output.sph.eclHel.decl;
        dataFull[3][timeStep]  = output.sph.eclGeo.RA;
        dataFull[4][timeStep]  = output.sph.eclGeo.decl;
        dataFull[5][timeStep]  = output.sph.J2000.RA;
        dataFull[6][timeStep]  = output.sph.J2000.decl;
        dataFull[7][timeStep]  = output.sph.mod.RA;
        dataFull[8][timeStep]  = output.sph.mod.decl;
        dataFull[9][timeStep]  = output.sph.tod.RA;
        dataFull[10][timeStep]  = output.sph.tod.decl;
        dataFull[11][timeStep] = output.sph.pef.RA;
        dataFull[12][timeStep] = output.sph.pef.decl;
        dataFull[13][timeStep] = output.sph.efi.RA;
        dataFull[14][timeStep] = output.sph.efi.decl;
        dataFull[15][timeStep] = output.sph.enu.az;
        dataFull[16][timeStep] = output.sph.enu.el;
    }

    let data = [];

    data.push(dataFull[0]);

    if (configuration.coordOutputs.sph.ecl)
    {
        data.push(dataFull[1]);
        data.push(dataFull[2]);
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        data.push(dataFull[3]);
        data.push(dataFull[4]);
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        data.push(dataFull[5]);
        data.push(dataFull[6]);
     }
    if (configuration.coordOutputs.sph.mod)
    {
        data.push(dataFull[7]);
        data.push(dataFull[8]);
    }
    if (configuration.coordOutputs.sph.tod)
    {
        data.push(dataFull[9]);
        data.push(dataFull[10]);
    }
    if (configuration.coordOutputs.sph.pef)
    {
        data.push(dataFull[11]);
        data.push(dataFull[12]);
    }
    if (configuration.coordOutputs.sph.efi)
    {
        data.push(dataFull[13]);
        data.push(dataFull[14]);
    }
    if (configuration.coordOutputs.sph.enu)
    {
        data.push(dataFull[15]);
        data.push(dataFull[16]);
     }


    return data;
}

function createPlotSeries(configuration)
{
    const colors = [
        "white",
        "red",
        "green",
        "blue",
        "purple",
        "yellow",
        "cyan",
        "grey"
    ];
    let colorInd = 0;

    let series = [ 
    {
        label: "x",
        stroke: "white",
    }];

    if (configuration.coordOutputs.sph.ecl)
    {
        series.push({label : "EclHel-Lon", stroke : colors[colorInd++ % colors.length]});
        series.push({label : "EclHel-Lat", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        series.push({label : "EclGeo-Lon", stroke : colors[colorInd++ % colors.length]});
        series.push({label : "EclGeo-Lat", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        series.push({label : "J2000-RA",   stroke : colors[colorInd++ % colors.length]});
        series.push({label : "J2000-decl", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.mod)
    {
        series.push({label : "MoD-RA"  , stroke : colors[colorInd++ % colors.length]});
        series.push({label : "MoD-decl", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.tod)
    {
        series.push({label : "ToD-RA"  , stroke : colors[colorInd++ % colors.length]});
        series.push({label : "ToD-decl", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.pef)
    {
        series.push({label : "PEF-lon", stroke : colors[colorInd++ % colors.length]});
        series.push({label : "PEF-lat", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.efi)
    {
        series.push({label : "EFI-lon", stroke : colors[colorInd++ % colors.length]});
        series.push({label : "EFI-lat", stroke : colors[colorInd++ % colors.length]});
    }
    if (configuration.coordOutputs.sph.enu)
    {
        series.push({label : "ENU-azi", stroke : colors[colorInd++ % colors.length]});
        series.push({label : "ENU-el", stroke : colors[colorInd++ % colors.length]});
    }
    return series;
}

function createPlot(configuration, results)
{
    indPlot++;

    const data = createPlotData(configuration, results);

    const opts = {
        title: configuration.target,
        width: 1048,
        height: 600,
        scales: {
            x: {
           //     time: false,
            //	auto: false,
            //	range: [0, 6],
            },
            y: {
                auto: false,
                range: [-180, 180],
                },
        },
        series: createPlotSeries(configuration),
        axes: [
            {
            //	size: 30,
                label: "Time",
                labelSize: 20,
                stroke: "white",
                grid: {
                    width: 1 / devicePixelRatio,
                    stroke: "#444444",
                },
            },
            {
                space: 50,
            //	size: 40,
                side: 1,
                label: "Angle",
                labelGap: 8,
                labelSize: 8 + 12 + 8,
                stroke: "white",
                grid: {
                    width: 1 / devicePixelRatio,
                    stroke: "#444444",
                },
            }
        ],
    };

    myLayout.registerComponent( 'plotComponent_' + indPlot, function( container, state ){
        container.getElement().html( '<div id="plot_' + indPlot +  '"></div>');
        //container.getElement().html( '<div id="plot"></div>');
        container.indPlot = indPlot;

        container.on('resize', function() {
            console.log('Resize ' + container.indPlot + " " + container.width + " " + container.height);
            const plot = document.getElementById('plot_' + container.indPlot);
            //const plot = document.getElementById('plot');

            while (plot.firstChild)
            {
                plot.removeChild(plot.firstChild);
            }
            //console.log(plot);
            //console.log(container.getElement()[0]);
            u = new uPlot(opts, data, plot);
            u.setSize({width : container.width, height : container.height-100});    
        });
        //container.on('resize', function() {
        //    console.log(container.width + " " + container.height);
        //});
        
    });

    console.log("foobar");

    var newItemConfig = {
        title: configuration.target,
        type: 'component',
        //componentName: 'plot_' + indPlot,
        componentName: 'plotComponent_' + indPlot,
        componentState: { text: 'D', configuration : configuration, results : results }
    };
    myLayout.root.contentItems[ 0 ].addChild( newItemConfig );    
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

myLayout.registerComponent( 'csvComponent', function( container, componentState ){
    
    //console.log(document.getElementById('csv_output').innerHTML);

    const elem = document.getElementById('csv_output');
    const elemHtml = elem.innerHTML;
    elem.remove();

    container.getElement().html(elemHtml);

    container.on('resize', function() {
        const elemText = document.getElementById("textarea_output");
        console.log(container.width + " " + container.height);
        elemText.style.width = container.width;
        elemText.style.height = container.height;
    });
});

//myLayout.registerComponent( 'plotComponent', function( container, componentState ) {
//    container.getElement().html = "<p>TODO</p>";
//});


myLayout.registerComponent( 'confComponent', function( container, componentState ) {
    
    //console.log(document.getElementById('Configuration').innerHTML);

    const elem = document.getElementById('Configuration');
    const elemHtml = elem.innerHTML;
    elem.remove();

    container.getElement().html(elemHtml);

    container.on('open', function() {
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

        // Initialize target list from Hipparchus catalog.
        targetList = Object.keys(orbitsjs.hipparchusData);
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

// Initialize target list from Hipparchus catalog.
let targetList = Object.keys(orbitsjs.hipparchusData);
let targetType = [];

myLayout.init();