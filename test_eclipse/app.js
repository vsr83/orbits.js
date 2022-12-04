var vertexShaderSource = `#version 300 es
precision highp float;
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec2 a_texCoord;
// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;
// Used to pass the texture coordinates to the fragment shader
out vec2 v_texCoord;
// all shaders have a main function
void main() {
  // convert from 0->1 to 0->2
  vec2 zeroToTwo = a_position * 2.0;
  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points.
  v_texCoord = a_texCoord;
}
`;

var fragmentShaderSource = `#version 300 es
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

#define PI 3.1415926538
#define R_MOON 1737400.0
#define R_SUN 696340000.0

uniform vec2 u_resolution;
const int NUM_TIMESTEPS = 256;
uniform highp vec3 u_sunPosition[NUM_TIMESTEPS];
uniform highp vec3 u_moonPosition[NUM_TIMESTEPS];

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;
// we need to declare an output for the fragment shader
out vec4 outColor;

highp float deg2rad(in highp float deg)
{
    return 2.0 * PI * deg / 360.0; 
}

highp float rad2deg(in highp float rad)
{
    return 360.0 * rad / (2.0 * PI);
}

highp float cosd(in highp float deg)
{
    return cos(deg2rad(deg));
}

highp float sind(in highp float deg)
{
    return sin(deg2rad(deg));
}

highp float atand(in highp float value)
{
    return rad2deg(atan(value));
}

highp float acosd(in highp float value)
{
    return rad2deg(acos(value));
}

highp float asind(in highp float value)
{
    return rad2deg(asin(value));
}

highp vec3 coordWgs84Efi(in highp float lat, in highp float lon, in highp float h)
{
    // Semi-major axis:
    highp float a = 6378137.0;
    //  Eccentricity sqrt(1 - (b*b)/(a*a))
    highp float ecc = 0.081819190842966;
    highp float ecc2 = ecc*ecc;
    
    highp float N = a / sqrt(1.0 - pow(ecc * sind(lat), 2.0));
    highp vec3 r = vec3((N + h) * cosd(lat)*cosd(lon),
                  (N + h) * cosd(lat)*sind(lon),
                  ((1.0 - ecc2) * N + h) * sind(lat));

    //r = vec3(a * cosd(lat)*cosd(lon), 
    //         a * cosd(lat)*sind(lon),
    //         a * sind(lat));

    return r;
}

highp vec3 rotateCart1d(in highp vec3 p, in highp float angle)
{
    return vec3(p.x, 
                cosd(angle) * p.y + sind(angle) * p.z,
               -sind(angle) * p.y + cosd(angle) * p.z);
}

highp vec3 rotateCart3d(in highp vec3 p, in highp float angle)
{
    return vec3(cosd(angle) * p.x + sind(angle) * p.y, 
               -sind(angle) * p.x + cosd(angle) * p.y,
                p.z);
}

highp vec3 coordEfiEnu(in highp vec3 pos, highp float lat, highp float lon, highp float h)
{
    highp vec3 rObs = coordWgs84Efi(lat, lon, h);
    highp vec3 rDiff = pos - rObs;
    highp vec3 rEnu2 = rotateCart3d(rDiff, 90.0 + lon);
    highp vec3 rEnu = rotateCart1d(rEnu2, 90.0 - lat);

    return rEnu;
}

highp float atan2d(in highp float y, in highp float x)
{
    return rad2deg(atan(y, x));
}

highp float norm(in highp vec3 v)
{
    return sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
}

highp float dotp(in highp vec3 v1, in highp vec3 v2)
{
    return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
}

vec2 eclipseMagnitude(in vec3 rEnuSun, in vec3 rEnuMoon)
{
    // Angular diameter of the Sun.
    float angularDiamSun  = 2.0 * atand((R_SUN) / (length(rEnuSun)));
    // Angular diameter of the Moon.
    float angularDiamMoon = 2.0 * atand((R_MOON) / (length(rEnuMoon)));
    //return vec2(angularDiamMoon/angularDiamSun, 0.0);

    //float foo = length(rEnuMoon);

    //angularDiamMoon = 0.5;

    float azSun = atan2d(rEnuSun.x, rEnuSun.y);
    highp float azMoon = atan2d(rEnuMoon.x, rEnuMoon.y);
    highp float elSun = acosd(rEnuSun.z / length(rEnuSun));
    highp float elMoon = acosd(rEnuMoon.z / length(rEnuMoon));

    // Angular distance between the Moon and the Sun.
    highp float angularDistance = acosd(cosd(elSun)*cosd(elMoon) 
                    + sind(elSun)*sind(elMoon)*cosd(azSun - azMoon));

    highp float sunAltitude = asind(rEnuSun.z / length(rEnuSun));

    // Magnitude is zero when the Sun is below horizon.
    if (sunAltitude < - 0.5 * angularDiamSun)
    {
        return vec2(0.0, 0.0);
    }

    if (angularDistance < 0.5 * abs(angularDiamSun - angularDiamMoon))
    {
        // Moon is entirely inside the Sun (Annular Eclipse) or the Sun 
        // is entirely inside the Moon (Total Eclipse).
        return vec2(0.0*angularDiamMoon / angularDiamSun, 1.0);
    }
    else if (angularDistance > 0.5 * (angularDiamSun + angularDiamMoon))
    {
        // Moon is entirely outside the Sun.
        //return ((-angularDistance + 0.5 * (angularDiamSun + angularDiamMoon))
        //        / angularDiamSun);
        return vec2(0.0, 0.0);
    }
    else 
    {
        // Moon boundary intersects Sun boundary.
        float moonDiamOut = angularDistance + 0.5 * (angularDiamMoon - angularDiamSun);
        float moonDiamIn = angularDiamMoon - moonDiamOut;
        return vec2(moonDiamIn / angularDiamSun, 0.0);
    }

    return vec2(0.5, 0.0);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Transform coordinates to the range [-1, 1] x [-1, 1].
    vec2 uv = fragCoord / u_resolution.xy;

    // Transform to longitude and latitude.
    highp float longitude = (uv.x * 360.0) - 180.0;
    highp float latitude = (uv.y * 180.0) - 90.0;

    vec3 vecsum = vec3(0.0, 0.0, 0.0);

    highp float magMax = 0.0;
    highp float totMax = 0.0;
    for (int j = 0; j < NUM_TIMESTEPS; j++)
    {
        highp vec3 rEfiMoon = u_moonPosition[j];
        highp vec3 rEfiSun = u_sunPosition[j];
        highp vec3 rEnuMoon = coordEfiEnu(rEfiMoon, latitude, longitude, 0.0);
        highp vec3 rEnuSun  = coordEfiEnu(rEfiSun, latitude, longitude, 0.0);

        vec2 mag = eclipseMagnitude(rEnuSun, rEnuMoon);

        magMax = max(magMax, mag.x);
        totMax = max(totMax, mag.y);
    }

    float byte1 = floor(magMax * 128.0);
    float byte2 = floor((magMax - byte1/128.0) * 32768.0);

    fragColor = vec4(byte1/256.0, byte2/256.0, totMax, 1.0);
}

void main() 
{
    //outColor =  0.5*texture(u_imageDay, v_texCoord) + 0.5*texture(u_imageNight, v_texCoord);
    mainImage(outColor, gl_FragCoord.xy);
}
`;

