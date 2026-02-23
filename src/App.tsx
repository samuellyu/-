/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Rocket as RocketIcon, Trophy, RotateCcw, Play, Pause, Info } from 'lucide-react';
import { 
  Point, 
  Rocket, 
  Interceptor, 
  Explosion, 
  City, 
  Battery, 
  GameStatus, 
  GameState 
} from './types';

// Constants
const TARGET_SCORE = 3000;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const EXPLOSION_MAX_RADIUS = 40;
const EXPLOSION_SPEED = 1.5;
const ROCKET_SPEED_BASE = 0.8;
const INTERCEPTOR_SPEED = 6;
const SPAWN_RATE_BASE = 0.015;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    status: 'START',
    rockets: [],
    interceptors: [],
    explosions: [],
    cities: [
      { id: 'c1', pos: { x: 150, y: 550 }, destroyed: false },
      { id: 'c2', pos: { x: 250, y: 550 }, destroyed: false },
      { id: 'c3', pos: { x: 350, y: 550 }, destroyed: false },
      { id: 'c4', pos: { x: 450, y: 550 }, destroyed: false },
      { id: 'c5', pos: { x: 550, y: 550 }, destroyed: false },
      { id: 'c6', pos: { x: 650, y: 550 }, destroyed: false },
    ],
    batteries: [
      { id: 'b1', pos: { x: 50, y: 550 }, ammo: 20, maxAmmo: 20, destroyed: false },
      { id: 'b2', pos: { x: 400, y: 550 }, ammo: 40, maxAmmo: 40, destroyed: false },
      { id: 'b3', pos: { x: 750, y: 550 }, ammo: 20, maxAmmo: 20, destroyed: false },
    ],
    destroyedCount: 0,
  });

  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const requestRef = useRef<number>(null);
  const stateRef = useRef<GameState>(gameState);

  // Sync ref with state for the game loop
  useEffect(() => {
    stateRef.current = gameState;
  }, [gameState]);

  const t = {
    zh: {
      title: '果果新星防御',
      start: '开始游戏',
      restart: '再玩一次',
      gameOver: '游戏结束',
      win: '防御成功！',
      score: '得分',
      target: '目标',
      ammo: '弹药',
      level: '关卡',
      power: '威力',
      instructions: '点击屏幕发射拦截导弹。保护城市和炮台！',
      lostMsg: '所有炮台已被摧毁。',
      winMsg: '你成功保卫了地球！',
    },
    en: {
      title: 'Fruit Nova Defense',
      start: 'Start Game',
      restart: 'Play Again',
      gameOver: 'Game Over',
      win: 'Victory!',
      score: 'Score',
      target: 'Target',
      ammo: 'Ammo',
      level: 'Level',
      power: 'Power',
      instructions: 'Click to fire interceptors. Protect cities and batteries!',
      lostMsg: 'All batteries destroyed.',
      winMsg: 'You successfully defended Earth!',
    }
  }[lang];

  const initGame = useCallback(() => {
    setGameState({
      score: 0,
      level: 1,
      status: 'PLAYING',
      rockets: [],
      interceptors: [],
      explosions: [],
      cities: [
        { id: 'c1', pos: { x: 150, y: 550 }, destroyed: false },
        { id: 'c2', pos: { x: 250, y: 550 }, destroyed: false },
        { id: 'c3', pos: { x: 350, y: 550 }, destroyed: false },
        { id: 'c4', pos: { x: 450, y: 550 }, destroyed: false },
        { id: 'c5', pos: { x: 550, y: 550 }, destroyed: false },
        { id: 'c6', pos: { x: 650, y: 550 }, destroyed: false },
      ],
      batteries: [
        { id: 'b1', pos: { x: 50, y: 550 }, ammo: 20, maxAmmo: 20, destroyed: false },
        { id: 'b2', pos: { x: 400, y: 550 }, ammo: 40, maxAmmo: 40, destroyed: false },
        { id: 'b3', pos: { x: 750, y: 550 }, ammo: 20, maxAmmo: 20, destroyed: false },
      ],
      destroyedCount: 0,
    });
  }, []);

  const spawnRocket = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'PLAYING') return;

    // Filter available targets
    const availableTargets = [
      ...s.cities.filter(c => !c.destroyed).map(c => c.pos),
      ...s.batteries.filter(b => !b.destroyed).map(b => b.pos)
    ];

    if (availableTargets.length === 0) return;

    const target = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    const startX = Math.random() * CANVAS_WIDTH;
    const id = Math.random().toString(36).substr(2, 9);
    
    const angle = Math.atan2(target.y, target.x - startX);
    
    const newRocket: Rocket = {
      id,
      pos: { x: startX, y: 0 },
      target,
      speed: ROCKET_SPEED_BASE + (s.level * 0.2),
      angle
    };

    setGameState(prev => ({
      ...prev,
      rockets: [...prev.rockets, newRocket]
    }));
  }, []);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    const s = stateRef.current;
    if (s.status !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Find nearest battery with ammo
    let nearestBatteryIdx = -1;
    let minDist = Infinity;

    s.batteries.forEach((b, idx) => {
      if (!b.destroyed) {
        const dist = Math.abs(b.pos.x - x);
        if (dist < minDist) {
          minDist = dist;
          nearestBatteryIdx = idx;
        }
      }
    });

    if (nearestBatteryIdx !== -1) {
      const battery = s.batteries[nearestBatteryIdx];
      const id = Math.random().toString(36).substr(2, 9);
      const currentPower = 0.5 + Math.floor(s.destroyedCount / 5) * 0.5;
      
      const newInterceptor: Interceptor = {
        id,
        pos: { ...battery.pos },
        origin: { ...battery.pos },
        target: { x, y },
        speed: INTERCEPTOR_SPEED,
        batteryIndex: nearestBatteryIdx
      };

      setGameState(prev => {
        return {
          ...prev,
          interceptors: [...prev.interceptors, newInterceptor]
        };
      });
    }
  };

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'PLAYING') return;

    // 1. Spawn rockets
    if (Math.random() < SPAWN_RATE_BASE + (s.level * 0.005)) {
      spawnRocket();
    }

    setGameState(prev => {
      let { rockets, interceptors, explosions, cities, batteries, score, status, destroyedCount } = prev;

      // 2. Update Rockets
      rockets = rockets.map(r => {
        const dx = r.target.x - r.pos.x;
        const dy = r.target.y - r.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < r.speed) {
          // Hit target
          const cityHit = cities.find(c => c.pos.x === r.target.x && c.pos.y === r.target.y);
          if (cityHit) cityHit.destroyed = true;
          
          const batteryHit = batteries.find(b => b.pos.x === r.target.x && b.pos.y === r.target.y);
          if (batteryHit) batteryHit.destroyed = true;

          return null;
        }

        const vx = (dx / dist) * r.speed;
        const vy = (dy / dist) * r.speed;
        return { ...r, pos: { x: r.pos.x + vx, y: r.pos.y + vy } };
      }).filter(Boolean) as Rocket[];

      // 3. Update Interceptors
      interceptors = interceptors.map(i => {
        const dx = i.target.x - i.pos.x;
        const dy = i.target.y - i.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < i.speed) {
          // Create explosion
          const currentPower = 0.5 + Math.floor(destroyedCount / 5) * 0.5;
          explosions.push({
            id: Math.random().toString(36).substr(2, 9),
            pos: { ...i.target },
            radius: 2,
            maxRadius: EXPLOSION_MAX_RADIUS * currentPower,
            growing: true,
            alpha: 1
          });
          return null;
        }

        const vx = (dx / dist) * i.speed;
        const vy = (dy / dist) * i.speed;
        return { ...i, pos: { x: i.pos.x + vx, y: i.pos.y + vy } };
      }).filter(Boolean) as Interceptor[];

      // 4. Update Explosions
      explosions = explosions.map(e => {
        if (e.growing) {
          e.radius += EXPLOSION_SPEED;
          if (e.radius >= e.maxRadius) e.growing = false;
        } else {
          e.radius -= EXPLOSION_SPEED * 0.5;
          e.alpha -= 0.02;
        }
        return e.radius > 0 && e.alpha > 0 ? e : null;
      }).filter(Boolean) as Explosion[];

      // 5. Collision Detection: Explosions vs Rockets
      rockets = rockets.map(r => {
        const hit = explosions.some(e => {
          const dx = r.pos.x - e.pos.x;
          const dy = r.pos.y - e.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist < e.radius;
        });

        if (hit) {
          score += 50;
          destroyedCount += 1;
          return null;
        }
        return r;
      }).filter(Boolean) as Rocket[];

      // 6. Check Win/Loss and Level Up
      if (score >= TARGET_SCORE) {
        status = 'WON';
      } else if (batteries.every(b => b.destroyed)) {
        status = 'LOST';
      } else {
        // Level up every 500 points
        const newLevel = Math.floor(score / 500) + 1;
        if (newLevel > prev.level) {
          // Level Up! Refill ammo and clear screen
          batteries = batteries.map(b => ({ ...b, ammo: b.maxAmmo }));
          return { ...prev, level: newLevel, batteries, rockets: [], interceptors: [], score };
        }
      }

      return { ...prev, rockets, interceptors, explosions, cities, batteries, score, status, destroyedCount };
    });
  }, [spawnRocket]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    // 1. Draw Space Background (Deep Gradient)
    const spaceGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    spaceGradient.addColorStop(0, '#020617'); // slate-950
    spaceGradient.addColorStop(0.5, '#0f172a'); // slate-900
    spaceGradient.addColorStop(1, '#1e1b4b'); // indigo-950
    ctx.fillStyle = spaceGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Stars (Static for now, but could be animated)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * canvas.height * 0.9;
      const size = Math.random() * 1.5;
      const alpha = 0.2 + Math.random() * 0.8;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 3. Draw Tech Grid (Subtle)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)'; // sky-400 very transparent
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 4. Draw Earth Horizon (Curved and Glowing)
    const earthY = 550;
    const earthRadius = 1200;
    const earthCenterX = canvas.width / 2;
    const earthCenterY = earthY + earthRadius - 20;

    // Atmosphere Glow
    const atmosGlow = ctx.createRadialGradient(
      earthCenterX, earthCenterY, earthRadius - 40,
      earthCenterX, earthCenterY, earthRadius + 20
    );
    atmosGlow.addColorStop(0, 'rgba(14, 165, 233, 0.4)'); // sky-500
    atmosGlow.addColorStop(0.5, 'rgba(14, 165, 233, 0.1)');
    atmosGlow.addColorStop(1, 'rgba(14, 165, 233, 0)');

    ctx.fillStyle = atmosGlow;
    ctx.beginPath();
    ctx.arc(earthCenterX, earthCenterY, earthRadius + 20, 0, Math.PI * 2);
    ctx.fill();

    // Earth Body
    const earthGradient = ctx.createLinearGradient(0, earthY, 0, canvas.height);
    earthGradient.addColorStop(0, '#0c4a6e'); // sky-900
    earthGradient.addColorStop(1, '#082f49'); // sky-950
    ctx.fillStyle = earthGradient;
    ctx.beginPath();
    ctx.arc(earthCenterX, earthCenterY, earthRadius, 0, Math.PI * 2);
    ctx.fill();

    // Earth Surface Detail (Tech lines on Earth)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(earthCenterX, earthCenterY, earthRadius - 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Draw Cities
    s.cities.forEach(c => {
      if (!c.destroyed) {
        // Tech City Look
        ctx.fillStyle = '#10b981'; // emerald-500
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';
        ctx.fillRect(c.pos.x - 12, c.pos.y - 15, 24, 15);
        ctx.fillRect(c.pos.x - 6, c.pos.y - 25, 12, 10);
        ctx.shadowBlur = 0;
        
        // Windows
        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(c.pos.x - 8, c.pos.y - 12, 4, 4);
        ctx.fillRect(c.pos.x + 4, c.pos.y - 12, 4, 4);
      } else {
        ctx.fillStyle = '#3f3f46'; // zinc-600
        ctx.fillRect(c.pos.x - 15, c.pos.y - 5, 30, 5);
      }
    });

    // Draw Batteries
    s.batteries.forEach(b => {
      if (!b.destroyed) {
        ctx.fillStyle = '#3b82f6'; // blue-500
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#3b82f6';
        
        // Base
        ctx.beginPath();
        ctx.moveTo(b.pos.x - 20, b.pos.y);
        ctx.lineTo(b.pos.x - 10, b.pos.y - 20);
        ctx.lineTo(b.pos.x + 10, b.pos.y - 20);
        ctx.lineTo(b.pos.x + 20, b.pos.y);
        ctx.fill();
        
        // Cannon
        ctx.fillRect(b.pos.x - 4, b.pos.y - 35, 8, 15);
        
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ef4444'; // red-500
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Rockets
    s.rockets.forEach(r => {
      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Line from top to current pos
      ctx.moveTo(r.pos.x - (r.pos.x - r.target.x) * 0.1, 0); // Slight trail effect
      ctx.lineTo(r.pos.x, r.pos.y);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(r.pos.x, r.pos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Interceptors
    s.interceptors.forEach(i => {
      ctx.strokeStyle = '#3b82f6'; // blue-500
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i.origin.x, i.origin.y);
      ctx.lineTo(i.pos.x, i.pos.y);
      ctx.stroke();

      // Target marker 'H'
      ctx.strokeStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('H', i.target.x, i.target.y);
    });

    // Draw Explosions
    s.explosions.forEach(e => {
      const gradient = ctx.createRadialGradient(e.pos.x, e.pos.y, 0, e.pos.x, e.pos.y, e.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${e.alpha})`);
      gradient.addColorStop(0.4, `rgba(251, 191, 36, ${e.alpha})`); // amber-400
      gradient.addColorStop(1, `rgba(239, 68, 68, 0)`); // red-500 transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    });

  }, []);

  const gameLoop = useCallback(() => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-zinc-950 select-none">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-mono tracking-wider">
              {t.score}: <span className="text-amber-400 font-bold">{gameState.score}</span> / {TARGET_SCORE}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-mono tracking-wider">
              {t.ammo}: <span className="text-blue-400 font-bold">∞</span>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <RocketIcon className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-mono tracking-wider">
              {t.level}: <span className="text-purple-400 font-bold">{gameState.level}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono tracking-wider">
              {t.power}: <span className="text-cyan-400 font-bold">x{(0.5 + Math.floor(gameState.destroyedCount / 5) * 0.5).toFixed(1)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="pointer-events-auto bg-black/40 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-xs hover:bg-white/10 transition-colors"
          >
            {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative aspect-[4/3] w-full max-w-4xl bg-zinc-900 shadow-2xl overflow-hidden border border-white/5 cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="w-full h-full block"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState.status !== 'PLAYING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-20"
            >
              {gameState.status === 'START' && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="max-w-md"
                >
                  <h1 className="text-6xl font-black mb-4 tracking-tighter game-text text-emerald-400 drop-shadow-lg">
                    {t.title}
                  </h1>
                  <p className="text-zinc-400 mb-8 text-lg">
                    {t.instructions}
                  </p>
                  <button
                    onClick={initGame}
                    className="group relative flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <span className="text-xl">{t.start}</span>
                  </button>
                </motion.div>
              )}

              {gameState.status === 'LOST' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-md"
                >
                  <h2 className="text-5xl font-black mb-2 text-red-500 game-text uppercase tracking-widest">
                    {t.gameOver}
                  </h2>
                  <p className="text-zinc-400 mb-6">{t.lostMsg}</p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="text-sm text-zinc-500 uppercase tracking-widest mb-1">{t.score}</div>
                    <div className="text-4xl font-mono font-bold text-white">{gameState.score}</div>
                  </div>
                  <button
                    onClick={initGame}
                    className="flex items-center gap-3 bg-white text-black font-bold px-8 py-4 rounded-2xl hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>{t.restart}</span>
                  </button>
                </motion.div>
              )}

              {gameState.status === 'WON' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-md"
                >
                  <div className="mb-4 inline-block p-4 bg-amber-500/20 rounded-full">
                    <Trophy className="w-12 h-12 text-amber-500" />
                  </div>
                  <h2 className="text-5xl font-black mb-2 text-amber-400 game-text uppercase tracking-widest">
                    {t.win}
                  </h2>
                  <p className="text-zinc-400 mb-6">{t.winMsg}</p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                    <div className="text-sm text-zinc-500 uppercase tracking-widest mb-1">{t.score}</div>
                    <div className="text-4xl font-mono font-bold text-white">{gameState.score}</div>
                  </div>
                  <button
                    onClick={initGame}
                    className="flex items-center gap-3 bg-amber-500 text-black font-bold px-8 py-4 rounded-2xl hover:bg-amber-400 transition-all hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>{t.restart}</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 text-zinc-500 text-sm flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
          <span>{lang === 'zh' ? '城市' : 'City'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <span>{lang === 'zh' ? '炮台' : 'Battery'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span>{lang === 'zh' ? '敌军' : 'Enemy'}</span>
        </div>
      </div>
    </div>
  );
}
