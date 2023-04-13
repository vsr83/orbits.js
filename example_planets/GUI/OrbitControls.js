// Handling of the mouse dragging.
var xStart = 0;
var yStart = 0;
var dragX = 0;
var dragY = 0;
var dragXStart = 0;
var dragYStart = 0;

//var drawing = false;

// Get A WebGL context
//var canvas = document.querySelector("#canvas");
var canvas = document.getElementById("canvas");

canvas.addEventListener("mousedown", function(e) {
    xStart = e.clientX;
    yStart = e.clientY;
    dragXStart = -orbitsjs.rad2Deg(camera.rotZ);
    dragYStart = -orbitsjs.rad2Deg(camera.rotX) - 90;

    canvas.onmousemove = function(m) {
        //console.log(m);
        dragX = dragXStart - (m.clientX - xStart) / 10.0;
        dragY = dragYStart - (m.clientY - yStart) / 10.0;

        if (dragX > 270.0) dragX -= 360.0;
        if (dragX < -90.0) dragX += 360.0;    
        if (dragY > 180.0) dragY -= 360.0;
        if (dragY < -180.0) dragY += 360.0;

        camera.rotZ = orbitsjs.deg2Rad(-dragX);
        camera.rotX = orbitsjs.deg2Rad(-90 - dragY);
        
        //cameraControls.lon.setValue(rotZToLon(orbitsjs.rad2Deg(rotZ)));
        //cameraControls.lat.setValue(rotXToLat(orbitsjs.rad2Deg(rotX)));
    }
});

canvas.addEventListener("mouseup", function(e) {
    canvas.onmousemove = null;
});

canvas.addEventListener("mouseleave", function(e) {
    canvas.onmousemove = null;
});

canvas.addEventListener("wheel", function(e) {
    cameraControls.fov.setValue(guiControls.fov * (e.deltaY * 0.001 + 1));
});

function touchMove(e)
{
    if (scaling)
    {
        const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, 
        e.touches[0].pageY - e.touches[1].pageY);

        camera.distance = distanceStart * (0.001 * (zoomStart - dist) + 1);
        //cameraControls.distance.setValue(distance);
        e.preventDefault();

        return;
    }

    const m = e.touches[0];

    dragX = dragXStart - (m.clientX - xStart) / 10.0;
    dragY = dragYStart - (m.clientY - yStart) / 10.0;

    if (dragX > 270.0) dragX -= 360.0;
    if (dragY > 180.0) dragY -= 360.0;
    if (dragX < -90.0) dragX += 360.0;
    if (dragY < -180.0) dragY += 360.0;

    camera.rotZ = MathUtils.deg2Rad(-dragX);
    camera.rotX = MathUtils.deg2Rad(-90 - dragY);
    
    //cameraControls.lon.setValue(rotZToLon(MathUtils.rad2Deg(rotZ)));
    //cameraControls.lat.setValue(rotXToLat(MathUtils.rad2Deg(rotX)));
}

var scaling = false;
var zoomStart = 0;
var distanceStart = 0;
document.addEventListener("touchstart", function(e) {
    if (e.touches.length == 1)
    {
        xStart = e.touches[0].clientX;
        yStart = e.touches[0].clientY;
        dragXStart = -MathUtils.rad2Deg(camera.rotZ);
        dragYStart = -MathUtils.rad2Deg(camera.rotX) - 90.0;

        document.addEventListener("touchmove", touchMove, { passive: false });
    }
    if (e.touches.length == 2)
    {
        distanceStart = camera.distance;
        zoomStart = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, 
            e.touches[0].pageY - e.touches[1].pageY);
        scaling = true;
        e.preventDefault();
    }
}, { passive: false });

document.addEventListener("touchend", function(e) {
    document.removeEventListener("touchmove", touchMove);
    scaling = false;
});

document.body.onkeyup = function(e) 
{
    if (e.key == " " || e.key == "Space" || e.key == 32)
    {
        timeControls.pause.setValue(!guiControls.pause);
    }
}