const anomalyService = require('../services/anomalyService');
const { broadcast } = require('../websocket/wsServer');

let intervalId = null;

function startAnomalyDetector(wss) {
  console.log('Anomaly detector started (every 30s)');
  intervalId = setInterval(async () => {
    try {
      const [zeroCheckins, capacityBreaches, revenueDrops] = await Promise.all([
        anomalyService.detectZeroCheckins(),
        anomalyService.detectCapacityBreach(),
        anomalyService.detectRevenueDrop(),
      ]);

      const allAnomalies = [...zeroCheckins, ...capacityBreaches, ...revenueDrops];
      for (const anomaly of allAnomalies) {
        if (anomaly.resolved) {
          broadcast(wss, 'ANOMALY_RESOLVED', {
            anomaly_id: anomaly.id,
            gym_id: anomaly.gymId,
            resolved_at: anomaly.resolvedAt || new Date().toISOString(),
          });
        } else {
          broadcast(wss, 'ANOMALY_DETECTED', {
            anomaly_id: anomaly.id,
            gym_id: anomaly.gymId,
            gym_name: anomaly.gymName,
            anomaly_type: anomaly.type,
            severity: anomaly.severity,
            message: anomaly.message,
          });
        }
      }
    } catch (err) {
      console.error('Anomaly detector error:', err);
    }
  }, 30000);
}

function stopAnomalyDetector() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startAnomalyDetector, stopAnomalyDetector };
