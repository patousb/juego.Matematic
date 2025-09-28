// server.js
// Math Challenge PRO - Servidor WebSocket completo y corregido
// Requisitos: npm i express ws uuid
// Ejecutar: node server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

/* -----------------------
   Almacenamiento en memoria
   ----------------------- */
const rooms = {}; // pin -> room

/* -----------------------
   Servir archivos estáticos (opcional)
   Si tu jueguito.html está en ./public ponlo ahí.
   ----------------------- */
app.use(express.static('public'));

/* -----------------------
   Generador de preguntas por modo
   Cada pregunta tiene:
     - pregunta (string)
     - respuesta (number|string|boolean)
     - tipo (operaciones|misterioso|verdadero-falso|informatica)
     - opciones (opcional para preguntas de opción multiple)
   ----------------------- */
function generarPreguntas(mode = 'operaciones', count = 10) {
  const preguntas = [];

  // preguntas estáticas de informática (opciones)
  const informaticaPool = [
    { pregunta: "¿Cuál de estos es un navegador de internet?", opciones: { A: "Microsoft Word", B: "Google Chrome", C: "WhatsApp", D: "Photoshop" }, respuesta: "B", tipo: "informatica" },
    { pregunta: "¿Cuál de estos es un emoji?", opciones: { A: "@", B: "#", C: "😂", D: "/" }, respuesta: "C", tipo: "informatica" },
    { pregunta: "¿Qué red social es conocida por fotos y videos cortos?", opciones: { A: "Facebook", B: "TikTok", C: "WordPress", D: "Excel" }, respuesta: "B", tipo: "informatica" },
    { pregunta: "¿Qué icono suele ser 'guardar' en muchos programas?", opciones: { A: "Carpeta", B: "Disquete (💾)", C: "Nube", D: "Lupa" }, respuesta: "B", tipo: "informatica" },
    { pregunta: "¿Qué puedes hacer con un USB?", opciones: { A: "Guardar archivos", B: "Hacer llamadas", C: "Navegar", D: "Jugar" }, respuesta: "A", tipo: "informatica" },
    { pregunta: "¿Qué app permite videollamadas gratis?", opciones: { A: "Netflix", B: "Zoom", C: "Spotify", D: "Minecraft" }, respuesta: "B", tipo: "informatica" },
    { pregunta: "¿Qué significa WWW?", opciones: { A: "World Wide Web", B: "Windows Web Works", C: "Web World Wide", D: "Web Wonder World" }, respuesta: "A", tipo: "informatica" },
    { pregunta: "¿Qué parte es el 'cerebro' de la PC?", opciones: { A: "Monitor", B: "Teclado", C: "CPU", D: "Impresora" }, respuesta: "C", tipo: "informatica" },
    { pregunta: "¿Qué es un hashtag?", opciones: { A: "Comida", B: "Categoría en redes", C: "Programa de dibujo", D: "Juego de mesa" }, respuesta: "B", tipo: "informatica" }
  ];

  // helpers
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function generarOperacion() {
    let num1 = randInt(1, 20);
    let num2 = randInt(1, 20);
    const operadores = ['+', '-', '*', '/'];
    const op = operadores[Math.floor(Math.random() * operadores.length)];

    if (op === '/') {
      // garantizar división exacta
      const divisor = randInt(2, 8);
      const cociente = randInt(1, 12);
      const dividendo = divisor * cociente;
      return { pregunta: `${dividendo} ÷ ${divisor} = ?`, respuesta: cociente, tipo: 'operaciones' };
    } else if (op === '+') {
      return { pregunta: `${num1} + ${num2} = ?`, respuesta: num1 + num2, tipo: 'operaciones' };
    } else if (op === '-') {
      if (num1 < num2) [num1, num2] = [num2, num1];
      return { pregunta: `${num1} - ${num2} = ?`, respuesta: num1 - num2, tipo: 'operaciones' };
    } else {
      return { pregunta: `${num1} × ${num2} = ?`, respuesta: num1 * num2, tipo: 'operaciones' };
    }
  }

  function generarMisterioso() {
    const a = randInt(1, 20);
    const b = randInt(1, 10);
    const r = Math.random();
    if (r < 0.33) {
      return { pregunta: `? + ${b} = ${a + b}`, respuesta: a, tipo: 'misterioso' };
    } else if (r < 0.66) {
      return { pregunta: `? - ${b} = ${a}`, respuesta: a + b, tipo: 'misterioso' };
    } else {
      return { pregunta: `? × ${b} = ${a * b}`, respuesta: a, tipo: 'misterioso' };
    }
  }

  function generarVerdaderoFalso() {
    const n1 = randInt(1, 12);
    const n2 = randInt(1, 12);
    const ops = ['+', '-', '*', '/'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let correctResult;
    let textOp;
    if (op === '+') { correctResult = n1 + n2; textOp = `${n1} + ${n2}`; }
    else if (op === '-') { correctResult = n1 - n2; textOp = `${n1} - ${n2}`; }
    else if (op === '*') { correctResult = n1 * n2; textOp = `${n1} × ${n2}`; }
    else {
      const divisor = randInt(2,5);
      const cociente = randInt(1,10);
      const dividendo = divisor * cociente;
      correctResult = cociente;
      textOp = `${dividendo} ÷ ${divisor}`;
    }
    // 70% chance to show correct, 30% wrong
    const isCorrect = Math.random() < 0.7;
    let shown = correctResult;
    if (!isCorrect) {
      shown += (Math.random() > 0.5 ? 1 : -1) * randInt(1, 3);
    }
    return {
      pregunta: `¿Es correcta esta operación?<br>${textOp} = ${shown}`,
      respuesta: isCorrect,
      explicacion: isCorrect ? 'La operación es correcta.' : `La respuesta correcta era ${correctResult}.`,
      tipo: 'verdadero-falso'
    };
  }

  // Selección según mode
  if (mode === 'informatica') {
    const shuffled = [...informaticaPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  if (mode === 'mixed' || mode === 'mixto') {
    const generators = [generarOperacion, generarMisterioso, generarVerdaderoFalso];
    for (let i = 0; i < count; i++) {
      const gen = generators[Math.floor(Math.random() * generators.length)];
      preguntas.push(gen());
    }
    return preguntas;
  }

  // modos específicos
  let generator;
  switch (mode) {
    case 'operaciones': generator = generarOperacion; break;
    case 'misterioso': generator = generarMisterioso; break;
    case 'verdadero-falso': generator = generarVerdaderoFalso; break;
    default: generator = generarOperacion;
  }

  for (let i = 0; i < count; i++) preguntas.push(generator());

  return preguntas;
}

/* -----------------------
   Broadcast helpers
   ----------------------- */
function safeSend(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(data)); } catch (e) { console.error('send error', e); }
  }
}

