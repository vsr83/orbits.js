/**
 * Class implementing the shaders for drawing of planets.
 */
class RingShaders
{
    /**
     * Constructor.
     * 
     * @param {WebGLRenderingContext} gl
     *      The WebGL rendering context to use.
     * @param {*} nLon
     *      Number of longitude divisions.
     * @param {*} nRad 
     *      Number of radial divisions.
     * @param {*} a 
     *      Ring inner radius.
     * @param {*} b
     *      Ring outer radius.
     */
    constructor(gl, nLon, nRad, a, b)
    {
        this.gl = gl;
        this.a = a;
        this.b = b;
        this.nRad = nRad;
        this.nLon = nLon;
 
        this.vertShaderSphere = `#version 300 es
        // an attribute is an input (in) to a vertex shader.
        // It will receive data from a buffer
        in vec4 a_position;
        in vec2 a_texcoord;
        
        // A matrix to transform the positions by
        uniform mat4 u_matrix;
        
        // a varying to pass the texture coordinates to the fragment shader
        out vec2 v_texcoord;
        
        // all shaders have a main function
        void main() 
        {
            // Multiply the position by the matrix.
            gl_Position = u_matrix * a_position;
        
            // Pass the texcoord to the fragment shader.
            v_texcoord = a_texcoord;
        }
        `;
        
        this.fragShaderSphere = `#version 300 es
        
        precision highp float;
        #define PI 3.1415926538
        #define R_EARTH 6371000.0
        #define R_MOON 1737400.0
        
        // Passed in from the vertex shader.
        in vec2 v_texcoord;
        
        // The texture.
        uniform sampler2D u_imageDay;
        uniform sampler2D u_imageNight;
        
        // Flags for drawing of the textures and the eclipses.
        uniform bool u_draw_texture;
        uniform bool u_show_eclipse;
        uniform bool u_grayscale;
        uniform float u_texture_brightness;

        // ECEF coordinates for the Moon and the Sun. The Sun vector has been scaled
        // to have length of 1 to avoid issues with the arithmetic.
        uniform float u_moon_x;
        uniform float u_moon_y;
        uniform float u_moon_z;
        uniform float u_sun_x;
        uniform float u_sun_y;
        uniform float u_sun_z;

        // Angular diameter of the Sun. It seems tha the shader arithmetic is not
        // accurate enough to compute this.
        uniform float u_sun_diam;

        // we need to declare an output for the fragment shader
        out vec4 outColor;
        
        float deg2rad(in float deg)
        {
            return 2.0 * PI * deg / 360.0; 
        }

        float rad2deg(in float rad)
        {
            return 360.0 * rad / (2.0 * PI);
        }

        float cosd(in float deg)
        {
            return cos(deg2rad(deg));
        }

        float sind(in float deg)
        {
            return sin(deg2rad(deg));
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
        
        highp vec3 coordEfiEnu(in highp vec3 pos, highp float lat, highp float lon, highp float h, bool transl)
        {
            highp vec3 rObs = coordWgs84Efi(lat, lon, h);

            if (transl)
            {
                highp vec3 rDiff = pos - rObs;
                highp vec3 rEnu2 = rotateCart3d(rDiff, 90.0 + lon);
                highp vec3 rEnu = rotateCart1d(rEnu2, 90.0 - lat);

                return rEnu;
            }
            else 
            {
                highp vec3 rEnu2 = rotateCart3d(pos, 90.0 + lon);
                highp vec3 rEnu = rotateCart1d(rEnu2, 90.0 - lat);

                return rEnu;
            }
        }
        vec4 toGrayscale(in vec4 rgb)
        {
            float g =  0.3 * rgb.x + 0.59 * rgb.y + 0.11 * rgb.z;
            vec4 outC;
            outC = vec4(g, g, g, rgb.w);
            return outC;
        }
        
        void main() 
        {
            vec3 coordECEFSun = vec3(u_sun_x, u_sun_y, u_sun_z);
            vec3 coordECEFMoon = vec3(u_moon_x, u_moon_y, u_moon_z);

            float lon = 2.0 * PI * (v_texcoord.y - 0.5);
            float lat = PI * (0.5 - v_texcoord.x);
            float longitude = rad2deg(lon);
            float latitude  = rad2deg(lat);
    
            // Surface coordinates.
            vec3 obsECEF = coordWgs84Efi(latitude, longitude, 0.0);
            vec3 coordSunENU = coordEfiEnu(coordECEFSun, latitude, longitude, 0.0, false);
            //float altitude = rad2deg(asin(coordSunENU.z / length(coordSunENU)));

            //74500e3, 136780e3
            float distSun = length(coordECEFSun);
            vec3 dirSun = vec3(coordECEFSun.x / distSun, coordECEFSun.y / distSun, coordECEFSun.z / distSun);
            float rSaturn = 60268000.0;
            float radius = 74500000.0 + v_texcoord.x * (136780000.0 - 74500000.0);
            vec3 pos = vec3(radius * cos(lon), radius * sin(lon), 0.0);
            float nabla = pow(dot(dirSun, pos), 2.0) - (pow(length(pos), 2.0) - rSaturn * rSaturn);
            float altitude = 1.0;
            float dummy = dot(dirSun, pos);

            if (nabla > 0.0 && dummy < 0.0)
            {
                altitude = 0.0;
            }

            if (u_draw_texture)
            {    

                if (altitude > 0.0)
                {
                    // Day. 
                    outColor = u_texture_brightness * texture(u_imageDay, v_texcoord);
                }
                else
                {
                    // Night.
                    outColor = texture(u_imageNight, v_texcoord);
                }
            }

            if (u_grayscale)
            {
                outColor = toGrayscale(outColor);
            }

            //outColor = vec4(0.5, 0.5, 0.5, 0.5);
        }
        `;
    }

