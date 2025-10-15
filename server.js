// server.js - SERVIDOR MATH CHALLENGE PRO COMPLETO CON CORRECCIONES
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
      { pregunta: "¿Es correcto que 5 + 3 = 8?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "5 + 3 sí es igual a 8." },
      { pregunta: "¿Es correcto que 10 - 4 = 5?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "10 - 4 es 6, no 5." },
      { pregunta: "¿Es correcto que 2 × 6 = 12?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "2 × 6 sí es igual a 12." },
      { pregunta: "¿Es correcto que 15 ÷ 3 = 6?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "15 ÷ 3 es 5, no 6." },
      { pregunta: "¿Es correcto que 7 × 3 = 21?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "7 × 3 sí es igual a 21." },
      { pregunta: "¿Es correcto que 25 ÷ 5 = 4?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "25 ÷ 5 es 5, no 4." }
    ],
    misterioso: [
      { pregunta: "? + 5 = 12", respuesta: 7, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "? - 3 = 8", respuesta: 11, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "? × 4 = 20", respuesta: 5, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "? ÷ 2 = 6", respuesta: 12, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "? + 8 = 15", respuesta: 7, tipo: "misterioso", dificultad: "facil" },
      { pregunta: "? - 7 = 9", respuesta: 16, tipo: "misterioso", dificultad: "facil" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 2, 4, 6, ?", respuesta: 8, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 5, 10, 15, ?", respuesta: 20, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 1, 3, 5, ?", respuesta: 7, tipo: "secuencia", dificultad: "facil" },
      { pregunta: "Completa la secuencia: 10, 20, 30, ?", respuesta: 40, tipo: "secuencia", dificultad: "facil" }
    ],
    potenciacion: [
      { pregunta: "2² = ?", respuesta: 4, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "3² = ?", respuesta: 9, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "4² = ?", respuesta: 16, tipo: "potenciacion", dificultad: "facil" },
      { pregunta: "5² = ?", respuesta: 25, tipo: "potenciacion", dificultad: "facil" }
    ],
    combinadas: [
      { pregunta: "2 + 3 × 2 = ?", respuesta: 8, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "(5 + 3) × 2 = ?", respuesta: 16, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "10 - 4 ÷ 2 = ?", respuesta: 8, tipo: "combinadas", dificultad: "facil" },
      { pregunta: "8 ÷ 2 + 3 = ?", respuesta: 7, tipo: "combinadas", dificultad: "facil" }
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
      { pregunta: "25 × 4 = ?", respuesta: 100, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "144 ÷ 12 = ?", respuesta: 12, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "15 + 28 = ?", respuesta: 43, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "65 - 29 = ?", respuesta: 36, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "8 × 7 + 5 = ?", respuesta: 61, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "100 ÷ 4 × 3 = ?", respuesta: 75, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "17 + 25 - 8 = ?", respuesta: 34, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "9 × 6 ÷ 3 = ?", respuesta: 18, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "45 + 27 - 15 = ?", respuesta: 57, tipo: "operacion", dificultad: "intermedia" },
      { pregunta: "12 × 3 + 18 ÷ 2 = ?", respuesta: 45, tipo: "operacion", dificultad: "intermedia" }
    ],
    "verdadero-falso": [
      { pregunta: "¿Es correcto que (5 + 3) × 2 = 16?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "(5+3)=8, 8×2=16. Correcto." },
      { pregunta: "¿Es correcto que 15 × 3 = 40?", respuesta: false, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "15 × 3 = 45, no 40." },
      { pregunta: "¿Es correcto que 125 ÷ 5 = 25?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "125 ÷ 5 sí es igual a 25." },
      { pregunta: "¿Es correcto que 7² = 49?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "7 × 7 = 49. Correcto." },
      { pregunta: "¿Es correcto que √81 = 8?", respuesta: false, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "√81 = 9, no 8." },
      { pregunta: "¿Es correcto que (10 - 3) × 4 = 28?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "10-3=7, 7×4=28. Correcto." }
    ],
    misterioso: [
      { pregunta: "? × 6 = 54", respuesta: 9, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "? ÷ 7 = 8", respuesta: 56, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "? + 15 = 42", respuesta: 27, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "? - 23 = 19", respuesta: 42, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "? × 8 = 72", respuesta: 9, tipo: "misterioso", dificultad: "intermedia" },
      { pregunta: "? ÷ 9 = 7", respuesta: 63, tipo: "misterioso", dificultad: "intermedia" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 2, 4, 8, 16, ?", respuesta: 32, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 1, 4, 9, 16, ?", respuesta: 25, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 3, 6, 12, 24, ?", respuesta: 48, tipo: "secuencia", dificultad: "intermedia" },
      { pregunta: "Completa la secuencia: 5, 10, 20, 40, ?", respuesta: 80, tipo: "secuencia", dificultad: "intermedia" }
    ],
    potenciacion: [
      { pregunta: "2³ = ?", respuesta: 8, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "3³ = ?", respuesta: 27, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "4³ = ?", respuesta: 64, tipo: "potenciacion", dificultad: "intermedia" },
      { pregunta: "5³ = ?", respuesta: 125, tipo: "potenciacion", dificultad: "intermedia" }
    ],
    combinadas: [
      { pregunta: "15 ÷ 3 + 4 × 2 = ?", respuesta: 13, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "(8 + 4) × 3 - 10 = ?", respuesta: 26, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "20 ÷ (2 + 3) × 4 = ?", respuesta: 16, tipo: "combinadas", dificultad: "intermedia" },
      { pregunta: "5 × 3 + 12 ÷ 4 - 2 = ?", respuesta: 16, tipo: "combinadas", dificultad: "intermedia" }
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
      { pregunta: "125 ÷ 5 × 4 = ?", respuesta: 100, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "(15 + 7) × 3 - 10 = ?", respuesta: 56, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "√144 + 5² = ?", respuesta: 17, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "3³ + 4² - 10 = ?", respuesta: 33, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "100 ÷ (5 × 2) + 15 = ?", respuesta: 25, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "(8 × 3) + (12 ÷ 4) × 5 = ?", respuesta: 39, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "7² - 3³ + 10 ÷ 2 = ?", respuesta: 29, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "(20 - 8) × 3 + 15 ÷ 3 = ?", respuesta: 41, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "√169 × 2 + 3³ = ?", respuesta: 53, tipo: "operacion", dificultad: "dificil" },
      { pregunta: "(25 ÷ 5)² + 4³ - 10 = ?", respuesta: 79, tipo: "operacion", dificultad: "dificil" }
    ],
    "verdadero-falso": [
      { pregunta: "¿Es correcto que (3³ - 2⁴) × 2 = 10?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "3³=27, 2⁴=16, 27-16=11, 11×2=22, no 10." },
      { pregunta: "¿Es correcto que √64 + 3² = 17?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "√64=8, 3²=9, 8+9=17. Correcto." },
      { pregunta: "¿Es correcto que (5 × 4)² ÷ 10 = 10?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "5×4=20, 20²=400, 400÷10=40, no 10." },
      { pregunta: "¿Es correcto que 2⁵ - 3³ = 5?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "2⁵=32, 3³=27, 32-27=5. Correcto." },
      { pregunta: "¿Es correcto que √121 × 2 + 4² = 38?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "√121=11, 11×2=22, 4²=16, 22+16=38. Correcto." },
      { pregunta: "¿Es correcto que (8 + 5)² ÷ 13 = 12?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "8+5=13, 13²=169, 169÷13=13, no 12." }
    ],
    misterioso: [
      { pregunta: "?² = 169", respuesta: 13, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "?³ = 64", respuesta: 4, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "√? = 9", respuesta: 81, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "? × 12 = 144", respuesta: 12, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "?² + 15 = 40", respuesta: 5, tipo: "misterioso", dificultad: "dificil" },
      { pregunta: "?³ - 8 = 19", respuesta: 3, tipo: "misterioso", dificultad: "dificil" }
    ],
    secuencia: [
      { pregunta: "Completa la secuencia: 1, 1, 2, 3, 5, 8, ?", respuesta: 13, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 2, 3, 5, 7, 11, ?", respuesta: 13, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 1, 4, 9, 16, 25, ?", respuesta: 36, tipo: "secuencia", dificultad: "dificil" },
      { pregunta: "Completa la secuencia: 3, 9, 27, 81, ?", respuesta: 243, tipo: "secuencia", dificultad: "dificil" }
    ],
    potenciacion: [
      { pregunta: "2⁴ = ?", respuesta: 16, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "3⁴ = ?", respuesta: 81, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "4³ = ?", respuesta: 64, tipo: "potenciacion", dificultad: "dificil" },
      { pregunta: "5³ = ?", respuesta: 125, tipo: "potenciacion", dificultad: "dificil" }
    ],
    combinadas: [
      { pregunta: "(15 - 3)² ÷ 4 + 8 × 2 = ?", respuesta: 44, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "√144 × 3 + 4² - 10 ÷ 2 = ?", respuesta: 47, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "(8 × 3)² ÷ 12 + 5³ - 20 = ?", respuesta: 129, tipo: "combinadas", dificultad: "dificil" },
      { pregunta: "7² + 3³ - √169 × 4 + 15 ÷ 3 = ?", respuesta: 41, tipo: "combinadas", dificultad: "dificil" }
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
  REVEAL_DURATION: 5000,
  MAX_QUESTIONS: 10,
  TOURNAMENT_QUESTIONS: 5,
  FINALIST_COUNT: 4
};

// ====================== CLASES MEJORADAS CON CORRECCIONES ======================

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

  // ====================== CORRECCIÓN CRÍTICA: SINCRONIZACIÓN MEJORADA ======================
  
  syncPlayersToAll() {
    const playersUpdate = {
      type: 'players_update',
      players: this.getPlayersArray().map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isProfessor: p.isProfessor,
        isReady: p.isReady,
        points: p.points,
        streak: p.streak,
        maxStreak: p.maxStreak,
        avgResponseTime: p.avgResponseTime,
        hasAnswered: p.hasAnswered
      }))
    };
    
    console.log(`[Sala ${this.pin}] 🔄 Sincronizando ${this.players.size} jugadores para TODOS los clientes`);
    this.broadcast(playersUpdate);
  }

  broadcast(data, excludePlayerId = null) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    
    this.players.forEach(player => {
      if (player.socket && player.socket.readyState === WebSocket.OPEN && 
          player.id !== excludePlayerId) {
        try {
          player.socket.send(message);
          sentCount++;
        } catch (e) {
          console.error(`[Broadcast Error] ${player.id}:`, e);
        }
      }
    });
    
    console.log(`[Sala ${this.pin}] 📢 Broadcast enviado a ${sentCount}/${this.players.size} jugadores`);
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
    if (this.voteTimer) clearInterval(this.voteTimer);
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.tournamentRoundTimer) clearTimeout(this.tournamentRoundTimer);
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
      if (this.responseTimes.length > 10) {
        this.responseTimes.shift();
      }
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

  setTimeout(() => {
    const ranking = computeFinalRanking(room.getPlayersArray());
    room.broadcast({ type: 'ranking_update', players: ranking });

    setTimeout(() => {
      if (!isTournament) {
        if (room.questionIndex < room.totalQuestions - 1) {
          room.questionIndex++;
          startNextQuestion(room);
        } else {
          if (room.isFinalistTournament && !room.tournamentStarted) {
            startSemifinals(room.pin);
          } else {
            endGame(room.pin);
          }
        }
      } else {
        if (room.tournamentQuestionIndex < room.tournamentQuestions.length - 1) {
          room.tournamentQuestionIndex++;
          startNextTournamentQuestion(room);
        } else {
          if (room.tournamentStage === 'semifinal') {
            concludeSemifinals(room.pin);
          } else if (room.tournamentStage === 'final') {
            concludeFinal(room.pin);
          }
        }
      }
    }, CONFIG.REVEAL_DURATION);
  }, 1000);
}

// ====================== SISTEMA DE TORNEO COMPLETO ======================

function startSemifinals(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  console.log(`[Torneo ${pin}] 🏆 INICIANDO SEMIFINALES`);
  
  room.tournamentStarted = true;
  room.tournamentStage = 'semifinal';
  room.tournamentQuestionIndex = 0;
  room.tournamentAnswersThisRound.clear();

  const ranking = computeFinalRanking(room.getPlayersArray());
  const top4 = ranking.slice(0, CONFIG.FINALIST_COUNT);
  
  room.finalists.clear();
  top4.forEach(playerData => {
    const player = room.getPlayer(playerData.id);
    if (player) {
      player.resetForTournament();
      room.finalists.set(player.id, player);
    }
  });

  console.log(`[Torneo ${pin}] Finalistas: ${room.getFinalistsArray().map(f => f.name).join(', ')}`);

  const baseMode = getSupportedMode(room.gameMode);
  room.tournamentQuestions = generarPreguntas(baseMode, CONFIG.TOURNAMENT_QUESTIONS, 'intermedia');
  room.tournamentTimerDuration = CONFIG.TOURNAMENT_DURATION.semifinal;

  room.broadcast({ 
    type: 'start_semifinals', 
    finalists: room.getFinalistsArray().map(f => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar,
      points: f.semifinalPoints
    }))
  });

  const spectatorIds = room.getPlayersArray()
    .filter(p => !room.finalists.has(p.id))
    .map(p => p.id);
  
  if (spectatorIds.length > 0) {
    room.broadcastToPlayers(spectatorIds, {
      type: 'enter_spectator_mode',
      finalists: room.getFinalistsArray().map(f => ({
        id: f.id,
        name: f.name,
        points: f.semifinalPoints
      }))
    });
  }

  setTimeout(() => startNextTournamentQuestion(room), 3000);
}

function startNextTournamentQuestion(room) {
  if (!room.tournamentStarted || room.tournamentQuestionIndex >= room.tournamentQuestions.length) {
    if (room.tournamentStage === 'semifinal') {
      concludeSemifinals(room.pin);
    } else {
      concludeFinal(room.pin);
    }
    return;
  }

  room.tournamentAnswersThisRound.clear();
  room.currentQuestion = room.tournamentQuestions[room.tournamentQuestionIndex];
  
  room.getFinalistsArray().forEach(player => {
    player.hasAnswered = false;
  });

  const questionForClients = { ...room.currentQuestion };
  delete questionForClients.respuesta;
  delete questionForClients.explicacion;

  room.broadcastToFinalists({
    type: 'tournament_question_update',
    question: questionForClients,
    questionIndex: room.tournamentQuestionIndex,
    totalQuestions: room.tournamentQuestions.length,
    timerDuration: room.tournamentTimerDuration,
    round: room.tournamentStage
  });

  room.broadcastToSpectators({
    type: 'spectator_update',
    finalists: room.getFinalistsArray().map(f => ({
      id: f.id,
      name: f.name,
      points: room.tournamentStage === 'semifinal' ? f.semifinalPoints : f.finalPoints
    })),
    question: {
      pregunta: questionForClients.pregunta,
      tipo: questionForClients.tipo,
      opciones: questionForClients.opciones
    },
    questionIndex: room.tournamentQuestionIndex,
    totalQuestions: room.tournamentQuestions.length,
    round: room.tournamentStage
  });

  clearTimeout(room.tournamentRoundTimer);
  room.tournamentRoundTimer = setTimeout(() => {
    sendRevealPhase(room, true);
  }, room.tournamentTimerDuration * 1000);
}

function concludeSemifinals(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  console.log(`[Torneo ${pin}] 🏆 CONCLUYENDO SEMIFINALES`);
  
  const sorted = room.getFinalistsArray().sort((a, b) => b.semifinalPoints - a.semifinalPoints);
  const top2 = sorted.slice(0, 2);
  
  room.finalists.clear();
  top2.forEach(player => {
    player.resetForTournament();
    room.finalists.set(player.id, player);
  });

  room.tournamentStage = 'final';
  
  const baseMode = getSupportedMode(room.gameMode);
  room.tournamentQuestions = generarPreguntas(baseMode, CONFIG.TOURNAMENT_QUESTIONS, 'dificil');
  room.tournamentQuestionIndex = 0;
  room.tournamentAnswersThisRound.clear();
  room.tournamentTimerDuration = CONFIG.TOURNAMENT_DURATION.final;

  console.log(`[Torneo ${pin}] Finalistas: ${room.getFinalistsArray().map(f => f.name).join(', ')}`);

  room.broadcast({ 
    type: 'tournament_round_end', 
    round: 'semifinal',
    winners: room.getFinalistsArray().map(f => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar,
      points: f.finalPoints
    }))
  });

  setTimeout(() => {
    room.broadcast({ 
      type: 'start_final', 
      finalists: room.getFinalistsArray().map(f => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        points: f.finalPoints
      }))
    });

    setTimeout(() => startNextTournamentQuestion(room), 3000);
  }, 2000);
}

function concludeFinal(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  console.log(`[Torneo ${pin}] 🏆 CONCLUYENDO FINAL`);
  
  const sorted = room.getFinalistsArray().sort((a, b) => b.finalPoints - a.finalPoints);
  const winner = sorted[0];
  
  if (winner) {
    winner.points += CONFIG.POINTS.winnerBonus;
    room.ultimateWinner = {
      id: winner.id,
      name: winner.name,
      avatar: winner.avatar,
      points: winner.points,
      finalPoints: winner.finalPoints
    };

    console.log(`[Torneo ${pin}] 👑 CAMPEÓN: ${winner.name}`);
  }

  room.broadcast({ 
    type: 'tournament_round_end', 
    round: 'final',
    winner: room.ultimateWinner
  });

  setTimeout(() => {
    room.broadcast({ 
      type: 'ultimate_winner', 
      winner: room.ultimateWinner 
    });

    setTimeout(() => {
      room.tournamentStage = null;
      room.tournamentStarted = false;
      room.isFinalistTournament = false;
      room.finalRanking = computeFinalRanking(room.getPlayersArray());
      
      console.log(`[Torneo ${pin}] 🎊 TORNEO COMPLETADO`);
    }, 5000);
  }, 2000);
}

function endGame(pin) {
  const room = rooms.get(pin);
  if (!room) return;

  room.cleanup();
  room.isGameRunning = false;

  if (room.isFinalistTournament && !room.tournamentStarted) {
    startSemifinals(pin);
    return;
  }

  room.finalRanking = computeFinalRanking(room.getPlayersArray());
  room.broadcast({ type: 'game_over', finalRanking: room.finalRanking });
}

function finalizeVoting(room) {
  console.log(`[Sala ${room.pin}] 🗳️ Finalizando votación`);
  
  let maxVotes = 0;
  let selectedMode = 'operaciones';
  let modesWithVotes = [];

  room.votes.forEach((votes, mode) => {
    if (votes > 0) {
      modesWithVotes.push({ mode, votes });
      if (votes > maxVotes) {
        maxVotes = votes;
        selectedMode = mode;
      }
    }
  });

  const tiedModes = modesWithVotes
    .filter(m => m.votes === maxVotes)
    .map(m => m.mode);
  
  if (tiedModes.length > 1) {
    selectedMode = tiedModes[Math.floor(Math.random() * tiedModes.length)];
  }

  room.gameMode = selectedMode;
  room.closestAnswerMode = (selectedMode === 'mas-cercano');

  const totalVotes = Array.from(room.votes.values()).reduce((a, b) => a + b, 0);
  const finalistVotes = Array.from(room.finalistVotes.values()).reduce((a, b) => a + b, 0);
  room.isFinalistTournament = totalVotes > 0 && finalistVotes >= Math.ceil(totalVotes / 3);

  console.log(`[Sala ${room.pin}] Modo seleccionado: ${selectedMode}, Torneo: ${room.isFinalistTournament}`);

  room.getPlayersArray().forEach(player => {
    player.resetForNewGame();
    player.gamesPlayed++;
  });
  
  const baseMode = getSupportedMode(selectedMode);
  room.questions = generarPreguntas(baseMode, room.totalQuestions, 'facil');
  room.questionIndex = 0;

  room.broadcast({
    type: 'game_starting',
    mode: selectedMode,
    baseMode: baseMode,
    isFinalistTournament: room.isFinalistTournament
  });

  setTimeout(() => {
    room.isGameRunning = true;
    
    const initialRanking = computeFinalRanking(room.getPlayersArray());
    room.broadcast({ 
      type: 'ranking_update', 
      players: initialRanking 
    });

    room.broadcast({
      type: 'game_start',
      mode: selectedMode,
      baseMode: baseMode,
      closestAnswerMode: room.closestAnswerMode,
      isFinalistTournament: room.isFinalistTournament
    });

    startNextQuestion(room);
  }, 3000);
}

// ====================== WEBSOCKET HANDLING COMPLETO CON CORRECCIONES ======================

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
          console.warn(`[WS ${connectionId}] Mensaje no reconocido: ${data.type}`);
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

  // ====================== HANDLERS COMPLETOS CON CORRECCIONES ======================

  async function handleRoomConnection(ws, data, playerId) {
    const { pin, player } = data;
    
    if (!pin || !player || !player.name) {
      throw new Error('Datos de conexión inválidos');
    }

    let room = rooms.get(pin);
    const isCreating = data.type === 'create_room';
    const isRejoining = data.type === 'rejoin_room';
    
    console.log(`[Conexión ${pin}] Tipo: ${data.type}, Jugador: ${player.name}, ID: ${playerId}`);
    
    // CREAR SALA SI NO EXISTE
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

    // VERIFICAR CAPACIDAD
    if (room.players.size >= CONFIG.MAX_PLAYERS && !room.getPlayer(playerId)) {
      throw new Error('Sala llena');
    }

    let playerObj = room.getPlayer(playerId);
    let isNewPlayer = false;

    // MANEJO DE JUGADOR EXISTENTE O NUEVO
    if (playerObj) {
      // JUGADOR EXISTENTE: ACTUALIZAR SOCKET Y DATOS
      console.log(`[Sala ${pin}] 🔄 ${player.name} reconectado`);
      playerObj.socket = ws;
      playerObj.isReady = player.isReady || false;
      
      // Actualizar datos si es necesario
      if (player.name !== playerObj.name) {
        console.log(`[Sala ${pin}] 📝 ${playerObj.name} cambió nombre a ${player.name}`);
        playerObj.name = player.name;
      }
      if (player.avatar && player.avatar !== playerObj.avatar) {
        playerObj.avatar = player.avatar;
      }
    } else {
      // NUEVO JUGADOR: CREAR INSTANCIA
      playerObj = new Jugador({
        ...player,
        id: playerId,
        isProfessor: isCreating ? true : (player.isProfessor || false)
      }, ws);
      
      room.addPlayer(playerObj);
      isNewPlayer = true;
      console.log(`[Sala ${pin}] ➕ ${player.name} se unió (${room.players.size}/${CONFIG.MAX_PLAYERS})`);
    }

    currentRoom = room;
    const isHost = room.hostId === playerId;

    // ACTUALIZAR ESTADO DE PROFESOR SI ES NECESARIO
    if (isCreating) {
      playerObj.isProfessor = true;
      room.hostId = playerId;
    }

    console.log(`[Sala ${pin}] 👥 Jugadores actuales:`, room.getPlayersArray().map(p => p.name));

    // PREPARAR RESPUESTA PARA EL CLIENTE
    const response = {
      type: 'room_joined',
      pin: room.pin,
      players: room.getPlayersArray().map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isProfessor: p.isProfessor,
        isReady: p.isReady,
        points: p.points,
        streak: p.streak,
        maxStreak: p.maxStreak,
        avgResponseTime: p.avgResponseTime,
        hasAnswered: p.hasAnswered
      })),
      isHost: isHost,
      gameMode: room.gameMode,
      closestAnswerMode: room.closestAnswerMode,
      isGameRunning: room.isGameRunning,
      isVotingActive: room.isVotingActive,
      voteTimeRemaining: room.voteTimeRemaining,
      currentVotes: Object.fromEntries(room.votes),
      questionIndex: room.questionIndex,
      totalQuestions: room.totalQuestions,
      tournamentStage: room.tournamentStage,
      finalists: room.getFinalistsArray().map(f => ({
        id: f.id,
        name: f.name,
        avatar: f.avatar,
        points: room.tournamentStage === 'semifinal' ? f.semifinalPoints : 
               room.tournamentStage === 'final' ? f.finalPoints : f.points
      }))
    };

    // AGREGAR INFORMACIÓN DE PREGUNTA ACTUAL SI EL JUEGO ESTÁ EN CURSO
    if (room.isGameRunning && room.currentQuestion) {
      response.question = {
        pregunta: room.currentQuestion.pregunta,
        tipo: room.currentQuestion.tipo,
        opciones: room.currentQuestion.opciones,
        imagen: room.currentQuestion.imagen
      };
      response.timerDuration = room.timerDuration;
    }

    // ENVIAR RESPUESTA AL CLIENTE ACTUAL
    console.log(`[Sala ${pin}] 📤 Enviando estado de sala a ${player.name}`);
    ws.send(JSON.stringify(response));

    // ====================== CORRECCIÓN CRÍTICA: SINCRONIZACIÓN INMEDIATA ======================
    
    // NOTIFICAR A OTROS JUGADORES INMEDIATAMENTE
    if (isNewPlayer) {
      console.log(`[Sala ${pin}] 📢 Notificando a otros jugadores sobre ${player.name}`);
      
      room.broadcast({
        type: 'player_joined',
        player: {
          id: playerId,
          name: player.name,
          avatar: player.avatar,
          isProfessor: playerObj.isProfessor,
          isReady: playerObj.isReady
        }
      }, playerId); // Excluir al jugador actual
    }

    // SINCRONIZAR LISTA COMPLETA DE JUGADORES CON TODOS (INCLUYENDO AL PROFESOR)
    setTimeout(() => {
      room.syncPlayersToAll();
    }, 100);

    // NOTIFICAR AL HOST SI TODOS ESTÁN LISTOS
    if (isHost && !room.isVotingActive && !room.isGameRunning) {
      const nonProfessorPlayers = room.getNonProfessorPlayers();
      const allReady = nonProfessorPlayers.length > 0 && nonProfessorPlayers.every(p => p.isReady);
      
      if (allReady) {
        console.log(`[Sala ${pin}] 🎯 Todos los jugadores están listos, notificando al host`);
        ws.send(JSON.stringify({
          type: 'all_players_ready',
          message: 'Todos los jugadores están listos. Puedes iniciar la votación.'
        }));
      }
    }
  }

  function handleInitiateVote(data) {
    const room = rooms.get(data.pin);
    if (!room || room.hostId !== data.hostId || room.isVotingActive) {
      throw new Error('No puedes iniciar votación');
    }

    if (room.getNonProfessorPlayers().length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores no profesores para votar');
    }

    room.isVotingActive = true;
    room.voteTimeRemaining = CONFIG.VOTE_DURATION;
    room.votes.clear();
    room.finalistVotes.clear();
    
    room.getPlayersArray().forEach(p => p.hasVoted = false);

    console.log(`[Sala ${room.pin}] 🗳️ Iniciando votación por ${room.getPlayer(data.hostId)?.name}`);
    
    room.broadcast({ 
      type: 'start_voting', 
      time: room.voteTimeRemaining 
    });

    clearInterval(room.voteTimer);
    room.voteTimer = setInterval(() => {
      room.voteTimeRemaining--;
      room.broadcast({ 
        type: 'update_vote_timer', 
        time: room.voteTimeRemaining 
      });

      if (room.voteTimeRemaining <= 0) {
        clearInterval(room.voteTimer);
        room.isVotingActive = false;
        finalizeVoting(room);
      }
    }, 1000);
  }

  function handleCastVote(data) {
    const room = rooms.get(data.pin);
    if (!room || !room.isVotingActive) {
      throw new Error('Votación no activa');
    }

    const player = room.getPlayer(data.playerId);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    if (player.hasVoted) {
      throw new Error('Ya has votado');
    }

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
  }

  function handlePlayerReady(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');

    const player = room.getPlayer(data.playerId);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    player.isReady = data.isReady;
    
    console.log(`[Sala ${room.pin}] ✅ ${player.name} ${data.isReady ? 'listo' : 'no listo'}`);
    
    // SINCRONIZAR ESTADO CON TODOS INMEDIATAMENTE
    room.syncPlayersToAll();

    // VERIFICAR SI TODOS ESTÁN LISTOS PARA INICIAR VOTACIÓN
    if (room.hostId === data.playerId && !room.isVotingActive && !room.isGameRunning) {
      const nonProfessorPlayers = room.getNonProfessorPlayers();
      const allReady = nonProfessorPlayers.length > 0 && nonProfessorPlayers.every(p => p.isReady);
      
      if (allReady) {
        console.log(`[Sala ${room.pin}] 🎯 Todos los jugadores están listos, notificando al host`);
        const host = room.getPlayer(room.hostId);
        if (host && host.socket && host.socket.readyState === WebSocket.OPEN) {
          host.socket.send(JSON.stringify({
            type: 'all_players_ready',
            message: 'Todos los jugadores están listos. Puedes iniciar la votación.'
          }));
        }
      }
    }
  }

  function handlePlayerDisconnection(pin, playerId) {
    const room = rooms.get(pin);
    if (!room) return;

    const player = room.getPlayer(playerId);
    if (player) {
      console.log(`[Sala ${pin}] ❌ ${player.name} desconectado`);
      
      // MARCAR COMO DESCONECTADO PERO MANTENER EN LA SALA TEMPORALMENTE
      player.socket = null;
      player.isReady = false;
      
      // NOTIFICAR DESCONEXIÓN
      room.broadcast({
        type: 'player_left',
        playerId: playerId,
        playerName: player.name
      });

      // SINCRONIZAR LISTA DE JUGADORES INMEDIATAMENTE
      room.syncPlayersToAll();

      // SI ERA EL HOST, ASIGNAR NUEVO HOST
      if (room.hostId === playerId && room.players.size > 0) {
        const newHost = room.getPlayersArray().find(p => p.socket) || room.getPlayersArray()[0];
        if (newHost) {
          room.hostId = newHost.id;
          newHost.isProfessor = true;
          
          console.log(`[Sala ${pin}] 👑 Nuevo host: ${newHost.name}`);
          
          room.broadcast({
            type: 'new_host',
            newHostId: room.hostId,
            newHostName: newHost.name
          });
        }
      }

      // ELIMINAR JUGADOR DESCONECTADO DESPUÉS DE 30 SEGUNDOS SI NO SE RECONECTA
      setTimeout(() => {
        const currentRoom = rooms.get(pin);
        if (currentRoom) {
          const currentPlayer = currentRoom.getPlayer(playerId);
          if (currentPlayer && !currentPlayer.socket) {
            console.log(`[Sala ${pin}] 🗑️ Eliminando ${currentPlayer.name} (desconectado por mucho tiempo)`);
            currentRoom.removePlayer(playerId);
            
            // SINCRONIZAR LISTA FINAL
            currentRoom.syncPlayersToAll();

            // SI LA SALA QUEDA VACÍA, LIMPIAR
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

  function handleSubmitAnswer(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');

    const isTournament = room.tournamentStarted && room.tournamentStage;
    const player = isTournament ? 
      room.finalists.get(data.playerId) : 
      room.getPlayer(data.playerId);

    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    if (!room.isGameRunning) {
      throw new Error('Juego no activo');
    }

    if (player.hasAnswered) {
      throw new Error('Ya respondiste esta pregunta');
    }

    const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
    
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
      
      if (isTournament) {
        clearTimeout(room.tournamentRoundTimer);
      } else {
        clearTimeout(room.roundTimer);
      }
      
      sendRevealPhase(room, isTournament);
    } else {
      if (isTournament) {
        const answeredCount = room.tournamentAnswersThisRound.size;
        room.broadcastToFinalists({
          type: 'tournament_progress',
          answered: answeredCount,
          total: room.finalists.size
        });
      }
      
      ws.send(JSON.stringify({ 
        type: 'answer_received', 
        message: 'Respuesta recibida correctamente' 
      }));
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

    room.broadcast({
      type: 'emoji_broadcast',
      emoji: data.emoji,
      from: data.playerId
    });
  }

  function handleRequestTournamentQuestion(data) {
    const room = rooms.get(data.pin);
    if (!room || !room.tournamentStage) {
      throw new Error('Torneo no activo');
    }

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

// ====================== CONFIGURACIÓN EXPRESS COMPLETA ======================

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
    },
    config: {
      maxPlayers: CONFIG.MAX_PLAYERS,
      maxQuestions: CONFIG.MAX_QUESTIONS,
      tournamentQuestions: CONFIG.TOURNAMENT_QUESTIONS
    }
  });
});

app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    pin: room.pin,
    playerCount: room.players.size,
    isGameRunning: room.isGameRunning,
    tournamentStage: room.tournamentStage,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity
  }));
  
  res.json(roomList);
});

