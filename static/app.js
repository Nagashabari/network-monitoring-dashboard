const refreshButton = document.getElementById('refreshButton');
const lastRefresh = document.getElementById('lastRefresh');
const onlineCount = document.getElementById('onlineCount');
const averageLatency = document.getElementById('averageLatency');
const historyTarget = document.getElementById('historyTarget');
const historyMessage = document.getElementById('historyMessage');
const latencyChart = document.getElementById('latencyChart');
const packetLossChart = document.getElementById('packetLossChart');

const SVG_NS = 'http://www.w3.org/2000/svg';
let refreshInProgress = false;

// Keeps track of previous alert states
// so the same alert doesn't pop up every 30 seconds.
const previousAlerts = new Map();


// ========================================
// NOTIFICATION / TOAST SYSTEM
// ========================================

function createNotificationContainer() {
  let container = document.getElementById('notificationContainer');

  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';

    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.width = '340px';
    container.style.maxWidth = 'calc(100vw - 40px)';

    document.body.appendChild(container);
  }

  return container;
}


function showNotification(message, type = 'danger') {
  const container = createNotificationContainer();

  const notification = document.createElement('div');

  notification.style.padding = '14px 16px';
  notification.style.borderRadius = '10px';
  notification.style.fontSize = '14px';
  notification.style.fontWeight = '600';
  notification.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.justifyContent = 'space-between';
  notification.style.gap = '12px';
  notification.style.animation = 'slideIn 0.3s ease';

  if (type === 'danger') {
    notification.style.background = '#fee2e2';
    notification.style.color = '#b91c1c';
    notification.style.border = '1px solid #fca5a5';
  } else if (type === 'warning') {
    notification.style.background = '#ffedd5';
    notification.style.color = '#c2410c';
    notification.style.border = '1px solid #fdba74';
  } else {
    notification.style.background = '#fef3c7';
    notification.style.color = '#a16207';
    notification.style.border = '1px solid #fcd34d';
  }

  const messageText = document.createElement('span');
  messageText.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';

  closeButton.style.border = 'none';
  closeButton.style.background = 'transparent';
  closeButton.style.fontSize = '22px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.color = 'inherit';
  closeButton.style.lineHeight = '1';

  closeButton.addEventListener('click', () => {
    notification.remove();
  });

  notification.appendChild(messageText);
  notification.appendChild(closeButton);

  container.appendChild(notification);

  // Automatically disappear after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
}


// Add animation once to the page
const notificationStyle = document.createElement('style');

notificationStyle.textContent = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

document.head.appendChild(notificationStyle);


// ========================================
// ALERT CHECK
// ========================================

function handleAlert(result) {
  if (!result.alert) return;

  const previousAlert = previousAlerts.get(result.id);

  // Don't show the same alert repeatedly
  if (previousAlert === result.alert) {
    return;
  }

  previousAlerts.set(result.id, result.alert);

  // Healthy status doesn't need a notification
  if (result.alert.includes('Healthy')) {
    return;
  }

  let type = 'danger';

  if (result.alert.includes('High Packet Loss')) {
    type = 'warning';
  } else if (result.alert.includes('High Latency')) {
    type = 'warning';
  }

  showNotification(
    `${result.name}: ${result.alert}`,
    type
  );
}


// ========================================
// CARD UPDATE
// ========================================

function setCard(result) {
  const card = document.querySelector(
    `[data-target-id="${result.id}"]`
  );

  if (!card) return;

  card.classList.remove(
    'loading',
    'online',
    'offline'
  );

  card.classList.add(
    result.online ? 'online' : 'offline'
  );

  const badge = card.querySelector('.status-badge');

  badge.textContent =
    result.online ? 'Online' : 'Offline';

  card.querySelector(
    '[data-field="latency"]'
  ).textContent =
    text(result.latency_ms, ' ms');

  card.querySelector(
    '[data-field="loss"]'
  ).textContent =
    text(result.packet_loss, '%');

  card.querySelector(
    '[data-field="dns"]'
  ).textContent =
    result.dns_ip || 'Failed';

  card.querySelector(
    '[data-field="port"]'
  ).textContent =
    result.port === null
      ? 'Not configured'
      : (
          result.port_open
            ? `${result.port} open`
            : `${result.port} closed`
        );

  card.querySelector(
    '[data-field="uptime"]'
  ).textContent =
    text(result.uptime_percent, '%');

  card.querySelector(
    '[data-field="error"]'
  ).textContent =
    result.error || '';

  // Send alert to notification system
  handleAlert(result);
}


// ========================================
// TEXT HELPER
// ========================================

