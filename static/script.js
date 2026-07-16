(() => {
    const input = document.getElementById('message-input');
    const charCount = document.getElementById('char-count');
    const checkBtn = document.getElementById('check-btn');
    const analysisBeam = document.getElementById('analysis-beam');
    const pulseDot = document.getElementById('pulse-dot');

    const spectrogram = document.getElementById('spectrogram');
    const statusText = document.getElementById('status-text');
    const metricsOverlay = document.getElementById('metrics-overlay');
    const metricsPlaceholder = document.getElementById('metrics-placeholder');
    const signalState = document.getElementById('signal-state');
    const confidenceVal = document.getElementById('confidence-val');
    
    const diagnosticsLog = document.getElementById('diagnostics-log');
    const diagnosticsDesc = document.getElementById('diagnostics-desc');
    const inspectorPlaceholder = document.getElementById('inspector-placeholder');
    const signalInspector = document.getElementById('signal-inspector');
    const signalsList = document.getElementById('signals-list');
    
    const errorContainer = document.getElementById('error-container');
    const errorText = document.getElementById('error-text');
    
    const tryAgainBtn = document.getElementById('try-again-btn');
    const retryBtn = document.getElementById('retry-btn');
    const payloadChips = document.querySelectorAll('.payload-chip');
    const specBars = document.querySelectorAll('.spec-bar');

    const cmdkTrigger = document.getElementById('cmdk-trigger-btn');
    const cmdkDialog = document.getElementById('cmdk-dialog');
    const cmdkInput = document.getElementById('cmdk-input');
    const cmdkItems = Array.from(document.querySelectorAll('.cmdk-item'));

    const COLD_START_MS = 5000;
    const FETCH_TIMEOUT_MS = 120000;

    const IDLE_HEIGHTS = ['30%', '45%', '60%', '50%', '35%', '25%', '40%', '55%', '70%', '50%', '35%', '20%'];

    const CLEAN_HEIGHTS = ['15%', '20%', '25%', '20%', '18%', '15%', '22%', '25%', '20%', '18%', '15%', '12%'];

    const SPAM_HEIGHTS = ['75%', '90%', '65%', '85%', '95%', '50%', '80%', '95%', '70%', '85%', '90%', '60%'];

    function applyBarHeights(heights) {
        specBars.forEach((bar, index) => {
            bar.style.height = heights[index] || '30%';
        });
    }

    input.addEventListener('input', () => {
        const len = input.value.length;
        const paddedCount = String(len).padStart(4, '0');
        charCount.textContent = `${paddedCount}/5000`;
    });

    function loadExample(index) {
        if (payloadChips[index]) {
            input.value = payloadChips[index].dataset.text;
            input.dispatchEvent(new Event('input'));
            input.focus();
        }
    }

    payloadChips.forEach((chip, idx) => {
        chip.addEventListener('click', () => {
            loadExample(idx);
        });
    });

    tryAgainBtn.addEventListener('click', resetAnalyzer);
    retryBtn.addEventListener('click', resetAnalyzer);

    function resetAnalyzer() {

        input.value = '';
        input.dispatchEvent(new Event('input'));

        analysisBeam.hidden = true;
        metricsOverlay.hidden = true;
        if (metricsPlaceholder) metricsPlaceholder.hidden = false;

        diagnosticsLog.hidden = true;
        if (inspectorPlaceholder) inspectorPlaceholder.hidden = false;

        errorContainer.hidden = true;
        
        if (signalInspector) {
            signalInspector.hidden = true;
            signalsList.innerHTML = '';
        }

        spectrogram.className = 'spectrogram-container';
        pulseDot.className = 'pulse-indicator';

        applyBarHeights(IDLE_HEIGHTS);

        statusText.textContent = 'READY';
        
        input.focus();
    }

    async function runPrediction() {
        const text = input.value.trim();
        if (!text) {
            input.focus();
            return;
        }

        checkBtn.disabled = true;
        analysisBeam.hidden = false;
        errorContainer.hidden = true;
        metricsOverlay.hidden = true;
        if (metricsPlaceholder) metricsPlaceholder.hidden = true;

        diagnosticsLog.hidden = true;
        if (inspectorPlaceholder) inspectorPlaceholder.hidden = true;
        
        spectrogram.className = 'spectrogram-container state-loading';
        pulseDot.className = 'pulse-indicator';

        specBars.forEach(bar => bar.style.height = '');
        
        statusText.textContent = 'ANALYZING SIGNAL...';

        let coldStartTimer = setTimeout(() => {
            statusText.textContent = 'WAKING UP SERVER (COLD START)...';
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
    }

    checkBtn.addEventListener('click', runPrediction);

    function showResult(data) {
        const isSpam = data.prediction === 'spam';
        const confidence = (data.confidence * 100).toFixed(1);

        if (isSpam) {
            spectrogram.className = 'spectrogram-container state-spam';
            pulseDot.className = 'pulse-indicator state-spam';
            applyBarHeights(SPAM_HEIGHTS);
            
            signalState.textContent = 'SPAM';
            signalState.className = 'metric-value state-spam';
            statusText.textContent = 'SPAM ANOMALY DETECTED';
            diagnosticsDesc.textContent = `Spam signature detected. This message contains marketing, promotional, or potential scam/phishing elements.`;
        } else {
            spectrogram.className = 'spectrogram-container state-clean';
            pulseDot.className = 'pulse-indicator state-clean';
            applyBarHeights(CLEAN_HEIGHTS);
            
            signalState.textContent = 'CLEAN';
            signalState.className = 'metric-value state-clean';
            statusText.textContent = 'SAFE MESSAGE';
            diagnosticsDesc.textContent = `No spam signatures detected. This message appears to be safe and legitimate.`;
        }

        confidenceVal.textContent = `${confidence}%`;
        
        if (metricsPlaceholder) metricsPlaceholder.hidden = true;
        metricsOverlay.hidden = false;

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

        if (inspectorPlaceholder) inspectorPlaceholder.hidden = true;
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

    let currentSelected = null;

    function openCmdk() {
        cmdkDialog.showModal();
        cmdkInput.value = '';
        filterCmdk();
        setTimeout(() => cmdkInput.focus(), 30);
    }

    function executeCommand(val) {
        cmdkDialog.close();
        if (val === 'check') {
            runPrediction();
        } else if (val === 'clear') {
            resetAnalyzer();
        } else if (val === 'spam1') {
            loadExample(0);
        } else if (val === 'ham1') {
            loadExample(1);
        } else if (val === 'spam2') {
            loadExample(2);
        } else if (val === 'ham2') {
            loadExample(3);
        } else if (val === 'spam3') {
            loadExample(4);
        } else if (val === 'ham3') {
            loadExample(5);
        }
    }

    function updateCmdkSelection(item) {
        if (currentSelected) {
            currentSelected.classList.remove('is-selected');
        }
        currentSelected = item;
        if (currentSelected) {
            currentSelected.classList.add('is-selected');
            currentSelected.scrollIntoView({ block: 'nearest' });
        }
    }

    function getVisibleItems() {
        return cmdkItems.filter(item => item.style.display !== 'none');
    }

    function filterCmdk() {
        const query = cmdkInput.value.toLowerCase().trim();
        let firstVisible = null;

        cmdkItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(query);
            item.style.display = matches ? 'flex' : 'none';
            if (matches && !firstVisible) {
                firstVisible = item;
            }
        });

        const groups = document.querySelectorAll('#cmdk-list > *');
        let currentGroupTitle = null;
        let visibleInGroup = 0;
        
        groups.forEach(node => {
            if (node.classList.contains('cmdk-group-title')) {
                if (currentGroupTitle && visibleInGroup === 0) {
                    currentGroupTitle.style.display = 'none';
                }
                currentGroupTitle = node;
                visibleInGroup = 0;
            } else if (node.classList.contains('cmdk-item')) {
                if (node.style.display !== 'none') {
                    visibleInGroup++;
                }
            }
        });
        if (currentGroupTitle && visibleInGroup === 0) {
            currentGroupTitle.style.display = 'none';
        } else if (currentGroupTitle) {
            currentGroupTitle.style.display = 'block';
        }

        updateCmdkSelection(firstVisible);
    }

    cmdkTrigger.addEventListener('click', openCmdk);
    cmdkInput.addEventListener('input', filterCmdk);

    cmdkInput.addEventListener('keydown', (e) => {
        const visible = getVisibleItems();
        if (visible.length === 0) return;

        let index = visible.indexOf(currentSelected);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            index = (index + 1) % visible.length;
            updateCmdkSelection(visible[index]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            index = (index - 1 + visible.length) % visible.length;
            updateCmdkSelection(visible[index]);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSelected) {
                executeCommand(currentSelected.dataset.value);
            }
        }
    });

    cmdkDialog.addEventListener('click', (e) => {
        const rect = cmdkDialog.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || 
            e.clientY < rect.top || e.clientY > rect.bottom) {
            cmdkDialog.close();
        }
    });

    cmdkItems.forEach(item => {
        item.addEventListener('click', () => {
            executeCommand(item.dataset.value);
        });
        item.addEventListener('mouseenter', () => {
            updateCmdkSelection(item);
        });
    });

    window.addEventListener('keydown', (e) => {

        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            openCmdk();
        }

        if (!cmdkDialog.open) {

            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                resetAnalyzer();
            }

            if ((e.metaKey || e.ctrlKey) && ['1','2','3','4','5','6'].includes(e.key)) {
                e.preventDefault();
                const idx = parseInt(e.key) - 1;
                loadExample(idx);
            }
        }
    });

    applyBarHeights(IDLE_HEIGHTS);
    input.focus();
})();