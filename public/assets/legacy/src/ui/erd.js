import cytoscape from '../../vendor/cytoscape.esm.min.js';

function formatColumns(table) {
  return table.columns
    .map((col) => {
      const flags = [];
      if (col.pk) flags.push('PK');
      if (col.fk) flags.push('FK');
      if (col.notnull) flags.push('NN');
      const badge = flags.length ? ` [${flags.join(',')}]` : '';
      return `• ${col.name}${badge}`;
    })
    .join('\n');
}

function buildElements(schema) {
  const nodes = schema.tables.map((table) => ({
    data: {
      id: table.name,
      label: `${table.name}\n${formatColumns(table)}`,
      columns: table.columns
    }
  }));

  const edges = schema.edges.map((edge) => ({
    data: {
      id: `${edge.from}-${edge.to}-${edge.fromColumn}-${edge.toColumn}`,
      source: edge.from,
      target: edge.to,
      label: `${edge.fromColumn} → ${edge.toColumn}`
    }
  }));

  return [...nodes, ...edges];
}

export function createErd(container, { onTableClick } = {}) {
  if (!container) return null;
  container.innerHTML = '';
  const cy = cytoscape({
    container,
    elements: [],
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#172554',
          'label': 'data(label)',
          'color': '#fff',
          'font-size': 10,
          'text-valign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 180,
          'padding': '12px',
          'shape': 'round-rectangle',
          'border-width': 1,
          'border-color': '#1e3a8a',
          'line-height': 1.2
        }
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'bezier',
          'width': 2,
          'line-color': '#1d4ed8',
          'target-arrow-color': '#1d4ed8',
          'target-arrow-shape': 'triangle-backcurve',
          'arrow-scale': 0.8,
          'label': 'data(label)',
          'font-size': 9,
          'text-background-color': '#0f172a',
          'text-background-opacity': 0.7,
          'text-background-padding': 2,
          'text-rotation': 'autorotate',
          'color': '#cbd5f5'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-color': '#22d3ee',
          'border-width': 2
        }
      }
    ],
    layout: { name: 'cose', padding: 20 },
    wheelSensitivity: 0.2,
    minZoom: 0.2,
    maxZoom: 2.5
  });

  cy.on('tap', 'node', (evt) => {
    const id = evt.target.id();
    if (onTableClick) onTableClick(id);
  });

  function update(schema) {
    if (!schema || !schema.tables) return;
    const elements = buildElements(schema);
    cy.elements().remove();
    cy.add(elements);
    cy.layout({ name: 'cose', padding: 30, animate: false }).run();
    cy.fit(undefined, 24);
  }

  return { update };
}
