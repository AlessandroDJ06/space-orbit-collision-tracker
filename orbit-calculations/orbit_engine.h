#ifndef ORBIT_ENGINE_H
#define ORBIT_ENGINE_H

#include "calculation_functions/orbit_math.h"

double* allocate_satellites(int count);
void free_satellites(void);
void process_orbits(double delta_time);

Interesting_pair* get_detected_pairs(void);
int get_detected_pair_count(void);

#endif