const express = require('express');
const proxy = require('express-http-proxy');
const rateLimit = require('express-rate-limit');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting to protect your server
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests. Please try again later.'
});
app.use('/proxy', limiter);

// Main Portal Page with Top Navigation Bar and Embedded Iframe
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nexus Browser</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-dark: #0f172a;
                    --bar-bg: #1e293b;
                    --accent: #38bdf8;
                    --accent-hover: #0284c7;
                    --text: #f8fafc;
                    --muted: #94a3b8;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
                body, html { height: 100%; width: 100%; overflow: hidden; background-color: var(--bg-dark); }

                /* Top Navigation Bar */
                .navbar {
                    height: 60px;
                    background-color: var(--bar-bg);
                    display: flex;
                    align-items: center;
                    padding: 0 20px;
                    gap: 12px;
                    border-bottom: 1px solid #334155;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                .brand {
                    font-size: 1.2rem;
                    font-weight: 700;
                    background: linear-gradient(to right, #38bdf8, #818cf8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-right: 10px;
                    cursor: pointer;
                }
                .nav-btn {
                    background: #334155;
                    color: var(--text);
                    border: none;
                    padding: 8px 14px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                .nav-btn:hover { background: var(--accent); color: #0f172a; }
                
                .url-input {
                    flex: 1;
                    background: #0f172a;
                    border: 1px solid #334155;
                    color: #fff;
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    outline: none;
                    transition: border 0.2s ease;
                }
                .url-input:focus { border-color: var(--accent); }

                /* Main Web Content Frame */
                .content-container {
                    height: calc(100vh - 60px);
                    width: 100%;
                    position: relative;
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: #ffffff;
                }

                /* Initial Landing View Inside Frame Container */
                .welcome-screen {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--bg-dark);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    color: var(--text);
                    z-index: 10;
                }
                .welcome-card {
                    background: var(--bar-bg);
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    max-width: 480px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                }
                .welcome-card h2 { margin-bottom: 10px; }
                .welcome-card p { color: var(--muted); margin-bottom: 20px; }
                .quick-links { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
                .chip {
                    background: #334155;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .chip:hover { background: var(--accent); color: #0f172a; }
            </style>
        </head>
        <body>

            <!-- Navigation Bar -->
            <div class="navbar">
                <div class="brand" onclick="goHome()">NEXUS</div>
                <button class="nav-btn" onclick="goHome()">🏠 Home</button>
                <button class="nav-btn" onclick="reloadFrame()">🔄 Reload</button>
                <input type="text" id="targetUrl" class="url-input" placeholder="Enter target URL (e.g. https://httpbin.org/get)">
                <button class="nav-btn" style="background: var(--accent); color: #0f172a;" onclick="navigate()">Go</button>
            </div>

            <!-- Content Area -->
            <div class="content-container">
                <div id="welcomeScreen" class="welcome-screen">
                    <div class="welcome-card">
                        <h2>Nexus Proxy Gateway</h2>
                        <p>Type a URL into the top bar or pick a sample endpoint to begin browsing.</p>
                        <div class="quick-links">
                            <span class="chip" onclick="quickNav('https://httpbin.org/get')">HTTPBin</span>
                            <span class="chip" onclick="quickNav('https://jsonplaceholder.typicode.com/posts/1')">JSON Placeholder</span>
                        </div>
                    </div>
                </div>
                <iframe id="webFrame" style="display: none;"></iframe>
            </div>

            <script>
                const frame = document.getElementById('webFrame');
                const welcome = document.getElementById('welcomeScreen');
                const urlInput = document.getElementById('targetUrl');

                function navigate() {
                    let input = urlInput.value.trim();
                    if (!input) return;

                    if (!/^https?:\/\//i.test(input)) {
                        input = 'http://' + input;
                    }

                    // Hide welcome screen and display iframe loaded via proxy endpoint
                    welcome.style.display = 'none';
                    frame.style.display = 'block';
                    frame.src = '/proxy?url=' + encodeURIComponent(input);
                }

                function quickNav(url) {
                    urlInput.value = url;
                    navigate();
                }

                function reloadFrame() {
                    if (frame.src) frame.contentWindow.location.reload();
                }

                function goHome() {
                    frame.style.display = 'none';
                    welcome.style.display = 'flex';
                    urlInput.value = '';
                }

                urlInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') navigate();
                });
            </script>
        </body>
        </html>
    `);
});

// Helper function to block local host addresses
function isLocalAddress(hostname) {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname === '169.254.169.254'
    );
}

// Proxy Engine Route
app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;

    if (!targetUrl) return res.status(400).send('Error: Missing "url" parameter.');

    try {
        const parsedUrl = new url.URL(targetUrl);

        if (isLocalAddress(parsedUrl.hostname)) {
            return res.status(403).send('Forbidden: Access to local network addresses is blocked.');
        }

        const host = `${parsedUrl.protocol}//${parsedUrl.host}`;

        return proxy(host, {
            proxyReqPathResolver: () => parsedUrl.pathname + parsedUrl.search,
            userResHeaderDecorator(headers) {
                // Strip restrictive iframe blocking headers so pages load inside the interface
                delete headers['x-frame-options'];
                delete headers['content-security-policy'];
                return headers;
            }
        })(req, res, next);

    } catch (err) {
        return res.status(400).send('Invalid URL provided.');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
