// This script downloads The Extended Hipparchos Compilation (XHIP) dataset 
// from:
// http://cdsarc.u-strasbg.fr/ftp/V/137D/

import {get} from 'http';
import {createWriteStream, createReadStream, unlink} from 'fs';

import {createGunzip} from 'zlib';
import {pipeline} from 'stream';

/**
 * Download a file.
 * 
 * @param {*} url 
 *      File URL.
 * @param {*} targetFile 
 *      Target file.
 * @param {*} doGunzip
 *      Decompress Gzipped file. 
 */
function downloadFile(url, targetFile, doGunzip) 
{
    const file = createWriteStream(targetFile);

    const request = get(url, function(response) {
        //console.log(response);

        let vsopData = "";
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('Downloaded file ' + targetFile);

            if (doGunzip)
            {
                gunzipFile(targetFile, targetFile.substring(0, targetFile.length - 3));
            }
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

/**
 * Decompress Gzipped file.
 * 
 * @param {*} inputFile 
 *      Input file.
 * @param {*} outputFile 
 *      Output file.
 */
function gunzipFile(inputFile, outputFile)
{
    console.log('Unzipping ' + inputFile);

    const gunzip = createGunzip();
    const source = createReadStream(inputFile);
    const dest = createWriteStream(outputFile);

    pipeline(source, gunzip, dest, (err) => {
        if (err) 
        {
            console.error('An error occurred', err);
            process.exitCode = 1;
        }
    });

    dest.on('finish', () => {
        console.log('Created ' + outputFile);
        console.log('Deleting ' + inputFile);

        // Remove source file:
        unlink(inputFile, function(err) 
        {
            if (err) 
            {
                console.error(err);
            }
        });
    });
}


downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/ReadMe', 'ReadMe', false);
downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/biblio.dat.gz', 'biblio.dat.gz', true);
downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/groups.dat', 'groups.dat', false);
downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/main.dat.gz', 'main.dat.gz', true);
downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/photo.dat.gz', 'photo.dat.gz', true);
downloadFile('http://cdsarc.u-strasbg.fr/ftp/V/137D/refs.dat', 'refs.dat', false);
