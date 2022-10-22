// Time warp state.
let warpDelta = 0.0;
let warpAccumulation = 0.0;
let warpRefTime = null;
let targetName = "";

// DOM elements:
const view1 = document.querySelector('#view1');
const view2 = document.querySelector('#view2');
view1.style.left= '0px';
view1.style.top= '0px';
view2.style.left= window.innerWidth/2 + 'px';

view2.style.top= '0px';
// Configure renderer.
const renderer1 = new THREE.WebGLRenderer({antialias: true});
renderer1.setPixelRatio( window.devicePixelRatio );
renderer1.setSize(window.innerWidth, window.innerHeight);
view1.appendChild( renderer1.domElement );

// Configure renderer.
const renderer2 = new THREE.WebGLRenderer({antialias: true});
renderer2.setPixelRatio( window.devicePixelRatio );
renderer2.setSize(window.innerWidth / 2, window.innerHeight);
view2.appendChild( renderer2.domElement );
view2.style.visibility = 'hidden';

// Configure camera.
const aspect = window.innerWidth / window.innerHeight;
let fov = 70;
const near = 1;
const far = 6000;

// Main view.
const camera1 = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera1.position.z = 1;
camera1.up.x = 0;
camera1.up.y = 0;
camera1.up.z = 1;

// External view with the globe.
const camera2 = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera2.position.z = 200;
camera2.position.y = -200;
camera2.up.x = 0;
camera2.up.y = 0;
camera2.up.z = 1;
camera2.lookAt(0, 0, 0);

// Configure orbit controls. Instead of moving the camera when "zooming",
// we change the FoV.
const controls1 = new THREE.OrbitControls(camera1, renderer1.domElement);
controls1.enableZoom = false;
controls1.enablePan = false;
const controls2 = new THREE.OrbitControls(camera2, renderer2.domElement);
controls2.enableZoom = false;
controls2.enablePan = false;

// Create the scene.
const scene = new THREE.Scene();
const cameraHelper = new THREE.CameraHelper(camera1);
scene.add(cameraHelper);

// Intersection scene.
const sceneIntersect = new THREE.Scene();
let sphereInGeometry = new THREE.SphereGeometry(500, 128, 128);
let sphereInMaterial = new THREE.MeshBasicMaterial({color: 0x123456});
sphereInMaterial.side = THREE.DoubleSide;
let inMesh = new THREE.Mesh(sphereInGeometry, sphereInMaterial);
sceneIntersect.add(inMesh);

// Selection scene.
const sceneSelect = new THREE.Scene();

// Create the globe.
let sphereGeometry = new THREE.SphereGeometry(50, 64, 64);
const texture = new THREE.TextureLoader().load('imports/2k_earth_daymap.jpeg');
let sphereMaterial = new THREE.MeshBasicMaterial({map : texture});
let earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(earthMesh);

// Create equatorial circle.
let equator = null;
{
    const points = [];
    for (let RA = 0; RA < 361; RA++)
    {
        const R = 500;
        const DE = 0.0;
        const pStart = sphIneCart(R, DE, RA);
        points.push(new THREE.Vector3(pStart[0], pStart[1], pStart[2]));
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0xaaaaaa } );
    equator = new THREE.Line( lineGeom, lineMaterial );
    scene.add(equator);
}

// Create selection ring.
const ringGeometry = new THREE.RingGeometry( 60, 100, 32 );
const ringMaterial = new THREE.MeshBasicMaterial({color: 0xcc0000, side: THREE.DoubleSide,
    opacity : 0.5, transparent : true});
const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
ringMesh.visible = true;

scene.add(ringMesh);

