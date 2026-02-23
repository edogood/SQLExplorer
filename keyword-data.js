(function (global) {
  'use strict';

  const base = [
    'SELECT','FROM','WHERE','ORDER BY','GROUP BY','HAVING','LIMIT','OFFSET','JOIN','LEFT JOIN','RIGHT JOIN','FULL OUTER JOIN','INNER JOIN','UNION','UNION ALL','WITH','INSERT','UPDATE','DELETE','CREATE TABLE','ALTER TABLE','DROP TABLE','CREATE INDEX','DISTINCT','CASE','COALESCE','NULLIF','CAST','COUNT','SUM','AVG','MIN','MAX','EXISTS','IN','BETWEEN','LIKE','IS NULL','NOT','AND','OR','WINDOW','ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD','NTILE','CTE RECURSIVE','DATE','STRFTIME','SUBQUERY','VIEW','PRIMARY KEY','FOREIGN KEY','CHECK','DEFAULT','TRANSACTION'
  ];

  function entry(keyword) {
    const sqliteSyntax = `${keyword} ...`; 
    return {
      keyword,
      category: /JOIN|UNION|WHERE|GROUP|ORDER|SELECT|FROM|HAVING|LIMIT|OFFSET/.test(keyword) ? 'Querying' : /CREATE|ALTER|DROP|KEY|CHECK|DEFAULT|VIEW/.test(keyword) ? 'DDL' : /INSERT|UPDATE|DELETE|TRANSACTION/.test(keyword) ? 'DML' : 'Functions',
      syntaxByDialect: {
        sqlite: sqliteSyntax,
        postgresql: sqliteSyntax,
        sqlserver: keyword === 'LIMIT' ? 'SELECT TOP (n) ...' : sqliteSyntax
      },
      argumentsByDialect: {
        sqlite: 'Dipende dalla clausola; usare alias chiari.',
        postgresql: 'Supporta sintassi ANSI e funzioni avanzate.',
        sqlserver: 'Attenzione a TOP/OFFSET FETCH e tipi T-SQL.'
      },
      notesByDialect: {
        sqlite: 'Eseguito direttamente nel playground SQL.js.',
        postgresql: 'Verificare cast espliciti e quoting identificatori.',
        sqlserver: 'Preferire schema prefix e conversioni con TRY_CONVERT quando utile.'
      },
      realExampleByDialect: {
        sqlite: `SELECT id, name FROM customers ORDER BY id LIMIT 5;`,
        postgresql: `SELECT id, name FROM customers ORDER BY id LIMIT 5;`,
        sqlserver: `SELECT TOP 5 id, name FROM customers ORDER BY id;`
      },
      engineExample: `SELECT id, name FROM customers ORDER BY id LIMIT 5;`
    };
  }

  global.KEYWORD_DATA = base.map(entry);
})(window);
