import pandas as pd; import numpy as np; s = pd.Series([1,2]); w = np.array([1,2]); np.dot(s.iloc[-1:], w)
