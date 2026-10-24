window.Store = (() => {
  const key = "eatwhatlah-v1";
  let available = true;
  const fresh = () => ({
    version: 1,
    theme: "kopitiam",
    custom: [],
    selected: FoodData.defaults.slice(0, 8).map((f) => f.id),
    history: [],
    avoid: false,
    sound: false,
  });
  function read() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fresh();
      const data = JSON.parse(raw);
      if (!data || data.version !== 1) return fresh();
      const result = fresh(),
        names = new Set(FoodData.defaults.map((f) => f.name.toLowerCase())),
        ids = new Set();
      if (Array.isArray(data.custom))
        result.custom = data.custom
          .filter((f) => {
            if (
              !f ||
              typeof f.id !== "string" ||
              !f.id.startsWith("custom-") ||
              ids.has(f.id) ||
              typeof f.name !== "string" ||
              !f.name.trim() ||
              f.name.length > 70 ||
              names.has(f.name.trim().toLowerCase())
            )
              return false;
            names.add(f.name.trim().toLowerCase());
            ids.add(f.id);
            return true;
          })
          .map((f) => ({
            id: f.id,
            name: f.name.trim(),
            category: "Others",
            icon: FoodData.iconChoices.some(choice => choice.icon === f.icon) ? f.icon : FoodData.icons.Others,
            custom: true,
          }));
      const valid = new Set(
        [...FoodData.defaults, ...result.custom].map((f) => f.id),
      );
      if (Array.isArray(data.selected))
        result.selected = [
          ...new Set(data.selected.filter((id) => valid.has(id))),
        ];
      if (["kopitiam", "cute", "midnight", "minimal"].includes(data.theme))
        result.theme = data.theme;
      result.avoid = data.avoid === true;
      result.sound = data.sound === true;
      if (Array.isArray(data.history))
        result.history = data.history
          .filter(
            (h) =>
              h &&
              typeof h.name === "string" &&
              h.name.length <= 200 &&
              Number.isFinite(h.time) &&
              typeof h.id === "string",
          )
          .slice(0, 10)
          .map((h) => ({ id: h.id, name: h.name, time: h.time }));
      return result;
    } catch (error) {
      if (error.name !== "SyntaxError") available = false;
      return fresh();
    }
  }
  return {
    read,
    fresh,
    save(data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch {
        available = false;
        return false;
      }
    },
    get available() {
      return available;
    },
  };
})();
