export const EXERCISES = [
  { title: 'SELECT base', topic: 'SELECT', difficulty: 'Base', query: 'SELECT id, name FROM customers LIMIT 10;' },
  { title: 'JOIN ordini clienti', topic: 'JOIN', difficulty: 'Intermedio', query: 'SELECT o.id, c.name, o.total_amount FROM orders o JOIN customers c ON c.id=o.customer_id LIMIT 15;' },
  { title: 'Aggregazione revenue', topic: 'GROUP BY', difficulty: 'Intermedio', query: 'SELECT status, ROUND(SUM(total_amount),2) AS tot FROM orders GROUP BY status;' },
  { title: 'Window ranking', topic: 'WINDOW', difficulty: 'Avanzato', query: 'SELECT customer_id,total_amount,ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY total_amount DESC) rn FROM orders LIMIT 20;' }
];
