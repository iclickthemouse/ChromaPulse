# 🏠 Setting Up Ollama for ChromaPulse

Ollama lets you run AI models **locally on your machine** — completely free, private, and offline.
ChromaPulse uses Ollama to generate intelligent, context-aware color palettes from natural language prompts.

---

## Prerequisites

| Requirement | Details |
|---|---|
| **OS** | Windows 10/11, macOS 12+, or Linux |
| **RAM** | 8GB minimum (16GB recommended) |
| **VRAM (GPU)** | 4GB+ VRAM recommended for best speed. CPU-only works but is slower. |
| **Disk Space** | ~2–20GB depending on model size |

---

## Step 1: Install Ollama

1. Visit the **Ollama download page**: [https://ollama.com/download](https://ollama.com/download)
2. Download the installer for your platform:
   - **Windows**: Run the `.exe` installer
   - **macOS**: Download and drag to Applications, or use `brew install ollama`
   - **Linux**: Run the install script:
     ```bash
     curl -fsSL https://ollama.com/install.sh | sh
     ```
3. After installation, Ollama will run as a background service automatically.

### Verify Installation

Open a terminal or command prompt and run:

```bash
ollama --version
```

You should see a version number like `ollama version 0.x.x`.

---

## Step 2: Pull a Model

ChromaPulse works best with the **Qwen** family of models. Choose one based on your hardware:

### Recommended Models

| Model | Size | VRAM Needed | Quality | Command |
|---|---|---|---|---|
| **Qwen 3.5 35B** ⭐ | ~20GB | 24GB+ | Best | `ollama pull qwen3.5:35b-a3b` |
| **Qwen 3 8B** | ~5GB | 6GB+ | Great | `ollama pull qwen3:8b` |
| **Qwen 2.5 7B** | ~4.5GB | 5GB+ | Good | `ollama pull qwen2.5:7b` |
| **Qwen 2.5 3B** | ~2GB | 3GB+ | Fast | `ollama pull qwen2.5:3b` |
| **Qwen 2.5 1.5B** | ~1GB | 2GB+ | Fastest | `ollama pull qwen2.5:1.5b` |

> **💡 Tip**: If you're unsure, start with `qwen3:8b` — it's a great balance of quality and speed.

Run your chosen pull command in a terminal:

```bash
ollama pull qwen3:8b
```

Wait for the download to complete (this may take several minutes depending on your connection).

---

## Step 3: Verify Ollama Is Running

Ollama runs as a local server on port `11434`. To verify it's running:

```bash
ollama list
```

You should see your downloaded model(s) listed.

You can also test by visiting [http://localhost:11434](http://localhost:11434) in your browser — you should see `"Ollama is running"`.

---

## Step 4: Configure ChromaPulse

1. Open ChromaPulse
2. Click the **⚙️ Settings** button (gear icon) in the top-right corner
3. Set **Provider** to `🏠 Ollama (local, free)`
4. Select your **Model** from the dropdown (e.g., `Qwen 3 8B`)
5. Leave **Ollama Host** as `http://localhost:11434` (default)
6. Click **🔌 Test** to verify the connection
7. If successful, you'll see a green status message — click **Save**

---

## Step 5: Generate AI Palettes

With Ollama configured:

1. Type a description in the **prompt bar** (e.g., "cozy autumn cabin", "Detroit Lions", "cyberpunk neon city")
2. Hit **Generate** or press **Enter**
3. ChromaPulse will query your local AI model and return a context-aware palette

---

## Troubleshooting

### "Connection refused" or "Cannot reach Ollama"

- Make sure Ollama is running. On Windows, check your system tray for the Ollama icon.
- On macOS/Linux, start it manually:
  ```bash
  ollama serve
  ```
- Verify at [http://localhost:11434](http://localhost:11434)

### Model crashes or is too slow

- Your GPU may not have enough VRAM. Try a smaller model:
  ```bash
  ollama pull qwen2.5:3b
  ```
- ChromaPulse automatically unloads other models to free VRAM before generating.

### CORS Errors (when opening `index.html` directly)

If you open `index.html` as a file (not via a server), browsers may block requests to Ollama.

**Fix — Set the CORS environment variable:**

- **Windows (PowerShell)**:
  ```powershell
  $env:OLLAMA_ORIGINS="*"
  ollama serve
  ```
- **Windows (Command Prompt)**:
  ```cmd
  set OLLAMA_ORIGINS=*
  ollama serve
  ```
- **macOS/Linux**:
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```

Or simply use ChromaPulse's built-in server:
```bash
# From the ChromaPulse directory
python -m http.server 8484
```
Then visit [http://localhost:8484](http://localhost:8484).

### Ollama Works but Colors Are Wrong

- Try a larger model — smaller models may sometimes return inaccurate brand/team colors.
- The `qwen3.5:35b-a3b` model has the best color knowledge.
- ChromaPulse always falls back to its offline keyword engine if the LLM response can't be parsed.

---

## Advanced: Custom Models

You can use any model available on [ollama.com/library](https://ollama.com/library):

1. Pull any model: `ollama pull <model-name>`
2. In ChromaPulse settings, select **Custom model...** from the dropdown
3. Type the exact model name (e.g., `llama3.1:8b`)

---

## Advanced: Remote Ollama Server

If you're running Ollama on another machine (e.g., a GPU server):

1. On the server, start Ollama with:
   ```bash
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```
2. In ChromaPulse settings, change **Ollama Host** to `http://<server-ip>:11434`

---

## Uninstalling a Model

To free disk space, remove models you no longer need:

```bash
ollama rm qwen2.5:7b
```

---

## Need Help?

- **Ollama Documentation**: [https://github.com/ollama/ollama](https://github.com/ollama/ollama)
- **Ollama Model Library**: [https://ollama.com/library](https://ollama.com/library)
- **ChromaPulse Issues**: File an issue on the [GitHub repository](https://github.com/iclickthemouse/ChromaPulse/issues)
