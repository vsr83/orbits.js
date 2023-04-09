"use strict";

var gl = null;
var earthShaders = null;
var lineShaders = null;
var pointShaders = null;

// Semi-major and semi-minor axes of the WGS84 ellipsoid.
//var a = 6378.1370;
//var b = 6356.75231414;
//let fov = 1;

gl = canvas.getContext("webgl2");
if (!gl) 
{
    console.log("Failed to initialize GL.");
}
//var canvasJs = document.getElementById("canvasJs");
//var contextJs = canvasJs.getContext("2d");

const planetTextures = {
    'mercury' : {day : 'textures/2k_mercury.jpg',          night : 'textures/darkside.jpg'},
    'venus'   : {day : 'textures/2k_venus_atmosphere.jpg', night : 'textures/darkside.jpg'},
    'earth'   : {day : 'textures/2k_earth_daymap.jpg',     night : 'textures/2k_earth_nightmap.jpg'},
    'mars'    : {day : 'textures/2k_mars.jpg',             night : 'textures/darkside.jpg'},
    'jupiter' : {day : 'textures/2k_jupiter.jpg',          night : 'textures/darkside.jpg'},
    'saturn'  : {day : 'textures/2k_saturn.jpg',           night : 'textures/darkside.jpg'},
    'uranus'  : {day : 'textures/2k_uranus.jpg',           night : 'textures/darkside.jpg'},
    'neptune' : {day : 'textures/2k_neptune.jpg',          night : 'textures/darkside.jpg'}
};

let target = 'mars';
let observer = 'earth';
const a = orbitsjs.planetData[target].eqRadius;
const b = orbitsjs.planetData[target].polarRadius;
let fov = 10/3600;

// Current state of the camera.
const camera = {
    rotX : orbitsjs.deg2Rad(-90),
    rotY : 0,
    rotZ : 0,
    fovRad : orbitsjs.deg2Rad(30),
    distance : 10.0 * a,
    zFar : 1000000000
};


let planetShaders = {};

function setTarget(planetName)
{
    if (planetName === observer)
    {
        return;
    }

    const a = orbitsjs.planetData[planetName].eqRadius;
    const b = orbitsjs.planetData[planetName].polarRadius;

    planetShaders[planetName] = new PlanetShaders(gl, 50, 50, a, b, 15, 15);
    planetShaders[planetName].init(planetTextures[planetName].day, planetTextures[planetName].night);

    target = planetName;
    // Create and initialize shaders.
    earthShaders = new PlanetShaders(gl, 50, 50, a, b, 15, 15);
    earthShaders.init(planetTextures[target].day, planetTextures[target].night);
}

function setObserver(planetName)
{
    if (planetName === target)
    {
        return;
    }

    observer = planetName;
}


setTarget('mars');

lineShaders = new LineShaders(gl);
lineShaders.init();

pointShaders = new PointShaders(gl);
pointShaders.init();

let JTstart = orbitsjs.timeJulianTs(new Date()).JT;
let JTprev = JTstart;
let warpFactorPrev = 1;
let warpPrev = false;
let deltaTime = 0;

let drawing = false;
console.log("done");
requestAnimationFrame(drawScene);


let toFixed = function(num) {
    if (num < 10)
        return "0" + num;
    else 
        return num;
}

function createTimestamp(JT)
{
    const timeGreg = orbitsjs.timeGregorian(JT);
    return timeGreg.year + "-" + toFixed(timeGreg.month) + "-" + toFixed(timeGreg.mday) + 
            "T" + toFixed(timeGreg.hour) + ":" + toFixed(timeGreg.minute)
            + ":" + toFixed(Math.floor(timeGreg.second));
}

