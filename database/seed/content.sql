INSERT INTO content.pages (slug,title,description,"order",is_published) VALUES
('home','Home','Overview della piattaforma',1,true),
('playground','Playground','Esegui query isolate',2,true),
('syntax','Syntax','Lezioni SQL',3,true),
('keywords','Keywords','Catalogo keyword',4,true),
('guided','Guided','Percorso guidato',5,true),
('trainer','Trainer','Allenamento rapido',6,true),
('exercises','Exercises','Esercizi con validazione',7,true),
('database','Database','Schema browser',8,true),
('visualizer','Visualizer','Grafo relazioni',9,true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content.lessons(page_slug,title,body_md,difficulty,tags) VALUES
('syntax','SELECT base','Usa SELECT ... FROM ... WHERE ...','easy',ARRAY['select','where']),
('syntax','JOIN','JOIN collega tabelle tramite chiavi esterne.','medium',ARRAY['join']);

INSERT INTO content.keywords(slug,name,category,description_md,examples_json,related_slugs) VALUES
('select','SELECT','query','Recupera righe da una o più tabelle.','{"basic":"SELECT * FROM customers"}',ARRAY['where','join']),
('where','WHERE','filter','Filtra righe in base a condizioni.','{"basic":"SELECT * FROM orders WHERE status=''PAID''"}',ARRAY['select'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO content.guided_steps(title,description_md,page_slug,"order") VALUES
('Primo filtro','Filtra clienti enterprise','guided',1),
('Prima join','Unisci clienti e ordini','guided',2);

INSERT INTO content.trainer_items(question_md,answer_md,tags,difficulty) VALUES
('Quale keyword limita le righe?','LIMIT',ARRAY['select'],'easy'),
('Come unisci due tabelle?','Con JOIN e ON',ARRAY['join'],'easy');

INSERT INTO content.exercises(title,prompt_md,starter_sql,expected_json,validator_type,difficulty,tags) VALUES
('Clienti enterprise','Trova clienti enterprise','SELECT name FROM customers WHERE segment = ''Enterprise''','{"minRows":1}'::jsonb,'rows','easy',ARRAY['where']),
('Conta ordini paid','Conta ordini paid','SELECT COUNT(*) FROM orders WHERE status = ''PAID''','{"minRows":1}'::jsonb,'rows','easy',ARRAY['aggregate']);
