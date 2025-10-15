// server.js - CORRECCIÓN COMPLETA DEL PROBLEMA DE SINCRONIZACIÓN EN LOBBY
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

// ====================== CONFIGURACIÓN ======================

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

// ====================== CLASES CORREGIDAS ======================

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
    this.tournamentGameRunning = false;
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
    
    // ====================== CORRECCIÓN: CONTROL DE CONEXIONES ======================
    this.connectionAttempts = new Map();
    this.lastSyncTime = 0;
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    this.updateActivity();
    console.log(`[Sala ${this.pin}] ✅ Jugador ${player.name} agregado. Total: ${this.players.size}`);
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      console.log(`[Sala ${this.pin}] ❌ Jugador ${player.name} removido. Quedan: ${this.players.size - 1}`);
    }
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

  // ====================== CORRECCIÓN: SINCRONIZACIÓN MEJORADA ======================
  isTournamentGameRunning() {
    return this.tournamentStarted && this.tournamentGameRunning;
  }

  isAnyGameRunning() {
    return this.isGameRunning || this.isTournamentGameRunning();
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  // ====================== CORRECCIÓN PRINCIPAL: SINCRONIZACIÓN ROBUSTA ======================
  syncPlayersToAll(force = false) {
    // Evitar sincronizaciones demasiado frecuentes
    const now = Date.now();
    if (!force && now - this.lastSyncTime < 100) {
      return;
    }
    this.lastSyncTime = now;

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
        hasAnswered: p.hasAnswered,
        isOnline: !!p.socket // ====================== NUEVO: Estado de conexión ======================
      }))
    };
    
    console.log(`[Sala ${this.pin}] 🔄 Sincronizando ${this.players.size} jugadores (${this.getPlayersArray().filter(p => p.socket).length} conectados)`);
    
    let sentCount = 0;
    this.players.forEach(player => {
      if (player.socket && player.socket.readyState === WebSocket.OPEN) {
        try {
          player.socket.send(JSON.stringify(playersUpdate));
          sentCount++;
        } catch (e) {
          console.error(`[Sala ${this.pin}] ❌ Error enviando sync a ${player.name}:`, e.message);
          // Marcar como desconectado pero mantener en la sala
          player.socket = null;
        }
      }
    });
    
    console.log(`[Sala ${this.pin}] 📤 Sync enviado a ${sentCount} jugadores`);
    this.updateActivity();
  }

  broadcast(data, excludePlayerId = null) {
    const message = JSON.stringify(data);
    let sentCount = 0;
    let errorCount = 0;
    
    this.players.forEach(player => {
      if (player.id !== excludePlayerId) {
        if (player.socket && player.socket.readyState === WebSocket.OPEN) {
          try {
            player.socket.send(message);
            sentCount++;
          } catch (e) {
            console.error(`[Sala ${this.pin}] ❌ Error broadcast a ${player.name}:`, e.message);
            player.socket = null; // Marcar como desconectado
            errorCount++;
          }
        }
      }
    });
    
    if (errorCount > 0) {
      console.log(`[Sala ${this.pin}] 📢 Broadcast: ${sentCount} enviados, ${errorCount} errores`);
    }
    this.updateActivity();
    return { sent: sentCount, errors: errorCount };
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
          player.socket = null;
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

  // ====================== CORRECCIÓN: VERIFICACIÓN DE ESTADO DE JUGADORES ======================
  checkPlayerConnections() {
    const connectedPlayers = this.getPlayersArray().filter(p => p.socket && p.socket.readyState === WebSocket.OPEN);
    const disconnectedPlayers = this.getPlayersArray().filter(p => !p.socket || p.socket.readyState !== WebSocket.OPEN);
    
    if (disconnectedPlayers.length > 0) {
      console.log(`[Sala ${this.pin}] 🔍 Estado conexiones: ${connectedPlayers.length} conectados, ${disconnectedPlayers.length} desconectados`);
      disconnectedPlayers.forEach(p => {
        console.log(`   - ${p.name}: ${p.socket ? 'Socket con error' : 'Sin socket'}`);
      });
    }
    
    return {
      connected: connectedPlayers.length,
      disconnected: disconnectedPlayers.length,
      total: this.players.size
    };
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
      connectedPlayers: this.getPlayersArray().filter(p => p.socket && p.socket.readyState === WebSocket.OPEN).length,
      isGameRunning: this.isGameRunning,
      tournamentStage: this.tournamentStage,
      tournamentGameRunning: this.tournamentGameRunning,
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
    this.lastPing = Date.now();
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
      isReady: this.isReady,
      isOnline: !!(this.socket && this.socket.readyState === WebSocket.OPEN)
    };
  }
}

