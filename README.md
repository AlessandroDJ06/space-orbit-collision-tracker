# space-orbit-collision-tracker

## Introduction
Hello! Welcome to my project! This project is a real time collision predictor for satellites.
It works based on TLE data that gets converted to be processed in a model trained on a CDM dataset from ESA.

## Design choises
I chose to write the calculations in C to maximize speed in the browser. For the 3d rendering of the earth and the orbits i use CesiumJS because its perfect
for this UseCase ( and it reduced difficulty a lot ).

For the machine learning model i use the XGBClassifier from XGBoost. I tried to make a regression model at first
but because MAE was really high in this approach and it wasn't really useable for the UseCase i had in mind, so i tried to minimize the effect by predicting classes instead of a real risk. The data i can calculate isn't enough the get a really accurate prediction on the dataset, but it gives a great indication.

The TLE data is retrieved from Celestrak, because they dont want you to retrieve the data more than one time every 2 hours ive set up a ghithub action to retrieve it once
every 2 hours.

Becuase i wanted to host this on Github pages (because its free hosting) i used WebAssembly and ONNX, this way everything is static and can be hosted without a backend.

## Tech Stack
**-> Front end:** TypeScript, Vite, Tailwind CSS, DaisyUI, CesiumJS

**-> Orbit calculations:** C, WebAssembly

**-> Machine Learning:** Python, Scikit-Learn, XGBoost, ONNX Runtime

**-> Hosting:** Github Pages

## Sources used
- [dataset](https://www.kaggle.com/datasets/sergiobuilds/synthetic-satellite-collision-risk)
- [Celestrak](https://celestrak.org/NORAD/documentation/)
- [XGBoost](https://xgboost.readthedocs.io/en/stable/)

