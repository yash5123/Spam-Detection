<div align="center">

# `SPAM FILTER`

**Instant spam detection powered by Naive Bayes**

![Python](https://img.shields.io/badge/Python-3.13+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

*Paste a message. Know in milliseconds if it's spam.*

</div>

---

## 🔍 About

> [!IMPORTANT]
> **Model Training Notebook**: The full pipeline - data loading, preprocessing, model training, and evaluation - is available in [`train_model.ipynb`](notebook/train_model.ipynb).

This is a full-stack spam classifier that takes any SMS or message text and instantly tells you whether it is spam or a legitimate message, powered by a Multinomial Naive Bayes model trained on 5,572 real SMS records from the UCI Spam Collection dataset.

You paste a message, hit a button, and the 12-bar animated spectrogram reacts to the verdict - spiking to full amplitude for spam, damping down to calm low bars for clean messages. Underneath the visualizer, the **Signal Inspector** surfaces the exact words that drove the model's decision, each tagged with its log-odds weight, so you can see precisely why the model flagged something.

The backend is a FastAPI app that loads the TF-IDF + Naive Bayes pipeline once at startup and serves predictions from memory. The frontend is hand-crafted HTML, CSS, and JavaScript with a Scandinavian-inspired light-mode palette - no CSS framework, no JavaScript library.

> [!NOTE]
> The model achieves a **Spam F1-score of 92.09%** with **99% precision** - meaning it almost never flags a legitimate message as spam. That matters more than raw accuracy for a spam filter.

---

## ✨ Features

### Core Classification Engine

- **Instant Verdict** - Paste any text, get a Spam or Clean result in milliseconds. The model runs TF-IDF vectorization and Naive Bayes inference entirely in memory on every request.

- **Signal Inspector** - After every analysis, the top 5 words that most influenced the verdict appear as tagged chips with their log-odds scores (e.g. `won +5.7`, `urgent +3.9`). These are the model's actual internal weights, not guesses.

- **Confidence Score** - Every prediction includes a probability confidence value. A result of `99.0%` means the model is extremely certain; a result closer to `60%` means the message is borderline.

> [!TIP]
> The Signal Inspector scores are mathematically precise. A score of `+5.7` for `won` means the model considers that word to be **e^5.7 = 298x** more likely to appear in a spam message than a legitimate one. The chips are sorted by impact, highest first.

### UI and Experience

- **Animated Spectrogram** - A 12-bar CSS frequency visualizer reacts to each verdict. Spam triggers a high-amplitude erratic pattern; clean messages produce a flat, calm waveform. The bars animate smoothly using CSS keyframes.

- **Example Payloads** - Four pre-loaded example buttons (two spam, two ham) let you test the classifier instantly without typing anything.

- **Dot-Grid Background** - A subtle engineering dot-grid pattern with a soft radial spotlight glow fills the background behind the card. Pure CSS, zero extra markup.

- **Responsive** - Works cleanly on mobile and desktop. On narrow viewports the visualizer and metrics stack vertically, the action button stretches full-width, and padding scales down gracefully.

- **Accessible** - Semantic HTML with ARIA live regions on the result area, focus-visible outlines on all interactive elements, and a `prefers-reduced-motion` media query that disables all animations for users who prefer it.

### Backend and API

- **Single-Load Model** - The scikit-learn pipeline is deserialized once at server startup via `joblib.load()`. Every request after that reads the model from memory - zero disk I/O per prediction.

- **Pydantic Validation** - All request bodies are validated against a strict Pydantic schema before reaching the model. Empty strings and messages over 5,000 characters get a clean `422` response with a readable error message.

- **Word-Level Explainability** - The `/predict` endpoint extracts feature log-probabilities from the trained `MultinomialNB` classifier to compute per-word spam vs. ham scores for every token present in the input. The top 5 scoring tokens above a threshold are returned alongside the verdict.

- **Auto-Generated API Docs** - FastAPI provides Swagger UI at `/docs` with no extra configuration. Every endpoint is documented with request/response schemas and examples.

---

## 🛠️ Built With

| Technology | Role in this project |
|---|---|
| ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | Core runtime for data processing, model training, and the API server |
| ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white) | TF-IDF vectorizer and Multinomial Naive Bayes classifier packaged as a single `Pipeline` |
| ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) | Prediction and health API with automatic Pydantic validation and Swagger docs |
| ![Uvicorn](https://img.shields.io/badge/Uvicorn-2D6A4F?style=for-the-badge) | ASGI server that runs FastAPI with async I/O support |
| ![Pandas](https://img.shields.io/badge/Pandas-150458?style=for-the-badge&logo=pandas&logoColor=white) | Loads and cleans the 5,572-row SMS dataset from CSV |
| ![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white) | Numerical operations during prediction and probability extraction |
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | Semantic page structure with accessible ARIA labels and live regions |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | Custom design system, CSS variables, spectrogram keyframe animations |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | API calls, state management, signal chip rendering, and spectrogram control |

The stack was chosen deliberately. Naive Bayes is fast, interpretable, and performs extremely well on bag-of-words text classification. FastAPI keeps the backend minimal while auto-generating docs. Vanilla frontend because this app does not need a framework to render a textarea and a few result chips.

---

## 📊 Model Evaluation

These plots are generated during training and saved to `model/results/`.

<div align="center">

### Confusion Matrix
<img src="model/results/confusion_matrix.png" width="60%" />

*Near-zero false positives - the model almost never marks a real message as spam, which is the metric that matters most in practice.*

<br/>

### Classification Report
<img src="model/results/classification_report.png" width="75%" />

*99% spam precision means only 1 in 100 spam flags is wrong. 86% recall means 14% of actual spam slips through - a deliberate tradeoff to protect legitimate messages.*

<br/>

### Model Comparison
<img src="model/results/model_comparison.png" width="75%" />

*Comparison of Multinomial Naive Bayes against alternative classifiers evaluated on the same train/test split.*

</div>

---

## ⚙️ Technical Details

### Project Structure

```
Spam Detection/
├── app/
│   └── main.py                 # FastAPI app - routes, validation, word-level signals
├── notebook/
│   └── train_model.ipynb       # Full training, evaluation, and plot generation
├── data/
│   └── spam.csv                # 5,572-row UCI SMS Spam Collection dataset
├── model/
│   ├── model.pkl               # Serialized TF-IDF + Naive Bayes pipeline
│   └── results/                # Confusion matrix and classification report plots
│       ├── confusion_matrix.png
│       └── classification_report.png
├── static/
│   ├── index.html              # App markup and structure
│   ├── style.css               # Design system, animations, signal chip styles
│   └── script.js               # API calls, state machine, signal inspector renderer
├── requirements.txt            # Pinned dependencies
└── README.md
```

### Model Details

| | |
|---|---|
| **Dataset** | UCI SMS Spam Collection, 5,572 messages, no missing values |
| **Classes** | `spam` (747 messages, 13.4%) / `ham` (4,825 messages, 86.6%) |
| **Preprocessing** | Lowercase, URL removal, punctuation strip, whitespace normalization |
| **Vectorizer** | `TfidfVectorizer` with `ngram_range=(1,2)` to capture multi-word patterns |
| **Classifier** | `MultinomialNB` - fast, interpretable, strong baseline for text classification |
| **Pipeline** | Scikit-learn `Pipeline(['tfidf', 'clf'])` - vectorization and inference in one call |
| **Train / test split** | 80% / 20%, `random_state=42` |
| **Spam Precision** | 99% |
| **Spam Recall** | 86% |
| **Spam F1** | 92.09% |

**Why Naive Bayes over a more complex model?**

For SMS spam detection with a bag-of-words feature space, Naive Bayes consistently matches or beats heavier models (SVM, Logistic Regression) while training in milliseconds and staying fully interpretable. The `feature_log_prob_` attribute - the log-probability of each word given each class - is what powers the Signal Inspector. A deep model would lose that direct word-level explainability.

> [!NOTE]
> **Precision vs. Recall tradeoff**: A spam filter should almost never block a legitimate message. This model is tuned to be conservative - 99% precision means only 1 false positive per 100 spam flags. The cost is 14% of real spam slipping through (recall of 86%), which is the right tradeoff for a general-purpose message checker.

### API Reference

Interactive Swagger docs are available at [`/docs`](http://127.0.0.1:8000/docs) when running locally.

**`GET /health`**

```json
{ "status": "ok", "model": "loaded" }
```

**`POST /predict`**

Request body:
```json
{ "text": "URGENT: You have won a 1000 prize! Call now to claim." }
```

Response:
```json
{
  "prediction": "spam",
  "confidence": 0.9998,
  "label": "Spam",
  "signals": [
    { "word": "won",    "score": 5.70 },
    { "word": "urgent", "score": 3.97 },
    { "word": "prize",  "score": 3.61 },
    { "word": "call",   "score": 1.07 }
  ]
}
```

`text` is required and must be between 1 and 5,000 characters. Violations return a `422` with a field-level error message before reaching the model.

### 💻 Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/yash5123/Spam-Detection.git
cd "Spam-Detection"

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Retrain the model
cd notebook
jupyter notebook train_model.ipynb
cd ..

# 4. Start the server
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/` - the frontend is served automatically.

### 🚀 Deployment

Deployed on **Render** as a single web service. FastAPI serves both the API routes and the static frontend from one process - no separate frontend hosting needed.

| Setting | Value |
|---|---|
| **Build command** | `pip install -r requirements.txt` |
| **Start command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Runtime** | Python 3.13+ |
| **Plan** | Free tier (cold starts ~30s after inactivity) |

### Package Versions

| Package | Version |
|---|---|
| fastapi | 0.136.1 |
| uvicorn | 0.46.0 |
| scikit-learn | 1.8.0 |
| pandas | 2.3.3 |
| numpy | 2.4.2 |
| joblib | 1.5.3 |

> [!TIP]
> The scikit-learn version **must match** between your training environment and your serving environment. A version mismatch can cause `joblib.load()` to fail or silently alter predictions. Pin the version in `requirements.txt` and do not upgrade it without retraining.

---

<div align="center">

### Made by Yash

[![GitHub](https://img.shields.io/badge/GitHub-yash5123-181717?style=flat-square&logo=github)](https://github.com/yash5123)

</div>
