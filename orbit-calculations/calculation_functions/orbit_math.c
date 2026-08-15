#include "orbit_math.h"
#include <math.h>

#define MU_EARTH 398600.4418

double deg_to_rad(double degrees) {
    return degrees * (M_PI / 180.0);
}

double mean_motion_to_rad_per_sec(double rev_per_day) {
    return rev_per_day * 2.0 * M_PI / 86400.0;
}

double calculate_orbit_size(double mean_motion_rad_s) {
    return pow(MU_EARTH / pow(mean_motion_rad_s, 2), 1.0 / 3.0);
}

double caclulate_new_time(double mean_anomaly_rad, double mean_motion_rad_s, double delta_time_sec) {
    return mean_anomaly_rad + (mean_motion_rad_s * delta_time_sec);
}

double calculate_eccentric_anomaly(double eccentricity, double previous_eccentric_anomaly, double mean_anomaly) {
    return previous_eccentric_anomaly
        - (previous_eccentric_anomaly - eccentricity * sin(previous_eccentric_anomaly) - mean_anomaly)
        / (1 - eccentricity * cos(previous_eccentric_anomaly));
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

Velocity calculate_velocity(double eccentricity, double eccentric_anomaly, double a, double r) {
    double n = sqrt(MU_EARTH / (a * a * a));
    double factor = (a * n) / r;

    double vx = -factor * sin(eccentric_anomaly);
    double vy = factor * sqrt(1.0 - eccentricity * eccentricity) * cos(eccentric_anomaly);

    return (Velocity){vx, vy};
}

Coordinates calculate_velocity_coordinates(double vx_prime, double vy_prime, double raan, double arg_perigee, double inclination) {
    return calculate_coordinates(vx_prime, vy_prime, raan, arg_perigee, inclination);
}

PropagatedState propagate_satellite(Satellite sat, double t_sec) {
    double inclination_rad = deg_to_rad(sat.inclination);
    double raan_rad = deg_to_rad(sat.raan);
    double arg_perigee_rad = deg_to_rad(sat.arg_perigee);
    double mean_anomaly_rad = deg_to_rad(sat.mean_anomaly);
    double mean_motion_rad_s = mean_motion_to_rad_per_sec(sat.mean_motion);

    double a = calculate_orbit_size(mean_motion_rad_s);
    double M = caclulate_new_time(mean_anomaly_rad, mean_motion_rad_s, t_sec);

    double E = M;
    for (int iter = 0; iter < 5; iter++) {
        E = calculate_eccentric_anomaly(sat.eccentricity, E, M);
    }

    Position pos = calculate_position(sat.eccentricity, E, a);
    Coordinates coords = calculate_coordinates(pos.x, pos.y, raan_rad, arg_perigee_rad, inclination_rad);

    double r = sqrt(coords.x * coords.x + coords.y * coords.y + coords.z * coords.z);
    Velocity vel = calculate_velocity(sat.eccentricity, E, a, r);
    Coordinates vel_coords = calculate_velocity_coordinates(vel.vx, vel.vy, raan_rad, arg_perigee_rad, inclination_rad);

    PropagatedState state;
    state.position = coords;
    state.velocity = vel_coords;
    state.sma = a;
    return state;
}

static double distance_between(Satellite sat1, Satellite sat2, double t_sec) {
    PropagatedState s1 = propagate_satellite(sat1, t_sec);
    PropagatedState s2 = propagate_satellite(sat2, t_sec);

    double dx = s2.position.x - s1.position.x;
    double dy = s2.position.y - s1.position.y;
    double dz = s2.position.z - s1.position.z;
    return sqrt(dx*dx + dy*dy + dz*dz);
}

double find_tca(Satellite sat1, Satellite sat2, double t_center, double window_sec, double step_sec) {
    double best_t = t_center;
    double best_distance = distance_between(sat1, sat2, t_center);

    for (double t = t_center - window_sec; t <= t_center + window_sec; t += step_sec) {
        double d = distance_between(sat1, sat2, t);
        if (d < best_distance) {
            best_distance = d;
            best_t = t;
        }
    }
    return best_t;
}