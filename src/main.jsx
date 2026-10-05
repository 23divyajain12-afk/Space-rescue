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

const DEPARTMENTS = [
  'Artificial Intelligence & Data Science',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Engineering (Software Engineering)',
  'Computer Sciences & Engineering (AI)',
  'Computer Science and Engineering (AI & ML)',
  'Computer Science and Engineering (Data Science)',
  'Computer Science & Engineering (IoT and Cyber Security Including Blockchain Technology)',
  'Electronics and Telecommunication Engineering',
  'Information Technology',
  'Instrumentation Engineering',
  'Mechanical Engineering'
];
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
  const ship =
    SHIP_TYPES[kind] ||
    SHIP_TYPES.balanced;

  const glow = ship.color;

  return (
    <svg
      className="shipArt"
      viewBox="0 0 240 120"
      role="img"
      aria-label={`${ship.label} spaceship`}
    >
      <defs>

        {/* Main spacecraft body */}
        <linearGradient
          id={`body-${kind}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0"
            stopColor="#f7faff"
          />

          <stop
            offset="0.3"
            stopColor="#b7c4df"
          />

          <stop
            offset="0.65"
            stopColor="#5d6b90"
          />

          <stop
            offset="1"
            stopColor="#202a47"
          />
        </linearGradient>


        {/* Cockpit */}
        <linearGradient
          id={`cockpit-${kind}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0"
            stopColor="#dffcff"
          />

          <stop
            offset="0.25"
            stopColor={glow}
          />

          <stop
            offset="1"
            stopColor="#16284d"
          />
        </linearGradient>


        {/* Engine glow */}
        <radialGradient
          id={`engine-${kind}`}
        >
          <stop
            offset="0"
            stopColor="#ffffff"
          />

          <stop
            offset="0.25"
            stopColor={glow}
          />

          <stop
            offset="1"
            stopColor={glow}
            stopOpacity="0"
          />
        </radialGradient>

      </defs>


      {/* =================================================
          ENGINE THRUST
      ================================================= */}

      <g className="shipFlame">

        <ellipse
          cx="27"
          cy="60"
          rx="24"
          ry="14"
          fill={`url(#engine-${kind})`}
          opacity=".85"
        />

        <path
          d="M32 53 L4 60 L32 67 Z"
          fill={glow}
          opacity=".7"
        />

        <path
          d="M27 56 L8 60 L27 64 Z"
          fill="#ffffff"
          opacity=".8"
        />

      </g>


      {/* =================================================
          REAR ENGINE PODS
      ================================================= */}

      <rect
        x="36"
        y="48"
        width="18"
        height="24"
        rx="7"
        fill="#303b5c"
        stroke="#cbd7ee"
        strokeWidth="2"
      />

      <circle
        cx="40"
        cy="54"
        r="3"
        fill={glow}
      />

      <circle
        cx="40"
        cy="66"
        r="3"
        fill={glow}
      />


      {/* =================================================
          MAIN WINGS
      ================================================= */}

      <path
        d="
          M78 47
          L54 22
          L84 33
          L104 47
          Z
        "
        fill="#4c5b7d"
        stroke="#d7e2f5"
        strokeWidth="2"
      />

      <path
        d="
          M78 73
          L54 98
          L84 87
          L104 73
          Z
        "
        fill="#4c5b7d"
        stroke="#d7e2f5"
        strokeWidth="2"
      />


      {/* =================================================
          WING LIGHTS
      ================================================= */}

      <circle
        cx="64"
        cy="31"
        r="3"
        fill={glow}
      />

      <circle
        cx="64"
        cy="89"
        r="3"
        fill={glow}
      />


      {/* =================================================
          MAIN HULL
      ================================================= */}

      <path
        d="
          M42 60

          C58 46 76 37 101 34

          C126 31 150 34 172 42

          L215 60

          L172 78

          C150 86 126 89 101 86

          C76 83 58 74 42 60

          Z
        "
        fill={`url(#body-${kind})`}
        stroke="#eef4ff"
        strokeOpacity=".75"
        strokeWidth="2"
      />


      {/* =================================================
          NOSE / FRONT
      ================================================= */}

      <path
        d="
          M170 42
          L215 60
          L170 78
          L184 60
          Z
        "
        fill="#7c8cab"
        stroke="#dce7fa"
        strokeWidth="1.5"
      />


      {/* =================================================
          COCKPIT CANOPY
      ================================================= */}

      <path
        d="
          M105 39
          C122 35 144 37 160 45
          L177 60
          L160 75
          C144 83 122 85 105 81
          C116 70 121 50 105 39
          Z
        "
        fill={`url(#cockpit-${kind})`}
        stroke="#e6ffff"
        strokeOpacity=".8"
        strokeWidth="1.5"
      />


      {/* Cockpit reflection */}

      <path
        d="
          M120 42
          C133 40 145 42 154 46
          L163 51
          L132 51
          Z
        "
        fill="#ffffff"
        opacity=".35"
      />


      {/* =================================================
          CENTRAL SPINE
      ================================================= */}

      <path
        d="
          M80 60
          L101 55
          L168 55
          L190 60
          L168 65
          L101 65
          Z
        "
        fill="#35415f"
        opacity=".8"
      />


      {/* =================================================
          SIDE DETAILS
      ================================================= */}

      <rect
        x="76"
        y="45"
        width="17"
        height="6"
        rx="3"
        fill={glow}
        opacity=".75"
      />

      <rect
        x="76"
        y="69"
        width="17"
        height="6"
        rx="3"
        fill={glow}
        opacity=".75"
      />


      {/* =================================================
          FRONT NAVIGATION LIGHT
      ================================================= */}

      <circle
        cx="201"
        cy="60"
        r="4"
        fill="#ffffff"
      />

      <circle
        cx="201"
        cy="60"
        r="7"
        fill={glow}
        opacity=".25"
      />


      {/* =================================================
          BODY PANEL LINES
      ================================================= */}

      <path
        d="M92 39 L92 81"
        stroke="#ffffff"
        strokeOpacity=".18"
        strokeWidth="1"
      />

      <path
        d="M172 45 L172 75"
        stroke="#ffffff"
        strokeOpacity=".2"
        strokeWidth="1"
      />


      {/* =================================================
          SMALL STATUS LIGHTS
      ================================================= */}

      <circle
        cx="107"
        cy="47"
        r="2"
        fill={glow}
      />

      <circle
        cx="115"
        cy="47"
        r="2"
        fill="#ffffff"
      />

      <circle
        cx="107"
        cy="73"
        r="2"
        fill={glow}
      />

      <circle
        cx="115"
        cy="73"
        r="2"
        fill="#ffffff"
      />

    </svg>
  );
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
        if (
          ship.status === 'waiting' &&
          ship.id !== dockingId &&
          ship.expiresAt <= now
        ) {
          const penalty = Number(
            ship.penalty ?? 20
          );

          setScore(s => Math.max(0, s - penalty));
          setMessage(`Ship missed: −${formatNumber(penalty)}`);
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
        setMessage('Move the ship fully inside the docking bay.');
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
      <div className="heroIcon"><Rocket size={52}/></div><div className="eyebrow">SPACE RESCUE • 40 SECOND CHALLENGE</div>
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
      <div className="missionHint"><span className="hintSignal" /> Drag the ship you want to save into the glowing docking bay <b>• Watch the bar</b></div>
      <section className="spacePanel"><div className="panelTitle"><span>SECTOR TRAFFIC</span><span>{sortedShips.length}/{MAX_SHIPS} VESSELS</span></div><div className="shipGrid">
        {sortedShips.map(ship => {
          const secs = remaining(ship);

          const totalLife = Math.max(
            0.1,
            (ship.expiresAt - ship.arrivalAt) / 1000
          );

          const percent = clamp(
            (secs / totalLife) * 100,
            0,
            100
          );

          const barColor =
            percent > 55
              ? '#39e58c'
              : percent > 25
                ? '#ffd45c'
                : '#ff6674';

          const timeState =
            percent > 55
              ? 'stable'
              : percent > 25
                ? 'watch'
                : 'critical';

          const docking = dockingId === ship.id;
          const type = SHIP_TYPES[ship.kind] || SHIP_TYPES.balanced;
          const isDragged = drag?.shipId === ship.id && drag.moved;

          return (
            <div
              key={ship.id}
              className={`shipCard ${timeState} ${docking ? 'selected' : ''} ${isDragged ? 'beingDragged' : ''} ${returningShip === ship.id ? 'returning' : ''}`}
              onPointerDown={event => startDrag(event, ship.id)}
              style={{ '--ship-color': type.color }}
            >
              <div className="shipMeta">
                <span className="shipName">{type.label}</span>
                <span className="reward">+{formatNumber(ship.reward)}</span>
              </div>

              <div className="shipViewport">
                <ShipArt kind={ship.kind}/>
              </div>

              <div
                className="shipTimeBar"
                role="progressbar"
                aria-label={`${Math.ceil(secs)} seconds remaining`}
                aria-valuenow={Math.round(percent)}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  className="shipTimeFill"
                  style={{
                    width: `${percent}%`,
                    background: barColor
                  }}
                />
              </div>

              <div className="shipFoot">
                <span className="shipClass">
                  {ship.phase.toUpperCase()} CLASS
                </span>

                <span
                  className="timeState"
                  style={{ color: barColor }}
                >
                  {timeState === 'stable'
                    ? 'STABLE'
                    : timeState === 'watch'
                      ? 'WATCH'
                      : 'CRITICAL'}
                </span>
              </div>

              {docking && (
                <div className="progress">
                  <span style={{ width: `${dockProgress * 100}%` }} />
                </div>
              )}
            </div>
          );
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

    <footer>IEEE SB VIT Pune</footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
