"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
} from "lucide-react";

type View = "overview" | "managers" | "updates" | "activity";

type Overview = {
  total_users: number;
  total_players: number;
  total_managers: number;
  pending_managers: number;
  approved_managers: number;
  total_teams: number;
  total_fixtures: number;
  paid_payments: number;
  payment_volume_pence: number;
};

type Manager = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  status: string;
  applied_at: string;
  updated_at?: string;
};

type PlatformActivity = {
  id: string;
  activity_type: string;
  message: string;
  resource_type: string;
  resource_id: number;
  occurred_at: string;
  details?: Record<string, string | number | null>;
};

type Decision = { manager: Manager; action: "approve" | "reject" } | null;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const demoOverview: Overview = {
  total_users: 50,
  total_players: 38,
  total_managers: 12,
  pending_managers: 5,
  approved_managers: 6,
  total_teams: 4,
  total_fixtures: 13,
  paid_payments: 7,
  payment_volume_pence: 6000,
};

const demoManagers: Manager[] = [
  {
    id: 4,
    first_name: "Michael",
    last_name: "Owusu",
    full_name: "Michael Owusu",
    email: "pendingmanager@example.com",
    status: "pending",
    applied_at: "2026-07-30T19:15:19.990Z",
  },
  {
    id: 31,
    first_name: "Patrick",
    last_name: "Amfo",
    full_name: "Patrick Amfo",
    email: "patrick@email.com",
    status: "pending",
    applied_at: "2026-08-03T15:27:14.492Z",
  },
  {
    id: 32,
    first_name: "patrick",
    last_name: "amfo",
    full_name: "patrick amfo",
    email: "kwame@email.com",
    status: "pending",
    applied_at: "2026-08-03T15:31:49.375Z",
  },
  {
    id: 33,
    first_name: "test",
    last_name: "test",
    full_name: "test test",
    email: "test@email.com",
    status: "pending",
    applied_at: "2026-08-03T15:40:27.861Z",
  },
  {
    id: 37,
    first_name: "Patrick",
    last_name: "Amfo",
    full_name: "Patrick Amfo",
    email: "amfo@example.com",
    status: "pending",
    applied_at: "2026-08-05T00:33:56.116Z",
  },
];

const demoActivities: PlatformActivity[] = [
  {
    id: "payment-7",
    activity_type: "payment_received",
    message: "A £10.00 match payment was completed",
    resource_type: "MatchPayment",
    resource_id: 7,
    occurred_at: "2026-08-11T08:42:00.000Z",
  },
  {
    id: "user-55",
    activity_type: "user_registered",
    message: "Test2 Man registered as a manager",
    resource_type: "User",
    resource_id: 55,
    occurred_at: "2026-08-11T08:15:00.000Z",
  },
  {
    id: "fixture-13",
    activity_type: "fixture_created",
    message: "Fixture against East London Rovers was created",
    resource_type: "Match",
    resource_id: 13,
    occurred_at: "2026-08-10T19:36:00.000Z",
  },
  {
    id: "team-4",
    activity_type: "team_created",
    message: "Hackney Athletic was created",
    resource_type: "Team",
    resource_id: 4,
    occurred_at: "2026-08-10T14:08:00.000Z",
  },
  {
    id: "user-54",
    activity_type: "user_registered",
    message: "Jordan Ellis registered as a player",
    resource_type: "User",
    resource_id: 54,
    occurred_at: "2026-08-10T11:24:00.000Z",
  },
];

const navItems: Array<{
  id: View;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "managers", label: "Manager reviews", icon: ShieldCheck },
  { id: "updates", label: "App updates", icon: Megaphone },
  { id: "activity", label: "Platform activity", icon: Activity },
];

const viewCopy: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Tuesday, 11 August",
    title: "Good morning, Patrick",
    description: "Here’s what’s happening across MatchMuster today.",
  },
  managers: {
    eyebrow: "Approvals",
    title: "Manager applications",
    description: "Review every pending manager before they can create a team.",
  },
  updates: {
    eyebrow: "Communications",
    title: "App updates",
    description: "Send a clear in-app announcement to every approved manager.",
  },
  activity: {
    eyebrow: "Audit trail",
    title: "Platform activity",
    description: "A live view of registrations, teams, fixtures and payments.",
  },
};

