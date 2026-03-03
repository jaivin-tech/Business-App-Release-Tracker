(() => {
  const STORAGE_KEY = 'ba_tracker_theme';
  const DEFAULT_THEME = { preset: 'calm', mode: 'dark' };

  const PRESETS = {
    vibrant: {
      light: {
        '--bg': '#0f172a',
        '--surface-0': '#172554',
        '--surface-1': '#1e3a8a',
        '--surface-2': '#1d4ed8',
        '--surface-3': '#1e40af',
        '--text': '#f8fafc',
        '--text-muted': '#c7d2fe',
        '--border': '#60a5fa',
        '--ring': '#22d3ee',
        '--primary': '#22d3ee',
        '--accent': '#f472b6',
        '--success': '#22c55e',
        '--warning': '#f59e0b',
        '--danger': '#ef4444',
        '--info': '#38bdf8',
        '--shadow-lg': '0 18px 40px rgba(2, 6, 23, 0.35)',
        '--shadow-sm': '0 6px 14px rgba(2, 6, 23, 0.24)',
        '--chart-1': '#22d3ee',
        '--chart-2': '#a78bfa',
        '--chart-3': '#f59e0b',
        '--chart-4': '#f472b6',
        '--chart-5': '#4ade80',
        '--chart-6': '#fb7185',
        '--chart-7': '#facc15',
        '--chart-8': '#38bdf8',
        '--status-open': '#60a5fa',
        '--status-pm-approval': '#fbbf24',
        '--status-approved': '#4ade80',
        '--status-legal-pending': '#c084fc',
        '--status-credentials-ready': '#2dd4bf',
        '--status-in-progress': '#22d3ee',
        '--status-released': '#34d399',
        '--team-pm': '#38bdf8',
        '--team-development': '#818cf8',
        '--team-design': '#f472b6',
        '--team-marketing': '#fb7185',
        '--team-data-analysts': '#34d399',
        '--priority-low': '#34d399',
        '--priority-medium': '#fbbf24',
        '--priority-high': '#fb7185',
        '--priority-critical': '#ef4444',
        '--risk-low': '#22c55e',
        '--risk-medium': '#f59e0b',
        '--risk-high': '#f97316',
        '--risk-critical': '#ef4444'
      },
      dark: {
        '--bg': '#020617',
        '--surface-0': '#0b1120',
        '--surface-1': '#172554',
        '--surface-2': '#1e40af',
        '--surface-3': '#1d4ed8',
        '--text': '#f8fafc',
        '--text-muted': '#bfdbfe',
        '--border': '#3b82f6',
        '--ring': '#22d3ee',
        '--primary': '#38bdf8',
        '--accent': '#f472b6',
        '--success': '#22c55e',
        '--warning': '#f59e0b',
        '--danger': '#ef4444',
        '--info': '#38bdf8',
        '--shadow-lg': '0 20px 44px rgba(0, 0, 0, 0.55)',
        '--shadow-sm': '0 8px 18px rgba(0, 0, 0, 0.4)',
        '--chart-1': '#38bdf8',
        '--chart-2': '#a78bfa',
        '--chart-3': '#fbbf24',
        '--chart-4': '#f472b6',
        '--chart-5': '#4ade80',
        '--chart-6': '#fb7185',
        '--chart-7': '#facc15',
        '--chart-8': '#22d3ee',
        '--status-open': '#60a5fa',
        '--status-pm-approval': '#fbbf24',
        '--status-approved': '#4ade80',
        '--status-legal-pending': '#c084fc',
        '--status-credentials-ready': '#2dd4bf',
        '--status-in-progress': '#38bdf8',
        '--status-released': '#34d399',
        '--team-pm': '#38bdf8',
        '--team-development': '#818cf8',
        '--team-design': '#f472b6',
        '--team-marketing': '#fb7185',
        '--team-data-analysts': '#34d399',
        '--priority-low': '#34d399',
        '--priority-medium': '#fbbf24',
        '--priority-high': '#fb7185',
        '--priority-critical': '#ef4444',
        '--risk-low': '#22c55e',
        '--risk-medium': '#f59e0b',
        '--risk-high': '#f97316',
        '--risk-critical': '#ef4444'
      }
    },
    calm: {
      light: {
        '--bg': '#0f172a',
        '--surface-0': '#1f2937',
        '--surface-1': '#334155',
        '--surface-2': '#475569',
        '--surface-3': '#0f766e',
        '--text': '#f8fafc',
        '--text-muted': '#d1d5db',
        '--border': '#64748b',
        '--ring': '#67e8f9',
        '--primary': '#2dd4bf',
        '--accent': '#67e8f9',
        '--success': '#34d399',
        '--warning': '#fbbf24',
        '--danger': '#f87171',
        '--info': '#7dd3fc',
        '--shadow-lg': '0 18px 38px rgba(3, 7, 18, 0.36)',
        '--shadow-sm': '0 6px 14px rgba(3, 7, 18, 0.26)',
        '--chart-1': '#22d3ee',
        '--chart-2': '#34d399',
        '--chart-3': '#fbbf24',
        '--chart-4': '#93c5fd',
        '--chart-5': '#67e8f9',
        '--chart-6': '#86efac',
        '--chart-7': '#fcd34d',
        '--chart-8': '#99f6e4',
        '--status-open': '#93c5fd',
        '--status-pm-approval': '#fcd34d',
        '--status-approved': '#6ee7b7',
        '--status-legal-pending': '#a5b4fc',
        '--status-credentials-ready': '#5eead4',
        '--status-in-progress': '#67e8f9',
        '--status-released': '#34d399',
        '--team-pm': '#7dd3fc',
        '--team-development': '#93c5fd',
        '--team-design': '#c4b5fd',
        '--team-marketing': '#fda4af',
        '--team-data-analysts': '#6ee7b7',
        '--priority-low': '#6ee7b7',
        '--priority-medium': '#fcd34d',
        '--priority-high': '#fda4af',
        '--priority-critical': '#f87171',
        '--risk-low': '#34d399',
        '--risk-medium': '#fbbf24',
        '--risk-high': '#fb7185',
        '--risk-critical': '#ef4444'
      },
      dark: {
        '--bg': '#020617',
        '--surface-0': '#111827',
        '--surface-1': '#1f2937',
        '--surface-2': '#334155',
        '--surface-3': '#0f766e',
        '--text': '#f9fafb',
        '--text-muted': '#cbd5e1',
        '--border': '#475569',
        '--ring': '#67e8f9',
        '--primary': '#2dd4bf',
        '--accent': '#67e8f9',
        '--success': '#34d399',
        '--warning': '#fbbf24',
        '--danger': '#f87171',
        '--info': '#7dd3fc',
        '--shadow-lg': '0 22px 44px rgba(0, 0, 0, 0.55)',
        '--shadow-sm': '0 8px 18px rgba(0, 0, 0, 0.42)',
        '--chart-1': '#22d3ee',
        '--chart-2': '#34d399',
        '--chart-3': '#fbbf24',
        '--chart-4': '#93c5fd',
        '--chart-5': '#67e8f9',
        '--chart-6': '#86efac',
        '--chart-7': '#fcd34d',
        '--chart-8': '#99f6e4',
        '--status-open': '#93c5fd',
        '--status-pm-approval': '#fcd34d',
        '--status-approved': '#6ee7b7',
        '--status-legal-pending': '#a5b4fc',
        '--status-credentials-ready': '#5eead4',
        '--status-in-progress': '#67e8f9',
        '--status-released': '#34d399',
        '--team-pm': '#7dd3fc',
        '--team-development': '#93c5fd',
        '--team-design': '#c4b5fd',
        '--team-marketing': '#fda4af',
        '--team-data-analysts': '#6ee7b7',
        '--priority-low': '#6ee7b7',
        '--priority-medium': '#fcd34d',
        '--priority-high': '#fda4af',
        '--priority-critical': '#f87171',
        '--risk-low': '#34d399',
        '--risk-medium': '#fbbf24',
        '--risk-high': '#fb7185',
        '--risk-critical': '#ef4444'
      }
    },
    'high-contrast': {
      light: {
        '--bg': '#000000',
        '--surface-0': '#0f0f0f',
        '--surface-1': '#1a1a1a',
        '--surface-2': '#252525',
        '--surface-3': '#0d3b66',
        '--text': '#ffffff',
        '--text-muted': '#e5e7eb',
        '--border': '#ffffff',
        '--ring': '#ffff00',
        '--primary': '#00e5ff',
        '--accent': '#ff6ad5',
        '--success': '#00ff99',
        '--warning': '#ffd500',
        '--danger': '#ff4d4d',
        '--info': '#00e5ff',
        '--shadow-lg': '0 0 0 2px rgba(255, 255, 255, 0.28)',
        '--shadow-sm': '0 0 0 1px rgba(255, 255, 255, 0.2)',
        '--chart-1': '#00e5ff',
        '--chart-2': '#b388ff',
        '--chart-3': '#ffd500',
        '--chart-4': '#ff6ad5',
        '--chart-5': '#00ff99',
        '--chart-6': '#ff4d4d',
        '--chart-7': '#66ff00',
        '--chart-8': '#80d8ff',
        '--status-open': '#4fc3f7',
        '--status-pm-approval': '#ffd54f',
        '--status-approved': '#69f0ae',
        '--status-legal-pending': '#b388ff',
        '--status-credentials-ready': '#64ffda',
        '--status-in-progress': '#00e5ff',
        '--status-released': '#00ff99',
        '--team-pm': '#4fc3f7',
        '--team-development': '#80d8ff',
        '--team-design': '#b388ff',
        '--team-marketing': '#ff80ab',
        '--team-data-analysts': '#69f0ae',
        '--priority-low': '#69f0ae',
        '--priority-medium': '#ffd54f',
        '--priority-high': '#ff80ab',
        '--priority-critical': '#ff4d4d',
        '--risk-low': '#00ff99',
        '--risk-medium': '#ffd500',
        '--risk-high': '#ff80ab',
        '--risk-critical': '#ff4d4d'
      },
      dark: {
        '--bg': '#000000',
        '--surface-0': '#050505',
        '--surface-1': '#101010',
        '--surface-2': '#171717',
        '--surface-3': '#002b5b',
        '--text': '#ffffff',
        '--text-muted': '#f3f4f6',
        '--border': '#ffffff',
        '--ring': '#ffff00',
        '--primary': '#00e5ff',
        '--accent': '#ff6ad5',
        '--success': '#00ff99',
        '--warning': '#ffd500',
        '--danger': '#ff4d4d',
        '--info': '#00e5ff',
        '--shadow-lg': '0 0 0 2px rgba(255, 255, 255, 0.34)',
        '--shadow-sm': '0 0 0 1px rgba(255, 255, 255, 0.28)',
        '--chart-1': '#00e5ff',
        '--chart-2': '#b388ff',
        '--chart-3': '#ffd500',
        '--chart-4': '#ff6ad5',
        '--chart-5': '#00ff99',
        '--chart-6': '#ff4d4d',
        '--chart-7': '#66ff00',
        '--chart-8': '#80d8ff',
        '--status-open': '#4fc3f7',
        '--status-pm-approval': '#ffd54f',
        '--status-approved': '#69f0ae',
        '--status-legal-pending': '#b388ff',
        '--status-credentials-ready': '#64ffda',
        '--status-in-progress': '#00e5ff',
        '--status-released': '#00ff99',
        '--team-pm': '#4fc3f7',
        '--team-development': '#80d8ff',
        '--team-design': '#b388ff',
        '--team-marketing': '#ff80ab',
        '--team-data-analysts': '#69f0ae',
        '--priority-low': '#69f0ae',
        '--priority-medium': '#ffd54f',
        '--priority-high': '#ff80ab',
        '--priority-critical': '#ff4d4d',
        '--risk-low': '#00ff99',
        '--risk-medium': '#ffd500',
        '--risk-high': '#ff80ab',
        '--risk-critical': '#ff4d4d'
      }
    }
  };

  PRESETS.sunset = {
    light: {
      ...PRESETS.vibrant.light,
      '--surface-0': '#3b0f2f',
      '--surface-1': '#5d163d',
      '--surface-2': '#7a1f47',
      '--surface-3': '#9f234f',
      '--primary': '#fb923c',
      '--accent': '#f43f5e',
      '--border': '#fb7185',
      '--ring': '#fdba74',
      '--chart-1': '#f97316',
      '--chart-2': '#fb7185',
      '--chart-3': '#f59e0b',
      '--chart-4': '#ef4444',
      '--chart-5': '#c084fc',
      '--chart-6': '#f43f5e',
      '--chart-7': '#fbbf24',
      '--chart-8': '#fb923c'
    },
    dark: {
      ...PRESETS.vibrant.dark,
      '--surface-0': '#200b1a',
      '--surface-1': '#3a1028',
      '--surface-2': '#5d163d',
      '--surface-3': '#7a1f47',
      '--primary': '#fb923c',
      '--accent': '#fb7185',
      '--border': '#f472b6',
      '--ring': '#fdba74',
      '--chart-1': '#f97316',
      '--chart-2': '#fb7185',
      '--chart-3': '#f59e0b',
      '--chart-4': '#ef4444',
      '--chart-5': '#c084fc',
      '--chart-6': '#f43f5e',
      '--chart-7': '#fbbf24',
      '--chart-8': '#fb923c'
    }
  };

  PRESETS.ocean = {
    light: {
      ...PRESETS.calm.light,
      '--surface-0': '#082f49',
      '--surface-1': '#0c4a6e',
      '--surface-2': '#075985',
      '--surface-3': '#0369a1',
      '--primary': '#22d3ee',
      '--accent': '#38bdf8',
      '--border': '#7dd3fc',
      '--ring': '#67e8f9',
      '--chart-1': '#0ea5e9',
      '--chart-2': '#06b6d4',
      '--chart-3': '#22d3ee',
      '--chart-4': '#3b82f6',
      '--chart-5': '#14b8a6',
      '--chart-6': '#0284c7',
      '--chart-7': '#67e8f9',
      '--chart-8': '#0ea5e9'
    },
    dark: {
      ...PRESETS.calm.dark,
      '--surface-0': '#041c2f',
      '--surface-1': '#082f49',
      '--surface-2': '#0c4a6e',
      '--surface-3': '#075985',
      '--primary': '#22d3ee',
      '--accent': '#38bdf8',
      '--border': '#38bdf8',
      '--ring': '#67e8f9',
      '--chart-1': '#0ea5e9',
      '--chart-2': '#06b6d4',
      '--chart-3': '#22d3ee',
      '--chart-4': '#3b82f6',
      '--chart-5': '#14b8a6',
      '--chart-6': '#0284c7',
      '--chart-7': '#67e8f9',
      '--chart-8': '#0ea5e9'
    }
  };

  const STATUS_TO_TOKEN = {
    Open: '--status-open',
    'PM Approval': '--status-pm-approval',
    Approved: '--status-approved',
    'Legal Pending': '--status-legal-pending',
    'Credentials Ready': '--status-credentials-ready',
    'In Progress': '--status-in-progress',
    Released: '--status-released'
  };

  const TEAM_TO_TOKEN = {
    PM: '--team-pm',
    Development: '--team-development',
    Design: '--team-design',
    Marketing: '--team-marketing',
    'Data Analysts': '--team-data-analysts'
  };

  const STAGE_TO_TOKEN = {
    Planning: '--info',
    Development: '--primary',
    Review: '--warning',
    Launch: '--success'
  };

  const PRIORITY_TO_TOKEN = {
    Low: '--priority-low',
    Medium: '--priority-medium',
    High: '--priority-high',
    Critical: '--priority-critical'
  };

  const RISK_TO_TOKEN = {
    Low: '--risk-low',
    Medium: '--risk-medium',
    High: '--risk-high',
    Critical: '--risk-critical'
  };

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function applyTheme(theme) {
    const preset = PRESETS[theme.preset] ? theme.preset : DEFAULT_THEME.preset;
    const mode = theme.mode === 'dark' ? 'dark' : 'light';
    const next = PRESETS[preset][mode];
    Object.entries(next).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    document.documentElement.dataset.themePreset = preset;
    document.documentElement.dataset.themeMode = mode;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, mode }));
    document.dispatchEvent(new CustomEvent('themechange', { detail: { preset, mode } }));
  }

  function loadTheme() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        preset: parsed.preset || DEFAULT_THEME.preset,
        mode: parsed.mode || DEFAULT_THEME.mode
      };
    } catch (_err) {
      return { ...DEFAULT_THEME };
    }
  }

  function buildPalette(mapping) {
    const out = {};
    Object.entries(mapping).forEach(([key, token]) => {
      out[key] = cssVar(token);
    });
    return out;
  }

  const BATheme = {
    initTheme() {
      applyTheme(loadTheme());
    },
    setTheme(next) {
      applyTheme(next);
    },
    getTheme() {
      return loadTheme();
    },
    getStatusPalette() {
      return buildPalette(STATUS_TO_TOKEN);
    },
    getTeamPalette() {
      return buildPalette(TEAM_TO_TOKEN);
    },
    getStagePalette() {
      return buildPalette(STAGE_TO_TOKEN);
    },
    getPriorityPalette() {
      return buildPalette(PRIORITY_TO_TOKEN);
    },
    getRiskPalette() {
      return buildPalette(RISK_TO_TOKEN);
    },
    getChartPalette() {
      return Array.from({ length: 8 }, (_, i) => cssVar(`--chart-${i + 1}`));
    }
  };

  window.BATheme = BATheme;
  BATheme.initTheme();
})();
