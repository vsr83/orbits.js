
const guiControls = new function()
{
    this.mercury = false;
    this.venus   = false;
    this.earth   = false;
    this.mars    = false;
    this.jupiter = false;
    this.saturn  = false;
    this.uranus  = false;
    this.neptune = false;
};

const gui = new dat.GUI();
const planetControls = {};
planetControls.sun = gui.add(guiControls, 'earth').name('Sun');
planetControls.mercury = gui.add(guiControls, 'mercury').name('Mercury');
planetControls.venus = gui.add(guiControls, 'venus').name('Venus');
planetControls.mars = gui.add(guiControls, 'mars').name('Mars');
planetControls.jupiter = gui.add(guiControls, 'jupiter').name('Jupiter');
planetControls.saturn = gui.add(guiControls, 'saturn').name('Saturn');
planetControls.uranus = gui.add(guiControls, 'uranus').name('Uranus');
planetControls.neptune = gui.add(guiControls, 'neptune').name('Neptune');

const view = document.querySelector('#view');

// Configure renderer.
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
view.appendChild( renderer.domElement );

// Configure camera.
const aspect = window.innerWidth / window.innerHeight;
let fov = 70;
const near = 1;
const far = 5000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 0.1;
camera.up.x = 0;
camera.up.y = 0;
camera.up.z = 1;

// Configure orbit controls. Instead of moving the camera when "zooming",
// we change the FoV.
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;

// Create the scene.
const scene = new THREE.Scene();

// Create constellation boundaries.
for (let [cName, cPoints] of Object.entries(orbitsjs.constellationBoundaries))
{
    const points = [];
    for (let indPoint = 0; indPoint < cPoints.length; indPoint++)
    {
        let point = cPoints[indPoint];
        const R = 500;
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
    scene.add(line);
}

// Create constellations.
//console.log(orbitsjs.constellations);
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

        const R = 500;
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
        scene.add(line);   
    }
}

// Create stars.
for (let [hipName, hipObj] of Object.entries(orbitsjs.hipparchusData))
{
    const radius = 2.5 * Math.exp(-hipObj.mag/3.0);
    const sphGeometry = new THREE.SphereGeometry( radius, 5, 5 );
    const sphMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    const sphere = new THREE.Mesh( sphGeometry, sphMaterial );

    const DE = hipObj.DE;
    const RA = hipObj.RA;

    const R = 500;
    const p = [R * orbitsjs.cosd(DE) * orbitsjs.cosd(RA), 
               R * orbitsjs.cosd(DE) * orbitsjs.sind(RA), 
               R * orbitsjs.sind(DE)];

    sphere.position.x = p[0];
    sphere.position.y = p[1];
    sphere.position.z = p[2];
    //console.log(hipObj);
    scene.add( sphere );
}

// Create planetary orbits.
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

        const R = 495;
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
    scene.add(line);
    orbits[planet] = line;
}

// Change FoV with wheel.
view.addEventListener("wheel", function(event) 
{
    console.log(event.deltaY);
    fov += event.deltaY/25;
    if (fov < 1) fov = 1
    if (fov > 170) fov = 170;
    camera.fov = fov;
    camera.updateProjectionMatrix();
});

function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize, false);

function render(time) 
{
    for (let indPlanet = 0; indPlanet < planets.length; indPlanet++)
    {
        const planet = planets[indPlanet];
        orbits[planet].visible = guiControls[planet];
    }    

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);

renderer.render(scene, camera);

//console.log(renderer);