// Create constellation boundaries.
const boundaryGroup = new THREE.Group();
scene.add(boundaryGroup);
let ind  = 0;
for (let [cName, cPoints] of Object.entries(orbitsjs.constellationBoundaries))
{
    const points = [];
    for (let indPoint = 0; indPoint < cPoints.length; indPoint++)
    {
        let point = cPoints[indPoint];
        const RA = point[0];
        const DE = point[1];
        const pStart = sphIneCart(celestialSphereRadius, DE, RA);
        points.push(new THREE.Vector3(pStart[0], pStart[1], pStart[2]));
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0x886666 } );
    const line = new THREE.Line( lineGeom, lineMaterial );
    boundaryGroup.add(line);
}

// Create constellations.
//console.log(orbitsjs.constellations);
const constellationGroup = new THREE.Group();
scene.add(constellationGroup);
for (let [cName, cValue] of Object.entries(orbitsjs.constellations))
{
    //console.log(cName);

    const constellation = orbitsjs.constellations[cName];
    //console.log(constellation);
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

        const pStart = sphIneCart(celestialSphereRadius, DEstart, RAstart);
        const pEnd = sphIneCart(celestialSphereRadius, DEend, RAend);

        const vec = orbitsjs.vecDiff(pEnd, pStart);
        const vecU = orbitsjs.vecMul(vec, 1.0 / orbitsjs.norm(vec));
        const pStart2 = orbitsjs.vecSum(pStart, orbitsjs.vecMul(vecU, 4.0));    
        const pEnd2 = orbitsjs.vecDiff(pEnd, orbitsjs.vecMul(vecU, 4.0));

        const points = [];
        points.push(new THREE.Vector3(pStart2[0], pStart2[1], pStart2[2]) );
        points.push(new THREE.Vector3(pEnd2[0], pEnd2[1], pEnd2[2]) );
        const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
        const lineMaterial = new THREE.LineBasicMaterial( { color: 0x0000ff } );
        const line = new THREE.Line( lineGeom, lineMaterial );
        constellationGroup.add(line);
    }
}
// Create stars.
const starsGroup = new THREE.Group();
const starsSelectGroup = new THREE.Group();
scene.add(starsGroup);
sceneSelect.add(starsSelectGroup);

for (let [hipName, hipObj] of Object.entries(orbitsjs.hipparcosData))
{
    const radius = 0.005 * celestialSphereRadius * Math.exp(-hipObj.mag/3.0);

    const sphGeometry = new THREE.SphereGeometry( radius, 5, 5 );
    const sphMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    const sphere = new THREE.Mesh( sphGeometry, sphMaterial );

    // Select spheres.
    const selectGeometry = new THREE.SphereGeometry(radius*5, 5, 5 );
    const selectMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    selectMaterial.side = THREE.DoubleSide;
    const selectSphere = new THREE.Mesh(selectGeometry, selectMaterial);

    const DE = hipObj.DE;
    const RA = hipObj.RA;

    const p = sphIneCart(celestialSphereRadius, DE, RA);
    setVec3Array(sphere.position, p);
    setVec3Array(selectSphere.position, p);
    selectSphere.hipName = hipName;

    //console.log(hipObj);
    starsGroup.add(sphere);
    starsSelectGroup.add(selectSphere);
}

// Create the horizontal plane.
const planeGroup = new THREE.Group();
scene.add(planeGroup);
const planeGeom = new THREE.CircleGeometry(90, 50);
const planeMaterial = new THREE.MeshBasicMaterial({color : 0x559955, opacity : 0.5, transparent : true});
planeMaterial.side = THREE.DoubleSide;
const planeMesh = new THREE.Mesh(planeGeom, planeMaterial);
planeMesh.position.z = -1;
planeGroup.add(planeMesh);

// Create AzElGrid.
const azElGroup = new THREE.Group();
scene.add(azElGroup);

const azTextGroup = new THREE.Group();
azElGroup.add(azTextGroup);
const elTextGroup = new THREE.Group();
azElGroup.add(elTextGroup);

