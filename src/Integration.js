import { linComb, vecDiff, norm, vecMul, vecSum } from "./MathUtils.js";

// The gravitational constant.
const gravConst = 6.67430e-11;

/**
 * Integrate with fourth order explicit Runge-Kutta.
 * The method solves single time step of y'(t) = g(t, y), where y = y(t)
 * is vector-valued.
 * 
 * @param {*} y 
 *      State y(t).
 * @param {*} h 
 *      Time step size.
 * @param {*} t 
 *      Time t.
 * @param {*} g
 *      Method g(t, y) for the evaluation of the RHS.
 */
export function integrateRk4(y, h, t, g)
{
    const t2 = t + h / 2.0;
    const t3 = t + h / 2.0;
    const t4 = t + h;

    const k1 = g(t, y);
    const y2 = linComb([1, h/2.0], [y, k1]);
    const k2 = g(t2, y2);
    const y3 = linComb([1, h/2.0], [y, k2]);
    const k3 = g(t3, y3);
    const y4 = linComb([1, h], [y, k3]);
    const k4 = g(t3, y3);

    const yNext = linComb([1, h/6.0, 2*h/6.0, 2*h/6.0, h/6.0], [y, k1, k2, k3, k4]);
    return yNext;
}

/**
 * Integrate with eighth order explicit Runge-Kutta.
 * The method solves single time step of y'(t) = g(t, y), where y = y(t)
 * is vector-valued.
 * 
 * @param {*} y 
 *      State y(t).
 * @param {*} h 
 *      Time step size.
 * @param {*} t 
 *      Time t.
 * @param {*} g
 *      Method g(t, y) for the evaluation of the RHS.
 */
export function integrateRk8(y, h, t, g)
{
    // Goddard Trajectory Determination System (GTDS) - Mathematical Theory 
    // Revision 1, 1989 - Table 6-1. 

    const t2 = t + h * (4.0/27.0);
    const t3 = t + h * (2.0/9.0);
    const t4 = t + h * (1.0/3.0);
    const t5 = t + h * (1.0/2.0);
    const t6 = t + h * (2.0/3.0);
    const t7 = t + h * (1.0/6.0);
    const t8 = t + h;
    const t9 = t + h * (5.0/6.0);
    const t10= t + h;

    const k1 = g(t, y);
    const y2 = linComb([1.0, h/27.0], [y, linComb([4], [k1])]);
    const k2 = g(t2, y2);
    const y3 = linComb([1.0, h/18.0], [y, linComb([1, 3], [k1, k2])]);
    const k3 = g(t3, y3);
    const y4 = linComb([1.0, h/12.0], [y, linComb([1, 3], [k1, k3])]);
    const k4 = g(t4, y4);

    const y5 = linComb([1.0, h/8.0], [y, linComb([1, 3], [k1, k4])]);
    const k5 = g(t5, y5);

    const y6 = linComb([1.0, h/54.0], 
        [y, linComb([13, -27, 42, 8], 
                    [k1,  k3, k4, k5])]);
    const k6 = g(t6, y6);

    const y7 = linComb([1.0, h/4320.0], 
        [y, linComb([389, -54, 966, -824, 243], 
                    [ k1,  k3,  k4,   k5,  k6])]);
    const k7 = g(t7, y7);

    const y8 = linComb([1.0, h/20.0], 
        [y, linComb([-234, 81, -1164, 656, -122, 800], 
                    [  k1, k3,    k4,  k5,   k6,  k7])]);
    const k8 = g(t8, y8);

    const y9 = linComb([1.0, h/288.0], 
        [y, linComb([-127, 18, -678, 456, -9, 576, 4], 
                    [  k1, k3,   k4,  k5, k6, k7, k8])]);
    const k9 = g(t9, y9);

    const y10 = linComb([1.0, h/820.0], 
        [y, linComb([1481, -81, 7104, -3376, 72, -5040, -60, 720], 
                    [  k1,  k3,   k4,    k5, k6,   k7,   k8,  k9])]);
    const k10 = g(t10, y10);

    const yNext = linComb([1.0, h/840.0], 
        [y, linComb([41, 27, 272, 27, 216, 216, 41], 
                    [k1, k4,  k5, k6,  k7, k9, k10])]);

    return yNext;
}
 
/**
 * Perform time stepping integration for the system y'(t) = g(t, y)
 * between two moments in time.
 * 
 * @param {*} y0 
 *      State vector at t = t0.
 * @param {*} h 
 *      Time step size.
 * @param {*} t0 
 *      Start time.
 * @param {*} t1 
 *      End time.
 * @param {*} g 
 *      Method g(t, y) for the evaluation of the RHS.
 * @param {*} integrator 
 *      Integrator method.
 * @returns State y(t) at t = t1.
 */