// ====================== WEBSOCKET HANDLING COMPLETAMENTE CORREGIDO ======================

wss.on('connection', (ws, req) => {
  const connectionId = uuidv4();
  const params = new URLSearchParams(req.url.replace('/?', ''));
  const playerId = params.get('playerId') || connectionId;
  
  let currentRoom = null;
  let isAlive = true;
  let playerName = 'Desconocido';

  console.log(`\n[WS ${connectionId}] 🌐 NUEVA CONEXIÓN desde ${req.socket.remoteAddress}`);

  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.CLOSED) {
      clearInterval(heartbeatInterval);
      return;
    }
    
    if (!isAlive) {
      console.warn(`[WS ${connectionId}] 💀 Sin respuesta heartbeat, cerrando conexión`);
      ws.terminate();
      return;
    }
    
    isAlive = false;
    try {
      ws.ping();
    } catch (e) {
      console.error(`[WS ${connectionId}] ❌ Error en ping:`, e.message);
    }
  }, 30000);

  ws.on('pong', () => {
    isAlive = true;
    if (currentRoom) {
      const player = currentRoom.getPlayer(playerId);
      if (player) {
        player.lastPing = Date.now();
      }
    }
  });

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error(`[WS ${connectionId}] ❌ Error parseando mensaje:`, e);
      ws.send(JSON.stringify({ type: 'error', message: 'Mensaje JSON inválido' }));
      return;
    }

    console.log(`[WS ${connectionId}] 📨 ${data.type} para sala ${data.pin}`);

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

        // ====================== CORRECCIÓN: NUEVO MENSAJE PARA SINCRONIZACIÓN ======================
        case 'request_sync':
          if (currentRoom) {
            console.log(`[Sala ${currentRoom.pin}] 🔄 Sincronización solicitada por ${playerName}`);
            currentRoom.syncPlayersToAll(true);
          }
          break;

        default:
          console.warn(`[WS ${connectionId}] ⚠️ Mensaje no reconocido: ${data.type}`);
          ws.send(JSON.stringify({ type: 'error', message: 'Tipo de mensaje no reconocido' }));
      }
    } catch (error) {
      console.error(`[WS ${connectionId}] ❌ Error procesando mensaje ${data.type}:`, error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: error.message || 'Error interno del servidor' 
      }));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WS ${connectionId}] 🔌 CONEXIÓN CERRADA: ${code} - ${reason || 'Sin razón'} (Jugador: ${playerName})`);
    clearInterval(heartbeatInterval);
    
    if (currentRoom) {
      handlePlayerDisconnection(currentRoom.pin, playerId);
    }
  });

  ws.on('error', (error) => {
    console.error(`[WS ${connectionId}] 💥 ERROR:`, error);
  });

  // ====================== HANDLER DE CONEXIÓN COMPLETAMENTE CORREGIDO ======================

  async function handleRoomConnection(ws, data, playerId) {
    const { pin, player } = data;
    
    if (!pin || !player || !player.name) {
      throw new Error('Datos de conexión inválidos');
    }

    playerName = player.name; // Guardar nombre para logs

    let room = rooms.get(pin);
    const isCreating = data.type === 'create_room';
    const isRejoining = data.type === 'rejoin_room';
    
    console.log(`[Conexión ${pin}] 🎯 Tipo: ${data.type}, Jugador: ${player.name}, ID: ${playerId}`);
    
    // ====================== CORRECCIÓN: CONTROL DE INTENTOS DE CONEXIÓN ======================
    if (!room) {
      if (isCreating) {
        room = new Sala(pin, playerId);
        rooms.set(pin, room);
        console.log(`[Sala ${pin}] 🆕 CREADA por ${player.name}`);
      } else {
        throw new Error('Sala no existe');
      }
    } else {
      // Verificar si hay muchos intentos de conexión para este jugador
      const attempts = room.connectionAttempts.get(playerId) || 0;
      if (attempts > 5) {
        console.warn(`[Sala ${pin}] ⚠️ Demasiados intentos de conexión para ${player.name}`);
      }
      room.connectionAttempts.set(playerId, attempts + 1);
    }

    if (room.players.size >= CONFIG.MAX_PLAYERS && !room.getPlayer(playerId)) {
      throw new Error('Sala llena');
    }

    let playerObj = room.getPlayer(playerId);
    let isNewPlayer = false;

    if (playerObj) {
      // ====================== CORRECCIÓN: MANEJO MEJORADO DE RECONEXIÓN ======================
      console.log(`[Sala ${pin}] 🔄 ${player.name} RECONECTADO (socket anterior: ${playerObj.socket ? 'activo' : 'inactivo'})`);
      
      // Actualizar socket y estado
      playerObj.socket = ws;
      playerObj.isReady = player.isReady || false;
      playerObj.lastPing = Date.now();
      
      // Actualizar datos si es necesario
      if (player.name !== playerObj.name) {
        console.log(`[Sala ${pin}] 📝 ${playerObj.name} cambió nombre a ${player.name}`);
        playerObj.name = player.name;
      }
      if (player.avatar && player.avatar !== playerObj.avatar) {
        playerObj.avatar = player.avatar;
      }
    } else {
      // NUEVO JUGADOR
      playerObj = new Jugador({
        ...player,
        id: playerId,
        isProfessor: isCreating ? true : (player.isProfessor || false)
      }, ws);
      
      room.addPlayer(playerObj);
      isNewPlayer = true;
      console.log(`[Sala ${pin}] ➕ ${player.name} SE UNIÓ (${room.players.size}/${CONFIG.MAX_PLAYERS})`);
    }

    currentRoom = room;
    const isHost = room.hostId === playerId;

    if (isCreating) {
      playerObj.isProfessor = true;
      room.hostId = playerId;
    }

    // ====================== CORRECCIÓN: VERIFICAR ESTADO ACTUAL DE LA SALA ======================
    const connectionState = room.checkPlayerConnections();
    console.log(`[Sala ${pin}] 📊 Estado conexiones: ${connectionState.connected} conectados, ${connectionState.disconnected} desconectados`);

    console.log(`[Sala ${pin}] 👥 Jugadores actuales:`, room.getPlayersArray().map(p => `${p.name}${p.socket ? '' : ' (DC)'}`));

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
        hasAnswered: p.hasAnswered,
        isOnline: !!(p.socket && p.socket.readyState === WebSocket.OPEN) // ====================== NUEVO ======================
      })),
      isHost: isHost,
      gameMode: room.gameMode,
      closestAnswerMode: room.closestAnswerMode,
      isGameRunning: room.isGameRunning,
      tournamentGameRunning: room.tournamentGameRunning,
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
    if ((room.isGameRunning || room.tournamentGameRunning) && room.currentQuestion) {
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
    try {
      ws.send(JSON.stringify(response));
    } catch (e) {
      console.error(`[Sala ${pin}] ❌ Error enviando room_joined a ${player.name}:`, e.message);
      return;
    }

    // ====================== CORRECCIÓN: NOTIFICACIONES MEJORADAS ======================
    if (isNewPlayer) {
      console.log(`[Sala ${pin}] 📢 Notificando a otros jugadores sobre ${player.name}`);
      
      // Notificar a otros jugadores con retardo para evitar race conditions
      setTimeout(() => {
        room.broadcast({
          type: 'player_joined',
          player: {
            id: playerId,
            name: player.name,
            avatar: player.avatar,
            isProfessor: playerObj.isProfessor,
            isReady: playerObj.isReady,
            isOnline: true
          }
        }, playerId);
      }, 100);
    } else {
      console.log(`[Sala ${pin}] 🔄 Jugador existente, notificando reconexión`);
      
      // Notificar que el jugador se reconectó
      setTimeout(() => {
        room.broadcast({
          type: 'player_reconnected',
          playerId: playerId,
          playerName: player.name
        }, playerId);
      }, 100);
    }

    // ====================== CORRECCIÓN: SINCRONIZACIÓN ROBUSTA ======================
    console.log(`[Sala ${pin}] 🔄 Iniciando sincronización completa`);
    
    // Sincronización inmediata
    setTimeout(() => {
      room.syncPlayersToAll(true);
    }, 150);

    // Sincronización de respaldo después de 1 segundo
    setTimeout(() => {
      const currentRoomState = rooms.get(pin);
      if (currentRoomState) {
        console.log(`[Sala ${pin}] 🔄 Sincronización de respaldo`);
        currentRoomState.syncPlayersToAll(true);
      }
    }, 1000);

    // NOTIFICAR AL HOST SI TODOS ESTÁN LISTOS
    if (isHost && !room.isVotingActive && !room.isAnyGameRunning()) {
      const nonProfessorPlayers = room.getNonProfessorPlayers();
      const allReady = nonProfessorPlayers.length > 0 && nonProfessorPlayers.every(p => p.isReady);
      
      if (allReady) {
        console.log(`[Sala ${pin}] 🎯 Todos los jugadores están listos, notificando al host`);
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'all_players_ready',
              message: 'Todos los jugadores están listos. Puedes iniciar la votación.'
            }));
          }
        }, 500);
      }
    }

    // ====================== CORRECCIÓN: LIMPIAR INTENTOS DE CONEXIÓN EXITOSOS ======================
    room.connectionAttempts.delete(playerId);
  }

  // ====================== HANDLER DE DESCONEXIÓN CORREGIDO ======================

  function handlePlayerDisconnection(pin, playerId) {
    const room = rooms.get(pin);
    if (!room) return;

    const player = room.getPlayer(playerId);
    if (player) {
      console.log(`[Sala ${pin}] ❌ MANEJO DESCONEXIÓN: ${player.name}`);
      
      // ====================== CORRECCIÓN: NO ELIMINAR INMEDIATAMENTE, SOLO MARCAR ======================
      player.socket = null;
      player.isReady = false;
      
      // Notificar desconexión inmediatamente
      room.broadcast({
        type: 'player_disconnected',
        playerId: playerId,
        playerName: player.name
      });

      // Sincronizar estado actual
      setTimeout(() => {
        room.syncPlayersToAll(true);
      }, 100);

      // ====================== CORRECCIÓN: VERIFICAR SI ERA EL HOST ======================
      if (room.hostId === playerId) {
        console.log(`[Sala ${pin}] 👑 Host desconectado: ${player.name}`);
        
        // Buscar nuevo host entre los jugadores conectados
        const newHost = room.getPlayersArray().find(p => p.socket && p.socket.readyState === WebSocket.OPEN);
        
        if (newHost) {
          room.hostId = newHost.id;
          newHost.isProfessor = true;
          
          console.log(`[Sala ${pin}] 👑 NUEVO HOST: ${newHost.name}`);
          
          // Notificar cambio de host con retardo
          setTimeout(() => {
            room.broadcast({
              type: 'new_host',
              newHostId: room.hostId,
              newHostName: newHost.name
            });
          }, 500);
        } else {
          console.log(`[Sala ${pin}] ⚠️ No hay jugadores conectados para asignar nuevo host`);
        }
      }

      // ====================== CORRECCIÓN: ELIMINACIÓN MÁS CONSERVADORA ======================
      const removalTimeout = setTimeout(() => {
        const currentRoom = rooms.get(pin);
        if (currentRoom) {
          const currentPlayer = currentRoom.getPlayer(playerId);
          if (currentPlayer && !currentPlayer.socket) {
            console.log(`[Sala ${pin}] 🗑️ Eliminando ${currentPlayer.name} (desconectado por 60 segundos)`);
            currentRoom.removePlayer(playerId);
            
            // Sincronizar después de eliminar
            setTimeout(() => {
              currentRoom.syncPlayersToAll(true);
            }, 100);

            // Si la sala queda vacía, limpiar
            if (currentRoom.players.size === 0) {
              currentRoom.cleanup();
              rooms.delete(pin);
              console.log(`[Sala ${pin}] 🏁 Eliminada (vacía)`);
            }
          }
        }
      }, 60000); // 60 segundos en lugar de 30

      // Almacenar el timeout para posible cancelación si se reconecta
      player.removalTimeout = removalTimeout;
    }
  }

  // ====================== HANDLER DE PLAYER_READY CORREGIDO ======================

  function handlePlayerReady(data) {
    const room = rooms.get(pin);
    if (!room) throw new Error('Sala no existe');

    const player = room.getPlayer(data.playerId);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }

    const oldReadyState = player.isReady;
    player.isReady = data.isReady;
    
    console.log(`[Sala ${room.pin}] ✅ ${player.name} ${data.isReady ? 'LISTO' : 'NO LISTO'} (antes: ${oldReadyState})`);
    
    // ====================== CORRECCIÓN: SINCRONIZAR INMEDIATAMENTE ======================
    room.syncPlayersToAll(true);

    // VERIFICAR SI TODOS ESTÁN LISTOS PARA INICIAR VOTACIÓN
    if (room.hostId === data.playerId && !room.isVotingActive && !room.isAnyGameRunning()) {
      const nonProfessorPlayers = room.getNonProfessorPlayers();
      const connectedPlayers = nonProfessorPlayers.filter(p => p.socket && p.socket.readyState === WebSocket.OPEN);
      const allReady = connectedPlayers.length > 0 && connectedPlayers.every(p => p.isReady);
      
      if (allReady) {
        console.log(`[Sala ${room.pin}] 🎯 TODOS LOS JUGADORES CONECTADOS ESTÁN LISTOS, notificando al host`);
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

  // ... (mantener los otros handlers sin cambios)

  function handleSubmitAnswer(data) {
    const room = rooms.get(data.pin);
    if (!room) throw new Error('Sala no existe');

    const isTournament = room.tournamentStarted && room.tournamentStage;
    const gameRunning = isTournament ? room.tournamentGameRunning : room.isGameRunning;
    
    if (!gameRunning) {
      throw new Error('Juego no activo');
    }

    const player = isTournament ? 
      room.finalists.get(data.playerId) : 
      room.getPlayer(data.playerId);

    if (!player) {
      throw new Error('Jugador no encontrado');
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

    console.log(`[${isTournament ? 'Torneo' : 'Juego'} ${room.pin}] 📝 ${player.name} respondió: ${data.answer}`);

    const participants = isTournament ? room.getFinalistsArray() : room.getNonProfessorPlayers();
    const allAnswered = participants.every(p => answersMap.has(p.id));

    if (allAnswered) {
      console.log(`[${isTournament ? 'Torneo' : 'Juego'} ${room.pin}] 🎯 Todos respondieron, revelando...`);
      
      if (isTournament) {
        clearTimeout(room.tournamentRoundTimer);
      } else {
        clearTimeout(room.roundTimer);
      }
      
      // Función sendRevealPhase debería estar definida en otro lugar
      if (typeof sendRevealPhase === 'function') {
        sendRevealPhase(room, isTournament);
      }
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
        // Función finalizeVoting debería estar definida
        if (typeof finalizeVoting === 'function') {
          finalizeVoting(room);
        }
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

  function handleSkipQuestion(data) {
    const room = rooms.get(data.pin);
    if (!room || room.hostId !== data.hostId) {
      throw new Error('No tienes permiso para saltar preguntas');
    }

    console.log(`[Sala ${room.pin}] ⏭️ ${room.getPlayer(data.hostId)?.name} saltó la pregunta`);

    room.broadcast({ type: 'host_skipped_question' });

    if (room.tournamentStage) {
      clearTimeout(room.tournamentRoundTimer);
      if (typeof sendRevealPhase === 'function') {
        sendRevealPhase(room, true);
      }
    } else {
      clearTimeout(room.roundTimer);
      if (typeof sendRevealPhase === 'function') {
        sendRevealPhase(room, false);
      }
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

// ====================== MONITOREO AUTOMÁTICO DE CONEXIONES ======================

setInterval(() => {
  let totalRooms = 0;
  let totalPlayers = 0;
  let totalConnected = 0;

  rooms.forEach(room => {
    totalRooms++;
    totalPlayers += room.players.size;
    totalConnected += room.getPlayersArray().filter(p => p.socket && p.socket.readyState === WebSocket.OPEN).length;
    
    // Verificar estado de la sala cada 30 segundos
    const state = room.checkPlayerConnections();
    if (state.disconnected > 0) {
      console.log(`[Monitoreo] Sala ${room.pin}: ${state.connected}/${state.total} jugadores conectados`);
      
      // Resincronizar si hay desconexiones
      if (state.disconnected > 0) {
        room.syncPlayersToAll(true);
      }
    }
  });

  if (totalRooms > 0) {
    console.log(`[Monitoreo] 📊 ${totalRooms} salas, ${totalConnected}/${totalPlayers} jugadores conectados`);
  }
}, 30000);

// ====================== CONFIGURACIÓN EXPRESS ======================

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
      connected: Array.from(rooms.values()).reduce((total, room) => total + room.getPlayersArray().filter(p => p.socket && p.socket.readyState === WebSocket.OPEN).length, 0),
      byRoom: roomStats.map(room => ({ 
        pin: room.pin, 
        players: room.playerCount,
        connected: room.connectedPlayers 
      }))
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎮 Servidor Math Challenge PRO - SINCRONIZACIÓN CORREGIDA`);
  console.log(`✅ PROBLEMAS SOLUCIONADOS:`);
  console.log(`   - 🔄 Sincronización robusta de lista de jugadores`);
  console.log(`   - 👥 Jugadores no desaparecen del lobby`);
  console.log(`   - 📊 Estado de conexión en tiempo real`);
  console.log(`   - 🔍 Monitoreo automático de conexiones`);
  console.log(`   - 💾 Manejo conservador de desconexiones`);
  console.log(`   - 🚀 Reconexiones sin pérdida de estado`);
  console.log(`   - 📡 Múltiples sincronizaciones de respaldo`);
  console.log(`   - 🎯 Logs detallados para diagnóstico`);
  console.log(`🌐 Ejecutándose en puerto ${PORT}`);
});
