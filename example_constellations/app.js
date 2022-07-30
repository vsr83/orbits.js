
// Create controls.
const guiControls = new function()
{
    this.observerLon = 0.0;
    this.observerLat = 0.0;

    this.equator = false;
    this.ground = true;
    this.constellations = true;
    this.constellationBnd = true;
    this.stars = true;
    this.mercury = false;
    this.venus   = false;
    this.earth   = false;
    this.jupiter = false;
    this.mars    = false;
    this.saturn  = false;
    this.uranus  = false;
    this.neptune = false;

    this.setFromGps = function() {
        console.log('GPS');
        locationGps();        
    }
}; 

const gui = new dat.GUI();

const observerFolder = gui.addFolder('Observer');
const observerControls = {};
observerControls.observerLon = observerFolder.add(guiControls, 'observerLon', -180, 180, 0.01).name("Longitude");
observerControls.observerLat = observerFolder.add(guiControls, 'observerLat', -90, 90, 0.01).name("Latitude");
observerFolder.add(guiControls, 'setFromGps').name('Set from GPS');

const visibilityFolder = gui.addFolder('Visibility');
const coordControls = {};
coordControls.ground = visibilityFolder.add(guiControls, 'ground').name("Ground");
coordControls.equator = visibilityFolder.add(guiControls, 'equator').name("Equator");

const starControls = {};
starControls.constellations = visibilityFolder.add(guiControls, 'constellations').name("Constellations");
starControls.constellationBnd = visibilityFolder.add(guiControls, 'constellationBnd').name("Boundaries");
starControls.stars = visibilityFolder.add(guiControls, 'stars').name("Stars");

const planetControls = {};
planetControls.sun = visibilityFolder.add(guiControls, 'earth').name('Sun');
planetControls.mercury = visibilityFolder.add(guiControls, 'mercury').name('Mercury');
planetControls.venus = visibilityFolder.add(guiControls, 'venus').name('Venus');
planetControls.mars = visibilityFolder.add(guiControls, 'mars').name('Mars');
planetControls.jupiter = visibilityFolder.add(guiControls, 'jupiter').name('Jupiter');
planetControls.saturn = visibilityFolder.add(guiControls, 'saturn').name('Saturn');
planetControls.uranus = visibilityFolder.add(guiControls, 'uranus').name('Uranus');
planetControls.neptune = visibilityFolder.add(guiControls, 'neptune').name('Neptune');

const view1 = document.querySelector('#view1');
const view2 = document.querySelector('#view2');
view1.style.left= '0px';
view1.style.top= '0px';
view2.style.left= window.innerWidth/2 + 'px';
view2.style.top= '0px';

// Configure renderer.
const renderer1 = new THREE.WebGLRenderer({antialias: true});
renderer1.setPixelRatio( window.devicePixelRatio );
renderer1.setSize(window.innerWidth / 2, window.innerHeight);
view1.appendChild( renderer1.domElement );

// Configure renderer.
const renderer2 = new THREE.WebGLRenderer({antialias: true});
renderer2.setPixelRatio( window.devicePixelRatio );
renderer2.setSize(window.innerWidth / 2, window.innerHeight);
view2.appendChild( renderer2.domElement );

// Configure camera.
const aspect = 0.5 * window.innerWidth / window.innerHeight;
let fov = 70;
const near = 1;
const far = 6000;

const camera1 = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera1.position.z = 1;
camera1.up.x = 0;
camera1.up.y = 0;
camera1.up.z = 1;

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

let sphereGeometry = new THREE.SphereGeometry(50, 64, 64);
const texture = new THREE.TextureLoader().load('imports/2k_earth_daymap.jpeg');
let sphereMaterial = new THREE.MeshBasicMaterial({map : texture});
let earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
earthMesh.position.z = -50.1;
scene.add(earthMesh);

// Create equatorial circle.
let equator = null;
{
    const points = [];
    for (let RA = 0; RA < 361; RA++)
    {
        const R = 500;
        const DE = 0.0;
        const pStart = [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
                        R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
                        R * orbitsjs.sind(DE)];
        points.push(new THREE.Vector3(pStart[0], pStart[1], pStart[2]));
    }
    const lineGeom = new THREE.BufferGeometry().setFromPoints( points );
    const lineMaterial = new THREE.LineBasicMaterial( { color: 0xaaaaaa } );
    equator = new THREE.Line( lineGeom, lineMaterial );
    scene.add(equator);
}

