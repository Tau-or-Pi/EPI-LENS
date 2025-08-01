/**
 * @file popup.js
 * @module popup
 */
"use strict";

document.addEventListener('DOMContentLoaded', () => {
    let controls = {};

    function initializeControls() {
    controls = {
        startBtn: document.getElementById('startAnalysis'),
        stopBtn: document.getElementById('stopAnalysis'),
        exportBtn: document.getElementById('exportCSV'),
        exportJsonBtn: document.getElementById('exportJSON'),
        exportNdJsonBtn: document.getElementById('exportNDJSON'),
        flashThreshold: document.getElementById('flashThreshold'),
        intensityThreshold: document.getElementById('intensityThreshold'),
        flashThresholdValue: document.getElementById('flashThresholdValue'),
        intensityThresholdValue: document.getElementById('intensityThresholdValue'),
        openChartsTab: document.getElementById('openChartsTab'),
        clearAllDataBtn: document.getElementById('clearAllDataBtn'),
        openFileAnalyzerTab: document.getElementById('openFileAnalyzerTab')
    };

    Object.entries(controls).forEach(([key, element]) => {
        if (element) {
            if (key === 'flashThreshold' || key === 'intensityThreshold') {
                element.addEventListener('input', updateThresholdDisplay);
            } else if (element) {
                element.addEventListener('click', getClickHandler(key));
            }
        }
    });

    if (controls.startBtn) controls.startBtn.addEventListener('click', startAnalysis);
    if (controls.stopBtn) controls.stopBtn.addEventListener('click', stopAnalysis);
    if (controls.exportBtn) controls.exportBtn.addEventListener('click', exportResults);
    if (controls.exportJsonBtn) controls.exportJsonBtn.addEventListener('click', exportJSON);
    if (controls.exportNdJsonBtn) controls.exportNdJsonBtn.addEventListener('click', exportNDJSON);
    if (controls.openChartsTab) {
        controls.openChartsTab.addEventListener('click', openChartsTab);
    }
    if (controls.clearAllDataBtn) {
        controls.clearAllDataBtn.addEventListener('click', clearAllData);
    }
    if (controls.openFileAnalyzerTab) {
        controls.openFileAnalyzerTab.addEventListener('click', openFileAnalyzerTab);
    }
}

    function updateThresholdDisplay(event) {
        const valueElement = document.getElementById(`${event.target.id}Value`);
        if (valueElement) {
            valueElement.textContent = Number(event.target.value).toFixed(
                event.target.id === 'flashThreshold' ? 1 : 2
            );
        }
    }

    function getClickHandler(key) {
        const handlers = {
            startBtn: startAnalysis,
            stopBtn: stopAnalysis,
            exportBtn: exportResults
        };
        return handlers[key];
    }

    function exportResults() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'EXPORT_DATA'}, function(response) {
                if (response && response.csv) {
                    chrome.storage.local.set({ epilensAnalysisCSV: response.csv }, function() {
                        const blob = new Blob([response.csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = `flash-analysis-${new Date().toISOString()}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                    });
                }
            });
        });
    }

    function exportJSON() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'EXPORT_DATA', format: 'json'}, function(response) {
                if (response && response.json) {
                    const blob = new Blob([response.json], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `flash-analysis-${new Date().toISOString()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                }
            });
        });
    }

    function exportNDJSON() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'EXPORT_DATA', format: 'ndjson'}, function(response) {
            if (response && response.ndjson) {
                const blob = new Blob([response.ndjson], { type: 'application/x-ndjson' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `flash-analysis-${new Date().toISOString()}.ndjson`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            }
        });
    });
}

    /**
     * Starts the analysis by sending a message to the content script with current threshold options
     * TASK 836: Start and stop video via UI buttons
     */
    function startAnalysis() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Show analyzing badge
        const badge = document.createElement('div');
        badge.className = 'analyzing-badge';
        badge.id = 'analyzingBadge';
        badge.innerHTML = '<span class="pulse"></span> Analyzing...';
        document.body.appendChild(badge);

        // Send message to content script
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'START_ANALYSIS',
            options: {
                thresholds: {
                    flashesPerSecond: parseFloat(controls.flashThreshold.value),
                    intensity: parseFloat(controls.intensityThreshold.value)
                }
            }
        });
    });
}

