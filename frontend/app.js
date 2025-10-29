document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  if (!calendarEl) {
    console.error("❌ No se encontró el elemento #calendar en el DOM.");
    return;
  }

  // ===============================
  // Inicialización del calendario
  // ===============================
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    allDaySlot: false,
    slotMinTime: "07:00:00",
    slotMaxTime: "20:00:00",
    nowIndicator: true,
    selectable: true,
    height: "auto",
    locale: "es",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },

    // 🎯 Clic en una hora => abrir modal
    dateClick: function (info) {
      const modal = document.getElementById("modal");
      const fechaInput = document.getElementById("fecha");
      const horaInput = document.getElementById("hora");

      fechaInput.value = info.dateStr.split("T")[0];
      horaInput.value = info.dateStr.split("T")[1]?.slice(0, 5) || "";

      modal.style.display = "flex"; // mostrar modal centrado
    },

    // 🔄 Cargar tareas desde el backend
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const res = await fetch("http://127.0.0.1:5000/tareas");
        if (!res.ok) throw new Error("Error al obtener tareas");
        const data = await res.json();

        const eventos = data.map((t) => ({
          title: `${t.nombre} (P${t.prioridad})`,
          start: `${t.fecha}T${t.hora}`,
          duration: `${t.duracion}m`,
          backgroundColor:
            t.estado === "Realizada"
              ? "#81c784"
              : t.estado === "En proceso"
              ? "#ffb74d"
              : "#64b5f6",
          borderColor: "#1976d2",
        }));

        successCallback(eventos);
      } catch (err) {
        console.error("❌ Error al cargar tareas:", err);
        failureCallback(err);
      }
    },
  });

  calendar.render();

  // ===============================
  // BOTONES
  // ===============================
  document
    .getElementById("btnRecargar")
    .addEventListener("click", () => calendar.refetchEvents());

  document
    .getElementById("btnSugerir")
    .addEventListener("click", async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/sugerencias");
        const data = await res.text();
        document.getElementById("sugerencia").innerText = data;
      } catch (err) {
        console.error("❌ Error al obtener sugerencias:", err);
      }
    });

  // ===============================
  // MODAL DE NUEVA TAREA
  // ===============================
  const modal = document.getElementById("modal");
  const btnCancelar = document.getElementById("btnCancelar");
  const btnGuardar = document.getElementById("btnGuardar");

  btnCancelar.onclick = () => {
    modal.style.display = "none";
  };

  btnGuardar.onclick = async () => {
    const nombre = document.getElementById("nombre").value.trim();
    const prioridad = document.getElementById("prioridad").value;
    const duracion = document.getElementById("duracion").value;
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;

    if (!nombre || !hora || !fecha) {
      alert("⚠️ Por favor completa todos los campos.");
      return;
    }

    const tarea = { nombre, prioridad, duracion, fecha, hora };

    try {
      const res = await fetch("http://127.0.0.1:5000/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tarea),
      });

      if (!res.ok) throw new Error("Error al guardar tarea");

      modal.style.display = "none";
      calendar.refetchEvents();
    } catch (err) {
      console.error("❌ Error al guardar tarea:", err);
      alert("Error al guardar tarea.");
    }
  };
});
