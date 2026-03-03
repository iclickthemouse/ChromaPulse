# -*- mode: python ; coding: utf-8 -*-
import os

app_dir = os.path.dirname(os.path.abspath(SPEC))

a = Analysis(
    ['chromapulse.py'],
    pathex=[app_dir],
    binaries=[],
    datas=[
        ('index.html', '.'),
        ('styles.css', '.'),
        ('app.js', '.'),
        ('pantone.js', '.'),
        ('onboarding.js', '.'),
        ('onboarding.css', '.'),
        ('icon.ico', '.'),
        ('docs', 'docs'),
    ],
    hiddenimports=['webview', 'clr'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='ChromaPulse',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    icon='icon.ico',
    onefile=True,
)
