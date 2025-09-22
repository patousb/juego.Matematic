const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // permite que se conecten tus estudiantes desde GitHub Pages
  }
});

// --- Eventos de conexión ---
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  // cuando el profe crea sala
  socket.on("crearSala", (pin) => {
    socket.join(pin);
    console.log(`Sala creada con PIN: ${pin}`);
    socket.emit("salaCreada", pin);
  });

  // cuando un estudiante se une
  socket.on("unirseSala", (pin) => {
    socket.join(pin);
    console.log(`Jugador ${socket.id} se unió a sala ${pin}`);
    io.to(pin).emit("nuevoJugador", socket.id);
  });

  // reenviar mensajes a todos en la sala
  socket.on("mensajeSala", ({ pin, msg }) => {
    io.to(pin).emit("mensajeSala", { jugador: socket.id, msg });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Render usa el puerto que está en process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
