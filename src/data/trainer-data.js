export const TRAINER_CHALLENGES = [
  {
    name: 'Revenue per status',
    description: 'Calcola revenue per stato ordine.',
    query: 'SELECT status, ROUND(SUM(total_amount),2) AS revenue FROM orders GROUP BY status ORDER BY status;',
    expected: [{ status: 'PAID' }, { status: 'PENDING' }, { status: 'REFUNDED' }, { status: 'SHIPPED' }]
  },
  {
    name: 'Top customers by orders',
    description: 'Trova i clienti con piu ordini.',
    query: 'SELECT customer_id, COUNT(*) AS n_orders FROM orders GROUP BY customer_id ORDER BY n_orders DESC LIMIT 5;',
    expected: null
  }
];