for (let az = 0; az < 360; az += 15)
{
    const points = [];
    for (let el = 0; el < 180; el+= 10)
    {
        const point = array3Vec(sphEnuCart(celestialSphereRadius, el, az));
        points.push(point);
    }
    const material = new THREE.LineBasicMaterial( { color: 0x555555 } );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    azElGroup.add(line);
}
for (let el = 0; el < 90; el+= 15)
{
    const points = [];
    for (let az = 0; az <= 360; az += 2.5)
    {
        const point = array3Vec(sphEnuCart(celestialSphereRadius, el, az));
        points.push(point);
    }
    const material = new THREE.LineBasicMaterial( { color: 0x555555 } );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    azElGroup.add(line);
}

// Create planetary orbits.
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const planetNames = {
    'mercury' : 'Mercury',
    'venus' : 'Venus',
    'earth' : 'Sun',
    'mars' : 'Mars', 
    'jupiter' : 'Jupiter',
    'saturn' : 'Saturn',
    'uranus' : 'Uranus',
    'neptune' : 'Neptune'
};

// Add the Moon:
const moonGeometry = new THREE.SphereGeometry(150, 10, 10 );
const moonMaterial = new THREE.MeshBasicMaterial( { color: 0x999999 } );
const moonMesh= new THREE.Mesh(moonGeometry, moonMaterial);
let moonLabel = null;
moonMesh.position.x = celestialSphereRadius;
scene.add(moonMesh);
const moonSelectGeometry = new THREE.SphereGeometry(50, 10, 10);
const moonSelectMaterial = new THREE.MeshBasicMaterial( { color: 0x999999 } );
const moonSelect = new THREE.Mesh(moonSelectGeometry, moonSelectMaterial);
moonSelect.isMoon = true;
sceneSelect.add(moonSelect);

// Add planets.
const planetCoeff = [0.003, 0.005, 0.03, 0.005, 0.005, 0.005, 0.002, 0.002];
const planetColors = [0xff0000, 0xffff00, 0xffffff, 0xff0000, 0xffff00, 0xffff99, 0x4444aa, 0x333388];
const planetMeshes = [];
const planetSelectMeshes = [];
const planetTextMeshes = [];

const planetMeshGroup = new THREE.Group();
scene.add(planetMeshGroup);
const selectPlanetMeshGroup = new THREE.Group();
sceneSelect.add(selectPlanetMeshGroup);

for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
{
    const planet = planets[indPlanet];

    const radius = planetCoeff[indPlanet] * celestialSphereRadius;
    const sphGeometry = new THREE.SphereGeometry( radius, 10, 10 );
    const sphMaterial = new THREE.MeshBasicMaterial( { color: planetColors[indPlanet] } );
    const sphere = new THREE.Mesh( sphGeometry, sphMaterial );

    planetMeshes[planet] = sphere;
    planetMeshGroup.add(sphere);    

    const sphSelectGeometry = new THREE.SphereGeometry(50, 10, 10);
    const sphSelectMaterial = new THREE.MeshBasicMaterial( { color: planetColors[indPlanet] } );
    const sphereSelect = new THREE.Mesh( sphSelectGeometry, sphSelectMaterial );
    planetSelectMeshes[planet] = sphereSelect;
    sphereSelect.planet = planet;
    selectPlanetMeshGroup.add(sphereSelect);
}

const periods = [365, 365, 367, 715, 12*365.25, 29*365.25, 84*365.25, 165*365.25, 0];
const orbits = [];

const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const dateNow = new Date();
const JT0 = orbitsjs.dateJulianYmd(dateNow.getUTCFullYear(),
                                   dateNow.getUTCMonth() + 1,
                                   dateNow.getUTCDate());
