document.addEventListener("DOMContentLoaded", () => {
  // Botón flotante para abrir/cerrar el chatbot
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "chatbot-btn";
  toggleBtn.innerHTML = "🤖";
  document.body.appendChild(toggleBtn);

  // Ventana del chatbot
  const chatBox = document.createElement("div");
  chatBox.id = "chatbot";
  chatBox.innerHTML = `
    <div class="chat-header">🤖 Asistente de Agenda</div>
    <div id="chat-body"></div>
    <div id="chat-input">
      <input type="text" placeholder="Escribe aquí... (ej: Ver pendientes)" />
      <button>Enviar</button>
    </div>
  `;
  document.body.appendChild(chatBox);

  const body = document.getElementById("chat-body");
  const input = chatBox.querySelector("input");
  const button = chatBox.querySelector("button");

  // Mostrar u ocultar el chatbot
  toggleBtn.addEventListener("click", () => {
    chatBox.style.display = chatBox.style.display === "flex" ? "none" : "flex";
    chatBox.style.flexDirection = "column";
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    appendMsg("user", text);
    input.value = "";

    if (/pendiente/i.test(text)) {
      const res = await fetch("http://127.0.0.1:5000/asistente/pendientes");
      const tareas = await res.json();
      if (tareas.length === 0) appendMsg("bot", "✅ No tienes tareas pendientes.");
      else appendMsg("bot", "Tareas pendientes:\n" + tareas.map(t => "• " + t.nombre + " (" + t.estado + ")").join("\n"));
    } else if (/resumen/i.test(text)) {
      const res = await fetch("http://127.0.0.1:5000/asistente/resumen");
      const datos = await res.json();
      appendMsg("bot", `📊 Estado actual:\n${Object.entries(datos).map(([k,v]) => `• ${k}: ${v}`).join("\n")}`);
    } else {
      appendMsg("bot", "Puedo mostrar tus tareas pendientes o el resumen de estados. Prueba escribir: 'Ver pendientes' o 'Ver resumen'.");
    }
  }

  function appendMsg(sender, text) {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  button.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
});
