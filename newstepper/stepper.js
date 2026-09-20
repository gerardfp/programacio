/**
 * Stepper 2.0 Engine
 * Declarative, single-code-block stepper engine with automatic state tracking.
 * Next-Generation Interactive Code Stepper with Auto-Simulation for Loops (while, for, do-while)
 * and Explicit Phase Highlighting for `for` loops (Inicialització, Condició, Cos, Modificació).
 */

(function(global) {
  'use strict';

  function initNewSteppers(container = document) {
    const stepperElements = container.querySelectorAll('.stepper-v2, stepper-v2');
    stepperElements.forEach(el => {
      if (el.dataset.initialized === 'true') return;
      el.dataset.initialized = 'true';
      setupStepper(el);
    });
  }

  function setupStepper(root) {
    // 1. Extract source code
    const sourceEl = root.querySelector('code.source, .source, pre.source');
    if (!sourceEl) {
      console.warn('Stepper 2.0: No <code class="source"> element found inside', root);
      return;
    }

    const rawCode = sourceEl.textContent;
    const lang = root.getAttribute('lang') || (root.getAttribute('java') !== null ? 'java' : 'plaintext');
    const normalizedLines = normalizeCodeLines(rawCode);
    const cleanCode = normalizedLines.join('\n');

    // 2. Extract step definitions or Auto-Simulate Java code
    let stepsData = parseSteps(root, normalizedLines);
    const forceAuto = root.hasAttribute('auto') || root.getAttribute('mode') === 'auto';
    
    if (stepsData.length === 0 || forceAuto) {
      // Auto-simulate Java execution!
      const inputs = (root.getAttribute('in') || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      stepsData = simulateJava(cleanCode, inputs);
    }

    if (stepsData.length === 0) {
      console.warn('Stepper 2.0: No steps could be extracted or simulated for stepper', root);
      return;
    }

    // 3. Precompute timeline state (cumulative memory and console)
    const timeline = buildTimeline(stepsData);

    // 4. Build UI Structure
    root.innerHTML = '';
    root.tabIndex = 0; // Focusable for keyboard navigation

    // Header bar
    const headerBar = document.createElement('div');
    headerBar.className = 'stepper-header';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'stepper-title';

    const badge = document.createElement('span');
    badge.className = 'stepper-badge';
    badge.textContent = 'Stepper';

    const titleText = document.createElement('span');
    titleText.textContent = root.getAttribute('title') || 'Traça d\'Execució';

    titleDiv.appendChild(badge);
    titleDiv.appendChild(titleText);

    const counter = document.createElement('span');
    counter.className = 'stepper-counter';
    counter.textContent = `Pas 1 de ${timeline.length}`;

    headerBar.appendChild(titleDiv);
    headerBar.appendChild(counter);

    // Progress bar
    const progressTrack = document.createElement('div');
    progressTrack.className = 'stepper-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'stepper-progress-fill';
    progressFill.style.width = `${(1 / timeline.length) * 100}%`;
    progressTrack.appendChild(progressFill);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'stepper-controls';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'stepper-btn-group';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-prev';
    prevBtn.type = 'button';
    prevBtn.innerHTML = '◀ Anterior';
    prevBtn.disabled = true;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-next';
    nextBtn.type = 'button';
    nextBtn.innerHTML = 'Següent ▶';
    nextBtn.disabled = timeline.length <= 1;

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset';
    resetBtn.type = 'button';
    resetBtn.innerHTML = '↺ Reiniciar';

    const autoplayBtn = document.createElement('button');
    autoplayBtn.className = 'btn-autoplay';
    autoplayBtn.type = 'button';
    autoplayBtn.innerHTML = '▶ Reprodueix';

    btnGroup.appendChild(prevBtn);
    btnGroup.appendChild(nextBtn);
    btnGroup.appendChild(resetBtn);
    btnGroup.appendChild(autoplayBtn);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'stepper-slider';
    slider.min = '0';
    slider.max = String(timeline.length - 1);
    slider.value = '0';
    slider.setAttribute('aria-label', 'Pas d\'execució');

    controls.appendChild(btnGroup);
    controls.appendChild(slider);

    // Main Body
    const body = document.createElement('div');
    body.className = 'stepper-body';

    // Left Code Panel
    const codePanel = document.createElement('div');
    codePanel.className = 'stepper-code-panel';

    const codeTable = document.createElement('table');
    codeTable.className = 'code-lines-table';
    const tbody = document.createElement('tbody');

    normalizedLines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const tr = document.createElement('tr');
      tr.className = 'code-line-row';
      tr.dataset.line = String(lineNum);

      const tdNum = document.createElement('td');
      tdNum.className = 'code-line-num';
      tdNum.textContent = String(lineNum);

      const tdCode = document.createElement('td');
      tdCode.className = 'code-line-content';
      
      // Render line with syntax highlight if Prism available
      if (global.Prism && global.Prism.languages[lang]) {
        try {
          tdCode.innerHTML = global.Prism.highlight(lineText, global.Prism.languages[lang], lang);
        } catch (e) {
          tdCode.textContent = lineText;
        }
      } else {
        tdCode.textContent = lineText;
      }

      // Store original HTML for resetting highlights
      tdCode.dataset.originalHtml = tdCode.innerHTML;
      tdCode.dataset.rawText = lineText;

      tr.appendChild(tdNum);
      tr.appendChild(tdCode);
      tbody.appendChild(tr);
    });

    codeTable.appendChild(tbody);
    codePanel.appendChild(codeTable);

    // Right Info Panel
    const infoPanel = document.createElement('div');
    infoPanel.className = 'stepper-info-panel';

    const explanationBox = document.createElement('div');
    explanationBox.className = 'stepper-explanation';

    const memBox = document.createElement('div');
    memBox.className = 'stepper-mem';
    const memHeader = document.createElement('div');
    memHeader.className = 'stepper-mem-header';
    memHeader.textContent = 'Estat de la Memòria';
    const memList = document.createElement('div');
    memList.className = 'stepper-mem-list';
    memBox.appendChild(memHeader);
    memBox.appendChild(memList);

    const shellBox = document.createElement('div');
    shellBox.className = 'stepper-shell';
    const shellHeader = document.createElement('div');
    shellHeader.className = 'stepper-shell-header';
    shellHeader.textContent = 'Terminal / Consola';
    const shellContent = document.createElement('div');
    shellContent.className = 'stepper-shell-content';
    shellBox.appendChild(shellHeader);
    shellBox.appendChild(shellContent);

    infoPanel.appendChild(explanationBox);
    infoPanel.appendChild(memBox);
    infoPanel.appendChild(shellBox);

    body.appendChild(codePanel);
    body.appendChild(infoPanel);

    // Assemble components into root
    root.appendChild(headerBar);
    root.appendChild(progressTrack);
    root.appendChild(controls);
    root.appendChild(body);

    // 5. Execution State Controller
    let currentStep = 0;
    let autoplayTimer = null;

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
        autoplayBtn.innerHTML = '▶ Reprodueix';
        autoplayBtn.classList.remove('playing');
      }
    }

    function renderStep(stepIdx) {
      if (stepIdx < 0) stepIdx = 0;
      if (stepIdx >= timeline.length) stepIdx = timeline.length - 1;
      currentStep = stepIdx;

      const state = timeline[currentStep];

      // Update controls
      slider.value = String(currentStep);
      counter.textContent = `Pas ${currentStep + 1} de ${timeline.length}`;
      progressFill.style.width = `${((currentStep + 1) / timeline.length) * 100}%`;
      prevBtn.disabled = currentStep === 0;
      nextBtn.disabled = currentStep === timeline.length - 1;

      // 1. Update Code Highlight
      const allRows = tbody.querySelectorAll('.code-line-row');
      allRows.forEach(row => {
        row.classList.remove('active');
        row.classList.remove('active-sub');
        const codeCell = row.querySelector('.code-line-content');
        if (codeCell && codeCell.dataset.originalHtml) {
          codeCell.innerHTML = codeCell.dataset.originalHtml;
        }
      });

      if (state.lines && state.lines.length > 0) {
        state.lines.forEach(lineNum => {
          const targetRow = tbody.querySelector(`.code-line-row[data-line="${lineNum}"]`);
          if (targetRow) {
            if (state.hl) {
              const codeCell = targetRow.querySelector('.code-line-content');
              const highlighted = highlightTokenInCell(codeCell, state.hl, state.part, lang);
              if (highlighted) {
                targetRow.classList.add('active-sub');
              } else {
                targetRow.classList.add('active');
              }
            } else {
              targetRow.classList.add('active');
            }
          }
        });
      }

      // 2. Update Explanation & Phase Badge
      explanationBox.innerHTML = '';
      if (state.partName) {
        const partBadge = document.createElement('span');
        partBadge.className = `stepper-phase-badge part-${state.part || 'body'}`;
        partBadge.textContent = state.partName;
        explanationBox.appendChild(partBadge);
      }
      const expContent = document.createElement('span');
      expContent.innerHTML = state.explanation || '';
      explanationBox.appendChild(expContent);

      // 3. Update Memory
      memList.innerHTML = '';
      if (state.customMemHtml) {
        memList.innerHTML = state.customMemHtml;
      } else if (state.memEntries && state.memEntries.length > 0) {
        state.memEntries.forEach(entry => {
          const item = document.createElement('div');
          item.className = 'mem-item';
          if (entry.changed) {
            item.classList.add('changed');
          }
          const nameSpan = document.createElement('span');
          nameSpan.className = 'mem-name';
          nameSpan.textContent = entry.key;

          const valSpan = document.createElement('span');
          valSpan.className = 'mem-val';
          valSpan.textContent = entry.value;

          item.appendChild(nameSpan);
          item.appendChild(valSpan);
          memList.appendChild(item);
        });
      }

      // 4. Update Shell
      shellContent.innerHTML = '';
      if (state.shellHtml) {
        shellContent.innerHTML = state.shellHtml;
      }

      if (currentStep === timeline.length - 1 && autoplayTimer) {
        stopAutoplay();
      }
    }

    // Event Listeners
    nextBtn.addEventListener('click', () => {
      stopAutoplay();
      renderStep(currentStep + 1);
    });

    prevBtn.addEventListener('click', () => {
      stopAutoplay();
      renderStep(currentStep - 1);
    });

    resetBtn.addEventListener('click', () => {
      stopAutoplay();
      renderStep(0);
    });

    slider.addEventListener('input', () => {
      stopAutoplay();
      renderStep(parseInt(slider.value, 10));
    });

    autoplayBtn.addEventListener('click', () => {
      if (autoplayTimer) {
        stopAutoplay();
      } else {
        if (currentStep >= timeline.length - 1) {
          renderStep(0);
        }
        autoplayBtn.innerHTML = '⏸ Pausa';
        autoplayBtn.classList.add('playing');
        autoplayTimer = setInterval(() => {
          if (currentStep < timeline.length - 1) {
            renderStep(currentStep + 1);
          } else {
            stopAutoplay();
          }
        }, 1800);
      }
    });

    // Keyboard navigation when stepper has focus
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        stopAutoplay();
        renderStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        stopAutoplay();
        renderStep(currentStep - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        stopAutoplay();
        renderStep(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        stopAutoplay();
        renderStep(timeline.length - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        autoplayBtn.click();
      }
    });

    // Initial render
    renderStep(0);
  }

  // --- Helper Functions ---
  // ==========================================================================
  // Java Simulator Engine (Auto-Trace)
  // ==========================================================================

  function simulateJava(rawCode, inputs = []) {
    const inputQueue = [...inputs];
    const steps = [];
    const scope = {};
    const MAX_STEPS = 200;

    // --- 1. Tokenizer ---
    function tokenize(code) {
      const tokens = [];
      let i = 0;
      let line = 1;
      let col = 1;

      const KEYWORDS = new Set([
        'int', 'double', 'float', 'long', 'boolean', 'String', 'char', 'void',
        'if', 'else', 'switch', 'case', 'default', 'break', 'continue', 'yield',
        'for', 'while', 'do', 'new', 'return', 'true', 'false', 'null'
      ]);

      while (i < code.length) {
        const ch = code[i];

        if (ch === '\n') {
          line++;
          col = 1;
          i++;
          continue;
        }
        if (ch === '\r') {
          i++;
          continue;
        }
        if (/\s/.test(ch)) {
          col++;
          i++;
          continue;
        }

        if (ch === '/' && code[i + 1] === '/') {
          i += 2;
          while (i < code.length && code[i] !== '\n') i++;
          continue;
        }
        if (ch === '/' && code[i + 1] === '*') {
          i += 2;
          while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
            if (code[i] === '\n') { line++; col = 1; }
            i++;
          }
          i += 2;
          continue;
        }

        const startLine = line;
        const startCol = col;
        const startIdx = i;

        if (/[0-9]/.test(ch)) {
          let numStr = '';
          while (i < code.length && /[0-9.]/.test(code[i])) {
            numStr += code[i];
            i++;
            col++;
          }
          tokens.push({
            type: 'NUMBER',
            value: numStr.includes('.') ? parseFloat(numStr) : parseInt(numStr, 10),
            raw: numStr,
            line: startLine,
            col: startCol,
            start: startIdx,
            end: i
          });
          continue;
        }

        if (ch === '"') {
          let str = '';
          i++; col++;
          while (i < code.length && code[i] !== '"') {
            if (code[i] === '\\' && i + 1 < code.length) {
              str += code[i + 1];
              i += 2; col += 2;
            } else {
              str += code[i];
              i++; col++;
            }
          }
          if (i < code.length && code[i] === '"') {
            i++; col++;
          }
          tokens.push({
            type: 'STRING',
            value: str,
            raw: `"${str}"`,
            line: startLine,
            col: startCol,
            start: startIdx,
            end: i
          });
          continue;
        }

        if (ch === "'") {
          let charVal = '';
          i++; col++;
          if (code[i] === '\\' && i + 1 < code.length) {
            charVal = code[i + 1];
            i += 2; col += 2;
          } else {
            charVal = code[i];
            i++; col++;
          }
          if (code[i] === "'") { i++; col++; }
          tokens.push({
            type: 'CHAR',
            value: charVal,
            raw: `'${charVal}'`,
            line: startLine,
            col: startCol,
            start: startIdx,
            end: i
          });
          continue;
        }

        const twoChar = code.substr(i, 2);
        if (twoChar === '->' || twoChar === '++' || twoChar === '--' ||
            twoChar === '==' || twoChar === '!=' || twoChar === '<=' ||
            twoChar === '>=' || twoChar === '&&' || twoChar === '||' ||
            twoChar === '+=' || twoChar === '-=' || twoChar === '*=' ||
            twoChar === '/=' || twoChar === '%=') {
          tokens.push({
            type: 'OPERATOR',
            value: twoChar,
            raw: twoChar,
            line: startLine,
            col: startCol,
            start: startIdx,
            end: i + 2
          });
          i += 2;
          col += 2;
          continue;
        }

        if (/[a-zA-Z_$]/.test(ch)) {
          let ident = '';
          while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
            ident += code[i];
            i++;
            col++;
          }
          tokens.push({
            type: KEYWORDS.has(ident) ? 'KEYWORD' : 'IDENT',
            value: ident,
            raw: ident,
            line: startLine,
            col: startCol,
            start: startIdx,
            end: i
          });
          continue;
        }

        tokens.push({
          type: 'PUNCT',
          value: ch,
          raw: ch,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i + 1
        });
        i++;
        col++;
      }

      return tokens;
    }

    const allTokens = tokenize(rawCode);

    function getRawSlice(startTok, endTok) {
      if (!startTok) return '';
      if (!endTok) endTok = startTok;
      return rawCode.substring(startTok.start, endTok.end).trim();
    }

    function formatValue(v) {
      if (Array.isArray(v)) {
        return `[${v.map(formatValue).join(', ')}]`;
      }
      if (typeof v === 'string') return `"${v}"`;
      if (v === null || v === undefined) return 'null';
      return String(v);
    }

    function getMemSnapshot() {
      const parts = [];
      for (const [k, v] of Object.entries(scope)) {
        parts.push(`${k}: ${formatValue(v)}`);
      }
      return parts.join(', ');
    }

    // --- 2. Expression Evaluator ---
    function evaluateExprString(jsExpr) {
      if (!jsExpr) return true;
      if (jsExpr.includes('scanner.nextInt()') || jsExpr.includes('scanner.next()') ||
          jsExpr.includes('scanner.nextDouble()') || jsExpr.includes('scanner.nextLine()')) {
        const val = inputQueue.shift() ?? 0;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }

      let expr = jsExpr.replace(/\.equals\(([^)]+)\)/g, ' === ($1)');

      try {
        const keys = Object.keys(scope);
        const vals = Object.values(scope);
        const fn = new Function(...keys, `return (${expr});`);
        return fn(...vals);
      } catch (e) {
        return undefined;
      }
    }

    // --- 3. Parser & AST ---
    let pos = 0;

    function peek(offset = 0) {
      return allTokens[pos + offset] || null;
    }

    function consume(expectedValue = null) {
      const tok = allTokens[pos];
      if (!tok) return null;
      if (expectedValue !== null && tok.value !== expectedValue) {
        throw new Error(`Expected '${expectedValue}' but found '${tok.value}' at line ${tok.line}`);
      }
      pos++;
      return tok;
    }

    function parseStatement() {
      const tok = peek();
      if (!tok) return null;

      // Label: `labelName:`
      if (tok.type === 'IDENT' && peek(1) && peek(1).value === ':' && peek(1).type === 'PUNCT') {
        const labelTok = consume();
        consume(':');
        const stmt = parseStatement();
        if (stmt) {
          stmt.label = labelTok.value;
          stmt.labelLine = labelTok.line;
        }
        return stmt;
      }

      // Block `{ ... }`
      if (tok.value === '{') {
        const openTok = consume('{');
        const statements = [];
        while (peek() && peek().value !== '}') {
          const s = parseStatement();
          if (s) statements.push(s);
        }
        const closeTok = consume('}');
        return {
          type: 'Block',
          statements,
          line: openTok.line,
          raw: getRawSlice(openTok, closeTok)
        };
      }

      // `if` statement
      if (tok.value === 'if') {
        const ifTok = consume('if');
        consume('(');
        let depth = 1;
        const condTokens = [];
        while (peek()) {
          const t = consume();
          if (t.value === '(') depth++;
          else if (t.value === ')') {
            depth--;
            if (depth === 0) break;
          }
          condTokens.push(t);
        }
        const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
        const thenBranch = parseStatement();
        let elseBranch = null;

        if (peek() && peek().value === 'else') {
          consume('else');
          elseBranch = parseStatement();
        }

        return {
          type: 'IfStatement',
          line: ifTok.line,
          condRaw,
          thenBranch,
          elseBranch,
          raw: getRawSlice(ifTok, (elseBranch || thenBranch))
        };
      }

      // `for` loop
      if (tok.value === 'for') {
        const forTok = consume('for');
        consume('(');
        
        const initTokens = [];
        while (peek() && peek().value !== ';') {
          initTokens.push(consume());
        }
        consume(';');
        const initRaw = getRawSlice(initTokens[0], initTokens[initTokens.length - 1]);

        const condTokens = [];
        while (peek() && peek().value !== ';') {
          condTokens.push(consume());
        }
        consume(';');
        const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);

        const updateTokens = [];
        while (peek() && peek().value !== ')') {
          updateTokens.push(consume());
        }
        consume(')');
        const updateRaw = getRawSlice(updateTokens[0], updateTokens[updateTokens.length - 1]);

        const body = parseStatement();

        return {
          type: 'ForStatement',
          line: forTok.line,
          initRaw,
          condRaw,
          updateRaw,
          body,
          raw: getRawSlice(forTok, body)
        };
      }

      // `while` loop
      if (tok.value === 'while') {
        const whileTok = consume('while');
        consume('(');
        const condTokens = [];
        let depth = 1;
        while (peek()) {
          const t = consume();
          if (t.value === '(') depth++;
          else if (t.value === ')') {
            depth--;
            if (depth === 0) break;
          }
          condTokens.push(t);
        }
        const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
        const body = parseStatement();

        return {
          type: 'WhileStatement',
          line: whileTok.line,
          condRaw,
          body,
          raw: getRawSlice(whileTok, body)
        };
      }

      // `do-while` loop
      if (tok.value === 'do') {
        const doTok = consume('do');
        const body = parseStatement();
        consume('while');
        consume('(');
        const condTokens = [];
        let depth = 1;
        while (peek()) {
          const t = consume();
          if (t.value === '(') depth++;
          else if (t.value === ')') {
            depth--;
            if (depth === 0) break;
          }
          condTokens.push(t);
        }
        const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
        if (peek() && peek().value === ';') consume(';');

        return {
          type: 'DoWhileStatement',
          line: doTok.line,
          condRaw,
          body,
          raw: getRawSlice(doTok, peek(-1))
        };
      }

      // Switch expression assignment: [type] varName = switch (...)
      if (tok.type === 'IDENT' || (tok.type === 'KEYWORD' && ['int', 'double', 'float', 'long', 'boolean', 'String', 'char'].includes(tok.value))) {
        let lookahead = 1;
        let varTok = tok;
        if (['int', 'double', 'float', 'long', 'boolean', 'String', 'char'].includes(tok.value)) {
          varTok = peek(1);
          lookahead = 2;
        }
        if (varTok && varTok.type === 'IDENT' && peek(lookahead) && peek(lookahead).value === '=' && peek(lookahead + 1) && peek(lookahead + 1).value === 'switch') {
          for (let k = 0; k <= lookahead; k++) consume();
          const switchNode = parseStatement();
          if (peek() && peek().value === ';') consume(';');
          return {
            type: 'SwitchAssignStatement',
            line: varTok.line,
            varName: varTok.value,
            switchNode,
            raw: `${varTok.raw} = ${switchNode.raw};`
          };
        }
      }

      // `switch` statement or switch expression
      if (tok.value === 'switch') {
        const switchTok = consume('switch');
        consume('(');
        const exprTokens = [];
        let depth = 1;
        while (peek()) {
          const t = consume();
          if (t.value === '(') depth++;
          else if (t.value === ')') {
            depth--;
            if (depth === 0) break;
          }
          exprTokens.push(t);
        }
        const exprRaw = getRawSlice(exprTokens[0], exprTokens[exprTokens.length - 1]);

        consume('{');
        const cases = [];

        while (peek() && peek().value !== '}') {
          const cTok = peek();
          if (cTok.value === 'case' || cTok.value === 'default') {
            const isCase = cTok.value === 'case';
            consume();
            const matchValues = [];
            if (isCase) {
              let valTokens = [];
              while (peek() && peek().value !== ':' && peek().value !== '->') {
                if (peek().value === ',') {
                  matchValues.push(getRawSlice(valTokens[0], valTokens[valTokens.length - 1]));
                  valTokens = [];
                  consume(',');
                } else {
                  valTokens.push(consume());
                }
              }
              if (valTokens.length > 0) {
                matchValues.push(getRawSlice(valTokens[0], valTokens[valTokens.length - 1]));
              }
            }

            const arrowOrColon = consume();
            const isArrow = arrowOrColon.value === '->';

            const caseStatements = [];
            if (isArrow) {
              if (peek() && peek().value === '{') {
                caseStatements.push(parseStatement());
              } else {
                const stmtTokens = [];
                while (peek() && peek().value !== ';' && peek().value !== '}') {
                  stmtTokens.push(consume());
                }
                if (peek() && peek().value === ';') consume(';');
                const stmtRaw = getRawSlice(stmtTokens[0], stmtTokens[stmtTokens.length - 1]);
                caseStatements.push({
                  type: 'ArrowExpression',
                  line: arrowOrColon.line,
                  raw: stmtRaw
                });
              }
            } else {
              while (peek() && peek().value !== 'case' && peek().value !== 'default' && peek().value !== '}') {
                const st = parseStatement();
                if (st) caseStatements.push(st);
              }
            }

            cases.push({
              isDefault: !isCase,
              line: cTok.line,
              matchValues,
              isArrow,
              statements: caseStatements,
              raw: getRawSlice(cTok, arrowOrColon)
            });
          } else {
            consume();
          }
        }

        const closeTok = consume('}');

        return {
          type: 'SwitchStatement',
          line: switchTok.line,
          exprRaw,
          cases,
          raw: getRawSlice(switchTok, closeTok)
        };
      }

      // `break` statement
      if (tok.value === 'break') {
        const breakTok = consume('break');
        let targetLabel = null;
        if (peek() && peek().type === 'IDENT') {
          targetLabel = consume().value;
        }
        if (peek() && peek().value === ';') consume(';');
        return {
          type: 'BreakStatement',
          line: breakTok.line,
          targetLabel,
          raw: targetLabel ? `break ${targetLabel}` : 'break'
        };
      }

      // `continue` statement
      if (tok.value === 'continue') {
        const contTok = consume('continue');
        let targetLabel = null;
        if (peek() && peek().type === 'IDENT') {
          targetLabel = consume().value;
        }
        if (peek() && peek().value === ';') consume(';');
        return {
          type: 'ContinueStatement',
          line: contTok.line,
          targetLabel,
          raw: targetLabel ? `continue ${targetLabel}` : 'continue'
        };
      }

      // `yield` statement
      if (tok.value === 'yield') {
        const yieldTok = consume('yield');
        const yieldTokens = [];
        while (peek() && peek().value !== ';') {
          yieldTokens.push(consume());
        }
        if (peek() && peek().value === ';') consume(';');
        const exprRaw = getRawSlice(yieldTokens[0], yieldTokens[yieldTokens.length - 1]).replace(/;+$/, '');
        return {
          type: 'YieldStatement',
          line: yieldTok.line,
          exprRaw,
          raw: `yield ${exprRaw}`
        };
      }

      // Variable declaration / assignment / expression statement
      const stmtTokens = [];
      const startTok = peek();
      let depthParen = 0;
      let depthBrace = 0;
      let depthBracket = 0;

      while (peek()) {
        const t = peek();
        if (t.value === '(') depthParen++;
        else if (t.value === ')') depthParen--;
        else if (t.value === '{') depthBrace++;
        else if (t.value === '}') {
          if (depthBrace === 0) break;
          depthBrace--;
        }
        else if (t.value === '[') depthBracket++;
        else if (t.value === ']') depthBracket--;
        else if (t.value === ';' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
          consume(';');
          break;
        }
        stmtTokens.push(consume());
      }

      if (stmtTokens.length === 0) return null;

      const rawStmt = getRawSlice(stmtTokens[0], stmtTokens[stmtTokens.length - 1]);

      return {
        type: 'ExpressionStatement',
        line: startTok.line,
        tokens: stmtTokens,
        raw: rawStmt
      };
    }

    const program = [];
    while (pos < allTokens.length) {
      const s = parseStatement();
      if (s) program.push(s);
    }

    // --- 4. Execution Engine ---

    class BreakSignal {
      constructor(label = null) {
        this.label = label;
      }
    }

    class ContinueSignal {
      constructor(label = null) {
        this.label = label;
      }
    }

    class YieldSignal {
      constructor(value) {
        this.value = value;
      }
    }

    function executeBlock(statements, parentLabel = null) {
      for (const stmt of statements) {
        if (steps.length >= MAX_STEPS) break;
        const res = executeNode(stmt);
        if (res instanceof BreakSignal || res instanceof ContinueSignal || res instanceof YieldSignal) {
          return res;
        }
      }
      return null;
    }

    function executeNode(node) {
      if (!node || steps.length >= MAX_STEPS) return null;

      // 1. Block
      if (node.type === 'Block') {
        return executeBlock(node.statements, node.label);
      }

      // SwitchAssignStatement
      if (node.type === 'SwitchAssignStatement') {
        const sig = executeNode(node.switchNode);
        const val = sig instanceof YieldSignal ? sig.value : undefined;
        scope[node.varName] = val;
        steps.push({
          lineRaw: String(node.line),
          part: 'body',
          partName: 'Assignació Switch',
          hl: `${node.varName} = ${formatValue(val)}`,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: `S'assigna el valor de l'expressió switch (<strong>${formatValue(val)}</strong>) a <code class="w">${node.varName}</code>.`
        });
        return null;
      }

      // 2. IfStatement
      if (node.type === 'IfStatement') {
        const condVal = Boolean(evaluateExprString(node.condRaw));
        steps.push({
          lineRaw: String(node.line),
          part: 'cond',
          partName: 'Condició (if)',
          hl: node.condRaw,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: `S'avalua la condició <code class="w">${node.condRaw}</code>: és <strong>${condVal ? 'cert (true)' : 'fals (false)'}</strong>.`
        });

        if (condVal) {
          return executeNode(node.thenBranch);
        } else if (node.elseBranch) {
          return executeNode(node.elseBranch);
        }
        return null;
      }

      // 3. ForStatement
      if (node.type === 'ForStatement') {
        const forLine = node.line;

        // Phase 1: Init
        if (node.initRaw) {
          executeExpressionStatement(node.initRaw, forLine, true);
          steps.push({
            lineRaw: String(forLine),
            part: 'init',
            partName: 'Inicialització',
            hl: node.initRaw,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `S'executa la <strong>inicialització</strong> del bucle (<code class="w">${node.initRaw}</code>).`
          });
        }

        // Loop iterations
        let iteration = 0;
        while (steps.length < MAX_STEPS) {
          iteration++;
          // Phase 2: Condition
          const condVal = node.condRaw ? Boolean(evaluateExprString(node.condRaw)) : true;
          if (condVal) {
            steps.push({
              lineRaw: String(forLine),
              part: 'cond',
              partName: 'Condició',
              hl: node.condRaw || 'true',
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: iteration === 1
                ? `S'avalua la <strong>condició</strong> <code class="w">${node.condRaw || 'true'}</code>: és <strong>cert</strong> (<code>true</code>), s'inicia la primera iteració.`
                : `Es torna a avaluar la <strong>condició</strong> (<code class="w">${node.condRaw || 'true'}</code>: és cert), continua el bucle.`
            });

            // Phase 3: Body
            const sig = executeNode(node.body);
            if (sig instanceof BreakSignal) {
              if (!sig.label || sig.label === node.label) {
                break;
              }
              return sig;
            }
            if (sig instanceof ContinueSignal) {
              if (sig.label && sig.label !== node.label) {
                return sig;
              }
            }

            // Phase 4: Update
            if (node.updateRaw) {
              executeExpressionStatement(node.updateRaw, forLine, true);
              steps.push({
                lineRaw: String(forLine),
                part: 'update',
                partName: 'Modificació',
                hl: node.updateRaw,
                onlyHl: true,
                memRaw: getMemSnapshot(),
                explanation: `Després de la iteració es fa la <strong>modificació</strong> (<code class="w">${node.updateRaw}</code>).`
              });
            }
          } else {
            // Condition False -> exit
            steps.push({
              lineRaw: String(forLine),
              part: 'cond',
              partName: 'Condició',
              hl: node.condRaw,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es torna a avaluar la <strong>condició</strong> (<code class="w">${node.condRaw}</code>): és <strong>fals</strong> (<code>false</code>). Surt del bucle!`
            });
            break;
          }
        }
        return null;
      }

      // 4. WhileStatement
      if (node.type === 'WhileStatement') {
        const whileLine = node.line;
        let iteration = 0;
        while (steps.length < MAX_STEPS) {
          iteration++;
          const condVal = Boolean(evaluateExprString(node.condRaw));
          if (condVal) {
            steps.push({
              lineRaw: String(whileLine),
              part: 'cond',
              partName: 'Condició',
              hl: node.condRaw,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: iteration === 1
                ? `S'avalua la <strong>condició</strong> <code class="w">${node.condRaw}</code>: és <strong>cert</strong> (<code>true</code>), s'entra al bucle.`
                : `Es torna a avaluar la <strong>condició</strong> <code class="w">${node.condRaw}</code>: és <strong>cert</strong> (<code>true</code>), es fa una altra iteració.`
            });

            const sig = executeNode(node.body);
            if (sig instanceof BreakSignal) {
              if (!sig.label || sig.label === node.label) break;
              return sig;
            }
            if (sig instanceof ContinueSignal) {
              if (sig.label && sig.label !== node.label) return sig;
              continue;
            }
          } else {
            steps.push({
              lineRaw: String(whileLine),
              part: 'cond',
              partName: 'Condició',
              hl: node.condRaw,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es torna a avaluar la <strong>condició</strong> <code class="w">${node.condRaw}</code>: és <strong>fals</strong> (<code>false</code>). Surt del bucle!`
            });
            break;
          }
        }
        return null;
      }

      // 5. DoWhileStatement
      if (node.type === 'DoWhileStatement') {
        const doLine = node.line;
        let iteration = 0;
        while (steps.length < MAX_STEPS) {
          iteration++;
          const sig = executeNode(node.body);
          if (sig instanceof BreakSignal) {
            if (!sig.label || sig.label === node.label) break;
            return sig;
          }
          if (sig instanceof ContinueSignal) {
            if (sig.label && sig.label !== node.label) return sig;
          }

          const condVal = Boolean(evaluateExprString(node.condRaw));
          steps.push({
            lineRaw: String(doLine),
            part: 'cond',
            partName: 'Condició (while)',
            hl: node.condRaw,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `S'avalua la condició final <code class="w">${node.condRaw}</code>: <strong>${condVal ? 'true' : 'false'}</strong>.`
          });
          if (!condVal) break;
        }
        return null;
      }

      // 6. SwitchStatement
      if (node.type === 'SwitchStatement') {
        const switchVal = evaluateExprString(node.exprRaw);
        steps.push({
          lineRaw: String(node.line),
          part: 'cond',
          partName: 'Switch',
          hl: `switch (${node.exprRaw})`,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: `S'avalua el selector <code class="w">switch (${node.exprRaw})</code> amb valor <strong>${formatValue(switchVal)}</strong>.`
        });

        let matched = false;
        let executing = false;

        for (const c of node.cases) {
          if (steps.length >= MAX_STEPS) break;

          let isMatch = false;
          if (c.isDefault) {
            if (!matched || executing) {
              isMatch = true;
            }
          } else {
            for (const mValStr of c.matchValues) {
              const mVal = evaluateExprString(mValStr);
              if (mVal === switchVal) {
                isMatch = true;
                break;
              }
            }
          }

          if (c.isArrow) {
            if (isMatch) {
              matched = true;
              steps.push({
                lineRaw: String(c.line),
                part: 'cond',
                partName: 'Coincidència',
                hl: c.raw,
                onlyHl: true,
                memRaw: getMemSnapshot(),
                explanation: `Coincideix amb <code class="w">${c.raw}</code>!`
              });

              for (const st of c.statements) {
                if (st.type === 'ArrowExpression') {
                  if (st.raw.startsWith('yield ')) {
                    const yVal = evaluateExprString(st.raw.replace(/^yield\s+/, ''));
                    return new YieldSignal(yVal);
                  } else if (/^(?:println|print|System\.out\.)/.test(st.raw) || /=|\+=|-=/.test(st.raw)) {
                    executeExpressionStatement(st.raw, st.line);
                  } else {
                    const yVal = evaluateExprString(st.raw);
                    return new YieldSignal(yVal);
                  }
                } else {
                  const sig = executeNode(st);
                  if (sig instanceof YieldSignal) return sig;
                  if (sig instanceof BreakSignal) break;
                }
              }
              break;
            }
          } else {
            if (!executing && isMatch) {
              matched = true;
              executing = true;
              steps.push({
                lineRaw: String(c.line),
                part: 'cond',
                partName: 'Coincidència',
                hl: c.raw,
                onlyHl: true,
                memRaw: getMemSnapshot(),
                explanation: `Coincideix amb <code class="w">${c.raw}</code>! Comença l'execució.`
              });
            }

            if (executing) {
              for (const st of c.statements) {
                const sig = executeNode(st);
                if (sig instanceof BreakSignal) {
                  if (!sig.label || sig.label === node.label) {
                    return null;
                  }
                  return sig;
                }
                if (sig instanceof YieldSignal) return sig;
              }
            }
          }
        }
        return null;
      }

      // 7. BreakStatement
      if (node.type === 'BreakStatement') {
        steps.push({
          lineRaw: String(node.line),
          part: 'body',
          partName: 'Salt (break)',
          hl: node.raw,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: node.targetLabel
            ? `La instrucció <code class="w">${node.raw}</code> atura el bloc o bucle etiquetat com a <strong>${node.targetLabel}</strong>.`
            : `La instrucció <code class="w">break;</code> atura el bucle o switch actual.`
        });
        return new BreakSignal(node.targetLabel);
      }

      // 8. ContinueStatement
      if (node.type === 'ContinueStatement') {
        steps.push({
          lineRaw: String(node.line),
          part: 'body',
          partName: 'Salt (continue)',
          hl: node.raw,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: node.targetLabel
            ? `La instrucció <code class="w">${node.raw}</code> salta a la següent iteració del bucle <strong>${node.targetLabel}</strong>.`
            : `La instrucció <code class="w">continue;</code> salta directament a la següent iteració.`
        });
        return new ContinueSignal(node.targetLabel);
      }

      // 9. YieldStatement
      if (node.type === 'YieldStatement') {
        const yVal = evaluateExprString(node.exprRaw);
        steps.push({
          lineRaw: String(node.line),
          part: 'body',
          partName: 'Retorn (yield)',
          hl: node.raw,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: `S'avalua <code class="w">${node.raw}</code> produint el valor <strong>${formatValue(yVal)}</strong>.`
        });
        return new YieldSignal(yVal);
      }

      // 10. ExpressionStatement
      if (node.type === 'ExpressionStatement') {
        executeExpressionStatement(node.raw, node.line);
        return null;
      }

      return null;
    }

    function executeExpressionStatement(stmt, lineNum, silent = false) {
      let s = stmt.replace(/;$/, '').trim();
      if (!s) return;

      // A. Output: print / println / System.out.println
      const printMatch = s.match(/^(?:System\.out\.)?(println|print)\s*\((.*)\)$/);
      if (printMatch) {
        const arg = printMatch[2].trim();
        const val = arg ? evaluateExprString(arg) : '';
        if (!silent) {
          steps.push({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Sortida',
            hl: s,
            onlyHl: true,
            out: String(val),
            memRaw: getMemSnapshot(),
            explanation: `S'executa <code class="w">${s}</code>, mostrant <code class="w">${formatValue(val)}</code> per consola.`
          });
        }
        return;
      }

      // B. Array initialization: int[] a = {1, 2, 3}; OR int[] a = new int[3];
      const arrayDeclMatch = s.match(/^(?:int|double|String|boolean|char)\[\]\s*([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
      if (arrayDeclMatch) {
        const varName = arrayDeclMatch[1];
        const rhs = arrayDeclMatch[2].trim();

        let arrVal = [];
        if (rhs.startsWith('{') && rhs.endsWith('}')) {
          const inner = rhs.slice(1, -1).trim();
          if (inner) {
            arrVal = inner.split(',').map(item => evaluateExprString(item.trim()));
          }
        } else {
          const newMatch = rhs.match(/^new\s+(?:int|double|String|boolean|char)\[(.*)\]$/);
          if (newMatch) {
            const size = Number(evaluateExprString(newMatch[1]));
            const defaultVal = s.startsWith('boolean') ? false : (s.startsWith('String') ? null : 0);
            arrVal = new Array(size).fill(defaultVal);
          } else {
            arrVal = evaluateExprString(rhs);
          }
        }

        scope[varName] = arrVal;
        if (!silent) {
          steps.push({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Array',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `Es crea l'array <code class="w">${varName}</code> amb valor <strong>${formatValue(arrVal)}</strong>.`
          });
        }
        return;
      }

      // C. Array element assignment: a[i] = val; or a[i] += val; etc.
      const arrayElemMatch = s.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\]\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if (arrayElemMatch) {
        const arrName = arrayElemMatch[1];
        const idxExpr = arrayElemMatch[2];
        const op = arrayElemMatch[3];
        const rhsExpr = arrayElemMatch[4];

        const idx = Number(evaluateExprString(idxExpr));
        const val = evaluateExprString(rhsExpr);

        if (scope[arrName] && Array.isArray(scope[arrName])) {
          const newArr = [...scope[arrName]];
          if (op === '=') newArr[idx] = val;
          else if (op === '+=') newArr[idx] += val;
          else if (op === '-=') newArr[idx] -= val;
          else if (op === '*=') newArr[idx] *= val;
          else if (op === '/=') newArr[idx] /= val;
          scope[arrName] = newArr;

          if (!silent) {
            steps.push({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `S'assigna <code class="w">${formatValue(val)}</code> a la posició <code>[${idx}]</code> de <code class="w">${arrName}</code>.`
            });
          }
        }
        return;
      }

      // D. Array element increment/decrement: a[i]++; ++a[i];
      const arrayIncMatch = s.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\](\+\+|--)$/) || s.match(/^(\+\+|--)\[([a-zA-Z0-9_]+)\[([^\]]+)\]$/);
      if (arrayIncMatch) {
        const arrName = arrayIncMatch[1] || arrayIncMatch[2];
        const idxExpr = arrayIncMatch[2] || arrayIncMatch[3];
        const op = s.includes('++') ? 1 : -1;
        const idx = Number(evaluateExprString(idxExpr));

        if (scope[arrName] && Array.isArray(scope[arrName])) {
          const newArr = [...scope[arrName]];
          newArr[idx] = (newArr[idx] || 0) + op;
          scope[arrName] = newArr;

          if (!silent) {
            steps.push({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es modifica l'element <code class="w">${arrName}[${idx}]</code>: ara val <strong>${newArr[idx]}</strong>.`
            });
          }
        }
        return;
      }

      // E. Regular variable declaration / assignment
      const assignMatch = s.match(/^(?:int|double|String|boolean|float|long|char)?\s*([a-zA-Z0-9_]+)\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const op = assignMatch[2];
        const rhsExpr = assignMatch[3];
        const val = evaluateExprString(rhsExpr);

        if (op === '=') scope[varName] = val;
        else if (op === '+=') scope[varName] += val;
        else if (op === '-=') scope[varName] -= val;
        else if (op === '*=') scope[varName] *= val;
        else if (op === '/=') scope[varName] /= val;

        if (!silent) {
          steps.push({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Instrucció',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `S'assigna el valor <strong>${formatValue(val)}</strong> a <code class="w">${varName}</code>.`
          });
        }
        return;
      }

      // F. Regular increment / decrement
      const incMatch = s.match(/^([a-zA-Z0-9_]+)(\+\+|--)$/) || s.match(/^(\+\+|--)([a-zA-Z0-9_]+)$/);
      if (incMatch) {
        const varName = incMatch[1] || incMatch[2];
        const op = s.includes('++') ? 1 : -1;
        scope[varName] = (scope[varName] || 0) + op;

        if (!silent) {
          steps.push({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Modificació',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `Es modifica la variable <code class="w">${varName}</code> (${s}). Ara val <strong>${scope[varName]}</strong>.`
          });
        }
        return;
      }

      // Fallback
      if (!silent) {
        steps.push({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Instrucció',
          hl: s,
          onlyHl: true,
          memRaw: getMemSnapshot(),
          explanation: `S'executa <code class="w">${s}</code>.`
        });
      }
    }

    executeBlock(program);
    return steps;
  }

  // ==========================================================================
  // Step Parser (Manual declarative steps)
  // ==========================================================================

  function parseSteps(root, normalizedLines) {
    const steps = [];

    // Format 1: Direct <step> or <div class="step"> elements
    const stepEls = root.querySelectorAll(':scope > step, :scope > .step');
    if (stepEls.length > 0) {
      stepEls.forEach(el => {
        const lineAttr = el.getAttribute('line') || el.getAttribute('data-line') || '';
        let hlAttr = el.getAttribute('hl') || el.getAttribute('data-hl') || '';
        const partAttr = el.getAttribute('part') || el.getAttribute('data-part') || '';
        const memAttr = el.getAttribute('mem') || el.getAttribute('data-mem') || '';
        const outAttr = el.getAttribute('out') || el.getAttribute('data-out') || '';
        const inAttr = el.getAttribute('in') || el.getAttribute('data-in') || '';
        const shellAttr = el.getAttribute('shell') || el.getAttribute('data-shell') || '';

        // Map part attribute to clean part and Catalan name
        const { part, partName } = resolvePartInfo(partAttr);

        // Auto-extract hl from for loop line if part is given and hl was not
        if (lineAttr && part && !hlAttr && normalizedLines) {
          const lineNum = parseInt(lineAttr, 10);
          if (lineNum > 0 && lineNum <= normalizedLines.length) {
            const lineText = normalizedLines[lineNum - 1];
            const forMatch = lineText.match(/for\s*\(\s*([^;]*);\s*([^;]*);\s*([^)]*)\)/);
            if (forMatch) {
              if (part === 'init') hlAttr = forMatch[1].trim();
              else if (part === 'cond') hlAttr = forMatch[2].trim();
              else if (part === 'update') hlAttr = forMatch[3].trim();
            }
          }
        }

        // Check for custom <mem> or <shell> child elements
        const customMemEl = el.querySelector(':scope > mem, :scope > .mem');
        const customShellEl = el.querySelector(':scope > shell, :scope > .shell');

        // Extract explanation HTML: clone element, remove custom mem/shell elements
        const clone = el.cloneNode(true);
        clone.querySelectorAll('mem, .mem, shell, .shell').forEach(c => c.remove());
        const explanationHtml = clone.innerHTML.trim();

        steps.push({
          lineRaw: lineAttr,
          hl: hlAttr,
          part,
          partName,
          memRaw: memAttr,
          out: outAttr,
          in: inAttr,
          shellRaw: shellAttr,
          customMemHtml: customMemEl ? customMemEl.innerHTML.trim() : null,
          customShellHtml: customShellEl ? customShellEl.innerHTML.trim() : null,
          explanation: explanationHtml
        });
      });
      return steps;
    }

    // Format 2: Compact DSL inside <div class="trace">
    const traceEl = root.querySelector('.trace, trace');
    if (traceEl) {
      const lines = traceEl.textContent.split('\n');
      lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) return;

        // Syntax: Line [hl] | mem: a=1, b=2 | out: hello | Explanation
        // Parts separated by '|'
        const parts = line.split('|').map(s => s.trim());
        const targetPart = parts[0] || '';
        let memRaw = '';
        let outRaw = '';
        let inRaw = '';
        let explanation = '';
        let partAttr = '';

        // Extract line and optional [hl]
        let lineRaw = targetPart;
        let hl = '';
        const hlMatch = targetPart.match(/^(.*?)\s*\[(.*?)\]$/);
        if (hlMatch) {
          lineRaw = hlMatch[1].trim();
          hl = hlMatch[2].trim();
        }

        // Process other parts
        for (let i = 1; i < parts.length; i++) {
          const p = parts[i];
          if (/^mem:/i.test(p)) {
            memRaw = p.replace(/^mem:/i, '').trim();
          } else if (/^out:/i.test(p)) {
            outRaw = p.replace(/^out:/i, '').trim();
          } else if (/^in:/i.test(p)) {
            inRaw = p.replace(/^in:/i, '').trim();
          } else if (/^part:/i.test(p)) {
            partAttr = p.replace(/^part:/i, '').trim();
          } else {
            explanation = p;
          }
        }

        const { part, partName } = resolvePartInfo(partAttr);

        steps.push({
          lineRaw,
          hl,
          part,
          partName,
          memRaw,
          out: outRaw,
          in: inRaw,
          shellRaw: '',
          customMemHtml: null,
          customShellHtml: null,
          explanation
        });
      });
      return steps;
    }

    return steps;
  }

  function resolvePartInfo(partAttr) {
    if (!partAttr) return { part: '', partName: '' };
    const p = partAttr.toLowerCase().trim();
    if (p === 'init' || p === 'inicialitzacio' || p === 'inicialització') {
      return { part: 'init', partName: 'Inicialització' };
    }
    if (p === 'cond' || p === 'condicio' || p === 'condició') {
      return { part: 'cond', partName: 'Condició' };
    }
    if (p === 'body' || p === 'cos') {
      return { part: 'body', partName: 'Cos del bucle' };
    }
    if (p === 'update' || p === 'modificacio' || p === 'modificació' || p === 'mod') {
      return { part: 'update', partName: 'Modificació' };
    }
    return { part: p, partName: partAttr };
  }

  function parseLineNumbers(lineRaw) {
    if (!lineRaw) return [];
    const result = [];
    const parts = String(lineRaw).split(',');
    parts.forEach(part => {
      const p = part.trim();
      if (p.includes('-')) {
        const [start, end] = p.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) result.push(i);
        }
      } else {
        const num = parseInt(p, 10);
        if (!isNaN(num)) result.push(num);
      }
    });
    return result;
  }

  function parseMemString(memStr) {
    const map = new Map();
    if (!memStr) return map;

    // Bracket-aware token split so arrays like [1, 2, 3] are not broken up
    const tokens = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < memStr.length; i++) {
      const ch = memStr[i];
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') depth--;
      else if ((ch === ',' || ch === ';') && depth === 0) {
        if (cur.trim()) tokens.push(cur.trim());
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) tokens.push(cur.trim());

    tokens.forEach(tok => {
      const match = tok.match(/^([^:=]+)[:=](.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        map.set(key, val);
      } else if (tok.startsWith('-')) {
        map.set(tok.substring(1).trim(), null);
      }
    });
    return map;
  }

  function buildTimeline(stepsData) {
    const timeline = [];
    let currentMemMap = new Map();
    let currentShellHtml = '';

    stepsData.forEach((rawStep, index) => {
      const lines = parseLineNumbers(rawStep.lineRaw);
      
      // 1. Compute Memory Updates
      const stepMemDiff = parseMemString(rawStep.memRaw);
      const nextMemMap = new Map(currentMemMap);
      const changedKeys = new Set();

      stepMemDiff.forEach((val, key) => {
        if (val === null) {
          nextMemMap.delete(key);
          changedKeys.add(key);
        } else {
          if (nextMemMap.get(key) !== val) {
            changedKeys.add(key);
          }
          nextMemMap.set(key, val);
        }
      });

      // Prepare memory entries array
      const memEntries = [];
      nextMemMap.forEach((value, key) => {
        memEntries.push({
          key,
          value,
          changed: changedKeys.has(key)
        });
      });

      currentMemMap = nextMemMap;

      // 2. Compute Console Updates
      let nextShellHtml = currentShellHtml;
      if (rawStep.shellRaw) {
        nextShellHtml = escapeHtml(rawStep.shellRaw);
      } else if (rawStep.customShellHtml) {
        nextShellHtml = rawStep.customShellHtml;
      } else {
        if (rawStep.in) {
          nextShellHtml += `<span class="in">${escapeHtml(rawStep.in)}</span>\n`;
        }
        if (rawStep.out) {
          nextShellHtml += `<span class="out">${escapeHtml(rawStep.out)}</span>\n`;
        }
      }
      currentShellHtml = nextShellHtml;

      timeline.push({
        index,
        lines,
        hl: rawStep.hl,
        part: rawStep.part,
        partName: rawStep.partName,
        explanation: rawStep.explanation,
        memEntries,
        customMemHtml: rawStep.customMemHtml,
        shellHtml: currentShellHtml.trimEnd()
      });
    });

    return timeline;
  }

  function highlightTokenInCell(cell, tokenText, part, lang = 'java') {
    if (!cell || !tokenText) return false;
    const rawText = cell.dataset.rawText;
    if (!rawText) return false;

    function renderCode(code) {
      if (global.Prism && global.Prism.languages[lang]) {
        try {
          return global.Prism.highlight(code, global.Prism.languages[lang], lang);
        } catch (e) {
          return escapeHtml(code);
        }
      }
      return escapeHtml(code);
    }

    const range = findTokenRange(rawText, tokenText);
    if (!range) {
      return false;
    }

    const before = rawText.substring(0, range.start);
    const match = rawText.substring(range.start, range.end);
    const after = rawText.substring(range.end);
    const partClass = part ? ` part-${part}` : '';

    cell.innerHTML = renderCode(before) +
      `<span class="hl-token${partClass}">${renderCode(match)}</span>` +
      renderCode(after);
    return true;
  }

  function findTokenRange(lineText, tokenText) {
    if (!lineText || !tokenText) return null;
    const directIdx = lineText.indexOf(tokenText);
    if (directIdx !== -1) {
      return { start: directIdx, end: directIdx + tokenText.length };
    }
    const words = tokenText.trim().split(/\s+/).map(escapeRegex);
    if (words.length === 0) return null;
    try {
      const flexibleRegex = new RegExp(words.join('\\s*'));
      const m = lineText.match(flexibleRegex);
      if (m) {
        return { start: m.index, end: m.index + m[0].length };
      }
    } catch (e) {}
    return null;
  }

  function normalizeCodeLines(code) {
    const rawLines = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    
    while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
    while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();

    if (rawLines.length === 0) return [];

    let minIndent = Infinity;
    rawLines.forEach(line => {
      if (line.trim().length > 0) {
        const indent = line.match(/^[ \t]*/)[0].length;
        if (indent < minIndent) minIndent = indent;
      }
    });

    if (minIndent === Infinity || minIndent === 0) return rawLines;

    return rawLines.map(line => {
      return line.length >= minIndent ? line.substring(minIndent) : line;
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Auto-init on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initNewSteppers());
    } else {
      initNewSteppers();
    }
  }

  // Expose to window
  global.initNewSteppers = initNewSteppers;
  global.setupStepper = setupStepper;
  global.simulateJava = simulateJava;

})(typeof window !== 'undefined' ? window : global);

