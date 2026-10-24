/* UI owns persisted food choices; nearby selections and coordinates live only in this session. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    state = Store.read(),
    wheel = new MakanWheel($("wheel"));
  let category = "All",
    places = [],
    nearbySelected = new Set(),
    lastSearch = null,
    searching = false,
    editing = null,
    confirmAction = null,
    audio = null,
    toastTimer,
    storageWarned = false;
  const foods = () => [...FoodData.defaults, ...state.custom];
  const options = () => [
    ...foods().filter((f) => state.selected.includes(f.id)),
    ...places.filter((f) => nearbySelected.has(f.id)),
  ];
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function toast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").hidden = true), 4500);
  }
  function save() {
    if (!Store.save(state) && !storageWarned) {
      storageWarned = true;
      toast(
        "Browser storage is unavailable. Changes will last for this visit only.",
      );
    }
  }
  function updateWheel() {
    const items = options();
    wheel.setItems(items);
    $("selected-count").textContent = items.length;
    $("wheel-count").textContent = items.length + " choices";
    $("spin").disabled = wheel.busy || !items.length;
    $("wheel-status").textContent = items.length
      ? items.length === 1
        ? "One choice selected."
        : "Ready when you are."
      : "Select a food or nearby place to begin.";
    $("legend").replaceChildren(...items.map((f) => el("li", "", f.name)));
  }
  function renderCategories() {
    const cats = ["All", ...Object.keys(FoodData.groups)];
    $("categories").replaceChildren(
      ...cats.map((name) => {
        const b = el("button", name === category ? "active" : "", name);
        b.type = "button";
        b.setAttribute("aria-pressed", String(name === category));
        b.onclick = () => {
          category = name;
          renderCategories();
          renderFoods();
        };
        return b;
      }),
    );
  }
  function renderFoods() {
    const query = $("search").value.trim().toLowerCase();
    const visible = foods().filter(
      (f) =>
        (category === "All" || f.category === category) &&
        f.name.toLowerCase().includes(query),
    );
    $("visible-count").textContent = visible.length;
    $("food-list").replaceChildren(
      ...visible.map((food) => {
        const row = el("div", "food-row"),
          label = el("label"),
          check = el("input");
        check.type = "checkbox";
        check.checked = state.selected.includes(food.id);
        check.disabled = wheel.busy;
        check.onchange = () => {
          state.selected = check.checked
            ? [...state.selected, food.id]
            : state.selected.filter((id) => id !== food.id);
          save();
          updateWheel();
        };
        label.append(
          check,
          el("span", "food-icon", FoodData.icons[food.category]),
          el("span", "", food.name),
        );
        row.append(label);
        if (food.custom) {
          const edit = el("button", "icon-button", "✎"),
            remove = el("button", "icon-button", "×");
          edit.setAttribute("aria-label", "Edit " + food.name);
          remove.setAttribute("aria-label", "Delete " + food.name);
          edit.disabled = remove.disabled = wheel.busy;
          edit.onclick = () => {
            editing = food.id;
            $("edit-name").value = food.name;
            $("edit-dialog").showModal();
          };
          remove.onclick = () =>
            confirm(
              "Delete this craving?",
              `Remove “${food.name}” from your custom menu?`,
              () => {
                state.custom = state.custom.filter((f) => f.id !== food.id);
                state.selected = state.selected.filter((id) => id !== food.id);
                save();
                renderFoods();
                updateWheel();
              },
            );
          row.append(edit, remove);
        } else row.append(el("small", "", food.category));
        return row;
      }),
    );
    if (!visible.length)
      $("food-list").append(
        el(
          "p",
          "empty-history",
          "No foods found. Try another search.",
        ),
      );
  }
  function validName(name, id) {
    if (!name) {
      toast("Give your craving a name first.");
      return false;
    }
    if (name.length > 70) {
      toast("Please keep food names under 71 characters.");
      return false;
    }
    if (
      foods().some(
        (f) => f.id !== id && f.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      toast("That craving is already on the menu.");
      return false;
    }
    return true;
  }
  function confirm(title, message, action) {
    confirmAction = action;
    $("confirm-title").textContent = title;
    $("confirm-message").textContent = message;
    $("confirm-dialog").showModal();
  }
  $("confirm-cancel").onclick = () => $("confirm-dialog").close();
  $("confirm-ok").onclick = () => {
    $("confirm-dialog").close();
    if (confirmAction) confirmAction();
    confirmAction = null;
  };
  $("custom-form").onsubmit = (e) => {
    e.preventDefault();
    if (wheel.busy) return;
    const name = $("custom-name").value.trim();
    if (!validName(name)) return;
    const food = {
      id: "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      name,
      category: "Others",
      custom: true,
    };
    state.custom.push(food);
    state.selected.push(food.id);
    $("custom-name").value = "";
    category = "All";
    $("search").value = "";
    save();
    renderCategories();
    renderFoods();
    updateWheel();
    toast("Added to your menu and wheel.");
  };
  $("edit-form").onsubmit = (e) => {
    e.preventDefault();
    const name = $("edit-name").value.trim();
    if (!validName(name, editing)) return;
    const food = state.custom.find((f) => f.id === editing);
    if (food) food.name = name;
    $("edit-dialog").close();
    save();
    renderFoods();
    updateWheel();
  };
  $("edit-cancel").onclick = () => $("edit-dialog").close();
  $("search").oninput = renderFoods;
  $("select-all").onclick = () => {
    if (wheel.busy) return;
    state.selected = foods().map((f) => f.id);
    save();
    renderFoods();
    updateWheel();
  };
  $("clear-all").onclick = () => {
    if (wheel.busy) return;
    state.selected = [];
    save();
    renderFoods();
    updateWheel();
  };
  $("reset-defaults").onclick = () =>
    confirm(
      "Restore the house menu?",
      "Restore all default foods and the first eight selections. Your custom foods will stay on the menu.",
      () => {
        state.selected = Store.fresh().selected;
        category = "All";
        $("search").value = "";
        save();
        renderCategories();
        renderFoods();
        updateWheel();
        toast("The house menu is restored.");
      },
    );
  function renderHistory() {
    const nodes = state.history.map((h) => {
      const item = el("div", "history-item");
      item.append(
        el("strong", "", h.name),
        el(
          "small",
          "",
          new Date(h.time).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        ),
      );
      return item;
    });
    $("history-list").replaceChildren(...nodes);
    if (!nodes.length)
      $("history-list").append(
        el(
          "div",
          "empty-history",
          "Your picks will appear here after a spin.",
        ),
      );
  }
  function tick() {
    if (!state.sound) return;
    try {
      const context = audio;
      if (!context) return;
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.setValueAtTime(640, context.currentTime);
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.035,
      );
      oscillator.start();
      oscillator.stop(context.currentTime + 0.04);
    } catch {
      /* Sound is optional when browser audio is unavailable. */
    }
  }
  function lock(value) {
    [
      "select-all",
      "clear-all",
      "reset-defaults",
      "reset-all",
      "custom-name",
      "locate",
      "radius",
      "latitude",
      "longitude",
      "retry",
      "nearby-all",
      "nearby-clear",
    ].forEach((id) => ($(id).disabled = value));
    document
      .querySelectorAll("#custom-form button,#coordinates button")
      .forEach((b) => (b.disabled = value));
    renderFoods();
    renderPlaces();
  }
  async function spin() {
    if (wheel.busy || searching || !options().length) return;
    if (state.sound) {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (Audio) {
          audio = audio || new Audio();
          audio.resume().catch(() => {});
        }
      } catch {
        toast("Sound is unavailable in this browser.");
      }
    }
    const promise = wheel.spin(state.history[0]?.id, state.avoid, tick);
    $("spin").disabled = true;
    $("spin").textContent = "Spinning…";
    $("wheel-status").textContent = "Let’s see what’s for makan.";
    lock(true);
    const winner = await promise;
    lock(false);
    $("spin").replaceChildren(
      document.createTextNode("Spin the wheel "),
      el("span", "", "↗"),
    );
    updateWheel();
    if (!winner) return;
    state.history.unshift({
      id: winner.id,
      name: winner.name,
      time: Date.now(),
    });
    state.history = state.history.slice(0, 10);
    save();
    renderHistory();
    $("winner-name").textContent = winner.name;
    $("winner-map").hidden = !winner.nearby;
    if (winner.nearby) $("winner-map").href = Nearby.mapLink(winner);
    else $("winner-map").removeAttribute("href");
    $("confetti").replaceChildren();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      for (let i = 0; i < 35; i++) {
        const bit = el("i");
        bit.style.left = Math.random() * 100 + "%";
        bit.style.background = wheel.colors[i % 8];
        bit.style.animationDelay = Math.random() * 0.7 + "s";
        $("confetti").append(bit);
      }
    $("result-dialog").showModal();
  }
  $("spin").onclick = spin;
  $("close-result").onclick = () => $("result-dialog").close();
  $("spin-again").onclick = () => {
    $("result-dialog").close();
    spin();
  };
  $("theme").value = state.theme;
  document.body.dataset.theme = state.theme;
  $("theme").onchange = () => {
    state.theme = $("theme").value;
    document.body.dataset.theme = state.theme;
    save();
  };
  ["avoid", "sound"].forEach((id) => {
    $(id).checked = state[id];
    $(id).onchange = () => {
      state[id] = $(id).checked;
      save();
    };
  });
  function renderPlaces() {
    $("nearby-toolbar").hidden = !places.length;
    $("places").replaceChildren(
      ...places.map((place) => {
        const row = el("div", "place"),
          label = el("label"),
          check = el("input"),
          body = el("span");
        check.type = "checkbox";
        check.checked = nearbySelected.has(place.id);
        check.disabled = wheel.busy;
        check.onchange = () => {
          if (check.checked) nearbySelected.add(place.id);
          else nearbySelected.delete(place.id);
          updateWheel();
        };
        body.append(
          document.createTextNode(place.name),
          el(
            "small",
            "",
            place.category +
              " · " +
              (place.distance < 1000
                ? Math.round(place.distance) + " m"
                : (place.distance / 1000).toFixed(1) + " km"),
          ),
        );
        label.append(check, body);
        const link = el("a", "", "Map ↗");
        link.href = Nearby.mapLink(place);
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute(
          "aria-label",
          "Find " + place.name + " on Google Maps",
        );
        row.append(label, link);
        return row;
      }),
    );
  }
  async function search(lat, lon) {
    if (searching || wheel.busy) return;
    searching = true;
    lastSearch = { lat, lon };
    $("locate").disabled = true;
    $("retry").hidden = true;
    $("nearby-status").className = "loading";
    $("nearby-status").textContent =
      "Finding nearby food. This may take up to 30 seconds…";
    document
      .querySelectorAll("#coordinates button,#radius")
      .forEach((n) => (n.disabled = true));
    try {
      const results = await Nearby.search(lat, lon, Number($("radius").value));
      if (wheel.busy) {
        toast("Search is ready. Retry after the wheel stops.");
        return;
      }
      places = results;
      nearbySelected = new Set(
        [...nearbySelected].filter((id) => places.some((p) => p.id === id)),
      );
      renderPlaces();
      updateWheel();
      $("nearby-status").textContent = places.length
        ? `${places.length} places found (up to 150). Select places to add to your wheel.`
        : "No places found in this area. Try a wider radius or different coordinates.";
    } catch (error) {
      $("nearby-status").textContent =
        error.message +
        (places.length ? " Previous results are still shown." : "");
      $("retry").hidden = false;
    } finally {
      searching = false;
      $("nearby-status").className = "";
      $("locate").disabled = wheel.busy;
      document
        .querySelectorAll("#coordinates button,#radius")
        .forEach((n) => (n.disabled = wheel.busy));
    }
  }
  $("coordinates").onsubmit = (e) => {
    e.preventDefault();
    if (!$("latitude").value.trim() || !$("longitude").value.trim()) return;
    search(Number($("latitude").value), Number($("longitude").value));
  };
  $("locate").onclick = () => {
    if (!navigator.geolocation) {
      $("nearby-status").textContent =
        "Location is unavailable in this browser. Enter coordinates manually.";
      $("manual-details").open = true;
      return;
    }
    $("locate").disabled = true;
    $("nearby-status").textContent = "Waiting for location permission…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        $("locate").disabled = wheel.busy;
        if (wheel.busy) {
          $("nearby-status").textContent =
            "Location received. Click Use my location after the spin ends to search.";
          return;
        }
        search(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        $("locate").disabled = wheel.busy;
        $("nearby-status").textContent =
          error.code === 1
            ? "Location permission was denied. Enter coordinates manually."
            : "Your browser could not get a location. On file:// this may be blocked; enter coordinates manually.";
        $("manual-details").open = true;
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  };
  $("retry").onclick = () => {
    if (lastSearch) search(lastSearch.lat, lastSearch.lon);
  };
  $("nearby-all").onclick = () => {
    if (wheel.busy) return;
    nearbySelected = new Set(places.map((f) => f.id));
    renderPlaces();
    updateWheel();
  };
  $("nearby-clear").onclick = () => {
    if (wheel.busy) return;
    nearbySelected.clear();
    renderPlaces();
    updateWheel();
  };
  $("reset-all").onclick = () =>
    confirm(
      "Start fresh, lah?",
      "This removes your custom foods, selections, history and preferences from this browser.",
      () => {
        Object.assign(state, Store.fresh());
        places = [];
        nearbySelected.clear();
        lastSearch = null;
        category = "All";
        $("search").value = "";
        $("latitude").value = "";
        $("longitude").value = "";
        $("radius").value = "3000";
        $("theme").value = state.theme;
        document.body.dataset.theme = state.theme;
        $("avoid").checked = $("sound").checked = false;
        $("nearby-status").textContent = "Choose a location to see nearby places.";
        $("retry").hidden = true;
        save();
        renderCategories();
        renderFoods();
        renderPlaces();
        renderHistory();
        updateWheel();
        toast("Fresh menu. Fresh decisions.");
      },
    );
  renderCategories();
  renderFoods();
  renderHistory();
  updateWheel();
  if (!Store.available)
    toast("Browser storage is unavailable. Your menu works for this visit.");
})();