function capitalizeFirst(str)
{
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Transform from spherical to Cartesian coordinates in an inertial frame.
 * 
 * @param {*} R 
 *      Distance.
 * @param {*} DE 
 *      Declination (deg).
 * @param {*} RA 
 *      Right-ascension (deg).
 * @returns 3d array of coordinates.
 */
function sphIneCart(R, DE, RA)
{
    return [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
            R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
            R * orbitsjs.sind(DE)];
}

function createStarPoints()
{
    const starPoints = [];

    for (let [hipName, hipObj] of Object.entries(orbitsjs.hipparcosData))
    {    
        const DE = hipObj.DE;
        const RA = hipObj.RA;
    
        const p = sphIneCart(1, DE, RA);

        starPoints.push({hipName : hipName, point : p, mag : hipObj.mag});
    }    

    return starPoints;
}

function createConstellationBoundaries()
{
    const constellationBoundaries = {};

    // Create constellation boundaries.
    let ind  = 0;
    for (let [cName, cPoints] of Object.entries(orbitsjs.constellationBoundaries))
    {
        const points = [];
        for (let indPoint = 0; indPoint < cPoints.length; indPoint++)
        {
            let point = cPoints[indPoint];
            const RA = point[0];
            const DE = point[1];
            const pStart = sphIneCart(1, DE, RA);
            points.push([pStart[0], pStart[1], pStart[2]]);
        }

        constellationBoundaries[cName] = points;
    }

    return constellationBoundaries;
}

function createConstellationLines()
{
    const constellationLines = {};

    // Create constellations.
    for (let [cName, cValue] of Object.entries(orbitsjs.constellations))
    {
        const lines = [];

        const constellation = orbitsjs.constellations[cName];
        for (let indLine = 0; indLine < constellation.hip.length; indLine++)
        {
            const lineStars = constellation.hip[indLine];
            //console.log(lineStars);

            const starStart = lineStars[0];
            const starEnd = lineStars[1];
            const nameStart = orbitsjs.hipparcosIndToName[starStart];
            const nameEnd = orbitsjs.hipparcosIndToName[starEnd];

            //console.log(nameStart + "->" + nameEnd);
            const hipStart = orbitsjs.hipparcosData[nameStart];
            const hipEnd = orbitsjs.hipparcosData[nameEnd];
        
            if (hipStart === undefined)
            {            
                console.log("MISSING-start " + starStart + " " + nameStart);
                continue;
            }
            if (hipEnd === undefined)
            {            
                console.log("MISSING-end " + starEnd + " " + nameEnd);
                continue;
            }

            //console.log(hipEnd);
            const RAstart = hipStart.RA;
            const RAend = hipEnd.RA;
            const DEstart = hipStart.DE;
            const DEend = hipEnd.DE;

            const pStart = sphIneCart(1, DEstart, RAstart);
            const pEnd = sphIneCart(1, DEend, RAend);

            lines.push(pStart);
            lines.push(pEnd);
        }

        constellationLines[cName] = lines;
    }

    return constellationLines;
}

function scaleConstellations(linesIn, scale, offset)
{
    const lines = [];

    for (const [key, value] of Object.entries(linesIn))
    {
        for (let indValue = 0; indValue < value.length; indValue++)
        {
            let vector = value[indValue];
            lines.push([vector[0] * scale + offset[0], vector[1] * scale + offset[1], vector[2] * scale + offset[2]]);
        }
    }

    return lines;
}

function scaleStars(stars, scale, offset)
{
    const points = [];
    const colors = [];

    for (let indStar = 0; indStar < stars.length; indStar++)
    {
        const value = stars[indStar];
        let vector = value.point;
        points.push([vector[0] * scale + offset[0], vector[1] * scale + offset[1], vector[2] * scale + offset[2]]);
        colors.push([255, 255, 255]);
    }

    return {points : points, colors : colors};
}


const constellationLines = createConstellationLines();
const constellationBoundaries = createConstellationBoundaries();
const starPoints = createStarPoints();

/**
 * Draw the scene.
 * 
 * @param {*} time 
 *      Timestamp from requestAnimationFrame (not used).
 */
function drawScene(time) 
{
    // Do not draw the scene before the textures have been loaded.
    if (earthShaders.numTextures < 2)
    {
        requestAnimationFrame(drawScene);
        return;
    }
    
    drawing = true;

    const targetText = document.getElementById('targetText');
    targetText.innerHTML = capitalizeFirst(target) + " from " + capitalizeFirst(observer);

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    //canvasJs.width = document.documentElement.clientWidth;
    //canvasJs.height = document.documentElement.clientHeight;

    gl.useProgram(earthShaders.program);

    // Compute Julian time corresponding to the (hardware) clock.
    let dateNow = new Date();
    let today = null;
    today = new Date(dateNow.getTime());

    let todayJT = 0;
    let warpFactorNew = 0; 
    
    if (guiControls.warpFactor > 0)
    {
        warpFactorNew = Math.pow(10, guiControls.warpFactor - 1);
    }
    if (guiControls < 0)
    {
        warpFactorNew = -Math.pow(10, - guiControls.warpFactor - 1);
    }
   
    todayJT = orbitsjs.timeJulianTs(today).JT;        
    if (guiControls.warp && warpFactorPrev != warpFactorNew && warpFactorNew != 0)
    {
        // We need to take into account that the warp factor can change between
        // two frames. In order to maintain continuity, we need to recompute 
        // JTstart.

        // warp * (todayJT - JTstartnew) = warpPrev * (todayJT - JTstartold) 
        // todayJT - JTstartnew = (warpPrev / warp) * (todayJT - JTstartold)
        // JTstartnew = todayJT - (warpPrev / warp) * (todayJT - JTstartold)
        JTstart = (todayJT) - (warpFactorPrev / warpFactorNew)
                * ((todayJT) - JTstart);
    }
    if (warpFactorNew == 0)
    {
        JTstart = todayJT;
    }
    if (guiControls.warp && !warpPrev)
    {
        JTstart = todayJT;
        deltaTime = 0;
    }
    if (!guiControls.warp && warpPrev)
    {
        deltaTime = JTprev - todayJT;
    }

    if (guiControls.warp)
    {
        todayJT = (orbitsjs.timeJulianTs(today).JT - JTstart) * warpFactorNew + JTstart;
    }
    else 
    {
        todayJT += deltaTime;
    }

    // Compute the Julian time taking into account the time warp.
    let JT =  todayJT;
    JTprev = JT;
    warpPrev = guiControls.warp;
    warpFactorPrev = warpFactorNew;
    //console.log(JT);

    const timeGreg = orbitsjs.timeGregorian(JT);
    const dateStr = createTimestamp(JT) + " TT Julian: " + JT.toFixed(6) + "<br>";
    const dateText = document.getElementById("dateText");
    dateText.innerHTML = dateStr;    

    // Compute nutation parameters.
    let T = (JT - 2451545.0)/36525.0;
    let nutPar = orbitsjs.nutationTerms(T);

    // Compute position of the Sun and the Moon in the EFI frame for the shader.
    const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT, nutPar);

    const osvEclObserver = orbitsjs.vsop87(observer, JT);
    const osvEclTarget = orbitsjs.vsop87(target, JT);
    const osvSunTarget = {
        r : orbitsjs.vecMul(osvEclTarget.r, -1), 
        v : orbitsjs.vecMul(osvEclTarget.v, -1),
        JT : JT 
    };
    const osvObserverTarget = {
        r : orbitsjs.vecDiff(osvEclObserver.r, osvEclTarget.r), 
        v : orbitsjs.vecDiff(osvEclObserver.v, osvEclTarget.v),
        JT : JT 
    };

    const osvSunTargetEq = orbitsjs.coordEclEq(osvSunTarget);
    const osvObserverTargetEq = orbitsjs.coordEclEq(osvObserverTarget);

    const rotParams = orbitsjs.planetRotationParams(target, JT - 0*2968/86400);
    const osvSunTargetEcef = coordBCRSECEF(osvSunTargetEq, rotParams);
    const osvObserverTargetEcef = coordBCRSECEF(osvObserverTargetEq, rotParams);
    const upDirECEF = coordBCRSECEF({r : [0, 0, 1], v : [0, 0, 0], JT : JT}, rotParams).r;
    
    //console.log(osvSunJupiterEcef.r);
    //console.log(rotParams);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Handle screen size updates.
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //const angularDiam = 2 * orbitsjs.atand(orbitsjs.planetData[target].eqRadius / orbitsjs.norm(osvObserverTargetEcef.r));
    //const fov = angularDiam * 1.5;
    //cameraControls.fov.setValue(fov * 3600);

    // The view matrix.
    const matrix = createViewMatrix(orbitsjs.vecMul(osvObserverTargetEcef.r, 1), upDirECEF, 
        orbitsjs.planetData[target].eqRadius);
    //console.log(orbitsjs.vecMul(osvEarthTargetEcef.r, 5e-6));
    // Draw the Earth.
    earthShaders.draw(matrix, 
        guiControls.enableTextures, 
        guiControls.enableGrid, 
        false, 
        false, 
        true,
        osvMoonEfi.r, 
        osvSunTargetEcef.r);

    lineShaders.colorOrbit = [255, 255, 255];
    const offset = osvObserverTargetEcef.r;
    lineShaders.setGeometry(scaleConstellations(constellationLines, orbitsjs.norm(offset), offset));
    //lineShaders.setGeometry([[0, 0, 0], [1e10, 1e10, 1e10]]);
    //lineShaders.draw(matrix);

    let starInfo = scaleStars(starPoints, orbitsjs.norm(offset), offset);
    const points = starInfo.points;
    const colors = starInfo.colors;

    pointShaders.colorPoint = [255, 255, 255];
    pointShaders.setGeometry(points);
    pointShaders.setColors();
    pointShaders.draw(matrix);

   // console.log(scaleConstellations(constellationBoundaries, orbitsjs.norm(osvSunTargetEcef.r)));

    // Draw the Sun and the Moon and lines to the subsolar and sublunar points.
    /*lineShaders.colorOrbit = "#ffffff";
    drawDistant(osvSunEfi.r, 695700000.0 * 2.0, matrix, guiControls.enableSubsolar,
        guiControls.enableSubsolarLine);
    lineShaders.colorOrbit = "#ffffff";
    drawDistant(osvMoonEfi.r, 1737400.0 * 2.0, matrix, guiControls.enableSublunar,
        guiControls.enableSublunarLine);
        */

    /*contextJs.beginPath();
    contextJs.strokeStyle = "#ffffff";
    contextJs.moveTo(0, 0);
    contextJs.lineTo(canvasJs.width, canvasJs.height);
    contextJs.stroke();

    
    contextJs.font = "12px Arial";
    contextJs.textBaseline = "top"
    contextJs.fillStyle = "#ffff00";
    contextJs.strokeText("69°22'33.2\"", 0, 0);*/

    // Call drawScene again next frame
    requestAnimationFrame(drawScene);

    drawing = false;
}

