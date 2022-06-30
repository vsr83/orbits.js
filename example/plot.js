// We create an unique DOM element id for each plot.
let indPlot = 0;

/**
 * Create plot data for uPlot.
 * 
 * @param {*} configuration 
 *      Configuration JSON from the GUI.
 * @param {*} results 
 *      Array of results.
 * @returns The data as an array.
 */
function plotCreateData(configuration, results)
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

/**
 * Create plot line styles and legend texts.
 * 
 * @param {*} configuration 
 *      Configuration JSON from the GUI.
 * @returns The series list for uPlot.
 */
function plotCreateSeries(configuration)
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

/**
 * Create a new plot.
 * 
 * @param {*} configuration 
 *      Configuration JSON from the GUI.
 * @param {*} results 
 *      Array of results.
 */
function plotCreate(configuration, results)
{
    indPlot++;

    const data = plotCreateData(configuration, results);

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
                auto: true,
               // range: [-180, 180],
                },
        },
        series: plotCreateSeries(configuration),
        axes: [
            {
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

        // An annoying issue here is that if we attempt to create the uPlot object
        // in an "open" event callback, the DOM element plot_[indPlot] has not yet 
        // been created. Thus, we simply recreate the plot every single time when 
        // there is a resize event. This "seems" to work.
        container.on('resize', function() {
            console.log('Resize ' + container.indPlot + " " + container.width + " " + container.height);
            const plot = document.getElementById('plot_' + container.indPlot);

            while (plot.firstChild)
            {
                plot.removeChild(plot.firstChild);
            }

            u = new uPlot(opts, data, plot);
            u.setSize({width : container.width, height : container.height-100});    
        });
    });

    // Add the new component dynamically.
    var newItemConfig = {
        title: configuration.target,
        type: 'component',
        componentName: 'plotComponent_' + indPlot,
        componentState: { text: 'D', configuration : configuration, results : results }
    };
    myLayout.root.contentItems[ 0 ].addChild( newItemConfig );    
}
