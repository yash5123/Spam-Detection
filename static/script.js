(() => {
    const input = document.getElementById('message-input');
    const charCount = document.getElementById('char-count');
    const checkBtn = document.getElementById('check-btn');
    const analysisBeam = document.getElementById('analysis-beam');
    const pulseDot = document.getElementById('pulse-dot');
    
    // Displays
    const spectrogram = document.getElementById('spectrogram');
    const statusText = document.getElementById('status-text');
    const metricsOverlay = document.getElementById('metrics-overlay');
    const signalState = document.getElementById('signal-state');
    const confidenceVal = document.getElementById('confidence-val');
    const diagnosticsLog = document.getElementById('diagnostics-log');
    const diagnosticsDesc = document.getElementById('diagnostics-desc');
    const signalInspector = document.getElementById('signal-inspector');
    const signalsList = document.getElementById('signals-list');
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');
    
    const tryAgainBtn = document.getElementById('try-again-btn');
    const retryBtn = document.getElementById('retry-btn');
    const payloadChips = document.querySelectorAll('.payload-chip');
    
    const specBars = document.querySelectorAll('.spec-bar');
    
    const COLD_START_MS = 5000;
    const FETCH_TIMEOUT_MS = 120000;

    // Default static height styles for idle state
    const IDLE_HEIGHTS = ['30%', '45%', '60%', '50%', '35%', '25%', '40%', '55%', '70%', '50%', '35%', '20%'];
    
    // Low, calm, damped heights for Clean verdict
    const CLEAN_HEIGHTS = ['15%', '20%', '25%', '20%', '18%', '15%', '22%', '25%', '20%', '18%', '15%', '12%'];
    
    // High-amplitude, jagged, erratic heights for Spam verdict
    const SPAM_HEIGHTS = ['75%', '90%', '65%', '85%', '95%', '50%', '80%', '95%', '70%', '85%', '90%', '60%'];

    function applyBarHeights(heights) {
        specBars.forEach((bar, index) => {
            bar.style.height = heights[index] || '30%';
        });
    }

    // Character counter
    input.addEventListener('input', () => {
        const len = input.value.length;
        const paddedCount = String(len).padStart(4, '0');
        charCount.textContent = `${paddedCount}/5000`;
    });

    // Payloads selection
    payloadChips.forEach(chip => {
        chip.addEventListener('click', () => {
            input.value = chip.dataset.text;
            input.dispatchEvent(new Event('input'));
            input.focus();
        });
    });

    tryAgainBtn.addEventListener('click', resetAnalyzer);
    retryBtn.addEventListener('click', resetAnalyzer);

    function resetAnalyzer() {
        // Clear input field and update counter
        input.value = '';
        input.dispatchEvent(new Event('input'));
        
        // Hide overlay, logs, errors
        analysisBeam.hidden = true;
        metricsOverlay.hidden = true;
        diagnosticsLog.hidden = true;
        errorContainer.hidden = true;
        
        if (signalInspector) {
            signalInspector.hidden = true;
            signalsList.innerHTML = '';
        }
        
        // Reset classes
        spectrogram.className = 'spectrogram-container';
        pulseDot.className = 'pulse-indicator';
        
        // Apply default bar heights
        applyBarHeights(IDLE_HEIGHTS);
        
        // Reset status text
        statusText.textContent = 'READY TO CHECK';
        
        input.focus();
    }

    checkBtn.addEventListener('click', async () => {
        const text = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }

        // Setup loading state
        checkBtn.disabled = true;
        analysisBeam.hidden = false;
        errorContainer.hidden = true;
        metricsOverlay.hidden = true;
        diagnosticsLog.hidden = true;
        
        spectrogram.className = 'spectrogram-container state-loading';
        pulseDot.className = 'pulse-indicator';
        
        // Reset heights during anim (handled by CSS keyframes)
        specBars.forEach(bar => bar.style.height = '');
        
        statusText.textContent = 'ANALYZING MESSAGE...';

        let coldStartTimer = setTimeout(() => {
            statusText.textContent = 'WAKING UP MODEL SERVER (COLD START)...';
        }, COLD_START_MS);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const res = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });

            clearTimeout(coldStartTimer);
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                let msg = 'CONNECTION_ERR: CHECK_FAILED';
                if (res.status === 422 && errData?.detail) {
                    if (Array.isArray(errData.detail)) {
                        msg = errData.detail.map(d => d.msg).join('. ');
                    } else {
                        msg = String(errData.detail);
                    }
                }
                showError(msg);
                return;
            }

            const data = await res.json();
            showResult(data);

        } catch (err) {
            clearTimeout(coldStartTimer);
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                showError('TIMEOUT: SERVER UNRESPONSIVE');
            } else {
                showError('SYS_ERR: DISCONNECTED');
            }
        } finally {
            checkBtn.disabled = false;
            analysisBeam.hidden = true;
        }
    });

    function showResult(data) {
        const isSpam = data.prediction === 'spam';
        const confidence = (data.confidence * 100).toFixed(1);

        if (isSpam) {
            spectrogram.className = 'spectrogram-container state-spam';
            pulseDot.className = 'pulse-indicator state-spam';
            applyBarHeights(SPAM_HEIGHTS);
            
            signalState.textContent = 'SPAM';
            signalState.className = 'metric-value state-spam';
            statusText.textContent = 'ANALYSIS COMPLETE: SPAM DETECTED';
            diagnosticsDesc.textContent = `Spam signature detected. This message contains marketing, promotional, or potential scam/phishing elements.`;
        } else {
            spectrogram.className = 'spectrogram-container state-clean';
            pulseDot.className = 'pulse-indicator state-clean';
            applyBarHeights(CLEAN_HEIGHTS);
            
            signalState.textContent = 'CLEAN';
            signalState.className = 'metric-value state-clean';
            statusText.textContent = 'ANALYSIS COMPLETE: SAFE MESSAGE';
            diagnosticsDesc.textContent = `No spam signatures detected. This message appears to be safe and legitimate.`;
        }

        confidenceVal.textContent = `${confidence}%`;
        metricsOverlay.hidden = false;

        // Render signal chips
        if (data.signals && data.signals.length > 0) {
            signalsList.innerHTML = '';
            data.signals.forEach(sig => {
                const chip = document.createElement('span');
                chip.className = `signal-chip ${isSpam ? 'type-spam' : 'type-clean'}`;
                
                const wordSpan = document.createElement('span');
                wordSpan.textContent = sig.word;
                chip.appendChild(wordSpan);
                
                const weightSpan = document.createElement('span');
                weightSpan.className = 'signal-weight';
                const prefix = isSpam ? '+' : '-';
                weightSpan.textContent = `${prefix}${sig.score.toFixed(1)}`;
                chip.appendChild(weightSpan);
                
                signalsList.appendChild(chip);
            });
            signalInspector.hidden = false;
        } else {
            signalInspector.hidden = true;
            signalsList.innerHTML = '';
        }

        diagnosticsLog.hidden = false;
    }

    function showError(msg) {
        spectrogram.className = 'spectrogram-container';
        pulseDot.className = 'pulse-indicator';
        applyBarHeights(IDLE_HEIGHTS);
        statusText.textContent = 'ANALYSIS FAILED';
        errorText.textContent = msg.toUpperCase();
        errorContainer.hidden = false;
    }

    // Set initial heights on page load
    applyBarHeights(IDLE_HEIGHTS);
    input.focus();
})();
