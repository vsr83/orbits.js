/**
 * Class implementing the shaders for drawing of planets.
 */
class PlanetShaders
{
    /**
     * Constructor.
     * 
     * @param {WebGLRenderingContext} gl
     *      The WebGL rendering context to use.
     * @param {*} nLon
     *      Number of longitude divisions.
     * @param {*} nLat 
     *      Number of latitude divisions.
     * @param {*} a 
     *      Equatorial radius.
     * @param {*} b
     *      Polar radius.
     * @param {*} lonGridStep
     *      Longitude grid step.
     * @param {*} latGridStep
     *      Latitude grid step.
     */
    constructor(gl, nLon, nLat, a, b, lonGridStep, latGridStep)
    {
        this.gl = gl;
        this.a = a;
        this.b = b;
        this.nLat = nLat;
        this.nLon = nLon;
        this.lonGridStep = lonGridStep;
        this.latGridStep = latGridStep;

        this.colorGrid = [80, 80, 80];
        this.colorMap = [80, 80, 127];

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

            float lon = 2.0 * PI * (v_texcoord.x - 0.5);
            float lat = PI * (0.5 - v_texcoord.y);
            float longitude = rad2deg(lon);
            float latitude  = rad2deg(lat);
    
            // Surface coordinates.
            vec3 obsECEF = coordWgs84Efi(latitude, longitude, 0.0);
            vec3 coordSunENU = coordEfiEnu(coordECEFSun, latitude, longitude, 0.0, false);
            float altitude = rad2deg(asin(coordSunENU.z / length(coordSunENU)));

            if (u_draw_texture)
            {    
                if (altitude > 0.0)
                {
                    // Day. 
                    outColor = u_texture_brightness * texture(u_imageDay, v_texcoord);
                }
                else if (altitude > -6.0)
                {
                    // Civil twilight.
                    outColor = mix(texture(u_imageNight, v_texcoord), u_texture_brightness * texture(u_imageDay, v_texcoord), 0.2);
                }
                else if (altitude > -12.0)
                {
                    // Nautical twilight.
                    outColor = mix(texture(u_imageNight, v_texcoord), u_texture_brightness * texture(u_imageDay, v_texcoord), 0.15);
                }
                else if (altitude > -18.0)
                {
                    // Astronomical twilight.
                    outColor = mix(texture(u_imageNight, v_texcoord), u_texture_brightness * texture(u_imageDay, v_texcoord), 0.1);
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
        }
        `;

        this.vertShaderGrid = `#version 300 es
            // an attribute is an input (in) to a vertex shader.
            // It will receive data from a buffer
            in vec4 a_position;
            in vec4 a_color;

            // A matrix to transform the positions by
            uniform mat4 u_matrix;

            // a varying the color to the fragment shader
            out vec4 v_color;

            // all shaders have a main function
            void main() 
            {
                // Multiply the position by the matrix.
                gl_Position = u_matrix * a_position;

                // Pass the color to the fragment shader.
                v_color = a_color;
            }
            `;

        this.fragShaderGrid = `#version 300 es
            precision highp float;

            // the varied color passed from the vertex shader
            in vec4 v_color;

            // we need to declare an output for the fragment shader
            out vec4 outColor;

            void main() 
            {
                outColor = v_color;
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
        this.programGrid = compileProgram(gl, this.vertShaderGrid, this.fragShaderGrid);

        // Get attribute and uniform locations.
        this.posAttrLocation = gl.getAttribLocation(this.program, "a_position");
        this.texAttrLocation = gl.getAttribLocation(this.program, "a_texcoord");
        this.matrixLocation = gl.getUniformLocation(this.program, "u_matrix");

        this.posAttrLocationGrid = gl.getAttribLocation(this.programGrid, "a_position");
        this.colorAttrLocationGrid = gl.getAttribLocation(this.programGrid, "a_color");
        this.matrixLocationGrid = gl.getUniformLocation(this.programGrid, "u_matrix");

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

        // Load grid coordinates.
        this.vertexArrayGrid = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayGrid);

        this.positionBufferGrid = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferGrid);
        this.setGeometryGrid();
        gl.enableVertexAttribArray(this.posAttrLocationGrid);
        gl.vertexAttribPointer(this.posAttrLocationGrid, 3, gl.FLOAT, false, 0, 0);
      
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        this.setColorsGrid();
        gl.enableVertexAttribArray(this.colorAttrLocationGrid);
        gl.vertexAttribPointer(this.colorAttrLocationGrid, 3, gl.UNSIGNED_BYTE, true, 0, 0);

        // Initialize buffer for map coordinates.
        this.vertexArrayMap = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayMap);

