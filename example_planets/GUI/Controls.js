// dat.gui controls
let guiControls = null;

// Hold
const displayControls = {};
const appearanceControls = {};
const cameraControls = {};
const frameControls = {};
const timeControls = {};

guiControls = new function()
{
    this.lightTime = true;
    this.enableMap = true;
    this.enableGrid = false;
    this.enableEcliptic = true;
    this.enableEquator = true;
    this.enableConstellations = false;
    this.enableMoons = true;
    this.enableOrbits = true;
    this.enablePlOrbits = false;

    this.enableTextures = true; 
    this.enableSubsolar = true;
    this.enableSublunar = true; 
    this.enableStars = false;
    this.enableConstellations = false;
    this.enableMoonCaptions = true;

    this.drawClock = true; 
    this.drawTitle = true;
    this.drawInfo  = true;
    this.gridLonResolution = 30;
    this.gridLatResolution = 30; 

    this.brightness = 0.8;
    this.colorGrid = [80, 80, 80];
    this.colorText = [255, 255, 255];
    this.colorOrbit = [80, 80, 80];
    this.colorStars = [255, 255, 255];
    this.colorMoons = [255, 255, 255];
    this.colorConstellations = [80, 80, 80];
    this.colorPlOrbit = [150,50,50]
    this.deltaTime = 0;
    this.resetTime = function() 
    {
        console.log("resetTime");
        let dateNow = new Date();
        JTclock = orbitsjs.timeJulianTs(new Date(dateNow.getTime())).JT;
        JTclockStart = JTclock;
        JTstart = JTclock;
        JTprev = JTclock;
        deltaJT = 0.0;
    }

    this.setTime = function() 
    {
        var timeIn = prompt("Select date and time:", 
        createTimestamp(JTprev) + "Z");   
        const JTin = orbitsjs.timeJulianTs(new Date(timeIn)).JT;
        console.log(JTin);

        // TODO: Validate.
        let dateNow = new Date();
        JTclock = orbitsjs.timeJulianTs(new Date(dateNow.getTime())).JT;
        JTclockStart = JTclock;
        JTstart = JTin;
        JTprev = JTin;
        deltaJT = 0.0;
    }
    this.deltaPlusDay = function() 
    {
        deltaJT += 1.0;
    }
    this.deltaMinusDay = function() 
    {
        deltaJT -= 1.0;
    }
    this.deltaPlusHour = function() 
    {
        deltaJT += 1.0/24.0;
    }
    this.deltaMinusHour = function() 
    {
        deltaJT -= 1.0/24.0;
    }
    this.deltaPlusMinute = function() 
    {
        deltaJT += 1.0/1440.0;
    }
    this.deltaMinusMinute = function() 
    {
        deltaJT -= 1.0/1440.0;
    }

    this.enableCaptions = true; 

    this.warp = false;
    this.warpFactor = 5.0;
    this.skipToNext = false;

    this.grayscale = false;

    this.GitHub = function() {
        window.open("https://github.com/vsr83/orbits.js");
    };
    this.fov = 10;
    this.fixSize = false;
    this.fillPercentage = 60;

    this.observerMercury = function() {setObserver('mercury');}
    this.observerVenus   = function() {setObserver('venus');}
    this.observerEarth   = function() {setObserver('earth');}
    this.observerMars    = function() {setObserver('mars');}
    this.observerJupiter = function() {setObserver('jupiter');}
    this.observerSaturn  = function() {setObserver('saturn');}
    this.observerUranus  = function() {setObserver('uranus');}
    this.observerNeptune = function() {setObserver('neptune');}

    this.targetMercury = function() {setTarget('mercury');}
    this.targetVenus   = function() {setTarget('venus');}
    this.targetEarth   = function() {setTarget('earth');}
    this.targetMars    = function() {setTarget('mars');}
    this.targetJupiter = function() {setTarget('jupiter');}
    this.targetSaturn  = function() {setTarget('saturn');}
    this.targetUranus  = function() {setTarget('uranus');}
    this.targetNeptune = function() {setTarget('neptune');}

    this.pause = false;
}


