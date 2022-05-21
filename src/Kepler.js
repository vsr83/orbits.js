import { limitAngleDeg } from "./Angles.js";
import { sind, cosd} from "./MathUtils.js";

/**
 * Solve the Kepler equation.
 * 
 * @param {*} M 
 *      Mean anomaly (in degrees).
 * @param {*} ecc 
 *      Eccentricity.
 * @param {*} tolerance
 *      Tolerance. 
 * @param {*} maxIter
 *      Maximum number of iterations. 
 * @returns The eccentric anomaly (in degrees).
 */
export function keplerSolve(M, ecc, tolerance, maxIter)
{
    let iterationCount = 0;
    let error = tolerance + 1.0;
    let E = M;
    
    // M = E - e sind E
    // <=> E - e sind E - 0 = 0
    // f = E - e sind E - M
    // df/dE = 1 - e (dF/dE) sin(2 * pi * E / 360.0)
    //       = 1 - (2*pi*e/360.0) * cosd(E)
    
    while (error > tolerance)
    {
        iterationCount = iterationCount + 1;
    
        if (iterationCount > maxIter)
        {
            console.error("Convergence failed");
        }
    
        // Newton-Raphson iteration:
        const a = Math.PI / 180.0;
        E = E - (M - E + (ecc/a) * sind(E))/(ecc * cosd(E) - 1);
    
        error = Math.abs(sind(M) - sind(E - (ecc/a) * sind(E)))
              + Math.abs(cosd(M) - cosd(E - (ecc/a) * sind(E)));
    }
    
    return limitAngleDeg(E);
}

/**
 * Compute perifocal coordinates.
 * 
 * @param {*} a 
 *      Semi-major axis.
 * @param {*} b 
 *      Semi-minor axis.
 * @param {*} E 
 *      The eccentric anomaly.
 * @param {*} mu 
 *      Gravitational parameter.
 * @param {*} JT
 *      Julian time.
 * @returns Object r, v, JT fields for position, velocity and Julian date.
 */
export function keplerPerifocal(a, b, E, mu, JT)
{
    // Compute eccentricity:
    const ecc = Math.sqrt(1 - (b/a) ** 2);
    // Orbital period from Kepler's third law:
    const T = Math.sqrt(4*Math.PI*Math.PI*a*a*a/mu);
    // Mean angular motion (angle per second).
    const n = 360.0 / T;
    
    // Expression of the position in the perifocal frame (2.51):
    const rPer = [a * (cosd(E) - ecc), b * sind(E), 0];
    const dEdt = n/(1 - ecc * cosd(E));
    const vPer = [-a * dEdt * sind(E) * (Math.PI/180),
                   b * dEdt * cosd(E) * (Math.PI/180),
                   0];

    return {r : rPer, v : vPer, JT : JT};
}

export function keplerPlanets(JT)
{
    // Julian centuries after J2000.0 epoch.
    const T = (JT - 2451545.0) / 36525.0;
    // Astronomical unit.
    const auMeters = 1.495978707e11;

    let planets = {
        mercury :  
        {
            a     : (0.38709927   + 0.00000037 * T) * auMeters, 
            e     : 0.20563593   + 0.00001906 * T,
            i     : 7.00497902   - 0.00594749 * T,
            L     : 252.25032350 + 149472.67411175 * T,
            Lperi : 77.45779628  + 0.16047689 * T,
            Omega : 48.33076593  - 0.12534081 * T
        },
        venus : 
        {
            a     : (0.72333566   + T * 0.00000390) * auMeters,
            e     : 0.00677672    - T * 0.00004107,
            i     : 3.39467605    - T * 0.00078890,
            L     : 181.97909950  + T * 58517.81538729, 
            Lperi : 131.60246718  + T * 0.00268329,
            Omega : 76.67984255   - T * 0.27769418 
        },
        earth :
        {
            a     : (1.00000261   + T * 0.00000562) * auMeters, 
            e     : 0.01671123    - T * 0.00004392, 
            i     :-0.00001531    - T * 0.01294668, 
            L     : 100.46457166  + T * 35999.37244981, 
            Lperi : 102.93768193  + T * 0.32327364,
            Omega : -11.26064     - T * 5.0634027
        },
        mars : 
        {
            a     : (1.52371034   + T * 0.00001847) * auMeters,  
            e     : 0.09339410   + T * 0.00007882,
            i     : 1.84969142   - T * 0.00813131, 
            L     :-4.55343205   + T * 19140.30268499, 
            Lperi :-23.94362959  + T * 0.44441088,  
            Omega :49.55953891   - T * 0.29257343
        },
        jupiter : 
        {
            a     : (5.20288700   - T * 0.00011607) * auMeters, 
            e     : 0.04838624   - T * 0.00013253,
            i     : 1.30439695   - T * 0.00183714,
            L     : 34.39644051  + T * 3034.74612775,  
            Lperi : 14.72847983  + T * 0.21252668, 
            Omega : 100.47390909 + T * 0.20469106
        },
        saturn : 
        {
            a     : (9.53667594   - T * 0.00125060) * auMeters, 
            e     : 0.05386179   - T * 0.00050991,  
            i     : 2.48599187   + T * 0.00193609,  
            L     : 49.95424423  + T * 1222.49362201,  
            Lperi : 92.59887831  - T * 0.41897216, 
            Omega : 113.66242448 - T * 0.28867794
        },
        uranus : 
        {
            a     : (19.18916464  - T * 0.00196176) * auMeters, 
            e     : 0.04725744   - T * 0.00004397,  
            i     : 0.77263783   - T * 0.00242939, 
            L     : 313.23810451 + T * 428.48202785, 
            Lperi : 170.95427630 + T * 0.40805281,  
            Omega : 74.01692503  + T * 0.04240589
        },
        neptune : 
        {
            a     : (30.06992276  + T * 0.00026291) * auMeters, 
            e     : 0.00859048   + T * 0.00005105,
            i     : 1.77004347   + T * 0.00035372, 
            L     : -55.12002969 + T * 218.45945325,  
            Lperi : 44.96476227  - T * 0.32241464, 
            Omega : 131.78422574 - T * 0.00508664
        }
    };

    for (let planetName in planets)
    {
        let planet = planets[planetName];
        planet.b = planet.a * Math.sqrt(1 - planet.e * planet.e);
        planet.omega = planet.Lperi - planet.Omega;
        planet.M = planet.L - planet.Lperi;
        planet.E = keplerSolve(planet.M, planet.e, 1e-6, 10);
        planet.mu = 1.32712440018e20;
    }

    return planets;
}