function broadcast(pin, data) {
  const room = rooms[pin]; if (!room) return;
  room.players.forEach(p => safeSend(p.socket, data));
}

function broadcastToIds(pin, ids, data) {
  const room = rooms[pin]; if (!room) return;
  room.players.forEach(p => {
    if (ids.includes(p.id)) safeSend(p.socket, data);
  });
}

function broadcastToFinalists(pin, data) {
  const room = rooms[pin]; if (!room || !room.finalists) return;
  const ids = room.finalists.map(f => f.id);
  broadcastToIds(pin, ids, data);
}

function broadcastToSpectators(pin, data) {
  const room = rooms[pin]; if (!room) return;
  const specIds = room.players.filter(p => !room.finalists?.some(f => f.id === p.id)).map(p => p.id);
  broadcastToIds(pin, specIds, data);
}

/* -----------------------
   Ranking / utilidades
   ----------------------- */
function computeFinalRanking(room) {
  if (!room) return [];
  const list = [...room.players];
  list.sort((a,b) => {
    const pa = a.points || 0;
    const pb = b.points || 0;
    if (pb !== pa) return pb - pa;
    const avgA = (typeof a.avgResponseTime === 'number' && !isNaN(a.avgResponseTime)) ? a.avgResponseTime : Infinity;
    const avgB = (typeof b.avgResponseTime === 'number' && !isNaN(b.avgResponseTime)) ? b.avgResponseTime : Infinity;
    if (avgA !== avgB) return avgA - avgB;
    return (b.maxStreak || 0) - (a.maxStreak || 0);
  });
  return list.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points || 0, streak: p.streak || 0, maxStreak: p.maxStreak || 0 }));
}

