import { checkFloat, checkFloatArray} from './common.js';
import { plutoPositionEclHel } from '../src/Pluto.js';

describe('Pluto', function() {
    describe('plutoPositionJ2000', function() {
        it('Values', function() {
            plutoPositionEclHel(2448908.5);
        });
    });
});