gui = new dat.GUI();

const computationFolder = gui.addFolder('Computation');
computationFolder.add(guiControls, 'lightTime').name('Light Time');

const observerFolder = gui.addFolder('Observer');
observerFolder.add(guiControls, 'observerMercury').name('Mercury');
observerFolder.add(guiControls, 'observerVenus').name('Venus');
observerFolder.add(guiControls, 'observerEarth').name('Earth');
observerFolder.add(guiControls, 'observerMars').name('Mars');
observerFolder.add(guiControls, 'observerJupiter').name('Jupiter');
observerFolder.add(guiControls, 'observerSaturn').name('Saturn');
observerFolder.add(guiControls, 'observerUranus').name('Uranus');
observerFolder.add(guiControls, 'observerNeptune').name('Neptune');

const targetFolder = gui.addFolder('Target');
targetFolder.add(guiControls, 'targetMercury').name('Mercury');
targetFolder.add(guiControls, 'targetVenus').name('Venus');
targetFolder.add(guiControls, 'targetEarth').name('Earth');
targetFolder.add(guiControls, 'targetMars').name('Mars');
targetFolder.add(guiControls, 'targetJupiter').name('Jupiter');
targetFolder.add(guiControls, 'targetSaturn').name('Saturn');
targetFolder.add(guiControls, 'targetUranus').name('Uranus');
targetFolder.add(guiControls, 'targetNeptune').name('Neptune');

const visibilityFolder = gui.addFolder('Visibility');
displayControls.enableMoons = visibilityFolder.add(guiControls, 'enableMoons').name('Moons');
displayControls.enableMoonCaptions = visibilityFolder.add(guiControls, 'enableMoonCaptions').name('Moon Captions');
displayControls.enableOrbits = visibilityFolder.add(guiControls, 'enableOrbits').name('Osc. Orbits');
displayControls.enablePlOrbits = visibilityFolder.add(guiControls, 'enablePlOrbits').name('Planetary Orbits');


displayControls.enableGrid = visibilityFolder.add(guiControls, 'enableGrid').name('Grid Lines');
//displayControls.enableEcliptic = visibilityFolder.add(guiControls, 'enableEcliptic').name('Ecliptic');
//displayControls.enableEquator = visibilityFolder.add(guiControls, 'enableEquator').name('Equator');
displayControls.enableConstellations = visibilityFolder.add(guiControls, 'enableConstellations').name('Constellations');
//displayControls.enableTextures = visibilityFolder.add(guiControls, 'enableTextures').name('Textures'); 
//displayControls.enableSubsolar = visibilityFolder.add(guiControls, 'enableSubsolar').name('Subsolar point');
//displayControls.enableSublunar = visibilityFolder.add(guiControls, 'enableSublunar').name('Sublunar point'); 
//displayControls.enableConstellations = visibilityFolder.add(guiControls, 'enableConstellations').name('Constellations'); 
displayControls.enableStars = visibilityFolder.add(guiControls, 'enableStars').name('Stars'); 
displayControls.drawClock = visibilityFolder.add(guiControls, 'drawClock').name('Clock')
    .onChange(function() 
    {
        const container = document.getElementById("dateContainer");
        if (guiControls.drawClock)
        {
            container.style.visibility = "visible";
        }
        else 
        {
            container.style.visibility = "hidden";
        }
    }); 
displayControls.drawTitle = visibilityFolder.add(guiControls, 'drawTitle').name('Title')
.onChange(function() 
{
    const title = document.getElementById("targetContainer");
    if (guiControls.drawTitle)
    {
        title.style.visibility = "visible";
    }
    else 
    {
        title.style.visibility = "hidden";
    }
}); 
displayControls.drawInfo = visibilityFolder.add(guiControls, 'drawInfo').name('Info')
.onChange(function() 
{
    const info = document.getElementById("infoContainer");
    if (guiControls.drawInfo)
    {
        info.style.visibility = "visible";
    }
    else 
    {
        info.style.visibility = "hidden";
    }
}); 


