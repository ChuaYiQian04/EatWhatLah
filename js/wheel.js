window.MakanWheel = class {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.items = [];
    this.rotation = 0;
    this.busy = false;
    this.colors = [
      "#edc45b",
      "#337568",
      "#cf6045",
      "#e7b486",
      "#91a991",
      "#f3dc9b",
      "#b74031",
      "#6f9d95",
    ];
  }
  setItems(items) {
    if (this.busy) return;
    this.items = items.slice();
    this.draw();
  }
  draw() {
    const c = this.ctx,
      n = this.items.length,
      r = 400;
    c.clearRect(0, 0, 800, 800);
    if (!n) {
      c.fillStyle = "#ece8da";
      c.beginPath();
      c.arc(r, r, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#52645a";
      c.font = "24px sans-serif";
      c.textAlign = "center";
      c.fillText("Pick a few cravings to begin", 400, 230);
      return;
    }
    const step = (2 * Math.PI) / n;
    this.items.forEach((item, i) => {
      const start = -Math.PI / 2 + this.rotation + i * step;
      c.beginPath();
      c.moveTo(r, r);
      c.arc(r, r, r, start, start + step);
      c.closePath();
      c.fillStyle = this.colors[i % this.colors.length];
      c.fill();
      c.strokeStyle = "#fffcf577";
      c.lineWidth = 2;
      c.stroke();
      c.save();
      c.translate(r, r);
      c.rotate(start + step / 2);
      c.textAlign = "right";
      c.textBaseline = "middle";
      c.fillStyle = [1, 2, 6].includes(i % 8) ? "#fff9e8" : "#243b35";
      c.font = `bold ${n > 24 ? 17 : n > 14 ? 21 : 26}px sans-serif`;
      const label =
        n > 24
          ? String(i + 1)
          : item.name.length > 19
            ? item.name.slice(0, 17) + "…"
            : item.name;
      c.fillText(label, 365, 0, 245);
      c.restore();
    });
  }
  // Every segment starts at twelve o'clock. Align the chosen segment's centre to that pointer.
  spin(lastId, avoid, tick) {
    if (this.busy || !this.items.length) return Promise.resolve(null);
    this.busy = true;
    const eligible = this.items
      .map((f, i) => i)
      .filter(
        (i) => !(avoid && this.items.length > 1 && this.items[i].id === lastId),
      );
    const index = eligible[Math.floor(Math.random() * eligible.length)],
      step = (2 * Math.PI) / this.items.length;
    const tau = 2 * Math.PI,
      normalized = ((this.rotation % tau) + tau) % tau;
    const target = (tau - (((index + 0.5) * step) % tau)) % tau;
    const delta = 5 * tau + ((target - normalized + tau) % tau),
      initial = this.rotation;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
      duration = reduced ? 80 : 4800;
    return new Promise((resolve) => {
      let start,
        lastSector = -1;
      const frame = (now) => {
        if (start === undefined) start = now;
        const p = Math.min((now - start) / duration, 1);
        this.rotation = initial + delta * (1 - Math.pow(1 - p, 4));
        this.draw();
        const sector = Math.floor(this.rotation / step);
        if (sector !== lastSector) {
          if (tick && !reduced) tick();
          lastSector = sector;
        }
        if (p < 1) requestAnimationFrame(frame);
        else {
          this.rotation = target;
          this.draw();
          this.busy = false;
          resolve(this.items[index]);
        }
      };
      requestAnimationFrame(frame);
    });
  }
};
