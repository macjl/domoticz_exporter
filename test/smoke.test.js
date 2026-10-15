'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

for (const defaults of [false, true]) {
    test(`polling and fork metrics (default metrics: ${defaults})`, { timeout: 15000 }, async (t) => {
        const filters = new Set();
        const mock = http.createServer((req, res) => {
            const url = new URL(req.url, 'http://localhost');
            assert.equal(url.pathname, '/json.htm');
            assert.equal(url.searchParams.get('param'), 'getdevices');
            filters.add(url.searchParams.get('filter'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ result: [{
                Name: 'Smoke device', idx: '1', Type: 'Test', SubType: 'Test',
                HardwareName: 'Mock', HardwareType: 'Mock',
                Level: 50, Status: 'On', BatteryLevel: 100, Temp: 21,
                Humidity: 45, Barometer: 1013, Data: '12 kWh', Usage: '3 W',
                LastUpdate: '2026-01-02T03:04:05Z',
            }] }));
        });
        mock.listen(0, '127.0.0.1');
        await once(mock, 'listening');
        t.after(() => new Promise(resolve => mock.close(resolve)));
        // Reserve a temporary exporter port without relying on a fixed host port.
        const reserve = http.createServer().listen(0, '127.0.0.1');
        await once(reserve, 'listening');
        const port = reserve.address().port;
        await new Promise(resolve => reserve.close(resolve));
        const env = { ...process.env, DOMOTICZ_HOSTIP: '127.0.0.1',
            DOMOTICZ_HOSTPORT: String(mock.address().port), DOMOTICZ_PORT: String(port),
            DOMOTICZ_INTERVAL: '2', DEBUG: '' };
        delete env.DOMOTICZ_HOSTSSL;
        delete env.DOMOTICZ_DEFAULTMETRICS;
        const child = spawn(process.execPath, ['domoticz_exporter.js', ...(defaults ? ['--collectdefault'] : [])], { env });
        let output = '';
        child.stdout.on('data', chunk => { output += chunk; });
        child.stderr.on('data', chunk => { output += chunk; });
        t.after(async () => {
            if (child.exitCode === null && child.signalCode === null) {
                const exited = once(child, 'exit');
                child.kill();
                await exited;
            }
        });
        let metrics = '';
        const deadline = Date.now() + 10000;
        while (Date.now() < deadline) {
            assert.equal(child.exitCode, null, output);
            try {
                const response = await fetch(`http://127.0.0.1:${port}/`);
                assert.equal(response.status, 200);
                metrics = await response.text();
                if (metrics.includes('domoticz_utility_last_update{')) break;
            } catch (err) {
                if (err.code === 'ERR_ASSERTION') throw err;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.deepEqual([...filters].sort(), ['light', 'temp', 'utility', 'weather']);
        for (const type of ['light', 'temp', 'weather', 'utility']) {
            assert.match(metrics, new RegExp(`domoticz_${type}_last_update\\{[^}]+\\} ${Date.parse('2026-01-02T03:04:05Z')}(?:\\n|$)`));
        }
        assert.match(metrics, /domoticz_temp_temp\{[^}]+\} 21\n/);
        if (defaults) assert.match(metrics, /domoticz_process_cpu_user_seconds_total/);
        assert.doesNotMatch(output, /ERROR:/);
    });
}