    /**
     * Initialize shaders, buffers and textures.
     * 
     * @param {String} srcTextureDay
     *      URL of the texture for the iluminated part of the sphere. 
     * @param {String} srcTextureNight 
     *      URL of the texture for the non-iluminated part of the sphere.
     */
    init(srcTextureDay, srcTextureNight)
    {
        let gl = this.gl;
        this.program = compileProgram(gl, this.vertShaderSphere, this.fragShaderSphere);

        // Get attribute and uniform locations.
        this.posAttrLocation = gl.getAttribLocation(this.program, "a_position");
        this.texAttrLocation = gl.getAttribLocation(this.program, "a_texcoord");
        this.matrixLocation = gl.getUniformLocation(this.program, "u_matrix");


        this.vertexArrayPlanet = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayPlanet);

        // Load planet vertex coordinates into a buffer.
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        this.setGeometry();
        gl.enableVertexAttribArray(this.posAttrLocation);
        gl.vertexAttribPointer(this.posAttrLocation, 3, gl.FLOAT, false, 0, 0);

        // Load texture vertex coordinates into a buffer.
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        this.setTexcoords();
        gl.enableVertexAttribArray(this.texAttrLocation);
        gl.vertexAttribPointer(this.texAttrLocation, 2, gl.FLOAT, true, 0, 0);        
      

        // Load textures:
        const imageDay = new Image();
        imageDay.src = srcTextureDay;
        const imageLocationDay = gl.getUniformLocation(this.program, "u_imageDay");
        
        const imageNight = new Image();
        imageNight.src = srcTextureNight;
        const imageLocationNight = gl.getUniformLocation(this.program, "u_imageNight");
        
        this.numTextures = 0;
        let instance = this;
        imageDay.addEventListener('load', function() {
            instance.loadTexture(2, imageDay, imageLocationDay);
        });
        imageNight.addEventListener('load', function() {
            instance.loadTexture(3, imageNight, imageLocationNight);
        });
            
