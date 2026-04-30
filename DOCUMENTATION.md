# SLOTube Ontwikkelaars & Overdrachtsdocument

Welkom bij het EAI / SLOTube overdrachtsdocument. In dit document wordt de volledige werking van de applicatie as-is uitgelegd, inclusief de architectuur, de pijplijnen (technologisch & semantisch), de rollen en rechten, en de manieren om deze verder te bewerken.

## Inhoudsopgave
1. [Inleiding en Architectuur](#1-inleiding-en-architectuur)
2. [Rollen en Rechten](#2-rollen-en-rechten)
3. [Semantische Pipeline (Data Flow)](#3-semantische-pipeline-data-flow)
4. [Technologische Pipeline](#4-technologische-pipeline)
5. [Features en Opties](#5-features-en-opties)
6. [Firebase & Datamodel](#6-firebase--datamodel)
7. [Deploy-instructies](#7-deploy-instructies)

---

## 1. Inleiding en Architectuur
**SLOTube** is een educatieve hub speciaal ontworpen om lesmateriaal transparant, veilig en beoordeelbaar te maken voor het onderwijs. Docenten zoeken via deze applicatie met geverifieerde SLO-kerndoelen en kunnen lesmateriaal (uit YouTube of geselecteerde educatieve websites zoals NPO, Wikiwijs, Wikipedia) koppelen aan deze doelen.

De applicatie is gebouwd in het **React / Vite / TypeScript** ecosysteem met een **Node.js (Express)** Backend. Dit is de architectuur:
- **Frontend (Client)**: Bevat de interface. Geoptimaliseerd voor Mobile First (`min-h-[100dvh]`).
- **Backend (Express)**: Regelt veilige, server-side API calls naar externe partijen (YouTube, LLM/Gemini, Google Custom Search/Firecrawl).
- **Database (Firebase Firestore)**: Fungeert als Serverless NoSQL cloud storage voor SLO-doelen, beoordeelde video's en bronnen in de wachtrij.

---

## 2. Rollen en Rechten
De applicatie kent een aantal autorisatie niveaus:

1. **Docent (Standaard gebruiker / Teacher)**:
   - Heeft toegang tot `/teacher` (Ontdek en Zoek).
   - Kan offline door een lokaal cache/database zoeken van lesdoelen (de SLO hub).
   - Heeft toegang tot de **YouTube Live Search** om nieuwe niet-geïndexeerde content te zoeken.
   - Kan geschikte video's "Voorstellen voor Review" aan het beheerteam.
2. **Databaas (Content Beoordelaar)**:
   - Heeft toegang tot `/admin/review`.
   - Mag alleen lesmateriaal dat klaarstaat in de review queue (wachtrij) en dit goed- of afkeuren.
   - Kan de "AI Assist" (aangedreven door Gemini) gebruiken om voorspellingen te doen waarom een video wel of niet in de scope van het SLO doel past.
3. **Beheerder (Admin)**:
   - Heeft overal toegang toe en ziet de `/admin` en `/admin/review` routes.
   - Kan ruwe data/SLO JSON injecteren in de systeem database.
   - Voert database opschoon the handelingen uit (Wachtrijen, Gekeurde items).
   - Verantwoordelijk voor technische settings.

---

## 3. Semantische Pipeline (Data Flow)
De reis van kerndoel tot gecertificeerd lesmateriaal in SLOTube:

1. **Data Indexering (Admin)**: Beheerder voedt in de "Beheer" applicatie kerndoel-data (SLO kerndoelen). De doelen bevatten metadata (id, titel, omschrijving, leergebied).
2. **Consultatie (Visueel)**: Docenten filteren (of zoeken lokaal) door deze kerndoelen in de **Ontdek-module**. Ze selecteren een doel (bijv. "Aap, Noot, Mies spelling - PO 3-4").
3. **Content Exploratie**:
   Ze gebruiken de Live Serach engine, die backend naar YouTube reikt. Resultaten met een zekere pedagogische waarde worden aangeboden.
4. **Queueing (Wachtrij)**: Docent selecteert "Pas dit toe op het doel", waarna het item asynchroon als `status: 'pending'` document in Firestore wordt bewaard via `createPendingVideo()`.
5. **AI Beoordeling**: Beheerder / Databaas opent het voorstel in het `AdminReview` portaal. De Admin trigger de `Assess met AI`, dit zendt het kerndoel + video detail over de beveiligde backend proxy `/api/ai/assess` naar de Gemini Pro modellen. Gemini retourneert een weging en argumentatie (score: 0-100%).
6. **Fiat / Publicatie**: Het team (menselijke revisie is leidend) keurt een voorgestelde bron goed. Het document wordt overgezet naar `status: 'approved'`.
7. **Consumptie**: Docent ziet de videokaart nu officieel binnen het specifieke kerndoel profiel met de groene stempel.

---

## 4. Technologische Pipeline
- **Vite Middleware**: Server start op **Vite SSR/Middleware** modes zodat Express frontend én backend serveert.
- **/api/youtube/search**: De web-scraper is uitgebreid naar YouTube v3 search integratie om specifieke en ge-whiteliste channels (uit wikiwijs, Schooltv etc.) te betrekken. Vereist `YOUTUBE_API_KEY`.
- **/api/ai/assess**: Voert validatietaken uit met een Language Model (Gemini). Vereist `GEMINI_API_KEY`.
- **Styling**: **Tailwind CSS**. Custom UI Componenten worden benaderd middels een Mobile-First patroon. De wrapper `min-h-[100dvh]` om te voorkomen dat knoppen onder iOS bottom-bars en Android navigation-bars vallen.
- **Routing**: `react-router-dom` voor cliënt-kant routing met rol-barrières.

---

## 5. Features en Opties
* **Live Search (Docenten portaal)**: Integreert YouTube API met fallback crawling functionaliteit om "vervuiling" van standaard consumenten video's tegen te gaan.
* **SLO Taxonomy Filters**: In `GoalDetail` kunnen video's nu op detail gemarkeerd worden en voorzien worden van tags op Doelgroep (PO, VO, Speciaal Basis Onderwijs).
* **AI Validatie Agent**: Berekent dynamisch _match scores_.
* **UI/UX Polishing**: Alle "alert" elementen uit de ruwe MVP fase zijn grotendeels/waarmogelijk overgezet naar responsieve, gekalmeerde inline in-app statusmeldingen (het `statusMsg` framework met visuele classes als emerald-50 en red-50).

---

## 6. Firebase & Datamodel
Er is gebruik gemaakt van 2 voornaamste collecties:
1. `slo_goals` (Bevat SLO doelen).
2. `videos` (Bevat videokaarten / urls die een verwijzing `sloGoalId` bevatten naar een doel).

Verschillende functies `updateVideoStatus()`, `createPendingVideo()`, en `getPendingVideos()` opereren met standaard Role-base en Firestore-regels.

---

## 7. Aandachtspunten
* Let erop dat je de environment configuraties meeneemt wanneer je host op een cloud platform.
* `process.env.GEMINI_API_KEY` en `process.env.YOUTUBE_API_KEY` zijn absolute vereisten om de applicatie in zijn volledigheid te draaien.
* Er is code aanwezig in `optionalAiMatcher.ts` die voorziet dat, mocht de API onbereikbaar zijn of leeg, functionaliteit van het dashboard wel intact blijft (Graceful degradation).
* Zorg voor de Security Rules in Firebase dat alleen geïnjecteerde medewerkers op `/pending` en `/approved` kunnen updaten (via Custom Rules indien extra harden is vereist). Momenteel is front-end afscherming gebruikt met password-based routing ter bescherming binnen V1.