function stopAnalysis() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'STOP_ANALYSIS'
        });

        // Remove the analyzing badge
        const badge = document.getElementById('analyzingBadge');
        if (badge) {
            badge.remove();
        }

        // Save latest analysis data and open charts tab TASK 2852: Redundant and repeated later on. Refer to story.
        chrome.tabs.sendMessage(tabs[0].id, { action: 'EXPORT_DATA', format: 'json' }, function(responseJson) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'EXPORT_DATA' }, function(responseCsv) {
                const tasks = [];
                if (responseJson && responseJson.json) {
                    tasks.push(new Promise(resolve => {
                        chrome.storage.local.set({ epilensAnalysisData: responseJson.json }, resolve);
                    }));
                }
                if (responseCsv && responseCsv.csv) {
                    tasks.push(new Promise(resolve => {
                        chrome.storage.local.set({ epilensAnalysisCSV: responseCsv.csv }, resolve);
                    }));
                }
                Promise.all(tasks).then(() => {
                    chrome.tabs.create({ url: chrome.runtime.getURL('charts.html') });
                });
            });
        });
    });
}

    // Initialize controls after DOM is loaded
    initializeControls();
});

let controls = {};

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateProgress(data) {
    if (!data || !data.currentTime || !data.duration) return;

    const progressBar = document.getElementById('videoProgress');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');

    if (progressBar && currentTimeEl && durationEl) {
        const progress = (data.currentTime / data.duration) * 100;
        progressBar.style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(data.currentTime);
        durationEl.textContent = formatTime(data.duration);
    }
}

function updateUI(data) {
    if (!data) return;
    updateBadge();
    updateProgress(data);
    updateFlashCount(data);
    updateRiskLevel(data);
    updateAnalyticsPanel(data);
    updatePSIPanel(data);
    updateSpatialPanel(data);
    updateChromaticPanel(data);
    updateFrameMetrics(data);
    updateSpectralMetrics(data);
    updateEdgeMetrics(data);
    updateMetricsGraph(data);
}

function updateBadge() {
    let badge = document.getElementById('analyzingBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'analyzing-badge';
        badge.id = 'analyzingBadge';
        badge.innerHTML = '<span class="pulse"></span> Analyzing...';
        document.body.appendChild(badge);
    }
}

function updateFlashCount(data) {
    const flashCountElement = document.getElementById('flashCount');
    if (flashCountElement) {
        const newCount = data.flashCount || 0;
        if (flashCountElement.textContent !== newCount.toString()) {
            flashCountElement.textContent = newCount;
            flashCountElement.classList.add('highlight');
            setTimeout(() => flashCountElement.classList.remove('highlight'), 300);
        }
    }
}

function updateRiskLevel(data) {
    const riskElement = document.getElementById('riskLevel');
    const riskBar = document.getElementById('riskIndicatorBar');
    if (riskElement && riskBar && data.riskLevel) {
        const riskLevel = data.riskLevel.toLowerCase();
        riskElement.textContent = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
        riskElement.className = `value ${riskLevel}`;
        riskBar.className = `risk-indicator-bar ${riskLevel}`;
    }
}

function updateAnalyticsPanel(data) {
    const analyticsPanel = document.getElementById('advancedMetrics');
    if (!analyticsPanel) return;

    analyticsPanel.innerHTML = `
        <div class="metric-row">
            <span>Current Brightness:</span>
            <span>${(data.brightness || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Flash Intensity:</span>
            <span>${(data.intensity || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Red Intensity:</span>
            <span>${(data.redIntensity || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Red Delta:</span>
            <span>${(data.redDelta || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Flicker Rate:</span>
            <span>${(data.flickerFrequency || 0).toFixed(2)} Hz</span>
        </div>
        <div class="metric-row">
            <span>Color Variance:</span>
            <span>R:${(data.colorVariance?.current?.r || 0).toFixed(2)}
                  G:${(data.colorVariance?.current?.g || 0).toFixed(2)}
                  B:${(data.colorVariance?.current?.b || 0).toFixed(2)}</span>
        </div>
        <div class="metric-row">
            <span>Temporal Change:</span>
            <span>${(data.temporalChange || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Frame Entropy:</span>
            <span>${(data.entropy || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Dominant Color (R,G,B):</span>
            <span>${
                data.dominantColor
                    ? `${Number(data.dominantColor.r).toFixed(1)}, ${Number(data.dominantColor.g).toFixed(1)}, ${Number(data.dominantColor.b).toFixed(1)}`
                    : '-'
            }</span>
        </div>
        <div class="metric-row">
            <span>Dominant Lab (L,a,b):</span>
            <span>${
                data.dominantLab
                    ? `${Number(data.dominantLab.L).toFixed(2)}, ${Number(data.dominantLab.a).toFixed(2)}, ${Number(data.dominantLab.b).toFixed(2)}`
                    : '-'
            }</span>
        </div>
        <div class="metric-row">
            <span>CIE76 Δ:</span>
            <span>${typeof data.cie76Delta !== "undefined" ? Number(data.cie76Delta).toFixed(4) : '-'}</span>
        </div>
        <div class="metric-row">
            <span>Patterned Stimulus Score:</span>
            <span>${typeof data.patternedStimulusScore !== "undefined" ? Number(data.patternedStimulusScore).toFixed(4) : '-'}</span>
        </div>
    `;
}