        gl.useProgram(this.program);
    }

    /**
     * Load texture.
     * 
     * @param {Number} index 
     *      Index of the texture.
     * @param {Image} image 
     *      The image to be loaded.
     * @param {WebGLUniformLocation} imageLocation 
     *      Uniform location for the texture.
     */
    loadTexture(index, image, imageLocation)
    {
        let gl = this.gl;

        gl.useProgram(this.program);
        // Create a texture.
        var texture = gl.createTexture();

        // use texture unit 0
        gl.activeTexture(gl.TEXTURE0 + index);

        // bind to the TEXTURE_2D bind point of texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Fill the texture with a 1x1 blue pixel.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.uniform1i(imageLocation, index);
        this.numTextures = this.numTextures + 1;
    }

    /**
     * Insert array of numbers into Float32Array;
     * 
     * @param {*} buffer 
     *      Target buffer.
     * @param {*} index 
     *      Start index.
     * @param {*} arrayIn 
     *      Array to be inserted.
     */
    insertBufferFloat32(buffer, index, arrayIn)
    {
        for (let indArray = 0; indArray < arrayIn.length; indArray++)
        {
            buffer[index + indArray] = arrayIn[indArray]; 
        }
    }

    /**
     * Insert square segment of a sphere into a Float32Buffer.
     * 
     * @param {*} buffer 
     *      The target buffer.
     * @param {*} indRect 
     *      The index of the rectangle.
     * @param {*} lonStart 
     *      Longitude start of the rectangle.
     * @param {*} lonEnd 
     *      Longitude end of the rectangle.
     * @param {*} rStart 
     *      Radius start of the rectangle.
     * @param {*} rEnd 
     *      Radius end of the rectangle.
     */
    insertRectGeo(buffer, indRect, lonStart, lonEnd, rStart, rEnd)
    {
        const indStart = indRect * 3 * 6;

        const x1 = rStart * Math.cos(lonStart);
        const y1 = rStart * Math.sin(lonStart);
        const z1 = 0;
        const x2 = rEnd * Math.cos(lonStart);
        const y2 = rEnd * Math.sin(lonStart);
        const z2 = 0;
        const x3 = rEnd * Math.cos(lonEnd);
        const y3 = rEnd * Math.sin(lonEnd);
        const z3 = 0;
        const x4 = rStart * Math.cos(lonEnd);
        const y4 = rStart * Math.sin(lonEnd);
        const z4 = 0;

        this.insertBufferFloat32(buffer, indStart, [x1,y1,z1, x2,y2,z2, x3,y3,z3, 
            x1,y1,z1, x3,y3,z3, x4,y4,z4]);
    }

    /**
     * Fill vertex buffer for sphere triangles.
     */
    setGeometry() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nRad* 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 3);

        for (let lonStep = 0; lonStep < this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let radStep = 0; radStep <= this.nRad-1; radStep++)
            {
                const rad     = this.a + (this.b - this.a) * (radStep / this.nRad);
                const radNext = this.a + (this.b - this.a) * ((radStep + 1) / this.nRad);
                const indTri = radStep + lonStep * this.nRad;
                this.insertRectGeo(positions, indTri, lon, lonNext, rad, radNext, 1);
            }  
        }
        console.log(positions);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }
    
    /**
     * Insert a texture coordinates for a square segment.
     * 
     * @param {*} buffer
     *      Target buffer. 
     * @param {*} indRect 
     *      Index of the rectangle.
     * @param {*} lonStart 
     *      Longitude start (radians).
     * @param {*} lonEnd 
     *      Longitude end (radians).
     * @param {*} rStart
     *      Latitude start (radians). 
     * @param {*} rEnd 
     *      Latitude end (radians).
     */
    insertRectTex(buffer, indRect, lonStart, lonEnd, rStart, rEnd)
    {
        const indStart  = indRect * 2 * 6;
        const uLonStart = (lonStart / (2 * Math.PI)) + 0.5;
        const uLonEnd   = (lonEnd / (2 * Math.PI)) + 0.5;
        const uRadStart = (rStart - this.a)/(this.b - this.a);
        const uRadEnd   = (rEnd - this.a)/(this.b - this.a);

        this.insertBufferFloat32(buffer, indStart, 
            [uRadStart, uLonStart, uRadEnd, uLonStart, uRadEnd,   uLonEnd,
             uRadStart, uLonStart, uRadEnd, uLonEnd,   uRadStart, uLonEnd]);
    }

    /**
     * Fill vertex buffer for textures
     */
    setTexcoords() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nRad * 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 2);

        for (let lonStep = 0; lonStep <= this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let radStep = 0; radStep <= this.nRad; radStep++)
            {
                const rad     = this.a + (this.b - this.a) * (radStep / this.nRad);
                const radNext = this.a + (this.b - this.a) * ((radStep + 1) / this.nRad);
                const indTri = radStep + lonStep * this.nRad;

                this.insertRectTex(positions, indTri, lon, lonNext, rad, radNext);
            }  
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    /**
     * Draw the rings.
     * 
     * @param {*} viewMatrix 
     *      The view matrix.
     * @param {*} drawTexture
     *      Whether to draw the texture.
     * @param {*} drawGrid
     *      Whether to draw the grid.
     * @param {*} drawMap 
     *      Whether to draw the map.
     * @param {*} showEclipse
     *      Draw the eclipse.
     * @param {*} showSun
     *      Draw the Sun altitude.
     * @param {*} rECEFMoon
     *      ECEF coordinates of the Moon.
     */
    draw(viewMatrix, drawTexture, drawGrid, drawMap, showEclipse, drawSun, rECEFMoon, rECEFSun)
    {
        if (this.numTextures < 2)
        {
            return;
        }
        const gl = this.gl;

        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.matrixLocation, false, viewMatrix);

        gl.disable(gl.CULL_FACE);
        //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        const drawTextureLocation = gl.getUniformLocation(this.program, "u_draw_texture");

        const moonXLocation = gl.getUniformLocation(this.program, "u_moon_x");
        const moonYLocation = gl.getUniformLocation(this.program, "u_moon_y");
        const moonZLocation = gl.getUniformLocation(this.program, "u_moon_z");
        const sunXLocation = gl.getUniformLocation(this.program, "u_sun_x");
        const sunYLocation = gl.getUniformLocation(this.program, "u_sun_y");
        const sunZLocation = gl.getUniformLocation(this.program, "u_sun_z");
        const sunDiamLocation = gl.getUniformLocation(this.program, "u_sun_diam");
        const showEclipseLocation = gl.getUniformLocation(this.program, "u_show_eclipse");
        const grayscaleLocation = gl.getUniformLocation(this.program, "u_grayscale");
        const brightnessLocation = gl.getUniformLocation(this.program, "u_texture_brightness");

        if (drawTexture)
        {
            gl.uniform1f(drawTextureLocation, 1);
        }
        else
        {
            gl.uniform1f(drawTextureLocation, 0);            
        }

        if (false)
        {
            gl.uniform1f(grayscaleLocation, 1);
        }
        else 
        {
            gl.uniform1f(grayscaleLocation, 0);
        }

        if (drawSun)
        {
            const diamAngSun = 2 * orbitsjs.atand(696340000.0 / orbitsjs.norm(rECEFSun));
            gl.uniform1f(sunXLocation, rECEFSun[0] / orbitsjs.norm(rECEFSun));
            gl.uniform1f(sunYLocation, rECEFSun[1] / orbitsjs.norm(rECEFSun));
            gl.uniform1f(sunZLocation, rECEFSun[2] / orbitsjs.norm(rECEFSun));
            gl.uniform1f(sunDiamLocation, diamAngSun);
        }

        if (showEclipse)
        {
            gl.uniform1f(moonXLocation, rECEFMoon[0]);
            gl.uniform1f(moonYLocation, rECEFMoon[1]);
            gl.uniform1f(moonZLocation, rECEFMoon[2]);
            gl.uniform1f(showEclipseLocation, 1);
        }
        else
        {
            gl.uniform1f(showEclipseLocation, 0);            
        }
        gl.uniform1f(brightnessLocation, 0.8);


        // Draw the sphere.
        gl.bindVertexArray(this.vertexArrayPlanet);
        const nTri = this.nLon * this.nRad * 2;
        const count = nTri * 3;
        gl.drawArrays(gl.TRIANGLES, 0, count);
    }
}