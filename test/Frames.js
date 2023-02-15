import {coordEclEq, coordEqEcl, coordJ2000Mod, coordModJ2000, coordModTod, coordTodMod,
    coordTodPef, coordPefTod, coordPefEfi, coordEfiPef, coordEfiWgs84, coordWgs84Efi, 
    coordEfiEnu, coordEnuEfi, coordEnuAzEl, coordAzElEnu, coordPerIne, coordInePer } from '../src/Frames.js';
import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import { norm } from '../src/MathUtils.js';

describe('Frames', function() {
    describe('coordEclEq, coordEqEcl', function() {
        it('Venus', function() {
            const osvEcl = {
                r : [ 7.653966861471243e+10,
                     -7.269230239742627e+10,
                      3.069790583074071e+09],
                v : [ 2.472162821491882e+04,
                      6.277680984101855e+03,
                     -1.813571001229737e+03],
                JT : 2459662.467361111
            };
            const osvJ2000Exp = 
            {
                r : [ 76539668614.71243,
                     -67916298380.10200,
                     -26095418302.98473],
                v : [2.472162821491882e+04,
                     6.481099018198909e+03,
                     8.328708368988578e+02],
                JT : 2459662.467361111
            };

            const osvJ2000 = coordEclEq(osvEcl);
            checkFloatArray(osvJ2000.r, osvJ2000Exp.r, 1);
            checkFloatArray(osvJ2000.v, osvJ2000Exp.v, 1e-4);
            checkFloat(osvJ2000.JT, osvJ2000Exp.JT, 1e-6);
        });
    });

    describe('coordJ2000Mod, coordModJ2000', function() {
        it('SOFA - iauPmat76', function() {
            const osvU1 = {r : [1, 0, 0], v : [1, 0, 0], JT : 2458849.5000000};
            const osvU2 = {r : [0, 1, 0], v : [0, 1, 0], JT : 2458849.5000000};
            const osvU3 = {r : [0, 0, 1], v : [0, 0, 1], JT : 2458849.5000000};

            const modU1 = coordJ2000Mod(osvU1);
            const modU2 = coordJ2000Mod(osvU2);
            const modU3 = coordJ2000Mod(osvU3);

            console.log(modU1.r[0] + " " + modU2.r[0] + " " + modU3.r[0]);
            console.log(modU1.r[1] + " " + modU2.r[1] + " " + modU3.r[1]);
            console.log(modU1.r[2] + " " + modU2.r[2] + " " + modU3.r[2]);

            checkFloatArray(modU1.r, [0.999988111199653, 0.004472291295033, 0.001943211239994], 1e-12);
            checkFloatArray(modU2.r, [-0.004472291295323, 0.999989999245837, -0.000004345179820], 1e-12);
            checkFloatArray(modU3.r, [-0.001943211239326, -0.000004345478552, 0.999998111953816], 1e-12);
        });

        it('Venus', function() {
            const osvJ2000 = {
                r : [ 76539668614.71243,
                    -67916298380.10200,
                    -26095418302.98473],
                v : [2.472162821491882e+04,
                    6.481099018198909e+03,
                    8.328708368988578e+02],
                JT : 2459662.467361111
            };
            const osvModExp = {
                r : [76932446023.74319,
                    -67534911860.58974,
                    -25929707721.04863
                  ],
                v : [2.468725514893796e+04,
                    6.603882768282808e+03,
                    8.862197838793985e+02],
                JT : 2459662.467361111
            };

            const osvMod = coordJ2000Mod(osvJ2000);
            checkFloatArray(osvMod.r, osvModExp.r, 1);
            checkFloatArray(osvMod.v, osvModExp.v, 1e-4);
            checkFloat(osvMod.JT, osvModExp.JT, 1e-6);

            const osvJ20002 = coordModJ2000(osvMod);
            checkFloatArray(osvJ20002.r, osvJ2000.r, 1);
            checkFloatArray(osvJ20002.v, osvJ2000.v, 1e-4);
            checkFloat(osvJ20002.JT, osvJ2000.JT, 1e-6);
        });
    });

    describe('coordModTod, coordTodMod', function() {
        it('SOFA - iauNutM80', function() {
            const osvU1 = {r : [1, 0, 0], v : [1, 0, 0], JT : 2458849.5000000};
            const osvU2 = {r : [0, 1, 0], v : [0, 1, 0], JT : 2458849.5000000};
            const osvU3 = {r : [0, 0, 1], v : [0, 0, 1], JT : 2458849.5000000};

            const modU1 = coordModTod(osvU1);
            const modU2 = coordModTod(osvU2);
            const modU3 = coordModTod(osvU3);

            console.log(modU1.r[0] + " " + modU2.r[0] + " " + modU3.r[0]);
            console.log(modU1.r[1] + " " + modU2.r[1] + " " + modU3.r[1]);
            console.log(modU1.r[2] + " " + modU2.r[2] + " " + modU3.r[2]);

            checkFloatArray(modU1.r, [0.999999996805767, -0.000073334097653, -0.000031789547170], 1e-14);
            checkFloatArray(modU2.r, [0.000073333834523, 0.999999997276809, -0.000008278356584], 1e-14);
            checkFloatArray(modU3.r, [0.000031790154169, 0.000008276025308, 0.999999999460447], 1e-14);
        });

        it('Venus', function() {
            const osvMod = {
                r : [76932446023.74319,
                    -67534911860.58974,
                    -25929707721.04863
                  ],
                v : [2.468725514893796e+04,
                    6.603882768282808e+03,
                    8.862197838793985e+02],
                JT : 2459662.467361111
            };
            const osvTodExp = {
                r : [ 76927508947.49406,
                     -67539009327.52528,
                     -25933682729.27057],
                v : [2.468769303715834e+04,
                     6.602310869956531e+03,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };

            const osvTod = coordModTod(osvMod);
            checkFloatArray(osvTod.r, osvTodExp.r, 1);
            checkFloatArray(osvTod.v, osvTodExp.v, 1e-4);
            checkFloat(osvTod.JT, osvTodExp.JT, 1e-6);

            const osvMod2 = coordTodMod(osvTod);
            checkFloatArray(osvMod2.r, osvMod.r, 1);
            checkFloatArray(osvMod2.v, osvMod.v, 1e-4);
            checkFloat(osvMod2.JT, osvMod.JT, 1e-6);
        });
    });

    describe('coordTodPef, coordPefTod', function() {
        it('Venus', function() {
            const osvTod = {
                r : [ 76927508947.49406,
                     -67539009327.52528,
                     -25933682729.27057],
                v : [2.468769303715834e+04,
                     6.602310869956531e+03,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };
            const osvPefExp = {
                r : [-87793943599.69176,
                      52645824915.41444,
                     -25933682729.27057
                  ],
                v : [3.815891418527184e+06,
                     6.391112794089540e+06,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };

            /*
            const osvPef = coordTodPef(osvTod);
            checkFloatArray(osvPef.r, osvPefExp.r, 1);
            checkFloatArray(osvPef.v, osvPefExp.v, 1e-4);
            checkFloat(osvPef.JT, osvPefExp.JT, 1e-6);

            const osvTod2 = coordPefTod(osvPef);
            checkFloatArray(osvTod2.r, osvTod.r, 1);
            checkFloatArray(osvTod2.v, osvTod.v, 1e-4);
            checkFloat(osvTod2.JT, osvTod.JT, 1e-6);
            */
        });
    });

    describe('coordPefEfi, coordEfiPef', function() {
        it('Venus', function() {
            const osvPef = {
                r : [-87793943599.69176,
                      52645824915.41444,
                     -25933682729.27057
                  ],
                v : [3.815891418527184e+06,
                     6.391112794089540e+06,
                     8.857333632777005e+02],
                JT : 2459662.467361111
            };
            const osvEfiExp = {
                r : [-87838751662.35324,
                      52736029625.35403,
                     -25596488029.92342],
                v : [3.815926089266752e+06,
                    6.391070765456880e+06,
                    1.653485602488094e+04],
                JT : 2459662.467361111
            };

            const osvEfi = coordPefEfi(osvPef, 0.1, 0.2);
            checkFloatArray(osvEfi.r, osvEfiExp.r, 1);
            checkFloatArray(osvEfi.v, osvEfiExp.v, 1e-4);
            checkFloat(osvEfi.JT, osvEfiExp.JT, 1e-6);

            const osvPef2 = coordEfiPef(osvEfi, 0.1, 0.2);
            checkFloatArray(osvPef2.r, osvPef.r, 1);
            checkFloatArray(osvPef2.v, osvPef.v, 1e-4);
            checkFloat(osvPef2.JT, osvPef.JT, 1e-6);
        });
    });

    describe('coordEfiWgs84, coordWgs84Efi', function() {
        it('Venus', function() {
            const rEfi = [-87838751662.35324,
                           52736029625.35403,
                          -25596488029.92342];
            const latExp = -14.02735035654504;
            const lonExp = 149.0205247603176;
            const hExp = 105596252409.9468;

            const {lat, lon, h} = coordEfiWgs84(rEfi, 10, 1e-16, false);
            checkFloat(lat, latExp, 1e-6);
            checkFloat(lon, lonExp, 1e-6);
            checkFloat(h, hExp, 100);

            const rEfi2 = coordWgs84Efi(lat, lon, h);
            checkFloatArray(rEfi2, rEfi, 1);
        });
    });

    describe('coordEfiEnu, coordEnuEfi', function() {
        it('Venus', function() {
            const osvEfi = {
                r : [-87838751662.35324,
                      52736029625.35403,
                     -25596488029.92342],
                v : [3.815926089266752e+06,
                    6.391070765456880e+06,
                    1.653485602488094e+04],
                JT : 2459662.467361111
            };
            const lat = 60.205490;
            const lon = 24.0206;
            const h = 105596252409.9468;

            const osvEnuExp = {
                r : [ 83925132910.53931,
                      38278260514.84691,
                     -51419041065.68192],
                v : [ 4284268.453380695,
                     -5274201.499041729,
                      3038946.069965863],
                JT : 2459662.467361111
            };

            const osvEnu = coordEfiEnu(osvEfi, lat, lon, 0);
            checkFloatArray(osvEnu.r, osvEnuExp.r, 1);
            checkFloatArray(osvEnu.v, osvEnuExp.v, 1e-4);
            checkFloat(osvEnu.JT, osvEnuExp.JT, 1e-6);

            const osvEfi2 = coordEnuEfi(osvEnu, lat, lon, 0);
            checkFloatArray(osvEfi2.r, osvEfi.r, 1);
            checkFloatArray(osvEfi2.v, osvEfi.v, 1e-4);
            checkFloat(osvEfi2.JT, osvEfi.JT, 1e-6);
        });
    });

    describe('coordEnuAzEl, coordAzElEnu', function() {
        it('Venus', function() {
            const osvEnu = {
                r : [ 83925132910.53931,
                      38278260514.84691,
                     -51419041065.68192],
                v : [ 4284268.453380695,
                     -5274201.499041729,
                      3038946.069965863],
                JT : 2459662.467361111
            };
            const azExp = 65.48226691416835;
            const elExp = -29.13678780543464;

            const osv = coordEnuAzEl(osvEnu);
            checkFloat(osv.az, azExp, 1e-6);
            checkFloat(osv.el, elExp, 1e-6);
            checkFloat(osv.dist, norm(osvEnu.r), 1);
            checkFloat(osv.JT, osvEnu.JT, 1e-6);

            const osvEnu2 = coordAzElEnu(osv);
            checkFloatArray(osvEnu2.r, osvEnu.r, 1);
            checkFloat(osvEnu2.JT, osvEnu.JT, 1e-6);
        });
    });

    describe('coordPerIne, coordInePer', function() {
        it('Venus', function() {
            const osvPer = {
                r : [2.593281124802490e+10,
                     1.468514157356373e+11,
                                         0],
                v : [-2.933489929039629e+04,
                      5.677830279125575e+03,
                                          0],
                JT : 2459662.467361111
            };

            const Omega = 347.6140484010017;
            const incl = 359.9971073661852;
            const omega = -244.6045207975887;
            
            const osvIneExp = {
                r : [-1.489199431961666e+11,
                     -7.790989491059203e+09,
                      1.996839980819461e+06],
                v : [1.071574068660730e+03,
                    -2.986010381659133e+04,
                     1.460825013954209e+00],
                JT : 2459662.467361111
            };

            const osvIne = coordPerIne(osvPer, Omega, incl, omega);
            checkFloatArray(osvIne.r, osvIneExp.r, 1);
            checkFloatArray(osvIne.v, osvIneExp.v, 1e-4);
            checkFloat(osvIne.JT, osvIneExp.JT, 1e-6);

            const osvPer2 = coordInePer(osvIne, Omega, incl, omega);
            checkFloatArray(osvPer2.r, osvPer.r, 1);
            checkFloatArray(osvPer2.v, osvPer.v, 1e-4);
            checkFloat(osvPer2.JT, osvPer.JT, 1e-6);
        });
    });
});