export function timeStepping(y0, h, t0, t1, g, integrator)
{
    let t = t0;
    let y = y0;

    while (t < t1)
    {
        if (t + h > t1)
        {
            h = t1 - t;
        }

        //console.log('g(t, y)');
        //console.log(g(t, y));
        //console.log('y_before');
        //console.log(y);

        y = integrator(y, h, t, g);
        t += h;

        //console.log('y_after');
        //console.log(y);

        //console.log(t);
        //console.log(y);
    }

    return y;
}

// State of a point mass is Orbit State Vector with an additional field for mass.
// r_1' = v_1 
//  ...
// r_N' = v_N
// v_1' = F_1/m_1
// ...
// v_N' = F_N/m_N
// f_i = G \sum_{j\neq i} m_i * m_j * (r_i - r_j)/ |r_i - r_j|^3

/**
 * Compute gravitational force between two point masses.
 * 
 * @param {*} m1 
 *      First mass.
 * @param {*} m2 
 *      Second mass.
 * @param {*} r1 
 *      Position vector of the first mass.
 * @param {*} r2 
 *      Position vector of the second mass.
 * @returns The gravitational force vector.
 */
function forcePM(m1, m2, r1, r2)
{
    const r12 = vecDiff(r1, r2);
    const factor = -gravConst * m1 * m2 * Math.pow(norm(r12), -3.0);

    return vecMul(r12, factor);
}

/**
 * Compute RHS function for n-body gravitational problem.
 * 
 * @param {*} osvList 
 *      List of OSV with an additional field m for the mass.
 * @returns The RHS function g(t, y).
 */
export function osvToRhsPM(osvList)
{
    const numElem = osvList.length;

    const g = function (t, y)
    {
        // g(t, y) is independent of time. The remainder is only dependent
        // on position.
        const rhs = new Array(numElem * 6).fill(0);

        for (let indElem = 0; indElem < numElem; indElem++)
        {
            let vecElem = [0, 0, 0];
            const osv1 = osvList[indElem];

            const indexFirst = indElem * 3;
            const indexSecond = (indElem + numElem) * 3;

            // r_x' = v_x, r_y' = v_y, r_z' = v_z
            rhs[indexFirst]     = y[indexSecond];
            rhs[indexFirst + 1] = y[indexSecond + 1];
            rhs[indexFirst + 2] = y[indexSecond + 2];

            const r1 = [y[indexFirst], y[indexFirst + 1], y[indexFirst + 2]];

            for (let indElem2 = 0; indElem2 < numElem; indElem2++)
            {
                if (indElem == indElem2) 
                {
                    continue;
                }
                const indexFirst2 = indElem2 * 3;
                const r2 = [y[indexFirst2], y[indexFirst2 + 1], y[indexFirst2 + 2]];
                const osv2 = osvList[indElem2];
                vecElem = vecSum(vecElem, forcePM(1.0, osv2.m, r1, r2));
            }

            // Force terms:
            rhs[indexSecond] = vecElem[0];
            rhs[indexSecond + 1] = vecElem[1];
            rhs[indexSecond + 2] = vecElem[2];
        }

        return rhs;
    }

    return g;
}

/**
 * Update OSV according to state vector.
 * 
 * @param {*} osvList
 *      OSV list to be updated. 
 * @param {*} state
 *      State vector.
 * @param {*} newTime
 *      New time.
 */
export function updateOsvPM(osvList, state, newTime)
{
    const numElem = osvList.length;

    for (let indElem = 0; indElem < numElem; indElem++)
    {
        const osv = osvList[indElem];

        const indexFirst = indElem * 3;
        const indexSecond = (indElem + numElem) * 3;

        const r = [state[indexFirst],  state[indexFirst + 1],  state[indexFirst + 2]];
        const v = [state[indexSecond], state[indexSecond + 1], state[indexSecond + 2]];

        osvList[indElem].r = r;
        osvList[indElem].v = v;
        osvList[indElem].t = newTime;
    }
}

/**
 * Generate state vector from OSV.
 * 
 * @param {*} osvList 
 *      List of OSVs.
 * @returns State vector.
 */
export function osvStatePM(osvList)
{
    const numElem = osvList.length;
    const state = new Array(numElem * 6).fill(0);

    for (let indElem = 0; indElem < numElem; indElem++)
    {
        const indexFirst = indElem * 3;
        const indexSecond = (indElem + numElem) * 3;

        state[indexFirst]     = osvList[indElem].r[0];
        state[indexFirst + 1] = osvList[indElem].r[1];
        state[indexFirst + 2] = osvList[indElem].r[2];
        state[indexSecond]     = osvList[indElem].v[0];
        state[indexSecond + 1] = osvList[indElem].v[1];
        state[indexSecond + 2] = osvList[indElem].v[2];
    }

    return state;
}