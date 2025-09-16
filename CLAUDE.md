# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Polish-language brand audit application that provides strategic analysis for business leaders. The application consists of a client-side questionnaire with an AI-powered analysis backend that generates personalized brand strategy insights.

## Architecture

**Frontend**: Single-page HTML application (`index.html`) with embedded CSS and JavaScript
**Backend**: Express.js server (`server.js`) using Google's Gemini AI for analysis
**Knowledge Base**: Text file (`baza-wiedzy.txt`) containing brand strategy methodology and business insights

### Key Components

- **Multi-step questionnaire**: 12 scale questions across 4 strategic sections (Fundamenty, Pozycjonowanie, Komunikacja, Percepcja)
- **Mirror questions**: Open-ended reflection questions for deeper strategic insights
- **AI analysis engine**: Processes responses through Gemini AI with knowledge base context
- **Results generation**: Creates downloadable PNG reports with strategic recommendations

## Commands

### Development
```bash
npm install          # Install dependencies
node server.js       # Start the server on port 3000
```

### Environment Setup
- Create `.env` file with `GEMINI_API_KEY=your_api_key_here`
- The server requires a valid Google Gemini API key to function

### Testing
- No formal test framework configured
- Test manually by running the application and completing the audit

## Key Files

- `server.js` - Main server file with AI analysis endpoint at `/api/analyze`
- `index.html` - Complete frontend application with embedded styles and JavaScript
- `baza-wiedzy.txt` - Strategic knowledge base used to contextualize AI responses
- `package.json` - Dependencies: Express, CORS, Google Generative AI, dotenv

## Important Implementation Details

### AI Analysis Logic
The server includes sophisticated input validation to filter low-quality responses and provides different analysis approaches based on score ranges (0-25: critical, 26-45: reactive, 46+: strategic).

### Frontend Features
- Progress tracking through multi-step form
- Real-time validation ensuring all questions are answered
- Animated score display and result presentation
- HTML2Canvas integration for downloadable reports
- Responsive design with mobile-friendly interface

### CORS Configuration
Server is configured for multiple origins including localhost and Netlify deployment.

### Text Content
All user-facing text is in Polish. The application targets Polish business leaders and uses specialized business terminology.

## Development Notes

- The application uses a sophisticated prompt engineering system that adapts responses based on user input quality and score ranges
- Client-side JavaScript handles form progression, validation, and report generation
- Server-side processing includes input quality filtering to ensure meaningful responses
- The knowledge base file should be updated carefully as it directly influences AI analysis quality
- API URL is configurable via `API_BASE_URL` constant in the frontend code