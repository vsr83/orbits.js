import {keplerSolve, keplerPerifocal, keplerPlanets, keplerOsculating, keplerPropagate} from "../src/Kepler.js";
import { timeJulianYmdhms } from "../src/Time.js";
import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import { limitAngleDeg } from "../src/Angles.js";
import { coordPerIne } from "../src/Frames.js";
import { asind, atan2d, norm } from "../src/MathUtils.js";

describe('Kepler', function() {
    describe('keplerPlanets', function() {
        it('Values', function() {
            const planets = keplerPlanets(0);
            const earth = keplerPlanets.earth;

            //keplerPerifocal(earth.a, earth.b, earth.E, 1, 1);
        });
    });

    describe('keplerSolve', function() {
        it('Values', function() {
            keplerSolve(100, 0.1, 1e-9, 10);
        });
    });

    describe('keplerPropagate', function() {
        it('Jupiter', function() {
            const M0 = -19.121440704840762;
            const a = 7.791675475674921e+11;
            const ecc_norm = 0.049355487491014;
            const mu = 1.327124400180000e+20;

            let {M, E} = keplerPropagate(100, M0, a, ecc_norm, mu);
            checkFloat(M, -10.829696265596557, 1e-6);
            checkFloat(E, 3.486119336056595e+02, 1e-6); 
        });
    });

    describe('keplerPerifocal', function() {
        it('Jupiter', function() {
            const a = 7.791675475674921e+11;
            const b = 7.782179568180367e+11;
            const E = -20.092935136837660;
            const mu = 1.327124400180000e+20;
            const JT = 2.459729500000000e+06;

            let {r, v} = keplerPerifocal(a, b, E, mu, JT);
            checkFloatArray(r, [6.932885828550206e11, -2.673520294767202e11, 0], 1);
            checkFloatArray(v, [0.470147701795366e4, 1.283663661361050e4, 0], 1e-7);
        });
    });

    describe('keplerOsculating', function() {
        it('Jupiter', function() {
            // Standard gravitational parameter for the Sun.
            const mu = 1.32712440018e20;
            const r = [7.364141603506416e11, -0.977860704076983e11, -0.160697122476993e11];
            const v = [0.156712533025024e4, 1.358009117984457e4, -0.009147374829921e4];

            const kepler = keplerOsculating(r, v, mu);
            checkFloat(kepler.a, 7.791675475674921e+11, 1);
            checkFloat(kepler.b, 7.782179568180367e+11, 1);
            checkFloat(kepler.mu, mu, 1e9);
            checkFloat(kepler.ecc_norm, 0.049355487491014, 1e-6);
            checkFloat(kepler.incl, 1.303571611846412, 1e-10);
            checkFloat(kepler.Omega, 1.005183550488739e+02, 1e-6);
            checkFloat(kepler.omega, -86.989778432121909, 1e-6);
            checkFloat(kepler.E, -20.092935136837660, 1e-6);
            checkFloat(kepler.M, -19.121440704840762, 1e-6);
            checkFloat(kepler.f,-21.088074675151098, 1e-6);
        });
    });


    describe('Integration test', function() {
        describe('Ecliptic coordinates', function() {
            const JTs = [
                timeJulianYmdhms(2022, 1, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 2, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 3, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 4, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 5, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 6, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 7, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 8, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 9, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 10, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 11, 1, 0, 0, 0),
                timeJulianYmdhms(2022, 12, 1, 0, 0, 0),
                timeJulianYmdhms(2023, 1, 1, 0, 0, 0),
            ];

            let eclLonExp = {};
            let eclLatExp = {};

            // JPL Horizons has the issue that there is a delay associated to limited speed of light
            // from the planet to the observer and one has to fix the observer to some other body. 
            // For Mercury, the object is the Sun, which limits accuracy.
            eclLonExp.mercury = [353.517981, 166.600082, 257.435814, 3.078041, 171.079718, 268.550029,
                                 18.487901, 187.275246, 279.918520, 41.099529, 201.718043, 288.776298,
                                 65.679867];
            eclLatExp.mercury = [-5.7313, 6.1736, -3.4226, -4.9839, 5.8971, -4.5381,
                                -3.4952, 4.6103, -5.5005, -0.8824, 3.1467, -6.1014,
                                2.1014];
            eclLonExp.venus = [95.4130, 145.7195, 191.1252, 240.8421, 288.4039, 337.4525,
                            25.1782,  74.8979, 125.0697, 173.7997, 223.7525, 271.4698,
                            320.4988];
            eclLatExp.venus = [1.0946,  3.1715, 3.0892, 0.9239, -1.7895, -3.3512,
                            -2.6555, -0.1020, 2.5417, 3.3678,  1.8435, -0.8711,
                            -3.0485];
            // Observed from the Moon.
            eclLonExp.earth = [100.2321, 131.7889, 160.0713, 190.944277, 220.3139, 250.2070,
                               278.8679, 308.4498, 338.2506,   7.4939,  38.2307,  68.4438,
                                99.9696];
            eclLatExp.earth = [-0.0027, -0.0019, -0.0007,  0.0009,  0.0021,  0.0028, 
                                0.0028,  0.0021,  0.0008, -0.0007, -0.0021, -0.0029,
                                -0.0029];
            eclLonExp.mars = [235.6622, 251.9850, 267.5016, 285.5425, 303.7719, 323.1862,
                              342.2196,   1.7621,  20.8201,  38.5530,  56.0081,  72.0375,
                               87.7695];
            eclLatExp.mars = [-0.1987, -0.7072, -1.1382, -1.5331, -1.7789, -1.8441,
                              -1.7045, -1.3676, -0.8868, -0.3507, 0.2099, 0.7088,
                               1.1451];
            // Observed from the Europa Moon.
            eclLonExp.jupiter = [338.9305, 341.7283, 344.2612, 347.0716, 349.7970, 352.6183,
                                 355.3532, 358.1832,   1.0169,   3.762,   6.6006,   9.3493,
                                  12.1907];
            eclLatExp.jupiter = [-1.1105, -1.1425, -1.1691, -1.1960, -1.2193, -1.2405,
                                 -1.2582, -1.2735, -1.2857, -1.2945, -1.3005, -1.3033,
                                 -1.3030];
            // From Titan.
            eclLonExp.saturn = [314.5648, 315.5247, 316.3928, 317.3551, 318.2877, 319.2527,
                                320.1880, 321.1557, 322.1249, 323.0642, 324.0363, 324.9784,
                                325.9534];
            eclLatExp.saturn = [-0.8902, -0.9290, -0.9638, -1.0022, -1.0391, -1.0770,
                                -1.1135, -1.1509, -1.1880, -1.2237, -1.2602, -1.2953,
                                -1.3312];
            eclLonExp.uranus = [43.1120, 43.4564, 43.7676, 44.1123, 44.4461, 44.78912,
                                45.1253, 45.4707, 45.8164, 46.1510, 46.4970, 46.8320, 
                                47.1783];
            eclLatExp.uranus = [-0.3966, -0.3926, -0.3890, -0.3850, -0.3811, -0.3771,
                                -0.3731, -0.3691, -0.3650, -0.3610, -0.3569, -0.3529,
                                -0.3487];
            eclLonExp.neptune = [352.1394, 352.3272, 352.4969, 352.6848, 352.8666, 353.0545,
                                353.2364, 353.4243, 353.6122, 353.7941, 353.9820, 354.1639,
                                354.3518];
            eclLatExp.neptune = [-1.1466, -1.1510, -1.1550, -1.1594, -1.1636, -1.1680,
                                -1.1722, -1.1765, -1.1808, -1.1850, -1.1893, -1.1935,
                                -1.1977];
            const tolerances = {
                mercury : {lon : 30/3600, lat : 16/3600},
                venus   : {lon : 1/60,  lat : 4/3600},
                earth   : {lon : 25/3600,  lat : 1.5/3600},
                mars    : {lon : 44/3600,  lat : 0.6/3600},
                jupiter : {lon : 400/3600, lat : 2/3600},
                saturn  : {lon : 600/3600,  lat : 10/3600},
                uranus  : {lon : 120/3600,  lat : 2/3600},
                neptune : {lon : 1/60,  lat : 2/3600},
            }

            for (let planetName in eclLonExp)
            {
                it(planetName, function() {
                    for (let indTs = 0; indTs < JTs.length; indTs++)
                    {
                        const JT = JTs[indTs].JT;
                        const planets = keplerPlanets(JT);

                        const planet = planets[planetName];

                        const osvPer = keplerPerifocal(planet.a, planet.b, planet.E, planet.mu, JT);
                        const osvIne = coordPerIne(osvPer, planet.Omega, planet.i, planet.omega);
        
                        const r = osvIne.r;
                        const eclLon = limitAngleDeg(atan2d(r[1], r[0]));
                        const eclLat = asind(r[2] / norm(r));
        
                        checkFloat(eclLon, eclLonExp[planetName][indTs], tolerances[planetName].lon);
                        checkFloat(eclLat, eclLatExp[planetName][indTs], tolerances[planetName].lat);
                    }
                });
            }
        });
    });
});
