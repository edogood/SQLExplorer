# SQLExplorer / SQL Lab Completo

## Cosa è cambiato
- **Nuova Information Architecture (multi-page)**:
  - `index.html` ora è una landing snella con CTA per Playground, Percorso, Trainer e blocco Reference.
  - nuove pagine dedicate: `playground.html`, `guided.html`, `trainer.html`, `keywords.html`.
- **Deep-link operativo Syntax -> Playground**:
  - in `syntax.html` ogni topic ha azioni `Copia snippet` e `Apri nel Playground`.
  - `Apri nel Playground` usa querystring (`dialect`, `q`, `autorun=1`) per prefill + esecuzione automatica.
  - topic con permalink (`#slug`) per condivisione/anchor diretto.
- **TODO UX migliorata (Guided/Trainer)**:
  - placeholder standardizzati su `/* TODO: ... */`.
  - blocco verifica con conteggio TODO trovati.
  - pulsante `Prossimo TODO` per salto/selezione della prossima occorrenza nel query editor.
- **Accessibilità mirata**:
  - live region `aria-live="polite"` nella pagina sintassi per annunciare conteggio risultati o nessun match.
  - `scroll-margin-top` per evitare che anchor/focus finiscano sotto header sticky.
  - focus indicator rinforzato con `:focus-visible`.

## Come testare manualmente
1. Apri `index.html`: la home deve essere snella (senza tutte le sezioni del lab insieme).
2. Apri `syntax.html`, cerca un topic e usa `Apri nel Playground`:
   - deve aprire `playground.html` con query precompilata;
   - dialetto impostato da querystring;
   - query eseguita automaticamente (`autorun=1`).
3. In `playground.html` carica uno starter Guided/Trainer con TODO:
   - deve apparire il riepilogo `TODO trovati: N`;
   - `Prossimo TODO` deve selezionare/scorrere alla successiva occorrenza.
4. In `syntax.html` verifica accessibilità:
   - la ricerca annuncia risultati/no match in live region;
   - aprendo un permalink `#topic` il target non resta nascosto dal header.

## Limiti noti
- Il core runtime resta su `sql.js` (SQLite in browser): il dialetto è didattico e non cambia l'engine.
- `guided.html`, `trainer.html`, `keywords.html` sono entry-point dedicati che rimandano al lab operativo (`playground.html`) per esecuzione SQL e verifiche.
