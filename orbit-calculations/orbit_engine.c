#include "orbit_engine.h"
#include "calculation_functions/orbit_math.h"
#include <stdio.h>
#include <stdlib.h>

Satellite* satellites = NULL;
int total_count = 0;

double* allocate_satellites(int count) {
    total_count = count;
    satellites = (Satellite*) malloc(count * sizeof(Satellite));
    return (double*) satellites;
}

void process_orbits(double delta_time) {
    if (satellites == NULL || total_count <= 0) return;

    for (int i = 0; i < total_count; i++) {
        Satellite sat = satellites[i];

        double a = calculate_orbit_size(sat.mean_motion);
        double M = caclulate_new_time(sat.mean_anomaly, sat.mean_motion);

        double E = M;
        for (int iter = 0; iter < 5; iter++) {
            E = calculate_eccentric_anomaly(sat.eccentricity, E, M);
        }

        Position pos = calculate_position(sat.eccentricity, E, a);
        Coordinates coords = calculate_coordinates(pos.x, pos.y, sat.raan, sat.arg_perigee, sat.inclination);
    }
}