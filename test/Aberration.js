import { aberrationStellarCart } from '../src/Aberration.js';
import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';

describe('Aberration', function() {
    describe('aberrationStellarCart', function() {
        it('Vega', function() {
            let rJ2000 = [1.250964636332911e24,
            -7.694131278689816e24,
            6.263819229905307e24]; 
            const vObsJ2000 = [0.290007812179439e2,
                            -2.298670535956016e2,
                            -0.000564533814336e2];
            const rJ2000Exp = [ 1.250891664149846e24,
                            -7.694700506965913e24,
                                6.263134530940476e24];
            const JT = 2.459659458332178e+06;
            rJ2000 = aberrationStellarCart(JT, rJ2000, vObsJ2000);
            checkFloatArray(rJ2000, rJ2000Exp, 1e10);

            rJ2000 = aberrationStellarCart(JT, rJ2000);
            checkFloatArray(rJ2000, rJ2000Exp, 1e21);
        });
    });
});
