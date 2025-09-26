// Servidor WebSocket para Math Challenge PRO
// VERSIÓN ACTUALIZADA CON MODO TORNEO
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

const rooms = {};

// --- CONFIGURACIÓN DEL TORNEO ---
const SEMIFINALIST_COUNT = 3; // Cuántos jugadores pasan a la semifinal
const FINALIST_COUNT = 2;     // Cuántos jugadores de la semifinal pasan a la final
const SEMIFINAL_QUESTIONS_COUNT = 3;
const FINAL_QUESTIONS_COUNT = 3;


// --- FUNCIONES PARA GENERAR PREGUNTAS ---
function generarPreguntas(mode, count, isTournament = false) { // === MODIFICADO: Añadido isTournament ===
    const preguntas = [];
    
    const generarOperacion = (operator = null) => {
        const num1 = Math.floor(Math.random() * (isTournament ? 25 : 15)) + 1; 
        const num2 = Math.floor(Math.random() * (isTournament ? 25 : 15)) + 1;
        const operadores = ['+', '-', '*', '/'];
        let op = operator || operadores[Math.floor(Math.random() * operadores.length)];
        
        let pregunta, respuesta;
        
        if (op === '/') {
            let divisor = Math.floor(Math.random() * 8) + 2; 
            let cociente = Math.floor(Math.random() * (isTournament ? 15 : 10)) + 1; 
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
    
    const generarMisterioso = () => { /* ...sin cambios... */ return { pregunta, respuesta, tipo: 'misterioso' }; };
    const generarSecuencia = () => { /* ...sin cambios... */ return { pregunta, respuesta, tipo: 'secuencia' }; };
    const generarPotenciacion = () => { /* ...sin cambios... */ return { pregunta, respuesta, tipo: 'potenciacion' }; };
    const generarCombinadas = () => { /* ...sin cambios... */ return { pregunta, respuesta, tipo: 'combinadas' }; };
    const generarVerdaderoFalso = () => { /* ...sin cambios... */ return { pregunta, respuesta, tipo: 'verdadero-falso', explicacion }; };

    const informaticaQuestions = [
        // ... preguntas existentes ...
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

    // === NUEVO: Preguntas de torneo de Informática ===
    const informaticaTournamentQuestions = [
        { pregunta: "¿Qué significa 'IA'?", opciones: { A: "Internet Avanzado", B: "Inteligencia Artificial", C: "Impresora Automática", D: "Intervalo Ancho" }, respuesta: "B", tipo: "informatica" },
        { pregunta: "Si tu WiFi no funciona, ¿qué es lo primero que deberías intentar?", opciones: { A: "Comprar una computadora nueva", B: "Llamar a la policía", C: "Reiniciar el router", D: "Cambiar la clave del email" }, respuesta: "C", tipo: "informatica" },
        { pregunta: "¿Qué es 'la nube' en informática?", opciones: { A: "Una predicción del clima", B: "Un tipo de pantalla", C: "Servidores en internet para guardar datos", D: "Un virus peligroso" }, respuesta: "C", tipo: "informatica" },
        { pregunta: "¿Cuál de estos es un lenguaje de programación?", opciones: { A: "HTML", B: "JPEG", C: "Español", D: "Python" }, respuesta: "D", tipo: "informatica" },
        { pregunta: "¿Qué es un 'firewall'?", opciones: { A: "Un programa para hacer fogatas virtuales", B: "Un sistema de seguridad de red", C: "Un accesorio para calentar la PC", D: "Un videojuego popular" }, respuesta: "B", tipo: "informatica" }
    ];

    let generador;
    switch(mode) {
        case 'operaciones': generador = generarOperacion; break;
        case 'misterioso': generador = generarMisterioso; break;
        case 'secuencia': generador = generarSecuencia; break;
        case 'potenciacion': generador = generarPotenciacion; break;
        case 'combinadas': generador = generarCombinadas; break;
        case 'verdadero-falso': generador = generarVerdaderoFalso; break;
        case 'mas-cercano': generador = () => generarOperacion(); break;
        case 'sumamultiplicacion':
            for (let i = 0; i < Math.floor(count / 2); i++) preguntas.push(generarOperacion('+'));
            for (let i = 0; i < Math.ceil(count / 2); i++) preguntas.push(generarOperacion('*'));
            return preguntas;
        case 'informatica':
            // === MODIFICADO: Usa preguntas de torneo si es necesario ===
            const sourceQuestions = isTournament ? informaticaTournamentQuestions : informaticaQuestions;
            const shuffled = [...sourceQuestions].sort(() => 0.5 - Math.random());
            return shuffled.slice(0, Math.min(count, shuffled.length));
        default: generador = generarOperacion;
    }
    
    for (let i = 0; i < count; i++) {
        preguntas.push(generador());
    }
    
    return preguntas;
}

// --- FUNCIONES DE LÓGICA DE JUEGO ---

function sendRevealPhase(room) {
    if (!room || !room.currentQuestion) return;

    const currentQuestions = room.tournamentRound ? room.tournamentQuestions : room.questions;
    const currentQuestion = currentQuestions[room.questionIndex];
    if (!currentQuestion) return;

    const correctAnswer = currentQuestion.respuesta;
    const basePoints = 5;

    const playerList = room.tournamentRound ? room.finalists : room.players;

    playerList.forEach(player => {
        const playerAnswerData = room.answersThisRound[player.id];
        let pointsEarned = 0;
        let streakBonus = 0;
        let isCorrect = false;

        if (playerAnswerData && playerAnswerData.answer !== null) {
            const roundDuration = room.timerDuration || 30;
            const timeTaken = playerAnswerData.responseTime; 
            const timeLeft = Math.max(0, roundDuration - timeTaken);
            const timeBonus = Math.floor(timeLeft / 3);

            let userAnswerProcessed = playerAnswerData.answer;

            if (room.gameMode === 'verdadero-falso') {
                isCorrect = (userAnswerProcessed === 'true') === correctAnswer;
            } else if (room.gameMode === 'informatica') {
                isCorrect = (userAnswerProcessed === correctAnswer);
            } else {
                isCorrect = parseFloat(userAnswerProcessed) === correctAnswer;
            }
            
            if (isCorrect) {
                player.streak = (player.streak || 0) + 1;
                if (player.streak > (player.maxStreak || 0)) player.maxStreak = player.streak;
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

        const resultPayload = {
            type: 'reveal_phase',
            correctAnswer: correctAnswer,
            playerCorrect: isCorrect,
            streakBonus: streakBonus,
            options: room.gameMode === 'informatica' ? currentQuestion.opciones : undefined 
        };
        if (player.socket && player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(resultPayload));
        }
    });

    setTimeout(() => {
        if (room.tournamentRound) {
            broadcast(room.pin, {
                type: 'spectator_update',
                finalists: room.finalists.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points }))
            });
        } else {
            broadcast(room.pin, {
                type: 'ranking_update',
                players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, streak: p.streak }))
            });
        }
        
        setTimeout(() => {
            const totalQuestions = room.tournamentRound ? (room.tournamentRound === 'semifinal' ? SEMIFINAL_QUESTIONS_COUNT : FINAL_QUESTIONS_COUNT) : room.totalQuestions;
            if (room.questionIndex < totalQuestions - 1) {
                room.questionIndex++;
                if (room.tournamentRound) {
                    startNextTournamentQuestion(room);
                } else {
                    startNextQuestion(room);
                }
            } else {
                if (room.tournamentRound) {
                    endTournamentRound(room);
                } else {
                    endGame(room.pin);
                }
            }
        }, room.revealPhaseDuration || 3000);
    }, 1000);
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
        timerDuration: timerDuration
    });
    
    clearTimeout(room.roundTimer);
    room.roundTimer = setTimeout(() => {
        const currentRoom = rooms[room.pin];
        if (currentRoom && currentRoom.isGameRunning) {
            sendRevealPhase(currentRoom);
        }
    }, timerDuration * 1000);
}

