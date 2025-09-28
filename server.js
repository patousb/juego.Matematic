// server.js
// Servidor WebSocket corregido y mejorado para que las semifinales y finales
// siempre respeten el mismo modo de juego que se eligió al inicio.

const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Servidor WebSocket en ws://localhost:${PORT}`);

const rooms = {}; // { pin: { ...estado } }

/* ---------------------- Broadcast helpers ---------------------- */
function broadcast(pin, data) {
  const room = rooms[pin];
  if (!room) return;
  room.players.forEach((p) => {
    if (p.socket?.readyState === WebSocket.OPEN) {
      p.socket.send(JSON.stringify(data));
    }
  });
}

function broadcastToIds(pin, ids, data) {
  const room = rooms[pin];
  if (!room) return;
  room.players.forEach((p) => {
    if (ids.includes(p.id) && p.socket?.readyState === WebSocket.OPEN) {
      p.socket.send(JSON.stringify(data));
    }
  });
}

function broadcastToFinalists(pin, data) {
  const room = rooms[pin];
  if (!room?.finalists) return;
  const ids = room.finalists.map((f) => f.id);
  broadcastToIds(pin, ids, data);
}

function broadcastToSpectators(pin, data) {
  const room = rooms[pin];
  if (!room) return;
  const specIds = room.players
    .filter((p) => !room.finalists?.some((f) => f.id === p.id))
    .map((p) => p.id);
  broadcastToIds(pin, specIds, data);
}

/* ---------------------- Generador de preguntas ---------------------- */
function generarPreguntas(mode = "operaciones", count = 10) {
  const preguntas = [];

  if (mode === "verdadero-falso") {
    for (let i = 0; i < count; i++) {
      const a = Math.floor(Math.random() * 10);
      const b = Math.floor(Math.random() * 10);
      const correct = a + b > 10;
      preguntas.push({
        pregunta: `${a} + ${b} > 10 ?`,
        respuesta: correct,
        tipo: "verdadero-falso",
      });
    }
    return preguntas;
  }

  if (mode === "secuencia") {
    for (let i = 0; i < count; i++) {
      const start = Math.floor(Math.random() * 5) + 1;
      const seq = [start, start + 2, start + 4];
      const next = start + 6;
      preguntas.push({
        pregunta: `¿Cuál sigue en la secuencia? ${seq.join(", ")} ...`,
        respuesta: next,
        tipo: "secuencia",
      });
    }
    return preguntas;
  }

  // Default: operaciones
  for (let i = 0; i < count; i++) {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    preguntas.push({
      pregunta: `${a} + ${b} = ?`,
      respuesta: a + b,
      tipo: "operaciones",
    });
  }
  return preguntas;
}

/* ---------------------- Ranking ---------------------- */
function computeFinalRanking(room) {
  if (!room) return [];
  return [...room.players]
    .sort((a, b) => {
      if ((b.points || 0) !== (a.points || 0))
        return (b.points || 0) - (a.points || 0);
      const avgA =
        typeof a.avgResponseTime === "number" ? a.avgResponseTime : Infinity;
      const avgB =
        typeof b.avgResponseTime === "number" ? b.avgResponseTime : Infinity;
      if (avgA !== avgB) return avgA - avgB;
      return (b.maxStreak || 0) - (a.maxStreak || 0);
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      points: p.points || 0,
      streak: p.streak || 0,
      maxStreak: p.maxStreak || 0,
    }));
}