for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
{
    const planet = planets[indPlanet];
    // console.log(periods[indPlanet]);

    const points = [];
    for (let deltaJT = -periods[indPlanet]/2; deltaJT < periods[indPlanet]/2; deltaJT+= periods[indPlanet]/365)
    {
        const JT = JT0 + deltaJT;
        let posVelEarth = orbitsjs.vsop87('earth', JT);
        let posVelInitial = orbitsjs.vsop87(planet, JT);

        if (planet === 'earth')
        {
            postVelInitial = posVelEarth;
            posVelEarth = {r : [0, 0, 0], v : [0, 0, 0], JT : JT};
        }

        const diffPosInitial = orbitsjs.vecDiff(posVelInitial.r, posVelEarth.r);
        const diffVelInitial = orbitsjs.vecDiff(posVelInitial.v, posVelEarth.v);

        const osv = orbitsjs.coordEclEq({r: diffPosInitial, v: diffVelInitial, JT : JT});
        const {rDummy, RA, DE} = cartIneSph(osv.r); 

        const R = 4995;
        points.push(array3Vec(sphIneCart(R, DE, RA)));
    }

    // console.log(points);
    const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
    let lineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
    if (planet === 'earth')
    {
        lineMaterial = new THREE.LineBasicMaterial( { color: 0xffff00 } );
    }

    const line = new THREE.Line( lineGeom, lineMaterial );
    orbitGroup.add(line);
    orbits[planet] = line;
}

// Create empty group for satellites:
const satelliteMeshGroup = new THREE.Group();
let satelliteMeshList = {};
const satelliteSelectGroup = new THREE.Group();
let satelliteSelectMeshList = {};
scene.add(satelliteMeshGroup);
sceneSelect.add(satelliteSelectGroup);

// Initialize autocomplete:
targetList = Object.keys(orbitsjs.hipparcosData);
targetType = [];
targetList.forEach(function(target) {
    targetType[target] = "star";
});
// Add planets to the target list.
const solarSystemTargets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sun'];
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
                if (selection === 'sun')
                {
                    setTarget('earth');
                }
                else 
                {
                    setTarget(selection);
                }
            }
        }
    }
});


// Change FoV with wheel.
view1.addEventListener("wheel", function(event) 
{
    fov += event.deltaY/25;
    if (fov < 1) fov = 1
    if (fov > 170) fov = 170;
    camera1.fov = fov;
    camera1.updateProjectionMatrix();
});

/**
 * Handler for resize events.
 */
function onWindowResize()
{
    // The resize is handled differently according to whether both views are enabled.
    if (guiControls.showSplit)
    {
        renderer1.setSize(window.innerWidth / 2, window.innerHeight);
        renderer2.setSize(window.innerWidth / 2, window.innerHeight);
        view2.style.left= window.innerWidth / 2 + 'px';    
        view2.style.visibility = 'visible';
        const aspect = 0.5 * window.innerWidth / window.innerHeight;

        camera1.aspect = aspect;
        camera2.aspect = aspect;
        camera1.updateProjectionMatrix();
        camera2.updateProjectionMatrix();
    }
    else 
    {
        renderer1.setSize(window.innerWidth, window.innerHeight);
        view2.style.visibility = 'hidden';
        const aspect = window.innerWidth / window.innerHeight;
        camera1.aspect = aspect;
        camera1.updateProjectionMatrix();
    }
}

/**
 * Load fonts and create text meshes.
 */
