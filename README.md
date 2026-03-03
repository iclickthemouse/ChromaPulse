# ChromaPulse 🎨

> AI-powered color palette generator with harmony rules, Pantone matching, and beautiful exports.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-0078D6.svg)
![Offline](https://img.shields.io/badge/works-offline-green.svg)

---

## ⬇️ Download

Grab the latest build from the [Releases page](https://github.com/iclickthemouse/ChromaPulse/releases/latest):

| Platform | Download |
|---|---|
| **Windows** | `ChromaPulse.exe` — double-click to run |
| **macOS** | `ChromaPulse.dmg` — drag to Applications |

No install needed. Works offline out of the box.

---

## ✨ Features

- **9 Harmony Modes** — Random, Analogous, Complementary, Triadic, Split-Complementary, Tetradic, Monochromatic, Compound, Shades
- **AI Prompt Generation** — Describe a mood, brand, or scene in natural language
- **100+ Offline Keywords** — Works without any AI backend using smart keyword matching
- **Pantone Matching** — Closest Pantone color match for every swatch
- **Preset Library** — Save and load your favorite palettes
- **Trending Palettes** — Curated collection including Pantone Color of the Year
- **Beautiful Exports** — PNG swatch cards (full palette + individual cards)
- **Color Picker** — Click any color to customize with native color picker
- **Lock & Remix** — Lock colors you like, regenerate the rest
- **LLM Debug Log** — See raw AI responses for transparency
- **Guided Onboarding** — First-launch tour walks you through every feature
- **Keyboard Shortcuts** — `Spacebar` to generate, `Enter` for prompt

---

## 🚀 Getting Started

### Option 1: Standalone App (Recommended)

1. Download from the [Releases page](https://github.com/iclickthemouse/ChromaPulse/releases/latest)
2. **Windows**: Run `ChromaPulse.exe` — opens in its own native window
3. **macOS**: Open `ChromaPulse.dmg`, drag to Applications, launch
4. No Python, no browser, no install needed

### Option 2: Run from Source

If you prefer running from source or want to develop:

```bash
# Clone the repo
git clone https://github.com/iclickthemouse/ChromaPulse.git
cd ChromaPulse

# Start local server
python -m http.server 8484

# Or use the included script (Windows)
start.bat
```

Then visit [http://localhost:8484](http://localhost:8484).

---

## 🤖 AI Providers

ChromaPulse supports multiple AI backends for enhanced palette generation:

| Provider | Cost | Setup |
|---|---|---|
| **🏠 Ollama** | Free | Local, private — see [Ollama Setup Guide](docs/OLLAMA_SETUP.md) |
| **⚡ Groq** | Free tier | [Get API key](https://console.groq.com/keys) |
| **🔑 OpenAI** | Pay-per-use | [Get API key](https://platform.openai.com/api-keys) |
| **🌐 OpenRouter** | Varies | [Get API key](https://openrouter.ai/keys) |

> **Note**: AI is optional. ChromaPulse works fully offline with its built-in keyword engine (100+ keywords). Connect an AI provider for richer, context-aware results.

For local AI setup, see: **[docs/OLLAMA_SETUP.md](docs/OLLAMA_SETUP.md)**

---

## 🔒 Security & Privacy

- **No data collection** — Zero analytics, tracking, or telemetry
- **No hardcoded secrets** — The repository contains zero API keys or credentials
- **API keys stay on your machine** — Stored in your browser's `localStorage` only, never sent anywhere except directly to the AI provider you chose
- **Ollama runs locally** — All AI processing happens on your machine
- **Open source** — Inspect every line of code yourself

---

## 📁 Project Structure

```
ChromaPulse/
├── index.html          # Main app HTML
├── app.js              # Core application logic (1700+ lines)
├── styles.css          # Application styles
├── onboarding.js       # First-launch guided tour
├── onboarding.css      # Tour styles
├── pantone.js          # Pantone color database
├── chromapulse.py      # Desktop app wrapper (pywebview)
├── chromapulse.spec    # PyInstaller build spec
├── start.bat           # Windows quick-start script
├── docs/
│   └── OLLAMA_SETUP.md # Ollama setup guide
└── README.md           # This file
```

---

## 🛠️ Building Locally

To build the standalone app yourself:

```bash
# Install dependencies
pip install pyinstaller pywebview

# Windows — single-file exe
pyinstaller chromapulse.spec --noconfirm --clean

# macOS — .app bundle + DMG
pyinstaller chromapulse-mac.spec --noconfirm --clean
```

Builds are also generated automatically via GitHub Actions when you create a release.

The exe will be in `dist/ChromaPulse.exe`.

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Credits

- **Pantone** color matching data
- **Ollama** for local AI inference
- **Inter** & **JetBrains Mono** fonts from Google Fonts
