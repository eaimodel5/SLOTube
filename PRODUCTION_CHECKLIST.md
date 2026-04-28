# Productiebeveiliging Checklijst

Deze applicatie is momenteel ontworpen als staging/conceptversie. Zodra deze in productie geplaatst wordt en met de echte Firestore productie-backend koppelt, moet nadrukkelijk gekeken worden naar toegangsbeheer.

## 1. Firebase Authenticatie vs. Lokale React State
- **Huidige Status**: De applicatie gebruikt React-state navigatie en "login"-knoppen (bijv. 'docent', 'admin', 'databaas') zonder dat daar echte Firebase User accounts achter zitten (`signInWithEmailAndPassword`, etc.). Login staat momenteel gelijk aan sessietoegang in de front-end.
- **Productie Status**: In `firestore.production.rules` wordt echter streng beveiligd en afgedwongen dat een query voort moet komen van een veilige verbinding: `request.auth != null`. Aangezien er geen echte Firebase login triggert, is deze waarde nu `null`.
- **Actiepunt**: Als men `firestore.production.rules` toepast zonder de auth toe te voegen, falen alle lees- en schrijfacties op de DB met `Missing or insufficient permissions`. Voeg óf eerst volledige Firebase integratie met SSO/Auth toe in de loginflow, óf laat writes via beveiligde, server-side code API routes lopen.

## 2. Toegangsbeheer (Rollen)
- **Huidige Status**: De privileges worden enkel verborgen via een client-side `RoleGuard` (met opgeslagen rollen in React Context).
- **Actiepunt**: Pas rol-verificatie ook via backend / Firestore Security Rules aan. Maak gebruik van **Custom Claims** of een verzegeld rollendocument dat checkt of de gebruikte `request.auth.uid` inderdaad ook 'databaas' of 'admin' rechten bezit bij het aanvragen of goedkeuren van materialen.

Kortom: **Zet `firestore.production.rules` niet zomaar aan of live** zonder een keuze te maken in de integratie van `Firebase Auth` of custom backend verbindingen. Anders is de database onbruikbaar of open voor het publiek.
