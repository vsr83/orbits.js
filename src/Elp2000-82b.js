import elp2000Data from '../data/ELP2000-82b.json'  assert {type: "json"};
import { vecMul } from './MathUtils.js';

// This implementation is based on the document 
// Cahpront-Touze, Chapront, Francou - LUNAR SOLUTION ELP version ELP 2000-82B, 1985,
// 2001 Reprint
// as well as the reference Fortran implementation available from:
// http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/pub/ftp/ftp/ftp/catv/6/79/example.f

// The following table contains the complete expressions for the arguments W_1, W_2, W_3,
// T, ϖ', which are computed as 4th order polynomials of Julian centuries after Epoch.
// J. Chapront, M. Chapront-Touze, G.Francou - A new determination of lunar 
// orbital parameters, precession constant and tidal acceleration from LLR measurements,
// Astronomy Astrophysics, March 2002.
const argumentPolynomialCoefficients = [
    // W_1 : Polynomial coefficients for mean mean longitude of the Moon.
    [785939.8782, 1732559343.3328, -6.870, 0.006604, -0.00003169],
    // W_2 : Polynomial coefficients for mean longitude of the lunar perigee
    [300071.6518, 14643420.3304, -38.2639, -0.045047, 0.00021301],
    // W_3 : Polynomial coefficients for the mean longitude of the lunar ascending node.
    [450160.3265, -6967919.8851, 6.3593, 0.007625, -0.00003586],
    // T : Polynomial coefficients for the mean longitude of the Earth-Moon barycenter.
    [361679.1880, 129597742.3016, -0.0202, 0.000009, 0.00000015],
    // ϖ' : Polynomial coefficients for the mean longitude of the perihelion of the 
    // Earth-Moon barycenter.
    [370574.4136, 1161.2283, 0.5327, -0.000138, 0.0]
];

// Table F - Planetary longitudes in J2000 and mean motions ("/cy) from VSOP82.
const planetaryPolynomialCoefficients = [
    [908103.25986, 538101628.68898],    // Mercury
    [655127.28305, 210664136.43355],    // Venus
    [361679.22059, 129597742.2758],     // Earth
    [1279559.78866, 68905077.59284],    // Mars
    [123665.34212, 10925660.42861],     // Jupiter
    [180278.89694, 4399609.65932],      // Saturn
    [1130598.01841, 1542481.19393],     // Uranus
    [1095655.19575, 786550.32074]       // Neptune
];

const radFactor = Math.PI / 648000.0;
// Section 7 - Constants fitted to DE200/LE200:
const corrections = {
    deltanu : 0.55604 * radFactor / argumentPolynomialCoefficients[0][1],
    deltaE  : 0.01789 * radFactor,
    deltaGamma : -0.08066 * radFactor,
    deltanp : -0.06424 * radFactor / argumentPolynomialCoefficients[0][1],
    deltaep : -0.12879 * radFactor
};
const dtasm = 2.0 * 0.002571881335 / (3.0 * 0.074801329518);
const am = 0.074801329518;

const precessionConstant = 5029.0966 - 0.0316;

/**
 * Evaluate polynomials for W_1, W_2, W_3, T and OBP.
 * 
 * @param {*} t 
 *      Julian centuries after epoch.
 * @param {*} n 
 *      Polynomial degree.
 * @returns Object with values W1, W2, W3, T and OBP.
 */
function evaluateArgumentPolynomials(t, n)
{
    const elpArguments = [0.0, 0.0, 0.0, 0.0, 0.0];

    for (let i = 0; i < 5; i++)
    {
        let tn = 1.0;

        for (let j = 0; j < n; j++)
        {
            elpArguments[i] += argumentPolynomialCoefficients[i][j] * tn;
            tn *= t;
        }
    }

    return {
        W1 : elpArguments[0], 
        W2 : elpArguments[1],
        W3 : elpArguments[2],
        T  : elpArguments[3],
        OBP: elpArguments[4]
    };
}