function updatePSIPanel(data) {
    const psiPanel = document.getElementById('psiMetrics');
    if (!psiPanel || !data.psi) return;

    psiPanel.innerHTML = `
        <div class="metric-row">
            <span>PSI Score:</span>
            <span class="${data.psi.score > 0.7 ? 'high' : data.psi.score > 0.4 ? 'medium' : 'low'}">
                ${(data.psi.score || 0).toFixed(4)}
            </span>
        </div>
        <div class="metric-row">
            <span>Flash Frequency:</span>
            <span>${(data.psi.components?.frequency || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Intensity:</span>
            <span>${(data.psi.components?.intensity || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Coverage:</span>
            <span>${(data.psi.components?.coverage || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Duration:</span>
            <span>${(data.psi.components?.duration || 0).toFixed(4)}</span>
        </div>
    `;
}

function updateSpatialPanel(data) {
    const spatialPanel = document.getElementById('spatialMetrics');
    if (!spatialPanel || !data.spatialMap) return;

    spatialPanel.innerHTML = `
        <div class="metric-row">
            <span>Center Intensity:</span>
            <span>${(data.spatialMap.center || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Peripheral Intensity:</span>
            <span>${(data.spatialMap.periphery || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Quadrant Distribution:</span>
            <span>${data.spatialMap.quadrants?.map(q => q.toFixed(2)).join(' | ')}</span>
        </div>
    `;
}

function updateChromaticPanel(data) {
    const chromaticPanel = document.getElementById('chromaticMetrics');
    if (!chromaticPanel || !data.chromaticFlashes) return;

    chromaticPanel.innerHTML = `
        <div class="metric-row">
            <span>Red-Green Contrast:</span>
            <span>${(data.chromaticFlashes.redGreen || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Blue-Yellow Contrast:</span>
            <span>${(data.chromaticFlashes.blueYellow || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Temporal Contrast Rate:</span>
            <span>${(data.temporalContrast?.currentRate || 0).toFixed(4)}</span>
        </div>
    `;
}

function updateFrameMetrics(data) {
    const panel = document.getElementById('frameMetrics');
    if (!panel || !data.frameDifference) return;

    panel.innerHTML = `
        <div class="metric-row">
            <span>Frame Difference:</span>
            <span>${(data.frameDifference.difference || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Motion Ratio:</span>
            <span>${(data.frameDifference.motion || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Temporal Coherence:</span>
            <span>${(data.temporalCoherence?.coherenceScore || 0).toFixed(4)}</span>
        </div>
    `;
}

function updateSpectralMetrics(data) {
    const panel = document.getElementById('spectralMetrics');
    if (!panel || !data.spectralAnalysis) return;

    panel.innerHTML = `
        <div class="metric-row">
            <span>Dominant Frequency:</span>
            <span>${(data.spectralAnalysis.dominantFrequency || 0).toFixed(2)} Hz</span>
        </div>
        <div class="metric-row">
            <span>Spectral Flatness:</span>
            <span id="spectralFlatnessMetrics">${
                typeof data.spectralFlatness !== "undefined"
                    ? Number(data.spectralFlatness).toFixed(4)
                    : (data.spectralAnalysis?.spectralFlatness !== undefined
                        ? Number(data.spectralAnalysis.spectralFlatness).toFixed(4)
                        : '-')
            }</span>
        </div>
    `;
}

