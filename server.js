require("dotenv").config();

const express = require("express");
const Database = require("better-sqlite3");

const app = express();

const PORT = process.env.PORT || 3000;
const BASE_URL =
    process.env.BASE_URL || `http://localhost:${PORT}`;


// =========================
// Database
// =========================

const db = new Database("database.db");

db.prepare(`
    CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        short_code TEXT UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();


// =========================
// Middleware
// =========================

app.use(express.json());

app.use(express.static("public"));


// =========================
// Generate Random 3-Character Code
// =========================

function generateCode() {

    const characters =
        "abcdefghijklmnopqrstuvwxyz0123456789";

    let code = "";

    for (let i = 0; i < 3; i++) {

        code += characters[
            Math.floor(
                Math.random() * characters.length
            )
        ];

    }

    return code;
}


// =========================
// Create Short URL
// =========================

app.post("/api/shorten", (req, res) => {

    const { url, customCode } = req.body;


    // =========================
    // URL Required
    // =========================

    if (!url) {

        return res.status(400).json({
            error: "URL is required"
        });

    }


    // =========================
    // Validate URL
    // =========================

    try {

        new URL(url);

    } catch {

        return res.status(400).json({
            error: "Invalid URL"
        });

    }


    let code;


    // =========================
    // Custom Code
    // =========================

    if (customCode) {

        const cleanCode =
            customCode
                .trim()
                .toLowerCase();


        // Maximum 100 characters
        if (cleanCode.length > 100) {

            return res.status(400).json({
                error:
                    "Custom code cannot be longer than 100 characters"
            });

        }


        // Only lowercase letters,
        // digits and hyphens
        if (!/^[a-z0-9-]+$/.test(cleanCode)) {

            return res.status(400).json({
                error:
                    "Custom code can only contain lowercase letters, digits, and hyphens"
            });

        }


        // Check if already exists
        const existing = db.prepare(`
            SELECT id
            FROM urls
            WHERE short_code = ?
        `).get(cleanCode);


        if (existing) {

            return res.status(409).json({
                error:
                    "This short code is already in use"
            });

        }


        code = cleanCode;

    }


    // =========================
    // Random Code
    // =========================

    else {

        while (true) {

            code = generateCode();


            const existing = db.prepare(`
                SELECT id
                FROM urls
                WHERE short_code = ?
            `).get(code);


            if (!existing) {

                break;

            }

        }

    }


    // =========================
    // Save to Database
    // =========================

    db.prepare(`
        INSERT INTO urls (
            short_code,
            original_url
        )
        VALUES (?, ?)
    `).run(code, url);


    // =========================
    // Generate Short URL
    // =========================

    const shortUrl =
        `${BASE_URL}/${code}`;


    res.json({

        shortUrl: shortUrl,

        code: code

    });

});


// =========================
// Redirect Short URL
// =========================

app.get("/:code", (req, res) => {

    const { code } = req.params;


    const result = db.prepare(`
        SELECT original_url
        FROM urls
        WHERE short_code = ?
    `).get(code);


    if (!result) {

        return res.status(404).send(
            "Short URL not found"
        );

    }


    res.redirect(
        result.original_url
    );

});


// =========================
// Start Server
// =========================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

    console.log(
        `Base URL: ${BASE_URL}`
    );

});