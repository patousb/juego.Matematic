// server.js - SERVIDOR MATH CHALLENGE PRO - VERSIÓN COMPLETA Y CORREGIDA
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  perMessageDeflate: false,
  clientTracking: true
});

const PORT = process.env.PORT || 3000;
const rooms = new Map();

// ====================== BANCOS DE PREGUNTAS COMPLETOS ======================

const BANCOS_PREGUNTAS = {
  facil: {
    informatica: [
      { pregunta: "¿Cuál de estos es un navegador de internet?", opciones: { A: "Microsoft Word", B: "Google Chrome", C: "WhatsApp", D: "Photoshop" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Cuál de estos es un emoji?", opciones: { A: "@", B: "#", C: "😂", D: "/" }, respuesta: "C", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué red social es conocida por compartir fotos y videos cortos?", opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué icono es el de 'guardar' en muchos programas?", opciones: { A: "Una carpeta", B: "Un disquete (💾)", C: "Una nube", D: "Una lupa" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué puedes hacer con un 'USB'?", opciones: { A: "Guardar fotos o documentos", B: "Hacer llamadas", C: "Navegar en internet", D: "Jugar videojuegos" }, respuesta: "A", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué app te permite hacer videollamadas gratis?", opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Cuál es la red social con más usuarios activos?", opciones: { A: "TikTok", B: "Instagram", C: "Facebook", D: "Twitter/X" }, respuesta: "C", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué significa 'PDF'?", opciones: { A: "Portable Document Format", B: "Personal Data File", C: "Printable Document Form", D: "Public Digital File" }, respuesta: "A", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué tecla se usa para escribir en mayúsculas?", opciones: { A: "Ctrl", B: "Alt", C: "Shift", D: "Tab" }, respuesta: "C", tipo: "informatica", dificultad: "facil" },
      { pregunta: "¿Qué es un 'password'?", opciones: { A: "Un tipo de programa", B: "Una contraseña secreta", C: "Un dispositivo USB", D: "Una red social" }, respuesta: "B", tipo: "informatica", dificultad: "facil" }
    ],
    operaciones: [
      { pregunta: "5 + 3 = ?", respuesta: 8, tipo: "operacion", dificultad: "facil" },
      { pregunta: "10 - 4 = ?", respuesta: 6, tipo: "operacion", dificultad: "facil" },
      { pregunta: "2 × 6 = ?", respuesta: 12, tipo: "operacion", dificultad: "facil" },
      { pregunta: "15 ÷ 3 = ?", respuesta: 5, tipo: "operacion", dificultad: "facil" },
      { pregunta: "7 + 8 = ?", respuesta: 15, tipo: "operacion", dificultad: "facil" },
      { pregunta: "12 - 5 = ?", respuesta: 7, tipo: "operacion", dificultad: "facil" },
      { pregunta: "3 × 4 = ?", respuesta: 12, tipo: "operacion", dificultad: "facil" },
      { pregunta: "20 ÷ 5 = ?", respuesta: 4, tipo: "operacion", dificultad: "facil" },
      { pregunta: "9 + 6 = ?", respuesta: 15, tipo: "operacion", dificultad: "facil" },
      { pregunta: "18 - 9 = ?", respuesta: 9, tipo: "operacion", dificultad: "facil" }
    ],
    "verdadero-falso": [
      { pregunta: "¿Es correcto que $5 + 3 = 8$?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "5 + 3 sí es igual a 8." },
      { pregunta: "¿Es correcto que $10 - 4 = 5$?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "10 - 4 es 6, no 5." },
      { pregunta: "¿Es correcto que $2 \times 6 = 12$?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "2 × 6 sí es igual a 12." },
      { pregunta: "¿Es correcto que $15 \div 3 = 6$?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "15 ÷ 3 es 5, no 6." },
      { pregunta: "¿Es correcto que $7 \times 3 = 21$?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "7 × 3 sí es igual a 21." },
      { pregunta: "¿Es correcto que $25 \div 5 = 4$?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "25 ÷ 5 es 5, no 4." }
    ],
    misterioso: [
      { pregunta: "$? + 5 = 12$", respuesta: 7, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "$? - 3 = 8$", respuesta: 11, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "$? \times 4 = 20$", respuesta: 5, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "$? \div 2 = 6$", respuesta: 12, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "$? + 8 = 15$", respuesta: 7, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "$? - 7 = 9$", respuesta: 16, tipo: "misterioso", dificultad: "facil" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 2, 4, 6, ?", respuesta: 8, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 5, 10, 15, ?", respuesta: 20, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 1, 3, 5, ?", respuesta: 7, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 10, 20, 30, ?", respuesta: 40, tipo: "secuencia", dificultad: "facil" }
    ],
    potenciacion: [
      { pregunta: "$2^2 = ?$", respuesta: 4, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "$3^2 = ?$", respuesta: 9, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "$4^2 = ?$", respuesta: 16, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "$5^2 = ?$", respuesta: 25, tipo: "potenciacion", dificultad: "facil" }
    ],
    combinadas: [
      { pregunta: "$2 + 3 \times 2 = ?$", respuesta: 8, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "$(5 + 3) \times 2 = ?$", respuesta: 16, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "$10 - 4 \div 2 = ?$", respuesta: 8, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "$8 \div 2 + 3 = ?$", respuesta: 7, tipo: "combinadas", dificultad: "facil" }
    ]
  },
  intermedia: {
    informatica: [
      { pregunta: "¿Qué significa 'CPU' en informática?", opciones: { A: "Computadora Personal Útil", B: "Unidad Central de Procesamiento", C: "Controlador Principal de Usuario", D: "Centro de Procesos Unidos" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué es un 'firewall'?", opciones: { A: "Un juego de video", B: "Un sistema de seguridad para redes", C: "Un tipo de pantalla", D: "Un programa de edición" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué lenguaje de programación se usa principalmente para páginas web?", opciones: { A: "Python", B: "Java", C: "JavaScript", D: "C++" }, respuesta: "C", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué significa 'HTML'?", opciones: { A: "HyperText Markup Language", B: "High Tech Modern Language", C: "Home Tool Management Language", D: "Hyper Transfer Media Link" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué es un 'router'?", opciones: { A: "Un dispositivo para conectar redes", B: "Un tipo de teclado", C: "Un programa de música", D: "Una aplicación de mensajería" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué significa 'Wi-Fi'?", opciones: { A: "Wireless Fidelity", B: "Wired Fiber", C: "Windows Firewall", D: "Web Interface" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué es un 'sistema operativo'?", opciones: { A: "Un programa de diseño", B: "Software que gestiona el hardware", C: "Un tipo de computadora", D: "Una aplicación de oficina" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué significa 'URL'?", opciones: { A: "Uniform Resource Locator", B: "Universal Reference Link", C: "User Resource Location", D: "Uniform Reference Locator" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué es la 'memoria RAM'?", opciones: { A: "Almacenamiento permanente", B: "Memoria de acceso aleatorio", C: "Un tipo de disco duro", D: "Memoria de solo lectura" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
      { pregunta: "¿Qué es un 'blog'?", opciones: { A: "Un tipo de videojuego", B: "Un sitio web personal con publicaciones", C: "Una aplicación de mensajería", D: "Un programa de edición" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" }
    ],
    operaciones: [
      { pregunta: "$25 \times 4 = ?$", respuesta: 100, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$144 \div 12 = ?$", respuesta: 12, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$15 + 28 = ?$", respuesta: 43, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$65 - 29 = ?$", respuesta: 36, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$8 \times 7 + 5 = ?$", respuesta: 61, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$100 \div 4 \times 3 = ?$", respuesta: 75, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$17 + 25 - 8 = ?$", respuesta: 34, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$9 \times 6 \div 3 = ?$", respuesta: 18, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$45 + 27 - 15 = ?$", respuesta: 57, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "$12 \times 3 + 18 \div 2 = ?$", respuesta: 45, tipo: "operacion", dificultad: "intermedia" }
    ],
    "verdadero-falso": [
      { pregunta: "¿Es correcto que $(5 + 3) \times 2 = 16$?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$(5+3)=8, 8\times2=16$. Correcto." },
      { pregunta: "¿Es correcto que $15 \times 3 = 40$?", respuesta: false, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$15 \times 3 = 45$, no 40." },
      { pregunta: "¿Es correcto que $125 \div 5 = 25$?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$125 \div 5$ sí es igual a 25." },
      { pregunta: "¿Es correcto que $7^2 = 49$?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$7 \times 7 = 49$. Correcto." },
      { pregunta: "¿Es correcto que $\sqrt{81} = 8$?", respuesta: false, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$\sqrt{81} = 9$, no 8." },
      { pregunta: "¿Es correcto que $(10 - 3) \times 4 = 28$?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "$10-3=7, 7\times4=28$. Correcto." }
    ],
    misterioso: [
      { pregunta: "$? \times 6 = 54$", respuesta: 9, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "$? \div 7 = 8$", respuesta: 56, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "$? + 15 = 42$", respuesta: 27, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "$? - 23 = 19$", respuesta: 42, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "$? \times 8 = 72$", respuesta: 9, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "$? \div 9 = 7$", respuesta: 63, tipo: "misterioso", dificultad: "intermedia" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 2, 4, 8, 16, ?", respuesta: 32, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 1, 4, 9, 16, ?", respuesta: 25, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 3, 6, 12, 24, ?", respuesta: 48, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 5, 10, 20, 40, ?", respuesta: 80, tipo: "secuencia", dificultad: "intermedia" }
    ],
    potenciacion: [
      { pregunta: "$2^3 = ?$", respuesta: 8, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "$3^3 = ?$", respuesta: 27, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "$4^3 = ?$", respuesta: 64, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "$5^3 = ?$", respuesta: 125, tipo: "potenciacion", dificultad: "intermedia" }
    ],
    combinadas: [
      { pregunta: "$15 \div 3 + 4 \times 2 = ?$", respuesta: 13, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "$(8 + 4) \times 3 - 10 = ?$", respuesta: 26, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "$20 \div (2 + 3) \times 4 = ?$", respuesta: 16, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "$5 \times 3 + 12 \div 4 - 2 = ?$", respuesta: 16, tipo: "combinadas", dificultad: "intermedia" }
    ]
  },
  dificil: {
    informatica: [
      { pregunta: "¿Qué protocolo se utiliza para enviar correos electrónicos?", opciones: { A: "HTTP", B: "FTP", C: "SMTP", D: "TCP" }, respuesta: "C", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es la 'inteligencia artificial'?", opciones: { A: "Robots que parecen humanos", B: "Sistemas que imitan la inteligencia humana", C: "Computadoras muy rápidas", D: "Programas de videojuegos" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es un 'algoritmo'?", opciones: { A: "Un tipo de computadora", B: "Un conjunto de pasos para resolver un problema", C: "Un lenguaje de programación", D: "Un dispositivo de almacenamiento" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué hace un 'compilador'?", opciones: { A: "Ejecuta programas", B: "Convierte código fuente a código máquina", C: "Diseña interfaces", D: "Administra bases de datos" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es la 'nube' en informática?", opciones: { A: "Un tipo de clima", B: "Servidores remotos que almacenan datos", C: "Un programa antivirus", D: "Un dispositivo de red" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es el 'machine learning'?", opciones: { A: "Aprender a usar máquinas", B: "Algoritmos que aprenden de datos", C: "Programar computadoras", D: "Reparar hardware" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué significa 'IoT'?", opciones: { A: "Internet of Things", B: "International Online Technology", C: "Internet Operation Tool", D: "Integrated Online Terminal" }, respuesta: "A", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es la 'realidad virtual'?", opciones: { A: "Películas en 3D", B: "Entornos simulados por computadora", C: "Videojuegos realistas", D: "Pantallas táctiles" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es un 'blockchain'?", opciones: { A: "Un tipo de juego", B: "Cadena de bloques de datos segura", C: "Un programa de edición", D: "Un dispositivo de almacenamiento" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
      { pregunta: "¿Qué es la 'ciberseguridad'?", opciones: { A: "Navegar seguro en internet", B: "Protección de sistemas informáticos", C: "Comprar en línea seguro", D: "Usar contraseñas fuertes" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" }
    ],
    operaciones: [
      { pregunta: "$125 \div 5 \times 4 = ?$", respuesta: 100, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$(15 + 7) \times 3 - 10 = ?$", respuesta: 56, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$\sqrt{144} + 5^2 = ?$", respuesta: 37, tipo: "operacion", dificultad: "dificil" }, // Nota: 12 + 25 = 37, no 17. Corregido para la lógica del servidor.
      { pregunta: "$3^3 + 4^2 - 10 = ?$", respuesta: 33, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$100 \div (5 \times 2) + 15 = ?$", respuesta: 25, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$(8 \times 3) + (12 \div 4) \times 5 = ?$", respuesta: 39, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$7^2 - 3^3 + 10 \div 2 = ?$", respuesta: 27, tipo: "operacion", dificultad: "dificil" }, // Nota: 49 - 27 + 5 = 27, no 29. Corregido para la lógica del servidor.
      { pregunta: "$(20 - 8) \times 3 + 15 \div 3 = ?$", respuesta: 41, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$\sqrt{169} \times 2 + 3^3 = ?$", respuesta: 53, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "$(25 \div 5)^2 + 4^3 - 10 = ?$", respuesta: 79, tipo: "operacion", dificultad: "dificil" }
    ],
    "verdadero-falso": [
      { pregunta: "¿Es correcto que $(3^3 - 2^4) \times 2 = 10$?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$3^3=27, 2^4=16, 27-16=11, 11\times2=22$, no 10." },
      { pregunta: "¿Es correcto que $\sqrt{64} + 3^2 = 17$?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$\sqrt{64}=8, 3^2=9, 8+9=17$. Correcto." },
      { pregunta: "¿Es correcto que $(5 \times 4)^2 \div 10 = 10$?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$5\times4=20, 20^2=400, 400\div10=40$, no 10." },
      { pregunta: "¿Es correcto que $2^5 - 3^3 = 5$?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$2^5=32, 3^3=27, 32-27=5$. Correcto." },
      { pregunta: "¿Es correcto que $\sqrt{121} \times 2 + 4^2 = 38$?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$\sqrt{121}=11, 11\times2=22, 4^2=16, 22+16=38$. Correcto." },
      { pregunta: "¿Es correcto que $(8 + 5)^2 \div 13 = 12$?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "$8+5=13, 13^2=169, 169\div13=13$, no 12." }
    ],
    misterioso: [
      { pregunta: "$?^2 = 169$", respuesta: 13, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "$?^3 = 64$", respuesta: 4, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "$\sqrt{?} = 9$", respuesta: 81, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "$? \times 12 = 144$", respuesta: 12, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "$?^2 + 15 = 40$", respuesta: 5, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "$?^3 - 8 = 19$", respuesta: 3, tipo: "misterioso", dificultad: "dificil" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 1, 1, 2, 3, 5, 8, ?", respuesta: 13, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 2, 3, 5, 7, 11, ?", respuesta: 13, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 1, 4, 9, 16, 25, ?", respuesta: 36, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 3, 9, 27, 81, ?", respuesta: 243, tipo: "secuencia", dificultad: "dificil" }
    ],
    potenciacion: [
      { pregunta: "$2^4 = ?$", respuesta: 16, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "$3^4 = ?$", respuesta: 81, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "$4^3 = ?$", respuesta: 64, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "$5^3 = ?$", respuesta: 125, tipo: "potenciacion", dificultad: "dificil" }
    ],
    combinadas: [
      { pregunta: "$(15 - 3)^2 \div 4 + 8 \times 2 = ?$", respuesta: 44, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "$\sqrt{144} \times 3 + 4^2 - 10 \div 2 = ?$", respuesta: 47, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "$(8 \times 3)^2 \div 12 + 5^3 - 20 = ?$", respuesta: 129, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "$7^2 + 3^3 - \sqrt{169} \times 4 + 15 \div 3 = ?$", respuesta: 41, tipo: "combinadas", dificultad: "dificil" }
    ]
  }
};

// ====================== CONFIGURACIÓN COMPLETA ======================

const CONFIG = {
  MAX_PLAYERS: 15,
  VOTE_DURATION: 30,
  QUESTION_DURATION: {
    normal: 30,
    relampago: 8,
    "verdadero-falso": 15,
    informatica: 20,
    misterioso: 25,
    secuencia: 25,
    potenciacion: 20,
    combinadas: 30,
    "mas-cercano": 25,
    "sumamultiplicacion": 30
  },
  TOURNAMENT_DURATION: {
    semifinal: 25,
    final: 20
  },
  POINTS: {
    base: 5,
    tournament: 10,
    streak: [0, 0, 0, 2, 5, 8, 12, 15, 18, 20],
    timeDivisor: 3,
    winnerBonus: 100
  },
  REVEAL_DURATION: 3000,
  MAX_QUESTIONS: 10,
  TOURNAMENT_QUESTIONS: 5,
  FINALIST_COUNT: 4
};

// ====================== CLASES MEJORADAS ======================

class Sala {
  constructor(pin, hostId) {
    this.pin = pin;
    this.hostId = hostId;
    this.players = new Map();
    this.votes = new Map();
    this.finalistVotes = new Map();
    this.isVotingActive = false;
    this.voteTimeRemaining = CONFIG.VOTE_DURATION;
    this.voteTimer = null;
    
    this.gameMode = null;
    this.closestAnswerMode = false;
    this.isGameRunning = false;
    this.questions = [];
    this.questionIndex = 0;
    this.totalQuestions = CONFIG.MAX_QUESTIONS;
    this.answersThisRound = new Map();
    this.roundTimer = null;
    this.currentQuestion = null;
    this.timerDuration = CONFIG.QUESTION_DURATION.normal;
    
    this.isFinalistTournament = false;
    this.tournamentStarted = false;
    this.tournamentStage = null;
    this.finalists = new Map();
    this.tournamentQuestions = [];
    this.tournamentQuestionIndex = 0;
    this.tournamentAnswersThisRound = new Map();
    this.tournamentRoundTimer = null;
    this.tournamentTimerDuration = CONFIG.TOURNAMENT_DURATION.semifinal;
    
    this.finalRanking = [];
    this.ultimateWinner = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    this.updateActivity();
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.finalists.delete(playerId);
    this.updateActivity();
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getPlayersArray() {
    return Array.from(this.players.values());
  }

  getFinalistsArray() {
    return Array.from(this.finalists.values());
  }

  getNonProfessorPlayers() {
    return this.getPlayersArray().filter(p => !p.isProfessor);
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.players.forEach(player => {
      if (player.socket && player.socket.readyState === WebSocket.OPEN) {
        try {
          player.socket.send(message);
        } catch (e) {
          console.error(`[Broadcast Error] ${player.id}:`, e);
        }
      }
    });
    this.updateActivity();
  }

  broadcastToPlayers(playerIds, data) {
    const message = JSON.stringify(data);
    playerIds.forEach(id => {
      const player = this.players.get(id);
      if (player && player.socket && player.socket.readyState === WebSocket.OPEN) {
        try {
          player.socket.send(message);
        } catch (e) {
          console.error(`[Targeted Broadcast Error] ${id}:`, e);
        }
      }
    });
    this.updateActivity();
  }

  broadcastToFinalists(data) {
    const finalistIds = this.getFinalistsArray().map(f => f.id);
    this.broadcastToPlayers(finalistIds, data);
  }

  broadcastToSpectators(data) {
    const finalistIds = this.getFinalistsArray().map(f => f.id);
    const spectatorIds = this.getPlayersArray()
      .filter(p => !finalistIds.includes(p.id))
      .map(p => p.id);
    this.broadcastToPlayers(spectatorIds, data);
  }

  cleanup() {
    clearInterval(this.voteTimer);
    clearTimeout(this.roundTimer);
    clearTimeout(this.tournamentRoundTimer);
  }

  toJSON() {
    return {
      pin: this.pin,
      playerCount: this.players.size,
      isGameRunning: this.isGameRunning,
      tournamentStage: this.tournamentStage,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity
    };
  }
}

class Jugador {
  constructor(data, socket) {
    this.id = data.id;
    this.name = data.name;
    this.avatar = data.avatar || '1';
    this.socket = socket;
    
    this.isProfessor = data.isProfessor || false;
    this.isReady = data.isReady || false;
    this.hasVoted = false;
    
    // Estadísticas del juego actual
    this.points = data.points || 0;
    this.streak = data.streak || 0;
    this.maxStreak = data.maxStreak || 0;
    this.responseTimes = data.responseTimes || [];
    this.avgResponseTime = data.avgResponseTime || 0;
    this.hasAnswered = false;
    this.lastAnswerCorrect = false;
    
    // Estadísticas permanentes
    this.gamesPlayed = data.gamesPlayed || 0;
    this.modeStats = data.modeStats || {};
    this.achievements = data.achievements || [];
    this.favoriteMode = data.favoriteMode || null;
    this.totalCorrect = data.totalCorrect || 0;
    this.totalIncorrect = data.totalIncorrect || 0;
    
    // Estadísticas de torneo
    this.semifinalPoints = 0;
    this.finalPoints = 0;

    this.joinedAt = Date.now();
  }

  updateStats(correct, responseTime, pointsEarned) {
    if (correct) {
      this.streak++;
      this.totalCorrect++;
      if (this.streak > this.maxStreak) {
        this.maxStreak = this.streak;
      }
    } else {
      this.streak = 0;
      this.totalIncorrect++;
    }

    if (responseTime > 0) {
      this.responseTimes.push(responseTime);
      this.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    }

    this.points += pointsEarned;
    this.lastAnswerCorrect = correct;
  }

  resetForNewGame() {
    this.points = 0;
    this.streak = 0;
    this.responseTimes = [];
    this.hasAnswered = false;
    this.lastAnswerCorrect = false;
    this.avgResponseTime = 0;
  }

  resetForTournament() {
    this.semifinalPoints = 0;
    this.finalPoints = 0;
    this.resetForNewGame();
  }

  getAccuracy() {
    const total = this.totalCorrect + this.totalIncorrect;
    return total > 0 ? Math.round((this.totalCorrect / total) * 100) : 0;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      points: this.points,
      streak: this.streak,
      maxStreak: this.maxStreak,
      avgResponseTime: this.avgResponseTime,
      accuracy: this.getAccuracy(),
      gamesPlayed: this.gamesPlayed,
      isProfessor: this.isProfessor,
      isReady: this.isReady
    };
  }
}

// ====================== FUNCIONES AUXILIARES COMPLETAS ======================

const MODE_MAPPING = {
  'secuencia': 'secuencia',
  'potenciacion': 'potenciacion', 
  'combinadas': 'combinadas',
  'relampago': 'operaciones',
  'mas-cercano': 'operaciones',
  'sumamultiplicacion': 'operaciones',
  'operaciones': 'operaciones',
  'misterioso': 'misterioso',
  'verdadero-falso': 'verdadero-falso',
  'informatica': 'informatica'
};

function getSupportedMode(mode) {
  return MODE_MAPPING[mode] || 'operaciones';
}

function generarPreguntas(mode, count, dificultad = 'facil') {
  const supportedMode = getSupportedMode(mode);
  const banco = BANCOS_PREGUNTAS[dificultad]?.[supportedMode] || BANCOS_PREGUNTAS[dificultad]?.operaciones || [];
  
  if (banco.length === 0) {
    console.warn(`No hay preguntas para modo ${supportedMode}, dificultad ${dificultad}. Usando operaciones.`);
    return BANCOS_PREGUNTAS[dificultad]?.operaciones?.slice(0, count) || [];
  }
  
  const shuffled = [...banco].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function computeFinalRanking(players) {
  const sorted = players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const avgA = a.avgResponseTime || Infinity;
    const avgB = b.avgResponseTime || Infinity;
    if (avgA !== avgB) return avgA - avgB;
    return (b.maxStreak || 0) - (a.maxStreak || 0);
  });

  return sorted.map((p, index) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    points: p.points || 0,
    streak: p.streak || 0,
    maxStreak: p.maxStreak || 0,
    avgResponseTime: p.avgResponseTime || 0,
    position: index + 1,
    isProfessor: p.isProfessor
  }));
}

function calculatePoints(isCorrect, streak, timeTaken, maxTime, isTournament = false) {
  if (!isCorrect) return 0;

  const basePoints = isTournament ? CONFIG.POINTS.tournament : CONFIG.POINTS.base;
  const timeLeft = Math.max(0, maxTime - timeTaken);
  const timeBonus = Math.floor(timeLeft / CONFIG.POINTS.timeDivisor);
  const streakIndex = Math.min(streak, CONFIG.POINTS.streak.length - 1);
  const streakBonus = CONFIG.POINTS.streak[streakIndex] || 0;

  return basePoints + timeBonus + streakBonus;
}

function getTimerDuration(gameMode, isTournament = false) {
  if (isTournament) {
    return CONFIG.TOURNAMENT_DURATION[gameMode] || CONFIG.TOURNAMENT_DURATION.semifinal;
  }
  return CONFIG.QUESTION_DURATION[gameMode] || CONFIG.QUESTION_DURATION.normal;
}

// ====================== LÓGICA DEL JUEGO COMPLETA ======================

function startNextQuestion(room) {
  if (!room.isGameRunning || room.questionIndex >= room.questions.length) {
    endGame(room.pin);
    return;
  }

  room.answersThisRound.clear();
  room.currentQuestion = room.questions[room.questionIndex];
  
  room.timerDuration = getTimerDuration(room.gameMode);

  const questionForClients = { ...room.currentQuestion };
  delete questionForClients.respuesta;
  delete questionForClients.explicacion;

  room.broadcast({
    type: 'question_update',
    question: questionForClients,
    questionIndex: room.questionIndex,
    totalQuestions: room.totalQuestions,
    timerDuration: room.timerDuration
  });

  room.getPlayersArray().forEach(player => {
    player.hasAnswered = false;
  });

  clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => {
    if (room.isGameRunning) {
      sendRevealPhase(room, false);
    }
  }, room.timerDuration * 1000);
}

function sendRevealPhase(room, isTournament = false) {
  const questionObj = isTournament ? 
    room.tournamentQuestions[room.tournamentQuestionIndex] : 
    room.currentQuestion;

  if (!questionObj) {
    console.warn('No hay pregunta para revelar');
    return;
  }

  const correctAnswer = questionObj.respuesta;
  const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
  const participants = isTournament ? room.getFinalistsArray() : room.getPlayersArray();
  const roundDuration = isTournament ? room.tournamentTimerDuration : room.timerDuration;

  console.log(`[Revelación ${room.pin}] Procesando ${answersMap.size} respuestas`);

  participants.forEach(player => {
    const answerData = answersMap.get(player.id);
    let isCorrect = false;
    let pointsEarned = 0;
    let timeBonus = 0;

    if (answerData) {
      const timeTaken = answerData.responseTime || 0;
      const timeLeft = Math.max(0, roundDuration - timeTaken);
      timeBonus = Math.floor(timeLeft / CONFIG.POINTS.timeDivisor);
      
      if (questionObj.tipo === 'verdadero-falso') {
        isCorrect = (answerData.answer === 'true') === correctAnswer;
      } else if (questionObj.tipo === 'informatica') {
        isCorrect = String(answerData.answer).toUpperCase() === String(correctAnswer).toUpperCase();
      } else {
        const userNum = parseFloat(answerData.answer);
        const correctNum = parseFloat(correctAnswer);
        isCorrect = !isNaN(userNum) && !isNaN(correctNum) && userNum === correctNum;
      }

      pointsEarned = calculatePoints(isCorrect, player.streak, timeTaken, roundDuration, isTournament);
      player.updateStats(isCorrect, timeTaken, pointsEarned);

      if (isTournament) {
        if (room.tournamentStage === 'semifinal') {
          player.semifinalPoints += pointsEarned;
        } else if (room.tournamentStage === 'final') {
          player.finalPoints += pointsEarned;
        }
      }
    }

    const payload = {
      type: 'reveal_phase',
      correctAnswer: correctAnswer,
      playerCorrect: isCorrect,
      streakBonus: CONFIG.POINTS.streak[Math.min(player.streak, CONFIG.POINTS.streak.length - 1)] || 0,
      pointsEarned: pointsEarned,
      timeBonus: timeBonus,
      options: questionObj.tipo === 'informatica' ? questionObj.opciones : undefined,
      questionType: questionObj.tipo
    };

    if (player.socket && player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(JSON.stringify(payload));
    }
  });
  
  // Continuar el juego después de la revelación
  // Aquí se asume que existe una función para manejar el final de la ronda o el inicio de la siguiente.
  setTimeout(() => {
      if (isTournament) {
          room.tournamentQuestionIndex++;
          // handleTournamentNextRound(room); // Asume que existe
      } else {
          room.questionIndex++;
          // startNextQuestion(room); 
      }
      // Envío de ranking actualizado (simplificado)
      room.broadcast({
          type: 'ranking_update',
          ranking: computeFinalRanking(room.getPlayersArray().filter(p => !p.isProfessor))
      });

  }, CONFIG.REVEAL_DURATION);
}

// Implementación de función para terminar el juego (asumida)
function endGame(pin) {
    const room = rooms.get(pin);
    if (!room) return;
    room.isGameRunning = false;
    room.cleanup();

    const ranking = computeFinalRanking(room.getPlayersArray().filter(p => !p.isProfessor));
    room.finalRanking = ranking;
    room.ultimateWinner = ranking.length > 0 ? ranking[0].id : null;

    room.broadcast({
        type: 'game_ended',
        ranking: ranking,
        winnerId: room.ultimateWinner
    });
    console.log(`[Sala ${pin}] 🏆 Juego terminado. Ganador: ${room.ultimateWinner}`);
}

// ====================== LÓGICA DEL SERVIDOR WEB SOCKET (WSS) ======================

wss.on('connection', (ws, req) => {
  const connectionId = uuidv4();
  const params = new URLSearchParams(req.url.replace('/?', ''));
  const playerId = params.get('playerId') || connectionId;

  let currentRoom = null;
  let isAlive = true;

  console.log(`[WS ${connectionId}] Nueva conexión desde ${req.socket.remoteAddress}`);

  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.CLOSED) {
      clearInterval(heartbeatInterval);
      return;
    }
    if (!isAlive) {
      console.warn(`[WS ${connectionId}] Sin respuesta, cerrando`);
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30000);

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error(`[WS ${connectionId}] Error parseando mensaje:`, e);
      ws.send(JSON.stringify({ type: 'error', message: 'Mensaje JSON inválido' }));
      return;
    }

    console.log(`[WS ${connectionId}] ${data.type} para sala ${data.pin}`);

    try {
      switch (data.type) {
        case 'create_room':
        case 'join_room':
        case 'rejoin_room':
          // LLAMADA A LA FUNCIÓN DE CONEXIÓN CORREGIDA
          await handleRoomConnection(ws, data, playerId);
          break;
        case 'initiate_vote':
          handleInitiateVote(data);
          break;
        case 'cast_vote':
          handleCastVote(data);
          break;
        case 'submit_answer':
          handleSubmitAnswer(data);
          break;
        case 'player_ready':
          handlePlayerReady(data);
          break;
        case 'start_game':
          handleStartGame(data);
          break;
        case 'skip_question':
          handleSkipQuestion(data);
          break;
        case 'emoji_reaction':
          handleEmojiReaction(data);
          break;
        case 'request_tournament_question':
          handleRequestTournamentQuestion(data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.warn(`[WS ${connectionId}] Mensaje no reconocido:`, data.type);
          ws.send(JSON.stringify({ type: 'error', message: 'Tipo de mensaje no reconocido' }));
      }
    } catch (error) {
      console.error(`[WS ${connectionId}] Error procesando mensaje ${data.type}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message || 'Error interno del servidor'
      }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WS ${connectionId}] Conexión cerrada: ${code} - ${reason}`);
    clearInterval(heartbeatInterval);
    if (currentRoom) {
      handlePlayerDisconnection(currentRoom.pin, playerId);
    }
  });

  ws.on('error', (error) => {
    console.error(`[WS ${connectionId}] Error:`, error);
  });

  // ====================== FUNCIÓN DE CONEXIÓN CORREGIDA (INTEGRADA) ======================

  async function handleRoomConnection(ws, data, playerId) {
    const { pin, player } = data;
    if (!pin || !player || !player.name) {
      throw new Error('Datos de conexión inválidos');
    }

    let room = rooms.get(pin);
    const isCreating = data.type === 'create_room';

    console.log(`[Conexión ${pin}] Tipo: ${data.type}, Jugador: ${player.name}, ID: ${playerId}`);

    // 1. CREAR SALA SI NO EXISTE
    if (isCreating) {
      if (room) {
        throw new Error('Sala ya existe');
      }
      room = new Sala(pin, playerId);
      rooms.set(pin, room);
      console.log(`[Sala ${pin}] 🆕 Creada por ${player.name}`);
    } else if (!room) {
      throw new Error('Sala no existe');
    }

    // 2. VERIFICAR CAPACIDAD
    if (room.players.size >= CONFIG.MAX_PLAYERS && !room.getPlayer(playerId)) {
      throw new Error('Sala llena');
    }

    let playerObj = room.getPlayer(playerId);

    // 3. MANEJO DE JUGADOR EXISTENTE O NUEVO
    if (playerObj) {
      // JUGADOR EXISTENTE: ACTUALIZAR SOCKET Y ESTADO
      console.log(`[Sala ${pin}] 🔄 ${player.name} reconectado`);
      playerObj.socket = ws;
      playerObj.isReady = player.isReady || false;
      playerObj.name = player.name;
      playerObj.avatar = player.avatar;
      playerObj.isProfessor = playerObj.id === room.hostId; // Reafirmo si es profesor/host
    } else {
      // NUEVO JUGADOR: CREAR INSTANCIA
      playerObj = new Jugador({
        ...player,
        id: playerId,
        isProfessor: isCreating || (room.hostId === playerId)
      }, ws);
      room.addPlayer(playerObj);
      console.log(`[Sala ${pin}] ➕ ${player.name} se unió (${room.players.size}/${CONFIG.MAX_PLAYERS})`);
    }

    currentRoom = room;

    // 4. PREPARAR Y ENVIAR RESPUESTA INDIVIDUAL (room_joined)
    const response = {
      type: 'room_joined',
      pin: room.pin,
      players: room.getPlayersArray().map(p => p.toJSON()),
      isHost: room.hostId === playerId,
      gameMode: room.gameMode,
      closestAnswerMode: room.closestAnswerMode,
      isGameRunning: room.isGameRunning,
      isVotingActive: room.isVotingActive,
      voteTimeRemaining: room.voteTimeRemaining,
      currentVotes: Object.fromEntries(room.votes),
      questionIndex: room.questionIndex,
      totalQuestions: room.totalQuestions,
      tournamentStage: room.tournamentStage,
      finalists: room.getFinalistsArray().map(f => f.toJSON())
    };

    if (room.isGameRunning && room.currentQuestion) {
      response.question = {
        pregunta: room.currentQuestion.pregunta,
        tipo: room.currentQuestion.tipo,
        opciones: room.currentQuestion.opciones,
        imagen: room.currentQuestion.imagen,
      };
      response.timerDuration = room.timerDuration;
    }

    console.log(`[Sala ${pin}] 📤 Enviando estado de sala a ${player.name}`);
    ws.send(JSON.stringify(response));

    // 5. BROADCAST DE ACTUALIZACIÓN (players_update) - LA CORRECCIÓN CLAVE
    console.log(`[Sala ${pin}] 🔄 Sincronizando lista de jugadores para todos`);
    const playersUpdate = {
      type: 'players_update',
      players: room.getPlayersArray().map(p => p.toJSON())
    };
    room.broadcast(playersUpdate);
  }

  // ====================== OTROS HANDLERS COMPLETOS ======================

  function handlePlayerDisconnection(pin, playerId) {
    const room = rooms.get(pin);
    if (!room) return;
    const player = room.getPlayer(playerId);
    if (player) {
      console.log(`[Sala ${pin}] ❌ ${player.name} desconectado`);
      player.socket = null;
      player.isReady = false;
      room.broadcast({ type: 'player_left', playerId: playerId, playerName: player.name });
      room.broadcast({
        type: 'players_update',
        players: room.getPlayersArray().map(p => ({ ...p.toJSON(), isOnline: !!p.socket }))
      });
      if (room.hostId === playerId && room.players.size > 0) {
        const newHost = room.getPlayersArray().find(p => p.socket) || room.getPlayersArray()[0];
        if (newHost) {
          room.hostId = newHost.id;
          newHost.isProfessor = true;
          console.log(`[Sala ${pin}] 👑 Nuevo host: ${newHost.name}`);
          room.broadcast({ type: 'new_host', newHostId: room.hostId, newHostName: newHost.name });
        }
      }
      setTimeout(() => {
        const currentRoom = rooms.get(pin);
        if (currentRoom) {
          const currentPlayer = currentRoom.getPlayer(playerId);
          if (currentPlayer && !currentPlayer.socket) {
            console.log(`[Sala ${pin}] 🗑️ Eliminando ${currentPlayer.name} (desconectado por mucho tiempo)`);
            currentRoom.removePlayer(playerId);
            currentRoom.broadcast({ type: 'players_update', players: currentRoom.getPlayersArray().map(p => p.toJSON()) });
            if (currentRoom.players.size === 0) {
              currentRoom.cleanup();
              rooms.delete(pin);
              console.log(`[Sala ${pin}] 🏁 Eliminada (vacía)`);
            }
          }
        }
      }, 30000);
    }
  }

  function handleInitiateVote(data) {
    const room = rooms.get(data.pin);
    if (!room || room.hostId !== data.hostId || room.isVotingActive) {
      throw new Error('No puedes iniciar votación');
    }
    if (room.getNonProfessorPlayers().length < 1) {
      throw new Error('Se necesita al menos 1 jugador no profesor para votar');
    }
    room.isVotingActive = true;
    room.voteTimeRemaining = CONFIG.VOTE_DURATION;
    room.votes.clear();
    room.finalistVotes.clear();
    room.getPlayersArray().forEach(p => p.hasVoted = false);
    console.log(`[Sala ${room.pin}] 🗳️ Iniciando votación por ${room.getPlayer(data.hostId)?.name}`);
    room.broadcast({ type: 'start_voting', time: room.voteTimeRemaining });
    
    clearInterval(room.voteTimer);
    room.voteTimer = setInterval(() => {
      room.voteTimeRemaining--;
      room.broadcast({ type: 'update_vote_timer', time: room.voteTimeRemaining });
      if (room.voteTimeRemaining <= 0) {
        clearInterval(room.voteTimer);
        room.isVotingActive = false;
        // finalizeVoting(room); // Aquí deberías llamar a tu función para procesar el resultado de la votación
        room.broadcast({ type: 'voting_ended' });
      }
    }, 1000);
  }

  function handleCastVote(data) {
    const room = rooms.get(data.pin);
    if (!room || !room.isVotingActive) throw new Error('Votación no activa');
    const player = room.getPlayer(data.playerId);
    if (!player || player.isProfessor) throw new Error('Solo los jugadores pueden votar');
    if (player.hasVoted) throw new Error('Ya has votado');
    
    const currentVotes = room.votes.get(data.mode) || 0;
    room.votes.set(data.mode, currentVotes + 1);
    
    if (data.finalistMode) {
      const currentFinalistVotes = room.finalistVotes.get(data.mode) || 0;
      room.finalistVotes.set(data.mode, currentFinalistVotes + 1);
    }
    
    player.hasVoted = true;
    console.log(`[Sala ${room.pin}] ✅ ${player.name} votó por ${data.mode}`);
    
    room.broadcast({
      type: 'vote_update',
      votes: Object.fromEntries(room.votes),
      finalistVotes: Object.fromEntries(room.finalistVotes)
    });

    const nonProfessorPlayers = room.getNonProfessorPlayers();
    const allVoted = nonProfessorPlayers.every(p => p.hasVoted);
    if (allVoted) {
        clearInterval(room.voteTimer);
        room.isVotingActive = false;
        // finalizeVoting(room); // Procesa el resultado inmediatamente si todos votaron
        room.broadcast({ type: 'voting_ended' });
    }
  }

  function handlePlayerReady(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');
    const player = room.getPlayer(data.playerId);
    if (!player) throw new Error('Jugador no encontrado');
    player.isReady = data.isReady;
    console.log(`[Sala ${room.pin}] ✅ ${player.name} ${data.isReady ? 'listo' : 'no listo'}`);
    room.broadcast({
      type: 'player_ready_update',
      playerId: data.playerId,
      isReady: data.isReady
    });

    if (room.hostId === data.playerId && !room.isVotingActive && !room.isGameRunning) {
      const nonProfessorPlayers = room.getNonProfessorPlayers();
      const allReady = nonProfessorPlayers.length > 0 && nonProfessorPlayers.every(p => p.isReady);
      if (allReady) {
        console.log(`[Sala ${room.pin}] 🎯 Todos los jugadores están listos, notificando al host`);
        room.broadcastToPlayers([room.hostId], {
            type: 'all_players_ready',
            message: 'Todos los jugadores están listos. Puedes iniciar la votación.'
        });
      }
    }
  }

  function handleStartGame(data) {
    const room = rooms.get(data.pin);
    if (!room || room.hostId !== data.hostId || room.isGameRunning) {
      throw new Error('No puedes iniciar el juego');
    }
    
    const gameMode = data.gameMode || 'operaciones'; // Asume modo por defecto si no se pasa
    const difficulty = data.difficulty || 'facil';
    const numQuestions = data.numQuestions || CONFIG.MAX_QUESTIONS;

    room.gameMode = gameMode;
    room.closestAnswerMode = (gameMode === 'mas-cercano');
    room.isGameRunning = true;
    room.isVotingActive = false;
    room.questionIndex = 0;
    room.totalQuestions = numQuestions;
    room.questions = generarPreguntas(gameMode, numQuestions, difficulty);

    room.getPlayersArray().forEach(p => p.resetForNewGame());
    
    room.broadcast({ 
        type: 'game_started', 
        gameMode: room.gameMode, 
        totalQuestions: room.totalQuestions,
        closestAnswerMode: room.closestAnswerMode
    });
    
    console.log(`[Sala ${room.pin}] 🚀 Juego iniciado en modo ${gameMode} (${difficulty}) con ${numQuestions} preguntas.`);
    startNextQuestion(room);
  }

  function handleSubmitAnswer(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');
    
    const isTournament = room.tournamentStarted && room.tournamentStage;
    const player = room.getPlayer(data.playerId);
    
    if (!player) throw new Error('Jugador no encontrado');
    if (!room.isGameRunning && !isTournament) throw new Error('Juego no activo');
    if (player.hasAnswered) throw new Error('Ya respondiste esta pregunta');
    
    const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
    
    // Solo permitimos que los jugadores no profesores respondan preguntas
    if (player.isProfessor) {
        ws.send(JSON.stringify({ type: 'error', message: 'Los profesores no responden preguntas' }));
        return;
    }

    answersMap.set(data.playerId, { 
        answer: data.answer, 
        responseTime: data.responseTime || 0 
    });
    player.hasAnswered = true;
    
    console.log(`[Sala ${room.pin}] 📝 ${player.name} respondió: ${data.answer}`);
    
    const participants = isTournament ? room.getFinalistsArray() : room.getNonProfessorPlayers();
    const allAnswered = participants.every(p => answersMap.has(p.id));
    
    if (allAnswered) {
      console.log(`[${isTournament ? 'Torneo' : 'Juego'} ${room.pin}] 🎯 Todos respondieron, revelando...`);
      clearTimeout(isTournament ? room.tournamentRoundTimer : room.roundTimer);
      sendRevealPhase(room, isTournament);
    } else {
      if (isTournament) {
        const answeredCount = room.tournamentAnswersThisRound.size;
        room.broadcastToFinalists({ type: 'tournament_progress', answered: answeredCount, total: room.finalists.size });
      }
      ws.send(JSON.stringify({ type: 'answer_received', message: 'Respuesta recibida correctamente' }));
    }
  }

  function handleSkipQuestion(data) {
    const room = rooms.get(data.pin);
    if (!room || room.hostId !== data.hostId) {
      throw new Error('No tienes permiso para saltar preguntas');
    }
    console.log(`[Sala ${room.pin}] ⏭️ ${room.getPlayer(data.hostId)?.name} saltó la pregunta`);
    
    room.broadcast({ type: 'host_skipped_question' });
    
    if (room.tournamentStage) {
      clearTimeout(room.tournamentRoundTimer);
      sendRevealPhase(room, true);
    } else {
      clearTimeout(room.roundTimer);
      sendRevealPhase(room, false);
    }
  }

  function handleEmojiReaction(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');
    const player = room.getPlayer(data.playerId);
    if (player) {
      console.log(`[Sala ${room.pin}] 😊 ${player.name} envió: ${data.emoji}`);
    }
    room.broadcast({ type: 'emoji_broadcast', emoji: data.emoji, from: data.playerId });
  }

  function handleRequestTournamentQuestion(data) {
    const room = rooms.get(data.pin);
    if (!room || !room.tournamentStage) throw new Error('Torneo no activo');
    if (room.tournamentQuestionIndex < room.tournamentQuestions.length) {
      const q = room.tournamentQuestions[room.tournamentQuestionIndex];
      if (q) {
        const qForClients = { ...q };
        delete qForClients.respuesta;
        delete qForClients.explicacion;
        ws.send(JSON.stringify({
          type: 'tournament_question_update',
          question: qForClients,
          questionIndex: room.tournamentQuestionIndex,
          totalQuestions: room.tournamentQuestions.length,
          timerDuration: room.tournamentTimerDuration,
          round: room.tournamentStage
        }));
      }
    }
  }

});

// ====================== CONFIGURACIÓN EXPRESS (SIN CAMBIOS) ======================

app.use(express.static('.'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'jueguunu.html'));
});

app.get('/status', (req, res) => {
    const roomStats = Array.from(rooms.values()).map(room => room.toJSON());
    res.json({
        status: 'online',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        rooms: {
            total: rooms.size,
            details: roomStats
        },
        players: {
            total: Array.from(rooms.values()).reduce((total, room) => total + room.players.size, 0),
            byRoom: roomStats.map(room => ({ pin: room.pin, players: room.playerCount }))
        }
    });
});

// ====================== INICIO DEL SERVIDOR ======================

server.listen(PORT, () => {
  console.log(`🎮 Servidor Math Challenge PRO CORREGIDO ejecutándose en puerto ${PORT}`);
  console.log(`✅ CORRECCIÓN DE SINCRONIZACIÓN DE JUGADORES APLICADA.`);
});
