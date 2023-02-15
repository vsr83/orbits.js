import { checkFloat, checkFloatArray} from './common.js';
import {timeGast, timeGmst, timeJulianTs, timeJulianYmdhms, dateJulianYmd, timeGregorian } from '../src/Time.js';
import {createContours, eclipseMagDerGrid, besselianSolarWithDelta, besselianCentralLine, besselianSolar, solarEclipses, coordFundTod, besselianRiseSet, besselianLimits, eclipseMagnitude, eclipseMagGrid } from '../src/Eclipses.js';
import {AssertionError, strict as assert} from 'assert';

describe('Eclipses', function() {
    describe('solarEclipses', function() {
        it('List of known Solar Eclipses', function() {
            let toFixed = function(num)
            {
                if (num < 10) {
                    return "0" + num;
                }
                else 
                {
                    return num;
                }
            }
            let toFixedFloat = function(num, fixed)
            {
                let str = "";
                if (num >= 0) {
                    str = str + " ";
                }
                if (Math.abs(num) < 100)
                {
                    str = str + " ";
                }
                if (Math.abs(num) < 10)
                {
                    str = str + " ";
                }
                str = str + num.toFixed(fixed);
                return str;
            }

            const JT = timeJulianTs(new Date("2022-05-15T23:53:20Z")).JT;
            //console.log(JT);

            const expectedEclipses = [
                {type : "Total",   JTmax : timeJulianTs(new Date("2001-06-21T12:04:46Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2001-12-14T20:53:01Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2002-06-10T23:45:22Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2002-12-04T07:32:16Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2003-05-31T04:09:22Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2003-11-23T22:50:22Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2004-04-19T13:35:05Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2004-10-14T03:00:23Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2005-04-08T20:36:51Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2005-10-03T10:32:47Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2006-03-29T10:12:23Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2006-09-22T11:41:16Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2007-03-19T02:32:57Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2007-09-11T12:32:24Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2008-02-07T03:56:10Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2008-08-01T10:22:12Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2009-01-26T07:59:45Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2009-07-22T02:36:25Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2010-01-15T07:07:39Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2010-07-11T19:34:38Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-01-04T08:51:42Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-06-01T21:17:18Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-07-01T08:39:30Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2011-11-25T06:21:34Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2012-05-20T23:53:54Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2012-11-13T22:12:55Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2013-05-10T00:26:20Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2013-11-03T12:47:36Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2014-04-29T06:04:33Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2014-10-23T21:45:39Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2015-03-20T09:46:47Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2015-09-13T06:55:19Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2016-03-09T01:58:19Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2016-09-01T09:08:02Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2017-02-26T14:54:33Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2017-08-21T18:26:40Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-02-15T20:52:33Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-07-13T03:02:16Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2018-08-11T09:47:28Z")).JT},
                {type : "Partial", JTmax : timeJulianTs(new Date("2019-01-06T01:42:38Z")).JT},
                {type : "Total",   JTmax : timeJulianTs(new Date("2019-07-02T19:24:08Z")).JT},
                {type : "Annular", JTmax : timeJulianTs(new Date("2019-12-26T05:18:53Z")).JT}
            ];

            const listEclipses = solarEclipses(2001.1, 2019);
            
            for (let indEclipse = 0; indEclipse < listEclipses.length; indEclipse++)
            {
                const eclipse = listEclipses[indEclipse];
                //console.log(eclipse);
                const timeGreg = timeGregorian(eclipse.JTmax);
                console.log("Computed : " + timeGreg.year + "-" + toFixed(timeGreg.month) + "-" + toFixed(timeGreg.mday) + 
                "T" + toFixed(timeGreg.hour) + ":" + toFixed(timeGreg.minute)
                + ":" + toFixed(Math.floor(timeGreg.second)) + " " + eclipse.type);

                const eclipse2 = expectedEclipses[indEclipse];
                //console.log(eclipse);

                const timeErr = 86400 * Math.abs(eclipse.JTmax - eclipse2.JTmax);

                assert.equal(timeErr < 120.0, true);

                const timeGreg2 = timeGregorian(eclipse2.JTmax);
                console.log("Expected : " + timeGreg2.year + "-" + toFixed(timeGreg2.month) + "-" + toFixed(timeGreg2.mday) + 
                "T" + toFixed(timeGreg2.hour) + ":" + toFixed(timeGreg2.minute)
                + ":" + toFixed(Math.floor(timeGreg2.second)) + " " + eclipse2.type + " Error " + timeErr.toFixed(2) + " s");
            }            
        });
    });
});