/**
 * Evaluate Delaunay arguments.
 * 
 * @param {*} elpArguments 
 *      The arguments computed by above routine.
 * @returns Object with values D, LP, L and F.
 */
function evaluateDelaunayArguments(elpArguments)
{
    const delArguments = {};
    delArguments.D = elpArguments.W1 - elpArguments.T + 648000.0;
    delArguments.LP = elpArguments.T - elpArguments.OBP;
    delArguments.L = elpArguments.W1 - elpArguments.W2;
    delArguments.F = elpArguments.W1 - elpArguments.W3;

    return delArguments;
}

function evaluatePlanetaryArguments(t)
{
    let planetaryArguments = [];

    for (let i = 0; i < planetaryPolynomialCoefficients.length; i++)
    {
        planetaryArguments.push(planetaryPolynomialCoefficients[i][0]
                              + planetaryPolynomialCoefficients[i][1] * t);
    }

    return planetaryArguments;
}

/**
 * Compute the sum involved in the longitude (ELP01) and latitude terms (ELP02)
 * of the main problem.
 * 
 * @param {*} delArgs 
 *      An object with the Delaunay arguments computed for the given point in time.
 * @param {*} data 
 *      The ELP01/ELP02 data as an array of objects.
 * @returns The sum.
 */
function computeMainFigureSin(delArgs, data)
{
    let sum = 0.0;
    for (let i = 0; i < data.length; i++)
    {
        // Constants fitted to DE200/LE200.
        let A = data[i].A
              + (data[i].B1 + dtasm * data[i].B5)
              * (corrections.deltanp - am * corrections.deltanu)
              + data[i].B2 * corrections.deltaGamma
              + data[i].B3 * corrections.deltaE
              + data[i].B4 * corrections.deltaep;

        // A sin(i_1 D + i_2l' + i_3l + i_4F)
        sum += A * Math.sin((data[i].i1 * delArgs.D
                           + data[i].i2 * delArgs.LP 
                           + data[i].i3 * delArgs.L
                           + data[i].i4 * delArgs.F) * Math.PI / 648000.0);
    }

    return sum;
}

/**
 * Compute the sum involved in the distance terms (ELP03) of the main problem.
 * 
 * @param {*} delArgs 
 *      An object with the Delaunay arguments computed for the given point in time.
 * @param {*} data 
 *      The ELP03 data as an array of objects.
 * @returns The sum.
 */
function computeMainFigureCos(delArgs, data)
{
    let sum = 0.0;
    for (let i = 0; i < data.length; i++)
    {
        // Constants fitted to DE200/LE200.
        let A = data[i].A - (2.0/3.0) * data[i].A * corrections.deltanu
              + (data[i].B1 + dtasm * data[i].B5)
              * (corrections.deltanp - am * corrections.deltanu)
              + data[i].B2 * corrections.deltaGamma
              + data[i].B3 * corrections.deltaE
              + data[i].B4 * corrections.deltaep;

        // A cos(i_1 D + i_2l' + i_3l + i_4F)
        sum += A * Math.cos((data[i].i1 * delArgs.D
                                   + data[i].i2 * delArgs.LP 
                                   + data[i].i3 * delArgs.L
                                   + data[i].i4 * delArgs.F) * Math.PI / 648000.0);
    }
    
    return sum;
}

/**
 * Compute the sum involved in the non-planetary perturbations (ELP04-ELP09, ELP22-ELP36).
 * 
 * @param {*} precession
 *      The precession term.
 * @param {*} delArgs 
 *      An object with the Delaunay arguments computed for the given point in time.
 * @param {*} data 
 *      The ELPXX data as an array of objects.
 * @returns The sum.
 */
