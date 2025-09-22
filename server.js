// Servidor WebSocket para Math Challenge PRO (Versión Final y Corregida)
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;
const rooms = {};

// --- FUNCIONES PARA GENERAR PREGUNTAS (MOVIDAS DEL CLIENTE AL SERVIDOR) ---
function generarPreguntas(mode, count) {
  const preguntas = [];
  const generarOperacion = (operator = null) => {
    const num1 = Math.floor(Math.random() * 15) + 1;
    const num2 = Math.floor(Math.random() * 15) + 1;
    const operadores = ["+", "-", "*", "/"];
    let op =
      operator || operadores[Math.floor(Math.random() * operadores.length)];
    let pregunta, respuesta;

    if (op === "/") {
      let divisor = Math.floor(Math.random() * 8) + 2;
      let cociente = Math.floor(Math.random() * 10) + 1;
      let dividendo = divisor * cociente;
      pregunta = `${dividendo} ÷ ${divisor} = ?`;
      respuesta = cociente;
    } else {
      switch (op) {
        case "+":
          pregunta = `${num1} + ${num2} = ?`;
          respuesta = num1 + num2;
          break;
        case "-":
          if (num1 < num2) {
            [num1, num2] = [num2, num1];
          }
          pregunta = `${num1} - ${num2} = ?`;
          respuesta = num1 - num2;
          break;
        case "*":
          pregunta = `${num1} × ${num2} = ?`;
          respuesta = num1 * num2;
          break;
      }
    }
    return { pregunta, respuesta, tipo: "operacion" };
  };

  const generarMisterioso = () => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const tipoOp = Math.random();
    let pregunta, respuesta;

    if (tipoOp < 0.33) {
      respuesta = num1;
      pregunta = `? + ${num2} = ${num1 + num2}`;
    } else if (tipoOp < 0.66) {
      respuesta = num1 + num2;
      pregunta = `? - ${num2} = ${num1}`;
    } else {
      respuesta = num1;
      pregunta = `? × ${num2} = ${num1 * num2}`;
    }
    return { pregunta, respuesta, tipo: "misterioso" };
  };

  const generarSecuencia = () => {
    const patrones = [
      { inicio: 2, paso: 2, longitud: 5 },
      { inicio: 1, paso: 3, longitud: 5 },
      { inicio: 10, paso: -2, longitud: 5 },
      { inicio: 5, paso: 5, longitud: 5 },
      { inicio: 3, paso: 4, longitud: 5 },
    ];
    const patron = patrones[Math.floor(Math.random() * patrones.length)];
    const posicionFalta = Math.floor(Math.random() * (patron.longitud - 1)) + 1;
    let secuencia = [];
    let respuesta = 0;

    for (let j = 0; j < patron.longitud; j++) {
      if (j === posicionFalta) {
        secuencia.push("?");
        respuesta = patron.inicio + j * patron.paso;
      } else {
        secuencia.push(patron.inicio + j * patron.paso);
      }
    }

    const pregunta = `Completa la secuencia: ${secuencia.join(", ")}`;
    return { pregunta, respuesta, tipo: "secuencia" };
  };

  const generarPotenciacion = () => {
    const base = Math.floor(Math.random() * 4) + 2;
    const exponente = Math.floor(Math.random() * 3) + 2;
    const superScripts = ["⁰", "¹", "²", "³", "⁴", "⁵"];
    const pregunta = `${base}${superScripts[exponente]} = ?`;
    const respuesta = Math.pow(base, exponente);
    return { pregunta, respuesta, tipo: "potenciacion" };
  };

  const generarCombinadas = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const num3 = Math.floor(Math.random() * 5) + 1;
    let pregunta = "";
    let respuesta = 0;

    const opcion = Math.floor(Math.random() * 3);
    switch (opcion) {
      case 0:
        pregunta = `(${num1} + ${num2}) × ${num3} = ?`;
        respuesta = (num1 + num2) * num3;
        break;
      case 1:
        pregunta = `${num1} + ${num2} × ${num3} = ?`;
        respuesta = num1 + num2 * num3;
        break;
      case 2:
        if (num1 < num2) {
          [num1, num2] = [num2, num1];
        }
        pregunta = `(${num1} - ${num2}) + ${num3} = ?`;
        respuesta = num1 - num2 + num3;
        break;
    }
    return { pregunta, respuesta, tipo: "combinadas" };
  };

  const generarVerdaderoFalso = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operadores = ["+", "-", "*", "/"];
    const operador = operadores[Math.floor(Math.random() * operadores.length)];
    let operacionTexto;
    let resultadoReal;

    switch (operador) {
      case "+":
        resultadoReal = num1 + num2;
        operacionTexto = `${num1} + ${num2}`;
        break;
      case "-":
        resultadoReal = num1 - num2;
        operacionTexto = `${num1} - ${num2}`;
        break;
      case "*":
        resultadoReal = num1 * num2;
        operacionTexto = `${num1} × ${num2}`;
        break;
      case "/":
        let divisor = Math.floor(Math.random() * 5) + 2;
        let cociente = Math.floor(Math.random() * 10) + 1;
        let dividendo = divisor * cociente;
        resultadoReal = cociente;
        operacionTexto = `${dividendo} ÷ ${divisor}`;
        break;
    }

    const esCorrecta = Math.random() < 0.7;
    let resultadoFalso = resultadoReal;

    if (!esCorrecta) {
      resultadoFalso +=
        (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      if (resultadoFalso === resultadoReal)
        resultadoFalso += Math.random() > 0.5 ? 1 : -1;
    }

    const pregunta = `¿Es correcta esta operación?<br>${operacionTexto} = ${
      esCorrecta ? resultadoReal : resultadoFalso
    }`;
    const respuesta = esCorrecta;
    const explicacion = esCorrecta
      ? "La operación es correcta."
      : `La operación es incorrecta. La respuesta correcta era ${resultadoReal}.`;

    return {
      pregunta: pregunta,
      respuesta: respuesta,
      tipo: "verdadero-falso",
      explicacion: explicacion,
    };
  };

  const informaticaQuestions = [
    {
      pregunta: "¿Cuál de estos es un navegador de internet?",
      opciones: {
        A: "Microsoft Word",
        B: "Google Chrome",
        C: "WhatsApp",
        D: "Photoshop",
      },
      respuesta: "B",
      tipo: "informatica",
    },
    {
      pregunta: "¿Cuál de estos es un emoji?",
      opciones: { A: "@", B: "#", C: "😂", D: "/" },
      respuesta: "C",
      tipo: "informatica",
    },
    {
      pregunta:
        "¿Qué red social es conocida por compartir fotos y videos cortos?",
      opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" },
      respuesta: "B",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué icono es el de 'guardar' en muchos programas?",
      opciones: {
        A: "Una carpeta",
        B: "Un disquete (💾)",
        C: "Una nube",
        D: "Una lupa",
      },
      respuesta: "B",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué puedes hacer con un 'USB'?",
      opciones: {
        A: "Guardar fotos o documentos",
        B: "Hacer llamadas",
        C: "Navegar en internet",
        D: "Jugar videojuegos",
      },
      respuesta: "A",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué app te permite hacer videollamadas gratis?",
      opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" },
      respuesta: "B",
      tipo: "informatica",
    },
    {
      pregunta: "¿Cuál es la red social con más usuarios activos en el mundo?",
      opciones: { A: "TikTok", B: "Instagram", C: "Facebook", D: "Twitter/X" },
      respuesta: "C",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué significa WWW en una dirección web?",
      opciones: {
        A: "World Wide Web",
        B: "Windows Web Works",
        C: "Web World Wide",
        D: "Web Wonder World",
      },
      respuesta: "A",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué parte de la computadora es el 'cerebro'?",
      opciones: { A: "Monitor", B: "Teclado", C: "CPU", D: "Impresora" },
      respuesta: "C",
      tipo: "informatica",
    },
    {
      pregunta: "¿Qué es un 'hashtag'?",
      opciones: {
        A: "Un tipo de comida",
        B: "Una forma de categorizar temas en redes sociales",
        C: "Un programa de dibujo",
        D: "Un juego de mesa",
      },
      respuesta: "B",
      tipo: "informatica",
    },
  ];

  let generador;
  switch (mode) {
    case "operaciones":
      generador = generarOperacion;
      break;
    case "misterioso":
      generador = generarMisterioso;
      break;
    case "secuencia":
      generador = generarSecuencia;
      break;
    case "potenciacion":
      generador = generarPotenciacion;
      break;
    case "combinadas":
      generador = generarCombinadas;
      break;
    case "verdadero-falso":
      generador = generarVerdaderoFalso;
      break;
    case "mas-cercano":
      generador = () => generarOperacion();
      break;
    case "sumamultiplicacion":
      for (let i = 0; i < 5; i++) preguntas.push(generarOperacion("+"));
      for (let i = 0; i < 5; i++) preguntas.push(generarOperacion("*"));
      return preguntas;
    case "informatica":
      const shuffled = [...informaticaQuestions].sort(
        () => 0.5 - Math.random()
      );
      return shuffled.slice(0, Math.min(count, shuffled.length));
    default:
      generador = generarOperacion;
  }

  for (let i = 0; i < count; i++) {
    preguntas.push(generador());
  }

  const numImages = Math.floor(Math.random() * 3) + 1;
  const preguntasConImagen = [
    {
      pregunta: "¿Cuántos cuadrados hay en esta figura?",
      imagen:
        "https://placehold.co/400x200/FF0000/FFFFFF?text=Imagen+de+Cuadrados",
      respuesta: 5,
      tipo: "imagen",
    },
    {
      pregunta: "¿Cuántas frutas ves en la imagen?",
      imagen:
        "https://placehold.co/400x200/00FF00/000000?text=Imagen+de+Frutas",
      respuesta: 8,
      tipo: "imagen",
    },
    {
      pregunta: "¿Cuál es el patrón que sigue la siguiente figura?",
      imagen:
        "https://placehold.co/400x200/0000FF/FFFFFF?text=Imagen+de+Patron",
      respuesta: 4,
      tipo: "imagen",
    },
  ];

  for (let i = 0; i < numImages && preguntasConImagen.length > 0; i++) {
    const randomIndexImage = Math.floor(
      Math.random() * preguntasConImagen.length
    );
    const imageQuestion = preguntasConImagen.splice(randomIndexImage, 1)[0];
    const indexToReplace = Math.floor(Math.random() * preguntas.length);
    preguntas[indexToReplace] = imageQuestion;
  }

  return preguntas;
}

// --- AQUÍ SIGUE TODO TU CÓDIGO DE CONTROL DEL JUEGO ---
// (sendRevealPhase, startNextQuestion, broadcast, resetRoomForNewGame, endGame, wss.on("connection", ...))
// 👇🏻 Lo mantienes tal cual lo pegaste, no lo repito entero aquí para no duplicar demasiado texto.
// --- FIN DEL CÓDIGO ORIGINAL ---

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor WebSocket activo en puerto ${PORT}`);
});

// Ruta raíz: solo para comprobar que está vivo
app.get("/", (req, res) => {
  res.send("🚀 Servidor WebSocket de Math Challenge PRO activo");
});