function updateEdgeMetrics(data) {
    const panel = document.getElementById('edgeMetrics');
    if (!panel || !data.edgeDetection) return;

    panel.innerHTML = `
        <div class="metric-row">
            <span>Edge Density:</span>
            <span>${(data.edgeDetection.edgeDensity || 0).toFixed(4)}</span>
        </div>
        <div class="metric-row">
            <span>Edge Count:</span>
            <span>${data.edgeDetection.edgeCount || 0}</span>
        </div>
        <div class="metric-row">
            <span>Edge Change Rate:</span>
            <span>${(data.edgeDetection.temporalEdgeChange || 0).toFixed(4)}</span>
        </div>
    `;
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'UPDATE_UI' || message.type === 'ANALYSIS_UPDATE') {
        updateUI(message.data);
    }
});

function updateMetricsGraph(data) {
    const canvas = document.getElementById('metricsGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store a rolling history of metrics
    if (!window.metricsHistory) window.metricsHistory = [];
    const maxPoints = 100;
    window.metricsHistory.push({
        brightness: data.brightness || 0,
        flashIntensity: data.intensity || 0,
        riskLevel: convertRiskToNumber(data.riskLevel)
    });
    if (window.metricsHistory.length > maxPoints) window.metricsHistory.shift();

    drawMetricsGraph(ctx, window.metricsHistory, canvas.width, canvas.height);
    updateMetricsLegend();
}

function drawMetricsGraph(ctx, history, width, height) {
    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.lineTo(30, height - 10);
    ctx.lineTo(width - 10, height - 10);
    ctx.stroke();

    const metrics = [
        { key: "brightness", color: "#2196f3", label: "Brightness" },
        { key: "flashIntensity", color: "#f44336", label: "Flash Intensity" },
        { key: "riskLevel", color: "#ff9800", label: "Risk" }
    ];

    metrics.forEach((metric, _idx) => {
        ctx.beginPath();
        ctx.strokeStyle = metric.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < history.length; i++) {
            const x = 30 + ((width - 40) * i) / (history.length - 1);
            let y = height - 10 - history[i][metric.key] * (height - 20);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    });


}

function updateMetricsLegend() {
    const legendDiv = document.getElementById('metricsLegend');
    if (!legendDiv) return;
    const metrics = [
        { color: "#2196f3", label: "Brightness" },
        { color: "#f44336", label: "Flash Intensity" },
        { color: "#ff9800", label: "Risk" }
    ];
    legendDiv.innerHTML = metrics.map(m =>
        `<span style="display:inline-flex;align-items:center;margin-right:18px;">
            <span style="display:inline-block;width:14px;height:14px;background:${m.color};border-radius:3px;margin-right:6px;"></span>
            <span style="color:#fff;font-size:13px;">${m.label}</span>
        </span>`
    ).join('');
}

function convertRiskToNumber(risk) {
    return risk === 'high' ? 1 : risk === 'medium' ? 0.5 : 0;
}

function togglePlayback() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'TOGGLE_PLAYBACK'});
    });
}


function skipVideo(seconds) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'SKIP_VIDEO',
            seconds: seconds
        });
    });
}

function openChartsTab() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        // Pause the video
        chrome.tabs.sendMessage(tabs[0].id, { action: 'PAUSE_VIDEO' }, function() {
            // Request the latest analysis data as JSON and CSV
            chrome.tabs.sendMessage(tabs[0].id, { action: 'EXPORT_DATA', format: 'json' }, function(responseJson) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'EXPORT_DATA' }, function(responseCsv) {
                    const tasks = [];
                    if (responseJson && responseJson.json) {
                        tasks.push(new Promise(resolve => {
                            chrome.storage.local.set({ epilensAnalysisData: responseJson.json }, resolve);
                        }));
                    }
                    if (responseCsv && responseCsv.csv) {
                        tasks.push(new Promise(resolve => {
                            chrome.storage.local.set({ epilensAnalysisCSV: responseCsv.csv }, resolve);
                        }));
                    }
                    Promise.all(tasks).then(() => {
                        chrome.tabs.create({ url: chrome.runtime.getURL('charts.html') });
                    });
                });
            });
        });
    });
}

function openFileAnalyzerTab() {
    chrome.tabs.create({ url: chrome.runtime.getURL('fileanalyzer.html') });
}

function clearAllData() {
    chrome.storage.local.remove(['epilensAnalysisData', 'epilensAnalysisCSV']);
}