/* Shared, file://-safe UI primitives. No external icons or HTML interpolation. */
window.UI = (() => {
  const paths = {
    search: ['M21 21l-5-5', 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
    location: ['M12 22s7-6 7-13A7 7 0 0 0 5 9c0 7 7 13 7 13Z', 'M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
    arrow: ['M6 18 18 6M6 6h12v12'],
    edit: ['m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5'],
    close: ['m6 6 12 12M18 6 6 18'],
    plus: ['M12 5v14M5 12h14'],
    refresh: ['M20 7v5h-5M4 17v-5h5', 'M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2'],
    globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18'],
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ui-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (const d of paths[name] || paths.plus) {
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', d); svg.append(path);
    }
    return svg;
  }
  function mountIcons() {
    document.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon)));
  }
  function iconPicker(container, name, initial = '🍲', onChange = () => {}) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'icon-picker';
    const legend = document.createElement('legend'); legend.textContent = 'Food icon';
    const grid = document.createElement('div'); grid.className = 'icon-grid';
    const inputs = FoodData.iconChoices.map(choice => {
      const label = document.createElement('label'), input = document.createElement('input'), face = document.createElement('span');
      input.type = 'radio'; input.name = name; input.value = choice.icon;
      input.setAttribute('aria-label', choice.label); input.checked = choice.icon === initial;
      input.onchange = () => { if (input.checked) onChange(input.value); };
      face.textContent = choice.icon; face.setAttribute('aria-hidden', 'true');
      label.title = choice.label; label.append(input, face); grid.append(label); return input;
    });
    fieldset.append(legend, grid); container.replaceChildren(fieldset);
    return {
      get value() { return inputs.find(input => input.checked)?.value || '🍲'; },
      set value(value) { const valid = FoodData.iconChoices.some(choice => choice.icon === value) ? value : '🍲'; inputs.forEach(input => input.checked = input.value === valid); onChange(valid); },
      set disabled(value) { fieldset.disabled = value; },
    };
  }
  return { icon, mountIcons, iconPicker };
})();