function loadText() 
{
    const loader = new THREE.FontLoader();
    loader.load( 'imports/helvetiker_regular.typeface.json', function ( response ) {
        const font = response;

        materials = [
            new THREE.MeshBasicMaterial({color : 0xaaaaaa}),
            new THREE.MeshBasicMaterial({color : 0x777777})
        ];
        const textopts = {
            font : font,
            size : 4,
            height : 1,
            curveSegments: 4,
            bevelThickness: 2,
            bevelSize: 1.5,
            bevelEnabled: false
        };
        const textGeoNorth = new THREE.TextGeometry("N", textopts);
        const textMeshNorth = new THREE.Mesh(textGeoNorth, materials);
        const textGeoSouth = new THREE.TextGeometry("S", textopts);
        const textMeshSouth = new THREE.Mesh(textGeoSouth, materials);
        const textGeoWest = new THREE.TextGeometry("W", textopts);
        const textMeshWest = new THREE.Mesh(textGeoWest, materials);
        const textGeoEast = new THREE.TextGeometry("E", textopts);
        const textMeshEast = new THREE.Mesh(textGeoEast, materials);

        textMeshNorth.position.x = -2;
        textMeshNorth.position.y = 70;
        textMeshNorth.position.z = -6;
        textMeshSouth.position.x = -2;
        textMeshSouth.position.y = -70;
        textMeshSouth.position.z = -2;
        textMeshWest.position.x = -70;
        textMeshWest.position.y = -2;
        textMeshWest.position.z = -6;
        textMeshEast.position.x = 70;
        textMeshEast.position.y = 2;
        textMeshEast.position.z = -6;
        textMeshNorth.rotation.x = Math.PI/2;
        textMeshSouth.rotation.x = -Math.PI/2;
        textMeshWest.rotation.y = Math.PI/2;
        textMeshEast.rotation.y = -Math.PI/2;
        textMeshEast.rotation.z = -Math.PI/2;
        textMeshWest.rotation.z = Math.PI/2;

        planeGroup.add(textMeshNorth);
        planeGroup.add(textMeshSouth);
        planeGroup.add(textMeshWest);
        planeGroup.add(textMeshEast);

        const textoptsGrid = {
            font : font,
            size : 50,
            height : 5,
            curveSegments: 4,
            bevelThickness: 20,
            bevelSize: 10,
            bevelEnabled: false
        };

        for (let az = 0; az < 360; az+= 15)
        {
            const textGeo = new THREE.TextGeometry(az.toString() + "°", textoptsGrid);
            const textMesh = new THREE.Mesh(textGeo, materials);

            setVec3Array(textMesh.position, sphEnuCart(celestialSphereRadius, 0.2, az));
            textMesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), orbitsjs.deg2Rad(-az));
            textMesh.rotateOnWorldAxis(new THREE.Vector3(orbitsjs.cosd(az), -orbitsjs.sind(az), 0), Math.PI/2);

            azTextGroup.add(textMesh);
        }

        for (let el = 0; el < 90; el+= 15)
        {
            const textGeo = new THREE.TextGeometry(el.toString() + "°", textoptsGrid);
            const textMesh = new THREE.Mesh(textGeo, materials);

            setVec3Array(textMesh.position, sphEnuCart(celestialSphereRadius, el+0.3, 0.2));
            textMesh.rotateOnWorldAxis(new THREE.Vector3(orbitsjs.cosd(0), -orbitsjs.sind(0), 0), Math.PI/2+orbitsjs.deg2Rad(el));
            elTextGroup.add(textMesh);
        }

        for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
        {
            const planet = planets[indPlanet];
            let planetCaption = "  " + planet.charAt(0).toUpperCase() + planet.slice(1);
            if (planet === "earth")
            {
                planetCaption = "         Sun";
            }

            const textGeo = new THREE.TextGeometry(planetCaption, textoptsGrid);
            const textMesh = new THREE.Mesh(textGeo, materials);
            planetTextMeshes[planet] = textMesh;
            planetMeshGroup.add(textMesh);
        }

        const moonTextGeo = new THREE.TextGeometry("          Moon", textoptsGrid);
        moonLabel = new THREE.Mesh(moonTextGeo, materials);
        scene.add(moonLabel);
    } );
}
window.addEventListener('resize', onWindowResize, false);
 
/**
 * Set location label based on horizontal topocentric coordinates.
 * 
 * @param {*} az 
 *      The azimuth in degrees.
 * @param {*} el 
 *      The elevation in degrees.
 */
