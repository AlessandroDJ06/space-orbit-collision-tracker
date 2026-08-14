cmake_minimum_required(VERSION 4.3)
project(orbit_calculations C)

set(CMAKE_C_STANDARD 11)

add_library(orbit_calculations STATIC orbit_engine.c
        calculation_functions/orbit_math.c
        calculation_functions/orbit_math.h)
