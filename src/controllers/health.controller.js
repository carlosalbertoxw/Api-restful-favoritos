import mongoose from 'mongoose';

const PING_TIMEOUT_MS = 2000;

// Hace ping a MongoDB con un límite de tiempo, para que un servidor que no
// responde no deje colgada la petición hasta el timeout del driver.
export async function checkDatabase({ timeoutMs = PING_TIMEOUT_MS } = {}) {
  const { connection } = mongoose;
  if (connection.readyState !== mongoose.ConnectionStates.connected) {
    return false;
  }

  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Ping timeout')), timeoutMs);
  });

  try {
    await Promise.race([connection.db.admin().ping(), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Liveness: el proceso está vivo y atiende peticiones.
export function liveness(_req, res) {
  res.set('Cache-Control', 'no-store').json({ status: 'ok' });
}

// Readiness: el servicio puede atender tráfico (MongoDB disponible).
export async function readiness(_req, res) {
  const database = (await checkDatabase()) ? 'up' : 'down';
  const ok = database === 'up';

  res
    .status(ok ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json({ status: ok ? 'ok' : 'error', checks: { database } });
}