function broadcast(pin, data) {
    const room = rooms[pin];
    if (!room) return;
    room.players.forEach(p => {
        if (p.socket && p.socket.readyState === WebSocket.OPEN) {
            try {
                p.socket.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[Sala ${pin}] Error al enviar mensaje a jugador ${p.id}:`, e);
            }
        }
    });
}

function resetRoomForNewGame(pin) {
    const room = rooms[pin];
    if (room) {
        room.gameMode = null;
        room.isGameRunning = false;
        room.votes = {};
        room.isVotingActive = false;
        clearInterval(room.voteTimer); room.voteTimer = null;
        room.voteTimeRemaining = 30;
        clearTimeout(room.roundTimer); room.roundTimer = null;
        
        // === NUEVO: Resetear estado del torneo ===
        room.isFinalistTournament = false;
        room.tournamentRound = null;
        room.finalists = [];
        room.tournamentQuestions = [];

        room.players.forEach(p => {
            p.points = 0; 
            p.streak = 0; 
            p.maxStreak = 0;
            p.hasVoted = false; 
            p.isReady = false;
        });
        console.log(`[Sala ${pin}] Sala reseteada.`);
        broadcast(pin, { type: 'room_reset' }); 
    }
}

function getTopPlayers(room, count) {
    return [...room.players]
        .sort((a, b) => b.points - a.points)
        .slice(0, count);
}

// === NUEVO: Funciones para manejar rondas de torneo ===
function startTournamentRound(room, round) {
    room.tournamentRound = round;
    room.questionIndex = 0;
    
    // Resetear puntos y rachas solo para los finalistas
    room.finalists.forEach(finalist => {
        finalist.points = 0;
        finalist.streak = 0;
    });

    const questionCount = round === 'semifinal' ? SEMIFINAL_QUESTIONS_COUNT : FINAL_QUESTIONS_COUNT;
    room.tournamentQuestions = generarPreguntas(room.gameMode, questionCount, true);

    console.log(`[Sala ${room.pin}] Iniciando ronda de torneo: ${round}.`);
    startNextTournamentQuestion(room);
}

function startNextTournamentQuestion(room) {
    if (!room || !room.tournamentRound) return;

    room.answersThisRound = {};
    const question = room.tournamentQuestions[room.questionIndex];
    if (!question) {
        endTournamentRound(room);
        return;
    }
    
    let timerDuration = 15; // Preguntas más rápidas en el torneo
    room.timerDuration = timerDuration;

    const questionForClients = { ...question };
    delete questionForClients.respuesta;
    delete questionForClients.explicacion;

    const questionPayload = { 
        type: 'question_update', // Reutilizamos el tipo de mensaje
        question: questionForClients,
        questionIndex: room.questionIndex, 
        totalQuestions: room.tournamentQuestions.length,
        timerDuration: timerDuration
    };

    // Enviar pregunta solo a finalistas
    room.finalists.forEach(p => {
        if (p.socket && p.socket.readyState === WebSocket.OPEN) {
            p.socket.send(JSON.stringify(questionPayload));
        }
    });

    // Enviar pregunta a espectadores
    broadcast(room.pin, {
        type: 'spectator_update',
        question: questionForClients,
        finalists: room.finalists.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points }))
    });

    clearTimeout(room.roundTimer);
    room.roundTimer = setTimeout(() => {
        const currentRoom = rooms[room.pin];
        if (currentRoom && currentRoom.tournamentRound) {
            sendRevealPhase(currentRoom);
        }
    }, timerDuration * 1000);
}

function endTournamentRound(room) {
    if (room.tournamentRound === 'semifinal') {
        // Seleccionar finalistas para la siguiente ronda
        room.finalists = room.finalists
            .sort((a, b) => b.points - a.points)
            .slice(0, FINALIST_COUNT);

        console.log(`[Sala ${room.pin}] Semifinal terminada. Finalistas: ${room.finalists.map(p => p.name).join(', ')}`);

        // Notificar a todos
        broadcast(room.pin, { type: 'start_final', finalists: room.finalists.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })) });
        
        // Pequeño delay y luego iniciar la ronda final
        setTimeout(() => startTournamentRound(room, 'final'), 5000);

    } else if (room.tournamentRound === 'final') {
        const winner = room.finalists.sort((a, b) => b.points - a.points)[0];
        console.log(`[Sala ${room.pin}] ¡Torneo terminado! Ganador absoluto: ${winner.name}`);

        broadcast(room.pin, { 
            type: 'ultimate_winner', 
            winner: { id: winner.id, name: winner.name, avatar: winner.avatar }
        });
        
        // El juego termina aquí, se reiniciará cuando los clientes vuelvan al lobby
    }
}

// === MODIFICADO: Lógica de fin de juego para manejar torneos ===
function endGame(pin) {
    const room = rooms[pin];
    if (!room) return;

    if (room.roundTimer) clearTimeout(room.roundTimer);
    if (room.voteTimer) clearInterval(room.voteTimer);
    room.isGameRunning = false;

    // SI ES TORNEO, INICIA LAS SEMIFINALES
    if (room.isFinalistTournament) {
        console.log(`[Sala ${pin}] Juego normal terminado. Iniciando fase de torneo.`);
        room.finalists = getTopPlayers(room, SEMIFINALIST_COUNT);
        
        const finalistIds = room.finalists.map(f => f.id);

        // Notificar a los que pasan a la semifinal
        broadcast(pin, {
            type: 'start_semifinals',
            finalists: room.finalists.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }))
        });

        // Dar tiempo a la animación de anuncio y luego iniciar la ronda
        setTimeout(() => startTournamentRound(room, 'semifinal'), 5000);

    } else { // SI NO ES TORNEO, PROCEDER NORMALMENTE
        const finalRanking = getTopPlayers(room, room.players.length)
            .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, streak: p.streak, maxStreak: p.maxStreak }));
        
        room.finalRanking = finalRanking;
        broadcast(pin, { type: 'game_over', finalRanking });
        console.log(`[Sala ${pin}] Juego terminado. Ranking final enviado.`);
    }
}


// --- MANEJO DE CONEXIONES Y MENSAJES DE WEBSOCKET ---
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
        try { data = JSON.parse(message); } catch (e) { return; }
        
        console.log(`[WS: ${ws.id}] MSG: ${data.type} (PIN: ${data.pin || 'N/A'})`);

        switch (data.type) {
            case 'create_room':
            case 'join_room':
            case 'rejoin_room':
                const { pin, player } = data;
                currentRoomPin = pin;
                playerId = player.id || playerId;
                
                currentPlayerData = {
                    id: playerId, 
                    name: player.name, 
                    avatar: player.avatar || '1', 
                    points: 0,
                    isProfessor: player.isProfessor || false, 
                    isReady: false,
                    streak: 0, 
                    maxStreak: 0,
                    hasVoted: false, 
                    socket: ws
                };

                if (data.type === 'create_room') {
                    if (rooms[pin]) { 
                        ws.send(JSON.stringify({ type: 'error', message: 'La sala con este PIN ya existe.' })); 
                        return; 
                    }
                    rooms[pin] = {
                        pin,
                        players: [], 
                        hostId: playerId,
                        votes: {}, 
                        voteTimer: null, 
                        voteTimeRemaining: 30,
                        isVotingActive: false, 
                        gameMode: null, 
                        isGameRunning: false, 
                        questions: [],
                        totalQuestions: 10,
                        // === NUEVO: Propiedades de torneo ===
                        isFinalistTournament: false,
                        tournamentRound: null,
                        finalists: [],
                        tournamentQuestions: []
                    };
                    console.log(`[Sala ${pin}] Sala creada por ${player.name}.`);
                } else if (!rooms[pin]) { 
                    ws.send(JSON.stringify({ type: 'error', message: 'La sala no existe.' })); 
                    return; 
                }
                
                const room = rooms[pin];
                const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);

                if (existingPlayerIndex !== -1) {
                    Object.assign(room.players[existingPlayerIndex], { ...currentPlayerData, points: room.players[existingPlayerIndex].points }); // Mantener puntos en reconexión
                    console.log(`[Sala ${pin}] Jugador ${player.name} se ha reconectado.`);
                } else {
                    room.players.push(currentPlayerData);
                    console.log(`[Sala ${pin}] Jugador ${player.name} se unió.`);
                }
                
                ws.send(JSON.stringify({
                    type: 'room_joined', 
                    pin,
                    players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, isProfessor: p.isProfessor, isReady: p.isReady, points: p.points })),
                    isHost: room.hostId === playerId, 
                    isGameRunning: room.isGameRunning, 
                    isVotingActive: room.isVotingActive,
                    voteTimeRemaining: room.voteTimeRemaining, 
                    currentVotes: room.votes,
                    question: room.isGameRunning ? room.questions[room.questionIndex] : undefined,
                    isFinalistTournament: room.isFinalistTournament,
                    tournamentRound: room.tournamentRound
                }));

                broadcast(pin, {
                    type: 'player_joined',
                    player: { id: currentPlayerData.id, name: currentPlayerData.name, avatar: currentPlayerData.avatar, isProfessor: currentPlayerData.isProfessor, isReady: currentPlayerData.isReady }
                });
                break;
            
            case 'initiate_vote': 
                const roomVote = rooms[data.pin];
                if (!roomVote || roomVote.hostId !== data.hostId || roomVote.isVotingActive) return;
                
                roomVote.isVotingActive = true;
                roomVote.voteTimeRemaining = 30;
                roomVote.votes = {};
                roomVote.players.forEach(p => p.hasVoted = false);
                
                clearInterval(roomVote.voteTimer);
                roomVote.voteTimer = setInterval(() => {
                    roomVote.voteTimeRemaining--;
                    broadcast(data.pin, { type: 'update_vote_timer', time: roomVote.voteTimeRemaining });
                    
                    if (roomVote.voteTimeRemaining <= 0) {
                        clearInterval(roomVote.voteTimer);
                        roomVote.voteTimer = null;
                        roomVote.isVotingActive = false;
                        
                        let maxVotes = 0;
                        let winningModes = [];
                        let isFinalist = false;

                        for(const mode in roomVote.votes){
                            const voteInfo = roomVote.votes[mode];
                            if(voteInfo.count > maxVotes){
                                maxVotes = voteInfo.count;
                                winningModes = [mode];
                                isFinalist = voteInfo.isFinalist;
                            } else if (voteInfo.count === maxVotes){
                                winningModes.push(mode);
                            }
                        }
                        
                        let selectedMode = 'operaciones';
                        if(winningModes.length > 0){
                            selectedMode = winningModes[Math.floor(Math.random() * winningModes.length)];
                            isFinalist = roomVote.votes[selectedMode]?.isFinalist || false;
                        }

                        roomVote.gameMode = selectedMode;
                        roomVote.isFinalistTournament = isFinalist; // === NUEVO: Marcar la sala como torneo ===
                        
                        roomVote.questions = generarPreguntas(roomVote.gameMode, roomVote.totalQuestions); 
                        roomVote.questionIndex = 0;
                        
                        broadcast(data.pin, { type: 'game_starting', mode: roomVote.gameMode });
                        
                        setTimeout(() => {
                            roomVote.isGameRunning = true;
                            broadcast(data.pin, { type: 'game_start', mode: roomVote.gameMode, isFinalistTournament: roomVote.isFinalistTournament });
                            startNextQuestion(roomVote);
                        }, 2000); 
                    }
                }, 1000);
                
                broadcast(data.pin, { type: 'start_voting', time: roomVote.voteTimeRemaining });
                break;
            
            // === MODIFICADO: para manejar votos de torneo ===
            case 'cast_vote':
                const roomCastVote = rooms[data.pin];
                if (!roomCastVote || !roomCastVote.isVotingActive) return;
                const voter = roomCastVote.players.find(p => p.id === data.playerId);
                if (voter && !voter.hasVoted) {
                    if (!roomCastVote.votes[data.mode]) {
                        roomCastVote.votes[data.mode] = { count: 0, isFinalist: false };
                    }
                    roomCastVote.votes[data.mode].count++;
                    if(data.finalistMode) { // Si este voto activa el modo finalista
                        roomCastVote.votes[data.mode].isFinalist = true;
                    }
                    voter.hasVoted = true;
                    broadcast(data.pin, { type: 'vote_update', votes: roomCastVote.votes });
                }
                break;
            
            case 'submit_answer':
                const roomAnswer = rooms[data.pin];
                if (!roomAnswer || (!roomAnswer.isGameRunning && !roomAnswer.tournamentRound)) return;
                
                if (roomAnswer.answersThisRound[data.playerId]) return;

                roomAnswer.answersThisRound[data.playerId] = {
                    answer: data.answer,
                    responseTime: data.responseTime 
                };
                
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'answer_received' }));
                }

                const playerPool = roomAnswer.tournamentRound ? roomAnswer.finalists : roomAnswer.players;
                const allAnswered = playerPool.every(p => roomAnswer.answersThisRound[p.id] !== undefined);

                if (allAnswered) {
                    clearTimeout(roomAnswer.roundTimer);
                    sendRevealPhase(roomAnswer);
                }
                break;

            // === NUEVO: Manejador para emojis ===
            case 'emoji_reaction':
                if (currentRoomPin && rooms[currentRoomPin]) {
                    broadcast(currentRoomPin, { type: 'emoji_broadcast', emoji: data.emoji });
                }
                break;

            case 'game_over':
                if (rooms[data.pin]) {
                    resetRoomForNewGame(data.pin); 
                }
                break;
            
            // ... otros casos como skip_question, player_ready, ping sin cambios ...
            case 'skip_question': /* ...sin cambios... */ break;
            case 'player_ready': /* ...sin cambios... */ break;
            case 'ping': ws.send(JSON.stringify({ type: 'pong' })); break;
        }
    });

    ws.on('close', () => {
        clearInterval(ws.pingInterval);
        if (currentRoomPin && rooms[currentRoomPin]) {
            const room = rooms[currentRoomPin];
            room.players = room.players.filter(p => p.socket !== ws);
            
            if (room.players.length === 0) {
                clearTimeout(room.roundTimer);
                clearInterval(room.voteTimer);
                delete rooms[currentRoomPin];
                console.log(`[Sala ${currentRoomPin}] Sala eliminada.`);
            } else {
                broadcast(currentRoomPin, { type: 'player_left', playerId });
                if (room.hostId === playerId) {
                    const newHost = room.players[0];
                    room.hostId = newHost.id;
                    newHost.isProfessor = true;
                    broadcast(currentRoomPin, { type: 'new_host', newHostId: room.hostId, newHostName: newHost.name });
                    console.log(`[Sala ${currentRoomPin}] Nuevo anfitrión: ${newHost.name}`);
                }
            }
        }
    });
    
    ws.pingInterval = setInterval(() => {
        if (!isAlive) return ws.terminate();
        isAlive = false;
        ws.ping();
    }, 30000);
});

server.listen(PORT, () => {
    console.log(`Servidor WebSocket activo en puerto ${PORT}`);
});
