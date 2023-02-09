from astropy.time import Time;
from astropy.coordinates import solar_system_ephemeris, EarthLocation
from astropy.coordinates import AltAz, SkyCoord, get_body_barycentric, get_body, get_moon
from astropy import units as u;
import json;


# Range for the data extraction 1980-01-01 00:00:00 to 2020-01-01 00:00:00:
JDstart = 2444239.5000000;
JDend = 2458849.5000000;
# Time step in Julian days.
time_step = 7.0;

output_filename = "astropy_jplephem_data.json";

# List of bodies
body_list = ['mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
output_data = {};

for body_name in body_list:
    
    print("Computing positions for " + body_name);

    JD = JDstart;

    utc = [];
    ut1 = [];
    tdb = [];
    icrs_ra = [];
    icrs_dec = [];
    gcrs_ra = [];
    gcrs_dec = [];
    itrs_cart = [];
    az = [];
    alt = [];

    while JD <= JDend:
        location = EarthLocation(lat=61.4945763*u.deg, lon=23.8283*u.deg, height=121.9157*u.m);
        time = Time(JD, scale="utc", format="jd");

        with solar_system_ephemeris.set('jpl'):
            body = get_body(body_name, time, location)

        altazframe = AltAz(obstime=time, location=location, pressure=0);
        body_az = body.transform_to(altazframe);
        body_gcrs = body.transform_to('gcrs');
        body_icrs = body.transform_to('icrs');
        body_itrs = body.transform_to('itrs');
        
        utc.append(float(str(time.utc)));
        ut1.append(float(str(time.ut1)));
        tdb.append(float(str(time.tdb)));
        icrs_ra.append(body_icrs.ra.deg);
        icrs_dec.append(body_icrs.dec.deg);
        gcrs_ra.append(body_gcrs.ra.deg);
        gcrs_dec.append(body_gcrs.dec.deg);
        az.append(body_az.az.degree);
        alt.append(body_az.alt.degree);
        itrs_cart.append([
            float(str(body_itrs.x).split(" ")[0]),
            float(str(body_itrs.y).split(" ")[0]),
            float(str(body_itrs.z).split(" ")[0])
        ]);
        #print(str(time.utc)+","+time.ut1, time.tdb, jupiter_icrs.ra.deg, jupiter_icrs.dec.deg, jupiter_gcrs.ra.deg, jupiter_gcrs.dec.deg, jupiter_az.az.deg, jupiter_az.alt.degree);

        JD = JD + time_step;

    planet_data = {
        "utc" : utc,
        "ut1" : ut1,
        "tdb" : tdb,
        "icrs_ra" : icrs_ra,
        "icrs_dec" : icrs_dec,
        "gcrs_ra" : gcrs_ra,
        "gcrs_dec" : gcrs_dec,
        "enu_az" : az,
        "enu_alt" : alt#,
        #"itrs" : itrs_cart
    };
    output_data[body_name] = planet_data;

    
json_object = json.dumps(output_data);

print("Writing " + output_filename);
with open(output_filename, "w") as outfile:
    outfile.write(json_object);
print("Done.");