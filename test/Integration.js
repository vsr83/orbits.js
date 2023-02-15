import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import {timeStepping, integrateRk4, integrateRk8, osvToRhsPM, updateOsvPM, osvStatePM} from '../src/Integration.js';
import { vecSum, vecMul, norm, vecDiff } from '../src/MathUtils.js';
import { vsop87ABary, vsop87 } from '../src/Vsop87A.js';

describe('Integration', function() {
    describe('timeStepping', function() {
        it('Scalar', function() {
            let t = 0.0;
            let h = 1.0;
            let y = [1.0];

            for (let timeStep = 0; timeStep < 100; timeStep++)
            {
                let g = (t, y) => [-0.1 * y[0]];
                y = integrateRk4(y, h, t, g);
                //console.log(y.toString());
                t += h;
            }
            //console.log('Test');
        });
    });
    describe('Numerical Integration', function() {
        it('Planetary Orbits', function() {
            const osvList = [
                {
                    name : 'Sun',
                    m : 1.98847e30,
                    r : [-1.357492091321442E+09, 1.876969581620733E+08, 3.009272397084278E+07],
                    v : [-1.080283285965152E-00,-1.575090335755431E+01, 1.473373003882065E-01]
                },
                {
                    name : 'Mercury',
                    m : 3.3301e23,
                    r : [-9.704674561146416E+09, -6.886255271164888E+10, -4.847000212102775E+09],
                    v : [3.858893783387715E+04, -3.381634495904644E+03, -3.814639868134951E+03]
                },
                {
                    name : 'Venus',
                    m : 4.8673e24,
                    r : [-4.734315096511355E+10, 9.727993181805186E+10, 4.016470458974592E+09],
                    v : [-3.176979590989674E+04, -1.520117286212005E+04, 1.624808519116792E+03]
                },
                {
                    name : 'Earth',
                    m : 5.9722e24,
                    r : [1.327033003447463E+11, -6.973671264097586E+10, 3.290386209294572E+07],
                    v : [1.329056551879737E+04,  2.628355871104155E+04,-1.252009662415787E-00]
                },
                {
                    name : 'Mars',
                    m : 6.4169e23,
                    r : [2.002533766386017E+11, 6.253088819541759E+10, -3.608745034563061E+09],
                    v : [-6.231751604101030E+03, 2.520509850340859E+04, 6.815686090340929E+02]
                },
                {
                    name : 'Jupiter',
                    m : 1.89813e27,
                    r : [7.400373272229347E+11, 6.245049726401265E+09, -1.658245994137447E+10],
                    v : [-2.617940724274189E+02,  1.367742196347076E+04, -5.089299056358065E+01]
                },
                {
                    name : 'Saturn',
                    m : 5.6832e26,
                    r : [1.160551189465487E+12, -9.096481296170596E+11, -3.039021085251743E+10],
                    v : [5.418089146795277E+03, 7.583713152161345E+03, -3.476005962942472E+02]
                },
                {
                    name : 'Uranus',
                    m : 8.6811e25,
                    r : [2.053897755751045E+12,  2.109924822066306E+12, -1.877229127243829E+10],
                    v : [-4.929730712104451E+03, 4.432941605670011E+03, 8.032950534016181E+01]
                },
                {
                    name : 'Neptune',
                    m : 1.02409e26,
                    r : [4.444884578366961E+12, -5.003570212387115E+11, -9.213298410866863E+10],
                    v : [5.720204680141608E+02,  5.433403917784009E+03, -1.250730705439735E+02]
                },
            ];

            const g = osvToRhsPM(osvList);
            //const state = [-1.357492091321442E+09, 1.876969581620733E+08, 3.009272397084278E+07, 1.327033003447463E+11, -6.973671264097586E+10, 3.290386209294572E+07,
            //               -1.080283285965152E-00,-1.575090335755431E+01, 1.473373003882065E-01, 1.329056551879737E+04,  2.628355871104155E+04,-1.252009662415787E+00];
            const state = osvStatePM(osvList);
            updateOsvPM(osvList, state, 0);
            //console.log(osvList);

            const state2 = timeStepping(state, 3600, 0, 86400*365, g, integrateRk8);
            updateOsvPM(osvList, state2, 0);
            //console.log(osvList);

            let osvExpected = [
                {
                    name : 'Sun',
                    m : 1.989e30,
                    r : [-1.273917113620407E+09,-2.888888826377319E+08, 3.208239966999389E+07],
                    v : [6.151797081210703E-00, -1.402223256634532E+01, -2.409049524268285E-02]
                },
                {
                    name : 'Mercury',
                    m : 3.285e23,
                    r : [3.238735912709232E+10, -5.547468130260617E+10, -7.565297130306117E+09],
                    v : [3.186462486142250E+04,  2.775098945738187E+04, -6.532492199630759E+02]
                },
                {
                    name : 'Venus',
                    m : 4.867e24,
                    r : [1.008359441007218E+11, -3.745398841497005E+10, -6.370034480185138E+09],
                    v : [1.179411907794366E+04,  3.274222895580037E+04, -2.304009011745602E+02]
                },
                {
                    name : 'Earth',
                    m : 5.972e24,
                    r : [1.324896895487617E+11, -7.080093671066168E+10, 3.501370232814550E+07],
                    v : [1.341201291521681E+04,  2.622495168961413E+04,-1.522320181436498E-00]
                },
                {
                    name : 'Mars',
                    m : 6.39e23,
                    r : [-2.369436349909702E+11, -6.231298869428617E+10, 4.513081905836020E+09],
                    v : [7.076459859722124E+03, -2.137729254868981E+04, -6.211828220060012E+02]
                },
                {
                    name : 'Jupiter',
                    m : 1.898e27,
                    r : [6.151964536917659E+11, 4.136358018840177E+11, -1.547973404857859E+10],
                    v : [-7.435426899442708E+03, 1.145943094177528E+04, 1.188089509955779E+02]
                },
                {
                    name : 'Saturn',
                    m : 5.683e26,
                    r : [1.306230763155282E+12,-6.533220146648834E+11,-4.064761531019002E+10],
                    v : [3.781063879572041E+03, 8.620526316334590E+03, -3.004380168962819E+02]
                },
                {
                    name : 'Uranus',
                    m : 8.681e25,
                    r : [1.893241502741150E+12, 2.244127994725322E+12, -1.619254398310542E+10],
                    v : [-5.255089481368775E+03, 4.073951815810950E+03, 8.321019611470382E+01]
                },
                {
                    name : 'Neptune',
                    m : 1.024e26,
                    r : [4.459638989683614E+12, -3.286821477955707E+11, -9.600832535205008E+10],
                    v : [3.635575147752985E+02,  5.452809376482286E+03, -1.206687134329898E+02]
                }
            ];

            for (let indOsv = 0; indOsv < osvExpected.length; indOsv++)
            {
                let osv = osvList[indOsv];
                let osvExp = osvExpected[indOsv];

                let rError = norm(vecDiff(osv.r, osvExp.r)) / norm(osv.r);
                let vError = norm(vecDiff(osv.v, osvExp.v)) / norm(osv.v);

                
                //console.log(osv.name);
                //console.log(' r    : ' + osv.r);
                //console.log(' rExp : ' + osvExp.r + ' (error: ' + rError + ')');
                const rBary = vecMul(vsop87ABary(2460182.500000000 - 69/86400).r, -1);
                if (osv.name != 'Sun')
                {
                    let osvSun = osvExpected[0];
                    let {r, v} = vsop87(osv.name.toLowerCase(), 2460182.500000000 - 69/86400);

                    r = vecSum(r, rBary);
                    //console.log(' rVSOP: ' + r);
                }
                else 
                {
                    const r = vecMul(vsop87ABary(2460182.500000000 - 69/86400).r, -1);
                    //console.log(' rVSOP: ' + r);
                }
                //console.log(' v    : ' + osv.v);
                //console.log(' vExp : ' + osvExp.v + ' (error: ' + vError + ')');           
                

                checkFloatArray(osv.r, osvExp.r, norm(osv.r)/100.0);
            }
        });
    });
});