/* -----------------------
   Lógica: revelar y puntuar
   - isTournament: si true aplica a room.finalists usando room.tournamentAnswersThisRound
   ----------------------- */
function sendRevealPhase(room, isTournament = false) {
  if (!room) return;
  const questionObj = isTournament ? room.tournamentQuestions[room.tournamentQuestionIndex] : room.currentQuestion;
  if (!questionObj) {
    console.warn('sendRevealPhase: no hay pregunta');
    return;
  }

  const correct = questionObj.respuesta;
  const basePoints = room.basePoints || 5;

  const answersMap = isTournament ? room.tournamentAnswersThisRound : room.answersThisRound;
  const participants = isTournament ? room.finalists : room.players;

  participants.forEach(player => {
    const ansData = answersMap[player.id];
    let pointsEarned = 0;
    let streakBonus = 0;
    let playerCorrect = false;

    if (ansData && ansData.answer !== null && ansData.answer !== undefined) {
      const roundDuration = isTournament ? (room.tournamentTimerDuration || 20) : (room.timerDuration || 30);
      const timeTaken = ansData.responseTime || 0;
      const timeLeft = Math.max(0, roundDuration - timeTaken);
      const timeBonus = Math.floor(timeLeft / 3);

      const qtipo = questionObj.tipo;
      const userAns = ansData.answer;

      if (qtipo === 'verdadero-falso') {
        // correct is boolean
        const normalized = (String(userAns).toLowerCase() === 'true' || userAns === true);
        playerCorrect = normalized === !!correct;
      } else if (qtipo === 'informatica') {
        playerCorrect = (String(userAns).toUpperCase() === String(correct).toUpperCase());
      } else {
        // numeric / exact match
        playerCorrect = Number(userAns) === Number(correct);
      }

      if (playerCorrect) {
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

    // enviar reveal personal (opcionalmente el cliente lo muestra)
    const payload = {
      type: 'reveal_phase',
      correctAnswer: correct,
      questionTipo: questionObj.tipo,
      playerId: player.id,
      playerCorrect,
      streakBonus,
      pointsEarned,
      options: questionObj.opciones || undefined,
      explanation: questionObj.explicacion || undefined
    };
    safeSend(player.socket, payload);
  });

  // Después del reveal: enviar ranking y avanzar
  setTimeout(() => {
    const ranking = computeFinalRanking(room);
    broadcast(room.pin, { type: 'ranking_update', players: ranking });

    setTimeout(() => {
      if (!isTournament) {
        // partida normal
        if (room.questionIndex < (room.totalQuestions || 0) - 1) {
          room.questionIndex++;
          startNextQuestion(room);
        } else {
          // fin partida normal: lanzar torneo si está activado
          if (room.isFinalistTournament && !room.tournamentStarted) {
            startSemifinals(room.pin);
          } else {
            endGame(room.pin);
          }
        }
      } else {
        // ronda de torneo
        if (room.tournamentQuestionIndex < (room.tournamentQuestions.length || 0) - 1) {
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
    }, room.revealPhaseDuration || 2000);
  }, 700);
}

/* -----------------------
   Preguntas normales (partida)
   ----------------------- */
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

  const qForClients = { ...room.currentQuestion };
  delete qForClients.respuesta;
  delete qForClients.explicacion;

  broadcast(room.pin, {
    type: 'question_update',
    question: qForClients,
    questionIndex: room.questionIndex,
    totalQuestions: room.totalQuestions,
    timerDuration
  });

  clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => {
    const current = rooms[room.pin];
    if (current && current.isGameRunning) {
      sendRevealPhase(current, false);
    }
  }, timerDuration * 1000);
}

/* -----------------------
   TORNEO: semifinales y final
   - Se respeta room.tournamentMode:
       'same' (por defecto) -> usa room.gameMode
       'informatica' -> fuerza preguntas informatica
       'mixed' -> mezcla
   ----------------------- */
function startSemifinals(pin) {
  const room = rooms[pin]; if (!room) return;
  room.tournamentStarted = true;
  room.tournamentStage = 'semifinal';

  const finalistCount = room.finalistCount || 3;
  const finalRanking = computeFinalRanking(room);
  const finalistsMeta = finalRanking.slice(0, Math.min(finalistCount, finalRanking.length));
  room.finalists = room.players.filter(p => finalistsMeta.some(f => f.id === p.id));
  room.finalists.forEach(f => { f.points = 0; f.streak = 0; f.maxStreak = 0; });

  // elegir modo de torneo
  const tmode = room.tournamentMode || 'same'; // same | informatica | mixed
  let questions;
  if (tmode === 'informatica') questions = generarPreguntas('informatica', 3);
  else if (tmode === 'mixed') questions = generarPreguntas('mixed', 3);
  else questions = generarPreguntas(room.gameMode || 'operaciones', 3);

  room.tournamentQuestions = questions;
  room.tournamentQuestionIndex = 0;
  room.tournamentAnswersThisRound = {};
  room.tournamentTimerDuration = room.tournamentTimerDuration || 20;

  broadcast(pin, { type: 'start_semifinals', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, avatar: f.avatar, points: f.points })) });

  // lanzar primera pregunta después de pequeña espera para transición en UI
  setTimeout(() => {
    startNextTournamentQuestion(room);
    broadcastToSpectators(pin, { type: 'spectator_update', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points })) });
  }, 1200);
}

