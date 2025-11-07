// frontend/app.js
const API_BASE = "http://127.0.0.1:5000";
const calendarEl = document.getElementById("calendar");

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ app.js cargado");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "es",
    editable: true,
    selectable: true,
    eventDurationEditable: true,
    eventResizableFromStart: true,
    height: "auto",
    themeSystem: "bootstrap5",

    // Cargar eventos desde el backend
    events: async (info, success, failure) => {
      try {
        const res = await fetch(`${API_BASE}/tareas`);
        const data = await res.json();
        const eventos = data.map((t) => {
          const start = new Date(`${t.fecha}T${t.hora}`);
          const end = new Date(start.getTime() + t.duracion * 60000);
          return {
            id: String(t.id),
            title: `${t.nombre} (P${t.prioridad})`,
            start: start.toISOString(),
            end: end.toISOString(),
            backgroundColor:
              t.estado === "Realizada" ? "#81c784" :
              t.estado === "En proceso" ? "#ffb74d" : "#64b5f6",
            borderColor: "#1976d2",
            extendedProps: { id: t.id, prioridad: t.prioridad, estado: t.estado }
          };
        });
        success(eventos);
      } catch (e) {
        console.error("Error cargando eventos:", e);
        failure(e);
      }
    },

    // Crear evento (click en día)
    dateClick: async (info) => {
      const nombre = prompt("Nombre del evento:");
      if (!nombre) return;
      const hora = prompt("Hora inicio (HH:MM):", "09:00");
      if (!hora) return;
      const duracion = prompt("Duración (min):", "60");
      if (!duracion) return;

      try {
        const res = await fetch(`${API_BASE}/tareas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, fecha: info.dateStr, hora, duracion: +duracion, prioridad: 3 })
        });
        if (!res.ok) throw new Error("Error al crear");
        alert("✅ Tarea creada");
        calendar.refetchEvents();
      } catch (e) {
        console.error(e); alert("❌ Error al crear");
      }
    },

    // Editar / Eliminar (click en evento)
    eventClick: async (info) => {
      const ev = info.event;
      const id = ev.extendedProps?.id;
      const opcion = prompt("1. Editar nombre\n2. Eliminar\n(1/2)", "1");
      if (!opcion) return;

      if (opcion === "1") {
        const nuevoNombre = prompt("Nuevo nombre:", ev.title);
        if (!nuevoNombre) return;
        const body = {
          nombre: nuevoNombre.replace(/\s*\(P\d+\)\s*$/, ""),
          fecha: ev.startStr.slice(0, 10),
          hora: ev.startStr.slice(11, 16),
          duracion: Math.round((ev.end - ev.start) / 60000)
        };
        try {
          const res = await fetch(`${API_BASE}/tareas/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error();
          alert("✏️ Evento actualizado");
          calendar.refetchEvents();
        } catch { alert("❌ Error al editar"); }
      } else if (opcion === "2") {
        if (!confirm("¿Eliminar esta tarea?")) return;
        try {
          const res = await fetch(`${API_BASE}/tareas/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
          alert("🗑️ Tarea eliminada");
          calendar.refetchEvents();
        } catch { alert("❌ Error al eliminar"); }
      }
    },

    // Reprogramar (drag & drop)
    eventDrop: async (info) => {
      const ev = info.event; const id = ev.extendedProps?.id;
      try {
        const res = await fetch(`${API_BASE}/tareas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: ev.startStr.slice(0, 10),
            hora: ev.startStr.slice(11, 16)
          })
        });
        if (!res.ok) throw new Error();
      } catch {
        alert("❌ Error al mover"); info.revert();
      }
    },

    // Cambiar duración (resize)
    eventResize: async (info) => {
      const ev = info.event; const id = ev.extendedProps?.id;
      const minutos = Math.round((ev.end - ev.start) / 60000);
      try {
        const res = await fetch(`${API_BASE}/tareas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duracion: minutos })
        });
        if (!res.ok) throw new Error();
      } catch {
        alert("❌ Error al cambiar duración"); info.revert();
      }
    }
  });

  calendar.render();
});

// Exponer helper para refrescar desde el chatbot
window._refreshCalendar = function () {
  try {
    const calendar = FullCalendar.getCalendar(calendarEl);
    calendar && calendar.refetchEvents();
  } catch (e) { /* noop */ }
};