app.post('/admin/cleanup', (req, res) => {
  const { password } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  let cleanedCount = 0;

  for (const [pin, room] of rooms.entries()) {
    if (now - room.lastActivity > 6 * HOUR) {
      room.cleanup();
      rooms.delete(pin);
      cleanedCount++;
      console.log(`[Admin] Limpiada sala inactiva ${pin}`);
    }
  }

  res.json({ 
    message: `Limpieza completada. Salas eliminadas: ${cleanedCount}`,
    remainingRooms: rooms.size 
  });
});

app.use((err, req, res, next) => {
  console.error('Error en servidor Express:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ====================== MANTENIMIENTO AUTOMÁTICO ======================

setInterval(() => {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  let cleanedCount = 0;

  for (const [pin, room] of rooms.entries()) {
    if (now - room.lastActivity > 24 * HOUR) {
      console.log(`[Limpieza] Eliminando sala inactiva ${pin} (${room.players.size} jugadores)`);
      room.cleanup();
      rooms.delete(pin);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[Limpieza] ${cleanedCount} salas inactivas eliminadas`);
  }
}, 60 * 60 * 1000);

// ====================== MANEJO GRACEFUL DE CIERRE ======================

function gracefulShutdown() {
  console.log('Iniciando cierre graceful del servidor...');
  
  wss.close(() => {
    console.log('WebSocket server cerrado');
  });

  for (const room of rooms.values()) {
    room.broadcast({
      type: 'server_shutdown',
      message: 'El servidor se está cerrando. Por favor, reconecta más tarde.'
    });
    room.cleanup();
  }

  server.close(() => {
    console.log('HTTP server cerrado');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Cierre forzado después de timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ====================== INICIO DEL SERVIDOR ======================

server.listen(PORT, () => {
  console.log(`🎮 Servidor Math Challenge PRO COMPLETO ejecutándose en puerto ${PORT}`);
  console.log(`✅ CORRECCIONES APLICADAS:`);
  console.log(`   - 🔄 Sincronización inmediata de lista de jugadores`);
  console.log(`   - 👥 Notificaciones de conexión/desconexión mejoradas`);
  console.log(`   - 📢 Broadcast de actualizaciones de estado en tiempo real`);
  console.log(`   - 🎯 Detección automática de todos los jugadores listos`);
  console.log(`   - ❌ Manejo robusto de desconexiones`);
  console.log(`   - 👑 Transferencia automática de host`);
  console.log(`   - 📊 Logs detallados para diagnóstico`);
  console.log(`📊 Total de preguntas cargadas:`);
  Object.keys(BANCOS_PREGUNTAS.facil).forEach(mode => {
    console.log(`   - ${mode}: ${BANCOS_PREGUNTAS.facil[mode].length} (fácil), ${BANCOS_PREGUNTAS.intermedia[mode]?.length || 0} (intermedio), ${BANCOS_PREGUNTAS.dificil[mode]?.length || 0} (difícil)`);
  });
});
