require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Function to read and inject environment variables into HTML
function renderPage(req, res, page) {
    const filePath = path.join(__dirname, `${page}.html`); // Construct path dynamically
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading ${page}.html:`, err);
            return res.status(500).send('Error loading the page');
        }

        let injectedScript = '';
        if (process.env.APPS_SCRIPT_URL) {
            injectedScript = `<script>
                window.__ENV__ = {
                    APPS_SCRIPT_URL: "${process.env.APPS_SCRIPT_URL}",
                };
            </script>`;
        } else {
            console.warn("APPS_SCRIPT_URL is NOT set in .env! Using default value.");
            injectedScript = `<script>
                console.warn("Using default APPS_SCRIPT_URL because .env is not set");
                window.__ENV__ = {
                    APPS_SCRIPT_URL: "DEFAULT_URL_FOR_DEBUGGING"
                };
            </script>`;
        }

        const modifiedHtml = data.replace(/<script\s+id="env-vars"\s*><\/script>/, injectedScript);

        console.log(`Modified ${page}.html sent.`); // More specific log
        res.send(modifiedHtml);
    });
}

// Routes
app.get('/', (req, res) => {
    renderPage(req, res, 'index');
});

app.get('/submit-event', (req, res) => {
    renderPage(req, res, 'submit-event');
});

app.get('/about', (req, res) => {
    renderPage(req, res, 'about');
});

// Static middleware - Serve static files AFTER the dynamic routes
app.use(express.static(__dirname));

// 404 handler (Important! Place after all other routes and middleware)
app.use((req, res) => {
    res.status(404).send("Page not found");
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});