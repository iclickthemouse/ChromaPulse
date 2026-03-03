"""
ChromaPulse — Desktop Application Launcher
Wraps the web app in a native window using pywebview + built-in HTTP server.
"""

import os
import sys
import threading
import http.server
import socketserver
import socket
import webview


def get_app_dir():
    """Get the directory containing the app files."""
    if getattr(sys, 'frozen', False):
        # Running as compiled exe — PyInstaller extracts data files here
        return sys._MEIPASS
    else:
        # Running as script
        return os.path.dirname(os.path.abspath(__file__))


def find_free_port():
    """Find a free port to serve on."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]


def start_server(directory, port):
    """Start a simple HTTP server in a background thread."""
    os.chdir(directory)
    handler = http.server.SimpleHTTPRequestHandler
    handler.log_message = lambda *args: None  # Suppress logs

    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def main():
    app_dir = get_app_dir()
    port = find_free_port()

    # Start local HTTP server
    httpd = start_server(app_dir, port)
    url = f"http://127.0.0.1:{port}/index.html"

    # Create native window
    window = webview.create_window(
        title="ChromaPulse — Color Palette Generator",
        url=url,
        width=1280,
        height=820,
        min_size=(900, 600),
        background_color="#0f0f13",
        text_select=True,
    )

    # Start the GUI event loop (blocks until window is closed)
    webview.start(
        gui="edgechromium",  # Use WebView2 on Windows
        debug=False,
    )

    # Cleanup
    httpd.shutdown()


if __name__ == "__main__":
    main()
