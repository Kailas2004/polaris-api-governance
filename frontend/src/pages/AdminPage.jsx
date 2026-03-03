import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createApiKey,
  deactivateApiKey,
  getAdminProfile,
  getApiKeyById,
  getGlobalStrategy,
  getHealth,
  getAuditLogs,
  getMetricsSummary,
  listApiKeys,
  getStrategyDebug,
  updateStrategy
} from '../api/client';
import { getPanelId, getTabId, Tabs } from '../components/ui/tabs';
import MetricsOverviewChart from '../components/charts/MetricsOverviewChart';
import { useToast } from '../components/ui/toast';
import './admin.css';
import EndpointHint from '../components/ui/endpoint-hint';

const POLL_INTERVAL_MS = 10000;
const API_KEYS_PAGE_SIZE = 5;
const ADMIN_TABS = ['Dashboard', 'API Keys', 'Rate Policies', 'System Health'];
const STRATEGIES = ['TOKEN_BUCKET', 'SLIDING_WINDOW'];
const PLANS = ['FREE', 'PRO'];

const emptyMetricRows = () =>
  PLANS.flatMap((plan) => STRATEGIES.map((algorithm) => ({ plan, algorithm, allowed: 0, blocked: 0, unauthorized: 0, total: 0 })));

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabFromQuery = searchParams.get('tab');
  const initialTab = ADMIN_TABS.includes(currentTabFromQuery) ? currentTabFromQuery : 'Dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [adminProfile, setAdminProfile] = useState(null);
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(emptyMetricRows());
  const [auditLogs, setAuditLogs] = useState([]);

  const [createPlan, setCreatePlan] = useState('FREE');
  const [createdKey, setCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [allKeys, setAllKeys] = useState([]);
  const [apiKeysPage, setApiKeysPage] = useState(1);
  const [apiKeysPlanSort, setApiKeysPlanSort] = useState('none');
  const [apiKeysStatusSort, setApiKeysStatusSort] = useState('none');

  const [globalStrategy, setGlobalStrategy] = useState('TOKEN_BUCKET');
  const [freeOverride, setFreeOverride] = useState('SLIDING_WINDOW');
  const [proOverride, setProOverride] = useState('TOKEN_BUCKET');
  const [debugPayload, setDebugPayload] = useState(null);

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [metricQuery, setMetricQuery] = useState('');
  const [metricPlanFilter, setMetricPlanFilter] = useState('ALL');
  const [metricSort, setMetricSort] = useState('blocked-desc');
  const { pushToast } = useToast();

  useEffect(() => {
    if (currentTabFromQuery && ADMIN_TABS.includes(currentTabFromQuery) && currentTabFromQuery !== activeTab) {
      setActiveTab(currentTabFromQuery);
    }
  }, [activeTab, currentTabFromQuery]);

  const setErrorBanner = (err) => {
    const text = err?.message || 'Failed to reach backend';
    setBanner({ type: 'error', text });
    pushToast({ title: 'Action failed', description: text, variant: 'error' });
  };

  const refreshMetrics = useCallback(async () => {
    const payload = await getMetricsSummary();
    const rows = Array.isArray(payload) ? payload : [];
    setMetrics(rows);
  }, []);

  const refreshApiKeys = useCallback(async () => {
    const keys = await listApiKeys();
    setAllKeys(Array.isArray(keys) ? keys : []);
  }, []);

  const refreshAuditLogs = useCallback(async () => {
    const logs = await getAuditLogs(80);
    setAuditLogs(Array.isArray(logs) ? logs : []);
  }, []);

  const refreshAdminData = useCallback(async () => {
    const [profile, healthPayload, strategy, debug] = await Promise.all([
      getAdminProfile(),
      getHealth(),
      getGlobalStrategy(),
      getStrategyDebug()
    ]);

    setAdminProfile(profile);
    setHealth(healthPayload);
    setGlobalStrategy(strategy);
    setFreeOverride(profile.freePlanStrategy);
    setProOverride(profile.proPlanStrategy);
    setDebugPayload(debug);
    await Promise.all([refreshMetrics(), refreshApiKeys(), refreshAuditLogs()]);
  }, [refreshApiKeys, refreshAuditLogs, refreshMetrics]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        await refreshAdminData();
      } catch (err) {
        if (mounted) {
          setErrorBanner(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    const intervalId = setInterval(async () => {
      try {
        await refreshAdminData();
      } catch (err) {
        if (mounted) {
          setErrorBanner(err);
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [refreshAdminData]);

  const onCreateKey = async () => {
    setBanner(null);
    setCopiedKey(false);
    setCopiedId(false);
    try {
      const result = await createApiKey(createPlan);
      setCreatedKey(result);
      await refreshApiKeys();
      setBanner({ type: 'success', text: 'API key created' });
      pushToast({ title: 'API key created', description: `Plan ${result.planType}`, variant: 'success' });
    } catch (err) {
      setErrorBanner(err);
    }
  };

  const onCopyCreatedId = async () => {
    const id = createdKey?.id;
    if (!id) {
      return;
    }
    onCopyText(id, 'UUID copied');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2200);
  };

  const onCopyCreatedKey = async () => {
    const keyValue = createdKey?.keyValue;
    if (!keyValue) {
      return;
    }
    onCopyText(keyValue, 'API key copied');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2200);
  };

  const onCopyText = async (value, successTitle) => {
    if (!value || !navigator?.clipboard) {
      setBanner({ type: 'error', text: 'Clipboard is not available in this browser context' });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      pushToast({ title: successTitle, variant: 'success' });
    } catch (err) {
      setBanner({ type: 'error', text: err?.message || 'Failed to copy' });
    }
  };

  const onDeactivateListedKey = async (id, active) => {
    if (!id || !active) {
      return;
    }

    setBanner(null);
    try {
      await deactivateApiKey(id);
      await refreshApiKeys();
      if (lookupResult?.id === id) {
        setLookupResult((prev) => (prev ? { ...prev, active: false } : prev));
      }
      if (createdKey?.id === id) {
        setCreatedKey((prev) => (prev ? { ...prev, active: false } : prev));
      }
      setBanner({ type: 'success', text: `API key ${id} deactivated` });
      pushToast({ title: 'API key deactivated', description: id, variant: 'success' });
    } catch (err) {
      setErrorBanner(err);
    }
  };

  const onLookupKey = async () => {
    if (!lookupId.trim()) {
      setBanner({ type: 'error', text: 'Enter key ID' });
      return;
    }

    setBanner(null);
    try {
      const result = await getApiKeyById(lookupId.trim());
      setLookupResult(result);
    } catch (err) {
      setLookupResult(null);
      setErrorBanner(err);
    }
  };

  const onDeactivateKey = async () => {
    if (!lookupResult?.id) {
      return;
    }

    setBanner(null);
    try {
      await deactivateApiKey(lookupResult.id);
      const fresh = await getApiKeyById(lookupResult.id);
      setLookupResult(fresh);
      await refreshApiKeys();
      setBanner({ type: 'success', text: 'API key deactivated' });
      pushToast({ title: 'API key deactivated', variant: 'success' });
    } catch (err) {
      setErrorBanner(err);
    }
  };

  const onUpdateStrategy = async ({ strategy, plan }) => {
    setBanner(null);
    try {
      await updateStrategy({ strategy, plan });
      await refreshAdminData();
      setBanner({
        type: 'success',
        text: plan ? `${plan} strategy switched to ${strategy}` : `Global strategy switched to ${strategy}`
      });
      pushToast({
        title: 'Strategy updated',
        description: plan ? `${plan} -> ${strategy}` : `Global -> ${strategy}`,
        variant: 'success'
      });
    } catch (err) {
      setErrorBanner(err);
    }
  };

  const dbStatus = health?.components?.db?.status || 'UNKNOWN';
  const redisStatus = health?.components?.redis?.status || 'UNKNOWN';

  const isUp = (value) => (value || '').toUpperCase() === 'UP';

  const healthJson = useMemo(() => {
    if (!health) {
      return '{}';
    }
    return JSON.stringify(health, null, 2);
  }, [health]);

  const formatAuditTime = (value) => {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  const sortedApiKeys = useMemo(() => {
    const planRank =
      apiKeysPlanSort === 'free-first'
        ? { FREE: 0, PRO: 1 }
        : apiKeysPlanSort === 'pro-first'
          ? { PRO: 0, FREE: 1 }
          : null;

    return [...allKeys].sort((a, b) => {
      if (planRank) {
        const planDiff = (planRank[a.planType] ?? 99) - (planRank[b.planType] ?? 99);
        if (planDiff !== 0) {
          return planDiff;
        }
      }

      if (apiKeysStatusSort !== 'none') {
        const activeRankA = a.active ? 0 : 1;
        const activeRankB = b.active ? 0 : 1;
        const statusDiff =
          apiKeysStatusSort === 'active-first' ? activeRankA - activeRankB : activeRankB - activeRankA;
        if (statusDiff !== 0) {
          return statusDiff;
        }
      }

      return 0;
    });
  }, [allKeys, apiKeysPlanSort, apiKeysStatusSort]);

  const apiKeysTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedApiKeys.length / API_KEYS_PAGE_SIZE));
  }, [sortedApiKeys.length]);

  const pagedApiKeys = useMemo(() => {
    const start = (apiKeysPage - 1) * API_KEYS_PAGE_SIZE;
    return sortedApiKeys.slice(start, start + API_KEYS_PAGE_SIZE);
  }, [sortedApiKeys, apiKeysPage]);

  useEffect(() => {
    if (apiKeysPage > apiKeysTotalPages) {
      setApiKeysPage(apiKeysTotalPages);
    }
  }, [apiKeysPage, apiKeysTotalPages]);

  useEffect(() => {
    setApiKeysPage(1);
  }, [apiKeysPlanSort, apiKeysStatusSort]);

  const visibleMetrics = useMemo(() => {
    const normalizedQuery = metricQuery.trim().toLowerCase();
    const next = metrics.filter((row) => {
      if (metricPlanFilter !== 'ALL' && row.plan !== metricPlanFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return `${row.plan} ${row.algorithm}`.toLowerCase().includes(normalizedQuery);
    });

    const sorters = {
      'blocked-desc': (a, b) => b.blocked - a.blocked || b.allowed - a.allowed,
      'allowed-desc': (a, b) => b.allowed - a.allowed || b.blocked - a.blocked,
      'plan-asc': (a, b) => a.plan.localeCompare(b.plan) || a.algorithm.localeCompare(b.algorithm)
    };
    return [...next].sort(sorters[metricSort]);
  }, [metricPlanFilter, metricQuery, metricSort, metrics]);

  const globalMetricsSummary = useMemo(() => {
    const totalAllowed = metrics.reduce((sum, row) => sum + (row.allowed || 0), 0);
    const totalBlocked = metrics.reduce((sum, row) => sum + (row.blocked || 0), 0);
    const totalRequests = totalAllowed + totalBlocked;
    const globalBlockRate = totalRequests > 0 ? (totalBlocked / totalRequests) * 100 : 0;

    return {
      totalRequests,
      totalBlocked,
      globalBlockRate
    };
  }, [metrics]);

  const onTabChange = (tab) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <section className="admin-page">
      <div className="page-title-row">
        <h1>RATE LIMIT CONTROL PLANE</h1>
        <p>ENV: PROD</p>
      </div>
      <p className="page-summary">
        Manage API key lifecycle, monitor Redis-backed rate limiting behavior, and switch global or plan-specific strategies in real time.
      </p>

      <Tabs items={ADMIN_TABS} value={activeTab} onChange={onTabChange} ariaLabel="Admin sections" idPrefix="admin-sections" />

      {banner && <p className={`banner ${banner.type}`}>{banner.text}</p>}
      {loading && <p className="muted">Loading admin data...</p>}

      {activeTab === 'Dashboard' && (
        <div
          className="card-grid dashboard-grid"
          role="tabpanel"
          id={getPanelId('admin-sections', 'Dashboard')}
          aria-labelledby={getTabId('admin-sections', 'Dashboard')}
        >
          <article className="panel">
            <h2>Infrastructure Status</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/actuator/health" detail="infrastructure health" />
            </p>
            <div className="kv-list">
              <div>
                <span>Overall Status</span>
                <strong className={isUp(health?.status) ? 'state-up' : 'state-down'}>{health?.status || 'UNKNOWN'}</strong>
              </div>
              <div>
                <span>Redis</span>
                <strong className={isUp(redisStatus) ? 'state-up' : 'state-down'}>{redisStatus}</strong>
              </div>
              <div>
                <span>Database</span>
                <strong className={isUp(dbStatus) ? 'state-up' : 'state-down'}>{dbStatus}</strong>
              </div>
            </div>
          </article>

          <article className="panel strategy-overview-panel">
            <h2>Active Rate Limit Strategies</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/profiles/admin" detail="strategy overview" />
            </p>
            <div className="kv-list strategy-kv-list">
              <div>
                <span>Global Strategy</span>
                <strong>{adminProfile?.globalStrategy || '-'}</strong>
              </div>
              <div>
                <span>FREE Plan Strategy</span>
                <strong>{adminProfile?.freePlanStrategy || '-'}</strong>
              </div>
              <div>
                <span>PRO Plan Strategy</span>
                <strong>{adminProfile?.proPlanStrategy || '-'}</strong>
              </div>
            </div>
          </article>

          <article className="panel panel-wide">
            <h2>Metrics Summary</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/admin/metrics/summary" detail="persisted totals" />
            </p>
            <div className="metrics-global-summary" aria-label="Global metrics summary">
              <div>
                <span>Total Requests</span>
                <strong>{globalMetricsSummary.totalRequests}</strong>
              </div>
              <div>
                <span>Total Blocked</span>
                <strong>{globalMetricsSummary.totalBlocked}</strong>
              </div>
              <div>
                <span>Global Block Rate</span>
                <strong>{globalMetricsSummary.globalBlockRate.toFixed(1)}%</strong>
              </div>
            </div>
            <div className="metrics-toolbar">
              <input
                value={metricQuery}
                onChange={(event) => setMetricQuery(event.target.value)}
                placeholder="Search plan or algorithm"
                aria-label="Search metrics rows"
              />
              <select
                value={metricPlanFilter}
                onChange={(event) => setMetricPlanFilter(event.target.value)}
                aria-label="Filter metrics by plan"
              >
                <option value="ALL">All plans</option>
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
              </select>
              <select value={metricSort} onChange={(event) => setMetricSort(event.target.value)} aria-label="Sort metrics rows">
                <option value="blocked-desc">Sort by Blocked</option>
                <option value="allowed-desc">Sort by Allowed</option>
                <option value="plan-asc">Sort by Plan</option>
              </select>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PLAN</th>
                    <th>ALGORITHM</th>
                    <th>ALLOWED COUNT</th>
                    <th>BLOCKED COUNT</th>
                    <th>UNAUTHORIZED COUNT</th>
                    <th>TOTAL COUNT</th>
                    <th>BLOCK RATE %</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMetrics.map((row) => {
                    const allowedBlockedTotal = (row.allowed || 0) + (row.blocked || 0);
                    const blockRate = allowedBlockedTotal > 0 ? ((row.blocked || 0) / allowedBlockedTotal) * 100 : 0;
                    const blockRateClass = blockRate >= 50 ? 'block-rate-high' : blockRate >= 20 ? 'block-rate-medium' : 'block-rate-low';
                    return (
                      <tr key={`${row.plan}-${row.algorithm}`}>
                        <td className="cell-plan">{row.plan}</td>
                        <td className="cell-algorithm">{row.algorithm}</td>
                        <td className={`cell-metric ${row.allowed > 0 ? 'is-nonzero allowed' : ''}`}>{row.allowed}</td>
                        <td className={`cell-metric ${row.blocked > 0 ? 'is-nonzero blocked' : ''}`}>{row.blocked}</td>
                        <td className={`cell-metric ${row.unauthorized > 0 ? 'is-nonzero unauthorized' : ''}`}>{row.unauthorized || 0}</td>
                        <td className={`cell-metric ${row.total > 0 ? 'is-nonzero total' : ''}`}>{row.total || 0}</td>
                        <td className={`cell-metric ${blockRate > 0 ? `is-nonzero block-rate ${blockRateClass}` : ''}`}>{blockRate.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleMetrics.length === 0 && <p className="table-empty-note">No rows match current filters.</p>}
            </div>
            <p className="muted auto-refresh-note">Auto-refresh every 10 seconds.</p>
          </article>

          <MetricsOverviewChart metrics={metrics} />
        </div>
      )}

      {activeTab === 'API Keys' && (
        <div
          className="card-grid api-keys-grid"
          role="tabpanel"
          id={getPanelId('admin-sections', 'API Keys')}
          aria-labelledby={getTabId('admin-sections', 'API Keys')}
        >
          <article className="panel">
            <h2>Create New API Key</h2>
            <p className="table-title">
              <EndpointHint method="POST" path="/api/keys" detail="create key by plan" />
            </p>
            <fieldset className="radio-set">
              <legend>Select Plan</legend>
              <label>
                <input
                  type="radio"
                  name="create-plan"
                  value="FREE"
                  checked={createPlan === 'FREE'}
                  onChange={(event) => setCreatePlan(event.target.value)}
                />
                FREE
              </label>
              <label>
                <input
                  type="radio"
                  name="create-plan"
                  value="PRO"
                  checked={createPlan === 'PRO'}
                  onChange={(event) => setCreatePlan(event.target.value)}
                />
                PRO
              </label>
            </fieldset>
            <button type="button" onClick={onCreateKey}>
              Generate Key
            </button>
            {createdKey && (
              <section className="generated-key-card">
                <p className="generated-key-title">New Key Created</p>
                <div className="generated-key-value">{createdKey.keyValue}</div>
                <div className="generated-key-meta">
                  <span>ID: {createdKey.id}</span>
                  <span>Plan: {createdKey.planType}</span>
                  <span>Status: {createdKey.active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div className="generated-key-actions">
                  <button type="button" className="copy-key-btn" onClick={onCopyCreatedKey}>
                    {copiedKey ? 'Key Copied' : 'Copy API Key'}
                  </button>
                  <button type="button" className="copy-key-btn copy-id-btn" onClick={onCopyCreatedId}>
                    {copiedId ? 'UUID Copied' : 'Copy UUID'}
                  </button>
                </div>
              </section>
            )}
          </article>

          <article className="panel">
            <h2>Lookup Existing Key</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/api/keys/{id}" detail="fetch by UUID" />
            </p>
            <div className="inline-form">
              <input
                value={lookupId}
                onChange={(event) => setLookupId(event.target.value)}
                placeholder="Enter key UUID"
              />
              <button type="button" onClick={onLookupKey}>
                Fetch
              </button>
            </div>
            <p className="lookup-helper">First fetch the key if you wish to deactivate it.</p>

            {lookupResult && (
              <div className="kv-list">
                <div>
                  <span>ID</span>
                  <strong>{lookupResult.id}</strong>
                </div>
                <div>
                  <span>Plan Type</span>
                  <strong>{lookupResult.planType}</strong>
                </div>
                <div>
                  <span>Active</span>
                  <strong>{String(lookupResult.active)}</strong>
                </div>
                <div>
                  <span>Created At</span>
                  <strong>{lookupResult.createdAt}</strong>
                </div>
              </div>
            )}

            {lookupResult && (
              <button type="button" onClick={onDeactivateKey} disabled={!lookupResult.active}>
                Deactivate Key
              </button>
            )}
          </article>

          <article className="panel panel-wide">
            <h2>All API Keys</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/api/keys" detail="list keys" />
            </p>
            <div className="api-keys-toolbar">
              <label>
                Sort by Plan
                <select value={apiKeysPlanSort} onChange={(event) => setApiKeysPlanSort(event.target.value)}>
                  <option value="none">Default</option>
                  <option value="free-first">FREE first</option>
                  <option value="pro-first">PRO first</option>
                </select>
              </label>
              <label>
                Sort by Status
                <select value={apiKeysStatusSort} onChange={(event) => setApiKeysStatusSort(event.target.value)}>
                  <option value="none">Default</option>
                  <option value="active-first">ACTIVE first</option>
                  <option value="inactive-first">INACTIVE first</option>
                </select>
              </label>
            </div>
            <div className="table-wrap api-keys-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>UUID</th>
                    <th>API KEY</th>
                    <th>PLAN</th>
                    <th>STATUS</th>
                    <th>CREATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedApiKeys.map((key) => (
                    <tr key={key.id}>
                      <td className="mono">{key.id}</td>
                      <td className="mono api-key-cell">{key.keyValue}</td>
                      <td className="cell-plan">{key.planType}</td>
                      <td>
                        <span className={key.active ? 'badge-up' : 'badge-down'}>{key.active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
                      <td>{key.createdAt || '-'}</td>
                      <td className="actions-cell">
                        <button type="button" className="table-action-btn" onClick={() => onCopyText(key.keyValue, 'API key copied')}>
                          Copy Key
                        </button>
                        <button type="button" className="table-action-btn" onClick={() => onCopyText(key.id, 'UUID copied')}>
                          Copy UUID
                        </button>
                        <button
                          type="button"
                          className="table-action-btn danger"
                          onClick={() => onDeactivateListedKey(key.id, key.active)}
                          disabled={!key.active}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedApiKeys.length === 0 && <p className="table-empty-note">No API keys yet.</p>}
            </div>
            {sortedApiKeys.length > 0 && (
              <div className="table-pagination">
                <p>
                  Showing {(apiKeysPage - 1) * API_KEYS_PAGE_SIZE + 1}-
                  {Math.min(apiKeysPage * API_KEYS_PAGE_SIZE, sortedApiKeys.length)} of {sortedApiKeys.length}
                </p>
                <div className="table-pagination-actions">
                  <button type="button" onClick={() => setApiKeysPage((prev) => Math.max(1, prev - 1))} disabled={apiKeysPage === 1}>
                    Previous
                  </button>
                  <span>
                    Page {apiKeysPage} / {apiKeysTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setApiKeysPage((prev) => Math.min(apiKeysTotalPages, prev + 1))}
                    disabled={apiKeysPage >= apiKeysTotalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>
      )}

      {activeTab === 'Rate Policies' && (
        <div
          className="card-grid rate-policies-grid"
          role="tabpanel"
          id={getPanelId('admin-sections', 'Rate Policies')}
          aria-labelledby={getTabId('admin-sections', 'Rate Policies')}
        >
          <article className="panel strategy-panel">
            <h2>Global Strategy</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/admin/strategy" detail="current strategy" />
            </p>
            <p className="value-block">{globalStrategy || '-'}</p>
            <fieldset className="radio-set">
              <legend>Change Global Strategy</legend>
              {STRATEGIES.map((strategy) => (
                <label key={`global-${strategy}`}>
                  <input
                    type="radio"
                    name="global-strategy"
                    value={strategy}
                    checked={globalStrategy === strategy}
                    onChange={(event) => setGlobalStrategy(event.target.value)}
                  />
                  {strategy}
                </label>
              ))}
            </fieldset>
            <button type="button" onClick={() => onUpdateStrategy({ strategy: globalStrategy })}>
              Update Global Strategy
            </button>
          </article>

          <article className="panel plan-overrides-panel">
            <h2>Plan-Specific Overrides</h2>
            <p className="table-title">
              <EndpointHint method="POST" path="/admin/strategy" detail="override global or plan" />
            </p>
            <div className="plan-overrides-grid">
              <section className="plan-block plan-override-card">
                <h3><span className="plan-badge">FREE</span> Plan</h3>
                <p>Current (resolved): {adminProfile?.freePlanStrategy || '-'}</p>
                <fieldset className="radio-set">
                  <legend className="sr-only">FREE override</legend>
                  {STRATEGIES.map((strategy) => (
                    <label key={`free-${strategy}`}>
                      <input
                        type="radio"
                        name="free-strategy"
                        value={strategy}
                        checked={freeOverride === strategy}
                        onChange={(event) => setFreeOverride(event.target.value)}
                      />
                      {strategy}
                    </label>
                  ))}
                </fieldset>
                <button type="button" onClick={() => onUpdateStrategy({ plan: 'FREE', strategy: freeOverride })}>
                  Apply to FREE
                </button>
              </section>

              <section className="plan-block plan-override-card">
                <h3><span className="plan-badge">PRO</span> Plan</h3>
                <p>Current (resolved): {adminProfile?.proPlanStrategy || '-'}</p>
                <fieldset className="radio-set">
                  <legend className="sr-only">PRO override</legend>
                  {STRATEGIES.map((strategy) => (
                    <label key={`pro-${strategy}`}>
                      <input
                        type="radio"
                        name="pro-strategy"
                        value={strategy}
                        checked={proOverride === strategy}
                        onChange={(event) => setProOverride(event.target.value)}
                      />
                      {strategy}
                    </label>
                  ))}
                </fieldset>
                <button type="button" onClick={() => onUpdateStrategy({ plan: 'PRO', strategy: proOverride })}>
                  Apply to PRO
                </button>
              </section>
            </div>
          </article>

          <article className="panel panel-wide admin-debug-panel">
            <h2>Admin Debug</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/admin/strategy/debug" detail="runtime state" />
            </p>
            <pre>{JSON.stringify(debugPayload || {}, null, 2)}</pre>
          </article>
        </div>
      )}

      {activeTab === 'System Health' && (
        <div
          className="card-grid"
          role="tabpanel"
          id={getPanelId('admin-sections', 'System Health')}
          aria-labelledby={getTabId('admin-sections', 'System Health')}
        >
          <article className="panel">
            <h2>System Health</h2>
            <p className="table-title">
              <EndpointHint method="GET" path="/actuator/health" detail="infrastructure health" />
            </p>
            <div className="kv-list">
              <div>
                <span>Overall Status</span>
                <strong className={isUp(health?.status) ? 'state-up' : 'state-down'}>{health?.status || 'UNKNOWN'}</strong>
              </div>
              <div>
                <span>redis</span>
                <strong className={isUp(redisStatus) ? 'state-up' : 'state-down'}>{redisStatus}</strong>
              </div>
              <div>
                <span>db</span>
                <strong className={isUp(dbStatus) ? 'state-up' : 'state-down'}>{dbStatus}</strong>
              </div>
            </div>
          </article>

          <article className="panel panel-wide raw-json-panel">
            <h2>Raw JSON</h2>
            <pre>{healthJson}</pre>
          </article>

          <article className="panel panel-wide">
            <div className="audit-header">
              <h2>Admin Audit Logs</h2>
              <button type="button" onClick={refreshAuditLogs}>
                Refresh Logs
              </button>
            </div>
            <p className="table-title">
              <EndpointHint method="GET" path="/admin/audit/logs" detail="latest admin actions" />
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>ACTOR</th>
                    <th>ACTION</th>
                    <th>TARGET</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatAuditTime(entry.createdAt)}</td>
                      <td className="cell-plan">{entry.actor}</td>
                      <td className="cell-algorithm">{entry.action}</td>
                      <td className="mono">{entry.resourceType}:{entry.resourceId}</td>
                      <td>{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && <p className="table-empty-note">No admin actions logged yet.</p>}
            </div>
          </article>

        </div>
      )}
    </section>
  );
};

export default AdminPage;