function setLocation(az, el)
{
    const azArc = orbitsjs.angleDegArc(limitDeg360(az), true);
    const elArc = orbitsjs.angleDegArc(limitDeg360(el));

    if (targetName.length > 0)
    {
        const azDelta = orbitsjs.deg2Rad(az) + controls1.getAzimuthalAngle();
        const elDelta = (orbitsjs.deg2Rad(el) + Math.PI/2) - controls1.getPolarAngle();

        if (guiControls.lockAzi)
        {
            controls1.setAzimuthDeltaAngle(-azDelta);
        }
        if (guiControls.lockEle)
        {
            controls1.setPolarDeltaAngle(elDelta);
        }
    }

    const fixedW = function(num, len) 
    {
        let str = parseFloat(num).toString();
        let lenNew = str.length;

        while (lenNew < len)
        {
            str = '&nbsp;' + str;
            lenNew++;
        }

        return str;
    }

    const elemCoord = document.getElementById('coordText');
    elemCoord.innerHTML = 'Az: ' + fixedW(azArc.deg, 3) + '\xB0 ' 
                        + fixedW(azArc.arcMin, 3) + '\u2032 ' 
                        + fixedW(azArc.arcSec.toFixed(1), 5) + '\u2033' 
                        + ' (' + az.toFixed(4) + '\xB0)' + '<br>'
                        + 'El: ' + fixedW(elArc.deg, 3) + '\xB0 ' 
                        + fixedW(elArc.arcMin, 3) + '\u2032 ' 
                        + fixedW(elArc.arcSec.toFixed(1), 5) + '\u2033' 
                        + ' (' + el.toFixed(4) + '\xB0)' + '\n';
}

/**
 * Render a frame.
 * 
 * @param {*} time 
 */
