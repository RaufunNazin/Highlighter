# Algorithm: Adaptive Highlight Extraction (AHE)

**Input**: 
- Subtitle segment $S$
- NLP Model $M$
- Keyword Sets $\{K_{impact}, K_{exciting}, K_{boring}\}$

**Output**: 
- Highlight Flag $H_{flag}$
- Final Confidence $\mathcal{C}$

---

### 1. Neural Inference
Compute neural sentiment/excitement score via BERT or DistilBERT engine:
$$\sigma \leftarrow M(S)$$

---

### 2. Pattern Matching
Evaluate boolean flags based on specific keyword intersections:

- $f_{impact} \leftarrow \text{True if } S \cap K_{impact} \neq \emptyset$
- $f_{exciting} \leftarrow \text{True if } S \cap K_{exciting} \neq \emptyset$
- $f_{boring} \leftarrow \text{True if } S \cap K_{boring} \neq \emptyset$

---

### 3. Heuristic Weighting Logic

**If** $f_{impact}$ **then**:
- $H_{flag} \leftarrow \text{True}$
- $\mathcal{C} \leftarrow 1.0$

**Else If** $f_{exciting}$ **then**:
- $H_{flag} \leftarrow \text{True}$
- $\mathcal{C} \leftarrow \max(\sigma, 0.9)$

**Else If** $\sigma > 0.6$ **and not** $f_{boring}$ **then**:
- $H_{flag} \leftarrow \text{True}$
- $\mathcal{C} \leftarrow \sigma$

**Else**:
- $H_{flag} \leftarrow \text{False}$
- $\mathcal{C} \leftarrow \sigma$

---

### 4. Return
**Return** $(H_{flag}, \mathcal{C})$
