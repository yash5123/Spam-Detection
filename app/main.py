import os
import re
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
import numpy as np

# Resolve project root from app/main.py
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(project_root, 'model', 'model.pkl')
pipeline = joblib.load(model_path)

app = FastAPI(title="Spam Detection API", version="1.0.0")


class Message(BaseModel):
    text: str

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Message cannot be empty')
        if len(v) > 5000:
            raise ValueError('Message too long (max 5000 characters)')
        return v


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    label: str
    signals: list[dict] = []


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'http\S+|www\.\S+', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def get_model_signals(text: str, prediction: str) -> list[dict]:
    try:
        cleaned = clean_text(text)
        if not cleaned:
            return []
        
        tfidf = pipeline.named_steps['tfidf']
        clf = pipeline.named_steps['clf']
        feature_names = tfidf.get_feature_names_out()
        
        x = tfidf.transform([cleaned])
        nonzero_indices = x.nonzero()[1]
        if len(nonzero_indices) == 0:
            return []
            
        if prediction == "spam":
            # Spam log probability relative difference
            scores = clf.feature_log_prob_[1] - clf.feature_log_prob_[0]
        else:
            # Ham log probability relative difference
            scores = clf.feature_log_prob_[0] - clf.feature_log_prob_[1]
            
        signals = []
        for idx in nonzero_indices:
            word = feature_names[idx]
            score = float(scores[idx])
            if score > 0.5:
                signals.append({"word": word, "score": round(score, 2)})
                
        # Sort by impact descending
        signals.sort(key=lambda s: s["score"], reverse=True)
        return signals[:5]
    except Exception:
        return []


@app.get("/health")
def health():
    return {"status": "ok", "model": "loaded"}


@app.post("/predict", response_model=PredictionResponse)
def predict(message: Message):
    cleaned = clean_text(message.text)
    prediction = pipeline.predict([cleaned])[0]
    probabilities = pipeline.predict_proba([cleaned])[0]
    confidence = float(np.max(probabilities))

    label = "Spam" if prediction == "spam" else "Not Spam"
    signals = get_model_signals(message.text, prediction)

    return PredictionResponse(
        prediction=prediction,
        confidence=round(confidence, 4),
        label=label,
        signals=signals
    )


static_dir = os.path.join(project_root, 'static')


@app.get("/")
def serve_index():
    return FileResponse(os.path.join(static_dir, 'index.html'))


app.mount("/static", StaticFiles(directory=static_dir), name="static")
