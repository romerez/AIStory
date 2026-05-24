import { useEffect } from 'react';
import {
  getProfileKeyLabel,
  getProfileUsageId,
  normalizeUsageStats,
} from '../data/usageTracker';

function UsageManager({ usageStats, modelSettings, onClearUsage, onClose }) {
  const rows = buildUsageRows(usageStats, modelSettings);
  const hasUsage = rows.some((row) => row.storyRuns || row.imageRuns);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="panel settings-panel modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="usage-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Usage</p>
            <h2 id="usage-title">Model key usage</h2>
            <p>Estimated local activity by model and key. Provider billing still lives in each provider dashboard.</p>
          </div>
          <div className="settings-actions">
            {hasUsage && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear usage?')) {
                    onClearUsage();
                  }
                }}
              >
                Clear usage
              </button>
            )}
            <button type="button" className="icon-text-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="settings-scroll-area">
          <div className="usage-table-wrap">
            <table className="usage-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Calls</th>
                  <th>Pages</th>
                  <th>Est. tokens</th>
                  <th>Last used</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.modelLabel}</strong>
                      <span>{row.provider || row.modelName || 'Custom'}</span>
                    </td>
                    <td>{row.keyLabel}</td>
                    <td>{row.kind === 'story' ? 'Story' : 'Images'}</td>
                    <td>{formatNumber(row.kind === 'story' ? row.storyRuns : row.imageRuns)}</td>
                    <td>{formatPages(row)}</td>
                    <td>{row.kind === 'story' ? formatNumber(row.estimatedInputTokens + row.estimatedOutputTokens) : '-'}</td>
                    <td>{formatDate(row.lastUsedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildUsageRows(usageStats, modelSettings) {
  const stats = normalizeUsageStats(usageStats);
  const rowsById = new Map(stats.map((item) => [item.id, item]));
  const currentRows = [
    ...(modelSettings.storyModels || []).map((profile) => buildProfileRow(profile, 'story', rowsById)),
    ...(modelSettings.imageModels || []).map((profile) => buildProfileRow(profile, 'image', rowsById)),
  ];
  const currentIds = new Set(currentRows.map((row) => row.id));
  const historicalRows = stats.filter((item) => !currentIds.has(item.id));

  return [...currentRows, ...historicalRows];
}

function buildProfileRow(profile, kind, rowsById) {
  const id = getProfileUsageId(profile, kind);
  const existing = rowsById.get(id);
  const baseRow = {
    id,
    kind,
    provider: profile.provider || '',
    modelId: profile.id || '',
    modelLabel: profile.label || profile.modelName || 'Untitled model',
    modelName: profile.modelName || '',
    keyLabel: getProfileKeyLabel(profile),
    keyId: '',
    storyRuns: 0,
    imageRuns: 0,
    generatedPages: 0,
    regeneratedImages: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    lastUsedAt: '',
  };

  return {
    ...baseRow,
    ...existing,
    ...baseRow,
    storyRuns: existing?.storyRuns || 0,
    imageRuns: existing?.imageRuns || 0,
    generatedPages: existing?.generatedPages || 0,
    regeneratedImages: existing?.regeneratedImages || 0,
    estimatedInputTokens: existing?.estimatedInputTokens || 0,
    estimatedOutputTokens: existing?.estimatedOutputTokens || 0,
    lastUsedAt: existing?.lastUsedAt || '',
  };
}

function formatPages(row) {
  const pages = formatNumber(row.generatedPages);

  if (row.kind === 'image' && row.regeneratedImages > 0) {
    return `${pages} + ${formatNumber(row.regeneratedImages)} regen`;
  }

  return pages;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default UsageManager;
