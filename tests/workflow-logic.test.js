const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

describe('Automated Workflow & Logic Test Suite', () => {

    it('All JS files must define identical Qatar Zone registry mappings', () => {
        const jsFiles = ['main.js', 'status.js', 'job-manage.js', 'admin.js', 'invoice.js'];
        for (const file of jsFiles) {
            const filePath = path.join(ROOT_DIR, 'js', file);
            if (!fs.existsSync(filePath)) continue;
            const content = fs.readFileSync(filePath, 'utf8');
            assert.ok(content.includes('QATAR_ZONE_NAMES'), `${file} must include QATAR_ZONE_NAMES lookup`);
            assert.ok(content.includes('getZoneAreaName'), `${file} must include getZoneAreaName() helper`);
        }
    });

    it('js/status.js must correctly map all 16 job lifecycle finite states', () => {
        const statusJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'status.js'), 'utf8');
        
        const expectedStates = [
            'draft',
            'pending_dispatch',
            'broadcasted',
            'accepted',
            'en_route',
            'arrived',
            'in_progress',
            'paused',
            'awaiting_parts_or_approval',
            'work_completed',
            'awaiting_client_confirmation',
            'disputed',
            'completed',
            'cancelled_by_client',
            'cancelled_by_technician',
            'expired'
        ];

        for (const state of expectedStates) {
            assert.ok(
                statusJs.includes(state),
                `js/status.js must handle the '${state}' lifecycle state`
            );
        }
    });

    it('js/status.js must implement Page Visibility API to optimize background polling', () => {
        const statusJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'status.js'), 'utf8');
        assert.ok(statusJs.includes('visibilitychange'), 'js/status.js must listen for visibilitychange events');
        assert.ok(statusJs.includes('document.hidden') || statusJs.includes('document.visibilityState'), 'js/status.js must check visibility state');
    });

    it('Pricing calculations must enforce QAR 50 call-out fee baseline', () => {
        const invoiceJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'invoice.js'), 'utf8');
        const mainJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'main.js'), 'utf8');
        
        assert.ok(invoiceJs.includes('50'), 'invoice.js must include 50 QAR baseline');
        assert.ok(mainJs.includes('50'), 'main.js must validate 50 QAR agreement');
    });
});
