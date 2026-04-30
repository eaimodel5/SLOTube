# EAI - SLOTube Application

Welkom bij SLOTube! Dit project is een **PWA/React/Node.js-stack** specifiek gebouwd voor het indexeren, beoordelen en live koppelen van educatieve (YouTube- en Wiki-)content aan **SLO-kerndoelen**. 

Deze repo bevat zowel de client (React Frontend) als de server (Express API Backend).

## 📚 Volledige Documentatie
Voor een geresimeerde en stapsgewijze uitleg van:
- De semantische database pipelines.
- AI (Gemini) en platform (YouTube) API architecturen.
- Alle opties, rollen (Docent, Databaas, Admin) en functionaliteiten in de applicatie.

**Lees dan het overdrachtsdocument:**
👉 **[DOCUMENTATION.md](./DOCUMENTATION.md)**

## 🚀 Snel Starten (Development)

1. Kopieer `.env.example` naar `.env` en vul je API keys in (waaronder YouTube en Gemini).
2. Start dev server:
   ```bash
   npm run dev
   ```
3. Navigeer in je browser naar `http://localhost:3000`.

## 📦 Tech Stack
- Frontend: `React 18`, `Tailwind CSS`, `Lucide React`
- Routing: `react-router-dom`
- Database: `Firebase Firestore (V9)`
- Backend: `Express.js`, `Vite Middleware`
- AI Assessment: `Gemini Pro / Flash via Google GenAI SDK`

## 🔒 Security
Zie Firestore Rules (`firestore.rules`) en de authenticatiemodules voor wachtwoordbeveiliging en toegangsbeheer voor de review-sectie.
