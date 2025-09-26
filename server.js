// server.js
// Servidor WebSocket completo para Math Challenge PRO con soporte de "Finalistas" (torneo),
// retransmisión de emojis, manejo de espectadores y flujo: semifinals -> final -> ultimate_winner.

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Estructura en memoria de las salas
const rooms = {};

/* -----------------------
   UTIL / GENERADORES DE PREGUNTAS
   (incluye preguntas de informática usadas en la fase de torneo)
   ----------------------- */

function generarPreguntas(mode, count) {
    const preguntas = [];

    // --- Generadores pequeñas (se toman de tu server existing) ---
    const generarOperacion = (operator = null) => {
        let num1 = Math.floor(Math.random() * 15) + 1;
        let num2 = Math.floor(Math.random() * 15) + 1;
        const operadores = ['+', '-', '*', '/'];
        let op = operator || operadores[Math.floor(Math.random() * operadores.length)];
        let pregunta, respuesta;

        if (op === '/') {
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
                    if (num1 < num2) [num1, num2] = [num2, num1];
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
        return { pregunta, respuesta, tipo: 'misterioso' };
    };

    const generarVerdaderoFalso = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operadores = ['+', '-', '*', '/'];
        const operador = operadores[Math.floor(Math.random() * operadores.length)];
        let operacionTexto;
        let resultadoReal;
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
                let divisor = Math.floor(Math.random() * 5) + 2;
                let cociente = Math.floor(Math.random() * 10) + 1;
                let dividendo = divisor * cociente;
                resultadoReal = cociente;
                operacionTexto = `${dividendo} ÷ ${divisor}`;
                break;
        }
        const esCorrecta = Math.random() < 0.7;
        let resultadoMostrado = resultadoReal;
        if (!esCorrecta) {
            resultadoMostrado += (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
        }
        const pregunta = `¿Es correcta esta operación?<br>${operacionTexto} = ${resultadoMostrado}`;
        return { pregunta, respuesta: esCorrecta, tipo: 'verdadero-falso' , explicacion: esCorrecta ? "La operación es correcta." : `La operación es incorrecta. La respuesta correcta era ${resultadoReal}.` };
    };

    // Preguntas estáticas de informática (listas para torneo)
    const informaticaQuestions = [
        { pregunta: "¿Cuál de estos es un navegador de internet?", opciones: { A: "Microsoft Word", B: "Google Chrome", C: "WhatsApp", D: "Photoshop" }, respuesta: "B", tipo: "informatica" },
        { pregunta: "¿Cuál de estos es un emoji?", opciones: { A: "@", B: "#", C: "😂", D: "/" }, respuesta: "C", tipo: "informatica" },
        { pregunta: "¿Qué red social es conocida por compartir fotos y videos cortos?", opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" }, respuesta: "B", tipo: "informatica" },
        { pregunta: "¿Qué icono es el de 'guardar' en muchos programas?", opciones: { A: "Una carpeta", B: "Un disquete (💾)", C: "Una nube", D: "Una lupa" }, respuesta: "B", tipo: "informatica" },
        { pregunta: "¿Qué puedes hacer con un 'USB'?", opciones: { A: "Guardar fotos o documentos", B: "Hacer llamadas", C: "Navegar en internet", D: "Jugar videojuegos" }, respuesta: "A", tipo: "informatica" },
        { pregunta: "¿Qué app te permite hacer videollamadas gratis?", opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" }, respuesta: "B", tipo: "informatica" },
        { pregunta: "¿Cuál es la red social con más usuarios activos en el mundo?", opciones: { A: "TikTok", B: "Instagram", C: "Facebook", D: "Twitter/X" }, respuesta: "C", tipo: "informatica" },
        { pregunta: "¿Qué significa WWW en una dirección web?", opciones: { A: "World Wide Web", B: "Windows Web Works", C: "Web World Wide", D: "Web Wonder World" }, respuesta: "A", tipo: "informatica" },
        { pregunta: "¿Qué parte de la computadora es el 'cerebro'?", opciones: { A: "Monitor", B: "Teclado", C: "CPU", D: "Impresora" }, respuesta: "C", tipo: "informatica" },
        { pregunta: "¿Qué es un 'hashtag'?", opciones: { A: "Un tipo de comida", B: "Una forma de categorizar temas en redes sociales", C: "Un programa de dibujo", D: "Un juego de mesa" }, respuesta: "B", tipo: "informatica" }
    ];

    // Seleccionar generator según modo
    let generador;
    switch(mode) {
        case 'operaciones': generador = generarOperacion; break;
        case 'misterioso': generador = generarMisterioso; break;
        case 'verdadero-falso': generador = generarVerdaderoFalso; break;
        case 'informatica':
            // Barajar y retornar hasta 'count' preguntas
            const shuffled = [...informaticaQuestions].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        default:
            generador = generarOperacion;
    }

    for (let i=0;i<count;i++) preguntas.push(generador());

    return preguntas;
}

/* -----------------------
   BROADCAST HELPERS
   ----------------------- */

function broadcast(pin, data) {
    const room = rooms[pin];
    if (!room) return;
    room.players.forEach(p => {
        if (p.socket && p.socket.readyState === WebSocket.OPEN) {
            try {
                p.socket.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[Broadcast] Error al enviar a ${p.id}:`, e);
            }
        }
    });
}

function broadcastToIds(pin, ids, data) {
    const room = rooms[pin];
    if (!room) return;
    room.players.forEach(p => {
        if (ids.includes(p.id) && p.socket && p.socket.readyState === WebSocket.OPEN) {
            try { p.socket.send(JSON.stringify(data)); } catch(e){ console.error(e); }
        }
    });
}

function broadcastToFinalists(pin, data) {
    const room = rooms[pin];
    if (!room || !room.finalists) return;
    const ids = room.finalists.map(f => f.id);
    broadcastToIds(pin, ids, data);
}

function broadcastToSpectators(pin, data) {
    const room = rooms[pin];
    if (!room) return;
    const spectatorIds = room.players.filter(p => !room.finalists?.some(f=>f.id===p.id)).map(p=>p.id);
    broadcastToIds(pin, spectatorIds, data);
}

/* -----------------------
   LÓGICA CENTRAL: preguntas / revelación / fin de juego
   (Adaptada para integrar fase de torneo)
   ----------------------- */

function computeFinalRanking(room) {
    if (!room) return [];
    // ordenar por puntos, luego avgResponseTime asc, luego maxStreak desc
    const sorted = [...room.players].sort((a,b) => {
        if ((b.points||0) !== (a.points||0)) return (b.points||0) - (a.points||0);
        const avgA = typeof a.avgResponseTime === 'number' && !isNaN(a.avgResponseTime) ? a.avgResponseTime : Infinity;
        const avgB = typeof b.avgResponseTime === 'number' && !isNaN(b.avgResponseTime) ? b.avgResponseTime : Infinity;
        if (avgA !== avgB) return avgA - avgB;
        return (b.maxStreak||0) - (a.maxStreak||0);
    }).map(p => ({ id:p.id, name:p.name, avatar:p.avatar, points:p.points, streak:p.streak, maxStreak:p.maxStreak }));
    return sorted;
}

/**
 * sendRevealPhase: califica respuestas de la ronda actual (normal o torneo)
 * - Si room.tournamentStage está activo, aplica a los finalistas (tournament flow)
 * - Envia reveal a cada jugador y luego ranking
 */
function sendRevealPhase(room, isTournament=false) {
    if (!room) return;
    const questionObj = isTournament ? room.tournamentQuestions[room.tournamentQuestionIndex] : room.currentQuestion;
    if (!questionObj) { console.warn('No hay pregunta para revelar'); return; }

    const correctAnswer = questionObj.respuesta;
    const basePoints = 5;

    // elegir el contenedor de respuestas correcto
    const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
    const participants = isTournament ? room.finalists : room.players;

    participants.forEach(player => {
        const ansData = answersMap[player.id];
        let pointsEarned = 0;
        let streakBonus = 0;
        let isCorrect = false;

        if (ansData && ansData.answer !== null && ansData.answer !== undefined) {
            const roundDuration = isTournament ? (room.tournamentTimerDuration || 20) : (room.timerDuration || 30);
            const timeTaken = ansData.responseTime || 0;
            const timeLeft = Math.max(0, roundDuration - timeTaken);
            const timeBonus = Math.floor(timeLeft / 3);

            let userAnswerProcessed = ansData.answer;
            if (questionObj.tipo === 'verdadero-falso') {
                isCorrect = (userAnswerProcessed === 'true') === correctAnswer;
            } else if (questionObj.tipo === 'informatica') {
                isCorrect = (String(userAnswerProcessed).toUpperCase() === String(correctAnswer).toUpperCase());
            } else {
                isCorrect = parseFloat(userAnswerProcessed) === correctAnswer;
            }

            if (isCorrect) {
                player.streak = (player.streak || 0) + 1;
                if (!player.maxStreak || player.streak > player.maxStreak) player.maxStreak = player.streak;

                if (player.streak >= 7) streakBonus = 8;
                else if (player.streak >= 5) streakBonus = 5;
                else if (player.streak >= 3) streakBonus = 2;

                pointsEarned = basePoints + timeBonus + streakBonus;
                player.points = (player.points || 0) + pointsEarned;
            } else {
                player.streak = 0;
            }
        } else {
            player.streak = 0;
        }

        // enviar reveal personal
        const payload = {
            type: 'reveal_phase',
            correctAnswer: correctAnswer,
            playerId: player.id,
            playerCorrect: isCorrect,
            streakBonus,
            pointsEarned,
            options: questionObj.tipo === 'informatica' ? questionObj.opciones : undefined
        };

        if (player.socket && player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(payload));
        }
    });

    // después del reveal, enviar ranking actualizado (a todos)
    setTimeout(() => {
        const ranking = computeFinalRanking(room);
        broadcast(room.pin, { type: 'ranking_update', players: ranking });

        // decidir siguiente paso
        setTimeout(() => {
            if (!isTournament) {
                // Avanzar en la partida normal
                if (room.questionIndex < room.totalQuestions - 1) {
                    room.questionIndex++;
                    startNextQuestion(room);
                } else {
                    // fin de la PARTIDA normal -> si torneo activo, empezar semifinales
                    if (room.isFinalistTournament && !room.tournamentStarted) {
                        startSemifinals(room.pin);
                    } else {
                        endGame(room.pin);
                    }
                }
            } else {
                // Avanzar en ronda de torneo (semifinal o final)
                if (room.tournamentQuestionIndex < room.tournamentQuestions.length - 1) {
                    room.tournamentQuestionIndex++;
                    startNextTournamentQuestion(room);
                } else {
                    // terminar esta etapa de torneo (semifinal o final)
                    if (room.tournamentStage === 'semifinal') {
                        // de semifinales sacar top 2 y lanzar final
                        concludeSemifinals(room.pin);
                    } else if (room.tournamentStage === 'final') {
                        concludeFinal(room.pin);
                    }
                }
            }
        }, room.revealPhaseDuration || 3000);
    }, 800);
}

/**
 * startNextQuestion: servidor envía pregunta normal a todos (ya existía)
 */
function startNextQuestion(room) {
    if (!room || !room.isGameRunning) return;
    if (!room.questions || room.questionIndex >= room.questions.length) {
        endGame(room.pin);
        return;
    }

    room.answersThisRound = {};
    room.currentQuestion = room.questions[room.questionIndex];

    let timerDuration = 30;
    if (room.gameMode === 'relampago') timerDuration = 5;
    else if (room.gameMode === 'verdadero-falso') timerDuration = 15;
    else if (room.gameMode === 'informatica') timerDuration = 20;
    room.timerDuration = timerDuration;

    const questionForClients = { ...room.currentQuestion };
    delete questionForClients.respuesta;
    delete questionForClients.explicacion;

    broadcast(room.pin, {
        type: 'question_update',
        question: questionForClients,
        questionIndex: room.questionIndex,
        totalQuestions: room.totalQuestions,
        timerDuration
    });

    clearTimeout(room.roundTimer);
    room.roundTimer = setTimeout(() => {
        const currentRoom = rooms[room.pin];
        if (currentRoom && currentRoom.isGameRunning) {
            sendRevealPhase(currentRoom, false);
        }
    }, timerDuration * 1000);
}

/* -----------------------
   TORNEO: Semifinales y Final
   ----------------------- */

function startSemifinals(pin) {
    const room = rooms[pin];
    if (!room) return;
    room.tournamentStarted = true;
    room.tournamentStage = 'semifinal';

    // elegir N finalistas (3 o 4). Preferencia de sala si está set (room.finalistCount), fallback 3.
    const finalistCount = room.finalistCount || 3;
    const finalRanking = computeFinalRanking(room);
    const finalists = finalRanking.slice(0, Math.min(finalistCount, finalRanking.length));

    // Map finalists a objetos completos (para incluir socket y demás)
    room.finalists = room.players.filter(p => finalists.some(f => f.id === p.id));
    // resetear puntos/racha de los finalistas para la ronda de semifinal (opcional)
    room.finalists.forEach(f => { f.points = f.points || 0; f.streak = 0; });

    // Preguntas de torneo (usamos 'informatica' u otra categoría especial)
    room.tournamentQuestions = generarPreguntas('informatica', 3); // 3 preguntas para semifinal
    room.tournamentQuestionIndex = 0;
    room.tournamentAnswersThisRound = {};
    room.tournamentTimerDuration = 20;

    // Notificar a TODOS que las semifinales van a comenzar y cuáles son los finalistas
    broadcast(pin, { type: 'start_semifinals', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points, avatar: f.avatar })) });

    // Para LOS FINALISTAS: enviar la primera pregunta del torneo directamente y configurar timers
    setTimeout(() => {
        // Anunciar la ronda y enviar la pregunta inicial a finalistas
        startNextTournamentQuestion(room);
        // Espectadores reciben actualización de finalistas (sin preguntas con respuestas)
        broadcastToSpectators(pin, { type: 'spectator_update', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points })) });
    }, 1500);
}

function startNextTournamentQuestion(room) {
    if (!room || !room.finalists || room.finalists.length === 0) return;
    room.tournamentAnswersThisRound = {};
    const q = room.tournamentQuestions[room.tournamentQuestionIndex];
    const qForClients = { ...q };
    delete qForClients.respuesta;
    delete qForClients.explicacion;

    // enviar solo a finalistas la pregunta
    broadcastToFinalists(room.pin, {
        type: 'tournament_question',
        question: qForClients,
        questionIndex: room.tournamentQuestionIndex,
        totalQuestions: room.tournamentQuestions.length,
        timerDuration: room.tournamentTimerDuration
    });

    // a espectadores se les envía una versión pasiva (texto e índice)
    broadcastToSpectators(room.pin, {
        type: 'spectator_question_update',
        question: { pregunta: qForClients.pregunta, tipo: qForClients.tipo },
        questionIndex: room.tournamentQuestionIndex,
        totalQuestions: room.tournamentQuestions.length
    });

    // temporizador servidor
    clearTimeout(room.tournamentRoundTimer);
    room.tournamentRoundTimer = setTimeout(() => {
        // tiempo agotado -> revelar (para finalistas)
        sendRevealPhase(room, true);
    }, room.tournamentTimerDuration * 1000);
}

function concludeSemifinals(pin) {
    const room = rooms[pin];
    if (!room) return;
    // ordenar finalistas por puntos (los cambios de puntos ocurrieron durante semifinales)
    const sortedFinalists = [...room.finalists].sort((a,b) => (b.points||0) - (a.points||0));
    // seleccionar top 2 para la final
    const top2 = sortedFinalists.slice(0, 2);
    room.finalists = top2; // solo quedan 2
    // preparar preguntas de la final
    room.tournamentStage = 'final';
    room.tournamentQuestions = generarPreguntas('informatica', 3); // 3 preguntas para la final
    room.tournamentQuestionIndex = 0;
    room.tournamentAnswersThisRound = {};
    room.tournamentTimerDuration = 15; // final más rápido

    // notificar a todos
    broadcast(pin, { type: 'start_final', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points, avatar: f.avatar })) });

    setTimeout(() => {
        startNextTournamentQuestion(room);
        broadcastToSpectators(pin, { type: 'spectator_update', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points })) });
    }, 1500);
}

function concludeFinal(pin) {
    const room = rooms[pin];
    if (!room) return;
    // determinar ganador final segun points (o desempate por avgResponseTime si quieren)
    const sorted = [...room.finalists].sort((a,b) => (b.points||0) - (a.points||0));
    const winner = sorted[0];
    room.ultimateWinner = { id: winner.id, name: winner.name, avatar: winner.avatar, points: winner.points };

    // enviar mensaje ultimate_winner a todos (para mostrar la corona)
    broadcast(pin, { type: 'ultimate_winner', winner: room.ultimateWinner });

    // marcar fin torneo y limpiar estado
    room.tournamentStage = null;
    room.tournamentStarted = false;
    room.isFinalistTournament = false;
    // opcional: mantener ranking final
    room.finalRanking = computeFinalRanking(room);

    // limpiar timers
    clearTimeout(room.tournamentRoundTimer);
    room.tournamentRoundTimer = null;
}

/* -----------------------
   endGame (modificado para iniciar torneo en vez de terminar si aplica)
   ----------------------- */
function endGame(pin) {
    const room = rooms[pin];
    if (!room) return;

    if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
    if (room.voteTimer) { clearInterval(room.voteTimer); room.voteTimer = null; }

    room.isGameRunning = false;

    // si el torneo fue activado pero no se inició, iniciarlo (protección doble)
    if (room.isFinalistTournament && !room.tournamentStarted) {
        startSemifinals(pin);
        return;
    }

    // si no hay torneo o ya concluyó, enviar ranking final normal
    room.finalRanking = computeFinalRanking(room);
    broadcast(pin, { type: 'game_over', finalRanking: room.finalRanking });
}

/* -----------------------
   Mensaje: manejo WS (create/join/vote/submit/emoji/etc)
   ----------------------- */

wss.on('connection', (ws, req) => {
    ws.id = uuidv4();
    const params = new URLSearchParams(req.url.replace('/?', ''));
    let playerId = params.get('playerId') || ws.id;
    let currentRoomPin = null;
    let currentPlayerData = null;
    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } catch(e) { console.error('JSON parse error', e); return; }
        // console.log(`[WS ${ws.id}] msg:`, data.type, data.pin);

        switch(data.type) {
            case 'create_room':
            case 'join_room':
            case 'rejoin_room': {
                const { pin, player } = data;
                currentRoomPin = pin;
                player.id = player.id || playerId;
                playerId = player.id;

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
                    socket: ws
                };

                if (data.type === 'create_room') {
                    if (rooms[pin]) { ws.send(JSON.stringify({ type: 'error', message: 'Sala ya existe.' })); return; }
                    rooms[pin] = {
                        pin,
                        players: [],
                        hostId: player.id,
                        votes: {},
                        voteTimer: null,
                        voteTimeRemaining: 30,
                        isVotingActive: false,
                        gameMode: null,
                        closestAnswerMode: false,
                        questionIndex: 0,
                        totalQuestions: 10,
                        finalRanking: [],
                        isGameRunning: false,
                        questions: [],
                        answersThisRound: {},
                        roundTimer: null,
                        currentQuestion: null,
                        timerDuration: 30,
                        revealPhaseDuration: 3000,
                        // propiedades nuevas para torneo
                        isFinalistTournament: false,
                        finalistCount: 3,
                        finalistVotes: {}, // conteo de votos con checkbox
                        tournamentStarted: false,
                        tournamentStage: null,
                        finalists: null,
                        tournamentQuestions: [],
                        tournamentQuestionIndex: 0,
                        tournamentAnswersThisRound: {},
                        tournamentRoundTimer: null,
                        tournamentTimerDuration: 20,
                        ultimateWinner: null
                    };
                    console.log(`[Sala ${pin}] creada por ${player.name}`);
                }

                const room = rooms[pin];
                if (!room) { ws.send(JSON.stringify({ type:'error', message:'Sala no existe.' })); return; }

                // si el jugador ya existía (reconexión) actualizar socket
                const existing = room.players.findIndex(p => p.id === player.id);
                if (existing !== -1) {
                    room.players[existing].socket = ws;
                    Object.assign(room.players[existing], currentPlayerData);
                } else {
                    room.players.push(currentPlayerData);
                }

                const isCurrentWsHost = room.hostId === player.id;

                // enviar estado de sala al cliente que se unió
                ws.send(JSON.stringify({
                    type: 'room_joined',
                    pin: room.pin,
                    players: room.players.map(p => ({ id:p.id, name:p.name, avatar:p.avatar, isProfessor:p.isProfessor, isReady:p.isReady, points:p.points, streak:p.streak, maxStreak:p.maxStreak })),
                    isHost: isCurrentWsHost,
                    gameMode: room.gameMode,
                    closestAnswerMode: room.closestAnswerMode,
                    isGameRunning: room.isGameRunning,
                    isVotingActive: room.isVotingActive,
                    voteTimeRemaining: room.voteTimeRemaining,
                    currentVotes: room.votes,
                    questionIndex: room.questionIndex,
                    totalQuestions: room.totalQuestions,
                    question: room.isGameRunning && room.currentQuestion ? { pregunta: room.currentQuestion.pregunta, imagen: room.currentQuestion.imagen, tipo: room.currentQuestion.tipo, opciones: room.currentQuestion.opciones } : undefined,
                    timerDuration: room.isGameRunning ? room.timerDuration : undefined
                }));

                // notificar a los demás jugadores
                room.players.forEach(p => {
                    if (p.socket !== ws && p.socket.readyState === WebSocket.OPEN) {
                        p.socket.send(JSON.stringify({ type: 'player_joined', player: { id: currentPlayerData.id, name: currentPlayerData.name, avatar: currentPlayerData.avatar, isProfessor: currentPlayerData.isProfessor, isReady: currentPlayerData.isReady } }));
                    }
                });

                break;
            }

            case 'initiate_vote': {
                const room = rooms[data.pin];
                if (!room || room.hostId !== data.hostId || room.isVotingActive) {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type:'error', message:'No puedes iniciar votación.' }));
                    return;
                }
                room.isVotingActive = true;
                room.voteTimeRemaining = 30;
                room.votes = {};
                room.finalistVotes = {};
                room.players.forEach(p => p.hasVoted = false);

                clearInterval(room.voteTimer);
                room.voteTimer = setInterval(() => {
                    room.voteTimeRemaining--;
                    broadcast(data.pin, { type: 'update_vote_timer', time: room.voteTimeRemaining });

                    if (room.voteTimeRemaining <= 0) {
                        clearInterval(room.voteTimer);
                        room.voteTimer = null;
                        room.isVotingActive = false;

                        // elegir modo ganador
                        let maxVotes = 0; let selectedMode = 'operaciones';
                        const modesWithVotes = Object.entries(room.votes).filter(([,c]) => c>0);
                        if (modesWithVotes.length>0) {
                            modesWithVotes.forEach(([m,v]) => { if (v>maxVotes) { maxVotes=v; selectedMode=m; } });
                            const tied = modesWithVotes.filter(([,v])=>v===maxVotes).map(([m])=>m);
                            selectedMode = tied[Math.floor(Math.random()*tied.length)];
                        }
                        room.gameMode = selectedMode;
                        room.closestAnswerMode = (selectedMode === 'mas-cercano');

                        // decidir si se activa la fase de finalistas según votos con checkbox
                        const totalPlayers = room.players.length || 1;
                        let totalFinalistChecks = 0;
                        Object.values(room.finalistVotes || {}).forEach(v=> totalFinalistChecks += v);
                        // criterio: al menos la mitad de jugadores marcaron la casilla -> activar torneo
                        room.isFinalistTournament = totalFinalistChecks >= Math.ceil(totalPlayers/2);

                        // generar preguntas para la partida normal
                        room.questions = generarPreguntas(room.gameMode, room.totalQuestions);
                        room.questionIndex = 0;

                        broadcast(data.pin, { type: 'game_starting', mode: room.gameMode, finalistMode: room.isFinalistTournament });

                        setTimeout(() => {
                            room.isGameRunning = true;
                            broadcast(data.pin, { type: 'game_start', mode: room.gameMode, closestAnswerMode: room.closestAnswerMode, finalistMode: room.isFinalistTournament });
                            startNextQuestion(room);
                        }, 1500);
                    }
                }, 1000);

                broadcast(data.pin, { type: 'start_voting', time: room.voteTimeRemaining });
                break;
            }

            case 'cast_vote': {
                const room = rooms[data.pin];
                if (!room || !room.isVotingActive) return;
                const voter = room.players.find(p=>p.id===data.playerId);
                if (voter && !voter.hasVoted) {
                    room.votes[data.mode] = (room.votes[data.mode] || 0) + 1;
                    // registrar si el votante marcó la casilla finalistMode
                    if (data.finalistMode) {
                        room.finalistVotes[data.mode] = (room.finalistVotes[data.mode] || 0) + 1;
                    }
                    voter.hasVoted = true;
                    broadcast(data.pin, { type: 'vote_update', votes: room.votes, finalistVotes: room.finalistVotes });
                }
                break;
            }

            case 'submit_answer': {
                const room = rooms[data.pin];
                if (!room) { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'error', message:'Sala no existe' })); return; }

                // si torneo en curso y jugador es finalista -> guardar en tournamentAnswersThisRound
                const isTournamentActive = room.tournamentStarted && room.tournamentStage;
                const isPlayerFinalist = room.finalists && room.finalists.some(f=>f.id===data.playerId);

                if (isTournamentActive && isPlayerFinalist) {
                    if (!room.tournamentAnswersThisRound) room.tournamentAnswersThisRound = {};
                    // evitar respuestas dobles
                    if (room.tournamentAnswersThisRound[data.playerId]) {
                        if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'error', message:'Ya respondiste esta pregunta (torneo).' }));
                        return;
                    }
                    room.tournamentAnswersThisRound[data.playerId] = { answer: data.answer, responseTime: data.responseTime || 0 };
                    // check si todos los finalistas respondieron -> revelar
                    const allAnswered = room.finalists.every(f => room.tournamentAnswersThisRound[f.id] !== undefined);
                    if (allAnswered) {
                        clearTimeout(room.tournamentRoundTimer);
                        sendRevealPhase(room, true);
                    } else {
                        // opcional: notificar cuantos han respondido (para UI)
                        const answeredCount = Object.keys(room.tournamentAnswersThisRound).length;
                        broadcastToFinalists(data.pin, { type: 'tournament_progress', answered: answeredCount, total: room.finalists.length });
                        broadcastToSpectators(data.pin, { type: 'spectator_tournament_progress', answered: answeredCount, total: room.finalists.length });
                    }
                } else {
                    // Ronda normal
                    if (!room.isGameRunning) { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'error', message:'Juego no activo' })); return; }
                    if (!room.answersThisRound) room.answersThisRound = {};
                    if (room.answersThisRound[data.playerId]) { if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'error', message:'Ya respondiste esta pregunta.' })); return; }
                    room.answersThisRound[data.playerId] = { answer: data.answer, responseTime: data.responseTime || 0 };
                    if (ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({ type:'answer_received', message:'Respuesta recibida!' }));
                    // verificar si todos (no profesores) respondieron
                    const activePlayers = room.players.filter(p => !p.isProfessor);
                    const allActiveAnswered = activePlayers.every(p => room.answersThisRound[p.id] !== undefined);
                    if (allActiveAnswered) {
                        clearTimeout(room.roundTimer);
                        sendRevealPhase(room, false);
                    }
                }
                break;
            }

            case 'send_emoji': {
                const room = rooms[data.pin];
                if (!room) return;
                // reenviar emoji a todos (incluye espectador y jugadores)
                broadcast(data.pin, { type: 'emoji_relay', from: data.from || 'anon', emoji: data.emoji });
                break;
            }

            case 'player_ready_update': {
                const room = rooms[data.pin];
                if (!room) return;
                const player = room.players.find(p => p.id === data.playerId);
                if (player) {
                    player.isReady = data.isReady;
                    broadcast(data.pin, { type: 'player_ready_update', playerId: data.playerId, isReady: data.isReady });
                }
                break;
            }

            case 'ping': {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
                break;
            }

            default:
                console.warn(`[WS ${ws.id}] Mensaje no reconocido:`, data.type);
        }
    });

    ws.on('close', () => {
        clearInterval(ws.pingInterval);
        if (currentRoomPin && rooms[currentRoomPin]) {
            const room = rooms[currentRoomPin];
            const leaving = room.players.find(p => p.socket === ws);
            if (leaving) {
                room.players = room.players.filter(p => p.id !== leaving.id);
                broadcast(currentRoomPin, { type: 'player_left', playerId: leaving.id });
                if (room.players.length === 0) {
                    clearTimeout(room.roundTimer);
                    clearInterval(room.voteTimer);
                    delete rooms[currentRoomPin];
                    console.log(`[Sala ${currentRoomPin}] eliminada (vacía)`);
                } else {
                    if (room.hostId === leaving.id) {
                        const newHost = room.players[0];
                        if (newHost) {
                            room.hostId = newHost.id;
                            newHost.isProfessor = true;
                            broadcast(currentRoomPin, { type:'new_host', newHostId: room.hostId, newHostName: newHost.name });
                        }
                    }
                }
            }
        }
    });

    // heartbeat
    ws.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.CLOSED) { clearInterval(ws.pingInterval); return; }
        if (!isAlive) { console.warn(`[WS ${ws.id}] no pong, terminate`); ws.terminate(); return; }
        isAlive = false;
        ws.ping();
    }, 30000);
});

/* -----------------------
   Servir archivo estático y arrancar servidor
   ----------------------- */
app.get('/', (req, res) => {
    // si tu HTML se llama distinto, ajusta aquí
    res.sendFile(__dirname + '/index.html');
});

server.listen(PORT, () => {
    console.log(`Servidor WebSocket corriendo en puerto ${PORT}`);
});
