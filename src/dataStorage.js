const REMINDER_STORAGE_KEY = 'hxwl-61303-reminder-settings';
const DEFAULT_REMINDER_SETTINGS = {
  '7天': 2,
  '15天': 3,
  '30天': 7
};

const RISK_RULES_STORAGE_KEY = 'hxwl-61303-risk-rules';
const DEFAULT_RISK_RULES = {
  overdueEnabled: true,
  overdueLabel: '逾期未维保',
  soonExpireDays: 3,
  soonExpireEnabled: true,
  soonExpireLabel: '即将到期',
  overloadThreshold: 5,
  overloadEnabled: true,
  overloadLabel: '任务过载',
  estateConcentrationThreshold: 3,
  estateConcentrationWindow: 7,
  estateConcentrationEnabled: true,
  estateConcentrationLabel: '集中到期'
};

const ROUTE_PLANS_STORAGE_KEY = 'hxwl-61303-route-plans';
const AUTO_PLAN_DRAFT_STORAGE_KEY = 'hxwl-61303-auto-plan-draft';
const AUTO_PLAN_HISTORY_STORAGE_KEY = 'hxwl-61303-auto-plan-history';
const AUTO_PLAN_CONFIG_STORAGE_KEY = 'hxwl-61303-auto-plan-config';

const DEFAULT_AUTO_PLAN_CONFIG = {
  planDays: 30,
  defaultDailyLimit: 5,
  ownerDailyLimits: {},
  estateConcentration: true,
  priorityOverdue: true,
  prioritySoon: true,
  allowAdvanceScheduling: false,
  maxAdvanceDays: 0,
  ownerFairness: true,
  considerExistingRoutes: true
};

const appDefaults = {
  reminderSettings: DEFAULT_REMINDER_SETTINGS,
  riskRules: DEFAULT_RISK_RULES,
  autoPlanConfig: DEFAULT_AUTO_PLAN_CONFIG
};

function loadReminderSettings() {
  const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_REMINDER_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
  }
  return { ...DEFAULT_REMINDER_SETTINGS };
}

function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
}

function loadRiskRules() {
  const raw = localStorage.getItem(RISK_RULES_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_RISK_RULES, ...parsed };
    } catch {
      return { ...DEFAULT_RISK_RULES };
    }
  }
  return { ...DEFAULT_RISK_RULES };
}

function saveRiskRules(rules) {
  localStorage.setItem(RISK_RULES_STORAGE_KEY, JSON.stringify(rules));
}

function loadRoutePlans() {
  const raw = localStorage.getItem(ROUTE_PLANS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function saveRoutePlans(plans) {
  localStorage.setItem(ROUTE_PLANS_STORAGE_KEY, JSON.stringify(plans));
}

function loadAutoPlanDraft() {
  const raw = localStorage.getItem(AUTO_PLAN_DRAFT_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function saveAutoPlanDraft(draft) {
  localStorage.setItem(AUTO_PLAN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearAutoPlanDraft() {
  localStorage.removeItem(AUTO_PLAN_DRAFT_STORAGE_KEY);
}

function loadAutoPlanHistory() {
  const raw = localStorage.getItem(AUTO_PLAN_HISTORY_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function saveAutoPlanHistory(history) {
  localStorage.setItem(AUTO_PLAN_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

function loadAutoPlanConfig() {
  const raw = localStorage.getItem(AUTO_PLAN_CONFIG_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTO_PLAN_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_AUTO_PLAN_CONFIG };
    }
  }
  return { ...DEFAULT_AUTO_PLAN_CONFIG };
}

function saveAutoPlanConfig(config) {
  localStorage.setItem(AUTO_PLAN_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function getEmptyRoutePlan(date) {
  return {
    date,
    routes: [],
    updatedAt: null
  };
}

function planUid() {
  return 'plan_' + Math.random().toString(36).slice(2, 12);
}

function routeUid() {
  return 'rt_' + Math.random().toString(36).slice(2, 10);
}

export {
  REMINDER_STORAGE_KEY,
  DEFAULT_REMINDER_SETTINGS,
  RISK_RULES_STORAGE_KEY,
  DEFAULT_RISK_RULES,
  ROUTE_PLANS_STORAGE_KEY,
  AUTO_PLAN_DRAFT_STORAGE_KEY,
  AUTO_PLAN_HISTORY_STORAGE_KEY,
  AUTO_PLAN_CONFIG_STORAGE_KEY,
  DEFAULT_AUTO_PLAN_CONFIG,
  appDefaults,
  loadReminderSettings,
  saveReminderSettings,
  loadRiskRules,
  saveRiskRules,
  loadRoutePlans,
  saveRoutePlans,
  loadAutoPlanDraft,
  saveAutoPlanDraft,
  clearAutoPlanDraft,
  loadAutoPlanHistory,
  saveAutoPlanHistory,
  loadAutoPlanConfig,
  saveAutoPlanConfig,
  getEmptyRoutePlan,
  planUid,
  routeUid
};
