// http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//
import {get} from 'http';
import {createWriteStream} from 'fs';
import { existsSync, mkdirSync } from 'fs';

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
        });

        response.on('end', function() {
        });
    });
}

if (!existsSync("elpseries")) {
    mkdirSync("elpseries");
}
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP1', 'elpseries/ELP01');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP2', 'elpseries/ELP02');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP3', 'elpseries/ELP03');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP4', 'elpseries/ELP04');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP5', 'elpseries/ELP05');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP6', 'elpseries/ELP06');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP7', 'elpseries/ELP07');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP8', 'elpseries/ELP08');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP9', 'elpseries/ELP09');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP10', 'elpseries/ELP10');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP11', 'elpseries/ELP11');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP12', 'elpseries/ELP12');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP13', 'elpseries/ELP13');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP14', 'elpseries/ELP14');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP15', 'elpseries/ELP15');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP16', 'elpseries/ELP16');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP17', 'elpseries/ELP17');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP18', 'elpseries/ELP18');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP19', 'elpseries/ELP19');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP20', 'elpseries/ELP20');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP21', 'elpseries/ELP21');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP22', 'elpseries/ELP22');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP23', 'elpseries/ELP23');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP24', 'elpseries/ELP24');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP25', 'elpseries/ELP25');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP26', 'elpseries/ELP26');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP27', 'elpseries/ELP27');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP28', 'elpseries/ELP28');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP29', 'elpseries/ELP29');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP30', 'elpseries/ELP30');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP31', 'elpseries/ELP31');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP32', 'elpseries/ELP32');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP33', 'elpseries/ELP33');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP34', 'elpseries/ELP34');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP35', 'elpseries/ELP35');
downloadFile('http://cdsarc.u-strasbg.fr/viz-bin/ftp-index?/ftp/cats/VI/79//ELP36', 'elpseries/ELP36');
