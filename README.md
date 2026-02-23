# SQLExplorer / SQL Lab Completo

## Cosa è cambiato
- Chiarezza **Engine vs Dialetto esempi**: badge e testi espliciti, con info che l'esecuzione resta sempre su SQLite (sql.js).
- Nuovi strumenti Playground:
  - pannello collassabile **SQL eseguito** (query dopo transpile/normalizzazione);
  - **Safe Run** per suggerire LIMIT sulle SELECT non limitate;
  - **EXPLAIN QUERY PLAN** con output dedicato;
  - **Format SQL**, shortcut **Ctrl+Enter**, export risultati CSV.
- Verifica Guided/Trainer migliorata:
  - verifica output-based (colonne, row count, signature hash del resultset normalizzato);
  - token mantenuti come vincolo didattico separato, con messaggio distinto.
- Persistenza sessione:
  - salvataggio DB corrente in file `.sqlite`;
  - caricamento DB da file;
  - persistenza locale di query corrente, cronologia query (ultime 30), query pinnate, progress Guided/Trainer.
- Accessibilità:
  - focus ring visibile su elementi interattivi;
  - `aria-live="polite"` per feedback/status principali;
  - supporto `prefers-reduced-motion`.

## Come testare manualmente
1. Apri `index.html` e verifica che sia visibile `Engine: SQLite (sql.js)`.
2. Cambia dialetto esempi in SQL Server e carica query dialetto: nel pannello **SQL eseguito** deve comparire la versione SQLite (es. `TOP` -> `LIMIT`).
3. Usa Guided/Trainer:
   - query semanticamente equivalente deve passare la verifica output-based;
   - query con output corretto ma senza token richiesti deve mostrare il messaggio dedicato sul concetto mancante.
4. Premi **Salva sessione**, poi ricarica pagina e **Carica sessione**: DB ripristinato; progressi/query recuperati da localStorage.
5. Naviga via tastiera (TAB/SHIFT+TAB): focus sempre visibile; feedback letti via regioni `aria-live`.

## Limiti noti
- La signature output-based usa normalizzazione deterministicamente ordinata su righe/colonne; query con semantica intenzionalmente diversa possono fallire per mismatch valori.
- Per ora non è stata introdotta esecuzione in Web Worker (TODO tecnico per evitare blocchi UI su query molto pesanti).
