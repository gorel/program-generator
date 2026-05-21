import { loadProgramList, loadProgram } from "./data.js";
import { calculateStats } from "./stats.js";

export async function renderIndex(movementTargets, exerciseMapping) {
  const app = document.getElementById("app");
  app.innerHTML = `<h1>Programs <a href="builder.html" class="nav-link">+ New Program</a> <a href="preview.html" class="nav-link">Preview YAML</a></h1>`;

  const programList = await loadProgramList();

  const rows = await Promise.all(
    programList.map(async (entry) => {
      const program = await loadProgram(entry.id);
      const stats = calculateStats(program, movementTargets, exerciseMapping);
      return { entry, program, days: program.days.length, stats };
    }),
  );

  const movements = Object.keys(movementTargets);

  renderFilterAndTable(app, rows, movements, movementTargets);
}

function renderFilterAndTable(app, rows, movements, movementTargets) {
  const filterState = { name: "", days: "any", movements: {} };
  const sortState = { key: null, dir: null };

  // --- Filter panel ---
  const panel = document.createElement("div");
  panel.className = "filter-panel";

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Filter…";
  nameLabel.appendChild(nameInput);
  panel.appendChild(nameLabel);

  const daysLabel = document.createElement("label");
  daysLabel.textContent = "Days";
  const daysSelect = document.createElement("select");
  const distinctDays = [...new Set(rows.map((r) => r.days))].sort((a, b) => a - b);
  daysSelect.innerHTML =
    `<option value="any">Any</option>` +
    distinctDays.map((d) => `<option value="${d}">${d}</option>`).join("");
  daysLabel.appendChild(daysSelect);
  panel.appendChild(daysLabel);

  for (const m of movements) {
    const lbl = document.createElement("label");
    lbl.textContent = m;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.placeholder = "min sets";
    inp.dataset.movement = m;
    lbl.appendChild(inp);
    panel.appendChild(lbl);
  }

  app.appendChild(panel);

  // --- Table ---
  const table = document.createElement("table");
  table.className = "index-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const subRow = document.createElement("tr");

  function makeHeader(text, key) {
    const th = document.createElement("th");
    th.dataset.sortKey = key;
    th.style.cursor = "pointer";
    th.textContent = text;
    th.addEventListener("click", () => onSort(key));
    headerRow.appendChild(th);

    const sub = document.createElement("th");
    sub.className = "subheader";
    subRow.appendChild(sub);
  }

  makeHeader("Program", "name");
  makeHeader("Days", "days");

  for (const m of movements) {
    const th = document.createElement("th");
    th.dataset.sortKey = `movement:${m}`;
    th.style.cursor = "pointer";
    th.textContent = m;
    th.addEventListener("click", () => onSort(`movement:${m}`));
    headerRow.appendChild(th);

    const sub = document.createElement("th");
    sub.className = "subheader";
    const target = movementTargets[m];
    sub.textContent = target ? `${target.low}–${target.high}` : "";
    subRow.appendChild(sub);
  }

  thead.appendChild(headerRow);
  thead.appendChild(subRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  app.appendChild(table);

  // --- Event wiring ---
  nameInput.addEventListener("input", () => {
    filterState.name = nameInput.value;
    applyFilterSort();
  });

  daysSelect.addEventListener("change", () => {
    filterState.days = daysSelect.value;
    applyFilterSort();
  });

  panel.querySelectorAll("input[data-movement]").forEach((inp) => {
    inp.addEventListener("input", () => {
      filterState.movements[inp.dataset.movement] = inp.value;
      applyFilterSort();
    });
  });

  function onSort(key) {
    if (sortState.key === key) {
      if (sortState.dir === "asc") sortState.dir = "desc";
      else if (sortState.dir === "desc") {
        sortState.key = null;
        sortState.dir = null;
      }
    } else {
      sortState.key = key;
      sortState.dir = "asc";
    }
    updateSortIndicators();
    applyFilterSort();
  }

  function updateSortIndicators() {
    thead.querySelectorAll("th[data-sort-key]").forEach((th) => {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.dataset.sortKey === sortState.key) {
        th.classList.add(sortState.dir === "asc" ? "sorted-asc" : "sorted-desc");
      }
    });
  }

  function applyFilterSort() {
    let visible = rows.filter((r) => {
      if (
        filterState.name &&
        !r.entry.name.toLowerCase().includes(filterState.name.toLowerCase())
      )
        return false;
      if (filterState.days !== "any" && r.days !== Number(filterState.days))
        return false;
      for (const [m, val] of Object.entries(filterState.movements)) {
        if (val === "" || val === null) continue;
        const min = Number(val);
        const actual = r.stats.summary[m] || 0;
        if (actual < min) return false;
      }
      return true;
    });

    if (sortState.key) {
      visible = [...visible].sort((a, b) => {
        let av, bv;
        if (sortState.key === "name") {
          av = a.entry.name;
          bv = b.entry.name;
        } else if (sortState.key === "days") {
          av = a.days;
          bv = b.days;
        } else {
          const m = sortState.key.replace("movement:", "");
          av = a.stats.summary[m] || 0;
          bv = b.stats.summary[m] || 0;
        }
        if (av < bv) return sortState.dir === "asc" ? -1 : 1;
        if (av > bv) return sortState.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    tbody.innerHTML = "";
    for (const r of visible) {
      const tr = document.createElement("tr");
      tr.dataset.id = r.entry.id;

      const nameTd = document.createElement("td");
      const link = document.createElement("a");
      link.href = `?program=${r.entry.id}`;
      link.textContent = r.entry.name;
      nameTd.appendChild(link);
      tr.appendChild(nameTd);

      const daysTd = document.createElement("td");
      daysTd.className = "center";
      daysTd.textContent = r.days;
      tr.appendChild(daysTd);

      for (const m of movements) {
        const td = document.createElement("td");
        td.className = "center";
        const sets = r.stats.summary[m];
        if (sets != null) {
          td.textContent = sets;
          const target = movementTargets[m];
          if (target) {
            td.classList.add(
              sets >= target.low && sets <= target.high ? "cell-good" : "cell-bad",
            );
          }
        }
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
  }

  applyFilterSort();
}