function render(time) 
{
    const dateNow = new Date();

    const elemCoord = document.getElementById('coordText');
    const intFixed = function(num) {return ("00" + num).slice(-2)};
  
    updateWarp(dateNow);
    
    // Value of dateNow is set from controls above.
    today = new Date(dateNow.getTime()
        + 24 * 3600 * 1000 * guiControls.deltaDays
        + 3600 * 1000 * guiControls.deltaHours
        + 60 * 1000 * guiControls.deltaMins
        + 1000 * guiControls.deltaSecs
        + warpDelta);

    // Compute Julian time from current time.
    const {JD, JT} = orbitsjs.timeJulianTs(today);
    const dateText = document.getElementById('dateText');

    const dateString = today.getUTCFullYear() + "-" 
                     + intFixed(today.getUTCMonth() + 1) + "-"
                     + intFixed(today.getUTCDate()) + "T"
                     + intFixed(today.getUTCHours()) + ":"
                     + intFixed(today.getUTCMinutes()) + ":"
                     + intFixed(today.getUTCSeconds()) + "Z (UTC)\n" 
                     + JT.toFixed(6) + " Julian";
    dateText.innerText = dateString;

    const T = (JT - 2451545.0) / 36525.0;
    const nutTerms = orbitsjs.nutationTerms(T);

    for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
    {
        const planet = planets[indPlanet];
        const planetMesh = planetMeshes[planet];
        const selectMesh = planetSelectMeshes[planet];
        orbits[planet].visible = guiControls[planet];
    
        let r = computePlanetPos(JT, planet, nutTerms);
        r = orbitsjs.vecMul(r, celestialSphereRadius/orbitsjs.norm(r));
        setVec3Array(planetMesh.position, r);
        setVec3Array(selectMesh.position, r);

        if (!(planetTextMeshes[planet] === undefined))
        {
            const textMesh = planetTextMeshes[planet];
            setVec3Array(textMesh.position, r);
            textMesh.quaternion.copy( camera1.quaternion );
        }
    }

    for (let satIndex = 0; satIndex < satelliteNames.length; satIndex++)
    {
        let indElem = satNameToIndex[satelliteNames[satIndex]];
        let satrec = satellites[indElem];
    
        const satPosEnu = computeSatPos(satrec, today, JT, nutTerms);
        let satMesh = satelliteMeshList[indElem];
        let satMeshSelect = satelliteSelectMeshList[indElem];

        setVec3Array(satMesh.position, satPosEnu);
        setVec3Array(satMeshSelect.position, satPosEnu);
    }

    let moonPosEnu = computeMoonPosEnu(JT, nutTerms);
    moonPosEnu = orbitsjs.vecMul(moonPosEnu, celestialSphereRadius/orbitsjs.norm(moonPosEnu));
    setVec3Array(moonMesh.position, moonPosEnu);
    setVec3Array(moonSelect.position, moonPosEnu);
    if (moonLabel != null)
    {
        setVec3Array(moonLabel.position, moonPosEnu);
        moonLabel.quaternion.copy( camera1.quaternion );
    }
    // Set visibility according dat.gui controls.
    updateVisibility();
    
    // We wish to override the matrices determined by position and rotation of the meshes.
    constellationGroup.matrixAutoUpdate = false;
    boundaryGroup.matrixAutoUpdate = false;
    starsGroup.matrixAutoUpdate = false;
    starsSelectGroup.matrixAutoUpdate = false;
    orbitGroup.matrixAutoUpdate = false;
    equator.matrixAutoUpdate = false;

    // Set J2000-ENU rotation matrix for targets without significant Diurnal parallax.
    const rotationMatrix = createMatrix(JT, nutTerms);
    constellationGroup.matrix = rotationMatrix;
    boundaryGroup.matrix = rotationMatrix;
    starsGroup.matrix = rotationMatrix;
    starsSelectGroup.matrix = rotationMatrix;
    orbitGroup.matrix = rotationMatrix;    
    equator.matrix = rotationMatrix;

    ringMesh.quaternion.copy( camera1.quaternion );
    if (targetName.length > 1)
    {
        const hipData = orbitsjs.hipparcosData[targetName];

        //console.log(targetName);
        if (targetName === "Moon")
        {
            // Target is the Moon.
            const pVector = moonMesh.position;
            setVec3Vec(ringMesh.position, pVector);
            const {az, el} = cartEnuSph(pVector);            
            setLocation(az, el);
            ringMesh.visible = true;
        }
        else if (!(satNameToIndex[targetName] === undefined))
        {
            // Target is a satellite.
            let indElem = satNameToIndex[targetName];
            const pVector = satelliteMeshList[indElem].position;  
            setVec3Vec(ringMesh.position, pVector);
            const {az, el} = cartEnuSph(pVector);            
            setLocation(az, el);
            ringMesh.visible = true;
        }
        else if (hipData === undefined)
        {
            // Target is a planet.
            const pVector = planetMeshes[targetName].position;
            setVec3Vec(ringMesh.position, pVector);
            const {az, el} = cartEnuSph(pVector);            
            setLocation(az, el);
            ringMesh.visible = true;
        }
        else 
        {
            // Target is a star.
            const p = sphIneCart(celestialSphereRadius, hipData.DE, hipData.RA);
            const pVector = new THREE.Vector3(p[0], p[1], p[2]);
            pVector.applyMatrix4(rotationMatrix);
            setVec3Vec(ringMesh.position, pVector);
            const {az, el} = cartEnuSph(pVector);
            setLocation(az, el);
            ringMesh.visible = true;
        }
    }
    else 
    {
        setLocation(mouseCoord.az, mouseCoord.el);
    }

    // Set EFI-ENU rotation matrix
    earthMesh.matrixAutoUpdate = false;
    earthMesh.matrix = createRotMatrix(guiControls.observerLon, guiControls.observerLat);

    //elTextGroup.rotation.z = controls1.getAzimuthalAngle();

    // We do not render the camera helper and Earth mesh for the first view.
    cameraHelper.visible = false;
    earthMesh.visible = false;
    renderer1.render(scene, camera1);

    // Render second view, if enabled.
    if (guiControls.showSplit)
    {
        cameraHelper.visible = true;
        earthMesh.visible = true;
        cameraHelper.update();
        renderer2.render(scene, camera2);
    }
    requestAnimationFrame(render);
}

const pointer = new THREE.Vector2();
const rayCaster = new THREE.Raycaster();
let mouseCoord = {
    az : 0,
    el : 0
};

loadText();
requestAnimationFrame(render);
