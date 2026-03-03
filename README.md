# ChromaPulse 🎨

> AI-powered color palette generator with harmony rules, Pantone matching, and beautiful exports.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![No Backend Required](https://img.shields.io/badge/backend-none%20required-green.svg)

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
- **Keyboard Shortcuts** — `Spacebar` to generate, `Enter` for prompt

---

## 🚀 Getting Started

### Option 1: Open Directly

Simply open `index.html` in your browser. The app works out of the box with offline keyword matching.

### Option 2: Local Server (Recommended for AI features)

```bash
# Using Python
python -m http.server 8484

# Or using the included script (Windows)
start.bat
```

Then visit [http://localhost:8484](http://localhost:8484).

### Option 3: GitHub Pages

This app is a static site — you can host it on GitHub Pages:

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **main** branch, root `/`
4. Your app will be live at `https://iclickthemouse.github.io/ChromaPulse/`

---

## 🤖 AI Providers

ChromaPulse supports multiple AI backends for enhanced palette generation:

| Provider | Cost | Setup |
|---|---|---|
| **🏠 Ollama** | Free | Local install — see [docs/OLLAMA_SETUP.md](docs/OLLAMA_SETUP.md) |
| **⚡ Groq** | Free tier | [Get API key](https://console.groq.com/keys) |
| **🔑 OpenAI** | Pay-per-use | [Get API key](https://platform.openai.com/api-keys) |
| **🌐 OpenRouter** | Varies | [Get API key](https://openrouter.ai/keys) |

> **Note**: AI features are optional. The app works fully offline with its built-in keyword engine.

For Ollama setup, see the comprehensive guide: **[docs/OLLAMA_SETUP.md](docs/OLLAMA_SETUP.md)**

---

## 🔒 Security & Privacy

ChromaPulse is designed with privacy in mind:

- **No backend server** — 100% client-side static HTML/JS/CSS
- **No data collection** — Zero analytics, tracking, or telemetry
- **API keys stored locally** — Keys are saved in your browser's `localStorage` only. They are **never** sent to any server other than the AI provider you configured.
- **Ollama runs locally** — When using Ollama, all AI processing happens on your machine
- **No hardcoded secrets** — The repository contains zero API keys or credentials

### Important for Contributors

- **Never commit API keys** — The `.gitignore` excludes `.env` files
- API keys are entered by each user in their own browser and stored in `localStorage`
- Cloud API calls (OpenAI, Groq, OpenRouter) go directly from the browser to the provider's API

---

## 📁 Project Structure

```
ChromaPulse/
├── index.html          # Main app HTML
├── app.js              # Core application logic
├── styles.css          # Application styles
├── onboarding.js       # First-launch guided tour
├── onboarding.css      # Tour styles
├── pantone.js          # Pantone color database
├── start.bat           # Windows quick-start script
├── chromapulse.py      # Desktop app wrapper (pywebview)
├── docs/
│   └── OLLAMA_SETUP.md # Ollama setup guide
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

---

## 🎨 Screenshots

> Launch the app and press `Spacebar` to generate your first palette!

---

## 🛠️ Development

No build step required — this is pure HTML/CSS/JS. Just edit and refresh.

```bash
# Start local server
python -m http.server 8484

# Open in browser
start http://localhost:8484
```

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

## 🙏 Credits

- **Pantone** color matching data
- **Ollama** for local AI inference
- **Inter** & **JetBrains Mono** fonts from Google Fonts