function computeNonPlanetary(precession, delArgs, data)
{
    let sum = 0.0;
    for (let i = 0; i < data.length; i++)
    {
        // A sin(i_1\zeta + i_2 D + i_3 l' + i_4 l + i_5 F + \phi)
        sum += data[i].A * Math.sin((data[i].i1 * precession
                                   + data[i].i2 * delArgs.D
                                   + data[i].i3 * delArgs.LP 
                                   + data[i].i4 * delArgs.L
                                   + data[i].i5 * delArgs.F) * Math.PI / 648000.0
                                   + data[i].phi * Math.PI / 180.0);
    }
    
    return sum;
}

/**
 * Compute the sum involved in the planetary perturbations Table 1 (ELP10-ELP15).
 * 
 * @param {*} precession
 *      The precession term.
 * @param {*} delArgs 
 *      An object with the Delaunay arguments computed for the given point in time.
 * @param {*} data 
 *      The ELPXX data as an array of objects.
 * @returns The sum.
 */
function computePlanetary1(planetaryArgs, delArgs, data)
{
    let sum = 0.0;
    for (let i = 0; i < data.length; i++)
    {
        // A sin(i_1 Me + i_2 V + i_3 T + i_4 Ma + i_5 J + i_6 S + i_7 U + i_8 N 
        //     + i_9 D + i_10 L + i_11 F + \phi)
        // Important : \phi is in degrees
        sum += data[i].A * Math.sin((data[i].i1 * planetaryArgs[0]
                                   + data[i].i2 * planetaryArgs[1]
                                   + data[i].i3 * planetaryArgs[2]
                                   + data[i].i4 * planetaryArgs[3]
                                   + data[i].i5 * planetaryArgs[4]
                                   + data[i].i6 * planetaryArgs[5]
                                   + data[i].i7 * planetaryArgs[6]
                                   + data[i].i8 * planetaryArgs[7]
                                   + data[i].i9 * delArgs.D
                                   + data[i].i10* delArgs.L 
                                   + data[i].i11* delArgs.F) * Math.PI / 648000.0
                                   + data[i].phi * Math.PI / 180.0);
    }
    
    return sum;
}

/**
 * Compute the sum involved in the planetary perturbations Table 2 (ELP16-ELP21).
 * 
 * @param {*} precession
 *      The precession term.
 * @param {*} delArgs 
 *      An object with the Delaunay arguments computed for the given point in time.
 * @param {*} data 
 *      The ELPXX data as an array of objects.
 * @returns The sum.
 */
function computePlanetary2(planetaryArgs, delArgs, data)
{
    let sum = 0.0;
    for (let i = 0; i < data.length; i++)
    {
        sum += data[i].A * Math.sin((data[i].i1 * planetaryArgs[0]
                                   + data[i].i2 * planetaryArgs[1]
                                   + data[i].i3 * planetaryArgs[2]
                                   + data[i].i4 * planetaryArgs[3]
                                   + data[i].i5 * planetaryArgs[4]
                                   + data[i].i6 * planetaryArgs[5]
                                   + data[i].i7 * planetaryArgs[6]
                                   + data[i].i8 * delArgs.D
                                   + data[i].i9 * delArgs.LP
                                   + data[i].i10* delArgs.L 
                                   + data[i].i11* delArgs.F) * Math.PI / 648000.0
                                   + data[i].phi * Math.PI / 180.0);
    }
    
    return sum;
}

/**
 * Compute position of the Moon with ELP2000-82b in the ecliptic geocentric J2000 frame.
 * 
 * @param {*} JT 
 *      Julian time (TDB).
 * @returns Position in meters.
 */