/* ---------------------- Reveal ---------------------- */
function sendRevealPhase(room, isTournament = false) {
  const q = isTournament
    ? room.tournamentQuestions[room.tournamentQuestionIndex]
    : room.currentQuestion;
  if (!q) return;

  const correctAnswer = q.respuesta;
  const basePoints = 5;
  const answers = isTournament
    ? room.tournamentAnswersThisRound
    : room.answersThisRound;
  const players = isTournament ? room.finalists : room.players;

  players.forEach((pl) => {
    const ans = answers[pl.id];
    let pointsEarned = 0;
    let streakBonus = 0;
    let correct = false;

    if (ans) {
      if (q.tipo === "verdadero-falso")
        correct = String(ans.answer) === String(correctAnswer);
      else correct = Number(ans.answer) === Number(correctAnswer);

      if (correct) {
        pl.streak = (pl.streak || 0) + 1;
        pl.maxStreak = Math.max(pl.maxStreak || 0, pl.streak);
        if (pl.streak >= 7) streakBonus = 8;
        else if (pl.streak >= 5) streakBonus = 5;
        else if (pl.streak >= 3) streakBonus = 2;
        pointsEarned = basePoints + streakBonus;
        pl.points = (pl.points || 0) + pointsEarned;
      } else {
        pl.streak = 0;
      }
    } else {
      pl.streak = 0;
    }

    pl.socket?.send(
      JSON.stringify({
        type: "reveal_phase",
        correctAnswer,
        playerId: pl.id,
        playerCorrect: correct,
        pointsEarned,
        streakBonus,
      })
    );
  });

  setTimeout(() => {
    const ranking = computeFinalRanking(room);
    broadcast(room.pin, { type: "ranking_update", players: ranking });

    setTimeout(() => {
      if (!isTournament) {
        if (room.questionIndex < room.totalQuestions - 1) {
          room.questionIndex++;
          startNextQuestion(room);
        } else {
          if (room.isFinalistTournament && !room.tournamentStarted)
            startSemifinals(room.pin);
          else endGame(room.pin);
        }
      } else {
        if (
          room.tournamentQuestionIndex <
          room.tournamentQuestions.length - 1
        ) {
          room.tournamentQuestionIndex++;
          startNextTournamentQuestion(room);
        } else {
          if (room.tournamentStage === "semifinal")
            concludeSemifinals(room.pin);
          else if (room.tournamentStage === "final") concludeFinal(room.pin);
        }
      }
    }, room.revealPhaseDuration || 3000);
  }, 800);
}

/* ---------------------- Juego normal ---------------------- */
function startNextQuestion(room) {
  if (!room?.isGameRunning) return;
  if (!room.questions[room.questionIndex]) return endGame(room.pin);

  room.answersThisRound = {};
  room.currentQuestion = room.questions[room.questionIndex];

  const qSend = { ...room.currentQuestion };
  delete qSend.respuesta;

  broadcast(room.pin, {
    type: "question_update",
    question: qSend,
    questionIndex: room.questionIndex,
    totalQuestions: room.totalQuestions,
    timerDuration: 20,
  });

  clearTimeout(room.roundTimer);
  room.roundTimer = setTimeout(() => sendRevealPhase(room, false), 20000);
}

/* ---------------------- Torneo ---------------------- */
function startSemifinals(pin) {
  const room = rooms[pin];
  if (!room) return;
  room.tournamentStarted = true;
  room.tournamentStage = "semifinal";

  const finalists = computeFinalRanking(room).slice(
    0,
    room.finalistCount || 3
  );
  room.finalists = room.players.filter((p) =>
    finalists.some((f) => f.id === p.id)
  );
  room.finalists.forEach((f) => {
    f.points = 0;
    f.streak = 0;
  });

  // 🔒 usar siempre el mismo modo que la partida
  room.tournamentQuestions = generarPreguntas(room.gameMode, 3);
  room.tournamentQuestionIndex = 0;
  room.tournamentAnswersThisRound = {};

  broadcast(pin, {
    type: "start_semifinals",
    finalists: room.finalists.map((f) => ({
      id: f.id,
      name: f.name,
      avatar: f.avatar,
    })),
  });

  setTimeout(() => startNextTournamentQuestion(room), 1500);
}

function startNextTournamentQuestion(room) {
  const q = room.tournamentQuestions[room.tournamentQuestionIndex];
  const qSend = { ...q };
  delete qSend.respuesta;

  broadcastToFinalists(room.pin, {
    type: "tournament_question_update",
    question: qSend,
    questionIndex: room.tournamentQuestionIndex,
    totalQuestions: room.tournamentQuestions.length,
    timerDuration: 15,
  });

  broadcastToSpectators(room.pin, {
    type: "spectator_update",
    question: { pregunta: qSend.pregunta, tipo: qSend.tipo },
    finalists: room.finalists.map((f) => ({
      id: f.id,
      name: f.name,
      points: f.points,
    })),
  });

  clearTimeout(room.tournamentRoundTimer);
  room.tournamentRoundTimer = setTimeout(
    () => sendRevealPhase(room, true),
    15000
  );
}

