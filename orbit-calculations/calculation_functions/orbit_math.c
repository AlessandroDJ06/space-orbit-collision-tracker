#include "orbit_math.h"
#include <math.h>

double calculate_orbit_size(double mean_motion) {
    return pow(398600.4418 / pow(mean_motion, 2), 1.0 / 3.0);
}

double caclulate_new_time(double mean_anomaly, double mean_motion) {
    return mean_anomaly + (mean_motion * 3600);
}

double calculate_eccentric_anomaly(double eccentricity, double previous_eccentric_anomaly, double time) {
    return previous_eccentric_anomaly - (previous_eccentric_anomaly - eccentricity * sin(previous_eccentric_anomaly) - time) / (1 - eccentricity * cos(previous_eccentric_anomaly));
}

double calculate_kepler(double eccentric_anomaly, double eccentricity) {
    return eccentric_anomaly - eccentricity * sin(eccentric_anomaly);
}

Position calculate_position(double eccentricity, double eccentric_anomaly, double a) {
    double x = a * (cos(eccentric_anomaly) - eccentricity);
    double y = a * sqrt(1.0 - (eccentricity * eccentricity)) * sin(eccentric_anomaly);
    return (Position){x, y};
}

Coordinates calculate_coordinates(double x_prime, double y_prime, double raan, double arg_perigee, double inclination) {
    double cos_raan = cos(raan);
    double sin_raan = sin(raan);
    double cos_ap = cos(arg_perigee);
    double sin_ap = sin(arg_perigee);
    double cos_inc = cos(inclination);
    double sin_inc = sin(inclination);

    double x = x_prime * (cos_raan * cos_ap - sin_raan * sin_ap * cos_inc)
             - y_prime * (cos_raan * sin_ap + sin_raan * cos_ap * cos_inc);

    double y = x_prime * (sin_raan * cos_ap + cos_raan * sin_ap * cos_inc)
             - y_prime * (sin_raan * sin_ap - cos_raan * cos_ap * cos_inc);

    double z = x_prime * (sin_ap * sin_inc)
             + y_prime * (cos_ap * sin_inc);

    return (Coordinates){x, y, z};
}