function startNextTournamentQuestion(room) {
  if (!room || !room.finalists || room.finalists.length === 0) return;
  room.tournamentAnswersThisRound = {};
  const q = room.tournamentQuestions[room.tournamentQuestionIndex];
  if (!q) { console.warn('startNextTournamentQuestion: no q'); return; }

  const qForClients = { ...q };
  delete qForClients.respuesta;
  delete qForClients.explicacion;

  // enviar a finalistas (solo ellos ven la pregunta completa y responden)
  broadcastToFinalists(room.pin, {
    type: 'tournament_question_update',
    question: qForClients,
    questionIndex: room.tournamentQuestionIndex,
    totalQuestions: room.tournamentQuestions.length,
    timerDuration: room.tournamentTimerDuration
  });

  // espectadores reciben versión pasiva
  broadcastToSpectators(room.pin, {
    type: 'spectator_update',
    question: { pregunta: qForClients.pregunta, tipo: qForClients.tipo },
    questionIndex: room.tournamentQuestionIndex,
    totalQuestions: room.tournamentQuestions.length,
    finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points }))
  });

  clearTimeout(room.tournamentRoundTimer);
  room.tournamentRoundTimer = setTimeout(() => {
    sendRevealPhase(room, true);
  }, (room.tournamentTimerDuration || 20) * 1000);
}

function concludeSemifinals(pin) {
  const room = rooms[pin]; if (!room) return;
  const sorted = [...room.finalists].sort((a,b) => (b.points||0) - (a.points||0));
  const top2 = sorted.slice(0, 2);
  room.finalists = top2;
  room.tournamentStage = 'final';

  // preparar preguntas de final (mismo criterio de modo que semifinal)
  const tmode = room.tournamentMode || 'same';
  if (tmode === 'informatica') room.tournamentQuestions = generarPreguntas('informatica', 3);
  else if (tmode === 'mixed') room.tournamentQuestions = generarPreguntas('mixed', 3);
  else room.tournamentQuestions = generarPreguntas(room.gameMode || 'operaciones', 3);

  room.tournamentQuestionIndex = 0;
  room.tournamentAnswersThisRound = {};
  room.tournamentTimerDuration = room.tournamentTimerDurationFinal || 15;

  broadcast(pin, { type: 'start_final', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points, avatar: f.avatar })) });

  setTimeout(() => {
    startNextTournamentQuestion(room);
    broadcastToSpectators(pin, { type: 'spectator_update', finalists: room.finalists.map(f => ({ id: f.id, name: f.name, points: f.points })) });
  }, 1200);
}