function text(value, suffix = '') {
  return value === null || value === undefined
    ? '—'
    : `${value}${suffix}`;
}


// ========================================
// SVG CHART HELPERS
// ========================================

function svgElement(
  name,
  attributes = {},
  value = null
) {
  const element =
    document.createElementNS(
      SVG_NS,
      name
    );

  Object.entries(attributes).forEach(
    ([key, attributeValue]) => {
      element.setAttribute(
        key,
        attributeValue
      );
    }
  );

  if (value !== null) {
    element.textContent = value;
  }

  return element;
}


function formatChartTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}


// ========================================
// CHART STATISTICS
// ========================================

function updateChartStats(
  prefix,
  values,
  suffix
) {
  const latest =
    document.getElementById(
      `${prefix}Latest`
    );

  const average =
    document.getElementById(
      `${prefix}Average`
    );

  const peak =
    document.getElementById(
      `${prefix}Peak`
    );

  if (!values.length) {
    latest.textContent = '—';
    average.textContent = '—';
    peak.textContent = '—';
    return;
  }

  const latestValue =
    values[values.length - 1];

  const averageValue =
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length;

  const peakValue =
    Math.max(...values);

  latest.textContent =
    `${latestValue.toFixed(1)}${suffix}`;

  average.textContent =
    `${averageValue.toFixed(1)}${suffix}`;

  peak.textContent =
    `${peakValue.toFixed(1)}${suffix}`;
}


// ========================================
// TIME SERIES CHART
// ========================================

function renderTimeSeries(
  svg,
  history,
  key,
  unit,
  fixedMaximum = null
) {
  svg.replaceChildren();

  const width = 720;
  const height = 280;

  const margin = {
    top: 18,
    right: 18,
    bottom: 40,
    left: 54
  };

  const plotWidth =
    width -
    margin.left -
    margin.right;

  const plotHeight =
    height -
    margin.top -
    margin.bottom;

  const values = history.map(row =>
    typeof row[key] === 'number'
      ? row[key]
      : null
  );

  const numericValues =
    values.filter(
      value => value !== null
    );

  if (!numericValues.length) {
    svg.appendChild(
      svgElement(
        'text',
        {
          x: width / 2,
          y: height / 2,
          class: 'empty-label'
        },
        `No ${
          key === 'latency_ms'
            ? 'latency'
            : 'packet loss'
        } data yet`
      )
    );

    return;
  }

  const observedMaximum =
    Math.max(...numericValues);

  const dynamicMaximum =
    observedMaximum <= 0
      ? 10
      : Math.ceil(
          (observedMaximum * 1.2) / 5
        ) * 5;

  const yMaximum =
    fixedMaximum ??
    Math.max(10, dynamicMaximum);

  const xForIndex = index =>
    history.length === 1
      ? margin.left +
        plotWidth / 2
      : margin.left +
        (index /
          (history.length - 1)) *
          plotWidth;

  const yForValue = value =>
    margin.top +
    plotHeight -
    (Math.min(value, yMaximum) /
      yMaximum) *
      plotHeight;

  for (
    let step = 0;
    step <= 4;
    step += 1
  ) {
    const ratio = step / 4;

    const y =
      margin.top +
      ratio * plotHeight;

    const labelValue =
      yMaximum * (1 - ratio);

    svg.appendChild(
      svgElement(
        'line',
        {
          x1: margin.left,
          y1: y,
          x2: width - margin.right,
          y2: y,
          class: 'grid-line'
        }
      )
    );

    svg.appendChild(
      svgElement(
        'text',
        {
          x: margin.left - 10,
          y: y + 3,
          class: 'axis-label',
          'text-anchor': 'end'
        },
        `${labelValue.toFixed(
          labelValue >= 10
            ? 0
            : 1
        )}${unit}`
      )
    );
  }

  const labelIndexes = [
    ...new Set([
      0,
      Math.floor(
        (history.length - 1) / 2
      ),
      history.length - 1
    ])
  ];

  labelIndexes.forEach(
    (index, position) => {
      const anchor =
        position === 0
          ? 'start'
          : position ===
              labelIndexes.length - 1
            ? 'end'
            : 'middle';

      svg.appendChild(
        svgElement(
          'text',
          {
            x: xForIndex(index),
            y: height - 10,
            class: 'axis-label',
            'text-anchor': anchor
          },
          formatChartTime(
            history[index].checked_at
          )
        )
      );
    }
  );

  let segment = [];
  const segments = [];

  values.forEach(
    (value, index) => {
      if (value === null) {
        if (segment.length) {
          segments.push(segment);
        }

        segment = [];
        return;
      }

      segment.push({
        index,
        value
      });
    }
  );

  if (segment.length) {
    segments.push(segment);
  }

  segments.forEach(points => {
    const path = points
      .map(
        (point, pointIndex) => {
          const command =
            pointIndex === 0
              ? 'M'
              : 'L';

          return `${command} ${
            xForIndex(point.index)
          } ${
            yForValue(point.value)
          }`;
        }
      )
      .join(' ');

    if (points.length > 1) {
      const first = points[0];
      const last =
        points[points.length - 1];

      const areaPath =
        `${path} L ${
          xForIndex(last.index)
        } ${
          margin.top +
          plotHeight
        } L ${
          xForIndex(first.index)
        } ${
          margin.top +
          plotHeight
        } Z`;

      svg.appendChild(
        svgElement(
          'path',
          {
            d: areaPath,
            class: 'area-fill'
          }
        )
      );
    }

    svg.appendChild(
      svgElement(
        'path',
        {
          d: path,
          class: 'series-line'
        }
      )
    );
  });

  if (history.length <= 40) {
    values.forEach(
      (value, index) => {
        if (value === null) return;

        const dot = svgElement(
          'circle',
          {
            cx: xForIndex(index),
            cy: yForValue(value),
            r: 3,
            class: 'series-dot'
          }
        );

        dot.appendChild(
          svgElement(
            'title',
            {},
            `${formatChartTime(
              history[index].checked_at
            )} · ${value.toFixed(
              1
            )}${unit}`
          )
        );

        svg.appendChild(dot);
      }
    );
  }
}


