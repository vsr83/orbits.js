// This script downloads VSOP87A dataset from:
// https://ftp.imcce.fr/pub/ephem/planets/vsop87/

import {get} from 'https';
import {createWriteStream} from 'fs';

function downloadFile(url, targetFile) 
{
    const file = createWriteStream(targetFile);

    const request = get(url, function(response) {
        //console.log(response);

        let vsopData = "";
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('Downloaded file ' + targetFile);
        });

        // Let's keep the following in case the script is adapted into one
        // that does not store the files:
        response.on('data', (d) => {
            //console.log(d.toString());
            //console.log(typeof(d));
            vsopData = vsopData + d.toString();
        });

        response.on('end', function() {
            //console.log(vsopData);
        });
    });
}

downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.mer', 'VSOP87A.mer');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.ven', 'VSOP87A.ven');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.ear', 'VSOP87A.ear');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.mar', 'VSOP87A.mar');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.jup', 'VSOP87A.jup');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.sat', 'VSOP87A.sat');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.ura', 'VSOP87A.ura');
downloadFile('https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87A.nep', 'VSOP87A.nep');