function formatMoney(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function activityMeta(type: string) {
  if (type === "payment_received") {
    return { icon: CreditCard, label: "Payment", tone: "mint" };
  }
  if (type === "fixture_created") {
    return { icon: CalendarDays, label: "Fixture", tone: "blue" };
  }
  if (type === "team_created") {
    return { icon: UsersRound, label: "Team", tone: "violet" };
  }
  return { icon: CircleUserRound, label: "Registration", tone: "amber" };
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [overview, setOverview] = useState(demoOverview);
  const [managers, setManagers] = useState(demoManagers);
  const [activities, setActivities] = useState(demoActivities);
  const [isDemo, setIsDemo] = useState(true);
  const [developerEmail, setDeveloperEmail] = useState("matchmuster.dev@gmail.com");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [managerSearch, setManagerSearch] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [toast, setToast] = useState("");

  const filteredManagers = useMemo(() => {
    const query = managerSearch.trim().toLowerCase();
    if (!query) return managers;
    return managers.filter(
      (manager) =>
        manager.full_name.toLowerCase().includes(query) ||
        manager.email.toLowerCase().includes(query),
    );
  }, [managerSearch, managers]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("developerToken");
    const savedEmail = window.localStorage.getItem("developerEmail");
    if (!savedToken) return;

    const restoreTimer = window.setTimeout(() => {
      setToken(savedToken);
      setIsDemo(false);
      if (savedEmail) setDeveloperEmail(savedEmail);
      void loadLiveData(savedToken);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
    // Restore the independently scoped developer session once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function request(path: string, options: RequestInit = {}, activeToken = token) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: activeToken,
        ...options.headers,
      },
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(data?.error ?? data?.errors?.join(", ") ?? "Request failed");
    }
    return data;
  }

  async function loadLiveData(activeToken = token) {
    if (!activeToken) return;
    setLoading(true);
    try {
      const [dashboard, pending, activity] = await Promise.all([
        request("/developer/dashboard", {}, activeToken),
        request("/developer/managers", {}, activeToken),
        request("/developer/activities?limit=20", {}, activeToken),
      ]);
      setOverview(dashboard.overview);
      setManagers(pending.managers);
      setActivities(activity.activities);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not refresh the dashboard");
    } finally {
      setLoading(false);
    }
  }

  function showView(nextView: View) {
    setView(nextView);
    setMobileMenuOpen(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developer: { email: loginEmail, password: loginPassword },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Email or password is incorrect");
      const authHeader = response.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Login worked, but the Authorization header was not exposed by CORS.");
      }
      const freshToken = authHeader.startsWith("Bearer ")
        ? authHeader
        : `Bearer ${authHeader}`;
      window.localStorage.setItem("developerToken", freshToken);
      window.localStorage.setItem("developerEmail", data.developer.email);
      setToken(freshToken);
      setDeveloperEmail(data.developer.email);
      setIsDemo(false);
      setLoginOpen(false);
      setLoginPassword("");
      await loadLiveData(freshToken);
      setToast("Developer account connected");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to log in");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!isDemo && token) {
      try {
        await request("/developer/logout", { method: "DELETE" });
      } catch {
        // Clear local access even if the server session has already expired.
      }
    }
    window.localStorage.removeItem("developerToken");
    window.localStorage.removeItem("developerEmail");
    setToken("");
    setIsDemo(true);
    setOverview(demoOverview);
    setManagers(demoManagers);
    setActivities(demoActivities);
    setToast("Signed out — showing preview data");
  }

  async function confirmDecision() {
    if (!decision) return;
    setLoading(true);
    const { manager, action } = decision;
    try {
      if (!isDemo) {
        await request(`/developer/managers/${manager.id}/${action}`, {
          method: "PATCH",
        });
      }
      setManagers((current) => current.filter((item) => item.id !== manager.id));
      setOverview((current) => ({
        ...current,
        pending_managers: Math.max(0, current.pending_managers - 1),
        approved_managers:
          action === "approve"
            ? current.approved_managers + 1
            : current.approved_managers,
      }));
      setDecision(null);
      setToast(`${manager.full_name} was ${action === "approve" ? "approved" : "rejected"}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The decision could not be saved");
    } finally {
      setLoading(false);
    }
  }

  async function sendUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateTitle.trim() || !updateMessage.trim()) {
      setToast("Add both a title and message");
      return;
    }
    setLoading(true);
    try {
      if (!isDemo) {
        await request("/developer/app_updates", {
          method: "POST",
          body: JSON.stringify({
            app_update: { title: updateTitle, message: updateMessage },
          }),
        });
      }
      setUpdateTitle("");
      setUpdateMessage("");
      setToast(`Update sent to ${overview.approved_managers} approved managers`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The update could not be sent");
    } finally {
      setLoading(false);
    }
  }

  const copy = viewCopy[view];

  return (
    <main className="dashboard-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <span>MM</span>
          </div>
          <div>
            <div className="brand-name">MatchMuster</div>
            <div className="brand-subtitle">Control centre</div>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Developer dashboard">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "nav-item-active" : ""}`}
                onClick={() => showView(item.id)}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
                {item.id === "managers" && overview.pending_managers > 0 && (
                  <span className="nav-count">{overview.pending_managers}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-status">
          <div className="status-art" aria-hidden="true">
            <span className="pitch-line pitch-line-one" />
            <span className="pitch-line pitch-line-two" />
            <ShieldCheck size={25} />
          </div>
          <p className="status-title">Platform healthy</p>
          <p className="status-copy">All developer services are online.</p>
          <div className="status-live"><span /> Live</div>
        </div>

        <div className="developer-card">
          <div className="avatar">PA</div>
          <div className="developer-details">
            <strong>Patrick Amfo</strong>
            <span>{isDemo ? "Dashboard preview" : developerEmail}</span>
          </div>
          <button className="icon-button sidebar-logout" onClick={handleLogout} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <section className="dashboard-main">
        <header className="topbar">
          <button
            className="menu-button icon-button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>
          <div className="topbar-wordmark">MatchMuster <span>Developer</span></div>
          <div className="topbar-actions">
            <div className={`connection-pill ${isDemo ? "connection-preview" : ""}`}>
              <span /> {isDemo ? "Preview data" : "Live data"}
            </div>
            {isDemo ? (
              <button className="button button-dark button-small" onClick={() => setLoginOpen(true)}>
                Connect API
              </button>
            ) : (
              <button
                className="icon-button refresh-button"
                onClick={() => loadLiveData()}
                aria-label="Refresh data"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "spin" : ""} />
              </button>
            )}
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
            {view === "overview" && (
              <button className="button button-light" onClick={() => showView("activity")}>
                View activity <ArrowRight size={17} />
              </button>
            )}
          </div>

          {view === "overview" && (
            <OverviewView
              overview={overview}
              managers={managers}
              activities={activities}
              onView={showView}
              onDecision={setDecision}
            />
          )}

          {view === "managers" && (
            <ManagersView
              managers={filteredManagers}
              total={managers.length}
              search={managerSearch}
              onSearch={setManagerSearch}
              onDecision={setDecision}
            />
          )}

          {view === "updates" && (
            <UpdatesView
              approvedManagers={overview.approved_managers}
              title={updateTitle}
              message={updateMessage}
              loading={loading}
              onTitle={setUpdateTitle}
              onMessage={setUpdateMessage}
              onSubmit={sendUpdate}
            />
          )}

          {view === "activity" && <ActivityView activities={activities} />}
        </div>
      </section>

      {decision && (
        <div className="modal-layer" role="presentation">
          <button className="modal-scrim" aria-label="Cancel" onClick={() => setDecision(null)} />
          <section className="decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <button className="modal-close icon-button" onClick={() => setDecision(null)} aria-label="Close">
              <X size={19} />
            </button>
            <div className={`modal-icon ${decision.action === "approve" ? "modal-icon-approve" : "modal-icon-reject"}`}>
              {decision.action === "approve" ? <Check size={24} /> : <X size={24} />}
            </div>
            <p className="eyebrow">Confirm decision</p>
            <h2 id="decision-title">
              {decision.action === "approve" ? "Approve" : "Reject"} {decision.manager.full_name}?
            </h2>
            <p>
              {decision.action === "approve"
                ? "They’ll be able to create and manage a team immediately."
                : "They’ll lose access to manager features. The rejection email and account removal are on our final side-quest list."}
            </p>
            <div className="modal-actions">
              <button className="button button-light" onClick={() => setDecision(null)}>Cancel</button>
              <button
                className={`button ${decision.action === "approve" ? "button-primary" : "button-danger"}`}
                onClick={confirmDecision}
                disabled={loading}
              >
                {loading ? "Saving…" : `Yes, ${decision.action}`}
              </button>
            </div>
          </section>
        </div>
      )}

      {loginOpen && (
        <div className="modal-layer" role="presentation">
          <button className="modal-scrim" aria-label="Close login" onClick={() => setLoginOpen(false)} />
          <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="modal-close icon-button" onClick={() => setLoginOpen(false)} aria-label="Close">
              <X size={19} />
            </button>
            <div className="login-brand"><span>MM</span></div>
            <p className="eyebrow">Secure control centre</p>
            <h2 id="login-title">Connect your developer account</h2>
            <p className="login-intro">Use the developer login we tested. Your JWT is stored separately from normal player and manager sessions.</p>
            <form onSubmit={handleLogin} className="login-form">
              <label>
                Developer email
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="matchmuster.dev@gmail.com"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>
              {loginError && <div className="form-error">{loginError}</div>}
              <button className="button button-primary button-full" disabled={loading}>
                {loading ? "Connecting…" : "Connect dashboard"}
              </button>
            </form>
            <div className="login-footnote"><ShieldCheck size={16} /> Protected by the developer-only JWT scope</div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </main>
  );
}

function OverviewView({
  overview,
  managers,
  activities,
  onView,
  onDecision,
}: {
  overview: Overview;
  managers: Manager[];
  activities: PlatformActivity[];
  onView: (view: View) => void;
  onDecision: (decision: Decision) => void;
}) {
  const metrics = [
    {
      label: "Total users",
      value: overview.total_users,
      note: `${overview.total_players} players · ${overview.total_managers} managers`,
      icon: Users,
      tone: "metric-green",
    },
    {
      label: "Active teams",
      value: overview.total_teams,
      note: "Teams using MatchMuster",
      icon: UsersRound,
      tone: "metric-blue",
    },
    {
      label: "Fixtures created",
      value: overview.total_fixtures,
      note: "Across all registered teams",
      icon: CalendarDays,
      tone: "metric-violet",
    },
    {
      label: "Payments processed",
      value: formatMoney(overview.payment_volume_pence),
      note: `${overview.paid_payments} successful payments`,
      icon: CreditCard,
      tone: "metric-amber",
    },
  ];

  return (
    <>
      <section className="metrics-grid" aria-label="Platform overview">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-icon ${metric.tone}`}><Icon size={20} /></div>
              <div className="metric-label">{metric.label}</div>
              <strong>{metric.value}</strong>
              <p>{metric.note}</p>
            </article>
          );
        })}
      </section>

      <section className="attention-banner">
        <div className="attention-icon"><BellRing size={21} /></div>
        <div>
          <strong>{overview.pending_managers} manager applications need your review</strong>
          <p>Oldest application has been waiting since 30 July.</p>
        </div>
        <button className="button button-dark" onClick={() => onView("managers")}>
          Review applications <ArrowRight size={17} />
        </button>
      </section>

      <div className="overview-grid">
        <section className="panel applications-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h2>Pending managers</h2>
            </div>
            <button className="text-button" onClick={() => onView("managers")}>View all <ChevronRight size={16} /></button>
          </div>
          <div className="manager-list compact-manager-list">
            {managers.slice(0, 3).map((manager) => (
              <ManagerRow key={manager.id} manager={manager} onDecision={onDecision} compact />
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Latest</p>
              <h2>Recent activity</h2>
            </div>
            <button className="text-button" onClick={() => onView("activity")}>View all <ChevronRight size={16} /></button>
          </div>
          <div className="activity-list compact-activity-list">
            {activities.slice(0, 4).map((item) => <ActivityRow key={item.id} item={item} />)}
          </div>
        </section>
      </div>
    </>
  );
}

function ManagerRow({ manager, onDecision, compact = false }: { manager: Manager; onDecision: (decision: Decision) => void; compact?: boolean }) {
  return (
    <article className={`manager-row ${compact ? "manager-row-compact" : ""}`}>
      <div className="manager-avatar">{initials(manager.full_name)}</div>
      <div className="manager-info">
        <strong>{manager.full_name}</strong>
        <span>{manager.email}</span>
      </div>
      {!compact && (
        <div className="manager-date">
          <span>Applied</span>
          <strong>{formatDate(manager.applied_at)}</strong>
        </div>
      )}
      <div className="manager-actions">
        <button className="decision-button decision-reject" onClick={() => onDecision({ manager, action: "reject" })} aria-label={`Reject ${manager.full_name}`}>
          <X size={17} /> <span>Reject</span>
        </button>
        <button className="decision-button decision-approve" onClick={() => onDecision({ manager, action: "approve" })} aria-label={`Approve ${manager.full_name}`}>
          <Check size={17} /> <span>Approve</span>
        </button>
      </div>
    </article>
  );
}

function ManagersView({ managers, total, search, onSearch, onDecision }: { managers: Manager[]; total: number; search: string; onSearch: (value: string) => void; onDecision: (decision: Decision) => void }) {
  return (
    <section className="panel full-panel">
      <div className="toolbar">
        <div className="toolbar-count"><span>{total}</span> pending applications</div>
        <label className="search-box">
          <Search size={18} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search name or email" aria-label="Search applications" />
        </label>
      </div>
      <div className="manager-list full-manager-list">
        {managers.length ? (
          managers.map((manager) => <ManagerRow key={manager.id} manager={manager} onDecision={onDecision} />)
        ) : (
          <div className="empty-state">
            <CheckCircle2 size={28} />
            <h3>No applications found</h3>
            <p>You’re all caught up, or no manager matches that search.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function UpdatesView({ approvedManagers, title, message, loading, onTitle, onMessage, onSubmit }: { approvedManagers: number; title: string; message: string; loading: boolean; onTitle: (value: string) => void; onMessage: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="updates-layout">
      <section className="panel composer-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">New announcement</p>
            <h2>Compose update</h2>
          </div>
          <div className="recipient-pill"><Users size={15} /> {approvedManagers} recipients</div>
        </div>
        <form className="update-form" onSubmit={onSubmit}>
          <label>
            Update title
            <input value={title} onChange={(event) => onTitle(event.target.value)} maxLength={80} placeholder="e.g. MatchMuster maintenance" />
            <span className="character-count">{title.length}/80</span>
          </label>
          <label>
            Message
            <textarea value={message} onChange={(event) => onMessage(event.target.value)} maxLength={300} placeholder="Write a short, useful message for your managers…" />
            <span className="character-count">{message.length}/300</span>
          </label>
          <div className="composer-actions">
            <p><BellRing size={16} /> Sends one in-app notification. No email.</p>
            <button className="button button-primary" disabled={loading}>
              <Send size={17} /> {loading ? "Sending…" : "Send update"}
            </button>
          </div>
        </form>
      </section>

      <aside className="update-aside">
        <section className="panel delivery-card">
          <div className="delivery-icon"><Megaphone size={21} /></div>
          <h3>Who receives this?</h3>
          <p>Every manager whose MatchMuster account has been approved.</p>
          <div className="delivery-stat"><strong>{approvedManagers}</strong><span>approved managers</span></div>
        </section>
        <section className="panel tip-card">
          <Sparkles size={19} />
          <div>
            <strong>Keep it useful</strong>
            <p>Send updates only when a change affects how managers use the app.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ActivityView({ activities }: { activities: PlatformActivity[] }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? activities : activities.filter((item) => item.activity_type === filter);
  return (
    <section className="panel full-panel">
      <div className="activity-filters" aria-label="Filter platform activity">
        {[
          ["all", "All activity"],
          ["user_registered", "Registrations"],
          ["team_created", "Teams"],
          ["fixture_created", "Fixtures"],
          ["payment_received", "Payments"],
        ].map(([value, label]) => (
          <button key={value} className={filter === value ? "filter-active" : ""} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>
      <div className="activity-list full-activity-list">
        {filtered.map((item) => <ActivityRow key={item.id} item={item} detailed />)}
      </div>
    </section>
  );
}

function ActivityRow({ item, detailed = false }: { item: PlatformActivity; detailed?: boolean }) {
  const meta = activityMeta(item.activity_type);
  const Icon = meta.icon;
  return (
    <article className={`activity-row ${detailed ? "activity-row-detailed" : ""}`}>
      <div className={`activity-icon activity-${meta.tone}`}><Icon size={18} /></div>
      <div className="activity-copy">
        <strong>{item.message}</strong>
        <span>{meta.label} · {relativeTime(item.occurred_at)}</span>
      </div>
      {detailed && (
        <div className="resource-id">{item.resource_type} #{item.resource_id}</div>
      )}
    </article>
  );
}
