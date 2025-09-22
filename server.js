// Servidor WebSocket para Math Challenge PRO
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Para generar IDs únicos

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Objeto global para almacenar todas las salas activas
// Cada sala contiene su estado de juego, jugadores, preguntas, etc.
const rooms = {};

// --- FUNCIONES PARA GENERAR PREGUNTAS (AHORA RESIDEN EN EL SERVIDOR) ---
function generarPreguntas(mode, count) {
    const preguntas = [];
    
    // Generador para operaciones básicas
    const generarOperacion = (operator = null) => {
        const num1 = Math.floor(Math.random() * 15) + 1; 
        const num2 = Math.floor(Math.random() * 15) + 1;
        const operadores = ['+', '-', '*', '/'];
        let op = operator || operadores[Math.floor(Math.random() * operadores.length)];
        
        let pregunta, respuesta;
        
        if (op === '/') {
            // Asegurar que la división sea exacta
            let divisor = Math.floor(Math.random() * 8) + 2; 
            let cociente = Math.floor(Math.random() * 10) + 1; 
            let dividendo = divisor * cociente;
            pregunta = `${dividendo} ÷ ${divisor} = ?`;
            respuesta = cociente;
        } else {
             switch(op) {
                case '+':
                    pregunta = `${num1} + ${num2} = ?`;
                    respuesta = num1 + num2;
                    break;
                case '-':
                    // Asegurar resultado positivo en restas
                    if (num1 < num2) { [num1, num2] = [num2, num1]; } 
                    pregunta = `${num1} - ${num2} = ?`;
                    respuesta = num1 - num2;
                    break;
                case '*':
                    pregunta = `${num1} × ${num2} = ?`;
                    respuesta = num1 * num2;
                    break;
            }
        }
        
        return { pregunta, respuesta, tipo: 'operacion' };
    };
    
    // Generador para el modo "Número Misterioso"
    const generarMisterioso = () => {
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const tipoOp = Math.random();
        
        let pregunta, respuesta;
        
        if (tipoOp < 0.33) { // Suma
            respuesta = num1;
            pregunta = `? + ${num2} = ${num1 + num2}`;
        } else if (tipoOp < 0.66) { // Resta
            respuesta = num1 + num2; // El resultado es el número mayor para que la resta sea positiva
            pregunta = `? - ${num2} = ${num1}`;
        } else { // Multiplicación
            respuesta = num1;
            pregunta = `? × ${num2} = ${num1 * num2}`;
        }
        
        return { pregunta, respuesta, tipo: 'misterioso' };
    };
    
    // Generador para el modo "Secuencia Numérica"
    const generarSecuencia = () => {
        const patrones = [
            { inicio: 2, paso: 2, longitud: 5 }, // 2, 4, 6, 8, ?
            { inicio: 1, paso: 3, longitud: 5 }, // 1, 4, 7, 10, ?
            { inicio: 10, paso: -2, longitud: 5 }, // 10, 8, 6, 4, ?
            { inicio: 5, paso: 5, longitud: 5 }, // 5, 10, 15, 20, ?
            { inicio: 3, paso: 4, longitud: 5 }  // 3, 7, 11, 15, ?
        ];
        
        const patron = patrones[Math.floor(Math.random() * patrones.length)];
        const posicionFalta = Math.floor(Math.random() * (patron.longitud - 1)) + 1; // El '?' no es el primer número
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
        
        return { pregunta, respuesta, tipo: 'secuencia' };
    };
    
    // Generador para el modo "Potenciación"
    const generarPotenciacion = () => {
        const base = Math.floor(Math.random() * 4) + 2; // Base entre 2 y 5
        const exponente = Math.floor(Math.random() * 3) + 2; // Exponente entre 2 y 4
        const superScripts = ['⁰', '¹', '²', '³', '⁴', '⁵']; // Para formato visual
        const pregunta = `${base}${superScripts[exponente]} = ?`;
        const respuesta = Math.pow(base, exponente);
        
        return { pregunta, respuesta, tipo: 'potenciacion' };
    };
    
    // Generador para el modo "Operaciones Combinadas"
    const generarCombinadas = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const num3 = Math.floor(Math.random() * 5) + 1;
        
        let pregunta = '';
        let respuesta = 0;
        const opcion = Math.floor(Math.random() * 3); // Elegir un tipo de operación combinada

        switch(opcion) {
            case 0: // (a + b) * c
                pregunta = `(${num1} + ${num2}) × ${num3} = ?`;
                respuesta = (num1 + num2) * num3;
                break;
            case 1: // a + b * c
                pregunta = `${num1} + ${num2} × ${num3} = ?`;
                respuesta = num1 + (num2 * num3);
                break;
            case 2: // (a - b) + c (asegurando a > b)
                if (num1 < num2) { [num1, num2] = [num2, num1]; }
                pregunta = `(${num1} - ${num2}) + ${num3} = ?`;
                respuesta = (num1 - num2) + num3;
                break;
        }
        return { pregunta, respuesta, tipo: 'combinadas' };
    };
    
    // Generador para el modo "Verdadero/Falso"
    const generarVerdaderoFalso = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operadores = ['+', '-', '*', '/'];
        const operador = operadores[Math.floor(Math.random() * operadores.length)];
        
        let operacionTexto;
        let resultadoReal;
        
        // Calcular la operación real
        switch(operador) {
            case '+':
                resultadoReal = num1 + num2;
                operacionTexto = `${num1} + ${num2}`;
                break;
            case '-':
                resultadoReal = num1 - num2;
                operacionTexto = `${num1} - ${num2}`;
                break;
            case '*':
                resultadoReal = num1 * num2;
                operacionTexto = `${num1} × ${num2}`;
                break;
            case '/':
                // Asegurar división exacta para T/F
                let divisor = Math.floor(Math.random() * 5) + 2; 
                let cociente = Math.floor(Math.random() * 10) + 1;
                let dividendo = divisor * cociente;
                resultadoReal = cociente;
                operacionTexto = `${dividendo} ÷ ${divisor}`;
                break;
        }

        const esCorrecta = Math.random() < 0.7; // 70% de probabilidad de ser verdadera
        let resultadoMostrado = resultadoReal;
        if (!esCorrecta) {
            // Generar un resultado falso cercano, asegurando que no sea el mismo
            resultadoMostrado += (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1); 
            if (resultadoMostrado === resultadoReal) resultadoMostrado += (Math.random() > 0.5 ? 1 : -1); 
        }
        
        const pregunta = `¿Es correcta esta operación?<br>${operacionTexto} = ${resultadoMostrado}`;
        const respuesta = esCorrecta; // La respuesta es un booleano: true o false
        const explicacion = esCorrecta ? "La operación es correcta." : `La operación es incorrecta. La respuesta correcta era ${resultadoReal}.`;
        
        return { 
            pregunta: pregunta, 
            respuesta: respuesta,
            tipo: 'verdadero-falso',
            explicacion: explicacion
        };
    };

    // Preguntas estáticas para el modo "Informática"
    const informaticaQuestions = [
        {
            pregunta: "¿Cuál de estos es un navegador de internet?",
            opciones: { A: "Microsoft Word", B: "Google Chrome", C: "WhatsApp", D: "Photoshop" },
            respuesta: "B",
            tipo: "informatica"
        },
        {
            pregunta: "¿Cuál de estos es un emoji?",
            opciones: { A: "@", B: "#", C: "😂", D: "/" },
            respuesta: "C",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué red social es conocida por compartir fotos y videos cortos?",
            opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" },
            respuesta: "B",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué icono es el de 'guardar' en muchos programas?",
            opciones: { A: "Una carpeta", B: "Un disquete (💾)", C: "Una nube", D: "Una lupa" },
            respuesta: "B",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué puedes hacer con un 'USB'?",
            opciones: { A: "Guardar fotos o documentos", B: "Hacer llamadas", C: "Navegar en internet", D: "Jugar videojuegos" },
            respuesta: "A",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué app te permite hacer videollamadas gratis?",
            opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" },
            respuesta: "B",
            tipo: "informatica"
        },
        {
            pregunta: "¿Cuál es la red social con más usuarios activos en el mundo?",
            opciones: { A: "TikTok", B: "Instagram", C: "Facebook", D: "Twitter/X" },
            respuesta: "C",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué significa WWW en una dirección web?",
            opciones: { A: "World Wide Web", B: "Windows Web Works", C: "Web World Wide", D: "Web Wonder World" },
            respuesta: "A",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué parte de la computadora es el 'cerebro'?",
            opciones: { A: "Monitor", B: "Teclado", C: "CPU", D: "Impresora" },
            respuesta: "C",
            tipo: "informatica"
        },
        {
            pregunta: "¿Qué es un 'hashtag'?",
            opciones: { A: "Un tipo de comida", B: "Una forma de categorizar temas en redes sociales", C: "Un programa de dibujo", D: "Un juego de mesa" },
            respuesta: "B",
            tipo: "informatica"
        }
    ];
    
    // Selección del generador de preguntas según el modo
    let generador;
    switch(mode) {
        case 'operaciones': generador = generarOperacion; break;
        case 'misterioso': generador = generarMisterioso; break;
        case 'secuencia': generador = generarSecuencia; break;
        case 'potenciacion': generador = generarPotenciacion; break;
        case 'combinadas': generador = generarCombinadas; break;
        case 'verdadero-falso': generador = generarVerdaderoFalso; break;
        case 'mas-cercano': generador = () => generarOperacion(); break; // Usa operaciones para este modo
        case 'sumamultiplicacion':
            // Combina preguntas de suma y multiplicación
            for (let i = 0; i < Math.floor(count / 2); i++) preguntas.push(generarOperacion('+'));
            for (let i = 0; i < Math.ceil(count / 2); i++) preguntas.push(generarOperacion('*'));
            return preguntas; // Retorna directamente, ya que se construye diferente
        case 'informatica':
            // Baraja y toma el número 'count' de preguntas de informática
            const shuffled = [...informaticaQuestions].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        default: generador = generarOperacion; // Modo por defecto si no se especifica
    }
    
    // Generar preguntas para la mayoría de los modos
    for (let i = 0; i < count; i++) {
        preguntas.push(generador());
    }
    
    // Opcional: Insertar algunas preguntas con imagen
    const preguntasConImagen = [
        {
            pregunta: "¿Cuántos cuadrados hay en esta figura?",
            imagen: "https://placehold.co/400x200/FF0000/FFFFFF?text=Imagen+de+Cuadrados",
            respuesta: 5,
            tipo: "imagen"
        },
        {
            pregunta: "¿Cuántas frutas ves en la imagen?",
            imagen: "https://placehold.co/400x200/00FF00/000000?text=Imagen+de+Frutas",
            respuesta: 8,
            tipo: "imagen"
        },
        {
            pregunta: "¿Cuál es el patrón que sigue la siguiente figura?",
            imagen: "https://placehold.co/400x200/0000FF/FFFFFF?text=Imagen+de+Patron",
            respuesta: 4, 
            tipo: "imagen"
        }
    ];

    // Añadir aleatoriamente algunas preguntas con imagen si no se está en un modo específico
    if (mode !== 'informatica' && mode !== 'verdadero-falso') { // Evitar imágenes en modos que no las usan bien
        const numImages = Math.floor(Math.random() * 2) + 1; // 1 o 2 imágenes
        for (let i = 0; i < numImages && preguntasConImagen.length > 0; i++) {
            const randomIndexImage = Math.floor(Math.random() * preguntasConImagen.length);
            const imageQuestion = preguntasConImagen.splice(randomIndexImage, 1)[0]; 
            const indexToReplace = Math.floor(Math.random() * preguntas.length);
            preguntas.splice(indexToReplace, 0, imageQuestion); // Insertar sin reemplazar
        }
    }
    
    return preguntas;
}

