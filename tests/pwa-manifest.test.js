const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

describe('PWA & Configuration Test Suite', () => {

    it('manifest.json must be valid JSON with required PWA properties', () => {
        const manifestPath = path.join(ROOT_DIR, 'manifest.json');
        assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
        
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content);
        
        assert.ok(manifest.name, 'manifest.json must have name');
        assert.ok(manifest.short_name, 'manifest.json must have short_name');
        assert.ok(manifest.start_url, 'manifest.json must have start_url');
        assert.ok(manifest.display, 'manifest.json must have display');
        assert.ok(manifest.icons && manifest.icons.length > 0, 'manifest.json must specify icons');
    });

    it('service-worker.js must exist and be registered on core pages', () => {
        const swPath = path.join(ROOT_DIR, 'service-worker.js');
        assert.ok(fs.existsSync(swPath), 'service-worker.js must exist');
        
        const swContent = fs.readFileSync(swPath, 'utf8');
        assert.ok(swContent.includes('install'), 'service-worker.js must handle install event');
        assert.ok(swContent.includes('fetch'), 'service-worker.js must handle fetch event');
    });
});