export function elp2000(JT)
{
    // Julian centuries after epoch.
    const T = (JT - 2451545.0)/36525.0;

    // Evaluate the Delaunay arguments D, l', l, F with 4th order polynomials.
    const elpArgumentsFull = evaluateArgumentPolynomials(T, 5);
    const delArgsFull = evaluateDelaunayArguments(elpArgumentsFull);

    // For ELP04 - ELP36, the Delaunay arguments D, l', l, F are reduced to their
    // linear parts:
    const elpArgumentsLin = evaluateArgumentPolynomials(T, 2);
    const delArgsLin = evaluateDelaunayArguments(elpArgumentsLin);
    const zeta = argumentPolynomialCoefficients[0][0] 
               + T * (argumentPolynomialCoefficients[0][1] + precessionConstant);
    const planetaryArgs = evaluatePlanetaryArguments(T);

    //console.log(delArgsLin);

    // Main problem.
    let longitude = computeMainFigureSin(delArgsFull, elp2000Data.ELP01);
    let latitude  = computeMainFigureSin(delArgsFull, elp2000Data.ELP02);
    let distance  = computeMainFigureCos(delArgsFull, elp2000Data.ELP03);

    // Earth figure perturbations.
    longitude += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP04);
    latitude  += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP05);
    distance  += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP06);
    longitude += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP07) * T;
    latitude  += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP08) * T;
    distance  += computeNonPlanetary(zeta, delArgsLin, elp2000Data.ELP09) * T;

    // Planetary perturbations. Table 1.
    longitude += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP10);
    latitude  += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP11);
    distance  += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP12);
    longitude += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP13) * T;
    latitude  += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP14) * T;
    distance  += computePlanetary1(planetaryArgs, delArgsLin, elp2000Data.ELP15) * T;

    // Planetary perturbations. Table 2.
    longitude += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP16);
    latitude  += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP17);
    distance  += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP18);

    longitude += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP19) * T;
    latitude  += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP20) * T;
    distance  += computePlanetary2(planetaryArgs, delArgsLin, elp2000Data.ELP21) * T;

    // Tidal effects.
    longitude += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP22);
    latitude  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP23);
    distance  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP24);

    longitude += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP25) * T;
    latitude  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP26) * T;
    distance  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP27) * T;

    // Moon figure perturbations.
    longitude += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP28);
    latitude  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP29);
    distance  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP30);

    // Relativistic perturbation.
    longitude += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP31);
    latitude  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP32);
    distance  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP33);

    // Planetary perturbations (solar eccentricity).
    longitude += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP34) * T*T;
    latitude  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP35) * T*T;
    distance  += computeNonPlanetary(0.0, delArgsLin, elp2000Data.ELP36) * T*T;

    longitude += elpArgumentsFull.W1;

    // Convert longitude and latitude from arcseconds to radians:
    longitude *= Math.PI / 648000.0;
    latitude *= Math.PI / 648000.0;

    const xMod = distance * Math.cos(longitude) * Math.cos(latitude);
    const yMod = distance * Math.sin(longitude) * Math.cos(latitude);
    const zMod = distance * Math.sin(latitude);

    // Laskar's series.
    const P = 0.10180391e-4 * T + 0.47020439e-6 * T*T - 0.5417367e-9 *T*T*T 
            - 0.2507948e-11 * T*T*T*T + 0.463486e-14 * T*T*T*T*T;
    const Q = -0.113469002e-3 * T + 0.12372674e-6 *T*T + 0.12654170e-8 *T*T*T 
            - 0.1371808e-11 *T*T*T*T - 0.320334e-14*T*T*T*T*T;

    // Rectangular coordinates in inertial mean ecliptic and equinox of J2000:
    const sqrtTerm = Math.sqrt(1 - P*P - Q*Q);
    const xJ2000 = (1 - 2*P*P) * xMod 
                + (2*P*Q) * yMod
                + 2*P*sqrtTerm * zMod;
    const yJ2000 = (2*P*Q) * xMod 
                + (1 - 2*Q*Q) * yMod 
                - 2*Q*sqrtTerm * zMod;
    const zJ2000 = (-2*P*sqrtTerm) * xMod
                + 2*Q*sqrtTerm * yMod 
                + (1 - 2*P*P - 2*Q*Q) * zMod;

    return vecMul([xJ2000, yJ2000, zJ2000], 1000);
}