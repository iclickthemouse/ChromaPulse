// ===== ChromaPulse — First-Launch Onboarding Tour =====
// Shows a guided walkthrough on the first visit. Stores completion in localStorage.

(function () {
    'use strict';

    const ONBOARDING_KEY = 'chromapulse_onboarding_complete';

    // Check if onboarding has already been completed
    if (localStorage.getItem(ONBOARDING_KEY)) return;

    // ─── Tour Steps ────────────────────────────────────────────
    const STEPS = [
        {
            target: null, // Welcome — no target, centered modal
            title: 'Welcome to ChromaPulse ✨',
            body: `
                <p>Your AI-powered color palette generator with harmony rules, Pantone matching, and beautiful exports.</p>
                <p style="margin-top:12px;color:var(--text-dim);font-size:0.82rem;">Let's take a quick tour of the interface — it only takes a minute.</p>
            `,
            position: 'center',
            icon: '🎨'
        },
        {
            target: '#harmony-selector',
            title: 'Harmony Modes',
            body: `
                <p>Choose from <strong>9 color harmony modes</strong> — Random, Analogous, Complementary, Triadic, Split, Tetradic, Mono, Compound, and Shades.</p>
                <p style="margin-top:8px;color:var(--text-dim);font-size:0.8rem;">Each mode follows real color theory rules to create cohesive palettes.</p>
            `,
            position: 'bottom',
            icon: '🎯'
        },
        {
            target: '#prompt-bar',
            title: 'AI Prompt Bar',
            body: `
                <p>Describe a mood, theme, or scene in natural language — like <em>"cozy autumn cabin"</em> or <em>"Detroit Lions"</em>.</p>
                <p style="margin-top:8px;color:var(--text-dim);font-size:0.8rem;">Works <strong>offline</strong> with 100+ smart keywords. Connect an AI model for richer results.</p>
            `,
            position: 'bottom',
            icon: '✨'
        },
        {
            target: '#palette-container',
            title: 'Color Palette',
            body: `
                <p>Your generated palette appears here. <strong>Hover</strong> any color to see its hex, RGB, and Pantone match.</p>
                <ul style="margin-top:8px;font-size:0.8rem;color:var(--text-dim);padding-left:16px;">
                    <li><strong>Click</strong> a hex code to copy it</li>
                    <li><strong>🔒 Lock</strong> colors you want to keep</li>
                    <li><strong>🎨 Pick</strong> to choose a custom color</li>
                    <li><strong>🔄 Remix</strong> to generate variants from one color</li>
                </ul>
            `,
            position: 'center',
            icon: '🎲'
        },
        {
            target: '#bottom-bar',
            title: 'Bottom Toolbar',
            body: `
                <p>Control palette size (3–7 colors), <strong>Generate</strong> new palettes, and export your work.</p>
                <ul style="margin-top:8px;font-size:0.8rem;color:var(--text-dim);padding-left:16px;">
                    <li><strong>💾 Save</strong> — Store palettes as presets</li>
                    <li><strong>📋 Text</strong> — Copy palette data to clipboard</li>
                    <li><strong>📸 Image</strong> — Export as PNG swatch cards</li>
                    <li><strong>Spacebar</strong> — Quick generate shortcut!</li>
                </ul>
            `,
            position: 'top',
            icon: '🛠️'
        },
        {
            target: '#btn-trending',
            title: 'Trending Palettes',
            body: `
                <p>Browse <strong>curated trending palettes</strong> — including Pantone Color of the Year, seasonal trends, and popular design themes.</p>
                <p style="margin-top:8px;color:var(--text-dim);font-size:0.8rem;">Click any trending palette to load it instantly.</p>
            `,
            position: 'bottom-left',
            icon: '📊'
        },
        {
            target: '#btn-presets',
            title: 'Saved Presets',
            body: `
                <p>All your saved palettes live here. Build a personal library of color schemes for your projects.</p>
                <p style="margin-top:8px;color:var(--text-dim);font-size:0.8rem;">Presets are stored locally in your browser — they persist between sessions.</p>
            `,
            position: 'bottom-left',
            icon: '💾'
        },
        {
            target: '#btn-settings',
            title: 'AI Agent Settings',
            body: `
                <p>Configure your <strong>AI backend</strong> for smarter palette generation:</p>
                <ul style="margin-top:8px;font-size:0.8rem;color:var(--text-dim);padding-left:16px;">
                    <li><strong>🏠 Ollama</strong> — Free, local, private (recommended)</li>
                    <li><strong>🔑 OpenAI</strong> — GPT-4o / GPT-4.1</li>
                    <li><strong>⚡ Groq</strong> — Free tier with Llama 3.3</li>
                    <li><strong>🌐 OpenRouter</strong> — Access multiple models</li>
                </ul>
                <div style="margin-top:12px;padding:10px 14px;background:rgba(78,205,196,0.08);border:1px solid rgba(78,205,196,0.2);border-radius:8px;font-size:0.8rem;">
                    📄 <strong>Ollama setup guide:</strong> See <a href="https://github.com/iclickthemouse/ChromaPulse/blob/main/docs/OLLAMA_SETUP.md" target="_blank" style="color:#4ecdc4;text-decoration:underline;">OLLAMA_SETUP.md</a> for step-by-step instructions.
                </div>
            `,
            position: 'bottom-left',
            icon: '⚙️'
        },
        {
            target: null, // Finale — centered
            title: 'You\'re All Set! 🚀',
            body: `
                <p>Hit <kbd style="font-family:var(--mono,'JetBrains Mono',monospace);background:rgba(167,139,250,0.2);padding:3px 8px;border-radius:4px;font-size:0.85rem;">Spacebar</kbd> to generate palettes anytime.</p>
                <p style="margin-top:12px;color:var(--text-dim);font-size:0.82rem;">You can always revisit this tour from the settings menu. Have fun creating!</p>
            `,
            position: 'center',
            icon: '🎉'
        }
    ];

    // ─── State ─────────────────────────────────────────────────
    let currentStep = 0;

    // ─── DOM Builders ──────────────────────────────────────────

    // Main overlay
    const overlayEl = document.createElement('div');
    overlayEl.id = 'onboarding-overlay';
    overlayEl.className = 'onboarding-overlay';

    // Spotlight (highlight cutout)
    const spotlightEl = document.createElement('div');
    spotlightEl.id = 'onboarding-spotlight';
    spotlightEl.className = 'onboarding-spotlight';

    // Tooltip
    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'onboarding-tooltip';
    tooltipEl.className = 'onboarding-tooltip';

    // Progress dots
    function buildProgressDots() {
        return STEPS.map((_, i) =>
            `<span class="onboarding-dot${i === currentStep ? ' active' : ''}${i < currentStep ? ' done' : ''}" data-step="${i}"></span>`
        ).join('');
    }

    function renderTooltip() {
        const step = STEPS[currentStep];
        const isFirst = currentStep === 0;
        const isLast = currentStep === STEPS.length - 1;
        const stepLabel = `${currentStep + 1} / ${STEPS.length}`;

        tooltipEl.innerHTML = `
            <div class="onboarding-tooltip-header">
                <span class="onboarding-tooltip-icon">${step.icon}</span>
                <span class="onboarding-tooltip-step">${stepLabel}</span>
            </div>
            <h3 class="onboarding-tooltip-title">${step.title}</h3>
            <div class="onboarding-tooltip-body">${step.body}</div>
            <div class="onboarding-tooltip-footer">
                <div class="onboarding-dots">${buildProgressDots()}</div>
                <div class="onboarding-tooltip-actions">
                    <button class="onboarding-btn-skip" id="onboarding-skip">${isLast ? '' : 'Skip Tour'}</button>
                    <div style="display:flex;gap:6px;">
                        ${!isFirst ? '<button class="onboarding-btn-back" id="onboarding-back">← Back</button>' : ''}
                        <button class="onboarding-btn-next" id="onboarding-next">
                            ${isLast ? '🎉 Start Creating' : isFirst ? 'Start Tour →' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Positioning ───────────────────────────────────────────
    function positionTooltip() {
        const step = STEPS[currentStep];
        const targetEl = step.target ? document.querySelector(step.target) : null;

        // Reset spotlight
        spotlightEl.style.display = 'none';
        overlayEl.classList.remove('with-spotlight');

        if (!targetEl || step.position === 'center') {
            // Centered modal
            tooltipEl.style.position = 'fixed';
            tooltipEl.style.top = '50%';
            tooltipEl.style.left = '50%';
            tooltipEl.style.transform = 'translate(-50%, -50%)';
            tooltipEl.style.bottom = '';
            tooltipEl.style.right = '';
            tooltipEl.removeAttribute('data-arrow');
            return;
        }

        // Get target bounds
        const rect = targetEl.getBoundingClientRect();
        const pad = 12;
        const tooltipW = Math.min(400, window.innerWidth - 32);

        // Show spotlight
        overlayEl.classList.add('with-spotlight');
        spotlightEl.style.display = 'block';
        spotlightEl.style.top = `${rect.top - 6}px`;
        spotlightEl.style.left = `${rect.left - 6}px`;
        spotlightEl.style.width = `${rect.width + 12}px`;
        spotlightEl.style.height = `${rect.height + 12}px`;

        // Position tooltip
        tooltipEl.style.position = 'fixed';
        tooltipEl.style.transform = '';

        switch (step.position) {
            case 'bottom':
                tooltipEl.style.top = `${rect.bottom + pad}px`;
                tooltipEl.style.left = `${Math.max(16, rect.left + rect.width / 2 - tooltipW / 2)}px`;
                tooltipEl.style.bottom = '';
                tooltipEl.style.right = '';
                tooltipEl.setAttribute('data-arrow', 'top');
                break;
            case 'bottom-left':
                tooltipEl.style.top = `${rect.bottom + pad}px`;
                tooltipEl.style.left = '';
                tooltipEl.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;
                tooltipEl.style.bottom = '';
                tooltipEl.setAttribute('data-arrow', 'top-right');
                break;
            case 'top':
                tooltipEl.style.bottom = `${window.innerHeight - rect.top + pad}px`;
                tooltipEl.style.left = `${Math.max(16, rect.left + rect.width / 2 - tooltipW / 2)}px`;
                tooltipEl.style.top = '';
                tooltipEl.style.right = '';
                tooltipEl.setAttribute('data-arrow', 'bottom');
                break;
            default:
                tooltipEl.style.top = `${rect.bottom + pad}px`;
                tooltipEl.style.left = `${Math.max(16, rect.left)}px`;
                tooltipEl.style.bottom = '';
                tooltipEl.style.right = '';
                tooltipEl.setAttribute('data-arrow', 'top');
        }

        // Ensure tooltip doesn't overflow viewport
        requestAnimationFrame(() => {
            const tr = tooltipEl.getBoundingClientRect();
            if (tr.right > window.innerWidth - 16) {
                tooltipEl.style.left = `${window.innerWidth - tr.width - 16}px`;
            }
            if (tr.bottom > window.innerHeight - 16) {
                tooltipEl.style.top = '';
                tooltipEl.style.bottom = '16px';
            }
        });
    }

    // ─── Navigation ────────────────────────────────────────────
    function goToStep(idx) {
        currentStep = Math.max(0, Math.min(idx, STEPS.length - 1));
        renderTooltip();
        positionTooltip();
        tooltipEl.style.animation = 'none';
        void tooltipEl.offsetHeight; // Trigger reflow
        tooltipEl.style.animation = 'onboardingPop 0.25s ease';
    }

    function nextStep() {
        if (currentStep >= STEPS.length - 1) {
            complete();
        } else {
            goToStep(currentStep + 1);
        }
    }

    function prevStep() {
        goToStep(currentStep - 1);
    }

    function complete() {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        overlayEl.style.opacity = '0';
        tooltipEl.style.opacity = '0';
        spotlightEl.style.opacity = '0';
        setTimeout(() => {
            overlayEl.remove();
            spotlightEl.remove();
            tooltipEl.remove();
        }, 300);
    }

    // ─── Event Handlers ────────────────────────────────────────
    function handleTooltipClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.id === 'onboarding-next') nextStep();
        else if (btn.id === 'onboarding-back') prevStep();
        else if (btn.id === 'onboarding-skip') complete();
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') complete();
        if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
        if (e.key === 'ArrowLeft') prevStep();
    }

    // ─── Public API for re-triggering ──────────────────────────
    window.chromaPulseRestartTour = function () {
        localStorage.removeItem(ONBOARDING_KEY);
        currentStep = 0;
        document.body.appendChild(overlayEl);
        document.body.appendChild(spotlightEl);
        document.body.appendChild(tooltipEl);
        renderTooltip();
        positionTooltip();
        overlayEl.style.opacity = '1';
        tooltipEl.style.opacity = '1';
        spotlightEl.style.opacity = '1';
    };

    // ─── Initialize ────────────────────────────────────────────
    function init() {
        document.body.appendChild(overlayEl);
        document.body.appendChild(spotlightEl);
        document.body.appendChild(tooltipEl);

        tooltipEl.addEventListener('click', handleTooltipClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', () => positionTooltip());

        // Prevent spacebar palette generation during onboarding
        document.addEventListener('keydown', function onboardingBlock(e) {
            if (!document.getElementById('onboarding-overlay')) {
                document.removeEventListener('keydown', onboardingBlock);
                return;
            }
            if (e.code === 'Space') e.stopImmediatePropagation();
        }, true);

        renderTooltip();
        positionTooltip();
    }

    // Wait for app to render first
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }
})();