        this.positionBufferMap = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferMap);
        gl.enableVertexAttribArray(this.posAttrLocationGrid);
        gl.vertexAttribPointer(this.posAttrLocationGrid, 3, gl.FLOAT, false, 0, 0);
      
        this.colorBufferMap = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBufferMap);
        gl.enableVertexAttribArray(this.colorAttrLocationGrid);
        gl.vertexAttribPointer(this.colorAttrLocationGrid, 3, gl.UNSIGNED_BYTE, true, 0, 0);


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
            instance.loadTexture(0, imageDay, imageLocationDay);
        });
        imageNight.addEventListener('load', function() {
            instance.loadTexture(1, imageNight, imageLocationNight);
        });
            
        gl.useProgram(this.program);

        this.loadMaps();
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
     * @param {*} latStart 
     *      Latitude start of the rectangle.
     * @param {*} latEnd 
     *      Latitude end of the rectangle.
     */
    insertRectGeo(buffer, indRect, lonStart, lonEnd, latStart, latEnd)
    {
        const indStart = indRect * 3 * 6;

        const x1 = this.a * Math.cos(latStart) * Math.cos(lonStart);
        const y1 = this.a * Math.cos(latStart) * Math.sin(lonStart);
        const z1 = this.b * Math.sin(latStart);
        const x2 = this.a * Math.cos(latStart) * Math.cos(lonEnd);
        const y2 = this.a * Math.cos(latStart) * Math.sin(lonEnd);
        const z2 = this.b * Math.sin(latStart);
        const x3 = this.a * Math.cos(latEnd) * Math.cos(lonEnd);
        const y3 = this.a * Math.cos(latEnd) * Math.sin(lonEnd);
        const z3 = this.b * Math.sin(latEnd);
        const x4 = this.a * Math.cos(latEnd) * Math.cos(lonStart);
        const y4 = this.a * Math.cos(latEnd) * Math.sin(lonStart);
        const z4 = this.b * Math.sin(latEnd);

        this.insertBufferFloat32(buffer, indStart, [x1,y1,z1, x2,y2,z2, x3,y3,z3, 
            x1,y1,z1, x3,y3,z3, x4,y4,z4]);
    }

    /**
     * Fill vertex buffer for sphere triangles.
     */
    setGeometry() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nLat * 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 3);

        for (let lonStep = 0; lonStep < this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let latStep = 0; latStep <= this.nLat-1; latStep++)
            {
                const lat =  Math.PI * (latStep / this.nLat - 0.5);
                const latNext = Math.PI * ((latStep + 1) / this.nLat - 0.5);
                const indTri = latStep + lonStep * this.nLat;
                this.insertRectGeo(positions, indTri, lon, lonNext, lat, latNext, 1);
            }  
        }
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
     * @param {*} latStart
     *      Latitude start (radians). 
     * @param {*} latEnd 
     *      Latitude end (radians).
     */
    insertRectTex(buffer, indRect, lonStart, lonEnd, latStart, latEnd)
    {
        const indStart  = indRect * 2 * 6;
        const uLonStart = (lonStart / (2 * Math.PI)) + 0.5;
        const uLonEnd   = (lonEnd / (2 * Math.PI)) + 0.5;
        const uLatStart = -(latStart) / Math.PI + 0.5;
        const uLatEnd   = -(latEnd) / Math.PI + 0.5;

        this.insertBufferFloat32(buffer, indStart, 
            [uLonStart, uLatStart, uLonEnd, uLatStart, uLonEnd,   uLatEnd,
             uLonStart, uLatStart, uLonEnd, uLatEnd,   uLonStart, uLatEnd]);
    }

    /**
     * Fill vertex buffer for textures
     */
    setTexcoords() 
    {
        const gl = this.gl;
        const nTri = this.nLon * this.nLat * 2;
        const nPoints = nTri * 3;
        const positions = new Float32Array(nPoints * 2);

        for (let lonStep = 0; lonStep <= this.nLon; lonStep++)
        {
            const lon = 2 * Math.PI * (lonStep / this.nLon - 0.5);
            const lonNext = 2 * Math.PI * ((lonStep + 1) / this.nLon - 0.5);

            for (let latStep = 0; latStep <= this.nLat; latStep++)
            {
                const lat =  Math.PI * (latStep / this.nLat - 0.5);
                const latNext = Math.PI * ((latStep + 1) / this.nLat - 0.5);
                const indTri = latStep + lonStep * this.nLat;

                this.insertRectTex(positions, indTri, lon, lonNext, lat, latNext);
            }  
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    /**
     * Draw the planet.
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
        const nTri = this.nLon * this.nLat * 2;
        const count = nTri * 3;
        gl.drawArrays(gl.TRIANGLES, 0, count);

        gl.useProgram(this.programGrid);
        gl.bindVertexArray(this.vertexArrayGrid);
        gl.uniformMatrix4fv(this.matrixLocationGrid, false, viewMatrix);

        // Draw the grid.
        if (drawGrid)
        {
            gl.drawArrays(gl.LINES, 0, this.gridLines * 2);
        }
        
        if (drawMap)
        {
            gl.bindVertexArray(this.vertexArrayMap);
            gl.drawArrays(gl.LINES, 0, this.gridLinesMap * 2);
        }
    }

    // Fill the current ARRAY_BUFFER buffer with grid.
    setGeometryGrid() 
    {
        let gl = this.gl;
        const points = [];
        let lonStep = 2.0;
        let latStep = this.latGridStep;
        let nLines = 0;

        let gridCoeff = 1.002;
        const nStepLat = Math.floor(90.0 / latStep);

        for (let lat = -nStepLat * latStep; lat <= nStepLat * latStep; lat += latStep)
        {
            for (let lon = -180.0; lon < 180.0; lon += lonStep)
            {
                const xStart = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.cosd(lon);
                const yStart = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.sind(lon);
                const zStart = gridCoeff * this.b * orbitsjs.sind(lat);
                const xEnd = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.cosd(lon + lonStep);
                const yEnd = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.sind(lon + lonStep);
                const zEnd = gridCoeff * this.b * orbitsjs.sind(lat);
                points.push([xStart, yStart, zStart]);
                points.push([xEnd, yEnd, zEnd]);
                nLines++;
            }
        }
        latStep = 2.0;
        lonStep = this.lonGridStep;
        const nStepLon = Math.floor(180.0 / lonStep);

        for (let lon = -nStepLon * lonStep; lon <= nStepLon * lonStep; lon += lonStep)
        {
            for (let lat = -90.0; lat < 90.0; lat += latStep)
            {
                const xStart = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.cosd(lon);
                const yStart = gridCoeff * this.a * orbitsjs.cosd(lat) * orbitsjs.sind(lon);
                const zStart = gridCoeff * this.b * orbitsjs.sind(lat);
                const xEnd = gridCoeff * this.a * orbitsjs.cosd(lat + latStep) * orbitsjs.cosd(lon);
                const yEnd = gridCoeff * this.a * orbitsjs.cosd(lat + latStep) * orbitsjs.sind(lon);
                const zEnd = gridCoeff * this.b * orbitsjs.sind(lat + latStep);
                points.push([xStart, yStart, zStart]);
                points.push([xEnd, yEnd, zEnd]);
                nLines++;
            }
        }

        this.gridLines = nLines;
        var positions = new Float32Array(this.gridLines * 6);

        for (let indPoint = 0; indPoint < points.length; indPoint++)
        {
            let point = points[indPoint];
            let indStart = indPoint * 3;
            positions[indStart] = point[0];
            positions[indStart + 1] = point[1];
            positions[indStart + 2] = point[2];
        }
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    }

    /**
     * Update grid resolution.
     * 
     * @param {*} lonRes
     *      Longitude resolution in degrees. 
     * @param {*} latRes 
     *      Latitude resolution in degrees.
     */
    updateGrid(lonRes, latRes)
    {
        this.lonGridStep = lonRes;
        this.latGridStep = latRes;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferGrid);
        this.setGeometryGrid();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        this.setColorsGrid();
    }

    // Fill the current ARRAY_BUFFER buffer with colors for the 'F'.
    setColorsMap() 
    {
        let gl = this.gl;
        const colorArray = new Uint8Array(this.gridLinesMap * 6);

        for (let indPoint = 0; indPoint < this.gridLinesMap * 2; indPoint++)
        {
            const startIndex = indPoint * 3;
            colorArray[startIndex] = this.colorMap[0];
            colorArray[startIndex + 1] = this.colorMap[1];
            colorArray[startIndex + 2] = this.colorMap[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBufferMap);
        gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
    }
  
    // Fill the current ARRAY_BUFFER buffer with colors for the 'F'.
    setColorsGrid() 
    {
        let gl = this.gl;
        const colorArray = new Uint8Array(this.gridLines * 6);

        for (let indPoint = 0; indPoint < this.gridLines * 2; indPoint++)
        {
            const startIndex = indPoint * 3;
            colorArray[startIndex] = this.colorGrid[0];
            colorArray[startIndex + 1] = this.colorGrid[1];
            colorArray[startIndex + 2] = this.colorGrid[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
    }

    // Load map polygons into a buffer.
    loadMapPolygons()
    {
        const points = [];
        let nLines = 0;
        let gl = this.gl;

        let gridCoeff = 1.002;

        for (let indPoly = 0; indPoly < this.polygons.length; indPoly++)
        {
            const poly = this.polygons[indPoly];

            for (let indPoint = 0; indPoint < poly.lon.length - 1; indPoint++)
            {
                const lonStart = poly.lon[indPoint];
                const latStart = poly.lat[indPoint];
                const lonEnd   = poly.lon[indPoint + 1];
                const latEnd   = poly.lat[indPoint + 1];

                const xStart = gridCoeff * this.a * orbitsjs.cosd(latStart) * orbitsjs.cosd(lonStart);
                const yStart = gridCoeff * this.a * orbitsjs.cosd(latStart) * orbitsjs.sind(lonStart);
                const zStart = gridCoeff * this.b * orbitsjs.sind(latStart);
                const xEnd = gridCoeff * this.a * orbitsjs.cosd(latEnd) * orbitsjs.cosd(lonEnd);
                const yEnd = gridCoeff * this.a * orbitsjs.cosd(latEnd) * orbitsjs.sind(lonEnd);
                const zEnd = gridCoeff * this.b * orbitsjs.sind(latEnd);

                points.push([xStart, yStart, zStart]);
                points.push([xEnd, yEnd, zEnd]);
                nLines++;
            }
        }

        this.gridLinesMap = nLines;
        const positions = new Float32Array(this.gridLinesMap * 6);

        for (let indPoint = 0; indPoint < points.length; indPoint++)
        {
            let point = points[indPoint];
            let indStart = indPoint * 3;
            positions[indStart] = point[0];
            positions[indStart + 1] = point[1];
            positions[indStart + 2] = point[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBufferMap);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        this.setColorsMap();

    }

    // Load and parse the World map from JSON.
    loadMaps()
    {
        let polygons = [];
        /**
         * Add polygon to the polygon list.
         * The method transforms the polygon from a list of lon-lat pairs to arrays
         * of lat and lon coordinates.
         * 
         * @param {*} polygon 
         *     Polygon as a list of lon-lat pairs.
         * @returns The number of points in the polygon.
         */
        let addPolygon = function(polygon)
        {
            var numPoints = polygon.length;
            var pointsLon = [];
            var pointsLat = [];

            for (var indPoint = 0; indPoint < numPoints; indPoint++)
            {
                pointsLon.push(polygon[indPoint][0]);
                pointsLat.push(polygon[indPoint][1]);
            }

            polygons.push({lon : pointsLon, lat : pointsLat});

            return numPoints;
        }

        this.polygons = [];
        const instance = this;

        var xmlHTTP = new XMLHttpRequest();
        xmlHTTP.onreadystatechange = function()
        {
            //console.log("readyState: " + this.readyState);
            //console.log("status:     " + this.status);
        
            if (this.readyState == 4 && this.status == 200)
            {
                // Parse JSON and initialize World map.
                let dataJSON = JSON.parse(this.responseText);
                console.log(dataJSON);

                var features = dataJSON.features;
                var numPointsTotal = 0;
        
                for (var index = 0; index < features.length; index++)
                {
                    // Read polygons and multi-polygons.
                    var feature = features[index];
                    var geometry = feature.geometry;
                    // TBD:
                    //var properties = feature.properties;
                    
                    if (geometry.type === "Polygon")
                    {
                        var coordinates = geometry.coordinates[0];
                        var numPoints = geometry.coordinates[0].length;
                        numPointsTotal += addPolygon(coordinates);
                    }
                    if (geometry.type === "MultiPolygon")
                    {
                        var numPolygons = geometry.coordinates.length;
        
                        for (var indPolygon = 0; indPolygon < numPolygons; indPolygon++)
                        {
                            var coordinates = geometry.coordinates[indPolygon][0];
                            numPointsTotal += addPolygon(coordinates);
                        }
                    }
                }
                console.log("Added " + numPointsTotal + " points");
                instance.polygons = polygons;
                //console.log(instance.polygons);
                instance.loadMapPolygons();
            }
        }
        xmlHTTP.open("GET", "json/worldmap.json", true);
        xmlHTTP.send();
    }
}