// --- FUNCIONES DE LÓGICA DE JUEGO CENTRALIZADA ---

/**
 * Calcula los puntos, gestiona rachas y envía la fase de revelación a todos los clientes.
 * Esta función es crucial para la lógica de juego del servidor.
 * @param {object} room - El objeto de la sala.
 */
function sendRevealPhase(room) {
    if (!room || !room.currentQuestion) {
        console.warn(`[Sala ${room.pin}] Intento de revelar sin sala o sin pregunta actual.`);
        return;
    }

    const correctAnswer = room.currentQuestion.respuesta;
    const basePoints = 5; // Puntos base por respuesta correcta

    // 1. Calcular puntos para cada jugador que respondió
    room.players.forEach(player => {
        const playerAnswerData = room.answersThisRound[player.id];
        let pointsEarned = 0;
        let streakBonus = 0;
        let isCorrect = false;

        if (playerAnswerData && playerAnswerData.answer !== null) { // Si el jugador respondió y no fue por tiempo agotado (answer: null)
            const roundDuration = room.timerDuration || 30; // Usar la duración actual de la pregunta
            const timeTaken = playerAnswerData.responseTime; 
            const timeLeft = Math.max(0, roundDuration - timeTaken); // Tiempo restante en el reloj, nunca negativo

            // Bonificación por rapidez (ej: más puntos si responde rápido)
            const timeBonus = Math.floor(timeLeft / 3); // 1 punto por cada 3 segundos restantes

            let userAnswerProcessed = playerAnswerData.answer;

            // Lógica para determinar si la respuesta es correcta según el modo de juego
            if (room.gameMode === 'verdadero-falso') {
                isCorrect = (userAnswerProcessed === 'true') === correctAnswer;
            } else if (room.gameMode === 'informatica') {
                isCorrect = (userAnswerProcessed === correctAnswer); // Comparar letras
            } else {
                // Para modos numéricos, convertir a número para comparar
                isCorrect = parseFloat(userAnswerProcessed) === correctAnswer;
            }
            
            if (isCorrect) {
                player.streak++; // Aumentar racha si es correcta
                if (player.streak > player.maxStreak) player.maxStreak = player.streak; // Actualizar racha máxima
                
                // Calcular bonificación por racha
                if (player.streak >= 7) streakBonus = 8;
                else if (player.streak >= 5) streakBonus = 5;
                else if (player.streak >= 3) streakBonus = 2;
                
                pointsEarned = basePoints + timeBonus + streakBonus;
                player.points += pointsEarned; // Sumar puntos al total del jugador
            } else {
                player.streak = 0; // Romper racha si es incorrecta
            }
        } else { // Si el jugador no respondió o su tiempo se agotó (answer: null)
            player.streak = 0; // Romper racha
        }

        // 2. Enviar mensaje de revelación PERSONALIZADO a cada jugador
        const resultPayload = {
            type: 'reveal_phase',
            correctAnswer: correctAnswer, // La respuesta correcta
            playerCorrect: isCorrect, // Si la respuesta de ESTE jugador fue correcta
            streakBonus: streakBonus, // Bonificación de racha para ESTE jugador
            // Incluir opciones para que el cliente pueda mostrar "B) Google Chrome" en vez de solo "B"
            options: room.gameMode === 'informatica' ? room.currentQuestion.opciones : undefined 
        };
        if (player.socket && player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(resultPayload));
        }
    });

    console.log(`[Sala ${room.pin}] Fase de revelación enviada.`);

    // 3. Después de un breve retraso (para que los clientes muestren la revelación),
    // enviar el ranking actualizado y decidir si avanzar a la siguiente pregunta o terminar el juego.
    setTimeout(() => {
        // Enviar el ranking actualizado a todos (sin la propiedad 'socket'!)
        broadcast(room.pin, {
            type: 'ranking_update',
            players: room.players.map(p => ({
                id: p.id, name: p.name, avatar: p.avatar, points: p.points, streak: p.streak, maxStreak: p.maxStreak, avgResponseTime: p.avgResponseTime
            }))
        });
        console.log(`[Sala ${room.pin}] Ranking actualizado enviado.`);
        
        // Esperar la duración de la fase de revelación antes de la siguiente acción
        setTimeout(() => {
            if (room.questionIndex < room.totalQuestions - 1) {
                room.questionIndex++; // Avanzar a la siguiente pregunta
                startNextQuestion(room); // Iniciar la siguiente pregunta
            } else {
                // Si no hay más preguntas, el juego ha terminado
                endGame(room.pin);
            }
        }, room.revealPhaseDuration || 3000); // Duración de la fase de revelación
    }, 1000); // Pequeño retraso antes de enviar el ranking para no sobrecargar
}


