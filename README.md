# orbits.js
Javascript library for computation of positions of stars and planets.

The library implements:
* Coordinate transformations between the following frames:
    * Heliocentric Ecliptic
    * Geocentric Ecliptic
    * J2000
    * Mean-of-Date (MoD)
    * True-of-Date (ToD)
    * Pseudo-Earth-Fixed (PEF)
    * Earth-Fixed (EFI)
* Extended Hipparcos Compliation (XHIP) stars with magnitudes below 6.
* VSOP87A for the computation of positions of planets.
* Accurate computation of the position of the Moon.
* Computation of Stellar aberration.
* Keplerian elements:
    * Approximate positions of planets.
    * Osculating Keplerian elements.
    * Keplerian propagation of orbits.

Click below to execute an example of a simple application using most features of the library.
[![Screenshot.](example_gui/scrshot.png)](https://vsr83.github.io/orbits.js/example_gui/index.html)

Click below for an example drawing constellations.
[![Screenshot.](example_constellations/scrshot.png)](https://vsr83.github.io/orbits.js/example_constellations/index.html)