function coordECEFBCRS(osv, rotParams)
{
    const rBCRS = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.r, -rotParams.W), rotParams.delta_0 - 90), -rotParams.alpha_0 - 90);
    const vBCRS = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.v, -rotParams.W), rotParams.delta_0 - 90), -rotParams.alpha_0 - 90);

    return {r : rBCRS, v : vBCRS, JT : osv.JT};
}

function coordBCRSECEF(osv, rotParams)
{
    const rECEF = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.r, rotParams.alpha_0 + 90), 90 - rotParams.delta_0), rotParams.W);
    const vECEF = orbitsjs.rotateCart3d(orbitsjs.rotateCart1d(orbitsjs.rotateCart3d(
        osv.v, rotParams.alpha_0 + 90), 90 - rotParams.delta_0), rotParams.W);
    
    return {r : rECEF, v : vECEF, JT : osv.JT};
}

/**
 * Create view matrix taking into account the rotation.
 * 
 * @returns The view matrix.
 */
function createViewMatrix(cameraPosition, up, eqRadius)
{
    const fov = guiControls.fov / 3600.0;

    // Compute the projection matrix.
    camera.fovRad = orbitsjs.deg2Rad(fov);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    //const zNear = (camera.distance - b) / 2;
    const zNear = orbitsjs.norm(cameraPosition) * 0.9;
    const zFar = orbitsjs.norm(cameraPosition) * 1.1;
    const projectionMatrix = m4.perspective(camera.fovRad, aspect, zNear, zFar);

    // Camera position in the clip space.
    //const cameraPosition = [0, 0, camera.distance];
    //const up = [0, 0, 1];
    const target = [0, 0, 0];

    // Compute the camera's matrix using look at.
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // Update controls.
    //cameraControls.lon.setValue(-90 - orbitsjs.rad2Deg(camera.rotZ));
    //cameraControls.lat.setValue( 90 + orbitsjs.rad2Deg(camera.rotX));
    //cameraControls.distance.setValue(camera.distance);

    camera.rotX = 0;
    camera.rotY = 0;
    camera.rotZ = 0;

    // Rotate view projection matrix to take into account rotation to target coordinates.
    var matrix = m4.xRotate(viewProjectionMatrix, camera.rotX);
    matrix = m4.yRotate(matrix, camera.rotY);
    matrix = m4.zRotate(matrix, camera.rotZ);

    return matrix;
}