/**
 * Inicia la siguiente pregunta del juego, o la primera si es el inicio de la partida.
 * Se encarga de limpiar respuestas anteriores, seleccionar la nueva pregunta,
 * configurar el temporizador y enviarla a todos los clientes.
 * @param {object} room - El objeto de la sala.
 */
function startNextQuestion(room) {
    // Validar que la sala y el juego estén activos
    if (!room || !room.isGameRunning) {
        console.warn(`[Sala ${room.pin}] No se puede iniciar la siguiente pregunta. Sala o juego no activo.`);
        return;
    }
    // Validar que haya preguntas disponibles
    if (!room.questions || room.questions.length === 0 || room.questionIndex >= room.questions.length) {
        console.warn(`[Sala ${room.pin}] No hay preguntas disponibles o índice fuera de rango. Terminando juego.`);
        endGame(room.pin);
        return;
    }

    room.answersThisRound = {}; // Reiniciar las respuestas para la nueva ronda
    room.currentQuestion = room.questions[room.questionIndex]; // Seleccionar la pregunta actual del array de la sala
    
    // Configurar la duración del temporizador de la ronda según el modo de juego
    let timerDuration = 30; // Duración por defecto
    if (room.gameMode === 'relampago') {
        timerDuration = 5;
    } else if (room.gameMode === 'verdadero-falso') {
        timerDuration = 15;
    } else if (room.gameMode === 'informatica') {
        timerDuration = 20;
    }
    room.timerDuration = timerDuration; // Guardar la duración en la sala para usar en el cálculo de puntos

    // Crear una copia de la pregunta para enviar a los clientes,
    // eliminando la respuesta y explicación para evitar trampas.
    const questionForClients = { ...room.currentQuestion };
    if (questionForClients.tipo === 'verdadero-falso') {
        delete questionForClients.respuesta;
        delete questionForClients.explicacion; 
    } else if (questionForClients.tipo === 'informatica') {
        // Para el modo informática, solo eliminamos la respuesta y la explicación.
        // Las 'opciones' deben permanecer, ya que el cliente las necesita para mostrarlas.
        delete questionForClients.respuesta;
        delete questionForClients.explicacion; 
    }
    // Para otros tipos de preguntas (numéricas, imagen), la 'respuesta' no se envía explícitamente,
    // se espera que el cliente calcule y envíe el número.

    // Enviar la pregunta y metadatos de la ronda a todos los clientes en la sala
    broadcast(room.pin, { 
        type: 'question_update', 
        question: questionForClients, // La pregunta sin la respuesta
        questionIndex: room.questionIndex, 
        totalQuestions: room.totalQuestions,
        timerDuration: timerDuration // Informar al cliente la duración del temporizador para la UI
    });
    
    console.log(`[Sala ${room.pin}] Pregunta ${room.questionIndex + 1} de ${room.totalQuestions} enviada. Modo: ${room.gameMode}. Duración: ${timerDuration}s`);

    // Iniciar el temporizador maestro de la ronda en el servidor.
    // Si el tiempo se agota, el servidor forzará la fase de revelación.
    clearTimeout(room.roundTimer); // Limpiar cualquier temporizador anterior
    room.roundTimer = setTimeout(() => {
        const currentRoom = rooms[room.pin]; // Re-verificar que la sala aún existe
        if (currentRoom && currentRoom.isGameRunning) {
            console.log(`[Sala ${room.pin}] TIEMPO AGOTADO para la pregunta ${room.questionIndex + 1}.`);
            sendRevealPhase(currentRoom); // Calificar y pasar a la fase de revelación
        }
    }, timerDuration * 1000); // Convertir segundos a milisegundos
}


