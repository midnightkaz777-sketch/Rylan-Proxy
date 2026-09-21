const express = require('express');
const proxy = require('express-http-proxy');
const rateLimit = require('express-rate-limit');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Rate Limiter: Protects against abuse (max 100 requests per 15 min per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting specifically to the proxy endpoint
app.use('/proxy', limiter);

// 2. Serve the Web Interface on the Root Path
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Web Proxy Portal</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f6f9;
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .container {
                    background: #ffffff;
                    padding: 30px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    width: 100%;
                    max-width: 600px;
                }
                h1 {
                    margin-top: 0;
                    color: #333;
                }
                .input-group {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                input[type="text"] {
                    flex: 1;
                    padding: 12px;
                    font-size: 16px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                button {
                    padding: 12px 20px;
                    font-size: 16px;
                    background-color: #0066cc;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #0052a3;
                }
                .note {
                    margin-top: 15px;
                    font-size: 13px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Web Proxy Portal</h1>
                <p>Enter a web address below to view it through your proxy server.</p>
                <div class="input-group">
                    <input type="text" id="targetUrl" placeholder="https://jsonplaceholder.typicode.com/todos/1">
                    <button onclick="navigate()">Go</button>
                </div>
                <p class="note">Example: https://httpbin.org/get</p>
            </div>

            <script>
                function navigate() {
                    let input = document.getElementById('targetUrl').value.trim();
                    if (!input) return;

                    if (!/^https?:\/\//i.test(input)) {
                        input = 'http://' + input;
                    }

                    window.location.href = '/proxy?url=' + encodeURIComponent(input);
                }

                document.getElementById('targetUrl').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') navigate();
                });
            </script>
        </body>
        </html>
    `);
});

// Helper function to block requests to local/internal network locations
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

// 3. Dynamic Proxy Handler
app.use('/proxy', (req, res, next) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: Missing "url" query parameter.');
    }

    try {
        const parsedUrl = new url.URL(targetUrl);

        // Security check: Block attempts to target local/internal networks
        if (isLocalAddress(parsedUrl.hostname)) {
            return res.status(403).send('Access to local/internal network resources is forbidden.');
        }

        const host = `${parsedUrl.protocol}//${parsedUrl.host}`;

        return proxy(host, {
            proxyReqPathResolver: () => parsedUrl.pathname + parsedUrl.search,
            userResHeaderDecorator(headers) {
                // Strip restrictive iframe headers to allow loading embeddable pages
                delete headers['x-frame-options'];
                delete headers['content-security-policy'];
                return headers;
            }
        })(req, res, next);

    } catch (err) {
        return res.status(400).send('Invalid URL provided.');
    }
});

// 4. Start Server
app.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
});
