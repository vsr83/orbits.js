import hipparcosData from '../data/hipparcos_reduced.json'  assert {type: "json"};
import { dateJulianYmd } from './Time.js';
import { sind, cosd, linComb, deg2Rad, rad2Deg, dot, cross } from './MathUtils.js';

/**
 * Find objects from the reduced Hipparcos catalog.
 * 
 * @param {*} searchKey 
 *      Key used in matching the Hipparcos designation.
 * @returns List of matching stars. 
 */
export function hipparcosFind(searchKey)
{
    const results = [];

    Object.keys(hipparcosData).forEach(function(starName){
        if (starName.includes(searchKey))
        {
            //console.log(starName);
            results.push(starName);
        }
    });

    return results;
}

/**
 * Get Hipparcos position and magnitude data.
 * 
 * @param {*} designation 
 *      Designation of the object.
 * @param {*} JT
 *      Julian time.
 * @returns JSON object with fields RA, DE and mag.
 */
export function hipparcosGet(designation, JT)
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

    const starData = properMotion(hipparcosData[designation], JT);

    return {RA : starData.RA, DE : starData.DE, mag : starData.mag};
}

const hipparcosIndToName = [];
for (const [key, value] of Object.entries(hipparcosData))
{
    hipparcosIndToName[value.id] = key; 
}

/**
 * Propagate Hipparcos data from the J1991.25 epoch. This also accounts for 
 * the proper motion of the star.
 * 
 * @param {*} starDataJ1991
 *      Object representing Hipparcos data for a star with J1991.25 epoch. 
 * @param {*} JT 
 *      The new epoch for star data.
 * @returns Hipparcos star data propagated into a new epoch.
 */
export function properMotion(starDataJ1991, JT)
{
    // The implementation follows sections 1.2.8, 1.5.4 and 1.5.5 of
    // [1] The Hipparcos and Tycho Catalogues - Volume I - Introduction and Guide 
    // to the Data, ESA 1997
    // available from https://www.cosmos.esa.int/documents/532822/552851/vol1_all.pdf
    // See also:
    // https://gea.esac.esa.int/archive/documentation/GDR2/Data_processing/chap_cu3ast/sec_cu3ast_intro/ssec_cu3ast_intro_tansforms.html
    // and the reference implementation at:
    // http://cdsarc.u-strasbg.fr/ftp/cats/aliases/H/Hipparcos/version_cd/src/pos_prop.c

    // Equation 1.2.3 in [1] - Definition of the J1991.25 Epoch. The date is TT
    // but in discussion of proper motion conversion between time standards is 
    // not necessary since the movements per year are in the order of mas.
    const JDref = 2448349.0625;

    // Years after J1991.25 Epoch.
    const tau = (JT - JDref) / 365.25;

    // Right-ascension
    const alpha0 = deg2Rad(starDataJ1991.RA);
    const delta0 = deg2Rad(starDataJ1991.DE);
    // Trigonometric parallax at t0 [mas -> rad].
    const par0 = deg2Rad(starDataJ1991.Plx / (3600.0 * 1000.0));
    // Proper motion in R.A., multiplied by cos(Dec), at t0 [mas/yr -> deg/yr].
    const pma0 = deg2Rad(starDataJ1991.RA_delta / (3600.0 * 1000.0));
    // Proper motion in Dec at t0 [mas/yr -> deg/yr].
    const pmd0 = deg2Rad(starDataJ1991.DE_delta / (3600.0 * 1000.0));
    // Normalized radial velocity at t0 [km/s -> mas/yr].
    const rad0 = starDataJ1991.radVel * starDataJ1991.Plx / 4.740470446
    const zeta0 = deg2Rad(rad0 / (3600.0 * 1000.0)); 

    /*console.log("tau    " + tau);
    console.log("alpha0 " + alpha0);
    console.log("delta0 " + delta0);
    console.log("par0   " + par0);
    console.log("pma0   " + pma0);
    console.log("pmd0   " + pmd0);
    console.log("zeta0  " + zeta0);
    console.log("rad0   " + rad0);*/

    // Orthogonal unit vectors (see Figure 1.2.3 in [1]):
    const p0 = [-Math.sin(alpha0), Math.cos(alpha0), 0];
    const q0 = [-Math.sin(delta0) * Math.cos(alpha0), 
                -Math.sin(delta0) * Math.sin(alpha0), 
                 Math.cos(delta0)];
    const r0 = [Math.cos(delta0) * Math.cos(alpha0),
                Math.cos(delta0) * Math.sin(alpha0),
                Math.sin(delta0)];

    // Proper motion vector 
    const pmv0 = linComb([pma0, pmd0], [p0, q0]);
    
    // Auxiliary quantities
    const tau2 = tau*tau;
    const pm02 = pma0*pma0 + pmd0*pmd0;
    const w = 1.0 + zeta0 * tau;
    const f2 = 1.0 / (1.0 + 2.0 * zeta0 * tau + (pm02 + zeta0*zeta0) * tau2);
    const f = Math.sqrt(f2);
    const f3 = f2 * f;
    const f4 = f2 * f2;

    // The position vector at t
    const r = linComb([w*f, tau*f], [r0, pmv0]);
    // Trigonometric parallax at t
    let par = par0 * f;
    // Proper motion vector.
    const pmv = linComb([w*f3, -pm02*tau*f3], [pmv0, r0]);
    // Normalized radial velocity.
    const zeta = (zeta0 + (pm02 + zeta0*zeta0) * tau) * f2;

    const xy = Math.sqrt(r[0]*r[0] + r[1]*r[1]);
    const eps = 1.0e-9;

    // New transverse unit vectors.
    let p = [0, 1, 0];
    if (xy >= eps)
    {
        p = [-r[1]/xy, r[0]/xy, 0];
    }
    const q = cross(r, p);

    let alpha = Math.atan2(-p[0], p[1]);
    if (alpha < 0.0) 
    {
        alpha += 2.0 * Math.PI;
    }
    let delta = Math.atan2(r[2], xy);

    // Compute transverse components of proper motion.
    let pma = dot(p, pmv);
    let pmd = dot(q, pmv);

    // Convert to Hipparcos units:
    alpha = rad2Deg(alpha);
    delta = rad2Deg(delta);
    par = rad2Deg(par) * (3600.0 * 1000.0);
    pma = rad2Deg(pma) * (3600.0 * 1000.0);
    pmd = rad2Deg(pmd) * (3600.0 * 1000.0);

    const rad = rad2Deg(zeta) * (3600.0 * 1000.0); 
    const radVel = rad * 4.740470446 / par;

    return {
        id : starDataJ1991.id, 
        RA : alpha, 
        DE : delta, 
        Plx : par,
        RA_delta : pma,
        DE_delta : pmd, 
        mag : starDataJ1991.mag, 
        constellation : starDataJ1991.constellation,
        radVel : radVel
    };
}

export {hipparcosData, hipparcosIndToName};