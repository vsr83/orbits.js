/**
 * Add line to output textarea.
 * 
 * @param {*} s 
 *      The line to be added.
 */
 function csvAddLine(s)
 {
     document.getElementById("textarea_output").value += (s + '\r\n');
 }
 

/**
 * Print results in CSV format.
 * 
 * @param {*} configuration 
 *      Configuration JSON from the GUI.
 * @param {*} results 
 *      Array of results.
 */
 function csvPrint(configuration, results)
 {
     // Display CSV title.
     console.log(csvCreateTitle(configuration));
     csvAddLine(csvCreateTitle(configuration));
 
     for (let timeStep = 0; timeStep < results.length; timeStep++) 
     {
         const output = results[timeStep];
 
         let s = dateToTs(output.timeStamp);
 
         if (configuration.coordOutputs.cart.ecl)
         {
             s += "," + output.osv.eclHel.r;
         }
         if (configuration.coordOutputs.sph.ecl)
         {
             s += "," + output.sph.eclHel.RA + "," + output.sph.eclHel.decl + "," + output.sph.eclHel.dist;
         }
         if (configuration.coordOutputs.cart.eclGeo)
         {
             s += "," + output.osv.eclGeo.r;
         }
         if (configuration.coordOutputs.sph.eclGeo)
         {
             s += "," + output.sph.eclGeo.RA + "," + output.sph.eclGeo.decl + "," + output.sph.eclGeo.dist;
         }
         if (configuration.coordOutputs.cart.j2000)
         {
             s += "," + output.osv.J2000.r;
         }
         if (configuration.coordOutputs.sph.j2000)
         {
             s += "," + output.sph.J2000.RA + "," + output.sph.J2000.decl + "," + output.sph.J2000.dist;
         }
         if (configuration.coordOutputs.cart.mod)
         {
             s += "," + output.osv.mod.r;
         }
         if (configuration.coordOutputs.sph.mod)
         {
             s += "," + output.sph.mod.RA + "," + output.sph.mod.decl + "," + output.sph.mod.dist;
         }
         if (configuration.coordOutputs.cart.tod)
         {
             s += "," + output.osv.tod.r;
         }
         if (configuration.coordOutputs.sph.tod)
         {
             s += "," + output.sph.tod.RA + "," + output.sph.tod.decl + "," + output.sph.tod.dist;
         }
         if (configuration.coordOutputs.cart.pef)
         {
             s += "," + output.osv.pef.r;
         }
         if (configuration.coordOutputs.sph.pef)
         {
             s += "," + output.sph.pef.RA + "," + output.sph.pef.decl + "," + output.sph.pef.dist;
         }
         if (configuration.coordOutputs.cart.efi)
         {
             s += "," + output.osv.efi.r;
         }
         if (configuration.coordOutputs.sph.efi)
         {
             s += "," + output.sph.efi.RA + "," + output.sph.efi.decl + "," + output.sph.efi.dist;
         }
         if (configuration.coordOutputs.cart.enu)
         {
             s += "," + output.osv.enu.r;
         }
         if (configuration.coordOutputs.sph.enu)
         {
             s += "," + output.sph.enu.az + "," + output.sph.enu.el + "," + output.sph.enu.dist;
         }
     
         console.log(s);
         csvAddLine(s);
     }
 }
 
 /**
 * Generate title for the CSV output.
 * 
 * @param {*} configuration 
 *      The configuration.
 * @returns 
 */
function csvCreateTitle(configuration)
{
    let s = 'Timestamp'

    if (configuration.coordOutputs.cart.ecl)
    {
        s += ",EclHel_x,EclHel_y,EclHel_z";
    }
    if (configuration.coordOutputs.sph.ecl)
    {
        s += ",EclHel_RA,EclHel_decl,EclHel_dist";
    }
    if (configuration.coordOutputs.cart.eclGeo)
    {
        s += ",EclGeo_x,EclGeo_y,EclGeo_z";
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        s += ",EclGeo_RA,EclGeo_decl,EclGeo_dist";
    }
    if (configuration.coordOutputs.cart.j2000)
    {
        s += ",J2000_x,J2000_y,J2000_z";
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        s += ",J2000_RA,J2000_decl,J2000_dist";
    }
    if (configuration.coordOutputs.cart.mod)
    {
        s += ",MoD_x,MoD_y,MoD_z";
    }
    if (configuration.coordOutputs.sph.mod)
    {
        s += ",MoD_RA,MoD_decl,MoD_dist";
    }
    if (configuration.coordOutputs.cart.tod)
    {
        s += ",ToD_x,ToD_y,ToD_z";
    }
    if (configuration.coordOutputs.sph.tod)
    {
        s += ",ToD_RA,ToD_decl,ToD_dist";
    }
    if (configuration.coordOutputs.cart.pef)
    {
        s += ",PEF_x,PEF_y,PEF_z";
    }
    if (configuration.coordOutputs.sph.pef)
    {
        s += ",PEF_RA,PEF_decl,PEF_dist";
    }
    if (configuration.coordOutputs.cart.efi)
    {
        s += ",EFI_x,EFI_y,EFI_z";
    }
    if (configuration.coordOutputs.sph.efi)
    {
        s += ",EFI_RA,EFI_decl,EFI_dist";
    }
    if (configuration.coordOutputs.cart.enu)
    {
        s += ",ENU_x,ENU_y,ENU_z";
    }
    if (configuration.coordOutputs.sph.enu)
    {
        s += ",Azi,Elev,ENU_dist";
    }

    return s;
}