const appearanceFolder = gui.addFolder('Appearance');
appearanceControls.grayscale = appearanceFolder.add(guiControls, 'grayscale').name('Grayscale');
appearanceControls.brightness =  appearanceFolder.add(guiControls, 'brightness',0, 1.0, 0.01).name('Brightness');

displayControls.gridLonResolution = appearanceFolder.add(guiControls, 'gridLonResolution', 1, 180, 1)
    .name('Grid Lon. Resolution')
    .onChange(function()
    {
        earthShaders.updateGrid(guiControls.gridLonResolution, guiControls.gridLatResolution);
    });
displayControls.gridLatResolution = appearanceFolder.add(guiControls, 'gridLatResolution', 1, 180, 1)
    .name('Grid Lat. Resolution')
    .onChange(function()
    {
        earthShaders.updateGrid(guiControls.gridLonResolution, guiControls.gridLatResolution);
    });

appearanceControls.colorGrid = appearanceFolder.addColor(guiControls, 'colorGrid').name('Grid Color')
.onChange(function()
{
    earthShaders.colorGrid = guiControls.colorGrid;
    earthShaders.setColorsGrid();
});

appearanceControls.colorText = appearanceFolder.addColor(guiControls, 'colorText').name('Text');
appearanceControls.colorOrbit = appearanceFolder.addColor(guiControls, 'colorOrbit').name('Orbits');
appearanceControls.colorPlOrbit = appearanceFolder.addColor(guiControls, 'colorPlOrbit').name('Planetary Orbits');

//appearanceControls.colorSubsolar = appearanceFolder.addColor(guiControls, 'colorSubsolar').name('Subsolar Point');
//appearanceControls.colorSublunar = appearanceFolder.addColor(guiControls, 'colorSublunar').name('Sublunar Point');
appearanceControls.colorMoons = appearanceFolder.addColor(guiControls, 'colorMoons').name('Moons');
appearanceControls.colorStars = appearanceFolder.addColor(guiControls, 'colorStars').name('Stars');
appearanceControls.colorConstellations = appearanceFolder.addColor(guiControls, 'colorConstellations').name('Constellations');


const cameraFolder = gui.addFolder('Camera');
cameraControls.fov = cameraFolder.add(guiControls, 'fov', 0.1, 100000, 0.01).name('Field of View');
cameraControls.fixSize = cameraFolder.add(guiControls, 'fixSize').name('Fix Visual Size');
cameraControls.fillPercentage = cameraFolder.add(guiControls, 'fillPercentage', 1, 200, 1).name('Percentage');


const timeFolder = gui.addFolder('Time');
timeControls.resetTime = timeFolder.add(guiControls, 'resetTime').name("Reset Time");
timeControls.setTime = timeFolder.add(guiControls, 'setTime').name("Set Time");
timeControls.warpFactor = timeFolder.add(guiControls, 'warpFactor', -10, 10, 1).name('Warp Factor');
timeControls.pause = timeFolder.add(guiControls, 'warp').name("Enable Warp");
timeControls.pause = timeFolder.add(guiControls, 'pause').name("Pause");
timeControls.deltaPlusDay = timeFolder.add(guiControls, 'deltaPlusDay').name("+ Day");
timeControls.deltaMinusDay = timeFolder.add(guiControls, 'deltaMinusDay').name("- Day");
timeControls.deltaPlusHour = timeFolder.add(guiControls, 'deltaPlusHour').name("+ Hour");
timeControls.deltaMinusHour = timeFolder.add(guiControls, 'deltaMinusHour').name("- Hour");
timeControls.deltaPlusMinute = timeFolder.add(guiControls, 'deltaPlusMinute').name("+ Minute");
timeControls.deltaMinusMinute = timeFolder.add(guiControls, 'deltaMinusMinute').name("- Minute");

gui.add(guiControls, 'GitHub');