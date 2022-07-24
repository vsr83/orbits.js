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
     
     if (configuration.csvOptions.printTitle)
     {
        csvAddLine(csvCreateTitle(configuration));
     }

     const csvSep = configuration.csvOptions.separator;

     for (let timeStep = 0; timeStep < results.length; timeStep++) 
     {
         const output = results[timeStep];
 
         let s = dateToTs(output.timeStamp, configuration.csvOptions.timeFormat);
 
         if (configuration.coordOutputs.cart.ecl)
         {
             s += csvSep + output.osv.eclHel.r;
         }
         if (configuration.coordOutputs.sph.ecl)
         {
             s += csvSep + output.sph.eclHel.RA + csvSep + output.sph.eclHel.decl + csvSep + output.sph.eclHel.dist;
         }
         if (configuration.coordOutputs.cart.eclGeo)
         {
             s += csvSep + output.osv.eclGeo.r;
         }
         if (configuration.coordOutputs.sph.eclGeo)
         {
             s += csvSep + output.sph.eclGeo.RA + csvSep + output.sph.eclGeo.decl + csvSep + output.sph.eclGeo.dist;
         }
         if (configuration.coordOutputs.cart.j2000)
         {
             s += csvSep + output.osv.J2000.r;
         }
         if (configuration.coordOutputs.sph.j2000)
         {
             s += csvSep + output.sph.J2000.RA + csvSep + output.sph.J2000.decl + csvSep + output.sph.J2000.dist;
         }
         if (configuration.coordOutputs.cart.mod)
         {
             s += csvSep + output.osv.mod.r;
         }
         if (configuration.coordOutputs.sph.mod)
         {
             s += csvSep + output.sph.mod.RA + csvSep + output.sph.mod.decl + csvSep + output.sph.mod.dist;
         }
         if (configuration.coordOutputs.cart.tod)
         {
             s += csvSep + output.osv.tod.r;
         }
         if (configuration.coordOutputs.sph.tod)
         {
             s += csvSep + output.sph.tod.RA + csvSep + output.sph.tod.decl + csvSep + output.sph.tod.dist;
         }
         if (configuration.coordOutputs.cart.pef)
         {
             s += csvSep + output.osv.pef.r;
         }
         if (configuration.coordOutputs.sph.pef)
         {
             s += csvSep + output.sph.pef.RA + csvSep + output.sph.pef.decl + csvSep + output.sph.pef.dist;
         }
         if (configuration.coordOutputs.cart.efi)
         {
             s += csvSep + output.osv.efi.r;
         }
         if (configuration.coordOutputs.sph.efi)
         {
             s += csvSep + output.sph.efi.RA + csvSep + output.sph.efi.decl + csvSep + output.sph.efi.dist;
         }
         if (configuration.coordOutputs.cart.enu)
         {
             s += csvSep + output.osv.enu.r;
         }
         if (configuration.coordOutputs.sph.enu)
         {
             s += csvSep + output.sph.enu.az + csvSep + output.sph.enu.el + csvSep + output.sph.enu.dist;
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
    const csvSep = configuration.csvOptions.separator;

    if (configuration.coordOutputs.cart.ecl)
    {
        s += csvSep + "EclHel_x" + csvSep + "EclHel_y" + csvSep + "EclHel_z";
    }
    if (configuration.coordOutputs.sph.ecl)
    {
        s += csvSep + "EclHel_RA" + csvSep + "EclHel_decl" + csvSep + "EclHel_dist";
    }
    if (configuration.coordOutputs.cart.eclGeo)
    {
        s += csvSep + "EclGeo_x" + csvSep + "EclGeo_y" + csvSep + "EclGeo_z";
    }
    if (configuration.coordOutputs.sph.eclGeo)
    {
        s += csvSep + "EclGeo_RA" + csvSep + "EclGeo_decl" + csvSep + "EclGeo_dist";
    }
    if (configuration.coordOutputs.cart.j2000)
    {
        s += csvSep + "J2000_x" + csvSep + "J2000_y" + csvSep + "J2000_z";
    }
    if (configuration.coordOutputs.sph.j2000)
    {
        s += csvSep + "J2000_RA" + csvSep + "J2000_decl" + csvSep + "J2000_dist";
    }
    if (configuration.coordOutputs.cart.mod)
    {
        s += csvSep + "MoD_x" + csvSep + "MoD_y" + csvSep + "MoD_z";
    }
    if (configuration.coordOutputs.sph.mod)
    {
        s += csvSep + "MoD_RA" + csvSep + "MoD_decl" + csvSep + "MoD_dist";
    }
    if (configuration.coordOutputs.cart.tod)
    {
        s += csvSep + "ToD_x" + csvSep + "ToD_y" + csvSep + "ToD_z";
    }
    if (configuration.coordOutputs.sph.tod)
    {
        s += csvSep + "ToD_RA" + csvSep + "ToD_decl" + csvSep + "ToD_dist";
    }
    if (configuration.coordOutputs.cart.pef)
    {
        s += csvSep + "PEF_x" + csvSep + "PEF_y" + csvSep + "PEF_z";
    }
    if (configuration.coordOutputs.sph.pef)
    {
        s += csvSep + "PEF_RA" + csvSep + "PEF_decl" + csvSep + "PEF_dist";
    }
    if (configuration.coordOutputs.cart.efi)
    {
        s += csvSep + "EFI_x" + csvSep + "EFI_y" + csvSep + "EFI_z";
    }
    if (configuration.coordOutputs.sph.efi)
    {
        s += csvSep + "EFI_RA" + csvSep + "EFI_decl" + csvSep + "EFI_dist";
    }
    if (configuration.coordOutputs.cart.enu)
    {
        s += csvSep + "ENU_x" + csvSep + "ENU_y" + csvSep + "ENU_z";
    }
    if (configuration.coordOutputs.sph.enu)
    {
        s += csvSep + "Azi" + csvSep + "Elev" + csvSep +"ENU_dist";
    }

    return s;
}