// 2d and WebGL canvases stacked top of each other.
var canvasJs = document.getElementById("canvasJS");
var contextJs = canvasJs.getContext("2d");
var canvasGl = document.getElementById("canvasGL");
var gl = canvasGl.getContext("webgl2", {preserveDrawingBuffer: true});

// Compiled shaders.
var program = null;

/**
 * Compile the WebGL program.
 * 
 * @returns The compiled program.
 */
function compileProgram()
{
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    {
        console.log("compile");
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    
    gl.linkProgram(program);
    // Check the link status
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) 
    {
        // error.
        console.log("ERROR");

        
        gl.deleteProgram(program);
    }

    return program;
}

/**
 * Initialize.
 */
function init()
{
    program = compileProgram();
    gl.useProgram(program);

    //window.addEventListener('resize', requestFrame, false);

    // Update location when the map is clicked.
    canvasJs.addEventListener('click', function(event)
    {
        guiControls.locationLon = xToLon(event.pageX);
        guiControls.locationLat = yToLat(event.pageY);
        requestFrameWithSun();
    });

    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    var texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var positionBuffer = gl.createBuffer();
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Load Texture and vertex coordinate buffers. 
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0 ,
        1.0, 1.0,
    ]), gl.STATIC_DRAW);

    console.log("init");
    // Draw the first frame.
    //requestFrameWithSun();
    update();
}

