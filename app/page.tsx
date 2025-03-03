"use client";

import { useState, useEffect } from "react";
import { Trophy, Bath as Bat, Dice6, Users, Copy, Check, RefreshCw } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref, set, onValue, remove, update, get } from "firebase/database";

type GameState = "home" | "create" | "join" | "toss" | "choice" | "batting" | "bowling" | "finished" | "waiting";
type InningsState = "first" | "second";
type PlayerRole = "host" | "guest" | null;

interface GameRoom {
  id: string;
  hostName: string;
  guestName?: string;
  gameState: GameState;
  inningsState: InningsState;
  tossWinner?: "host" | "guest";
  battingTeam?: "host" | "guest";
  hostScore: number;
  guestScore: number;
  hostWickets: number;
  guestWickets: number;
  currentBalls: number;
  hostChoice?: number;
  guestChoice?: number;
  target?: number;
  gameResult?: string;
  lastUpdated: number;
}

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [playerRole, setPlayerRole] = useState<PlayerRole>(null);
  const [gameState, setGameState] = useState<GameState>("home");
  const [inningsState, setInningsState] = useState<InningsState>("first");
  const [tossWinner, setTossWinner] = useState<"host" | "guest" | null>(null);
  const [battingTeam, setBattingTeam] = useState<"host" | "guest" | null>(null);
  const [hostScore, setHostScore] = useState(0);
  const [guestScore, setGuestScore] = useState(0);
  const [hostWickets, setHostWickets] = useState(0);
  const [guestWickets, setGuestWickets] = useState(0);
  const [currentBalls, setCurrentBalls] = useState(0);
  const [hostChoice, setHostChoice] = useState<number | null>(null);
  const [guestChoice, setGuestChoice] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<string>("");
  const [target, setTarget] = useState<number | null>(null);
  const [opponentName, setOpponentName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState("");

  const maxBalls = 12;
  const maxWickets = 2;

  // Generate a random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create a new game room
  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setPlayerRole("host");

    const roomRef = ref(database, `rooms/${newRoomId}`);
    const newRoom: GameRoom = {
      id: newRoomId,
      hostName: playerName,
      gameState: "waiting",
      inningsState: "first",
      hostScore: 0,
      guestScore: 0,
      hostWickets: 0,
      guestWickets: 0,
      currentBalls: 0,
      lastUpdated: Date.now()
    };

    set(roomRef, newRoom);
    setGameState("waiting");
    setWaitingMessage("Waiting for opponent to join...");
  };

  // Join an existing game room
  const joinRoom = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!joinRoomId.trim()) {
      alert("Please enter a room code");
      return;
    }

    const roomRef = ref(database, `rooms/${joinRoomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      alert("Room not found");
      return;
    }

    const roomData = snapshot.val() as GameRoom;
    
    if (roomData.guestName) {
      alert("Room is already full");
      return;
    }

    setRoomId(joinRoomId);
    setPlayerRole("guest");
    setOpponentName(roomData.hostName);

    update(roomRef, {
      guestName: playerName,
      gameState: "toss",
      lastUpdated: Date.now()
    });
  };

  // Handle the coin toss
  const handleToss = () => {
    if (!roomId || playerRole !== "host") return;

    const result = Math.random() < 0.5 ? "host" : "guest";
    setTossWinner(result);

    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
      tossWinner: result,
      gameState: result === "guest" ? "choice" : "toss",
      lastUpdated: Date.now()
    });

    if (result === "host") {
      setGameState("choice");
    }
  };

  // Handle bat/bowl choice after winning the toss
  const handleBatBowlChoice = (choice: "bat" | "bowl") => {
    if (!roomId) return;

    const isBatting = choice === "bat";
    const newBattingTeam = isBatting ? playerRole : (playerRole === "host" ? "guest" : "host");
    setBattingTeam(newBattingTeam);

    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
      battingTeam: newBattingTeam,
      gameState: isBatting ? "batting" : "bowling",
      lastUpdated: Date.now()
    });
  };

  // Switch innings
  const switchInnings = () => {
    if (!roomId || !battingTeam) return;

    setInningsState("second");
    const newBattingTeam = battingTeam === "host" ? "guest" : "host";
    setBattingTeam(newBattingTeam);
    setCurrentBalls(0);
    
    const targetScore = battingTeam === "host" ? hostScore + 1 : guestScore + 1;
    setTarget(targetScore);

    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
      inningsState: "second",
      battingTeam: newBattingTeam,
      currentBalls: 0,
      target: targetScore,
      hostChoice: null,
      guestChoice: null,
      gameState: playerRole === newBattingTeam ? "batting" : "bowling",
      lastUpdated: Date.now()
    });
  };

  // Handle number choice during play
  const handleNumberChoice = (number: number) => {
    if (!roomId || !playerRole || !battingTeam) return;
    
    const isBatting = playerRole === battingTeam;
    const gameStateCheck = isBatting ? "batting" : "bowling";
    
    if (gameState !== gameStateCheck) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    
    if (playerRole === "host") {
      setHostChoice(number);
      update(roomRef, {
        hostChoice: number,
        lastUpdated: Date.now()
      });
    } else {
      setGuestChoice(number);
      update(roomRef, {
        guestChoice: number,
        lastUpdated: Date.now()
      });
    }
  };

  // Process the result when both players have made their choices
  const processResult = () => {
    if (!roomId || !playerRole || !battingTeam || hostChoice === null || guestChoice === null) return;

    const batting = battingTeam === "host";
    const batsmanChoice = batting ? hostChoice : guestChoice;
    const bowlerChoice = batting ? guestChoice : hostChoice;

    if (batsmanChoice === bowlerChoice) {
      // Wicket
      if (batting) {
        setHostWickets(prev => prev + 1);
      } else {
        setGuestWickets(prev => prev + 1);
      }
    } else {
      // Runs scored
      if (batting) {
        setHostScore(prev => prev + batsmanChoice);
      } else {
        setGuestScore(prev => prev + batsmanChoice);
      }
    }

    setCurrentBalls(prev => prev + 1);
    setHostChoice(null);
    setGuestChoice(null);

    const roomRef = ref(database, `rooms/${roomId}`);
    const updates: any = {
      currentBalls: currentBalls + 1,
      hostChoice: null,
      guestChoice: null,
      lastUpdated: Date.now()
    };

    if (batsmanChoice === bowlerChoice) {
      if (batting) {
        updates.hostWickets = hostWickets + 1;
      } else {
        updates.guestWickets = guestWickets + 1;
      }
    } else {
      if (batting) {
        updates.hostScore = hostScore + batsmanChoice;
      } else {
        updates.guestScore = guestScore + batsmanChoice;
      }
    }

    update(roomRef, updates);
  };

  // Check if the innings is over
  const checkInningsEnd = () => {
    if (!roomId || !battingTeam) return;

    const isInningsOver = currentBalls === maxBalls || 
      (battingTeam === "host" && hostWickets === maxWickets) ||
      (battingTeam === "guest" && guestWickets === maxWickets);

    if (isInningsOver) {
      if (inningsState === "first") {
        switchInnings();
      } else {
        finishGame();
      }
    }
  };

  // Check if the chase is complete in the second innings
  const checkChaseComplete = () => {
    if (!roomId || !battingTeam || inningsState !== "second" || !target) return;

    const chasingScore = battingTeam === "host" ? hostScore : guestScore;
    if (chasingScore >= target) {
      finishGame();
    }
  };

  // Finish the game and determine the winner
  const finishGame = () => {
    if (!roomId) return;

    let result = "";
    if (hostScore > guestScore) {
      result = "Host wins!";
    } else if (guestScore > hostScore) {
      result = "Guest wins!";
    } else {
      result = "It's a tie!";
    }

    setGameResult(result);
    setGameState("finished");

    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
      gameState: "finished",
      gameResult: result,
      lastUpdated: Date.now()
    });
  };

  // Copy room code to clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start a new game
  const startNewGame = () => {
    if (!roomId || !playerRole) return;

    // Reset all game state
    setGameState("toss");
    setInningsState("first");
    setTossWinner(null);
    setBattingTeam(null);
    setHostScore(0);
    setGuestScore(0);
    setHostWickets(0);
    setGuestWickets(0);
    setCurrentBalls(0);
    setHostChoice(null);
    setGuestChoice(null);
    setGameResult("");
    setTarget(null);

    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
      gameState: "toss",
      inningsState: "first",
      tossWinner: null,
      battingTeam: null,
      hostScore: 0,
      guestScore: 0,
      hostWickets: 0,
      guestWickets: 0,
      currentBalls: 0,
      hostChoice: null,
      guestChoice: null,
      gameResult: "",
      target: null,
      lastUpdated: Date.now()
    });
  };

  // Leave the current game
  const leaveGame = () => {
    if (!roomId) return;

    // If host leaves, delete the room
    if (playerRole === "host") {
      const roomRef = ref(database, `rooms/${roomId}`);
      remove(roomRef);
    } else if (playerRole === "guest") {
      // If guest leaves, update the room
      const roomRef = ref(database, `rooms/${roomId}`);
      update(roomRef, {
        guestName: null,
        gameState: "waiting",
        lastUpdated: Date.now()
      });
    }

    // Reset local state
    setRoomId("");
    setPlayerRole(null);
    setGameState("home");
    setOpponentName("");
  };

  // Calculate remaining runs needed
  const getRemainingRuns = () => {
    if (!target) return null;
    const battingScore = battingTeam === "host" ? hostScore : guestScore;
    return target - battingScore;
  };

  // Calculate remaining balls
  const getRemainingBalls = () => {
    return maxBalls - currentBalls;
  };

  // Listen for changes in the game room
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted
        if (playerRole === "guest") {
          alert("The host has left the game");
          setRoomId("");
          setPlayerRole(null);
          setGameState("home");
          setOpponentName("");
        }
        return;
      }

      const roomData = snapshot.val() as GameRoom;
      
      // Update opponent name
      if (playerRole === "host" && roomData.guestName) {
        setOpponentName(roomData.guestName);
        if (gameState === "waiting") {
          setGameState("toss");
        }
      } else if (playerRole === "guest" && roomData.hostName) {
        setOpponentName(roomData.hostName);
      }

      // Update game state
      setGameState(roomData.gameState);
      setInningsState(roomData.inningsState);
      setTossWinner(roomData.tossWinner || null);
      setBattingTeam(roomData.battingTeam || null);
      setHostScore(roomData.hostScore);
      setGuestScore(roomData.guestScore);
      setHostWickets(roomData.hostWickets);
      setGuestWickets(roomData.guestWickets);
      setCurrentBalls(roomData.currentBalls);
      setHostChoice(roomData.hostChoice !== undefined ? roomData.hostChoice : null);
      setGuestChoice(roomData.guestChoice !== undefined ? roomData.guestChoice : null);
      setTarget(roomData.target || null);
      
      if (roomData.gameResult) {
        setGameResult(roomData.gameResult);
      }
    });

    return () => unsubscribe();
  }, [roomId, playerRole, gameState]);

  // Process the result when both players have made their choices
  useEffect(() => {
    if (hostChoice !== null && guestChoice !== null) {
      processResult();
    }
  }, [hostChoice, guestChoice]);

  // Check for innings end or chase complete
  useEffect(() => {
    checkInningsEnd();
    checkChaseComplete();
  }, [currentBalls, hostWickets, guestWickets, hostScore, guestScore]);

  // Clean up old rooms (could be implemented with a cloud function in a real app)
  useEffect(() => {
    // This would typically be handled server-side
    return () => {
      if (roomId && playerRole === "host") {
        const roomRef = ref(database, `rooms/${roomId}`);
        remove(roomRef);
      }
    };
  }, []);

  // Get player name based on role
  const getPlayerName = (role: "host" | "guest") => {
    if (playerRole === role) {
      return playerName + " (You)";
    }
    return role === "host" ? opponentName : opponentName;
  };

  // Determine if it's the player's turn
  const isPlayerTurn = () => {
    if (!playerRole || !battingTeam) return false;
    
    const isBatting = playerRole === battingTeam;
    return (isBatting && gameState === "batting") || (!isBatting && gameState === "bowling");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="min-h-screen bg-zinc-900/50 px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-5">
            <div className="bg-gradient-to-r from-zinc-800/80 to-zinc-900/80 p-5 rounded-2xl shadow-2xl border border-zinc-700/50">
              <h1 className="text-4xl font-bold flex items-center justify-center gap-2 text-white">
                <Bat className="w-8 h-8 text-zinc-400" />
                <span className="bg-gradient-to-r from-white to-zinc-400 text-transparent bg-clip-text">
                  Hand Cricket
                </span>
              </h1>
            </div>
          </div>

          <div className="bg-gradient-to-b from-zinc-800/90 to-zinc-900/90 p-5 rounded-2xl shadow-2xl border border-zinc-700/50">
            {gameState === "home" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-4">Play with Friends</h2>
                  <p className="text-zinc-400 text-sm mb-6">Enter your name to create or join a game</p>
                  
                  <div className="mb-6">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setGameState("create")}
                      className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-4 py-3 rounded-xl font-medium text-sm hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50 flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Create Game
                    </button>
                    <button
                      onClick={() => setGameState("join")}
                      className="bg-gradient-to-r from-zinc-800 to-zinc-900 text-white px-4 py-3 rounded-xl font-medium text-sm hover:from-zinc-700 hover:to-zinc-800 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50 flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Join Game
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gameState === "create" && (
              <div className="space-y-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Create Game</h2>
                <p className="text-zinc-400 text-sm mb-4">Click below to create a new game room</p>
                
                <button
                  onClick={createRoom}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-8 py-3 rounded-xl font-bold text-base hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50 w-full"
                >
                  Create Room
                </button>
                
                <button
                  onClick={() => setGameState("home")}
                  className="text-zinc-400 text-sm hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {gameState === "join" && (
              <div className="space-y-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Join Game</h2>
                <p className="text-zinc-400 text-sm mb-4">Enter the room code to join a game</p>
                
                <div className="mb-6">
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    placeholder="Room Code"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 uppercase"
                    maxLength={6}
                  />
                </div>
                
                <button
                  onClick={joinRoom}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-8 py-3 rounded-xl font-bold text-base hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50 w-full"
                >
                  Join Room
                </button>
                
                <button
                  onClick={() => setGameState("home")}
                  className="text-zinc-400 text-sm hover:text-white transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {gameState === "waiting" && (
              <div className="space-y-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Waiting for Opponent</h2>
                
                <div className="bg-zinc-800/80 p-4 rounded-xl border border-zinc-700/50 mb-6">
                  <p className="text-zinc-300 text-sm mb-2">Share this code with your friend:</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="bg-zinc-900 px-4 py-2 rounded-lg text-white font-mono text-lg tracking-wider">
                      {roomId}
                    </div>
                    <button 
                      onClick={copyRoomCode}
                      className="bg-zinc-700 p-2 rounded-lg hover:bg-zinc-600 transition-colors"
                    >
                      {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <div className="animate-pulse flex items-center gap-2 text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{waitingMessage}</span>
                  </div>
                </div>
                
                <button
                  onClick={leaveGame}
                  className="text-zinc-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {gameState === "toss" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Time for Toss!</h2>
                
                {roomId && (
                  <div className="bg-zinc-800/80 p-3 rounded-lg mb-6 flex items-center justify-between">
                    <span className="text-zinc-300 text-xs">Room: {roomId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 text-xs">vs {opponentName}</span>
                    </div>
                  </div>
                )}
                
                {playerRole === "host" ? (
                  <button
                    onClick={handleToss}
                    className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-8 py-3 rounded-xl font-bold text-base shadow-lg hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50 flex items-center justify-center gap-2 mx-auto"
                  >
                    <Dice6 className="w-5 h-5" />
                    Toss Coin
                  </button>
                ) : (
                  <div className="animate-pulse flex items-center justify-center gap-2 text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Waiting for host to toss the coin...</span>
                  </div>
                )}
              </div>
            )}

            {gameState === "choice" && (
              <div className="space-y-4 text-center">
                {tossWinner === playerRole ? (
                  <>
                    <h2 className="text-2xl font-bold text-white mb-4">You won the toss!</h2>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => handleBatBowlChoice("bat")}
                        className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-6 py-2 rounded-lg font-medium text-sm hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50"
                      >
                        Bat First
                      </button>
                      <button
                        onClick={() => handleBatBowlChoice("bowl")}
                        className="bg-gradient-to-r from-zinc-800 to-zinc-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:from-zinc-700 hover:to-zinc-800 transition-all transform hover:scale-105 duration-200 border border-zinc-600/50"
                      >
                        Bowl First
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse flex items-center justify-center gap-2 text-zinc-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{opponentName} won the toss and is choosing...</span>
                  </div>
                )}
              </div>
            )}

            {(gameState === "batting" || gameState === "bowling") && (
              <div className="space-y-5">
                {roomId && (
                  <div className="bg-zinc-800/80 p-3 rounded-lg mb-2 flex items-center justify-between">
                    <span className="text-zinc-300 text-xs">Room: {roomId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 text-xs">vs {opponentName}</span>
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 rounded-xl border border-zinc-700/50">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-zinc-300">{getPlayerName("host")}</h3>
                      <p className="text-3xl font-bold text-white">{hostScore}/{hostWickets}</p>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-zinc-300">{getPlayerName("guest")}</h3>
                      <p className="text-3xl font-bold text-white">{guestScore}/{guestWickets}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-center space-y-2 border-t border-zinc-700/50 pt-3">
                    <p className="text-sm text-zinc-400">
                      {inningsState === "first" ? "1st Innings" : "2nd Innings"} • Balls: {currentBalls}/{maxBalls}
                    </p>
                    {target && (
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-300 font-medium">
                          Target: {target} runs
                        </p>
                        <p className="text-xs text-zinc-400 font-medium">
                          Need {getRemainingRuns()} runs from {getRemainingBalls()} balls
                        </p>
                        <p className="text-xs text-zinc-500">
                          RR: {((getRemainingRuns() || 0) / Math.max(getRemainingBalls(), 1)).toFixed(1)} runs/ball
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center bg-gradient-to-r from-zinc-800 to-zinc-900 p-3 rounded-lg border border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-400 mb-1">
                      {playerRole === "host" ? "Your Choice" : `${opponentName}'s Choice`}
                    </p>
                    <p className="text-2xl font-bold text-white">{hostChoice !== null ? hostChoice : "-"}</p>
                  </div>
                  <div className="text-center bg-gradient-to-r from-zinc-800 to-zinc-900 p-3 rounded-lg border border-zinc-700/50">
                    <p className="text-xs font-medium text-zinc-400 mb-1">
                      {playerRole === "guest" ? "Your Choice" : `${opponentName}'s Choice`}
                    </p>
                    <p className="text-2xl font-bold text-white">{guestChoice !== null ? guestChoice : "-"}</p>
                  </div>
                </div>

                {isPlayerTurn() ? (
                  <div>
                    <p className="text-center text-zinc-300 text-sm mb-3">
                      {gameState === "batting" ? "You're batting! Choose a number:" : "You're bowling! Choose a number:"}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((number) => (
                        <button
                          key={number}
                          onClick={() => handleNumberChoice(number)}
                          className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white p-3 rounded-lg font-bold text-xl hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 shadow-md border border-zinc-600/50"
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="animate-pulse flex items-center justify-center gap-2 text-zinc-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Waiting for {opponentName} to choose...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState === "finished" && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Trophy className="w-12 h-12 text-zinc-400 animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-white to-zinc-400 bg-clip-text">
                  {gameResult.replace("Host", getPlayerName("host").replace(" (You)", "")).replace("Guest", getPlayerName("guest").replace(" (You)", ""))}
                </h2>
                <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 rounded-lg border border-zinc-700/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-300">{getPlayerName("host")}</h3>
                      <p className="text-2xl font-bold text-white">{hostScore}/{hostWickets}</p>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-300">{getPlayerName("guest")}</h3>
                      <p className="text-2xl font-bold text-white">{guestScore}/{guestWickets}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={startNewGame}
                    className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white px-6 py-2 rounded-lg font-medium text-sm hover:from-zinc-600 hover:to-zinc-700 transition-all transform hover:scale-105 duration-200 shadow-md border border-zinc-600/50"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={leaveGame}
                    className="bg-gradient-to-r from-zinc-800 to-zinc-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:from-zinc-700 hover:to-zinc-800 transition-all transform hover:scale-105 duration-200 shadow-md border border-zinc-600/50"
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}