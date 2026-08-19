const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

describe('Automated Mobile Responsiveness & CSS Test Suite', () => {

    it('css/styles.css must define universal skeleton keyframes and high contrast focus styles', () => {
        const stylesCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'styles.css'), 'utf8');
        
        assert.ok(stylesCss.includes('@keyframes shimmer'), 'styles.css must define @keyframes shimmer');
        assert.ok(stylesCss.includes('.skeleton'), 'styles.css must define .skeleton classes');
        assert.ok(stylesCss.includes(':focus-visible'), 'styles.css must define :focus-visible for accessibility');
        assert.ok(stylesCss.includes('.skip-link'), 'styles.css must define .skip-link styles');
        assert.ok(stylesCss.includes('.network-toast'), 'styles.css must define .network-toast styles');
    });

    it('css/responsive.css must define essential mobile breakpoints (768px, 480px)', () => {
        const respCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'responsive.css'), 'utf8');
        
        assert.ok(respCss.includes('@media (max-width: 768px)') || respCss.includes('@media(max-width:768px)'), 'responsive.css must include 768px tablet/mobile breakpoint');
        assert.ok(respCss.includes('@media (max-width: 480px)') || respCss.includes('@media(max-width:480px)'), 'responsive.css must include 480px small mobile breakpoint');
    });

    it('css/landing.css must define mobile responsive breakpoints for home page sections', () => {
        const landingCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'landing.css'), 'utf8');
        
        assert.ok(landingCss.includes('@media (max-width: 900px)') || landingCss.includes('@media (max-width: 768px)'), 'landing.css must include tablet breakpoint');
        assert.ok(landingCss.includes('@media (max-width: 540px)') || landingCss.includes('@media (max-width: 480px)'), 'landing.css must include mobile breakpoint');
    });
});
