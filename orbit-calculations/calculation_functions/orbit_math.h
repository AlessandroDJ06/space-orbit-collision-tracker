#ifndef ORBIT_MATH_H
#define ORBIT_MATH_H

typedef struct {
    double id;
    double inclination;
    double raan;
    double eccentricity;
    double arg_perigee;
    double mean_anomaly;
    double mean_motion;
} Satellite;

typedef struct {
    int sat1_id;
    int sat2_id;
    double miss_distance;
    double relative_velocity;
    double altitude;
    double relative_incline;
} Interesting_pair;

typedef struct {
    double x;
    double y;
    double z;
} Coordinates;

typedef struct {
    double x;
    double y;
} Position;

typedef struct {
    double vx;
    double vy;
} Velocity;

double deg_to_rad(double degrees);
double mean_motion_to_rad_per_sec(double rev_per_day);

double calculate_orbit_size(double mean_motion_rad_s);
double caclulate_new_time(double mean_anomaly_rad, double mean_motion_rad_s, double delta_time_sec);
double calculate_eccentric_anomaly(double eccentricity, double previous_eccentric_anomaly, double mean_anomaly);
double calculate_kepler(double eccentric_anomaly, double eccentricity);

Position calculate_position(double eccentricity, double eccentric_anomaly, double a);
Coordinates calculate_coordinates(double x_prime, double y_prime, double raan, double arg_perigee, double inclination);

Velocity calculate_velocity(double eccentricity, double eccentric_anomaly, double a, double r);
Coordinates calculate_velocity_coordinates(double vx_prime, double vy_prime, double raan, double arg_perigee, double inclination);

#endif