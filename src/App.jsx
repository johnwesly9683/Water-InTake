import { useState, useEffect } from 'react';
import { 
  Droplet, 
  Trash2, 
  Plus, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Flame, 
  TrendingUp, 
  Trophy, 
  Calendar,
  Coffee,
  GlassWater,
  CupSoda,
  Sparkles
} from 'lucide-react';
import { playDripSound, playDeleteSound } from './audio';

const readStorageValue = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
};

const parseStoredNumber = (key, fallback) => {
  const value = readStorageValue(key, String(fallback));
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function App() {
  // --- State Initialization ---
  const [goal, setGoal] = useState(() => parseStoredNumber('aq_goal', 2000));

  const [todayLogs, setTodayLogs] = useState(() => {
    try {
      const saved = readStorageValue('aq_today_logs', '[]');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [theme, setTheme] = useState(() => {
    const saved = readStorageValue('aq_theme', '');
    if (saved) return saved;
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isMuted, setIsMuted] = useState(() => {
    const saved = readStorageValue('aq_muted', 'false');
    try {
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [streak, setStreak] = useState(() => parseStoredNumber('aq_streak', 0));

  const [history, setHistory] = useState(() => {
    try {
      const saved = readStorageValue('aq_history', '[]');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(250);

  // --- Theme Syncing ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aq_theme', theme);
  }, [theme]);

  // --- LocalStorage Syncing ---
  useEffect(() => {
    localStorage.setItem('aq_goal', goal.toString());
  }, [goal]);

  useEffect(() => {
    localStorage.setItem('aq_today_logs', JSON.stringify(todayLogs));
  }, [todayLogs]);

  useEffect(() => {
    localStorage.setItem('aq_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('aq_streak', streak.toString());
  }, [streak]);

  useEffect(() => {
    localStorage.setItem('aq_history', JSON.stringify(history));
  }, [history]);

  // --- Automatic Daily Reset Check ---
  useEffect(() => {
    const checkDailyReset = () => {
      const lastActiveStr = localStorage.getItem('aq_last_active_date');
      const todayStr = new Date().toDateString(); // e.g., "Mon Aug 10 2026"

      if (lastActiveStr && lastActiveStr !== todayStr) {
        // A new day has started!
        // 1. Calculate yesterday's stats from the stored logs
        const yesterdayLogs = todayLogs;
        const totalYesterday = yesterdayLogs.reduce((sum, item) => sum + item.amount, 0);
        const yesterdayGoal = goal; // Assuming goal didn't change mid-reset
        const metGoal = totalYesterday >= yesterdayGoal;

        // 2. Save yesterday to history
        const yesterdayRecord = {
          date: lastActiveStr,
          amount: totalYesterday,
          target: yesterdayGoal,
          targetMet: metGoal
        };

        // Keep history to last 7 records
        const updatedHistory = [...history, yesterdayRecord].slice(-7);
        setHistory(updatedHistory);

        // 3. Update Streak
        if (metGoal) {
          setStreak(prev => prev + 1);
        } else {
          // If they missed yesterday, streak resets to 0 (or 1 if today is already completed, but today just started, so 0)
          setStreak(0);
        }

        // 4. Reset today's entries
        setTodayLogs([]);
      }

      // Always update last active date to today
      localStorage.setItem('aq_last_active_date', todayStr);
    };

    checkDailyReset();
    
    // Check every hour in case the app is left open overnight
    const interval = setInterval(checkDailyReset, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [todayLogs, goal, history]);

  // --- Calculations ---
  const currentTotal = todayLogs.reduce((sum, item) => sum + item.amount, 0);
  const percentCompleted = goal > 0 ? Math.min(Math.round((currentTotal / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - currentTotal, 0);

  // Dynamic Liquid Wave Offset
  // 100% full = wave-offset: 0%. 0% full = wave-offset: 100%
  const waveOffsetStyle = {
    '--wave-offset': `${100 - percentCompleted}%`
  };

  // --- Hydration Statistics & Analytics ---
  const averageIntake = history.length > 0 
    ? Math.round(history.reduce((sum, day) => sum + day.amount, 0) / history.length) 
    : currentTotal;

  // --- Achievements Checker ---
  const achievements = [
    { id: 'first_sip', name: 'First Sip', desc: 'Log your first drink of the day', unlocked: todayLogs.length > 0 },
    { id: 'halfway', name: 'Halfway There', desc: 'Reach 50% of your daily goal', unlocked: percentCompleted >= 50 },
    { id: 'goal_crusher', name: 'Goal Crusher', desc: 'Reach 100% of your daily goal', unlocked: percentCompleted >= 100 },
    { id: 'super_streak', name: '3-Day Streak', desc: 'Maintain a 3-day completion streak', unlocked: streak >= 3 },
  ];

  // --- Action Handlers ---
  const handleAddWater = (amount, label = 'Water') => {
    const numericAmount = Number.parseInt(amount, 10);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    const newEntry = {
      id: Date.now().toString(),
      amount: numericAmount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      label
    };

    const previousTotal = currentTotal;
    const nextTotal = previousTotal + numericAmount;

    setTodayLogs(prev => [newEntry, ...prev]);
    playDripSound(isMuted);

    // If adding this water meets today's goal and we hadn't met it yet, increment streak immediately!
    if (previousTotal < goal && nextTotal >= goal) {
      setStreak(prev => prev + 1);
    }
  };

  const handleDeleteEntry = (id) => {
    const entryToDelete = todayLogs.find(item => item.id === id);
    if (!entryToDelete) return;

    const nextTotal = currentTotal - entryToDelete.amount;

    // Adjust streak down if deleting this entry puts us below goal
    if (currentTotal >= goal && nextTotal < goal) {
      setStreak(prev => Math.max(0, prev - 1));
    }

    setTodayLogs(prev => prev.filter(item => item.id !== id));
    playDeleteSound(isMuted);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = Number.parseInt(customAmount, 10);
    if (Number.isFinite(val) && val > 0) {
      handleAddWater(val, 'Custom Log');
      setCustomAmount('');
    }
  };

  const handleManualReset = () => {
    if (window.confirm('Are you sure you want to reset today\'s logs? This will also reset your streak if you haven\'t reached your goal.')) {
      setTodayLogs([]);
      // Reset streak if today was completed but we reset it
      if (currentTotal >= goal) {
        setStreak(prev => Math.max(0, prev - 1));
      }
      playDeleteSound(isMuted);
    }
  };

  // --- Past 7 Days History Generator (combines stored history + today) ---
  const getFullWeeklyData = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    
    // Last 6 days from history
    const recentHistory = history.slice(-6);
    recentHistory.forEach(h => {
      const dateObj = new Date(h.date);
      data.push({
        label: daysOfWeek[dateObj.getDay()],
        amount: h.amount,
        target: h.target,
        targetMet: h.targetMet
      });
    });

    // Add today
    data.push({
      label: 'Today',
      amount: currentTotal,
      target: goal,
      targetMet: currentTotal >= goal
    });

    // Fill missing days with empty values to make exactly 7 bars if needed
    while (data.length < 7) {
      data.unshift({
        label: '-',
        amount: 0,
        target: goal,
        targetMet: false
      });
    }

    return data.slice(-7);
  };

  const weeklyData = getFullWeeklyData();

  return (
    <div className="app-layout">
      {/* Header Panel */}
      <header className="app-header">
        <div className="brand">
          <Droplet size={28} color="#0ea5e9" fill="#0ea5e9" className="brand-icon" />
          <h1>AquaFlow</h1>
        </div>

        <div className="header-controls">
          {streak > 0 && (
            <div className="streak-badge" title="Hydration Streak">
              <Flame size={18} fill="currentColor" />
              <span>{streak} Day Streak</span>
            </div>
          )}

          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="icon-btn" 
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
            aria-label="Toggle mute state"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="icon-btn" 
            title="Toggle color theme"
            aria-label="Toggle light dark theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="app-container">
        {/* Left Column: Visualizer & Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Visualizer */}
          <section className="glass-card">
            <div className="card-title">
              <Sparkles size={20} color="#0ea5e9" />
              <span>Intake Progress</span>
            </div>

            <div className="visualizer-wrapper">
              <div className="liquid-container">
                <div className="liquid-wave" style={waveOffsetStyle}></div>
                <div className="liquid-wave-secondary" style={waveOffsetStyle}></div>
                
                <div className="progress-info">
                  <div className="percentage-text">{percentCompleted}%</div>
                  <div className="label">Hydrated</div>
                </div>
              </div>
            </div>

            <div className="progress-stats">
              <div className="stat-item">
                <div className="stat-val">{currentTotal} ml</div>
                <div className="stat-lbl">Today's Intake</div>
              </div>
              <div className="stat-item" style={{ borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', padding: '0 20px' }}>
                <div className="stat-val">{remaining} ml</div>
                <div className="stat-lbl">Remaining</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">{goal} ml</div>
                <div className="stat-lbl">Target</div>
              </div>
            </div>

            {/* Quick Goal Config */}
            <div className="goal-input-container">
              <label htmlFor="goal-input">Daily Target Goal:</label>
              <input 
                id="goal-input"
                type="number" 
                value={goal} 
                onChange={(e) => {
                  const nextValue = e.target.value;
                  const nextGoal = Number.parseInt(nextValue, 10);
                  setGoal(Number.isFinite(nextGoal) ? Math.max(100, nextGoal) : 100);
                }}
                className="goal-field" 
                min="100" 
                step="50"
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>ml</span>
            </div>
          </section>

          {/* Log / Intake actions */}
          <section className="glass-card">
            <div className="card-title">
              <Plus size={20} color="#0ea5e9" />
              <span>Add Drink Entry</span>
            </div>

            {/* Presets */}
            <div className="preset-grid">
              <button onClick={() => handleAddWater(150, 'Small Cup')} className={`preset-btn ${selectedPreset === 150 ? 'active' : ''}`} onMouseEnter={() => setSelectedPreset(150)}>
                <Coffee size={24} />
                <span className="preset-title">Cup</span>
                <span className="preset-vol">150 ml</span>
              </button>
              
              <button onClick={() => handleAddWater(250, 'Standard Glass')} className={`preset-btn ${selectedPreset === 250 ? 'active' : ''}`} onMouseEnter={() => setSelectedPreset(250)}>
                <GlassWater size={24} />
                <span className="preset-title">Glass</span>
                <span className="preset-vol">250 ml</span>
              </button>
              
              <button onClick={() => handleAddWater(500, 'Sports Bottle')} className={`preset-btn ${selectedPreset === 500 ? 'active' : ''}`} onMouseEnter={() => setSelectedPreset(500)}>
                <CupSoda size={24} />
                <span className="preset-title">Bottle</span>
                <span className="preset-vol">500 ml</span>
              </button>
            </div>

            {/* Custom Input */}
            <form onSubmit={handleCustomSubmit} className="custom-log-form">
              <div className="custom-input-wrapper">
                <input 
                  type="number"
                  placeholder="Custom intake amount..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="custom-input"
                  min="10"
                  max="5000"
                  required
                />
                <span className="input-suffix">ml</span>
              </div>
              <button type="submit" className="primary-btn">
                <Plus size={16} />
                Log
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: History, Logs & Achievements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* History Timeline */}
          <section className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">
                <Calendar size={20} color="#0ea5e9" />
                <span>Today's Drink Log</span>
              </div>
              {todayLogs.length > 0 && (
                <button 
                  onClick={handleManualReset} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear Logs
                </button>
              )}
            </div>

            {todayLogs.length === 0 ? (
              <div className="empty-state">
                <Droplet size={32} color="var(--color-text-muted)" style={{ marginBottom: '8px' }} />
                <p>No water logged today yet.</p>
                <span style={{ fontSize: '0.75rem' }}>Drink up to reach your goal!</span>
              </div>
            ) : (
              <div className="drink-log-list">
                {todayLogs.map((item) => (
                  <div key={item.id} className="log-item">
                    <div className="log-details">
                      <div className="beverage-icon-wrapper">
                        <GlassWater size={18} />
                      </div>
                      <div>
                        <div className="log-name">{item.label}</div>
                        <div className="log-time">{item.timestamp}</div>
                      </div>
                    </div>
                    <div className="log-amount-delete">
                      <span className="log-vol">+{item.amount} ml</span>
                      <button 
                        onClick={() => handleDeleteEntry(item.id)} 
                        className="delete-btn" 
                        title="Delete log"
                        aria-label="Delete water log entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Statistics Grid & Graph */}
          <section className="glass-card">
            <div className="card-title">
              <TrendingUp size={20} color="#0ea5e9" />
              <span>Stats & History</span>
            </div>

            <div className="stats-grid">
              <div className="stats-card-mini">
                <div className="mini-value">{averageIntake} ml</div>
                <div className="mini-lbl">Avg. Intake</div>
              </div>
              <div className="stats-card-mini">
                <div className="mini-value">{history.filter(h => h.targetMet).length} days</div>
                <div className="mini-lbl">Goals Met</div>
              </div>
              <div className="stats-card-mini">
                <div className="mini-value">{streak} days</div>
                <div className="mini-lbl">Current Streak</div>
              </div>
            </div>

            <div className="history-chart-wrapper">
              <div className="chart-header">
                <span>Past 7 Days</span>
                <span style={{ color: 'var(--color-text-muted)' }}>Target: {goal} ml</span>
              </div>
              <div className="chart-bars">
                {weeklyData.map((day, idx) => {
                  const maxDisplayAmount = Math.max(...weeklyData.map(d => d.amount), goal, 1000);
                  const barHeightPercent = Math.max(2, Math.min(100, Math.round((day.amount / maxDisplayAmount) * 100)));
                  
                  return (
                    <div key={idx} className="chart-bar-container" title={`${day.amount} ml logged`}>
                      <div className="chart-bar-fill-track">
                        <div 
                          className={`chart-bar-fill ${day.targetMet ? 'target-met' : ''}`} 
                          style={{ height: `${barHeightPercent}%` }}
                        ></div>
                      </div>
                      <span className="chart-label">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Gamification / Achievements */}
          <section className="glass-card">
            <div className="card-title">
              <Trophy size={20} color="#0ea5e9" />
              <span>Unlocked Milestones</span>
            </div>
            
            <div className="achievements-list">
              {achievements.map((badge) => (
                <div key={badge.id} className={`badge-card ${badge.unlocked ? 'unlocked' : ''}`}>
                  <div className="badge-icon">
                    <Trophy size={16} />
                  </div>
                  <div className="badge-info">
                    <span className="badge-name">{badge.name}</span>
                    <span className="badge-desc">{badge.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
