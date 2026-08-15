import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier
import onnxruntime as ort
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType

cols = [
    "miss_distance", "relative_speed", "relative_velocity_r",
    "t_j2k_inc", "c_j2k_inc",
    "t_h_apo", "t_h_per", "c_h_apo", "c_h_per",
    "t_j2k_sma", "c_j2k_sma",
    "t_j2k_ecc", "c_j2k_ecc",
    "time_to_tca",
    "risk"
]

df_train = pd.read_csv(r"C:\Users\aless\space-orbit-tracker\model\dataset\train_data.csv", usecols=cols)
df_val = pd.read_csv(r"C:\Users\aless\space-orbit-tracker\model\dataset\test_data.csv", usecols=cols)

for df in (df_train, df_val):
    df["relative_incline"] = (df["t_j2k_inc"] - df["c_j2k_inc"]).abs()
    df["altitude_sat1"] = (df["t_h_apo"] + df["t_h_per"]) / 2
    df["altitude_sat2"] = (df["c_h_apo"] + df["c_h_per"]) / 2
    df.rename(columns={
        "relative_speed": "relative_velocity",
        "relative_velocity_r": "radial_velocity",
        "t_j2k_sma": "sat1_sma",
        "c_j2k_sma": "sat2_sma",
        "t_j2k_ecc": "sat1_ecc",
        "c_j2k_ecc": "sat2_ecc",
    }, inplace=True)
    df.drop(columns=["t_j2k_inc", "c_j2k_inc", "t_h_apo", "t_h_per", "c_h_apo", "c_h_per"], inplace=True)

feature_cols = [
    "miss_distance", "relative_velocity", "radial_velocity",
    "altitude_sat1", "altitude_sat2", "relative_incline",
    "sat1_sma", "sat2_sma", "sat1_ecc", "sat2_ecc",
    "time_to_tca"
]

X_train = df_train[feature_cols]
X_val = df_val[feature_cols]

def risk_to_tier(risk):
    if risk > -6:
        return 3
    elif risk > -10:
        return 2
    elif risk > -20:
        return 1
    else:
        return 0

Y_train_tier = df_train["risk"].apply(risk_to_tier)
Y_val_tier = df_val["risk"].apply(risk_to_tier)
sample_weights = compute_sample_weight(class_weight="balanced", y=Y_train_tier)
X_train_arr = X_train.to_numpy()
X_val_arr = X_val.to_numpy()

clf = XGBClassifier(
    n_estimators=200, max_depth=4, learning_rate=0.05,
    objective="multi:softprob", num_class=4
)
clf.fit(X_train_arr, Y_train_tier, sample_weight=sample_weights)

preds_tier = clf.predict(X_val_arr)
print(classification_report(Y_val_tier, preds_tier, target_names=["low", "medium", "risk", "critical"]))
print(confusion_matrix(Y_val_tier, preds_tier))

probs = clf.predict_proba(X_val_arr)
print(probs[:5])

initial_type = [("input", FloatTensorType([None, len(feature_cols)]))]

onnx_model = onnxmltools.convert_xgboost(
    clf,
    initial_types=initial_type,
    target_opset=13
)

with open("collision_risk_classifier.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
session = ort.InferenceSession("collision_risk_classifier.onnx")
input_name = session.get_inputs()[0].name

sample = X_val_arr[:5].astype(np.float32)
onnx_preds = session.run(None, {input_name: sample})

print("ONNX probabilities:", onnx_preds[1])
print("XGBoost probabilities:", clf.predict_proba(X_val_arr[:5]))