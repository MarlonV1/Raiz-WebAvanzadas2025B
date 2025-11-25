// public/js/client.js
// Cliente minimal para Socket.IO - chat
const socket = io();

const form = document.getElementById("formChat");
const input = document.getElementById("inputMsg");
const messages = document.getElementById("messages");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value && input.value.trim();
    if (!text) return;
    const msg = { user: "anon", text, timestamp: new Date().toISOString() };
    socket.emit("chat message", msg);
    input.value = "";
  });
}

socket.on("chat message", (msg) => {
  const li = document.createElement("li");
  li.textContent = `${msg.user}: ${msg.text}`;
  messages.appendChild(li);
});
