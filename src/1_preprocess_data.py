import numpy as np
import pandas as pd
import os

files = os.listdir("timeseries_dataset")
# dataframes = []

# for i, file in enumerate(files):
#     df = pd.read_csv(f"timeseries_dataset/R{i+1}_2018_2021_Monthly_NDVI_Cloud40.csv")
#     dataframes.append(df)

# master_dataset = pd.concat(dataframes, ignore_index = True)

# master_dataset = master_dataset.drop(["system:index", ".geo", "NDVI_max"],axis = 1)
# print(master_dataset)
# master_dataset.to_csv("master_dataset.csv", index = False)

master_dataset = pd.read_csv("master_dataset.csv")
# print(master_dataset.isnull().sum())

master_dataset["NDVI_mean"] = (
    master_dataset.groupby(["Farm_ID", "Year"])["NDVI_mean"]
    .transform(lambda x: x.interpolate(method = "linear"))
)
print(master_dataset)
print(master_dataset.isnull().sum())

master_dataset["NDVI_mean"] = (
    master_dataset.groupby(["Farm_ID", "Year"])["NDVI_mean"]
    .transform(lambda x: x.fillna(method = "ffill").fillna(method = "bfill"))
)
print(master_dataset.isnull().sum())
# master_dataset.to_csv("interpolated.csv")

wide_dataset = master_dataset.pivot_table(
    index=["Farm_ID", "District", "Location", "Year"],
    columns= "Month", 
    values= "NDVI_mean"
).reset_index()

wide_dataset = wide_dataset.rename(columns={
    6: "June", 
    7: "July",
    8: "Aug",
    9: "Sept",
    10: "Oct"
})

# Remove negative NDVI values
wide_dataset[['June','July','Aug','Sept','Oct']] = \
wide_dataset[['June','July','Aug','Sept','Oct']].clip(lower=0)

print("Negative NDVI values corrected.")

wide_dataset.to_csv("wide_dataset.csv", index= False)
