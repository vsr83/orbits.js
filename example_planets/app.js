"use strict";

var gl = null;
var planetShaders = null;
var ringShaders = null;

//gl = canvas.getContext("webgl2");
gl = canvas.getContext("webgl2", {
    premultipliedAlpha: false  // Ask for non-premultiplied alpha
  });
if (!gl) 
{
    console.log("Failed to initialize GL.");
}

var canvasJs = document.getElementById("canvasJs");
var contextJs = canvasJs.getContext("2d");

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

//let target = 'mars';
let target = null;
let observer = 'earth';

// Current state of the camera.
const camera = {
    rotX : orbitsjs.deg2Rad(-90),
    rotY : 0,
    rotZ : 0,
    fovRad : orbitsjs.deg2Rad(30),
    distance : 10.0,
    zFar : 1000000000
};

/**
 * Set visual target.
 * 
 * @param {*} planetName
 *      Name of the target planet. 
 */
function setTarget(planetName)
{
    if (planetName === observer)
    {
        return;
    }

    const a = orbitsjs.planetData[planetName].eqRadius;
    const b = orbitsjs.planetData[planetName].polarRadius;

    target = planetName;
    // Create and initialize shaders.
    planetShaders = new PlanetShaders(gl, 50, 50, a, b, 15, 15);
    planetShaders.init(planetTextures[target].day, planetTextures[target].night);

    if (target === "saturn")
    {
        ringShaders = new RingShaders(gl, 50, 5, 74500e3, 136780e3, 
            orbitsjs.planetData[planetName].eqRadius, orbitsjs.planetData[planetName].polarRadius);
        ringShaders.init("textures/2k_saturn_ring_alpha.png", "textures/darkside.jpg");
    }
}

/**
 * Set oberver location.
 * 
 * @param {*} planetName
 *      Name of the observer planet. 
 */
function setObserver(planetName)
{
    if (planetName === target)
    {
        return;
    }

    observer = planetName;
}


setTarget('mars');

const lineShaders = new LineShaders(gl);
lineShaders.init();

const pointShaders = new PointShaders(gl);
pointShaders.init();

let JTstart = orbitsjs.timeJulianTs(new Date()).JT;
let JTclockStart = JTstart;
let JTclock = JTstart;
let JTprev = JTstart;
let warpFactorPrev = 1;
let warpPrev = false;
let deltaJT = 0;

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

/**
 * Create constellation boundary lines in BCRS frame.
 * 
 * @returns Object with array of points on unit sphere for each constellation.
 */
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

/**
 * Create constellation lines in BCRS frame.
 * 
 * @returns Object with array of points on unit sphere for each constellation.
 */
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

/**
 * Scale and rotate constellations.
 * 
 * @param {*} linesIn 
 * @param {*} scale 
 * @param {*} offset 
 * @param {*} rotParams 
 * @param {*} JT 
 * @returns 
 */
function scaleConstellations(linesIn, scale, offset, rotParams, JT)
{
    const lines = [];

    for (const [key, value] of Object.entries(linesIn))
    {
        for (let indValue = 0; indValue < value.length; indValue++)
        {
            let vector = value[indValue];
            vector = orbitsjs.coordBCRSFixed({r : vector, v : [0, 0, 0], JT : JT}, rotParams).r;
            lines.push([vector[0] * scale + offset[0], vector[1] * scale + offset[1], vector[2] * scale + offset[2]]);
        }
    }

    return lines;
}
/**
 * Draw caption.
 * 
 * @param {*} rTarget 
 *      Position of the target in ECEF frame.
 * @param {*} caption 
 *      Caption.
 * @param {*} matrix
 *      View Matrix.
 */
function drawCaption(rTarget, caption, matrix)
{
    contextJs.fillStyle = "white";
    contextJs.textAlign = "center";
    contextJs.textBaseline = "bottom";
    contextJs.textAlign = "right";

    const clipSpace = m4.transformVector(matrix, [rTarget[0], rTarget[1], rTarget[2], 1]);
    clipSpace[0] /= clipSpace[3];
    clipSpace[1] /= clipSpace[3];
    const pixelX = (clipSpace[0] *  0.5 + 0.5) * gl.canvas.width;
    const pixelY = (clipSpace[1] * -0.5 + 0.5) * gl.canvas.height;
    contextJs.fillText(caption + "    ", pixelX, pixelY); 

    //console.log(pixelX + " " + pixelY);
}

/**
 * Scale and rotate star points.
 * 
 * @param {*} stars 
 * @param {*} scale 
 * @param {*} offset 
 * @param {*} rotParams 
 * @param {*} JT 
 * @returns 
 */
