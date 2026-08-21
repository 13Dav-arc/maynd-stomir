
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '..');

const HTML_FILES = [
    'index.html',
    'request.html',
    'status.html',
    'job-manage.html',
    'admin.html',
    'invoice.html',
    'partners.html',
    'login.html',
    'pricing-terms.html',
    'privacy.html',
    'verify-onboard.html',
    'technicians.html'
].filter(f => fs.existsSync(path.join(ROOT_DIR, f)));

const domCache = new Map();
function getParsedDoc(file) {
    if (!domCache.has(file)) {
        const html = fs.readFileSync(path.join(ROOT_DIR, file), 'utf8');
        const sanitizedHtml = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<link\b[^>]*>/gi, '');
        const dom = new JSDOM(sanitizedHtml, { pretendToBeVisual: false });
        domCache.set(file, { html, dom });
    }
    return domCache.get(file);
}

describe('Automated UI & Accessibility Test Suite', () => {

    it('All HTML pages must have a valid HTML5 doctype and lang attribute', () => {
        for (const file of HTML_FILES) {
            const { html, dom } = getParsedDoc(file);
            assert.match(html, /<!DOCTYPE html>/i, `${file} missing <!DOCTYPE html>`);
            const htmlElem = dom.window.document.documentElement;
            assert.strictEqual(htmlElem.getAttribute('lang'), 'en', `${file} must have lang="en"`);
        }
    });

    it('All HTML pages must contain a mobile-responsive viewport meta tag', () => {
        for (const file of HTML_FILES) {
            const { dom } = getParsedDoc(file);
            const viewportMeta = dom.window.document.querySelector('meta[name="viewport"]');
            assert.ok(viewportMeta, `${file} missing viewport meta tag`);
            const content = viewportMeta.getAttribute('content');
            assert.ok(content.includes('width=device-width'), `${file} viewport must contain width=device-width`);
            assert.ok(content.includes('initial-scale=1.0'), `${file} viewport must contain initial-scale=1.0`);
        }
    });

    it('All main HTML pages must have a WCAG AA skip link pointing to #main-content', () => {
        const pagesRequiringSkipLink = [
            'index.html',
            'request.html',
            'status.html',
            'job-manage.html',
            'admin.html',
            'invoice.html',
            'partners.html',
            'login.html',
            'pricing-terms.html',
            'privacy.html',
            'verify-onboard.html'
        ].filter(f => fs.existsSync(path.join(ROOT_DIR, f)));

        for (const file of pagesRequiringSkipLink) {
            const { dom } = getParsedDoc(file);
            const skipLink = dom.window.document.querySelector('a.skip-link');
            assert.ok(skipLink, `${file} missing <a class="skip-link">`);
            assert.strictEqual(skipLink.getAttribute('href'), '#main-content', `${file} skip-link must point to #main-content`);
            
            const mainContent = dom.window.document.getElementById('main-content');
            assert.ok(mainContent, `${file} must have an element with id="main-content"`);
        }
    });

    it('No HTML page should contain duplicate element IDs', () => {
        for (const file of HTML_FILES) {
            const { dom } = getParsedDoc(file);
            const allElements = dom.window.document.querySelectorAll('[id]');
            const idMap = new Map();

            allElements.forEach(el => {
                const id = el.id;
                if (id) {
                    if (idMap.has(id)) {
                        idMap.set(id, idMap.get(id) + 1);
                    } else {
                        idMap.set(id, 1);
                    }
                }
            });

            const duplicates = [];
            for (const [id, count] of idMap.entries()) {
                if (count > 1) duplicates.push(`${id} (occurs ${count} times)`);
            }

            assert.strictEqual(duplicates.length, 0, `${file} has duplicate IDs: ${duplicates.join(', ')}`);
        }
    });

    it('Interactive modals must have role="dialog" and aria-modal="true"', () => {
        const modalFiles = ['status.html', 'request.html', 'job-manage.html', 'admin.html', 'partners.html'];
        for (const file of modalFiles) {
            const filePath = path.join(ROOT_DIR, file);
            if (!fs.existsSync(filePath)) continue;

            const { dom } = getParsedDoc(file);
            const modals = dom.window.document.querySelectorAll('[role="dialog"]');

            modals.forEach(modal => {
                const ariaModal = modal.getAttribute('aria-modal');
                assert.strictEqual(ariaModal, 'true', `${file} modal #${modal.id || modal.className} with role="dialog" must have aria-modal="true"`);
            });
        }
    });

    it('Offline network toast container must exist on core operational pages', () => {
        const operationalPages = ['status.html', 'request.html', 'job-manage.html', 'admin.html', 'invoice.html', 'partners.html'];
        for (const file of operationalPages) {
            const filePath = path.join(ROOT_DIR, file);
            if (!fs.existsSync(filePath)) continue;

            const { dom } = getParsedDoc(file);
            const toast = dom.window.document.getElementById('network-toast');
            assert.ok(toast, `${file} must include #network-toast container for offline notification`);
            assert.strictEqual(toast.getAttribute('role'), 'status', `${file} #network-toast must have role="status"`);
        }
    });
});