/**
 * Envía un mensaje a todos los jugadores en una sala específica.
 * Excluye la propiedad 'socket' para evitar errores de serialización.
 * @param {string} pin - El PIN de la sala.
 * @param {object} data - Los datos a enviar (se convertirán a JSON).
 */
function broadcast(pin, data) {
    const room = rooms[pin];
    if (!room) {
        console.warn(`[Broadcast] Sala ${pin} no encontrada.`);
        return;
    }
    room.players.forEach(p => {
        if (p.socket && p.socket.readyState === WebSocket.OPEN) {
            try {
                // Intentar enviar los datos. JSON.stringify puede fallar si hay referencias circulares.
                // Asegurarse de que 'data' sea un objeto simple y no contenga referencias complejas como 'socket'.
                p.socket.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[Sala ${pin}] Error al enviar mensaje a jugador ${p.id}:`, e);
                // Si el error es de circularidad, se debe a que 'data' no fue limpiada correctamente.
                // El error de circularidad que ocurrió antes se resolvió al mapear finalRanking en endGame.
            }
        }
    });
}

/**
 * Reinicia el estado de una sala para prepararla para una nueva partida.
 * Se llama cuando los clientes indican que han terminado de ver los resultados y quieren volver al lobby.
 * @param {string} pin - El PIN de la sala a reiniciar.
 */
function resetRoomForNewGame(pin) {
    const room = rooms[pin];
    if (room) {
        room.gameMode = null; 
        room.closestAnswerMode = false; 
        room.questionIndex = 0;
        room.finalRanking = []; 
        room.isGameRunning = false; 
        room.votes = {}; // Limpiar votos de la partida anterior
        room.isVotingActive = false; 
        clearInterval(room.voteTimer); room.voteTimer = null; // Limpiar temporizador de votación
        room.voteTimeRemaining = 30; 
        clearTimeout(room.roundTimer); room.roundTimer = null; // Limpiar temporizador de ronda
        room.answersThisRound = {}; 
        room.currentQuestion = null;
        room.questions = []; // Importante: Limpiar las preguntas generadas para la sala
        // Resetear el estado de cada jugador en la sala
        room.players.forEach(p => {
            p.points = 0; 
            p.streak = 0; 
            p.maxStreak = 0; 
            p.avgResponseTime = 0; // Asumiendo que se calcula en el cliente
            p.hasVoted = false; 
            p.isReady = false; // Resetear estado de listo
        });
        console.log(`[Sala ${pin}] Estado de la sala reiniciado para nueva partida.`);
        // Notificar a los jugadores que el estado de la sala ha cambiado (podría ser útil para la UI)
        broadcast(pin, { type: 'room_reset' }); 
    }
}

/**
 * Finaliza el juego en una sala, limpia temporizadores y envía el ranking final.
 * @param {string} pin - El PIN de la sala donde termina el juego.
 */
function endGame(pin) {
    const room = rooms[pin];
    if (!room) {
        console.warn(`[endGame] Sala ${pin} no encontrada.`);
        return;
    }

    // Limpiar todos los temporizadores activos asociados a la sala
    if (room.roundTimer) {
        clearTimeout(room.roundTimer);
        room.roundTimer = null;
    }
    if (room.voteTimer) { 
        clearInterval(room.voteTimer);
        room.voteTimer = null;
    }

    room.isGameRunning = false; // Marcar el juego como no en curso
    
    // Calcular el ranking final, mapeando para EXCLUIR las referencias circulares como 'socket'
    const finalRanking = [...room.players].sort((a, b) => {
        // Ordenar primero por puntos (descendente)
        if (b.points !== a.points) return b.points - a.points;
        // Luego por tiempo promedio de respuesta (ascendente, los más rápidos primero)
        const avgA = typeof a.avgResponseTime === 'number' && !isNaN(a.avgResponseTime) ? a.avgResponseTime : Infinity;
        const avgB = typeof b.avgResponseTime === 'number' && !isNaN(b.avgResponseTime) ? b.avgResponseTime : Infinity;
        if (avgA !== avgB) return avgA - avgB; 
        // Finalmente por racha máxima (descendente)
        return (b.maxStreak || 0) - (a.maxStreak || 0); 
    }).map(p => ({ // <-- ¡ESTO ES CRÍTICO! Crear nuevos objetos planos sin 'socket'
        id: p.id, 
        name: p.name, 
        avatar: p.avatar, 
        points: p.points, 
        streak: p.streak, 
        maxStreak: p.maxStreak, 
        // No incluir avgResponseTime si solo se usa para el desempate en el cliente
        // Si se va a mostrar, sí hay que incluirlo. Lo dejamos para que el cliente lo actualice.
    }));
    
    room.finalRanking = finalRanking; // Almacenar el ranking final (limpio) en la sala
    
    // Enviar el ranking final a todos los clientes.
    broadcast(pin, { type: 'game_over', finalRanking: finalRanking });
    console.log(`[Sala ${pin}] Juego terminado. Ranking final enviado.`);

    // NOTA: La lógica de `resetRoomForNewGame` se disparará cuando los clientes
    // envíen el mensaje 'game_over' al hacer clic en "Volver al Lobby" o "Reiniciar Juego",
    // asegurando que la pantalla de resultados tenga tiempo de mostrarse.
}

// --- MANEJO DE CONEXIONES Y MENSAJES DE WEBSOCKET ---

// Evento que se dispara cuando un nuevo cliente se conecta al servidor WebSocket
wss.on('connection', (ws, req) => {
    ws.id = uuidv4(); // Asignar un ID único a cada conexión de WebSocket
    // Obtener el PlayerID de los parámetros de la URL, o usar el ID del WS como fallback
    const params = new URLSearchParams(req.url.replace('/?', ''));
    let playerId = params.get('playerId') || ws.id; 
    let currentRoomPin = null; // PIN de la sala a la que está conectado este WS
    let currentPlayerData = null; // Datos del jugador asociados a esta conexión
    
    let isAlive = true; // Para el mecanismo de heartbeat
    ws.on('pong', () => { isAlive = true; }); // Responder a pings para mantener la conexión viva

    // Evento que se dispara cuando el servidor recibe un mensaje de un cliente
    ws.on('message', (message) => {
        let data;
        try { 
            data = JSON.parse(message); // Parsear el mensaje JSON recibido
        } catch (e) { 
            console.error(`[WS: ${ws.id}] Error al parsear JSON:`, e); 
            return; // Ignorar mensajes no válidos
        }
        
        console.log(`[WS: ${ws.id}] Mensaje recibido: ${data.type} (PIN: ${data.pin || 'N/A'})`);

        // Manejar diferentes tipos de mensajes
        switch (data.type) {
            case 'create_room':
            case 'join_room':
            case 'rejoin_room':
                const { pin, player } = data;
                currentRoomPin = pin; // Almacenar el PIN de la sala para esta conexión
                player.id = player.id || playerId; // Usar el ID del jugador del cliente, o el generado
                playerId = player.id; // Actualizar el playerId global para esta conexión
                
                // Preparar los datos del jugador a almacenar en la sala
                currentPlayerData = {
                    id: player.id, 
                    name: player.name, 
                    avatar: player.avatar || '1', 
                    points: player.points || 0,
                    isProfessor: player.isProfessor || false, 
                    isReady: player.isReady || false,
                    streak: player.streak || 0, 
                    maxStreak: player.maxStreak || 0,
                    avgResponseTime: player.avgResponseTime || 0, 
                    hasVoted: false, 
                    socket: ws // Referencia al objeto WebSocket (¡se limpia antes de serializar!)
                };

                if (data.type === 'create_room') {
                    // Si la sala ya existe, enviar error
                    if (rooms[pin]) { 
                        ws.send(JSON.stringify({ type: 'error', message: 'La sala con este PIN ya existe.' })); 
                        return; 
                    }
                    // Crear nueva sala con estado inicial
                    rooms[pin] = {
                        pin: pin,
                        players: [], 
                        hostId: player.id, // El creador es el anfitrión
                        votes: {}, 
                        voteTimer: null, 
                        voteTimeRemaining: 30,
                        isVotingActive: false, 
                        gameMode: null, 
                        closestAnswerMode: false, 
                        questionIndex: 0,
                        totalQuestions: 10, // Número fijo de preguntas por partida
                        finalRanking: [], 
                        isGameRunning: false, 
                        questions: [], // Array para almacenar las preguntas generadas por el servidor
                        answersThisRound: {}, 
                        roundTimer: null, 
                        currentQuestion: null, 
                        timerDuration: 30, // Duración por defecto de la pregunta
                        revealPhaseDuration: 3000 // Duración de la fase de revelación
                    };
                    console.log(`[Sala ${pin}] Sala creada por ${player.name}.`);
                } else if (!rooms[pin]) { 
                    // Si la sala no existe para join/rejoin, enviar error
                    ws.send(JSON.stringify({ type: 'error', message: 'La sala no existe.' })); 
                    return; 
                }
                
                const room = rooms[pin];
                // Intentar encontrar si el jugador ya existe (para reconexiones)
                const existingPlayerIndex = room.players.findIndex(p => p.id === player.id);
                if (existingPlayerIndex !== -1) {
                    // Si existe, actualizar su socket y datos
                    room.players[existingPlayerIndex].socket = ws;
                    Object.assign(room.players[existingPlayerIndex], currentPlayerData);
                    console.log(`[Sala ${pin}] Jugador ${player.name} se ha reconectado.`);
                } else {
                    // Si es un jugador nuevo, añadirlo a la sala
                    room.players.push(currentPlayerData);
                    console.log(`[Sala ${pin}] Jugador ${player.name} se unió.`);
                }
                
                const isCurrentWsHost = (room.hostId === player.id); // Determinar si este WS es el anfitrión
                
                // Enviar confirmación de unión a la sala al cliente actual
                ws.send(JSON.stringify({
                    type: 'room_joined', 
                    pin: pin,
                    // Enviar una lista de jugadores limpia (sin referencias a sockets)
                    players: room.players.map(p => ({
                        id: p.id, name: p.name, avatar: p.avatar, isProfessor: p.isProfessor, isReady: p.isReady,
                        points: p.points, streak: p.streak, maxStreak: p.maxStreak, avgResponseTime: p.avgResponseTime
                    })),
                    isHost: isCurrentWsHost, 
                    gameMode: room.gameMode, 
                    closestAnswerMode: room.closestAnswerMode,
                    isGameRunning: room.isGameRunning, 
                    isVotingActive: room.isVotingActive,
                    voteTimeRemaining: room.voteTimeRemaining, 
                    currentVotes: room.votes,
                    questionIndex: room.questionIndex, 
                    totalQuestions: room.totalQuestions,
                    // Si el juego ya está en curso, enviar la pregunta actual para que se sincronicen
                    question: room.isGameRunning && room.currentQuestion ? {
                        pregunta: room.currentQuestion.pregunta,
                        imagen: room.currentQuestion.imagen,
                        tipo: room.currentQuestion.tipo,
                        opciones: room.currentQuestion.opciones // Opciones son necesarias para el cliente
                    } : undefined,
                    timerDuration: room.isGameRunning ? room.timerDuration : undefined
                }));

                // Notificar a los otros jugadores en la sala sobre el nuevo jugador/reconexión
                room.players.forEach(p => {
                    if (p.socket !== ws && p.socket.readyState === WebSocket.OPEN) { // No enviar a sí mismo
                        p.socket.send(JSON.stringify({
                            type: 'player_joined',
                            player: { id: currentPlayerData.id, name: currentPlayerData.name, avatar: currentPlayerData.avatar, isProfessor: currentPlayerData.isProfessor, isReady: currentPlayerData.isReady }
                        }));
                    }
                });
                break;
            
            case 'initiate_vote': 
                const roomVote = rooms[data.pin];
                // Validaciones para iniciar la votación
                if (!roomVote || roomVote.hostId !== data.hostId || roomVote.isVotingActive) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'No puedes iniciar la votación.' }));
                    }
                    return;
                }
                
                roomVote.isVotingActive = true;
                roomVote.voteTimeRemaining = 30; // Tiempo para votar
                roomVote.votes = {}; // Reiniciar conteo de votos
                roomVote.players.forEach(p => p.hasVoted = false); // Resetear estado de voto de los jugadores
                
                // Limpiar cualquier temporizador de votación anterior
                clearInterval(roomVote.voteTimer);
                // Iniciar temporizador de votación en el servidor
                roomVote.voteTimer = setInterval(() => {
                    roomVote.voteTimeRemaining--;
                    // Enviar actualización del temporizador a todos los clientes
                    broadcast(data.pin, { type: 'update_vote_timer', time: roomVote.voteTimeRemaining });
                    
                    if (roomVote.voteTimeRemaining <= 0) {
                        clearInterval(roomVote.voteTimer);
                        roomVote.voteTimer = null;
                        roomVote.isVotingActive = false; // Finalizar fase de votación
                        
                        // Determinar el modo de juego ganador
                        let maxVotes = 0;
                        let selectedMode = 'operaciones'; // Modo por defecto si no hay votos
                        const modesWithVotes = Object.entries(roomVote.votes).filter(([, count]) => count > 0);
                        if (modesWithVotes.length > 0) {
                            modesWithVotes.forEach(([mode, votes]) => {
                                if (votes > maxVotes) { maxVotes = votes; selectedMode = mode; }
                            });
                            // Manejar empates eligiendo aleatoriamente entre los modos empatados
                            const tiedModes = modesWithVotes.filter(([, votes]) => votes === maxVotes).map(([mode]) => mode);
                            selectedMode = tiedModes[Math.floor(Math.random() * tiedModes.length)];
                        }
                        roomVote.gameMode = selectedMode;
                        roomVote.closestAnswerMode = (selectedMode === 'mas-cercano'); // Modo especial
                        
                        // Generar todas las preguntas para la partida ANTES de que comience el juego
                        roomVote.questions = generarPreguntas(roomVote.gameMode, roomVote.totalQuestions); 
                        roomVote.questionIndex = 0; // Resetear índice de pregunta para la nueva partida
                        
                        // Notificar a los clientes que el juego va a comenzar
                        broadcast(data.pin, { type: 'game_starting', mode: roomVote.gameMode });
                        
                        // Pequeño retraso para que los clientes procesen 'game_starting' (animaciones, etc.)
                        setTimeout(() => {
                            roomVote.isGameRunning = true; // Marcar el juego como en curso
                            // Enviar el mensaje 'game_start' (solo para indicar el inicio y modo, la pregunta viene aparte)
                            broadcast(data.pin, { type: 'game_start', mode: roomVote.gameMode, closestAnswerMode: roomVote.closestAnswerMode });
                            // Iniciar la primera pregunta de la partida
                            startNextQuestion(roomVote);
                        }, 2000); 
                    }
                }, 1000); // Actualizar el temporizador cada segundo
                
                // Notificar a los clientes que la votación ha comenzado
                broadcast(data.pin, { type: 'start_voting', time: roomVote.voteTimeRemaining });
                break;
            
            case 'cast_vote':
                const roomCastVote = rooms[data.pin];
                if (!roomCastVote || !roomCastVote.isVotingActive) return; // Si no hay votación activa, ignorar
                const voter = roomCastVote.players.find(p => p.id === data.playerId);
                if (voter && !voter.hasVoted) {
                    roomCastVote.votes[data.mode] = (roomCastVote.votes[data.mode] || 0) + 1; // Contar el voto
                    voter.hasVoted = true; // Marcar jugador como que ya votó
                    broadcast(data.pin, { type: 'vote_update', votes: roomCastVote.votes }); // Enviar actualización de votos
                }
                break;
            
            case 'submit_answer':
                const roomAnswer = rooms[data.pin];
                if (!roomAnswer || !roomAnswer.isGameRunning) {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message: 'El juego no está activo.' }));
                    return;
                }
                
                // Validar que el jugador no haya respondido ya a esta pregunta en esta ronda
                if (roomAnswer.answersThisRound[data.playerId]) {
                    console.log(`[Sala ${data.pin}] Jugador ${data.playerId} intentó responder dos veces.`);
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message: 'Ya has respondido esta pregunta.' }));
                    return; 
                }

                // Guardar la respuesta del jugador y su tiempo de respuesta
                roomAnswer.answersThisRound[data.playerId] = {
                    answer: data.answer,
                    responseTime: data.responseTime 
                };
                
                console.log(`[Sala ${data.pin}] Respuesta guardada para ${data.playerId}. Respondidos: ${Object.keys(roomAnswer.answersThisRound).length}/${roomAnswer.players.length}`);
                
                // Opcional: Notificar al jugador que su respuesta fue recibida
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'answer_received', message: 'Respuesta recibida!' }));
                }

                // Verificar si todos los jugadores (excluyendo profesores, que no suelen responder) han respondido
                const activePlayers = roomAnswer.players.filter(p => !p.isProfessor);
                const allActivePlayersAnswered = activePlayers.every(p => roomAnswer.answersThisRound[p.id] !== undefined);

                // Si todos han respondido, o si el tiempo se agotó (manejado por roundTimer),
                // forzar la fase de revelación.
                if (allActivePlayersAnswered) {
                    console.log(`[Sala ${data.pin}] Todos los jugadores han respondido. Revelando...`);
                    clearTimeout(roomAnswer.roundTimer); // Detener el temporizador de la ronda
                    sendRevealPhase(roomAnswer); // Calcular y enviar resultados
                }
                break;

            case 'game_over': // Mensaje enviado por el CLIENTE para indicar que volvió al lobby o reinició
                const roomEndClient = rooms[data.pin];
                if (!roomEndClient) { // Si la sala ya se borró del servidor (ej. porque todos los demás se fueron)
                    console.warn(`[game_over (cliente)] Sala ${data.pin} no encontrada en el servidor.`);
                    return; 
                }
                console.log(`[Sala ${data.pin}] Mensaje 'game_over' recibido del cliente ${data.playerId}. Reiniciando estado de sala.`);
                // Resetear el estado de la sala en el servidor.
                // Esto es vital para que la sala esté limpia para futuras partidas.
                resetRoomForNewGame(data.pin); 
                break;
            
            case 'skip_question':
                const roomSkip = rooms[data.pin];
                // Solo el anfitrión/profesor puede saltar preguntas
                if (!roomSkip || roomSkip.hostId !== data.hostId || !roomSkip.isGameRunning) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'No puedes saltar esta pregunta.' }));
                    }
                    return;
                }
                console.log(`[Sala ${data.pin}] Profesor ${data.hostId} ha saltado la pregunta.`);
                clearTimeout(roomSkip.roundTimer); // Detener el temporizador actual de la ronda
                sendRevealPhase(roomSkip); // Forzar la fase de revelación y avanzar a la siguiente pregunta
                break;

            case 'player_ready': // Cliente notifica su estado de listo
                const roomReady = rooms[data.pin];
                if (roomReady) {
                    const playerReady = roomReady.players.find(p => p.id === data.playerId);
                    if (playerReady) {
                        playerReady.isReady = data.isReady;
                        // Notificar a todos en la sala sobre el cambio de estado de listo
                        broadcast(data.pin, { type: 'player_ready_update', playerId: data.playerId, isReady: data.isReady });
                        console.log(`[Sala ${data.pin}] Jugador ${playerReady.name} está ${data.isReady ? 'LISTO' : 'NO LISTO'}.`);
                    }
                }
                break;

            case 'ping': // Responder a los pings del cliente para mantener la conexión viva
                ws.send(JSON.stringify({ type: 'pong' }));
                break;

            default:
                console.warn(`[WS: ${ws.id}] Tipo de mensaje no reconocido: ${data.type}`);
        }
    });

    // Evento que se dispara cuando una conexión de WebSocket se cierra
    ws.on('close', () => {
        clearInterval(ws.pingInterval); // Limpiar el intervalo de ping para este socket
        // Si el socket estaba en una sala, gestionar su salida
        if (currentRoomPin && rooms[currentRoomPin]) {
            const room = rooms[currentRoomPin];
            const playerLeaving = room.players.find(p => p.socket === ws);
            if (playerLeaving) {
                // Eliminar al jugador de la lista de la sala
                room.players = room.players.filter(p => p.id !== playerLeaving.id);
                console.log(`[Sala ${currentRoomPin}] Jugador ${playerLeaving.name} (${playerLeaving.id}) se desconectó.`);
                
                if (room.players.length === 0) {
                    // Si la sala se queda vacía, limpiarla completamente
                    clearTimeout(room.roundTimer);
                    clearInterval(room.voteTimer);
                    delete rooms[currentRoomPin];
                    console.log(`[Sala ${currentRoomPin}] Sala eliminada por estar vacía.`);
                } else {
                    // Notificar a los jugadores restantes que un jugador se fue
                    broadcast(currentRoomPin, { type: 'player_left', playerId: playerLeaving.id });
                    
                    // Si el jugador que se fue era el anfitrión, transferir la hostilidad
                    if (room.hostId === playerLeaving.id) {
                        const newHostCandidate = room.players[0]; // Asignar el primer jugador disponible como nuevo anfitrión
                        if (newHostCandidate) {
                            room.hostId = newHostCandidate.id;
                            newHostCandidate.isProfessor = true; // El nuevo anfitrión asume el rol de profesor
                            broadcast(currentRoomPin, { type: 'new_host', newHostId: room.hostId, newHostName: newHostCandidate.name });
                            console.log(`[Sala ${currentRoomPin}] ${newHostCandidate.name} es el nuevo anfitrión.`);
                        } else {
                            // Si no quedan jugadores, la sala debería haber sido eliminada (redundancia)
                            clearTimeout(room.roundTimer);
                            clearInterval(room.voteTimer);
                            delete rooms[currentRoomPin];
                            console.log(`[Sala ${currentRoomPin}] Sala eliminada, no hay más jugadores para ser anfitrión.`);
                        }
                    }
                }
            }
        }
    });
    
    // Configurar el intervalo para enviar pings y verificar la vitalidad del cliente
    ws.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.CLOSED) { 
            clearInterval(ws.pingInterval); 
            return; 
        }
        if (!isAlive) { // Si no se recibió un pong desde el último ping, se asume que el cliente está muerto
            console.warn(`[WS: ${ws.id}] Cliente inactivo, terminando conexión.`);
            ws.terminate(); 
            return; 
        }
        isAlive = false; // Resetear para el siguiente chequeo
        ws.ping(); // Enviar ping al cliente
    }, 30000); // Enviar ping cada 30 segundos
});

// Iniciar el servidor HTTP y WebSocket
server.listen(PORT, () => {
    console.log(`Servidor WebSocket activo en puerto ${PORT}`);
});

// Ruta raíz para servir el archivo HTML del juego (asumiendo que se llama index.html)
app.get('/', (req, res) => {
    // Asegúrate de que este nombre coincida con tu archivo HTML
    res.sendFile(__dirname + '/index.html'); 
});
