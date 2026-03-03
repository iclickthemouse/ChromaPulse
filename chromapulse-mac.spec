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
        ('docs', 'docs'),
    ],
    hiddenimports=['webview'],
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
    [],
    exclude_binaries=True,
    name='ChromaPulse',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ChromaPulse',
)

app = BUNDLE(
    coll,
    name='ChromaPulse.app',
    bundle_identifier='com.chromapulse.app',
    info_plist={
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleName': 'ChromaPulse',
        'NSHighResolutionCapable': True,
    },
)
