import {AssertionError, strict as assert} from 'assert';
import { checkFloat, checkFloatArray} from './common.js';
import { dateJulianYmd } from '../src/Time.js';
import { correlationTaiUt1, correlationUt1Tai, correlationUt1Tdb, correlationTdbUt1 } from '../src/TimeCorrelation.js';

describe('TimeCorrelation', function() {
    describe('correlationUt1Tai', function() {
        it('conversions', function() {
            const JD1899Ut1 = dateJulianYmd(1899, 1, 1);
            const JD2000Ut1 = dateJulianYmd(2000, 1, 1);
            const JD2020Ut1 = dateJulianYmd(2020, 1, 1);
            const JD2040Ut1 = dateJulianYmd(2040, 1, 1);
            const JD1899Tai = correlationUt1Tai(JD1899Ut1);
            const JD2000Tai = correlationUt1Tai(JD2000Ut1);
            const JD2020Tai = correlationUt1Tai(JD2020Ut1);
            const JD2040Tai = correlationUt1Tai(JD2040Ut1);
            const JD1899Tdb = correlationUt1Tdb(JD1899Ut1);
            const JD2000Tdb = correlationUt1Tdb(JD2000Ut1);
            const JD2020Tdb = correlationUt1Tdb(JD2020Ut1);
            const JD2040Tdb = correlationUt1Tdb(JD2040Ut1);
            const JD1899Ut1_2 = correlationTaiUt1(JD1899Tai);
            const JD2000Ut1_2 = correlationTaiUt1(JD2000Tai);
            const JD2020Ut1_2 = correlationTaiUt1(JD2020Tai);
            const JD2040Ut1_2 = correlationTaiUt1(JD2040Tai);
            const JD1899Ut1_3 = correlationTdbUt1(JD1899Tdb);
            const JD2000Ut1_3 = correlationTdbUt1(JD2000Tdb);
            const JD2020Ut1_3 = correlationTdbUt1(JD2020Tdb);
            const JD2040Ut1_3 = correlationTdbUt1(JD2040Tdb);

            checkFloat(JD1899Tai - JD1899Ut1, 0.0001433/86400, 1e-8);
            checkFloat(JD2000Tai - JD2000Ut1, 31.6432070/86400, 1e-8);
            checkFloat(JD2020Tai - JD2020Ut1, 37.177333/86400, 1e-8);
            checkFloat(JD2040Tai - JD2040Ut1, 37.1098410/86400, 1e-8);
            checkFloat(JD1899Tdb - JD1899Ut1, (32.184 + 0.0001433)/86400, 1e-8);
            checkFloat(JD2000Tdb - JD2000Ut1, (32.184 + 31.6432070)/86400, 1e-8);
            checkFloat(JD2020Tdb - JD2020Ut1, (32.184 + 37.177333)/86400, 1e-8);
            checkFloat(JD2040Tdb - JD2040Ut1, (32.184 + 37.1098410)/86400, 1e-8);
            checkFloat(JD1899Ut1_2, JD1899Ut1, 1e-10);
            checkFloat(JD2000Ut1_2, JD2000Ut1, 1e-10);
            checkFloat(JD2020Ut1_2, JD2020Ut1, 1e-10);
            checkFloat(JD2040Ut1_2, JD2040Ut1, 1e-10);
            checkFloat(JD1899Ut1_3, JD1899Ut1, 1e-10);
            checkFloat(JD2000Ut1_3, JD2000Ut1, 1e-10);
            checkFloat(JD2020Ut1_3, JD2020Ut1, 1e-10);
            checkFloat(JD2040Ut1_3, JD2040Ut1, 1e-10);
        });
    });    
});