function update()
{
    // Adjust the canvas height according to the body size and the height of the time label.
    var body = document.getElementsByTagName('body')[0];

    canvasGL.width = 720; //document.documentElement.clientWidth;
    canvasGL.height = 360; //document.documentElement.clientHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Update canvas size uniform.
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    var sunPositionLocation = gl.getUniformLocation(program, "u_sunPosition");
    var moonPositionLocation = gl.getUniformLocation(program, "u_moonPosition");

    const lightTimeJT = 1.495978707e8 / (3e5 * 86400.0);
    const JTstart = 2458843.6076504565;
    const JTend   = 2458843.8368171095;
    const JTstep  = (JTend - JTstart) / 255;

    let posArrayMoon = [];
    let posArraySun = [];
    for (let indStep = 0; indStep < 256; indStep++)
    {
        const JT = JTstart + JTstep * indStep;

        // Position of the Earth in the Heliocentric Ecliptic frame:
        const osvEarth = orbitsjs.vsop87('earth', JT - lightTimeJT);
        // Position of the Moon in the ToD frame.
        let moonPosToD = orbitsjs.moonPositionTod(JT);
        // Position of the Sun in the Geocentric Ecliptic frame.
        osvEarth.JT = JT;
        const osvSunEcl = {
            r : orbitsjs.vecMul(osvEarth.r, -1), 
            v : orbitsjs.vecMul(osvEarth.v, -1), 
            JT : osvEarth.JT
        };

        // Transform the positions of the Sun and the Moon to the EFI frame:
        const osvSunJ2000 = orbitsjs.coordEclEq(osvSunEcl);
        const osvSunMod = orbitsjs.coordJ2000Mod(osvSunJ2000);
        const osvSunTod = orbitsjs.coordModTod(osvSunMod);
        const osvSunPef = orbitsjs.coordTodPef(osvSunTod);
        const osvSunEfi = orbitsjs.coordPefEfi(osvSunPef, 0, 0);
        const osvMoonPef = orbitsjs.coordTodPef({r : moonPosToD, v : [0, 0, 0], JT : JT});
        const osvMoonEfi = orbitsjs.coordPefEfi(osvMoonPef, 0, 0);

        //console.log(osvMoonEfi);
        osvMoonEfi.r = orbitsjs.vecMul(osvMoonEfi.r, 1.0);
        osvSunEfi.r = orbitsjs.vecMul(osvSunEfi.r, 1.0);
        const angularDistance = orbitsjs.acosd(orbitsjs.dot(osvMoonEfi.r, osvSunEfi.r) / (orbitsjs.norm(osvMoonEfi.r) * orbitsjs.norm(osvSunEfi.r)));
        //console.log(angularDistance);

        //posArray.push(1 / 256);
        //posArray.push(1 / 512);
        //posArray.push(1 / 1024);

        posArrayMoon.push(osvMoonEfi.r[0]);
        posArrayMoon.push(osvMoonEfi.r[1]);
        posArrayMoon.push(osvMoonEfi.r[2]);

        posArraySun.push(osvSunEfi.r[0]);
        posArraySun.push(osvSunEfi.r[1]);
        posArraySun.push(osvSunEfi.r[2]);
    }

    //console.log(posArraySun);
    gl.uniform3fv(sunPositionLocation, posArraySun);
    gl.uniform3fv(moonPositionLocation, posArrayMoon);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);


    var pixels = new Uint8Array(canvasGL.width * canvasGL.height * 4);
    gl.readPixels(0, 0, canvasGL.width, canvasGL.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    //console.log(pixels);

    let s = "";
    for (let indLat = 0; indLat < 360; indLat++)
    {
        for (let indLon = 0; indLon < 720; indLon++)
        {
            const index = (indLat * 720 + indLon) * 4;
            //s = s + pixels[index];
            const value = pixels[index] / 128.0 + pixels[index + 1] / 32768.0;
            s = s + value;
            if (indLon < 719) s += ',';
        }
        s += ";";
    }
    console.log(s);
}


var startTime = performance.now()
init();
var endTime = performance.now()
console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)
