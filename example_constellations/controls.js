// Create controls.
const guiControls = new function()
{
    this.observerLon = 0.0;
    this.observerLat = 0.0;

    this.equator = false;
    this.ground = true;
    this.azElGrid = false;
    this.constellations = true;
    this.constellationBnd = true;
    this.planets = true;
    this.stars = true;
    this.mercury = false;
    this.venus   = false;
    this.earth   = true;
    this.jupiter = false;
    this.mars    = false;
    this.saturn  = false;
    this.uranus  = false;
    this.neptune = false;
    this.moon = true;

    this.warpFactor = 3;
    this.timeWarp = false;
    this.deltaDays = 0;
    this.deltaHours = 0;
    this.deltaMins = 0;
    this.deltaSecs = 0;

    this.showSplit = false;
    this.lockAzi = true;
    this.lockEle = true;

    this.resetTime = function() {
        warpDelta = 0;
        warpAccumulation = 0;
        warpRefTime = new Date();
        timeControls.timeWarp.setValue(false);
        timeControls.deltaSecControl.setValue(0);
        timeControls.deltaMinuteControl.setValue(0);
        timeControls.deltaHourControl.setValue(0);
        timeControls.deltaDayControl.setValue(0);
    };
    this.GitHub = function() {
        window.open("https://github.com/vsr83/orbits.js", "_blank").focus();
    };

    this.setFromGps = function() {
        console.log('GPS');
        locationGps();        
    }

    this.addTLEs = function() {
        const listContainer = document.getElementById('TLEListcontainer');
        listContainer.style.visibility = "visible";
        const TLEinput = document.getElementById('TLEListinput');
        TLEinput.focus()
    }
}; 

// Radius of the artifician sphere with the stars. This simply has to be some 
// large value that does not introduce artificial Diurnal parallax.
const celestialSphereRadius = 5000;

// Create Dat.GUI controls:
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
coordControls.azElGrid = visibilityFolder.add(guiControls, 'azElGrid').name("Az/El Grid");

const starControls = {};
starControls.constellations = visibilityFolder.add(guiControls, 'constellations').name("Constellations");
starControls.constellationBnd = visibilityFolder.add(guiControls, 'constellationBnd').name("Boundaries");
starControls.stars = visibilityFolder.add(guiControls, 'stars').name("Stars");

const planetControls = {};
planetControls.moon = visibilityFolder.add(guiControls, 'moon').name('Moon');
planetControls.planets = visibilityFolder.add(guiControls, 'planets').name('Planets');
planetControls.sun = visibilityFolder.add(guiControls, 'earth').name('Ecliptic');
planetControls.mercury = visibilityFolder.add(guiControls, 'mercury').name('Mercury Orbit');
planetControls.venus = visibilityFolder.add(guiControls, 'venus').name('Venus Orbit');
planetControls.mars = visibilityFolder.add(guiControls, 'mars').name('Mars Orbit');
planetControls.jupiter = visibilityFolder.add(guiControls, 'jupiter').name('Jupiter Orbit');
planetControls.saturn = visibilityFolder.add(guiControls, 'saturn').name('Saturn Orbit');
planetControls.uranus = visibilityFolder.add(guiControls, 'uranus').name('Uranus Orbit');
planetControls.neptune = visibilityFolder.add(guiControls, 'neptune').name('Neptune Orbit');

const timeFolder = gui.addFolder('Time');
const timeControls = {};
timeControls.timeWarp = timeFolder.add(guiControls, 'timeWarp').name('Time Warp').onChange(function() {toggleWarp()});
timeControls.warpFactor = timeFolder.add(guiControls, 'warpFactor', -14, 14, 0.1).name('Warp Factor').onChange(function() {changeWarpFactor()});
timeControls.deltaDayControl = timeFolder.add(guiControls, 'deltaDays', -185, 185, 1).name('Delta Days');
timeControls.deltaHourControl = timeFolder.add(guiControls, 'deltaHours', -12, 12, 1).name('Delta Hours');
timeControls.deltaMinuteControl = timeFolder.add(guiControls, 'deltaMins', -30, 30, 1).name('Delta Minutes');
timeControls.deltaSecControl = timeFolder.add(guiControls, 'deltaSecs', -30, 30, 1).name('Delta Seconds');
timeControls.reset = timeFolder.add(guiControls, 'resetTime').name('Reset Time');
gui.add(guiControls, 'showSplit').name('Observer Split').onChange(function() 
{
    // Resize event handler sets visibility of the second view.
    onWindowResize();
});
gui.add(guiControls, 'lockAzi').name('Lock Azimuth');
gui.add(guiControls, 'lockEle').name('Lock Elevation');
gui.add(guiControls, 'addTLEs').name("Add Satellites");
gui.add(guiControls, 'GitHub').name("GitHub");

/**
 * Handle toggling of the time 
 */
function toggleWarp()
{
    if (guiControls.timeWarp)
    {
        warpRefTime = new Date();
    }
    else
    {
        warpAccumulation = warpDelta;
        warpDelta = 0;
    }
}
 
/**
  * Handle change in the time warp factor.
  */
function changeWarpFactor()
{
    warpRefTime = new Date();
    // Move accumulated warp time from delta.
    warpAccumulation = warpDelta;
    warpDelta = 0;
}

/**
 * Update warp state.
 * 
 * @param {*} dateNow
 *     The date now.
 */
function updateWarp(dateNow)
{
    let warpDeltaNew = warpAccumulation;
    if (guiControls.timeWarp)
    {
        let expFactor = 1.0;

        if (guiControls.warpFactor > 0)
        {
            expFactor = Math.exp(guiControls.warpFactor);
        }
        if (guiControls.warpFactor < 0)
        {
            expFactor = -Math.exp(-guiControls.warpFactor);
        }

        warpDeltaNew += (dateNow.getTime() - warpRefTime.getTime()) * expFactor;
    }
    warpDelta = warpDeltaNew;
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

/**
 * Update visibility of groups and objects according to controls.
 */
function updateVisibility()
{
    equator.visible = guiControls.equator;
    constellationGroup.visible = guiControls.constellations;
    boundaryGroup.visible = guiControls.constellationBnd;
    starsGroup.visible = guiControls.stars;
    planeGroup.visible = guiControls.ground;
    azElGroup.visible = guiControls.azElGrid;
    planetMeshGroup.visible = guiControls.planets;
    moonMesh.visible = guiControls.moon;
    if (moonLabel != null)
    {
        moonLabel.visible = guiControls.moon;
    }
}
