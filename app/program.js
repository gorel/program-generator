export function renderProgram(program) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (program.days.length >= 7) {
    app.classList.add("compact-print");
  } else {
    app.classList.remove("compact-print");
  }

  const title = document.createElement("h1");
  title.textContent = program.program.title;
  app.appendChild(title);

  for (const day of program.days) {
    const section = document.createElement("section");
    section.className = "day";

    const maxSets = Math.max(...day.exercises.map((e) => Number(e.sets)));

    const setHeaders = Array.from(
      { length: maxSets },
      (_, i) => `<th>Set ${i + 1}</th>`,
    ).join("");

    const wrapper = document.createElement("div");
    wrapper.className = "day-wrapper";

    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = day.name;

    const table = document.createElement("table");

    const setCols = Array.from(
      { length: maxSets },
      () => `<col class="col-set">`,
    ).join("");

    table.innerHTML = `
      <colgroup>
        <col class="col-exercise">
        <col class="col-sets">
        <col class="col-reps">
        <col class="col-weight">
        ${setCols}
        <col class="col-notes">
        <col class="col-increment">
      </colgroup>
    `;

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Exercise</th>
        <th>Sets</th>
        <th>Reps</th>
        <th>Weight</th>
        ${setHeaders}
        <th>Notes</th>
        <th>Increment</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const exercise of day.exercises) {
      const tr = document.createElement("tr");
      const sets = Number(exercise.sets);
      const setCells = Array.from({ length: maxSets }, (_, i) =>
        i < sets ? `<td></td>` : `<td class="inactive"></td>`,
      ).join("");
      tr.innerHTML = `
        <td>${exercise.name}</td>
        <td class="center">${exercise.sets}</td>
        <td class="center">${exercise.reps ?? ""}</td>
        <td></td>
        ${setCells}
        <td></td>
        <td></td>
      `;
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(label);
    wrapper.appendChild(table);
    section.appendChild(wrapper);
    app.appendChild(section);
  }
}
