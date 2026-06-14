# 🦉 Anki Adder

Anki Adder is a premium utility tool designed to automatically parse data from the Oxford Learner's Dictionary and transfer it directly to AnkiDroid. Built on **Clean Architecture** principles and featuring a **modern Glassmorphism UI**, the application is specifically optimized for English learners to create high-quality flashcards with maximum efficiency.

## Key Features

- **Quick Search**: Instantly fetches word definitions, example sentences, and idioms. Results are intelligently sorted (Existing > Normal > Idioms).
- **Linguistic Engine**: Features a 3-stage **Smart Highlighting** system:
  - **Dynamic Regex**: Covers irregular verbs, plurals, and suffixes.
  - **Boundary Check**: Ensures precision with word boundaries.
  - **Token Scoring**: Uses fuzzy matching (60%+ similarity) for complex cases like idioms.
- **AnkiDroid Integration**: 
  - **Automated Setup**: Automatically creates "Anki Adder" note types and manages decks.
  - **Duplicate Prevention**: Real-time checking of word+definition pairs with a visual "Already Exists" badge.
- **Audio Support**: Supports local Anki TTS and handles audio-enabled card templates (Audio v3) automatically.
- **Advanced Tag Management**: Deck-specific tag groups, MRU sorting, and "No-Nest Protection" for hierarchical tags.
- **Premium Design**: 6 dynamic themes (Glassmorphism), customizable typography, and a mobile-first responsive layout.
- **Multi-Language Support**: The interface is 100% localized in **52 different languages**.

## Requirements

- **AnkiDroid**: Must be installed on your Android device.
- **API Access**: Ensure "Advanced > API access for other apps" is enabled in AnkiDroid settings.

## Setup & Development

### Development Environment (Web Test Mode)
A dedicated Node.js proxy server is available for testing the application on the web:

```bash
# 1. Install dependencies
npm install

# 2. Start the web test server
# (Bundles the code and starts the proxy at http://localhost:3005)
npm run web
```
