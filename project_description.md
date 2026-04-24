# Project Description and Specs

<!-- This file contains the project description and specs -->

## Overview

**everythingAI** is an intelligent filesystem assistant that can search, see, understand, learn, and organize your documents and data. All information is stored locally in a structured way, ensuring privacy and full user control.

## Goals

- **Search**: Quickly locate files and content across your filesystem using natural language queries.
- **Understand**: Leverage AI to interpret the meaning and context of your documents.
- **Learn**: Adapt to your usage patterns and preferences over time.
- **Organize**: Automatically categorize and tag files for easier retrieval.
- **Local Storage**: Keep all indexed data on-device — no cloud dependency.

## Tech Stack

- **Runtime**: Node.js
- **Language**: JavaScript (ES Modules)
- **AI / NLP**: To be determined (e.g., local LLM integration)
- **Storage**: Local structured database (e.g., SQLite / LevelDB)

## Project Structure

```
everythingAI/
├── src/
│   └── index.js        # Application entry point
├── .env.example        # Environment variable template
├── package.json        # Node.js project metadata
├── project_description.md
└── README.md
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```
3. Start the application:
   ```bash
   npm start
   ```
