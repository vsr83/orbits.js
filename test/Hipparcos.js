import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import { hipparcosFind, properMotion, hipparcosGet } from '../src/Hipparcos.js';
import { timeJulianYmdhms } from '../src/Time.js';

describe('Hipparcos', function() {
    describe('hipparcosFind', function() {
        it('SingleMatch', function() {
            const resultsVega = hipparcosFind('Vega');
            assert.equal(resultsVega.length, 1);
            assert.equal(resultsVega[0], "3 Alpha Lyrae (Vega)");
        });
    });

    describe('properMotion', function() {
        it ('Alpha Centauri', function() {
            // Alpha Centauri (Proksima Kentavra)
            const starData = {
                "id":71681,
                "RA":219.91412833,
                "DE":-60.83947139,
                "Plx":742.12,
                "RA_delta":-3600.35,
                "DE_delta":952.11,
                "mag":1.2429,
                "distPar":1.35,
                "constellation":"CEN",
                "radVel":-18.6
            };

            // 2020 GAIA vs ESA reference implementation
            // http://cdsarc.u-strasbg.fr/ftp/cats/aliases/H/Hipparcos/version_cd/src/pos_prop.c
            // RA      219.85510906931927  219.8551090709
            // DE      -60.83185171038954   60.8318517103
            // Plx     742.4212155860748   742.4212204729
            // pmra  -3602.41482765023   -3602.4147299442
            // pmde    956.1237813365689   956.1237958262

            // id: 71681,
            // RA: 219.85510907092015,
            // DE: -60.8318517102732,
            // Plx: 742.4212204728574,
            // RA_delta: -3602.414729944163,
            // DE_delta: 956.1237958262054,
            // mag: 1.2429,
            // constellation: 'CEN',
            // radVel: -18.58764420704424

            //console.log(starData);
            // console.log(properMotion(starData, 2458849.50000 + 0.5));
            //console.log(hipparcosGet("Alpha Centauri (Proksima Kentavra)", 2458849.50000));
            const starData2020 = properMotion(starData, 2458849.50000 + 0.5);
            // C Reference implementation:
            checkFloat(starData2020.RA, 219.8551090709, 1e-10);
            checkFloat(starData2020.DE, -60.8318517103, 1e-10);
            checkFloat(starData2020.Plx, 742.4212204729, 1e-10);
            checkFloat(starData2020.RA_delta, -3602.4147299442, 1e-10);
            checkFloat(starData2020.DE_delta, 956.1237958262, 1e-10);
            // GAIA: 
            checkFloat(starData2020.RA, 219.85510906931927, 1e-8);
            checkFloat(starData2020.DE, -60.83185171038954, 1e-8);
            checkFloat(starData2020.Plx, 742.4212155860748, 1e-5);
            checkFloat(starData2020.RA_delta, -3602.41482765023, 1e-4);
            checkFloat(starData2020.DE_delta, 956.1237813365689, 1e-4);
        });
    });

    describe('hipparcosGet', function() {
        it('SingleMatch', function() {
            const vega = hipparcosGet("3 Alpha Lyrae (Vega)");
            const RAexp = 279.2347344323626;
            const DEexp = 38.783688589075688;

            checkFloat(vega.RA, RAexp, 1e-5);
            checkFloat(vega.DE, DEexp, 1e-5);
            checkFloat(vega.mag, 0.086800, 1e-20);
        });

        it('SingleMatch', function() {
            const vega = hipparcosGet("3 Alpha Lyrae (Vega)");
            const RAexp = 279.2347344323626;
            const DEexp = 38.783688589075688;

            checkFloat(vega.RA, RAexp, 1e-5);
            checkFloat(vega.DE, DEexp, 1e-5);
            checkFloat(vega.mag, 0.086800, 1e-20);
        });

        it('ProperMotion', function() {
            // HIP 91262 
            // GAIA retrieval https://gea.esac.esa.int/archive/.
            //SELECT ARRAY_ELEMENT(
            //    (EPOCH_PROP(ra,de,plx,pmra,pmde,0,1991.25,2020))
            //    ,1) AS RA
            //FROM public.hipparcos
            //WHERE hip=91262
            //SELECT ARRAY_ELEMENT(
            //    (EPOCH_PROP(ra,de,plx,pmra,pmde,0,1991.25,2020))
            //    ,2) AS DE
            //FROM public.hipparcos
            //WHERE hip=91262

            const RA1980Exp = 279.2333024696844; 
            const RA2000Exp = 279.2347351065055; 
            const RA2020Exp = 279.2361667535478; 
            const DE1980Exp = 38.782094794759736;
            const DE2000Exp = 38.78369179580521;
            const DE2020Exp = 38.78528877935731;

            const JT_1980 = timeJulianYmdhms(1980, 1, 1, 0, 0, 0);
            const JT_2000 = timeJulianYmdhms(2000, 1, 1, 0, 0, 0);
            const JT_2020 = timeJulianYmdhms(2020, 1, 1, 0, 0, 0);
            const vega_1980 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_1980.JT);
            const vega_2000 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_2000.JT);
            const vega_2020 = hipparcosGet("3 Alpha Lyrae (Vega)", JT_2020.JT);

            checkFloat(vega_1980.RA, RA1980Exp, 1.0/(3600.0 * 500));
            checkFloat(vega_2000.RA, RA2000Exp, 1.0/(3600.0 * 500));
            checkFloat(vega_2020.RA, RA2020Exp, 1.0/(3600.0 * 500));
        });

    });
});
