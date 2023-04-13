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

    this.enableTextures = true; 
    this.enableSubsolar = true;
    this.enableSublunar = true; 

    this.drawClock = true; 
    this.drawTitle = true;
    this.gridLonResolution = 30;
    this.gridLatResolution = 30; 

    this.brightness = 0.8;
    this.colorGrid = [80, 80, 80];
    this.colorMap = [80, 80, 120];
    this.colorText = [255, 255, 255];
    this.colorOrbit = [127, 127, 127];
    this.colorSubsolar = [255, 255, 255];
    this.colorSublunar = [255, 255, 255];
    this.deltaTime = 0;

    this.enableCaptions = true; 

    this.warp = false;
    this.warpFactor = 5.0;
    this.resetTime = function() {
        const today = new Date(dateNow.getTime());
        JTstart = orbitsjs.timeJulianTs(today).JT
    };
    this.skipToNext = false;

    this.grayscale = false;

    this.GitHub = function() {
        window.open("https://github.com/vsr83/orbits.js");
    };
    this.fov = 10;

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
displayControls.enableGrid = visibilityFolder.add(guiControls, 'enableGrid').name('Grid Lines');
displayControls.enableEcliptic = visibilityFolder.add(guiControls, 'enableEcliptic').name('Ecliptic');
displayControls.enableEquator = visibilityFolder.add(guiControls, 'enableEquator').name('Equator');
displayControls.enableConstellations = visibilityFolder.add(guiControls, 'enableConstellations').name('Constellations');
displayControls.enableTextures = visibilityFolder.add(guiControls, 'enableTextures').name('Textures'); 
displayControls.enableSubsolar = visibilityFolder.add(guiControls, 'enableSubsolar').name('Subsolar point');
displayControls.enableSublunar = visibilityFolder.add(guiControls, 'enableSublunar').name('Sublunar point'); 
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
    const title = document.getElementById("nameContainer");
    if (guiControls.drawTitle)
    {
        title.style.visibility = "visible";
    }
    else 
    {
        title.style.visibility = "hidden";
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
appearanceControls.colorSubsolar = appearanceFolder.addColor(guiControls, 'colorSubsolar').name('Subsolar Point');
appearanceControls.colorSublunar = appearanceFolder.addColor(guiControls, 'colorSublunar').name('Sublunar Point');

const cameraFolder = gui.addFolder('Camera');
cameraControls.fov = cameraFolder.add(guiControls, 'fov', 0.1, 200, 0.1).name('Field of View');

const timeFolder = gui.addFolder('Time');
timeControls.warpFactor = timeFolder.add(guiControls, 'warpFactor', -10, 10, 1).name('Warp Factor');
timeControls.pause = timeFolder.add(guiControls, 'warp').name("Enable Warp");
timeControls.pause = timeFolder.add(guiControls, 'pause').name("Pause");
timeControls.deltaTime = timeFolder.add(guiControls, 'deltaTime', -0.5, 0.5, 0.01).name("Delta Time");

gui.add(guiControls, 'GitHub');