#include "orbit_engine.h"
#include "calculation_functions/orbit_math.h"
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

Satellite* satellites = NULL;
int total_count = 0;

#define COLLISION_THRESHOLD_KM 50.0
#define MAX_PAIRS 500
#define EARTH_RADIUS_KM 6371.0

Interesting_pair detected_pairs[MAX_PAIRS];
int detected_pair_count = 0;

typedef struct {
    int sat_index;
    double x;
    double y;
    double z;
} SortableSatellite;

double* allocate_satellites(int count) {
    total_count = count;
    if (satellites != NULL) {
        free(satellites);
    }
    satellites = (Satellite*) malloc(count * sizeof(Satellite));
    return (double*) satellites;
}

void free_satellites() {
    if (satellites != NULL) {
        free(satellites);
        satellites = NULL;
        total_count = 0;
    }
}

Interesting_pair* get_detected_pairs() {
    return detected_pairs;
}

int get_detected_pair_count() {
    return detected_pair_count;
}

int compare_sortable_x(const void* a, const void* b) {
    const SortableSatellite* satA = (const SortableSatellite*) a;
    const SortableSatellite* satB = (const SortableSatellite*) b;

    if (satA->x < satB->x) return -1;
    if (satA->x > satB->x) return 1;
    return 0;
}

void process_orbits(double delta_time) {
    if (satellites == NULL || total_count <= 0) return;

    detected_pair_count = 0;

    SortableSatellite* sortable_array = (SortableSatellite*) malloc(total_count * sizeof(SortableSatellite));
    if (sortable_array == NULL) return;

    for (int i = 0; i < total_count; i++) {
        Satellite sat = satellites[i];

        double a = calculate_orbit_size(sat.mean_motion);
        double M = caclulate_new_time(sat.mean_anomaly, sat.mean_motion,delta_time);

        double E = M;
        for (int iter = 0; iter < 5; iter++) {
            E = calculate_eccentric_anomaly(sat.eccentricity, E, M);
        }

        Position pos = calculate_position(sat.eccentricity, E, a);
        Coordinates coords = calculate_coordinates(pos.x, pos.y, sat.raan, sat.arg_perigee, sat.inclination);

        sortable_array[i].sat_index = i;
        sortable_array[i].x = coords.x;
        sortable_array[i].y = coords.y;
        sortable_array[i].z = coords.z;
    }

    qsort(sortable_array, total_count, sizeof(SortableSatellite), compare_sortable_x);

    for (int i = 0; i < total_count; i++) {
        for (int j = i + 1; j < total_count; j++) {
            if ((sortable_array[j].x - sortable_array[i].x) > COLLISION_THRESHOLD_KM) {
                break;
            }
            double dx = sortable_array[j].x - sortable_array[i].x;
            double dy = sortable_array[j].y - sortable_array[i].y;
            double dz = sortable_array[j].z - sortable_array[i].z;
            double distance = sqrt(dx*dx + dy*dy + dz*dz);

            if (distance < COLLISION_THRESHOLD_KM) {
                if (detected_pair_count < MAX_PAIRS) {
                    int idx1 = sortable_array[i].sat_index;
                    int idx2 = sortable_array[j].sat_index;

                    Satellite sat1 = satellites[idx1];
                    Satellite sat2 = satellites[idx2];

                    detected_pairs[detected_pair_count].sat1_id = sat1.id;
                    detected_pairs[detected_pair_count].sat2_id = sat2.id;
                    detected_pairs[detected_pair_count].miss_distance = distance;
                    double r1 = sqrt(sortable_array[i].x * sortable_array[i].x +
                                     sortable_array[i].y * sortable_array[i].y +
                                     sortable_array[i].z * sortable_array[i].z);
                    detected_pairs[detected_pair_count].altitude = r1 - EARTH_RADIUS_KM;
                    double inc_diff = fabs(sat1.inclination - sat2.inclination);
                    detected_pairs[detected_pair_count].relative_incline = inc_diff;
                    detected_pairs[detected_pair_count].relative_velocity = fabs(sat1.mean_motion - sat2.mean_motion);

                    detected_pair_count++;
                }
            }
        }
    }

    free(sortable_array);
}