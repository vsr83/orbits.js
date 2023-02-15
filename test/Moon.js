/*
describe('Moon', function() {
    describe('moonEquatorial', function() {
        it('No nutation parameter', function() {        
            const JT = 2.459694500000000e+06;
            const rTod = moonPositionTod(JT);
            const rTodExp = [3.042115315818079e8, -1.878671124143496e8, -1.190937748596068e8];
            checkFloatArray(rTod, rTodExp, 1);
        });
        it('With nutation parameter', function() {        
            const JT = 2.459694500000000e+06;
            const T = (JT - 2451545.0)/36525.0;
            const nutTerms = nutationTerms(T);
            const rTod = moonPositionTod(JT, nutTerms);
            const rTodExp = [3.042115315818079e8, -1.878671124143496e8, -1.190937748596068e8];
            checkFloatArray(rTod, rTodExp, 1);
        });
    });
    describe('moonNodePassage', function() {
        it ('Meeus', function() {
            checkFloat(moonNodePassage(-170.0), 2446938.76803, 1e-5);
        });
    });
    describe('moonNodePassages', function() {
        it ('range', function() {
            const nodePassages = moonNodePassages(2010, 2020);

            for (let JT of nodePassages)
            {
                //const T = (JT - 2451545.0)/36525.0;
                //const nutTerms = nutationTerms(T);
                //const rTod = moonPositionTod(JT, nutTerms);
                //const osvMod = coordTodMod({r : rTod, v : [0, 0, 0], JT : JT}, nutTerms)
                //const osvJ2000 = coordModJ2000(osvMod, nutTerms);
                //const osvEcl = coordEqEcl(osvJ2000);
                const rEcl = elp2000(JT);

                const latMoon = asind(rEcl[2] / norm(rEcl));
                //console.log(latMoon + " " + osvEcl.r[2]);
                // 1m accuracy:
                checkFloat(rEcl[2], 0.0, 1);
                //console.log(timeGregorian(JT));
            }
        });
    });

    describe('newMoonList', function() {
        it ('range', function() {
            const newMoons = moonNewList(2010, 2020);
            const lightTimeJT = 1.495978707e9 / (3e6 * 86400.0);

            for (const JT of newMoons)
            {

                const rEcl = elp2000(JT);

                let {r, v} = vsop87('earth', JT - lightTimeJT);
                const rSun = vecMul(r, -1);
                const vSun = vecMul(v, -1);

                const eclLonSun = limitAngleDeg(atan2d(rSun[1], rSun[0]));
                const eclLonMoon= limitAngleDeg(atan2d(rEcl[1], rEcl[0]));

                const lonDiff = angleDiff(eclLonSun, eclLonMoon);
                const maxAngle = 1 / 3600; //360 / (27 * 24 * 60);
                //console.log(lonDiff);
                checkFloat(lonDiff, 0.0, maxAngle); 
            }
        });
    });
});
*/ 