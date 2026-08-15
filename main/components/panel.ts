window.createPanel = function createPanel({ title, body }: { title: string; body: string }): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'panel';

    const h2 = document.createElement('h2');
    h2.textContent = title;

    const p = document.createElement('p');
    p.textContent = body;

    panel.appendChild(h2);
    panel.appendChild(p);

    return panel;
  };
