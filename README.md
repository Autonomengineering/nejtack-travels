# Grabbresan

Ett mobilanpassat första utkast med tre vyer:

- **Mål med resan** – lägg till, bocka av och radera mål. Ändringarna delas direkt med hela resegänget. En av fyra slumpade annonser visas efter en kort fördröjning varje gång startsidan öppnas.
- **Bönpallen** – statisk plats för reseledarnas helgonbild.
- **Shitadvisor** – lägg till toalettbild, plats och personligt betyg, och rösta med likes.

Webbappen kan läggas till på telefonens hemskärm som **NEJTACK TRAVELS** och använder projektets svartvita logotyp som appikon.

## Testa lokalt

Appen är helt statisk och kräver ingen installation. Starta valfri lokal webbserver i mappen, till exempel:

```bash
python3 -m http.server 8000
```

Öppna sedan `http://localhost:8000`.

## Publicera gratis med GitHub Pages

1. Skapa ett nytt repository på GitHub.
2. Lägg projektfilerna i repositoryts rot och pusha dem till grenen `main`.
3. Öppna **Settings → Pages** på GitHub.
4. Under **Build and deployment**, välj **Deploy from a branch**.
5. Välj grenen `main`, mappen `/ (root)` och klicka **Save**.

Efter någon minut visas länken till webbappen på samma sida.

## Delad lagring

Mål, toalettinlägg, betyg och likes sparas i Supabase och visas för alla som använder webbappen. Bilderna lagras i Supabase Storage. Appens publika anslutningsuppgifter finns i `config.js`; ingen hemlig servernyckel används i webbläsaren.

Ingen inloggning krävs. Länken bör därför bara delas inom resegänget, eftersom alla som har den kan ändra innehållet.

## Reseledarbild

Helgonbilden finns i `assets/reseledare.jpg` och visas på Bönpallen. Ersätt filen med en ny bild med samma filnamn om den ska uppdateras senare.