function scaleStars(stars, scale, offset, rotParams, JT)
{
    const points = [];
    const colors = [];

    for (let indStar = 0; indStar < stars.length; indStar++)
    {
        const value = stars[indStar];
        let vector = value.point;

        vector = orbitsjs.coordBCRSFixed({r : vector, v : [0, 0, 0], JT : JT}, rotParams).r;
        const r = [vector[0] * scale + offset[0], vector[1] * scale + offset[1], vector[2] * scale + offset[2]];
                
        points.push(r);
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
    if (planetShaders.numTextures < 2)
    {
        requestAnimationFrame(drawScene);
        return;
    }
    
    drawing = true;

    const targetText = document.getElementById('targetText');
    targetText.innerHTML = capitalizeFirst(target) + " from " + capitalizeFirst(observer);

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    canvasJs.width = document.documentElement.clientWidth;
    canvasJs.height = document.documentElement.clientHeight;

    gl.useProgram(planetShaders.program);

    // Compute Julian time corresponding to the (hardware) clock.
    let dateNow = new Date();
    //JTclock = new Date(dateNow.getTime());
    JTclock = orbitsjs.timeJulianTs(new Date(dateNow.getTime())).JT;

    let warpFactorNew = 0; 
    
    if (guiControls.warpFactor > 0)
    {
        warpFactorNew = Math.pow(10, guiControls.warpFactor - 1);
    }
    if (guiControls.warpFactor < 0)
    {
        warpFactorNew = -Math.pow(10, - guiControls.warpFactor - 1);
    }
    if (!guiControls.warp)
    {
        warpFactorNew = 1;
    }

    let JT;
    if (guiControls.pause)
    {
        JTclockStart = JTclock;
        JTstart = JTprev;
        JT = JTprev;        
    }
    else if (warpFactorPrev != warpFactorNew && warpFactorNew != 0)
    {
        JTclockStart = JTclock;
        JTstart = JTprev;
        JT = JTprev;
    }
    else
    {
         JT = JTstart + (JTclock - JTclockStart) * warpFactorNew;
    }

    // Compute the Julian time taking into account the time warp.
    //let JT =  todayJT;
    JTprev = JT;
    JT += deltaJT;

    warpPrev = guiControls.warp;
    warpFactorPrev = warpFactorNew;
    //console.log(JT);

    // Compute nutation parameters.
    let T = (JT - 2451545.0)/36525.0;
    let nutPar = orbitsjs.nutationTerms(T);

    // Compute position of the Sun and the Moon in the EFI frame for the shader.
    const osvMoonEfi = orbitsjs.computeOsvMoonEfi(JT, nutPar);

    const osvEclObserver = orbitsjs.vsop87(observer, JT);
    const osvEclTarget = orbitsjs.vsop87(target, JT);

    // OSV of the Sun w.r.t. target (ecliptic).
    const osvSunTarget = {
        r : orbitsjs.vecMul(osvEclTarget.r, -1), 
        v : orbitsjs.vecMul(osvEclTarget.v, -1),
        JT : JT 
    };
    // OSV of the observer w.r.t. target (ecliptic).
    const osvObserverTarget = {
        r : orbitsjs.vecDiff(osvEclObserver.r, osvEclTarget.r), 
        v : orbitsjs.vecDiff(osvEclObserver.v, osvEclTarget.v),
        JT : JT 
    };

    // OSV of the Sun and the observer (equatorial).
    const osvSunTargetEq = orbitsjs.coordEclEq(osvSunTarget);
    const osvObserverTargetEq = orbitsjs.coordEclEq(osvObserverTarget);
    const distance = orbitsjs.norm(osvObserverTarget.r);

    let lightTimeJulian = 0;
    if (guiControls.lightTime)
    {
        lightTimeJulian = distance / (299792458 * 86400);
    }

    const rotParams = orbitsjs.planetRotationParams(target, JT - lightTimeJulian);

    // Equatorial up direction of the observer in target frame. 
    // TODO: Take into account the up direction when the observer is not on Earth.
    const upDirECEF = orbitsjs.coordBCRSFixed({r : [0, 0, 1], v : [0, 0, 0], JT : JT}, rotParams).r;
    const osvSunTargetEcef = orbitsjs.coordBCRSFixed(osvSunTargetEq, rotParams);
    const osvObserverTargetEcef = orbitsjs.coordBCRSFixed(osvObserverTargetEq, rotParams);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Handle screen size updates.
    resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    // The view matrix.
    const matrix = createViewMatrix(orbitsjs.vecMul(osvObserverTargetEcef.r, 1), upDirECEF, 
        orbitsjs.planetData[target].eqRadius);
    
    // Draw the planet.
    planetShaders.draw(matrix, 
        guiControls.enableTextures, 
        guiControls.enableGrid, 
        false, 
        false, 
        true,
        osvMoonEfi.r, 
        osvSunTargetEcef.r);


    if (target === "saturn")
    {
        ringShaders.draw(matrix, 
            guiControls.enableTextures, 
            guiControls.enableGrid, 
            false, 
            false, 
            true,
            osvMoonEfi.r, 
            osvSunTargetEcef.r);
    
    }

    const offset = osvObserverTargetEcef.r;
    if (guiControls.enableConstellations)
    {
        lineShaders.colorOrbit = guiControls.colorConstellations;
        lineShaders.setGeometry(scaleConstellations(constellationLines, orbitsjs.norm(offset), offset, rotParams, JT));
        lineShaders.draw(matrix);
    }

    pointShaders.colorPoint = guiControls.colorMoons;
    if (guiControls.enableMoons)
    {
        if (target === "earth")
        {
            let JTmoons = JT;

            if (guiControls.lightTime)
            {
                JTmoons -= lightTimeJulian;
            }

            let moonPosEq = orbitsjs.elp2000(JTmoons);
            const osvJ2000 = orbitsjs.coordEclEq({r : moonPosEq, v : [0, 0, 0], JT : JT});
            const osvMod = orbitsjs.coordJ2000Mod(osvJ2000);
            const osvTod = orbitsjs.coordModTod(osvMod);
            const osvPef = orbitsjs.coordTodPef(osvTod);
            const osvEcef = orbitsjs.coordPefEfi(osvPef, 0, 0);

            pointShaders.setGeometry([osvEcef.r]);
            pointShaders.draw(matrix);

            if (guiControls.enableMoonCaptions)
            {
                drawCaption(osvEcef.r, "Moon", matrix);
            }
        }
        if (target === "mars")
        {
            let JTmoons = JT;

            if (guiControls.lightTime)
            {
                JTmoons -= lightTimeJulian;
            }
            
            const moons =  orbitsjs.marsSatellites(JTmoons);
            const rPhobosECEF = orbitsjs.coordBCRSFixed({r : moons.phobos, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rDeimosECEF = orbitsjs.coordBCRSFixed({r : moons.deimos, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            pointShaders.setGeometry([rPhobosECEF, rDeimosECEF]);
            pointShaders.draw(matrix);

            if (guiControls.enableMoonCaptions)
            {
                drawCaption(rPhobosECEF, "Phobos", matrix);
                drawCaption(rDeimosECEF, "Deimos", matrix);
            }
        }
        if (target === "jupiter")
        {
            let JTmoons = JT;

            if (guiControls.lightTime)
            {
                JTmoons -= lightTimeJulian;
            }
            
            const moons =  orbitsjs.jupiterSatellites(JTmoons);
            const rIoECEF = orbitsjs.coordBCRSFixed({r : moons.io, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rEuropaECEF = orbitsjs.coordBCRSFixed({r : moons.europa, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rGanymedeECEF = orbitsjs.coordBCRSFixed({r : moons.ganymede, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rCallistoECEF = orbitsjs.coordBCRSFixed({r : moons.callisto, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            pointShaders.setGeometry([rIoECEF, rEuropaECEF, rGanymedeECEF, rCallistoECEF]);
            pointShaders.draw(matrix);

            if (guiControls.enableMoonCaptions)
            {
                drawCaption(rIoECEF, "Io", matrix);
                drawCaption(rEuropaECEF, "Europa", matrix);
                drawCaption(rGanymedeECEF, "Ganymede", matrix);
                drawCaption(rCallistoECEF, "Callisto", matrix);
            }
        }
        if (target === "saturn")
        {
            let JTmoons = JT;

            if (guiControls.lightTime)
            {
                JTmoons -= lightTimeJulian;
            }
            
            const moons =  orbitsjs.saturnSatellites(JTmoons);
            const rMimasEcef = orbitsjs.coordBCRSFixed({r : moons.mimas.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rEnceladusEcef= orbitsjs.coordBCRSFixed({r : moons.enceladus.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rTethysEcef = orbitsjs.coordBCRSFixed({r : moons.tethys.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rDioneEcef = orbitsjs.coordBCRSFixed({r : moons.dione.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rRheaEcef = orbitsjs.coordBCRSFixed({r : moons.rhea.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rTitanEcef = orbitsjs.coordBCRSFixed({r : moons.titan.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rIapetusEcef = orbitsjs.coordBCRSFixed({r : moons.iapetus.r, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            pointShaders.setGeometry([rMimasEcef, rEnceladusEcef, rTethysEcef, rDioneEcef, rRheaEcef, rTitanEcef, rIapetusEcef]);
            pointShaders.draw(matrix);

            if (guiControls.enableMoonCaptions)
            {
                drawCaption(rMimasEcef, "Mimas", matrix);
                drawCaption(rEnceladusEcef, "Enceladus", matrix);
                drawCaption(rTethysEcef, "Tethys", matrix);
                drawCaption(rDioneEcef, "Dione", matrix);
                drawCaption(rRheaEcef, "Rhea", matrix);
                drawCaption(rTitanEcef, "Titan", matrix);
                drawCaption(rIapetusEcef, "Iapetus", matrix);
            }
        }
        if (target === "uranus")
        {
            let JTmoons = JT;

            if (guiControls.lightTime)
            {
                JTmoons -= lightTimeJulian;
            }
            
            const moons =  orbitsjs.uranusSatellites(JTmoons);
            const rMirandaECEF = orbitsjs.coordBCRSFixed({r : moons.miranda, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rArielECEF   = orbitsjs.coordBCRSFixed({r : moons.ariel,   v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rUmbrielECEF = orbitsjs.coordBCRSFixed({r : moons.umbriel, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rTitaniaECEF = orbitsjs.coordBCRSFixed({r : moons.titania, v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            const rOberonECEF  = orbitsjs.coordBCRSFixed({r : moons.oberon,  v : [0, 0, 0], JT : JTmoons}, rotParams).r;
            pointShaders.setGeometry([rMirandaECEF, rArielECEF, rUmbrielECEF, rTitaniaECEF, rOberonECEF]);
            pointShaders.draw(matrix);

            if (guiControls.enableMoonCaptions)
            {
                drawCaption(rMirandaECEF, "Miranda", matrix);
                drawCaption(rArielECEF, "Ariel", matrix);
                drawCaption(rUmbrielECEF, "Umbriel", matrix);
                drawCaption(rTitaniaECEF, "Titania", matrix);
                drawCaption(rOberonECEF, "Oberon", matrix);
            }
        }
    }

    if (guiControls.enableStars)
    {
        let starInfo = scaleStars(starPoints, orbitsjs.norm(offset), offset, rotParams, JT);
        const points = starInfo.points;
        const colors = starInfo.colors;
        pointShaders.colorPoint = guiControls.colorStars;
        pointShaders.setGeometry(points);
        pointShaders.setColors();
        pointShaders.draw(matrix);
    }

   // console.log(scaleConstellations(constellationBoundaries, orbitsjs.norm(osvSunTargetEcef.r)));

    // Call drawScene again next frame
    requestAnimationFrame(drawScene);

    const angularDiamEq = 3600 * 2 * orbitsjs.atand(orbitsjs.planetData[target].eqRadius / distance);
    const angularDiamPolar = 3600 * 2 * orbitsjs.atand(orbitsjs.planetData[target].polarRadius / distance);

    const timeGreg = orbitsjs.timeGregorian(JT);
    const dateStr = createTimestamp(JT) + " TT Julian: " + JT.toFixed(6) + "<br>";
    const dateText = document.getElementById("dateText");
    const au = 1.495978707e11;
    const distanceAu = (distance / au).toFixed(5);
    const cameraStr = "Dist: " + distanceAu + " au" + "<br>"
                    + "FoV : " + guiControls.fov.toFixed(1) + "\"" + "<br>"
                    + "Size: " + angularDiamEq.toFixed(2) + "\"/" + angularDiamPolar.toFixed(2) + "\" eq/polar";
    dateText.innerHTML = dateStr;

    if (guiControls.fixSize)
    {
        const newFov = angularDiamPolar / (guiControls.fillPercentage * 0.01);
        cameraControls.fov.setValue(newFov);
    }

    const infoText = document.getElementById("infoText");
    infoText.innerHTML = cameraStr;

    drawing = false;
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

    // Planet is always placed at the center.
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

    // Since the app simulated fixed views between centers of planets, the rotations are 
    // always zero.
    camera.rotX = 0;
    camera.rotY = 0;
    camera.rotZ = 0;

    // Rotate view projection matrix to take into account rotation to target coordinates.
    var matrix = m4.xRotate(viewProjectionMatrix, camera.rotX);
    matrix = m4.yRotate(matrix, camera.rotY);
    matrix = m4.zRotate(matrix, camera.rotZ);

    return matrix;
}