// ========================================
// LOAD HISTORY
// ========================================

async function loadHistory() {
  if (
    !historyTarget ||
    historyTarget.disabled ||
    !historyTarget.value
  ) {
    return;
  }

  historyMessage.textContent =
    'Loading measurement history…';

  try {
    const response =
      await fetch(
        `/api/history/${historyTarget.value}?limit=60`,
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    const history =
      data.history || [];

    renderTimeSeries(
      latencyChart,
      history,
      'latency_ms',
      ' ms'
    );

    renderTimeSeries(
      packetLossChart,
      history,
      'packet_loss',
      '%',
      100
    );

    const latencyValues =
      history
        .map(row => row.latency_ms)
        .filter(
          value =>
            typeof value === 'number'
        );

    const lossValues =
      history
        .map(row => row.packet_loss)
        .filter(
          value =>
            typeof value === 'number'
        );

    updateChartStats(
      'latency',
      latencyValues,
      ' ms'
    );

    updateChartStats(
      'loss',
      lossValues,
      '%'
    );

    const selectedName =
      historyTarget
        .options[
          historyTarget.selectedIndex
        ]?.text ||
      'target';

    historyMessage.textContent =
      history.length
        ? `${history.length} stored checks shown for ${selectedName}.`
        : 'No stored measurements yet. Run a check to create the first data point.';

  } catch (error) {
    historyMessage.textContent =
      'Could not load chart history.';

    console.error(error);
  }
}


// ========================================
// REFRESH STATUS
// ========================================

async function refreshStatus() {
  if (refreshInProgress) {
    return;
  }

  refreshInProgress = true;

  refreshButton.disabled = true;
  refreshButton.textContent =
    'Checking…';

  try {
    const response =
      await fetch(
        '/api/status',
        {
          cache: 'no-store'
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    data.targets.forEach(setCard);

    const online =
      data.targets.filter(
        item => item.online
      ).length;

    const latencies =
      data.targets
        .map(
          item => item.latency_ms
        )
        .filter(
          value =>
            typeof value === 'number'
        );

    onlineCount.textContent =
      `${online}/${data.targets.length}`;

    averageLatency.textContent =
      latencies.length
        ? `${(
            latencies.reduce(
              (a, b) => a + b,
              0
            ) / latencies.length
          ).toFixed(1)} ms`
        : '—';

    lastRefresh.textContent =
      new Date().toLocaleTimeString();

    await loadHistory();

  } catch (error) {
    lastRefresh.textContent =
      'Refresh failed';

    console.error(error);

  } finally {
    refreshInProgress = false;

    refreshButton.disabled = false;

    refreshButton.textContent =
      'Run checks now';
  }
}


// ========================================
// EVENTS
// ========================================

refreshButton.addEventListener(
  'click',
  refreshStatus
);

if (historyTarget) {
  historyTarget.addEventListener(
    'change',
    loadHistory
  );
}


// Initial check
refreshStatus();


// Automatic check every 30 seconds
setInterval(
  refreshStatus,
  30000
);