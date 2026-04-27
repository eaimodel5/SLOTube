# SLOTube - Educatieve Videotheek Metadata & AI

**Ontwikkeld door: H. Visser - EAI Analyse & Advies**

SLOTube is een geavanceerd platform voor het cureren en ontsluiten van educatieve videocontent, direct gekoppeld aan de officiële SLO kerndoelen. Het platform maakt gebruik van AI (Google Gemini) om de didactische waarde van video's te beoordelen en te mappen op het curriculum.

## Systeemoverzicht

Het systeem bestaat uit drie hoofdcomponenten:
1. **YouTube Pre-Scraper**: Voor het efficiënt doorzoeken van YouTube zonder onnodige API-belasting.
2. **AI Keurmeester**: Een admin-panel waar video's worden beoordeeld door Gemini AI op basis van SLO-matrices.
3. **Teacher Dashboard**: Een beveiligde kluis van goedgekeurde video's, gesorteerd op vak en kerndoel.

## Installatie & Configuratie

Om deze applicatie operationeel te maken na overdracht, moeten de volgende stappen worden gevolgd:

### 1. Omgevingsvariabelen
Maak een `.env` bestand aan op basis van `.env.example` en vul de volgende keys in:
- `GEMINI_API_KEY`: Voor de AI-beoordelingen.
- `YOUTUBE_API_KEY`: Voor de zoekfunctionaliteit.
- `VITE_FIREBASE_*`: Diverse keys voor de databaseverbinding (zie `.env.example`).

### 2. Firebase
Vul de juiste configuratie in `firebase-applet-config.json`. Zorg dat de Firestore database is ingesteld met de bijbehorende `firestore.rules`.

### 3. Starten
```bash
npm install
npm run dev
```

## Disclaimer & Contact
Dit project is opgeleverd als een functioneel framework waarbij de logica centraal staat. Alle herleidbare persoonlijke credentials zijn verwijderd voor de overdracht.

**Projectleider:**
H. Visser
EAI Analyse & Advies
