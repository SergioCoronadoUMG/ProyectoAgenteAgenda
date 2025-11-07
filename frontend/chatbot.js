// frontend/chatbot.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ chatbot.js cargado");

  const API_BASE = "http://127.0.0.1:5000";

  const chatContainer = document.getElementById("chat-container");
  const chatBody = document.getElementById("chat-body");
  const chatInput = document.getElementById("chat-input");
  const chatButton = document.getElementById("chat-send");
  const chatToggle = document.getElementById("chat-toggle");

  // Abrir / cerrar chatbot
  chatToggle.addEventListener("click", () => {
    chatContainer.classList.toggle("open");
    chatInput.focus();
  });

  chatButton.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Mostrar mensajes
  function appendMsg(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("msg", sender === "user" ? "msg-user" : "msg-bot");
    msgDiv.textContent = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Enviar texto al backend
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendMsg("user", text);
    chatInput.value = "";

    try {
      const res = await fetch(`${API_BASE}/nlu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: text }),
      });
      const data = await res.json();
      handleBotResponse(data);
    } catch (err) {
      console.error(err);
      appendMsg("bot", "⚠️ Error procesando tu mensaje.");
    }
  }

  // Procesar la respuesta del backend
  function handleBotResponse(data) {
    if (data.ayuda) {
      appendMsg("bot", "📘 Comandos disponibles:\n- " + data.ayuda.join("\n- "));
      return;
    }

    switch (data.accion) {
      case "crear":
        appendMsg("bot", `✅ Reunión registrada (#${data.tarea.id}): "${data.tarea.nombre}" ${data.tarea.fecha} ${data.tarea.hora}`);
        if (data.conflictos?.total > 0)
          appendMsg("bot", `⚠️ Hay ${data.conflictos.total} conflicto(s) detectado(s).`);
        refreshCalendar();
        break;

      case "editar":
        appendMsg("bot", `✏️ Reunión #${data.tarea.id} actualizada.`);
        refreshCalendar();
        break;

      case "eliminar":
        appendMsg("bot", data.ok ? `🗑️ Reunión eliminada (#${data.tarea_id})` : `❌ Error: ${data.error}`);
        refreshCalendar();
        break;

      case "listar_pendientes":
        if (data.datos.length === 0)
          appendMsg("bot", "📭 No tienes reuniones pendientes.");
        else {
          const lista = data.datos
            .map((t) => `• #${t.id} ${t.nombre} (${t.fecha} ${t.hora})`)
            .join("\n");
          appendMsg("bot", `📋 Pendientes:\n${lista}`);
        }
        break;

      case "conflictos":
        if (data.total === 0)
          appendMsg("bot", "✅ No hay conflictos en la agenda.");
        else {
          const lista = data.conflictos.map((c) => `#${c.a} ↔ #${c.b}`).join(", ");
          appendMsg("bot", `⚠️ Conflictos (${data.total}): ${lista}`);
        }
        break;

      default:
        appendMsg("bot", "🤖 No entendí. Escribe 'ayuda' para ver comandos.");
        break;
    }
  }

  function refreshCalendar() {
    try {
      const calendar = FullCalendar.getCalendar(document.getElementById("calendar"));
      if (calendar) calendar.refetchEvents();
    } catch (e) {
      console.warn("No se pudo refrescar el calendario:", e);
    }
  }

  // Mensaje de bienvenida
  appendMsg(
    "bot",
    "👋 ¡Hola! Soy tu asistente de agenda.\nPuedes decirme cosas como:\n" +
      "• crear reunión mañana 15:00 por 60 min prioridad 2 nombre Plan semanal\n" +
      "• editar 3 a hoy 16:00\n" +
      "• eliminar 2\n" +
      "• pendientes\n" +
      "• conflictos\n" +
      "• ayuda"
  );
});