function concludeSemifinals(pin) {
  const room = rooms[pin];
  const top2 = [...room.finalists]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 2);
  room.finalists = top2;
  room.tournamentStage = "final";
  room.tournamentQuestions = generarPreguntas(room.gameMode, 3);
  room.tournamentQuestionIndex = 0;

  broadcast(pin, {
    type: "start_final",
    finalists: top2.map((f) => ({ id: f.id, name: f.name })),
  });

  setTimeout(() => startNextTournamentQuestion(room), 1500);
}

function concludeFinal(pin) {
  const room = rooms[pin];
  const sorted = [...room.finalists].sort(
    (a, b) => (b.points || 0) - (a.points || 0)
  );
  room.ultimateWinner = sorted[0] || null;
  broadcast(pin, { type: "ultimate_winner", winner: room.ultimateWinner });
  room.tournamentStage = null;
  room.tournamentStarted = false;
}

/* ---------------------- Fin ---------------------- */
function endGame(pin) {
  const room = rooms[pin];
  if (!room) return;
  clearTimeout(room.roundTimer);
  room.isGameRunning = false;
  if (room.isFinalistTournament && !room.tournamentStarted)
    return startSemifinals(pin);

  room.finalRanking = computeFinalRanking(room);
  broadcast(pin, { type: "game_over", finalRanking: room.finalRanking });
}

/* ---------------------- WS ---------------------- */
wss.on("connection", (ws, req) => {
  ws.id = uuidv4();
  let playerId = ws.id;
  let currentRoomPin = null;

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    switch (data.type) {
      case "create_room": {
        const { pin, player } = data;
        if (rooms[pin]) {
          ws.send(JSON.stringify({ type: "error", message: "Sala ya existe" }));
          return;
        }
        rooms[pin] = {
          pin,
          players: [],
          hostId: player.id,
          gameMode: null,
          questionIndex: 0,
          totalQuestions: 10,
          isGameRunning: false,
          isFinalistTournament: false,
          finalistCount: 3,
        };
        break;
      }

      case "join_room": {
        const { pin, player } = data;
        const room = rooms[pin];
        if (!room) return;

        const newPlayer = {
          ...player,
          id: player.id || uuidv4(),
          points: 0,
          streak: 0,
          socket: ws,
        };
        room.players.push(newPlayer);
        currentRoomPin = pin;
        ws.send(JSON.stringify({ type: "room_joined", pin }));
        broadcast(pin, { type: "player_joined", player: newPlayer });
        break;
      }

      case "start_game": {
        const room = rooms[data.pin];
        if (!room) return;
        room.gameMode = data.mode;
        room.questions = generarPreguntas(room.gameMode, room.totalQuestions);
        room.questionIndex = 0;
        room.isGameRunning = true;
        startNextQuestion(room);
        break;
      }

      case "submit_answer": {
        const room = rooms[data.pin];
        if (!room) return;
        const isTournament = room.tournamentStarted && room.finalists;
        const answers = isTournament
          ? room.tournamentAnswersThisRound
          : room.answersThisRound;
        answers[data.playerId] = { answer: data.answer };
        ws.send(JSON.stringify({ type: "answer_received" }));
        break;
      }

      case "request_tournament_question": {
        const room = rooms[data.pin];
        if (!room) return;
        const q =
          room.tournamentQuestions[room.tournamentQuestionIndex] || null;
        if (q)
          ws.send(
            JSON.stringify({
              type: "tournament_question_update",
              question: { pregunta: q.pregunta, tipo: q.tipo },
              questionIndex: room.tournamentQuestionIndex,
              totalQuestions: room.tournamentQuestions.length,
              timerDuration: 15,
            })
          );
        break;
      }
    }
  });
});
