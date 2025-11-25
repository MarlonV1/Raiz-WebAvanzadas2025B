// public/js/client.js
// Cliente para Socket.IO - chat (usa window.currentUser si está disponible)
const socket = (typeof io === 'function') ? io() : null;

const form = document.getElementById("formChat");
const input = document.getElementById("inputMsg");
const messages = document.getElementById("messages");

function appendMessage(msg){
  if (!messages) return;
  const li = document.createElement("li");
  li.textContent = `${msg.user}: ${msg.text}`;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

if (form && socket) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value && input.value.trim();
    if (!text) return;
    // Si no hay usuario, evitar enviar desde cliente (debe loguear)
    const user = (typeof window !== 'undefined' && window.currentUser) ? window.currentUser : null;
    if (!user) {
      alert('Debes iniciar sesión para enviar mensajes.');
      return;
    }
    const msg = { user, text, timestamp: new Date().toISOString() };
    socket.emit("chat message", msg);
    input.value = "";
  });
}

if (socket) {
  socket.on("chat message", (msg) => {
    appendMessage(msg);
  });
}