function concludeFinal(pin) {
  const room = rooms[pin]; if (!room) return;
  const sorted = [...room.finalists].sort((a,b) => (b.points||0) - (a.points||0));
  const winner = sorted[0] || null;
  room.ultimateWinner = winner ? { id: winner.id, name: winner.name, avatar: winner.avatar, points: winner.points } : null;

  broadcast(pin, { type: 'ultimate_winner', winner: room.ultimateWinner });

  room.tournamentStage = null;
  room.tournamentStarted = false;
  room.isFinalistTournament = false;
  room.finalRanking = computeFinalRanking(room);

  clearTimeout(room.tournamentRoundTimer);
  room.tournamentRoundTimer = null;
}

/* -----------------------
   Finalizar partida / limpiar
   ----------------------- */
function endGame(pin) {
  const room = rooms[pin]; if (!room) return;
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }
  if (room.tournamentRoundTimer) { clearTimeout(room.tournamentRoundTimer); room.tournamentRoundTimer = null; }
  room.isGameRunning = false;

  if (room.isFinalistTournament && !room.tournamentStarted) { 
    // arrancar semifinales inmediatamente si estaba configurado así
    startSemifinals(pin);
    return;
  }

  room.finalRanking = computeFinalRanking(room);
  broadcast(pin, { type: 'game_over', finalRanking: room.finalRanking });
}

/* -----------------------
   WebSocket: conexión y mensajes
   ----------------------- */
wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  let currentRoomPin = null;
  let currentPlayerId = ws.id;

  // heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch (e) { console.error('JSON parse error', e); return; }

    switch (data.type) {
      /* -----------------------
         Crear / Unirse / Reunirse a sala
         payloads esperados:
         - { type: 'create_room', pin, player, options? }
         - { type: 'join_room', pin, player }
         - { type: 'rejoin_room', pin, playerId }
      ----------------------- */
      case 'create_room': {
        const pin = data.pin || String(Math.floor(Math.random() * 900000) + 100000);
        currentRoomPin = pin;
        const player = data.player || { id: ws.id, name: 'Jugador' };
        currentPlayerId = player.id = player.id || ws.id;

        if (rooms[pin]) {
          safeSend(ws, { type: 'error', message: 'Sala ya existe' });
          return;
        }

        rooms[pin] = {
          pin,
          hostId: player.id,
          players: [],
          votes: {},
          isVotingActive: false,
          voteTimeRemaining: 0,
          gameMode: data.options?.gameMode || null, // por ejemplo 'operaciones' o 'verdadero-falso'
          tournamentMode: data.options?.tournamentMode || 'same', // 'same'|'informatica'|'mixed'
          isFinalistTournament: !!data.options?.isFinalistTournament,
          finalistCount: data.options?.finalistCount || 3,
          totalQuestions: data.options?.totalQuestions || 10,
          questionIndex: 0,
          questions: [],
          answersThisRound: {},
          roundTimer: null,
          currentQuestion: null,
          timerDuration: 30,
          revealPhaseDuration: 2000,
          basePoints: data.options?.basePoints || 5,
          // torneo
          tournamentStarted: false,
          tournamentStage: null,
          finalists: [],
          tournamentQuestions: [],
          tournamentQuestionIndex: 0,
          tournamentAnswersThisRound: {},
          tournamentRoundTimer: null,
          tournamentTimerDuration: 20,
          tournamentTimerDurationFinal: 15,
          isGameRunning: false,
          finalRanking: []
        };

        const room = rooms[pin];

        // crear el primer jugador
        const playerObj = {
          id: player.id,
          name: player.name || 'Jugador',
          avatar: player.avatar || '1',
          points: 0,
          streak: 0,
          maxStreak: 0,
          avgResponseTime: 0,
          hasVoted: false,
          socket: ws
        };
        room.players.push(playerObj);

        safeSend(ws, {
          type: 'room_joined',
          pin,
          players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points })),
          isHost: true,
          gameMode: room.gameMode,
          totalQuestions: room.totalQuestions,
          isGameRunning: room.isGameRunning
        });

        console.log(`[${pin}] Sala creada por ${playerObj.name}`);
        break;
      }

      case 'join_room': {
        const pin = data.pin;
        const player = data.player || {};
        if (!pin || !rooms[pin]) {
          safeSend(ws, { type: 'error', message: 'Sala no existe' });
          return;
        }
        currentRoomPin = pin;
        currentPlayerId = player.id = player.id || ws.id;

        const room = rooms[pin];
        const existingIndex = room.players.findIndex(p => p.id === player.id);
        const playerObj = {
          id: player.id,
          name: player.name || 'Jugador',
          avatar: player.avatar || '1',
          points: player.points || 0,
          streak: player.streak || 0,
          maxStreak: player.maxStreak || 0,
          avgResponseTime: player.avgResponseTime || 0,
          hasVoted: false,
          socket: ws
        };

        if (existingIndex !== -1) {
          // re-asignar socket
          room.players[existingIndex].socket = ws;
          Object.assign(room.players[existingIndex], playerObj);
        } else {
          room.players.push(playerObj);
        }

        safeSend(ws, {
          type: 'room_joined',
          pin,
          players: room.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points })),
          isHost: room.hostId === player.id,
          gameMode: room.gameMode,
          totalQuestions: room.totalQuestions,
          isGameRunning: room.isGameRunning,
          currentVotes: room.votes
        });

        // notificar a todos
        broadcast(pin, { type: 'player_joined', player: { id: playerObj.id, name: playerObj.name, avatar: playerObj.avatar } });
        console.log(`[${pin}] ${playerObj.name} se unió`);
        break;
      }

      case 'rejoin_room': {
        const pin = data.pin;
        const playerId = data.playerId;
        if (!pin || !rooms[pin]) { safeSend(ws, { type: 'error', message: 'Sala no existe' }); return; }
        const room = rooms[pin];
        const idx = room.players.findIndex(p => p.id === playerId);
        if (idx !== -1) {
          room.players[idx].socket = ws;
          currentRoomPin = pin;
          currentPlayerId = playerId;
          safeSend(ws, { type: 'rejoined', pin, playerId, message: 'Reingreso exitoso' });
        } else {
          safeSend(ws, { type: 'error', message: 'Jugador no encontrado en sala' });
        }
        break;
      }

      /* -----------------------
         Config / inicio de partida
         - set_game_mode { pin, gameMode }
         - start_game { pin, playerId } (host normalmente)
      ----------------------- */
      case 'set_game_mode': {
        const pin = data.pin; if (!pin || !rooms[pin]) return;
        const mode = data.gameMode;
        rooms[pin].gameMode = mode;
        broadcast(pin, { type: 'game_mode_set', gameMode: mode });
        break;
      }

      case 'start_game': {
        const pin = data.pin; if (!pin || !rooms[pin]) return;
        const room = rooms[pin];
        // preparar preguntas según room.gameMode y totalQuestions
        room.questions = generarPreguntas(room.gameMode || 'operaciones', room.totalQuestions || 10);
        room.questionIndex = 0;
        room.isGameRunning = true;
        room.answersThisRound = {};
        // reset puntos/rachas
        room.players.forEach(p => { p.points = 0; p.streak = 0; p.maxStreak = 0; p.avgResponseTime = 0; });
        broadcast(pin, { type: 'game_started', totalQuestions: room.totalQuestions, gameMode: room.gameMode });
        // lanzar primera pregunta
        setTimeout(() => startNextQuestion(room), 600);
        break;
      }

      /* -----------------------
         Votaciones (opcional)
      ----------------------- */
      case 'start_vote': {
        const pin = data.pin; if (!pin || !rooms[pin]) return;
        const room = rooms[pin];
        room.isVotingActive = true;
        room.votes = {};
        room.voteTimeRemaining = data.duration || 20;
        broadcast(pin, { type: 'vote_started', duration: room.voteTimeRemaining });
        // temporizador simple
        if (room.voteTimer) clearInterval(room.voteTimer);
        room.voteTimer = setInterval(() => {
          room.voteTimeRemaining--;
          broadcast(pin, { type: 'vote_tick', remaining: room.voteTimeRemaining });
          if (room.voteTimeRemaining <= 0) { clearInterval(room.voteTimer); room.voteTimer = null; room.isVotingActive = false; broadcast(pin, { type: 'vote_ended', votes: room.votes }); }
        }, 1000);
        break;
      }

      case 'cast_vote': {
        const pin = data.pin; if (!pin || !rooms[pin]) return;
        const room = rooms[pin]; if (!room.isVotingActive) return;
        const mode = data.mode;
        room.votes[mode] = (room.votes[mode] || 0) + 1;
        broadcast(pin, { type: 'vote_update', votes: room.votes });
        break;
      }

      /* -----------------------
         Respuestas de jugadores
         - submit_answer { pin, playerId, answer, responseTime }
      ----------------------- */
      case 'submit_answer': {
        const pin = data.pin;
        if (!pin || !rooms[pin]) { safeSend(ws, { type: 'error', message: 'Sala no existe' }); return; }
        const room = rooms[pin];
        const isTournamentActive = room.tournamentStarted && !!room.tournamentStage;
        const isFinalist = room.finalists && room.finalists.some(f => f.id === data.playerId);
        const container = (isTournamentActive && isFinalist) ? room.tournamentAnswersThisRound : room.answersThisRound;
        container[data.playerId] = { answer: data.answer, responseTime: data.responseTime || 0 };
        safeSend(ws, { type: 'answer_received' });
        break;
      }

      /* -----------------------
         Finalistas piden su pregunta (por si reconectaron)
         - request_tournament_question { pin, playerId }
      ----------------------- */
      case 'request_tournament_question': {
        const pin = data.pin; if (!pin || !rooms[pin]) return;
        const room = rooms[pin];
        const player = room.players.find(p => p.id === data.playerId);
        if (!player) return;
        const isFinalist = room.finalists && room.finalists.some(f => f.id === data.playerId);
        if (!room.tournamentStarted || !isFinalist) return;
        const q = room.tournamentQuestions[room.tournamentQuestionIndex];
        if (!q) return;
        const qForClients = { ...q }; delete qForClients.respuesta; delete qForClients.explicacion;
        safeSend(player.socket, { type: 'tournament_question_update', question: qForClients, questionIndex: room.tournamentQuestionIndex, totalQuestions: room.tournamentQuestions.length, timerDuration: room.tournamentTimerDuration });
        break;
      }

      case 'ping': {
        safeSend(ws, { type: 'pong' });
        break;
      }

      default:
        console.warn('Mensaje no manejado:', data.type);
    }
  });

  ws.on('close', () => {
    // Marcar desconexión (no eliminamos jugador inmediatamente para permitir reconexión)
    // Si quieres eliminarlo al cerrar: buscar room y filtrar players
    for (const p in rooms) {
      const room = rooms[p];
      const idx = room.players.findIndex(x => x.socket === ws || x.id === currentPlayerId);
      if (idx !== -1) {
        // mantener registro pero sin socket para reconexión
        room.players[idx].socket = null;
      }
    }
  });
});

/* -----------------------
   Heartbeat global para ws (limpieza de sockets muertos)
   ----------------------- */
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

/* -----------------------
   Optional: limpiar rooms sin jugadores
   ----------------------- */
setInterval(() => {
  Object.keys(rooms).forEach(pin => {
    const room = rooms[pin];
    const connected = room.players.some(p => p.socket && p.socket.readyState === WebSocket.OPEN);
    if (!connected) {
      // si nadie conectado por X tiempo -> eliminar (opcional)
      // Por ahora solo imprimimos
      // console.log(`Sala ${pin} sin conexiones activas`);
    }
  });
}, 60_000);

/* -----------------------
   Start server
   ----------------------- */
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
