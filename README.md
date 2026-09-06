# Grabbresan

Ett mobilanpassat första utkast med tre vyer:

- **Mål med resan** – lägg till, bocka av och radera mål. Sparas i `localStorage`. En av fyra slumpade annonser visas efter en kort fördröjning varje gång startsidan öppnas.
- **Bönpallen** – reseledarnas helgonbild och en nedräkning till nästa tillbedjan.
- **Shitadvisor** – lägg till toalettbild och plats, och rösta med likes.

## Webbapp

https://autonomengineering.github.io/nejtack-travels/

## Lagring

Mål sparas i `localStorage`. Toalettbilder och metadata sparas i webbläsarens IndexedDB, vilket betyder att innehållet är lokalt på samma enhet och webbläsare. För delning mellan flera personer behövs senare en extern lagringstjänst.
