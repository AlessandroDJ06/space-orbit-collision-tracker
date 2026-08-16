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
#define TCA_WINDOW_SEC 600.0   // ±10 minuten
#define TCA_STEP_SEC 10.0

Interesting_pair detected_pairs[MAX_PAIRS];
int detected_pair_count = 0;

typedef struct {
    int sat_index;
    double x;
    double y;
    double z;
    double vx;
    double vy;
    double vz;
    double sma;
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

void process_orbits(double delta_time_sec) {
    if (satellites == NULL || total_count <= 0) return;

    detected_pair_count = 0;

    SortableSatellite* sortable_array = (SortableSatellite*) malloc(total_count * sizeof(SortableSatellite));
    if (sortable_array == NULL) return;
    
    for (int i = 0; i < total_count; i++) {
        PropagatedState state = propagate_satellite(satellites[i], delta_time_sec);

        sortable_array[i].sat_index = i;
        sortable_array[i].x = state.position.x;
        sortable_array[i].y = state.position.y;
        sortable_array[i].z = state.position.z;
        sortable_array[i].vx = state.velocity.x;
        sortable_array[i].vy = state.velocity.y;
        sortable_array[i].vz = state.velocity.z;
        sortable_array[i].sma = state.sma;
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

            if (distance >= COLLISION_THRESHOLD_KM) continue;
            if (detected_pair_count >= MAX_PAIRS) continue;

            int idx1 = sortable_array[i].sat_index;
            int idx2 = sortable_array[j].sat_index;

            Satellite sat1 = satellites[idx1];
            Satellite sat2 = satellites[idx2];

            double tca_t = find_tca(sat1, sat2, delta_time_sec, TCA_WINDOW_SEC, TCA_STEP_SEC);

            PropagatedState s1_tca = propagate_satellite(sat1, tca_t);
            PropagatedState s2_tca = propagate_satellite(sat2, tca_t);

            double tdx = s2_tca.position.x - s1_tca.position.x;
            double tdy = s2_tca.position.y - s1_tca.position.y;
            double tdz = s2_tca.position.z - s1_tca.position.z;
            double tca_distance = sqrt(tdx*tdx + tdy*tdy + tdz*tdz);

            double tdvx = s2_tca.velocity.x - s1_tca.velocity.x;
            double tdvy = s2_tca.velocity.y - s1_tca.velocity.y;
            double tdvz = s2_tca.velocity.z - s1_tca.velocity.z;
            double relative_velocity = sqrt(tdvx*tdvx + tdvy*tdvy + tdvz*tdvz);
            double radial_velocity = (tdx*tdvx + tdy*tdvy + tdz*tdvz) / tca_distance;

            double r1 = sqrt(s1_tca.position.x * s1_tca.position.x +
                             s1_tca.position.y * s1_tca.position.y +
                             s1_tca.position.z * s1_tca.position.z);
            double r2 = sqrt(s2_tca.position.x * s2_tca.position.x +
                             s2_tca.position.y * s2_tca.position.y +
                             s2_tca.position.z * s2_tca.position.z);

            detected_pairs[detected_pair_count].sat1_id = sat1.id;
            detected_pairs[detected_pair_count].sat2_id = sat2.id;
            detected_pairs[detected_pair_count].miss_distance = tca_distance;
            detected_pairs[detected_pair_count].relative_velocity = relative_velocity;
            detected_pairs[detected_pair_count].radial_velocity = radial_velocity;
            detected_pairs[detected_pair_count].altitude_sat1 = r1 - EARTH_RADIUS_KM;
            detected_pairs[detected_pair_count].altitude_sat2 = r2 - EARTH_RADIUS_KM;
            detected_pairs[detected_pair_count].relative_incline = fabs(sat1.inclination - sat2.inclination);
            detected_pairs[detected_pair_count].sat1_sma = s1_tca.sma;
            detected_pairs[detected_pair_count].sat2_sma = s2_tca.sma;
            detected_pairs[detected_pair_count].sat1_ecc = sat1.eccentricity;
            detected_pairs[detected_pair_count].sat2_ecc = sat2.eccentricity;
            detected_pairs[detected_pair_count].time_to_tca = tca_t;

            detected_pair_count++;
        }
    }

    free(sortable_array);
}