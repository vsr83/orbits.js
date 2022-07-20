import hipparchusData from '../data/hipparchus_reduced.json'  assert {type: "json"};
import { dateJulianYmd } from './Time.js';
import { cosd } from './MathUtils.js';

/**
 * Find objects from the reduced Hipparchus catalog.
 * 
 * @param {*} searchKey 
 *      Key used in matching the Hipparchus designation.
 * @returns List of matching stars. 
 */
export function hipparchusFind(searchKey)
{
    const results = [];

    Object.keys(hipparchusData).forEach(function(starName){
        if (starName.includes(searchKey))
        {
            //console.log(starName);
            results.push(starName);
        }
    });

    return results;
}

/**
 * Get Hipparchus position and magnitude data.
 * 
 * @param {*} designation 
 *      Designation of the object.
 * @param {*} JT
 *      Julian time.
 * @returns JSON object with fields RA, DE and mag.
 */
export function hipparchusGet(designation, JT)
{
    // In case of missing JT, use the J2000.0 epoch.
    if (JT === undefined)
    {
        JT = dateJulianYmd(2000, 1, 1);        
    }

    // The star RA and DE coordinates are defined with respect to the J1991.25 epoch
    // and must be adjusted based on the proper motion of the star. It is unclear whether
    // the following method is correct.
    const epochJ1991_25 = 2448349.0625;
    // Julian days after the epoch.
    const deltaJT = JT - epochJ1991_25;

    const starData = hipparchusData[designation];
    // Get the data.
    const RA0 = starData.RA;
    const DE0 = starData.DE;
    // RA proper motion, cosd(DE) * mas / year.
    const RAdelta = starData.RA_delta;
    // DE proper motion, mas / year.
    const DEdelta = starData.DE_delta;
    const mag = starData.mag;

    // Average number of Julian days in a year.
    const JTyear = 365.25;
    const RA = RA0 + deltaJT * RAdelta / (JTyear * 3600.0 * 1000.0 * cosd(DE0));
    const DE = DE0 + deltaJT * DEdelta / (JTyear * 3600.0 * 1000.0);

    return {RA : RA, DE : DE, mag : mag};
}

const hipparchusIndToName = [];
for (const [key, value] of Object.entries(hipparchusData))
{
    hipparchusIndToName[value.id] = key; 
}

export {hipparchusData, hipparchusIndToName};