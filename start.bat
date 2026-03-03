@echo off
title ChromaPulse
echo.
echo  ============================================
echo   ChromaPulse — Color Palette Generator
echo  ============================================
echo.
echo  Starting local server on http://localhost:8484
echo  Press Ctrl+C to stop.
echo.

:: Open browser after a short delay
start "" "http://localhost:8484"

:: Serve via Python (try py, then python)
py -m http.server 8484 2>nul || python -m http.server 8484 2>nul || (
    echo.
    echo  ERROR: Python not found. Please install Python from https://python.org
    echo  Or open index.html directly and set OLLAMA_ORIGINS=* in your environment.
    echo.
    pause
)
