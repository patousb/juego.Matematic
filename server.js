// server.js - VERSIÓN COMPLETA CORREGIDA
// Servidor WebSocket para Math Challenge PRO con sistema de dificultad progresiva
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const rooms = {};

/* ======================
   SISTEMA DE PREGUNTAS POR DIFICULTAD
   ====================== */

// PREGUNTAS FÁCILES (Partida normal)
const preguntasFaciles = {
    informatica: [
        { pregunta: "¿Cuál de estos es un navegador de internet?", opciones: { A: "Microsoft Word", B: "Google Chrome", C: "WhatsApp", D: "Photoshop" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Cuál de estos es un emoji?", opciones: { A: "@", B: "#", C: "😂", D: "/" }, respuesta: "C", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Qué red social es conocida por compartir fotos y videos cortos?", opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Qué icono es el de 'guardar' en muchos programas?", opciones: { A: "Una carpeta", B: "Un disquete (💾)", C: "Una nube", D: "Una lupa" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Qué puedes hacer con un 'USB'?", opciones: { A: "Guardar fotos o documentos", B: "Hacer llamadas", C: "Navegar en internet", D: "Jugar videojuegos" }, respuesta: "A", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Qué app te permite hacer videollamadas gratis?", opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" }, respuesta: "B", tipo: "informatica", dificultad: "facil" },
        { pregunta: "¿Cuál es la red social con más usuarios activos?", opciones: { A: "TikTok", B: "Instagram", C: "Facebook", D: "Twitter/X" }, respuesta: "C", tipo: "informatica", dificultad: "facil" }
    ],
    operaciones: [
        { pregunta: "5 + 3 = ?", respuesta: 8, tipo: "operacion", dificultad: "facil" },
        { pregunta: "10 - 4 = ?", respuesta: 6, tipo: "operacion", dificultad: "facil" },
        { pregunta: "2 × 6 = ?", respuesta: 12, tipo: "operacion", dificultad: "facil" },
        { pregunta: "15 ÷ 3 = ?", respuesta: 5, tipo: "operacion", dificultad: "facil" },
        { pregunta: "7 + 8 = ?", respuesta: 15, tipo: "operacion", dificultad: "facil" },
        { pregunta: "12 - 5 = ?", respuesta: 7, tipo: "operacion", dificultad: "facil" },
        { pregunta: "3 × 4 = ?", respuesta: 12, tipo: "operacion", dificultad: "facil" },
        { pregunta: "20 ÷ 5 = ?", respuesta: 4, tipo: "operacion", dificultad: "facil" }
    ],
    "verdadero-falso": [
        { pregunta: "¿Es correcto que 5 + 3 = 8?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "5 + 3 sí es igual a 8." },
        { pregunta: "¿Es correcto que 10 - 4 = 5?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "10 - 4 es 6, no 5." },
        { pregunta: "¿Es correcto que 2 × 6 = 12?", respuesta: true, tipo: "verdadero-falso", dificultad: "facil", explicacion: "2 × 6 sí es igual a 12." },
        { pregunta: "¿Es correcto que 15 ÷ 3 = 6?", respuesta: false, tipo: "verdadero-falso", dificultad: "facil", explicacion: "15 ÷ 3 es 5, no 6." }
    ]
};

// PREGUNTAS INTERMEDIAS (Semifinales)
const preguntasIntermedias = {
    informatica: [
        { pregunta: "¿Qué significa 'CPU' en informática?", opciones: { A: "Computadora Personal Útil", B: "Unidad Central de Procesamiento", C: "Controlador Principal de Usuario", D: "Centro de Procesos Unidos" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
        { pregunta: "¿Qué es un 'firewall'?", opciones: { A: "Un juego de video", B: "Un sistema de seguridad para redes", C: "Un tipo de pantalla", D: "Un programa de edición" }, respuesta: "B", tipo: "informatica", dificultad: "intermedia" },
        { pregunta: "¿Qué lenguaje de programación se usa principalmente para páginas web?", opciones: { A: "Python", B: "Java", C: "JavaScript", D: "C++" }, respuesta: "C", tipo: "informatica", dificultad: "intermedia" },
        { pregunta: "¿Qué significa 'HTML'?", opciones: { A: "HyperText Markup Language", B: "High Tech Modern Language", C: "Home Tool Management Language", D: "Hyper Transfer Media Link" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
        { pregunta: "¿Qué es un 'router'?", opciones: { A: "Un dispositivo para conectar redes", B: "Un tipo de teclado", C: "Un programa de música", D: "Una aplicación de mensajería" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" },
        { pregunta: "¿Qué significa 'Wi-Fi'?", opciones: { A: "Wireless Fidelity", B: "Wired Fiber", C: "Windows Firewall", D: "Web Interface" }, respuesta: "A", tipo: "informatica", dificultad: "intermedia" }
    ],
    operaciones: [
        { pregunta: "25 × 4 = ?", respuesta: 100, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "144 ÷ 12 = ?", respuesta: 12, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "15 + 28 = ?", respuesta: 43, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "65 - 29 = ?", respuesta: 36, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "8 × 7 + 5 = ?", respuesta: 61, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "100 ÷ 4 × 3 = ?", respuesta: 75, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "17 + 25 - 8 = ?", respuesta: 34, tipo: "operacion", dificultad: "intermedia" },
        { pregunta: "9 × 6 ÷ 3 = ?", respuesta: 18, tipo: "operacion", dificultad: "intermedia" }
    ],
    "verdadero-falso": [
        { pregunta: "¿Es correcto que (5 + 3) × 2 = 16?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "(5+3)=8, 8×2=16. Correcto." },
        { pregunta: "¿Es correcto que 15 × 3 = 40?", respuesta: false, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "15 × 3 = 45, no 40." },
        { pregunta: "¿Es correcto que 125 ÷ 5 = 25?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "125 ÷ 5 sí es igual a 25." },
        { pregunta: "¿Es correcto que 7² = 49?", respuesta: true, tipo: "verdadero-falso", dificultad: "intermedia", explicacion: "7 × 7 = 49. Correcto." }
    ]
};

// PREGUNTAS DIFÍCILES (Finales)
const preguntasDificiles = {
    informatica: [
        { pregunta: "¿Qué protocolo se utiliza para enviar correos electrónicos?", opciones: { A: "HTTP", B: "FTP", C: "SMTP", D: "TCP" }, respuesta: "C", tipo: "informatica", dificultad: "dificil" },
        { pregunta: "¿Qué es la 'inteligencia artificial'?", opciones: { A: "Robots que parecen humanos", B: "Sistemas que imitan la inteligencia humana", C: "Computadoras muy rápidas", D: "Programas de videojuegos" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
        { pregunta: "¿Qué significa 'URL'?", opciones: { A: "Uniform Resource Locator", B: "Universal Reference Link", C: "User Resource Location", D: "Uniform Reference Locator" }, respuesta: "A", tipo: "informatica", dificultad: "dificil" },
        { pregunta: "¿Qué es un 'algoritmo'?", opciones: { A: "Un tipo de computadora", B: "Un conjunto de pasos para resolver un problema", C: "Un lenguaje de programación", D: "Un dispositivo de almacenamiento" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
        { pregunta: "¿Qué hace un 'compilador'?", opciones: { A: "Ejecuta programas", B: "Convierte código fuente a código máquina", C: "Diseña interfaces", D: "Administra bases de datos" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" },
        { pregunta: "¿Qué es la 'nube' en informática?", opciones: { A: "Un tipo de clima", B: "Servidores remotos que almacenan datos", C: "Un programa antivirus", D: "Un dispositivo de red" }, respuesta: "B", tipo: "informatica", dificultad: "dificil" }
    ],
    operaciones: [
        { pregunta: "125 ÷ 5 × 4 = ?", respuesta: 100, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "(15 + 7) × 3 - 10 = ?", respuesta: 56, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "√144 + 5² = ?", respuesta: 17, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "3³ + 4² - 10 = ?", respuesta: 33, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "100 ÷ (5 × 2) + 15 = ?", respuesta: 25, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "(8 × 3) + (12 ÷ 4) × 5 = ?", respuesta: 39, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "7² - 3³ + 10 ÷ 2 = ?", respuesta: 29, tipo: "operacion", dificultad: "dificil" },
        { pregunta: "(20 - 8) × 3 + 15 ÷ 3 = ?", respuesta: 41, tipo: "operacion", dificultad: "dificil" }
    ],
    "verdadero-falso": [
        { pregunta: "¿Es correcto que (3³ - 2⁴) × 2 = 10?", respuesta: false, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "3³=27, 2⁴=16, 27-16=11, 11×2=22, no 10." },
        { pregunta: "¿Es correcto que √64 + 3² = 17?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "√64=8, 3²=9, 8+9=17. Correcto." },
        { pregunta: "¿Es correcto que (5 × 4)² ÷ 10 = 10?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "5×4=20, 20²=400, 400÷10=40, no 10." },
        { pregunta: "¿Es correcto que 2⁵ - 3³ = 5?", respuesta: true, tipo: "verdadero-falso", dificultad: "dificil", explicacion: "2⁵=32, 3³=27, 32-27=5. Correcto." }
    ]
};

// GENERADOR DINÁMICO DE PREGUNTAS
function generarPreguntas(mode, count, dificultad = 'facil') {
    let bancoPreguntas;
    
    switch(dificultad) {
        case 'intermedia':
            bancoPreguntas = preguntasIntermedias[mode] || preguntasIntermedias['operaciones'];
            break;
        case 'dificil':
            bancoPreguntas = preguntasDificiles[mode] || preguntasDificiles['operaciones'];
            break;
        default:
            bancoPreguntas = preguntasFaciles[mode] || preguntasFaciles['operaciones'];
    }
    
    if (!bancoPreguntas || bancoPreguntas.length === 0) {
        console.warn(`No hay preguntas para modo: ${mode}, dificultad: ${dificultad}`);
        bancoPreguntas = dificultad === 'dificil' ? preguntasDificiles['operaciones'] : 
                        dificultad === 'intermedia' ? preguntasIntermedias['operaciones'] : 
                        preguntasFaciles['operaciones'];
    }
    
    const shuffled = [...bancoPreguntas].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Generadores para modos específicos (compatibilidad)
function generarOperacion() {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operadores = ['+', '-', '*', '/'];
    const op = operadores[Math.floor(Math.random() * operadores.length)];
    let pregunta, respuesta;

    if (op === '/') {
        const divisor = Math.floor(Math.random() * 10) + 2;
        const cociente = Math.floor(Math.random() * 10) + 1;
        const dividendo = divisor * cociente;
        pregunta = `${dividendo} ÷ ${divisor} = ?`;
        respuesta = cociente;
    } else {
        switch(op) {
            case '+': pregunta = `${num1} + ${num2} = ?`; respuesta = num1 + num2; break;
            case '-': 
                if (num1 < num2) [num1, num2] = [num2, num1];
                pregunta = `${num1} - ${num2} = ?`; respuesta = num1 - num2; break;
            case '*': pregunta = `${num1} × ${num2} = ?`; respuesta = num1 * num2; break;
        }
    }
    return { pregunta, respuesta, tipo: 'operacion', dificultad: 'facil' };
}

function generarVerdaderoFalso() {
    const num1 = Math.floor(Math.random() * 15) + 1;
    const num2 = Math.floor(Math.random() * 15) + 1;
    const operadores = ['+', '-', '*', '/'];
    const operador = operadores[Math.floor(Math.random() * operadores.length)];
    let operacionTexto, resultadoReal;
    
    switch(operador) {
        case '+': resultadoReal = num1 + num2; operacionTexto = `${num1} + ${num2}`; break;
        case '-': resultadoReal = num1 - num2; operacionTexto = `${num1} - ${num2}`; break;
        case '*': resultadoReal = num1 * num2; operacionTexto = `${num1} × ${num2}`; break;
        case '/': 
            const divisor = Math.floor(Math.random() * 8) + 2;
            const cociente = Math.floor(Math.random() * 10) + 1;
            const dividendo = divisor * cociente;
            resultadoReal = cociente;
            operacionTexto = `${dividendo} ÷ ${divisor}`;
            break;
    }
    
    const esCorrecta = Math.random() < 0.6;
    let resultadoMostrado = resultadoReal;
    if (!esCorrecta) {
        resultadoMostrado += (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
    }
    
    return { 
        pregunta: `¿Es correcta esta operación?<br>${operacionTexto} = ${resultadoMostrado}`, 
        respuesta: esCorrecta, 
        tipo: 'verdadero-falso',
        explicacion: esCorrecta ? "La operación es correcta." : `La operación es incorrecta. La respuesta correcta era ${resultadoReal}.`,
        dificultad: 'facil'
    };
}

/* ======================
   FUNCIONES DE BROADCAST
   ====================== */

function broadcast(pin, data) {
    const room = rooms[pin];
    if (!room) return;
    room.players.forEach(p => {
        if (p.socket && p.socket.readyState === WebSocket.OPEN) {
            try {
                p.socket.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[Broadcast Error] ${p.id}:`, e);
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

/* ======================
   LÓGICA DEL JUEGO
   ====================== */

function computeFinalRanking(room) {
    if (!room) return [];
    const sorted = [...room.players].sort((a,b) => {
        if ((b.points||0) !== (a.points||0)) return (b.points||0) - (a.points||0);
        const avgA = typeof a.avgResponseTime === 'number' && !isNaN(a.avgResponseTime) ? a.avgResponseTime : Infinity;
        const avgB = typeof b.avgResponseTime === 'number' && !isNaN(b.avgResponseTime) ? b.avgResponseTime : Infinity;
        if (avgA !== avgB) return avgA - avgB;
        return (b.maxStreak||0) - (a.maxStreak||0);
    }).map(p => ({ 
        id: p.id, 
        name: p.name, 
        avatar: p.avatar, 
        points: p.points, 
        streak: p.streak, 
        maxStreak: p.maxStreak,
        avgResponseTime: p.avgResponseTime || 0 
    }));
    return sorted;
}

function sendRevealPhase(room, isTournament = false) {
    if (!room) return;
    
    const questionObj = isTournament ? 
        room.tournamentQuestions[room.tournamentQuestionIndex] : 
        room.currentQuestion;
    
    if (!questionObj) {
        console.warn('No hay pregunta para revelar');
        return;
    }

    const correctAnswer = questionObj.respuesta;
    const basePoints = isTournament ? 10 : 5;
    const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
    const participants = isTournament ? room.finalists : room.players;
    const roundDuration = isTournament ? (room.tournamentTimerDuration || 20) : (room.timerDuration || 30);

    participants.forEach(player => {
        const ansData = answersMap[player.id];
        let pointsEarned = 0;
        let streakBonus = 0;
        let isCorrect = false;

        if (ansData && ansData.answer !== null && ansData.answer !== undefined) {
            const timeTaken = ansData.responseTime || 0;
            const timeLeft = Math.max(0, roundDuration - timeTaken);
            const timeBonus = Math.floor(timeLeft / (isTournament ? 2 : 3));

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
                if (!player.maxStreak || player.streak > player.maxStreak) {
                    player.maxStreak = player.streak;
                }

                // Bonus por racha más generoso en torneo
                if (player.streak >= 7) streakBonus = isTournament ? 12 : 8;
                else if (player.streak >= 5) streakBonus = isTournament ? 8 : 5;
                else if (player.streak >= 3) streakBonus = isTournament ? 4 : 2;

                pointsEarned = basePoints + timeBonus + streakBonus;
                
                // Usar puntos específicos del torneo o generales
                if (isTournament) {
                    if (room.tournamentStage === 'semifinal') {
                        player.semifinalPoints = (player.semifinalPoints || 0) + pointsEarned;
                    } else if (room.tournamentStage === 'final') {
                        player.finalPoints = (player.finalPoints || 0) + pointsEarned;
                    }
                } else {
                    player.points = (player.points || 0) + pointsEarned;
                }
                
                // Actualizar tiempo promedio
                if (timeTaken > 0) {
                    if (!player.responseTimes) player.responseTimes = [];
                    player.responseTimes.push(timeTaken);
                    player.avgResponseTime = player.responseTimes.reduce((a, b) => a + b, 0) / player.responseTimes.length;
                }
            } else {
                player.streak = 0;
            }
        } else {
            player.streak = 0;
        }

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

    setTimeout(() => {
        const ranking = computeFinalRanking(room);
        broadcast(room.pin, { type: 'ranking_update', players: ranking });

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
        }, room.revealPhaseDuration || 3000);
    }, 800);
}

function startNextQuestion(room) {
    if (!room || !room.isGameRunning) return;
    if (!room.questions || room.questionIndex >= room.questions.length) {
        endGame(room.pin);
        return;
    }

    room.answersThisRound = {};
    room.currentQuestion = room.questions[room.questionIndex];

    let timerDuration = 30;
    if (room.gameMode === 'relampago') timerDuration = 8;
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

/* ======================
   SISTEMA DE TORNEO CORREGIDO
   ====================== */

function startSemifinals(pin) {
    const room = rooms[pin];
    if (!room) return;
    
    room.tournamentStarted = true;
    room.tournamentStage = 'semifinal';

    // Seleccionar 4 finalistas
    const finalRanking = computeFinalRanking(room);
    const finalists = finalRanking.slice(0, 4);
    room.finalists = room.players.filter(p => finalists.some(f => f.id === p.id));
    
    // Preguntas INTERMEDIAS para semifinales
    room.tournamentQuestions = generarPreguntas(room.gameMode, 5, 'intermedia');
    room.tournamentQuestionIndex = 0;
    room.tournamentAnswersThisRound = {};
    room.tournamentTimerDuration = 25;

    console.log(`[Torneo ${pin}] Semifinales iniciadas con 4 finalistas y preguntas INTERMEDIAS`);

    // Notificar a todos
    broadcast(pin, { 
        type: 'start_semifinals', 
        finalists: room.finalists.map(f => ({ 
            id: f.id, 
            name: f.name, 
            points: f.semifinalPoints || 0, 
            avatar: f.avatar 
        })) 
    });

    // Enviar espectadores al modo espectador
    const spectatorIds = room.players.filter(p => !room.finalists.some(f => f.id === p.id)).map(p => p.id);
    if (spectatorIds.length > 0) {
        broadcastToIds(pin, spectatorIds, { 
            type: 'enter_spectator_mode', 
            finalists: room.finalists.map(f => ({ 
                id: f.id, 
                name: f.name, 
                points: f.semifinalPoints || 0 
            })) 
        });
    }

    setTimeout(() => {
        startNextTournamentQuestion(room);
    }, 4000);
}

function startNextTournamentQuestion(room) {
    if (!room || !room.finalists || room.finalists.length === 0) return;
    
    room.tournamentAnswersThisRound = {};
    const q = room.tournamentQuestions[room.tournamentQuestionIndex];
    if (!q) {
        console.error(`[Torneo ${room.pin}] No hay pregunta en índice ${room.tournamentQuestionIndex}`);
        return;
    }
    
    const qForClients = { ...q };
    delete qForClients.respuesta;
    delete qForClients.explicacion;

    console.log(`[Torneo ${room.pin}] Enviando pregunta ${room.tournamentQuestionIndex + 1}/5 (${room.tournamentStage})`);

    // Para finalistas
    broadcastToFinalists(room.pin, {
        type: 'tournament_question_update',
        question: qForClients,
        questionIndex: room.tournamentQuestionIndex,
        totalQuestions: room.tournamentQuestions.length,
        timerDuration: room.tournamentTimerDuration
    });

    // Para espectadores
    broadcastToSpectators(room.pin, {
        type: 'spectator_update',
        finalists: room.finalists.map(f => ({ 
            id: f.id, 
            name: f.name, 
            points: room.tournamentStage === 'semifinal' ? (f.semifinalPoints || 0) : (f.finalPoints || 0)
        })),
        question: { pregunta: qForClients.pregunta, tipo: qForClients.tipo },
        questionIndex: room.tournamentQuestionIndex,
        totalQuestions: room.tournamentQuestions.length,
        round: room.tournamentStage
    });

    clearTimeout(room.tournamentRoundTimer);
    room.tournamentRoundTimer = setTimeout(() => {
        console.log(`[Torneo ${room.pin}] Tiempo agotado para pregunta ${room.tournamentQuestionIndex + 1}`);
        sendRevealPhase(room, true);
    }, room.tournamentTimerDuration * 1000);
}

function concludeSemifinals(pin) {
    const room = rooms[pin];
    if (!room) return;
    
    // Ordenar por puntos de semifinales y tomar top 2
    const sortedFinalists = [...room.finalists].sort((a, b) => (b.semifinalPoints || 0) - (a.semifinalPoints || 0));
    const top2 = sortedFinalists.slice(0, 2);
    room.finalists = top2;
    
    // Reiniciar para la final
    room.finalists.forEach(f => { 
        f.finalPoints = 0;
        f.streak = 0;
    });

    room.tournamentStage = 'final';
    
    // Preguntas DIFÍCILES para la final
    room.tournamentQuestions = generarPreguntas(room.gameMode, 5, 'dificil');
    room.tournamentQuestionIndex = 0;
    room.tournamentAnswersThisRound = {};
    room.tournamentTimerDuration = 20;

    console.log(`[Torneo ${pin}] Final iniciada con 2 finalistas y preguntas DIFÍCILES`);

    broadcast(pin, { 
        type: 'start_final', 
        finalists: room.finalists.map(f => ({ 
            id: f.id, 
            name: f.name, 
            points: f.finalPoints || 0, 
            avatar: f.avatar 
        })) 
    });

    broadcastToSpectators(pin, { 
        type: 'spectator_update', 
        finalists: room.finalists.map(f => ({ 
            id: f.id, 
            name: f.name, 
            points: f.finalPoints || 0 
        })),
        round: 'final'
    });

    setTimeout(() => {
        startNextTournamentQuestion(room);
    }, 4000);
}

function concludeFinal(pin) {
    const room = rooms[pin];
    if (!room) return;
    
    // Determinar campeón
    const sorted = [...room.finalists].sort((a, b) => (b.finalPoints || 0) - (a.finalPoints || 0));
    const winner = sorted[0];
    
    // Bonus por ganar el torneo
    winner.points = (winner.points || 0) + 100;
    
    room.ultimateWinner = { 
        id: winner.id, 
        name: winner.name, 
        avatar: winner.avatar, 
        points: winner.points,
        finalPoints: winner.finalPoints || 0
    };

    console.log(`[Torneo ${pin}] ¡Campeón absoluto: ${winner.name} con ${winner.finalPoints} puntos en la final!`);

    broadcast(pin, { type: 'ultimate_winner', winner: room.ultimateWinner });

    // Limpiar estado del torneo
    room.tournamentStage = null;
    room.tournamentStarted = false;
    room.isFinalistTournament = false;
    room.finalRanking = computeFinalRanking(room);

    clearTimeout(room.tournamentRoundTimer);
    room.tournamentRoundTimer = null;
}

function endGame(pin) {
    const room = rooms[pin];
    if (!room) return;

    // Limpiar todos los timers
    clearTimeout(room.roundTimer);
    clearInterval(room.voteTimer);
    clearTimeout(room.tournamentRoundTimer);

    room.isGameRunning = false;

    // Iniciar torneo si está activado
    if (room.isFinalistTournament && !room.tournamentStarted) {
        console.log(`[Sala ${pin}] Iniciando torneo después de partida normal`);
        startSemifinals(pin);
        return;
    }

    // Enviar resultados finales
    room.finalRanking = computeFinalRanking(room);
    broadcast(pin, { type: 'game_over', finalRanking: room.finalRanking });
}

/* ======================
   WEBSOCKET HANDLING
   ====================== */

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
        try { 
            data = JSON.parse(message); 
        } catch(e) { 
            console.error('JSON parse error', e); 
            return; 
        }

        console.log(`[WS ${ws.id}] ${data.type} para sala ${data.pin}`);

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
                    responseTimes: player.responseTimes || [],
                    hasVoted: false,
                    socket: ws
                };

                if (data.type === 'create_room') {
                    if (rooms[pin]) { 
                        ws.send(JSON.stringify({ type: 'error', message: 'Sala ya existe.' })); 
                        return; 
                    }
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
                        // Torneo
                        isFinalistTournament: false,
                        finalistCount: 4,
                        finalistVotes: {},
                        tournamentStarted: false,
                        tournamentStage: null,
                        finalists: null,
                        tournamentQuestions: [],
                        tournamentQuestionIndex: 0,
                        tournamentAnswersThisRound: {},
                        tournamentRoundTimer: null,
                        tournamentTimerDuration: 25,
                        ultimateWinner: null
                    };
                    console.log(`[Sala ${pin}] Creada por ${player.name}`);
                }

                const room = rooms[pin];
                if (!room) { 
                    ws.send(JSON.stringify({ type:'error', message:'Sala no existe.' })); 
                    return; 
                }

                // Manejar reconexión
                const existingIndex = room.players.findIndex(p => p.id === player.id);
                if (existingIndex !== -1) {
                    room.players[existingIndex].socket = ws;
                    room.players[existingIndex].isReady = currentPlayerData.isReady;
                    currentPlayerData = room.players[existingIndex];
                } else {
                    room.players.push(currentPlayerData);
                }

                const isCurrentWsHost = room.hostId === player.id;

                // Enviar estado completo de la sala
                ws.send(JSON.stringify({
                    type: 'room_joined',
                    pin: room.pin,
                    players: room.players.map(p => ({ 
                        id: p.id, 
                        name: p.name, 
                        avatar: p.avatar, 
                        isProfessor: p.isProfessor, 
                        isReady: p.isReady, 
                        points: p.points, 
                        streak: p.streak, 
                        maxStreak: p.maxStreak,
                        avgResponseTime: p.avgResponseTime || 0
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
                    question: room.isGameRunning && room.currentQuestion ? { 
                        pregunta: room.currentQuestion.pregunta, 
                        imagen: room.currentQuestion.imagen, 
                        tipo: room.currentQuestion.tipo, 
                        opciones: room.currentQuestion.opciones 
                    } : undefined,
                    timerDuration: room.isGameRunning ? room.timerDuration : undefined,
                    tournamentStage: room.tournamentStage,
                    finalists: room.finalists ? room.finalists.map(f => ({
                        id: f.id,
                        name: f.name,
                        avatar: f.avatar,
                        points: room.tournamentStage === 'semifinal' ? (f.semifinalPoints || 0) : 
                               room.tournamentStage === 'final' ? (f.finalPoints || 0) : (f.points || 0)
                    })) : undefined
                }));

                // Notificar a otros jugadores
                room.players.forEach(p => {
                    if (p.socket !== ws && p.socket.readyState === WebSocket.OPEN) {
                        p.socket.send(JSON.stringify({ 
                            type: 'player_joined', 
                            player: { 
                                id: currentPlayerData.id, 
                                name: currentPlayerData.name, 
                                avatar: currentPlayerData.avatar, 
                                isProfessor: currentPlayerData.isProfessor, 
                                isReady: currentPlayerData.isReady 
                            } 
                        }));
                    }
                });
                break;
            }

            case 'initiate_vote': {
                const room = rooms[data.pin];
                if (!room || room.hostId !== data.hostId || room.isVotingActive) {
                    ws.send(JSON.stringify({ type:'error', message:'No puedes iniciar votación.' }));
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

                        // Elegir modo ganador
                        let maxVotes = 0;
                        let selectedMode = 'operaciones';
                        const modesWithVotes = Object.entries(room.votes).filter(([,c]) => c > 0);
                        
                        if (modesWithVotes.length > 0) {
                            modesWithVotes.forEach(([m,v]) => { 
                                if (v > maxVotes) { maxVotes = v; selectedMode = m; } 
                            });
                            const tied = modesWithVotes.filter(([,v]) => v === maxVotes).map(([m]) => m);
                            selectedMode = tied[Math.floor(Math.random() * tied.length)];
                        }
                        
                        room.gameMode = selectedMode;
                        room.closestAnswerMode = (selectedMode === 'mas-cercano');

                        // Generar preguntas FÁCILES para partida normal
                        room.questions = generarPreguntas(room.gameMode, room.totalQuestions, 'facil');
                        room.questionIndex = 0;

                        // Decidir si activar torneo
                        const totalVotes = Object.values(room.votes).reduce((a, b) => a + b, 0);
                        const totalFinalistChecks = Object.values(room.finalistVotes || {}).reduce((a, b) => a + b, 0);
                        room.isFinalistTournament = totalVotes > 0 && totalFinalistChecks >= Math.ceil(totalVotes / 3);

                        console.log(`[Sala ${data.pin}] Modo: ${selectedMode}, Torneo: ${room.isFinalistTournament}`);

                        broadcast(data.pin, { 
                            type: 'game_starting', 
                            mode: room.gameMode, 
                            isFinalistTournament: room.isFinalistTournament 
                        });

                        setTimeout(() => {
                            room.isGameRunning = true;
                            broadcast(data.pin, { 
                                type: 'game_start', 
                                mode: room.gameMode, 
                                closestAnswerMode: room.closestAnswerMode, 
                                isFinalistTournament: room.isFinalistTournament 
                            });
                            startNextQuestion(room);
                        }, 3000);
                    }
                }, 1000);

                broadcast(data.pin, { type: 'start_voting', time: room.voteTimeRemaining });
                break;
            }

            case 'cast_vote': {
                const room = rooms[data.pin];
                if (!room || !room.isVotingActive) return;
                
                const voter = room.players.find(p => p.id === data.playerId);
                if (voter && !voter.hasVoted) {
                    room.votes[data.mode] = (room.votes[data.mode] || 0) + 1;
                    if (data.finalistMode) {
                        room.finalistVotes[data.mode] = (room.finalistVotes[data.mode] || 0) + 1;
                    }
                    voter.hasVoted = true;
                    broadcast(data.pin, { 
                        type: 'vote_update', 
                        votes: room.votes, 
                        finalistVotes: room.finalistVotes 
                    });
                }
                break;
            }

            case 'submit_answer': {
                const room = rooms[data.pin];
                if (!room) { 
                    ws.send(JSON.stringify({ type:'error', message:'Sala no existe' })); 
                    return; 
                }

                const isTournamentActive = room.tournamentStarted && room.tournamentStage;
                const isPlayerFinalist = room.finalists && room.finalists.some(f => f.id === data.playerId);

                if (isTournamentActive) {
                    if (!isPlayerFinalist) return; // Espectador intentando responder
                    
                    if (!room.tournamentAnswersThisRound) room.tournamentAnswersThisRound = {};
                    
                    if (room.tournamentAnswersThisRound[data.playerId]) {
                        ws.send(JSON.stringify({ type:'error', message:'Ya respondiste esta pregunta del torneo.' }));
                        return;
                    }

                    room.tournamentAnswersThisRound[data.playerId] = { 
                        answer: data.answer, 
                        responseTime: data.responseTime || 0 
                    };

                    // Notificar progreso
                    const answeredCount = Object.keys(room.tournamentAnswersThisRound).length;
                    const totalFinalists = room.finalists.length;
                    
                    broadcastToFinalists(data.pin, { 
                        type: 'tournament_progress', 
                        answered: answeredCount, 
                        total: totalFinalists 
                    });

                    // Revelar si todos respondieron
                    if (answeredCount === totalFinalists) {
                        console.log(`[Torneo ${data.pin}] Todos respondieron, revelando...`);
                        clearTimeout(room.tournamentRoundTimer);
                        sendRevealPhase(room, true);
                    }

                } else {
                    // Ronda normal
                    if (!room.isGameRunning) { 
                        ws.send(JSON.stringify({ type:'error', message:'Juego no activo' }));
                        return; 
                    }

                    if (!room.answersThisRound) room.answersThisRound = {};
                    
                    if (room.answersThisRound[data.playerId]) { 
                        ws.send(JSON.stringify({ type:'error', message:'Ya respondiste esta pregunta.' }));
                        return; 
                    }

                    room.answersThisRound[data.playerId] = { 
                        answer: data.answer, 
                        responseTime: data.responseTime || 0 
                    };

                    ws.send(JSON.stringify({ type:'answer_received', message:'Respuesta recibida!' }));

                    // Revelar si todos respondieron
                    const activePlayers = room.players.filter(p => !p.isProfessor);
                    const allActiveAnswered = activePlayers.every(p => room.answersThisRound[p.id] !== undefined);
                    
                    if (allActiveAnswered) {
                        console.log(`[Sala ${data.pin}] Todos respondieron, revelando...`);
                        clearTimeout(room.roundTimer);
                        sendRevealPhase(room, false);
                    }
                }
                break;
            }

            case 'emoji_reaction': {
                const room = rooms[data.pin];
                if (!room) return;
                broadcast(data.pin, { 
                    type: 'emoji_broadcast', 
                    emoji: data.emoji,
                    from: data.playerId 
                });
                break;
            }

            case 'player_ready': {
                const room = rooms[data.pin];
                if (!room) return;
                const player = room.players.find(p => p.id === data.playerId);
                if (player) {
                    player.isReady = data.isReady;
                    broadcast(data.pin, { 
                        type: 'player_ready_update', 
                        playerId: data.playerId, 
                        isReady: data.isReady 
                    });
                }
                break;
            }

            case 'request_tournament_question': {
                const room = rooms[data.pin];
                if (!room || !room.tournamentStage) return;
                
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
                        timerDuration: room.tournamentTimerDuration
                    }));
                }
                break;
            }

            case 'skip_question': {
                const room = rooms[data.pin];
                if (!room || room.hostId !== data.hostId) return;
                
                broadcast(data.pin, { type: 'host_skipped_question' });
                
                if (room.tournamentStage) {
                    sendRevealPhase(room, true);
                } else {
                    sendRevealPhase(room, false);
                }
                break;
            }

            case 'ping': {
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            }

            default:
                console.warn(`Mensaje no reconocido: ${data.type}`);
        }
    });

    ws.on('close', () => {
        clearInterval(ws.pingInterval);
        if (currentRoomPin && rooms[currentRoomPin]) {
            const room = rooms[currentRoomPin];
            const leavingPlayer = room.players.find(p => p.socket === ws);
            
            if (leavingPlayer) {
                console.log(`[Sala ${currentRoomPin}] ${leavingPlayer.name} desconectado`);
                room.players = room.players.filter(p => p.id !== leavingPlayer.id);
                broadcast(currentRoomPin, { type: 'player_left', playerId: leavingPlayer.id });
                
                if (room.players.length === 0) {
                    clearTimeout(room.roundTimer);
                    clearInterval(room.voteTimer);
                    clearTimeout(room.tournamentRoundTimer);
                    delete rooms[currentRoomPin];
                    console.log(`[Sala ${currentRoomPin}] Eliminada (vacía)`);
                } else if (room.hostId === leavingPlayer.id) {
                    const newHost = room.players[0];
                    if (newHost) {
                        room.hostId = newHost.id;
                        newHost.isProfessor = true;
                        broadcast(currentRoomPin, { 
                            type: 'new_host', 
                            newHostId: room.hostId, 
                            newHostName: newHost.name 
                        });
                    }
                }
            }
        }
    });

    // Heartbeat
    ws.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.CLOSED) { 
            clearInterval(ws.pingInterval); 
            return; 
        }
        if (!isAlive) { 
            console.warn(`[WS ${ws.id}] Sin respuesta, cerrando`); 
            ws.terminate(); 
            return; 
        }
        isAlive = false;
        ws.ping();
    }, 30000);
});

/* ======================
   CONFIGURACIÓN DEL SERVIDOR
   ====================== */

app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

server.listen(PORT, () => {
    console.log(`🎮 Servidor Math Challenge PRO ejecutándose en puerto ${PORT}`);
    console.log(`🏆 Sistema de dificultad: FÁCIL → INTERMEDIO → DIFÍCIL`);
    console.log(`⚡ Modos disponibles: operaciones, informatica, verdadero-falso`);
    console.log(`🏅 Torneo: 4 semifinalistas → 2 finalistas → Campeón`);
});
