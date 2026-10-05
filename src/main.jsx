import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Rocket, Trophy, Play, RotateCcw, Send, Clock3, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import './styles.css';
import './game.css';
import { createGameEngine, GAME_DURATION, DOCK_DURATION, MAX_SHIPS } from './gameEngine';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const DEPARTMENTS = ['CSE', 'AI&DS', 'ENTC', 'IT', 'MECH', 'CIVIL', 'E&TC'];
const SHIP_TYPES = {
  safe: { label: 'ORBITAL FERRY', color: '#63e6dc', size: 'scout' },
  urgent: { label: 'RAPID COURIER', color: '#ff777f', size: 'dart' },
  value: { label: 'SALVAGE HAULER', color: '#f6c96b', size: 'heavy' },
  balanced: { label: 'PATROL CRAFT', color: '#91a3ff', size: 'fighter' },
  hard: { label: 'PRIORITY VESSEL', color: '#ff9a65', size: 'heavy' },
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function formatNumber(n) { return new Intl.NumberFormat('en-IN').format(Math.round(n)); }

function ShipArt({ kind }) {
  const ship = SHIP_TYPES[kind] || SHIP_TYPES.balanced;
  return <svg className="shipArt" viewBox="0 0 240 100" role="img" aria-label={`${ship.label} spaceship`}>
    <defs>
      <linearGradient id={`hull-${kind}`} x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stopColor="#f3f7ff" stopOpacity=".94" />
        <stop offset=".38" stopColor="#8998bd" />
        <stop offset="1" stopColor="#303c62" />
      </linearGradient>
      <linearGradient id={`glass-${kind}`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor={ship.color} stopOpacity=".95" />
        <stop offset="1" stopColor="#172a55" />
      </linearGradient>
    </defs>
    <g className="shipFlame">
      <path d="M35 44 8 36l12 14L8 64l27-8z" fill={ship.color} opacity=".65" />
      <path d="m29 46-16-5 8 9-8 9 16-5z" fill="#fff" opacity=".8" />
    </g>
    {ship.size === 'heavy' && <>
      <path d="m83 34-34-20 10 30m24 22-34 20 10-30" fill="#68799e" stroke="#c3d1ed" strokeWidth="2" />
      <path d="m86 32-15-22 29 13m-14 45-15 22 29-13" fill="#465578" stroke="#96a7ce" strokeWidth="2" />
      <rect x="57" y="45" width="16" height="10" rx="3" fill={ship.color} />
    </>}
    {ship.size === 'dart' && <>
      <path d="m96 39-38-23 16 31m22 14L58 84l16-31" fill="#65718f" stroke="#c6cee2" strokeWidth="2" />
      <path d="m94 40-13-28 36 21m-23 27L81 88l36-21" fill="#414c6b" />
      <path d="m112 45 14-8v26l-14-8" fill={ship.color} opacity=".85" />
    </>}
    {ship.size === 'fighter' && <>
      <path d="m84 38-26-17 9 26m17 15L58 79l9-26" fill="#64749b" stroke="#cbd7f1" strokeWidth="2" />
      <path d="m94 34 17-20 5 29m-22 23 17 20 5-29" fill="#465778" />
      <path d="m83 43-14-5 9 12-9 12 14-5" fill={ship.color} />
    </>}
    {ship.size === 'scout' && <>
      <path d="m90 40-22-17 8 27m14 10L68 77l8-27" fill="#6c81a4" stroke="#c5d4ed" strokeWidth="2" />
      <path d="m92 43-13-8 7 14-7 14 13-8" fill={ship.color} opacity=".8" />
    </>}
    <path d="M35 50 77 34Q91 24 117 29l54 10 39 11-39 11-54 10q-26 5-40-5L35 50Z"
      fill={`url(#hull-${kind})`} stroke="#e3edff" strokeOpacity=".62" strokeWidth="2" />
    <path d="m116 34 34 5 22 11h-61q-9-8 5-16Z" fill={`url(#glass-${kind})`} stroke="#d6f9ff" strokeOpacity=".75" strokeWidth="1.5" />
    <path d="m116 66 34-5 22-11h-61q-9 8 5 16Z" fill="#536281" opacity=".75" />
    <path d="m65 47 15 3-15 3m14-12 12 9-12 9" fill="none" stroke="#eff5ff" strokeOpacity=".7" strokeWidth="2" />
    <path d="M173 47h16m-16 6h16" stroke={ship.color} strokeWidth="2" opacity=".9" />
    <circle cx="91" cy="50" r="2.5" fill="#fff" /><circle cx="103" cy="50" r="2" fill={ship.color} />
    <circle cx="191" cy="50" r="2.2" fill="#fff" />
  </svg>;
}

function App() {
  const [screen, setScreen] = useState('landing');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [score, setScore] = useState(0);
  const [ships, setShips] = useState([]);
  const [gameReady, setGameReady] = useState(false);
  const [drag, setDrag] = useState(null);
  const [returningShip, setReturningShip] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [gameTime, setGameTime] = useState(GAME_DURATION);
  const [dockingId, setDockingId] = useState(null);
  const [dockProgress, setDockProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const engineRef = useRef(null);
  const gameEndRef = useRef(0);
  const dockEndRef = useRef(0);
  const gameActiveRef = useRef(false);
  const bayRef = useRef(null);
  const dragRef = useRef(null);
  const shipsRef = useRef(ships);

  useEffect(() => { shipsRef.current = ships; }, [ships]);

  const remaining = useCallback((ship) => Math.max(0, (ship.expiresAt - tick) / 1000), [tick]);

  const loadLeaderboard = useCallback(async () => {
    if (!supabase) return;
    setLoadingLeaderboard(true);
    const { data, error } = await supabase.from('scores').select('department,score').order('score', { ascending: false });
    if (!error && data) {
      const totals = {};
      for (const row of data) totals[row.department] = (totals[row.department] || 0) + Number(row.score || 0);
      setLeaderboard(Object.entries(totals).map(([dept, total]) => ({ department: dept, score: total })).sort((a,b) => b.score - a.score));
    }
    setLoadingLeaderboard(false);
  }, []);

  useEffect(() => { if (screen === 'landing' || screen === 'leaderboard') loadLeaderboard(); }, [screen, loadLeaderboard]);

  const finishGame = useCallback(() => {
    gameActiveRef.current = false;
    setDockingId(null);
    setDockProgress(0);
    setShips([]);
    setScreen('result');
  }, []);

  useEffect(() => {
    if (screen !== 'game' || !gameReady) return;
    gameActiveRef.current = true;
    const interval = setInterval(() => setTick(Date.now()), 100);
    return () => clearInterval(interval);
  }, [screen, gameReady]);

  useEffect(() => {
    if (screen !== 'game' || !gameReady) return;
    const now = tick;
    const left = Math.max(0, (gameEndRef.current - now) / 1000);
    setGameTime(Math.ceil(left));
    if (left <= 0) { finishGame(); return; }

    setShips(prev => {
      let next = prev;
      let changed = false;
      for (const ship of prev) {
        if (ship.status === 'waiting' && ship.expiresAt <= now) {
          setScore(s => s - ship.reward);
          setMessage(`Ship lost: −${formatNumber(ship.reward)}`);
          setFeedback('failure');
          next = next.filter(s => s.id !== ship.id);
          changed = true;
        }
      }
      const elapsed = GAME_DURATION - left;
      const engine = engineRef.current;
      if (engine?.shouldSpawn(now, elapsed, next, dockingId)) {
        next = [...next, engine.spawn(now, elapsed, next)];
        changed = true;
      }
      if (engine && changed) {
        next = engine.repair(now, elapsed, next);
      }
      return changed ? [...next] : prev;
    });

    if (dockingId) {
      const total = DOCK_DURATION * 1000;
      const progress = clamp(1 - (dockEndRef.current - now) / total, 0, 1);
      setDockProgress(progress);
      if (now >= dockEndRef.current) {
        const dockedShip = ships.find(x => x.id === dockingId);
        if (dockedShip) {
          setShips(prev => prev.filter(s => s.id !== dockingId));
          setScore(s => s + dockedShip.reward);
          setMessage(`Docked successfully! +${formatNumber(dockedShip.reward)}`);
          setFeedback('success');
        }
        setDockingId(null);
        setDockProgress(0);
      }
    }
  }, [tick, screen, gameReady, dockingId, ships, finishGame]);

  useEffect(() => {
    const move = (event) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 8;
      const bay = bayRef.current?.getBoundingClientRect();
      const overBay = Boolean(moved && bay &&
        event.clientX >= bay.left && event.clientX <= bay.right &&
        event.clientY >= bay.top && event.clientY <= bay.bottom);
      const next = { ...current, x: event.clientX, y: event.clientY, moved, overBay };
      dragRef.current = next;
      setDrag(next);
    };
    const finish = (event) => {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      dragRef.current = null;
      setDrag(null);
      if (!current.moved || !gameActiveRef.current) return;

      const bay = bayRef.current?.getBoundingClientRect();
      const landed = event.type !== 'pointercancel' && bay &&
        event.clientX >= bay.left && event.clientX <= bay.right &&
        event.clientY >= bay.top && event.clientY <= bay.bottom;
      const ship = shipsRef.current.find(item => item.id === current.shipId);
      if (landed && ship && ship.expiresAt > Date.now() && !dockingId) {
        setDockingId(ship.id);
        dockEndRef.current = Date.now() + DOCK_DURATION * 1000;
        setDockProgress(0);
        setFeedback('success');
        setMessage(`Docking ${SHIP_TYPES[ship.kind]?.label || 'vessel'}…`);
      } else {
        setReturningShip(current.shipId);
        setFeedback('failure');
        setMessage('Docking missed — vessel returned to its lane.');
        window.setTimeout(() => setReturningShip(null), 520);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dockingId]);

  useEffect(() => {
    if (screen !== 'game') return;
    const now = Date.now();
    const engine = createGameEngine();
    engineRef.current = engine;
    gameEndRef.current = now + GAME_DURATION * 1000;
    setTick(now);
    setGameTime(GAME_DURATION);
    setShips(engine.initialShips(now));
    setGameReady(true);
  }, [screen]);

  const startGame = () => {
    if (!name.trim() || !department) return;
    setScore(0);
    setShips([]);
    setDockingId(null);
    setDockProgress(0);
    setMessage('');
    setSubmitError('');
    setScoreSubmitted(false);
    setGameReady(false);
    setDrag(null);
    dragRef.current = null;
    setReturningShip(null);
    setFeedback('');
    gameActiveRef.current = false;
    setScreen('game');
  };

  const startDrag = (event, id) => {
    if (dockingId || !gameActiveRef.current) return;
    const ship = ships.find(s => s.id === id);
    if (!ship || ship.expiresAt <= Date.now()) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = {
      shipId: id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    dragRef.current = next;
    setDrag(next);
  };

  const submitScore = async () => {
    if (!supabase) { setSubmitError('Supabase is not configured. Add your credentials to .env first.'); return; }
    setSubmitting(true); setSubmitError('');
    const { error } = await supabase.from('scores').insert({ player_name: name.trim(), department, score: Math.round(score) });
    if (error) setSubmitError(error.message);
    else { setScoreSubmitted(true); await loadLeaderboard(); setScreen('leaderboard'); }
    setSubmitting(false);
  };

  const restart = () => { setScreen('landing'); setName(''); setDepartment(''); setScore(0); setScoreSubmitted(false); };
  const sortedShips = useMemo(() => [...ships].sort((a,b) => a.expiresAt - b.expiresAt), [ships]);

  return <div className="app">
    <div className="stars" />
    <header className="topbar"><div className="brand"><span className="brandIcon"><Rocket size={19}/></span><span>SPACE RESCUE</span></div><button className="leaderBtn" onClick={() => setScreen('leaderboard')}><Trophy size={16}/> Leaderboard</button></header>

    {screen === 'landing' && <main className="centerPage landingPage">
      <div className="heroIcon"><Rocket size={52}/></div><div className="eyebrow">MISSION CONTROL • 40 SECOND CHALLENGE</div>
      <h1>Save the most<br/><span>valuable ships.</span></h1>
      <p className="subtitle">Incoming spacecraft are running out of time. Choose wisely, dock fast, and build the highest score for your department.</p>
      <button className="primaryBtn" onClick={() => setScreen('details')}><Play size={19} fill="currentColor"/> PLAY MISSION</button>
      <div className="miniStats"><span><Clock3 size={15}/> 40 sec</span><span><Zap size={15}/> Fast decisions</span><span><ShieldCheck size={15}/> Fair scenarios</span></div>
    </main>}

    {screen === 'details' && <main className="centerPage">
      <section className="card detailsCard"><div className="sectionIcon"><Rocket size={25}/></div><h2>Mission registration</h2><p className="muted">Enter your details before taking control.</p>
        <label>Your name<input value={name} onChange={e => setName(e.target.value.slice(0,60))} placeholder="e.g. Rahul Sharma" autoFocus /></label>
        <label>Department<select value={department} onChange={e => setDepartment(e.target.value)}><option value="">Select department</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></label>
        <button className="primaryBtn full" disabled={!name.trim() || !department} onClick={startGame}>START MISSION <Rocket size={18}/></button>
      </section>
    </main>}

    {screen === 'game' && !gameReady && <main className="gamePage"><div className="emptyShips">Preparing your mission…</div></main>}

    {screen === 'game' && gameReady && <main className="gamePage">
      <div className="gameHeader"><div className="commanderTag"><span className="tinyLabel">FLIGHT DECK</span><strong>{name}</strong></div><div className="scoreBox"><span>RESCUE SCORE</span><strong>{formatNumber(score)}</strong></div><div className={`timerBox ${gameTime <= 8 ? 'danger' : ''}`}><span>MISSION TIME</span><strong>{gameTime}<small>s</small></strong></div></div>
      <div className="missionHint"><span className="hintSignal" /> Drag a vessel into the docking ring <b>• Every second matters</b></div>
      <section className="spacePanel"><div className="panelTitle"><span>SECTOR TRAFFIC</span><span>{sortedShips.length}/{MAX_SHIPS} VESSELS</span></div><div className="shipGrid">
        {sortedShips.map(ship => {
          const secs = remaining(ship);
          const urgent = secs <= 5;
          const docking = dockingId === ship.id;
          const type = SHIP_TYPES[ship.kind] || SHIP_TYPES.balanced;
          const isDragged = drag?.shipId === ship.id && drag.moved;
          return <div key={ship.id} className={`shipCard ${urgent ? 'urgent' : ''} ${docking ? 'selected' : ''} ${isDragged ? 'beingDragged' : ''} ${returningShip === ship.id ? 'returning' : ''}`}
            onPointerDown={event => startDrag(event, ship.id)} style={{ '--ship-color': type.color }}>
            <div className="shipMeta"><span className="shipName">{type.label}</span><span className="reward">+{formatNumber(ship.reward)}</span></div>
            <div className="shipViewport"><ShipArt kind={ship.kind}/></div>
            <div className="shipFoot"><span className="shipClass">{ship.phase.toUpperCase()} CLASS</span><span className="expiry"><Clock3 size={13}/><b>{secs.toFixed(1)}s</b></span></div>
            {docking && <div className="progress"><span style={{width:`${dockProgress*100}%`}} /></div>}
          </div>;
        })}
        {sortedShips.length === 0 && <div className="emptyShips">Scanning sector for incoming vessels…</div>}
      </div></section>
      <section ref={bayRef} className={`dockBay ${drag?.overBay ? 'dragTarget' : ''} ${dockingId ? 'bayDocking' : ''}`} aria-label="Docking bay">
        <div className="bayStructure"><div className="bayLights"><i/><i/><i/><i/><i/></div><div className="bayLabel">RESCUE STATION / BAY 01</div>
          <div className={`bayPortal ${drag?.overBay ? 'portalActive' : ''}`}><div className="portalCore"/><div className="portalGrid"/></div>
          <div className="bayDeck"><span/><span/><span/><span/><span/></div>
          {dockingId && <div className="dockShipVisual"><ShipArt kind={ships.find(item => item.id === dockingId)?.kind || 'balanced'}/></div>}
          <div className="dockText">{dockingId ? 'VESSEL SECURED — DOCKING' : drag?.moved ? 'RELEASE TO DOCK' : 'DRAG VESSEL HERE'}</div>
          <div className="dockBar"><span style={{width:`${dockProgress*100}%`}} /></div>
        </div>
      </section>
      {drag?.moved && <div className="dragGhost" style={{ left: drag.x, top: drag.y, '--ship-color': (SHIP_TYPES[ships.find(item => item.id === drag.shipId)?.kind] || SHIP_TYPES.balanced).color }}><ShipArt kind={ships.find(item => item.id === drag.shipId)?.kind || 'balanced'}/></div>}
      {message && <div className={`toast ${feedback}`} key={message}>{message}</div>}
    </main>}

    {screen === 'result' && <main className="centerPage"><section className="card resultCard"><div className="successIcon"><Trophy size={30}/></div><div className="eyebrow">MISSION COMPLETE</div><h2>Your final score</h2><div className="bigScore">{formatNumber(score)}</div><div className="resultMeta"><span>COMMANDER<strong>{name}</strong></span><span>DEPARTMENT<strong>{department}</strong></span></div>{!supabase && <div className="warning"><AlertTriangle size={17}/> Supabase credentials are missing. Configure <code>.env</code> before deploying.</div>}{submitError && <div className="warning"><AlertTriangle size={17}/>{submitError}</div>}<button className="primaryBtn full" onClick={submitScore} disabled={submitting || scoreSubmitted}><Send size={18}/>{submitting ? 'SUBMITTING…' : scoreSubmitted ? 'SUBMITTED' : 'SUBMIT SCORE'}</button><button className="textBtn" onClick={restart}><RotateCcw size={15}/> Play again</button></section></main>}

    {screen === 'leaderboard' && <main className="centerPage leaderboardPage"><section className="card leaderboardCard"><div className="leaderHead"><div><div className="eyebrow">LIVE EVENT RANKINGS</div><h2>Department leaderboard</h2></div><Trophy size={34}/></div>{!supabase && <div className="warning"><AlertTriangle size={17}/> Configure Supabase to load the live leaderboard.</div>}<div className="leaderRows">{loadingLeaderboard ? <div className="empty">Loading rankings…</div> : leaderboard.length === 0 ? <div className="empty">No scores yet. Be the first!</div> : leaderboard.map((row,i) => <div className="leaderRow" key={row.department}><span className={`rank rank${i+1}`}>{i+1}</span><span className="dept">{row.department}</span><strong>{formatNumber(row.score)}</strong></div>)}</div><button className="primaryBtn full" onClick={() => setScreen('landing')}>BACK TO MISSION</button></section></main>}

    <footer>SPACE RESCUE • TECH CLUB EVENT</footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
