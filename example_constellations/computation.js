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
 * Limit angle to [0, 360) range.
 * 
 * @param {*} deg 
 *      Angle in degrees.
 * @returns Limited angle.
 */
function limitDeg360(deg)
{
    if (deg < 0)
    {
        return deg + 360;
    }

    return deg;
}

/**
 * Copy array to vector.
 * 
 * @param {*} vec 
 *      Target vector.
 * @param {*} r 
 *      Input array.
 */
function setVec3Array(vec, r)
{
    vec.x = r[0];
    vec.y = r[1];
    vec.z = r[2];
}

/**
 * Copy vector to vector.
 * 
 * @param {*} vec 
 *      Target vector.
 * @param {*} r 
 *      Input vector.
 */
function setVec3Vec(vec, r)
{
    vec.x = r.x;
    vec.y = r.y;
    vec.z = r.z;
}

/**
 * Create THREE.Vector3 from an array.
 * 
 * @param {*} p 
 *     3d array.
 * @returns Vector3.
 */
function array3Vec(p)
{
    return new THREE.Vector3(p[0], p[1], p[2]);
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

/**
 * Transform from spherical to Cartesian coordinates in horizontal frame.
 * 
 * @param {*} r 
 *      Distance.
 * @param {*} el 
 *      Elevation (deg).
 * @param {*} az
 *      Azimuth (deg).
 * @returns 3d array of coordinates.
 */
 function sphEnuCart(r, el, az)
 {
    return [r * orbitsjs.cosd(el) * orbitsjs.sind(az), 
            r * orbitsjs.cosd(el) * orbitsjs.cosd(az), 
            r * orbitsjs.sind(el)];
}
 
/**
 * Convert from Cartesian to spherical coordinates in ENU frame.
 * 
 * @param {*} vec 
 *     THREE.Vector3 with voordinates.
 * @returns Object with az and el.
 */
function cartEnuSph(vec)
{
    return orbitsjs.coordEnuAzEl({r : [vec.x, vec.y, vec.z], v : [0, 0, 0], JT : 0});
}

/**
 * Convert from Cartesian to spherical coordinates in an inertial frame.
 * 
 * @param {*} p 
 *      3d array with coordinates.
 * @returns Object with r, RA and DE.
 */
function cartIneSph(p)
{
    const r = orbitsjs.norm(p);
    const RA = orbitsjs.atan2d(p[1], p[0]);
    const DE = orbitsjs.asind(p[2] / r);

    return {R : r, RA : RA, DE : DE};
}

/**
 * Create Three.js matrix for the rotation between J2000 and ENU frames.
 * It is important to note that the matrix alone is not sufficient for objects
 * with significant Diurnal parallax (w.r.t. location on Earth).
 * 
 * @param {*} JT 
 *     Julian time.
 * @params {*} nutParams
 *     Nutation parameters.
 * @returns The 4x4 Three.js matrix.
 */
function createMatrix(JT, nutTerms)
{
    // We construct rotation matrix by transforming basis vectors to the ENU frame.
    // Since the EFI-ENU transformation involves translation and the rotation is used
    // uniformly for all stars, the basis vectors are scaled to very large vector so
    // that the translation becomes small enough.
    function createColumn(vec, JT, nutTerms)
    {
        const targetOsvJ2000 = {r: orbitsjs.vecMul(vec, 1e20), v : [0, 0, 0], JT};

        const targetOsvMod = orbitsjs.coordJ2000Mod(targetOsvJ2000);
        const targetOsvTod = orbitsjs.coordModTod(targetOsvMod, nutTerms);
        const targetOsvPef = orbitsjs.coordTodPef(targetOsvTod);
        const targetOsvEfi = orbitsjs.coordPefEfi(targetOsvPef, 0, 0);
        const targetOsvEnu = orbitsjs.coordEfiEnu(targetOsvEfi, 
            guiControls.observerLat, guiControls.observerLon, 0);

        return targetOsvEnu.r;
    }
    
    // Scale back to obtain columns of the rotation matrix.
    const col1 = orbitsjs.vecMul(createColumn([1, 0, 0], JT, nutTerms), 1e-20);
    const col2 = orbitsjs.vecMul(createColumn([0, 1, 0], JT, nutTerms), 1e-20);
    const col3 = orbitsjs.vecMul(createColumn([0, 0, 1], JT, nutTerms), 1e-20);

    // Construct the rotation matrix.
    const matrix = new THREE.Matrix4();
    matrix.set(
        col1[0], col2[0], col3[0], 0,
        col1[1], col2[1], col3[1], 0,
        col1[2], col2[2], col3[2], 0,
        0, 0, 0, 1
    );

    return matrix;
}

/**
 * Create rotation-translation matrix for the Earth mesh.
 * 
 * @param {*} lon 
 *     Observer longitude.
 * @param {*} lat 
 *     Observer latitude.
 * @returns The rotation matrix.
 */
function createRotMatrix(lon, lat)
{
    const matrix = new THREE.Matrix4();

    // EFI-ENU rotation matrix.
    const T11 =-orbitsjs.sind(lon);
    const T21 = orbitsjs.cosd(lon);
    const T31 = 0;
    const T12 = -orbitsjs.cosd(lon)*orbitsjs.sind(lat);
    const T22 = -orbitsjs.sind(lon)*orbitsjs.sind(lat);
    const T32 = orbitsjs.cosd(lat);
    const T13 = orbitsjs.cosd(lon)*orbitsjs.cosd(lat);
    const T23 = orbitsjs.sind(lon)*orbitsjs.cosd(lat);
    const T33 = orbitsjs.sind(lat);

    // Rotate w.r.t. x by 90 degrees to handle the texture and build the rotation
    // matrix.
    matrix.set(
        T11, T31, -T21, 0,
        T12, T32, -T22, 0,
        T13, T33, -T23, -50, 
        0, 0, 0, 1
    );

    return matrix;
}

/**
 * Compute planet position.
 * 
 * @param {*} JT 
 *      Julian time.
 * @param {*} planet
 *      Planet. 
 * @param {*} nutTerms
 *      Nutation parameters,
 * @returns Position vector in ENU frame.
 */
function computePlanetPos(JT, planet, nutTerms)
{
    let posVelEarth = orbitsjs.vsop87('earth', JT);
    let posVelInitial = orbitsjs.vsop87(planet, JT);

    if (planet === 'earth')
    {
        //postVelInitial = posVelEarth;
        posVelInitial = {r : [0, 0, 0], v : [0, 0, 0], JT : JT};
    }

    const diffPosInitial = orbitsjs.vecDiff(posVelInitial.r, posVelEarth.r);
    const diffVelInitial = orbitsjs.vecDiff(posVelInitial.v, posVelEarth.v);

    const osv = orbitsjs.coordEclEq({r: diffPosInitial, v: diffVelInitial, JT : JT});
    const targetOsvMod = orbitsjs.coordJ2000Mod(osv);
    const targetOsvTod = orbitsjs.coordModTod(targetOsvMod, nutTerms);
    const targetOsvPef = orbitsjs.coordTodPef(targetOsvTod);
    const targetOsvEfi = orbitsjs.coordPefEfi(targetOsvPef, 0, 0);
    const targetOsvEnu = orbitsjs.coordEfiEnu(targetOsvEfi, 
        guiControls.observerLat, guiControls.observerLon, 0);

    return targetOsvEnu.r;
}

/**
 * Compute position of the Moon in ENU frame.
 * 
 * @param {*} JT 
 *      Julian time.
 * @param {*} nutTerms
 *      Nutation terms. 
 * @returns Position in ENU frame.
 */
function computeMoonPosEnu(JT, nutTerms)
{
    const moonPosTod = orbitsjs.moonPositionTod(JT, nutTerms);
    const targetOsvPef = orbitsjs.coordTodPef({r : moonPosTod, v : [0, 0, 0], JT : JT});
    const targetOsvEfi = orbitsjs.coordPefEfi(targetOsvPef, 0, 0);
    const targetOsvEnu = orbitsjs.coordEfiEnu(targetOsvEfi, 
        guiControls.observerLat, guiControls.observerLon, 0);
    return targetOsvEnu.r;
}