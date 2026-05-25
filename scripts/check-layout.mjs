import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const slideArg = process.argv.find((arg) => arg.startsWith('--slides='));
const onlySlides = slideArg
  ? new Set(slideArg.slice('--slides='.length).split(',').map((n) => Number(n.trim())).filter(Boolean))
  : null;

if (!existsSync(indexPath)) {
  console.error('index.html not found. Run scripts/build-deck.ps1 first.');
  process.exit(2);
}

let playwright;
try {
  playwright = await import('playwright');
} catch (error) {
  console.error('Playwright is not available.');
  console.error('Run: npm exec --yes --package=playwright -- node scripts/check-layout.mjs');
  process.exit(2);
}

const browser = await playwright.chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

try {
  await page.goto(pathToFileURL(indexPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => customElements.get('deck-stage'));
  await page.evaluate(async () => {
    const stage = document.querySelector('deck-stage');
    stage.setAttribute('noscale', '');
    stage.setAttribute('no-rail', '');
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        })),
    );
  });

  const results = await page.evaluate(({ selectedSlides }) => {
    const EPS = 1.5;
    const ALIGN_EPS = 2;
    const MIN_TEXT_OVERFLOW = 2;
    const selected = selectedSlides ? new Set(selectedSlides) : null;
    const stage = document.querySelector('deck-stage');
    const slides = Array.from(stage.querySelectorAll(':scope > section'));
    const problems = [];

    const isVisibleBox = (el, rect) => {
      const style = getComputedStyle(el);
      if (style.display === 'none') return false;
      if (rect.width < 1 || rect.height < 1) return false;
      if (style.position === 'fixed') return false;
      if (el.closest('script, style')) return false;
      return true;
    };

    const isMeaningfulElement = (el) => {
      const tag = el.tagName.toLowerCase();
      if (['br', 'wbr', 'source'].includes(tag)) return false;
      if (el.classList.contains('page-chrome')) return false;
      if (el.closest('.page-chrome')) return false;
      const style = getComputedStyle(el);
      if (style.pointerEvents === 'none' && !el.textContent.trim() && tag !== 'img' && tag !== 'svg') return false;
      return true;
    };

    const labelFor = (el) => {
      const cls = Array.from(el.classList || []).slice(0, 3).join('.');
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || el.alt || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      return `${tag}${cls ? `.${cls}` : ''}${text ? ` "${text}"` : ''}`;
    };

    const add = (slideNo, type, message, el, rect) => {
      problems.push({
        slide: slideNo,
        type,
        message,
        element: labelFor(el),
        box: {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    };

    const addGroupProblem = (slideNo, type, message, elements, bottoms) => {
      const first = elements[0];
      const rect = first.getBoundingClientRect();
      problems.push({
        slide: slideNo,
        type,
        message,
        element: elements.map(labelFor).join(' | '),
        box: {
          minBottom: Math.round(Math.min(...bottoms)),
          maxBottom: Math.round(Math.max(...bottoms)),
          delta: Math.round(Math.max(...bottoms) - Math.min(...bottoms)),
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });
    };

    const checkAlignedBottoms = (slide, slideNo, selector) => {
      const elements = Array.from(slide.querySelectorAll(selector));
      if (elements.length < 2) return;

      const rows = new Map();
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (!isVisibleBox(el, rect)) continue;
        const key = Math.round(rect.top / 4) * 4;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push({ el, rect });
      }

      for (const row of rows.values()) {
        if (row.length < 2) continue;
        const bottoms = row.map(({ rect }) => rect.bottom);
        const delta = Math.max(...bottoms) - Math.min(...bottoms);
        if (delta > ALIGN_EPS) {
          addGroupProblem(
            slideNo,
            'CARD_BOTTOM_ALIGNMENT',
            '같은 줄의 카드 하단선이 맞지 않습니다.',
            row.map(({ el }) => el),
            bottoms,
          );
        }
      }
    };

    slides.forEach((slide, slideIndex) => {
      const slideNo = slideIndex + 1;
      if (selected && !selected.has(slideNo)) return;

      const slideRect = slide.getBoundingClientRect();
      const footer = slide.classList.contains('image-slide') ? null : slide.querySelector('.page-chrome .footline');
      const safeBottom = footer ? footer.getBoundingClientRect().top - 10 : null;

      const elements = Array.from(slide.querySelectorAll('*')).filter(isMeaningfulElement);
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (!isVisibleBox(el, rect)) continue;
        if (el.classList.contains('frame')) continue;

        if (rect.left < slideRect.left - EPS || rect.right > slideRect.right + EPS ||
            rect.top < slideRect.top - EPS || rect.bottom > slideRect.bottom + EPS) {
          add(slideNo, 'OUT_OF_SLIDE', '슬라이드 프레임 밖으로 나간 요소입니다.', el, rect);
        }

        if (safeBottom != null && !el.closest('.page-chrome') && !slide.classList.contains('cover') &&
            !slide.classList.contains('divider') && rect.bottom > safeBottom + EPS) {
          add(slideNo, 'FOOTER_SAFE_ZONE', 'footer 위 안전영역을 침범한 요소입니다.', el, rect);
        }

        const style = getComputedStyle(el);
        const clipsChildren = /(hidden|clip|auto|scroll)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);
        if (clipsChildren && el.children.length) {
          for (const child of Array.from(el.children)) {
            const childRect = child.getBoundingClientRect();
            if (!isVisibleBox(child, childRect)) continue;
            if (childRect.right > rect.right + EPS || childRect.bottom > rect.bottom + EPS ||
                childRect.left < rect.left - EPS || childRect.top < rect.top - EPS) {
              add(slideNo, 'CHILD_CLIPPED', '부모 박스 overflow 때문에 자식 요소가 잘릴 수 있습니다.', child, childRect);
              break;
            }
          }
        }

        const hasText = (el.innerText || '').trim().length > 0;
        const hasDirectText = Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const clipsOwnText = /(hidden|clip|auto|scroll)/.test(`${style.overflow}${style.overflowX}${style.overflowY}`);
        if (clipsOwnText && hasText && (hasDirectText || ['p', 'h1', 'h2', 'h3', 'td', 'th', 'span', 'b', 'strong', 'em', 'li'].includes(el.tagName.toLowerCase()))) {
          if (el.scrollHeight > el.clientHeight + MIN_TEXT_OVERFLOW || el.scrollWidth > el.clientWidth + MIN_TEXT_OVERFLOW) {
            add(slideNo, 'TEXT_OVERFLOW', '텍스트가 요소 박스 안에서 넘치거나 잘릴 수 있습니다.', el, rect);
          }
        }
      }

      [
        '.stem-grid > .stem-card',
        '.stimulus-layout > .stimulus-role, .stimulus-layout > .stimulus-gallery',
        '.stimulus-example > .stimulus-thumb',
        '.option-layout > .option-role, .option-layout > .option-cards',
        '.option-cards > .option-card',
        '.answer-layout > .answer-role, .answer-layout > .answer-example-grid',
        '.answer-example-grid > .answer-question, .answer-example-grid > .abcd-stack',
        '.quality-layout > .quality-panel, .quality-layout > .quality-main',
        '.quality-main > .quality-card',
        '.explain-grid > .quality-panel, .explain-grid > .explain-stack',
        '.reference-grid > .quality-panel, .reference-grid > .reference-stack',
        '.rubric-layout > .quality-panel, .rubric-layout > .rubric-main',
        '.method-grid > .method-card',
        '.standard-design-layout > .standard-left, .standard-design-layout > .standard-right',
        '.model-answer-layout > .quality-panel, .model-answer-layout > .score-model-main',
      ].forEach((selector) => checkAlignedBottoms(slide, slideNo, selector));
    });

    return {
      slideCount: slides.length,
      checkedSlides: selected ? Array.from(selected).sort((a, b) => a - b) : slides.map((_, i) => i + 1),
      problems,
    };
  }, { selectedSlides: onlySlides ? Array.from(onlySlides) : null });

  if (results.problems.length) {
    console.error(`Layout check failed: ${results.problems.length} problem(s) found.`);
    console.error(`Checked slides: ${results.checkedSlides.join(', ')}`);
    for (const problem of results.problems.slice(0, 80)) {
      console.error(
        `[${String(problem.slide).padStart(2, '0')}] ${problem.type}: ${problem.message}\n` +
        `     ${problem.element}\n` +
        `     box=${JSON.stringify(problem.box)}`,
      );
    }
    if (results.problems.length > 80) {
      console.error(`...and ${results.problems.length - 80} more.`);
    }
    process.exit(1);
  }

  console.log(`Layout check passed. Checked ${results.checkedSlides.length}/${results.slideCount} slide(s).`);
} finally {
  await browser.close();
}
