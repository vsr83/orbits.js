/**
 * Update location angles of where the mouse cursor is pointing.
 * 
 * @param {*} event
 *      mousemove event. 
 */
function onMouseMove(event)
{
    if (mouseDown)
    {
        mouseDrag = true;
    }

    pointer.x = ( event.clientX / view1.clientWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / view1.clientHeight ) * 2 + 1;
    rayCaster.setFromCamera( pointer, camera1 );
    const intersects = rayCaster.intersectObjects(sceneIntersect.children);

    if (intersects.length == 1)
    {
        const coord = intersects[0].point;
        const coordCart = [coord.x, coord.y, coord.z];
        mouseCoord.az = orbitsjs.atan2d(coordCart[0], coordCart[1]);
        mouseCoord.el = orbitsjs.asind(coordCart[2] / orbitsjs.norm(coordCart));
    }
}

/**
 * onclick event handler. 
 * 
 * @param {*} event 
 */
function onClick(event)
{
    pointer.x = ( event.clientX / view1.clientWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / view1.clientHeight ) * 2 + 1;

    if (mouseDrag)
    {
        return;
    }

    sceneSelect.updateWorldMatrix(false, true);

    rayCaster.setFromCamera( pointer, camera1 );
    const intersects = rayCaster.intersectObjects(sceneSelect.children);

    // console.log(intersects);

    if (intersects.length > 0)
    {
        const object = intersects[0].object;

        if (object.isMoon === true)
        {
            setTarget("Moon");
        }
        else if (!(object.satelliteName === undefined))
        {
            setTarget(object.satelliteName);
        }
        else if (object.planet === undefined)
        {
            setTarget(object.hipName);
        }
        else
        {
            setTarget(object.planet);
        }
    }
    else
    {
        ringMesh.visible = false;
        setTarget("");
    }
}

 /**
  * Set target name label.
  * 
  * @param {*} targetNameNew 
  */
function setTarget(targetNameNew)
{
    targetName = targetNameNew;
    const targetLabel = document.getElementById('targetText');

    if (planets.includes(targetName))
    {
        targetLabel.innerText = planetNames[targetName];
    }
    else 
    {
        targetLabel.innerText = targetName;
    }
}

/**
 * Handle mousedown events.
 */
function onMouseDown()
{
    mouseDown = true;
    mouseDrag = false;
}

let mouseDown = false;
let mouseDrag = false;

view1.addEventListener('mousemove', onMouseMove);
view1.addEventListener('mousedown', onMouseDown);
view1.addEventListener('mouseup', onClick); 