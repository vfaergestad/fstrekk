# fstrekk — trekning av dive pools

Enkelt webverktøy for å trekke dive pools kvelden før NM i fallskjerm.
Velg gren → sett sammen puljen → antall runder → trekk element for element.
Hver trekning viser **bokstav/tall stort** sammen med selve **formasjonen**
(offisielle FAI-/NLF-diagram). Resultatet lagres i nettleseren.

## Kjøre

Åpne `site/index.html` i en nettleser (Chrome anbefales — dobbeltklikk holder).

Hvis nettleseren ikke lagrer mellom økter på `file://`, kjør en liten server:

```
cd site
python3 -m http.server 8000
# åpne http://localhost:8000
```

## Slik virker det

1. **Grener** (forsiden): legg til én gren om gangen. Fremdrift og status vises per gren.
2. **Ny gren**: velg gren i nedtrekksmenyen. Puljen fylles med den offisielle
   sammensetningen, men hver random (bokstav) og block (tall) kan slås av/på.
   `Alle` / `Ingen` / `Offisiell` er snarveier. Sett antall runder og poeng per runde.
3. **Trekk**: «Trekk element» avslører ett element av gangen til runden når poengmålet
   (random = 1 poeng, block = 2 poeng; 5 eller 6 – det som nås først, en block kan gå 4→6).
   Hele puljen trekkes **uten tilbakelegging** (FAI CR-FS 4.2.2/4.2.3): hver random og
   block trekkes maks én gang for alle rundene i grenen — aldri samme random to ganger.
   Er puljen for liten til unike runder, vises en advarsel og elementer gjenbrukes.
   «Trekk runde på nytt» kaster om. Gå videre til neste runde, deretter «Fullfør gren».
4. **Fasit**: samlet trukket rekkefølge for alle grener, klar for utskrift (blocks i blått).

Alt ligger under nøkkelen `fstrekk.v1` i `localStorage`. «Nullstill alt» tømmer.

## Grener og pooler

| Gren | Randoms | Blocks | Standard pulje |
|------|---------|--------|----------------|
| FS-4 Open | A–Q (16) | 1–22 | alle |
| FS-4 Intermediate | A–Q (16) | 1–22 | blocks 2,4,6,7,8,9,19,21 |
| FS-8 | A–Q (16) | 1–22 | blocks 1,3,4,5,6,7,8,10,13–19 |
| VFS-4 | A–Q (16) | 1–22 | alle |
| VFS-2 | A–H (8) | 1–8 | alle |
| FS-2 Nybegynner | A–H (8) | 1–15 | alle |
| 6-way Speed (SF) | A–K (10) | – | kun randoms |

Standardpuljene kan endres fritt i oppsettet.

**Speed Formation** er en egen gren: én formasjon trekkes per runde og bygges på tid
(ingen sekvens, ingen poeng, ingen blocks). De øvrige grenene bygger en sekvens per
runde til poengmålet (5 eller 6 – evt. 3 eller 4 for lavere klasser).

## Filer

```
site/
  index.html      oppsett
  styles.css      stil (+ utskriftsark)
  app.js          logikk, pooldefinisjoner og trekning
  img/<gren>/     random_<bokstav>.png og block_<tall>.png
reference/        kilde-PDF-ene (FAI/NLF dive pools) formasjonsbildene er klippet fra
```

Formasjonsbildene er klippet direkte ut av de offisielle dive pool-PDF-ene fra
[nmfallskjerm.no](https://www.nmfallskjerm.no/) (FAI Competition Rules for FS/VFS
2026-utgaven, og FNLF/AXIS beginner- og speed-pooler), én rute per element.

Randomnavn (f.eks. FS-4: A Unipod, J Donut, M Star) vises ved siden av bokstaven.
Blocknavn står i selve bildet (start- og sluttformasjon med rotasjoner).