// Create constellation boundaries.
const boundaryGroup = new THREE.Group();
scene.add(boundaryGroup);
for (let [cName, cPoints] of Object.entries(orbitsjs.constellationBoundaries))
{
    const points = [];
    for (let indPoint = 0; indPoint < cPoints.length; indPoint++)
    {
        let point = cPoints[indPoint];
        const R = 5000;
        const RA = point[0];
        const DE = point[1];
        const pStart = [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
                        R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
                        R * orbitsjs.sind(DE)];
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
        const nameStart = orbitsjs.hipparchusIndToName[starStart];
        const nameEnd = orbitsjs.hipparchusIndToName[starEnd];

        //console.log(nameStart + "->" + nameEnd);
        const hipStart = orbitsjs.hipparchusData[nameStart];
        const hipEnd = orbitsjs.hipparchusData[nameEnd];
       
        if (hipStart === undefined || hipEnd === undefined)
        {
            console.log("MISSING");
            continue;
        }

        //console.log(hipEnd);
        const RAstart = hipStart.RA;
        const RAend = hipEnd.RA;
        const DEstart = hipStart.DE;
        const DEend = hipEnd.DE;

        const R = 5000;
        const pStart = [R * orbitsjs.cosd(DEstart) * orbitsjs.cosd(RAstart), 
                        R * orbitsjs.cosd(DEstart) * orbitsjs.sind(RAstart), 
                        R * orbitsjs.sind(DEstart)];
        const pEnd = [R * orbitsjs.cosd(DEend) * orbitsjs.cosd(RAend), 
                      R * orbitsjs.cosd(DEend) * orbitsjs.sind(RAend), 
                      R * orbitsjs.sind(DEend)];

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
console.log(constellationGroup);

// Create stars.
const starsGroup = new THREE.Group();
scene.add(starsGroup);
for (let [hipName, hipObj] of Object.entries(orbitsjs.hipparchusData))
{
    const radius = 25 * Math.exp(-hipObj.mag/3.0);
    const sphGeometry = new THREE.SphereGeometry( radius, 5, 5 );
    const sphMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    const sphere = new THREE.Mesh( sphGeometry, sphMaterial );

    const DE = hipObj.DE;
    const RA = hipObj.RA;

    const R = 5000;
    const p = [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
               R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
               R * orbitsjs.sind(DE)];

    sphere.position.x = p[0];
    sphere.position.y = p[1];
    sphere.position.z = p[2];
    //console.log(hipObj);
    starsGroup.add( sphere );
}

const planeGeom = new THREE.PlaneGeometry(150, 150);
const planeMaterial = new THREE.MeshBasicMaterial({color : 0x559955, opacity : 0.5, transparent : true});
planeMaterial.side = THREE.DoubleSide;
const planeMesh = new THREE.Mesh(planeGeom, planeMaterial);
planeMesh.position.z = -2;
scene.add(planeMesh);

// Create planetary orbits.
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);
const JT0 = orbitsjs.dateJulianYmd(2022, 1, 1);

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const periods = [88, 225, 365, 687, 12*365.25, 29*365.25, 84*365.25, 165*365.25, 0];
const orbits = [];

for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
{
    const planet = planets[indPlanet];
    // console.log(periods[indPlanet]);

    const points = [];
    for (let deltaJT = 0; deltaJT < periods[indPlanet]; deltaJT+= periods[indPlanet]/365)
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

        const RA = orbitsjs.atan2d(osv.r[1], osv.r[0]);
        const DE = orbitsjs.asind(osv.r[2] / orbitsjs.norm(osv.r));

        const R = 4995;
        const p = [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
                R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
                R * orbitsjs.sind(DE)];

        points.push(new THREE.Vector3(p[0], p[1], p[2]));
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

// Change FoV with wheel.
view1.addEventListener("wheel", function(event) 
{
    console.log(event.deltaY);
    fov += event.deltaY/25;
    if (fov < 1) fov = 1
    if (fov > 170) fov = 170;
    camera1.fov = fov;
    camera1.updateProjectionMatrix();
});

function onWindowResize()
{
    const aspect = 0.5 * window.innerWidth / window.innerHeight;
    camera1.aspect = aspect;
    camera2.aspect = aspect;
    camera1.updateProjectionMatrix();
    camera2.updateProjectionMatrix();

    renderer1.setSize(window.innerWidth / 2, window.innerHeight);
    renderer2.setSize(window.innerWidth / 2, window.innerHeight);
    view2.style.left= window.innerWidth/2 + 'px';
}

function loadFont() 
{
    const loader = new THREE.FontLoader();
    loader.load( 'imports/helvetiker_regular.typeface.json', function ( response ) {
        const font = response;
        //srefreshText();

        console.log(font);

        materials = [
            //new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
            //new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
            new THREE.MeshBasicMaterial({color : 0xaaaaaa}),
            new THREE.MeshBasicMaterial({color : 0xaaaaaa})
        ];
        const textopts = {
            font : font,
            size : 24,
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
        textMeshNorth.position.x = -12;
        textMeshNorth.position.y = 70;
        textMeshNorth.position.z = -20;
        textMeshSouth.position.x = -12;
        textMeshSouth.position.y = -80;
        textMeshSouth.position.z = -20;

        textMeshWest.position.x = -70;
        textMeshWest.position.y = -12;
        textMeshWest.position.z = -20;
        textMeshEast.position.x = 70;
        textMeshEast.position.y = 12;
        textMeshEast.position.z = -20;

        textMeshEast.rotation.z = -Math.PI/2;
        textMeshWest.rotation.z = Math.PI/2;

        scene.add(textMeshNorth);
        scene.add(textMeshSouth);
        scene.add(textMeshWest);
        scene.add(textMeshEast);
    } );
}

window.addEventListener('resize', onWindowResize, false);

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
 * Update location forms from GPS.
 */
 function locationGps()
 {
     if (navigator.geolocation)
     {
         navigator.geolocation.getCurrentPosition(function(position) {
            observerControls.observerLon.setValue(position.coords.longitude);
            observerControls.observerLat.setValue(position.coords.latitude);
         });
     }                
 }


function createMatrix(JT)
{
    function createColumn(vec, JT)
    {
        const targetOsvJ2000 = {r: orbitsjs.vecMul(vec, 1e20), v : [0, 0, 0], JT};

        const targetOsvMod = orbitsjs.coordJ2000Mod(targetOsvJ2000);
        const targetOsvTod = orbitsjs.coordModTod(targetOsvMod);
        const targetOsvPef = orbitsjs.coordTodPef(targetOsvTod);
        const targetOsvEfi = orbitsjs.coordPefEfi(targetOsvPef, 
            0, 
            0);
        const targetOsvEnu = orbitsjs.coordEfiEnu(targetOsvEfi, 
            guiControls.observerLat, guiControls.observerLon, 0);

        return targetOsvEnu.r;
    }
    
    const col1 = orbitsjs.vecMul(createColumn([1, 0, 0], JT), 1e-20);
    const col2 = orbitsjs.vecMul(createColumn([0, 1, 0], JT), 1e-20);
    const col3 = orbitsjs.vecMul(createColumn([0, 0, 1], JT), 1e-20);

    const matrix = new THREE.Matrix4();
    matrix.set(
        col1[0], col2[0], col3[0], 0,
        col1[1], col2[1], col3[1], 0,
        col1[2], col2[2], col3[2], 0,
        0, 0, 0, 1
    );

    //console.log(matrix);
    //console.log(controls);

    return matrix;
}

function createRotMatrix(lon, lat)
{
    const matrix = new THREE.Matrix4();

    const T11 =-orbitsjs.sind(lon);
    const T21 = orbitsjs.cosd(lon);
    const T31 = 0;
    const T12 = -orbitsjs.cosd(lon)*orbitsjs.sind(lat);
    const T22 = -orbitsjs.sind(lon)*orbitsjs.sind(lat);
    const T32 = orbitsjs.cosd(lat);
    const T13 = orbitsjs.cosd(lon)*orbitsjs.cosd(lat);
    const T23 = orbitsjs.sind(lon)*orbitsjs.cosd(lat);
    const T33 = orbitsjs.sind(lat);

    matrix.set(
        T11, T31, -T21, 0,
        T12, T32, -T22, 0,
        T13, T33, -T23, -50, 
        0, 0, 0, 1
    );

    return matrix;
}

function render(time) 
{
    for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
    {
        const planet = planets[indPlanet];
        orbits[planet].visible = guiControls[planet];
    }    
    equator.visible = guiControls.equator;
    constellationGroup.visible = guiControls.constellations;
    boundaryGroup.visible = guiControls.constellationBnd;
    starsGroup.visible = guiControls.stars;
    planeMesh.visible = guiControls.ground;

    const angle = time / 100;

    const {JD, JT} = orbitsjs.timeJulianTs(new Date());
    const rotationMatrix = createMatrix(JT);

    constellationGroup.matrixAutoUpdate = false;
    boundaryGroup.matrixAutoUpdate = false;
    starsGroup.matrixAutoUpdate = false;
    orbitGroup.matrixAutoUpdate = false;
    equator.matrixAutoUpdate = false;
    constellationGroup.matrix = rotationMatrix;
    boundaryGroup.matrix = rotationMatrix;
    starsGroup.matrix = rotationMatrix;
    orbitGroup.matrix = rotationMatrix;
    equator.matrix = rotationMatrix;

    earthMesh.matrixAutoUpdate = false;
    earthMesh.matrix = createRotMatrix(guiControls.observerLon, guiControls.observerLat);

    cameraHelper.visible = false;
    earthMesh.visible = false;
    renderer1.render(scene, camera1);
    cameraHelper.visible = true;
    earthMesh.visible = true;
    cameraHelper.update();
    renderer2.render(scene, camera2);
    requestAnimationFrame(render);
}

loadFont();

requestAnimationFrame(render);

renderer1.render(scene, camera1);

//console.log(renderer);