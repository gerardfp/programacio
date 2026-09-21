/**
 * Stepper 2.0 Engine
 * Declarative, single-code-block stepper engine with automatic state tracking.
 * Next-Generation Interactive Code Stepper with Auto-Simulation for Loops (while, for, do-while)
 * and Explicit Phase Highlighting for `for` loops (Inicialització, Condició, Cos, Modificació).
 */

(function(global) {
  'use strict';

  function parseInputAttribute(rawIn) {
    if (!rawIn) return [];
    return rawIn
      .replace(/\\n/g, '\n')
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

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
    const sourceEl = root.querySelector('code.source, .source, pre.source') || root.querySelector(':scope > pre > code, :scope > pre, :scope > code');
    if (!sourceEl) {
      console.warn('Stepper 2.0: No source code element found inside', root);
      return;
    }

    const rawCode = sourceEl.textContent;
    const lang = root.getAttribute('lang') || (root.getAttribute('java') !== null ? 'java' : 'plaintext');
    const normalizedLines = normalizeCodeLines(rawCode);
    const cleanCode = normalizedLines.join('\n');

    // 2. Extract step definitions or Auto-Simulate Java code
    let stepsData = parseSteps(root, normalizedLines);
    const forceAuto = root.hasAttribute('auto') || root.getAttribute('mode') === 'auto';
    const rawIn = root.getAttribute('in') || '';
    let initialInputs = parseInputAttribute(rawIn);
    
    if (stepsData.length === 0 || forceAuto) {
      // Auto-simulate Java execution!
      stepsData = simulateJava(cleanCode, initialInputs);
    }

    if (stepsData.length === 0) {
      console.warn('Stepper 2.0: No steps could be extracted or simulated for stepper', root);
      return;
    }

    // 3. Precompute timeline state (cumulative memory and console)
    let timeline = buildTimeline(stepsData, initialInputs);

    // 4. Build UI Structure
    root.innerHTML = '';
    root.tabIndex = 0; // Focusable for keyboard navigation

    // Controls: paso atras, paso adelante, volver al inicio, slider (només icones)
    const controls = document.createElement('div');
    controls.className = 'stepper-controls';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'stepper-btn-group';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-prev';
    prevBtn.type = 'button';
    prevBtn.innerHTML = '◀';
    prevBtn.title = 'Pas enrere';
    prevBtn.setAttribute('aria-label', 'Pas enrere');
    prevBtn.disabled = true;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-next';
    nextBtn.type = 'button';
    nextBtn.innerHTML = '▶';
    nextBtn.title = 'Pas endavant';
    nextBtn.setAttribute('aria-label', 'Pas endavant');
    nextBtn.disabled = timeline.length <= 1;

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset';
    resetBtn.type = 'button';
    resetBtn.innerHTML = '↺';
    resetBtn.title = 'Tornar a l\'inici';
    resetBtn.setAttribute('aria-label', 'Tornar a l\'inici');

    btnGroup.appendChild(prevBtn);
    btnGroup.appendChild(nextBtn);
    btnGroup.appendChild(resetBtn);

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

    const gutter = document.createElement('div');
    gutter.className = 'code-gutter';
    gutter.setAttribute('aria-hidden', 'true');

    const pre = document.createElement('pre');
    pre.className = 'code-pre';
    const codeBlock = document.createElement('code');
    codeBlock.className = `language-${lang}`;
    codeBlock.setAttribute('contenteditable', 'true');
    codeBlock.setAttribute('spellcheck', 'false');

    function buildCodeView(codeStr) {
      const lines = normalizeCodeLines(codeStr);
      gutter.innerHTML = '';
      codeBlock.innerHTML = '';

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;

        // Line number in gutter
        const spanNum = document.createElement('div');
        spanNum.className = 'code-line-num';
        spanNum.dataset.line = String(lineNum);
        spanNum.textContent = String(lineNum);
        gutter.appendChild(spanNum);

        // Line row in code block
        const lineRow = document.createElement('div');
        lineRow.className = 'code-line-row';
        lineRow.dataset.line = String(lineNum);

        const spanCode = document.createElement('span');
        spanCode.className = 'code-line-content';
        
        // Render line with syntax highlight if Prism available
        if (global.Prism && global.Prism.languages[lang]) {
          try {
            spanCode.innerHTML = global.Prism.highlight(lineText, global.Prism.languages[lang], lang);
          } catch (e) {
            spanCode.textContent = lineText;
          }
        } else {
          spanCode.textContent = lineText;
        }

        if (!lineText) {
          spanCode.innerHTML = '&nbsp;';
        }

        // Store original HTML for resetting highlights
        spanCode.dataset.originalHtml = spanCode.innerHTML;
        spanCode.dataset.rawText = lineText;

        lineRow.appendChild(spanCode);
        codeBlock.appendChild(lineRow);
      });
    }

    buildCodeView(cleanCode);

    let isCodeEdited = false;
    let isInputEdited = false;

    function getRawCodeFromEditor() {
      return codeBlock.innerText || codeBlock.textContent || '';
    }

    function updateGutterLineCount(totalLines) {
      gutter.innerHTML = '';
      for (let i = 1; i <= totalLines; i++) {
        const spanNum = document.createElement('div');
        spanNum.className = 'code-line-num';
        spanNum.dataset.line = String(i);
        spanNum.textContent = String(i);
        gutter.appendChild(spanNum);
      }
    }

    // Editable code listeners: no real-time syntax highlight while typing (only plain text)
    codeBlock.addEventListener('input', () => {
      isCodeEdited = true;
      resetBtn.classList.add('needs-reset');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      slider.disabled = true;

      // Update gutter lines count dynamically
      const raw = getRawCodeFromEditor();
      const lineCount = Math.max(1, raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').length);
      updateGutterLineCount(lineCount);

      // Clear highlights from gutter & lines
      gutter.querySelectorAll('.active, .active-sub').forEach(el => el.classList.remove('active', 'active-sub'));
      codeBlock.querySelectorAll('.active, .active-sub').forEach(el => el.classList.remove('active', 'active-sub'));

      // Show editing hint
      const msg = isInputEdited
        ? '✏️ Codi i entrada modificats. Prem <strong>↺</strong> (o Ctrl+Enter) per recarregar i executar.'
        : '✏️ Codi modificat. Prem <strong>↺</strong> (o Ctrl+Enter) per recarregar i executar.';
      explanationBox.innerHTML = `<span class="stepper-edit-hint">${msg}</span>`;
    });

    codeBlock.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        resetBtn.click();
      }
    });

    codeBlock.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    pre.addEventListener('scroll', () => {
      gutter.scrollTop = pre.scrollTop;
    });

    pre.appendChild(codeBlock);
    codePanel.appendChild(gutter);
    codePanel.appendChild(pre);

    // Right Info Panel
    const infoPanel = document.createElement('div');
    infoPanel.className = 'stepper-info-panel';

    const explanationBox = document.createElement('div');
    explanationBox.className = 'stepper-explanation';

    const memBox = document.createElement('div');
    memBox.className = 'stepper-mem';
    const memHeader = document.createElement('div');
    memHeader.className = 'stepper-mem-header';
    memHeader.textContent = 'Variables';
    const memList = document.createElement('div');
    memList.className = 'stepper-mem-list';
    memBox.appendChild(memHeader);
    memBox.appendChild(memList);

    // Consola: Entrada (In)
    const consoleInBox = document.createElement('div');
    consoleInBox.className = 'stepper-console stepper-console-in';
    const consoleInHeader = document.createElement('div');
    consoleInHeader.className = 'stepper-console-header';
    consoleInHeader.textContent = 'Consola (Entrada)';
    const consoleInContent = document.createElement('div');
    consoleInContent.className = 'stepper-console-content stepper-console-in-content';
    consoleInContent.setAttribute('contenteditable', 'true');
    consoleInContent.setAttribute('spellcheck', 'false');

    function getRawInputFromConsole() {
      const raw = consoleInContent.innerText || consoleInContent.textContent || '';
      return raw.replace(/\u00a0/g, ' ');
    }

    consoleInContent.addEventListener('input', () => {
      isInputEdited = true;
      resetBtn.classList.add('needs-reset');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      slider.disabled = true;

      // Clear consumed strikethrough styling while editing
      consoleInContent.querySelectorAll('.consumed').forEach(el => {
        el.classList.remove('consumed');
        el.style.textDecoration = '';
      });

      const msg = isCodeEdited
        ? '✏️ Codi i entrada modificats. Prem <strong>↺</strong> (o Ctrl+Enter) per recarregar i executar.'
        : '✏️ Entrada modificada. Prem <strong>↺</strong> (o Ctrl+Enter) per recarregar i executar.';
      explanationBox.innerHTML = `<span class="stepper-edit-hint">${msg}</span>`;
    });

    consoleInContent.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        resetBtn.click();
      }
    });

    consoleInContent.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    consoleInBox.appendChild(consoleInHeader);
    consoleInBox.appendChild(consoleInContent);

    // Consola: Sortida (Out)
    const consoleOutBox = document.createElement('div');
    consoleOutBox.className = 'stepper-console stepper-console-out stepper-shell';
    const consoleOutHeader = document.createElement('div');
    consoleOutHeader.className = 'stepper-console-header stepper-shell-header';
    consoleOutHeader.textContent = 'Consola (Sortida)';
    const consoleOutContent = document.createElement('div');
    consoleOutContent.className = 'stepper-console-content stepper-console-out-content stepper-shell-content';
    consoleOutBox.appendChild(consoleOutHeader);
    consoleOutBox.appendChild(consoleOutContent);

    infoPanel.appendChild(memBox);
    infoPanel.appendChild(consoleInBox);
    infoPanel.appendChild(consoleOutBox);

    body.appendChild(codePanel);
    body.appendChild(infoPanel);

    // Assemble components into root
    root.appendChild(controls);
    root.appendChild(body);
    root.appendChild(explanationBox);

    // 5. Execution State Controller
    let currentStep = 0;

    function renderStep(stepIdx) {
      if (stepIdx < 0) stepIdx = 0;
      if (stepIdx >= timeline.length) stepIdx = timeline.length - 1;
      currentStep = stepIdx;

      const state = timeline[currentStep];

      // Update controls
      slider.value = String(currentStep);
      prevBtn.disabled = currentStep === 0;
      nextBtn.disabled = currentStep === timeline.length - 1;

      // 1. Update Code Highlight
      const allRows = codeBlock.querySelectorAll('.code-line-row');
      allRows.forEach(row => {
        row.classList.remove('active');
        row.classList.remove('active-sub');
        const codeCell = row.querySelector('.code-line-content');
        if (codeCell && codeCell.dataset.originalHtml) {
          codeCell.innerHTML = codeCell.dataset.originalHtml;
        }
      });

      const allGutterNums = gutter.querySelectorAll('.code-line-num');
      allGutterNums.forEach(num => {
        num.classList.remove('active');
        num.classList.remove('active-sub');
      });

      if (state.lines && state.lines.length > 0) {
        state.lines.forEach(lineNum => {
          const targetRow = codeBlock.querySelector(`.code-line-row[data-line="${lineNum}"]`);
          const targetNum = gutter.querySelector(`.code-line-num[data-line="${lineNum}"]`);
          if (targetRow) {
            if (state.hl) {
              const codeCell = targetRow.querySelector('.code-line-content');
              const highlighted = highlightTokenInCell(codeCell, state.hl, state.part, lang);
              if (highlighted) {
                targetRow.classList.add('active-sub');
                if (targetNum) targetNum.classList.add('active-sub');
              } else {
                targetRow.classList.add('active');
                if (targetNum) targetNum.classList.add('active');
              }
            } else {
              targetRow.classList.add('active');
              if (targetNum) targetNum.classList.add('active');
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

      // 4. Update Consoles (In & Out)
      consoleInContent.innerHTML = state.inHtml || '';
      consoleOutContent.innerHTML = state.outHtml || '';

    }

    // Event Listeners
    nextBtn.addEventListener('click', () => {
      renderStep(currentStep + 1);
    });

    prevBtn.addEventListener('click', () => {
      renderStep(currentStep - 1);
    });

    resetBtn.addEventListener('click', () => {
      if (!isCodeEdited && !isInputEdited) {
        renderStep(0);
        return;
      }

      // Re-load / re-simulate new code and/or new inputs!
      const raw = getRawCodeFromEditor();
      const normLines = normalizeCodeLines(raw);
      const newCleanCode = normLines.join('\n');

      if (isInputEdited) {
        const rawInput = getRawInputFromConsole();
        initialInputs = parseInputAttribute(rawInput);
      }

      try {
        const newSteps = simulateJava(newCleanCode, initialInputs);
        if (!newSteps || newSteps.length === 0) {
          throw new Error('No s\'ha pogut simular cap pas amb el codi o les entrades introduïdes.');
        }

        // Successfully simulated!
        stepsData = newSteps;
        timeline = buildTimeline(stepsData, initialInputs);
        isCodeEdited = false;
        isInputEdited = false;
        resetBtn.classList.remove('needs-reset');

        // Rebuild code view with Prism syntax highlighting & gutter numbers
        buildCodeView(newCleanCode);

        // Update slider range & controls
        slider.max = String(timeline.length - 1);
        slider.disabled = false;
        prevBtn.disabled = true;
        nextBtn.disabled = timeline.length <= 1;

        // Render step 0 of new timeline!
        renderStep(0);
      } catch (err) {
        console.warn('Stepper 2.0: Error simulating edited code or inputs:', err);
        explanationBox.innerHTML = `<span class="stepper-phase-badge part-end">Error</span> <span style="color:#f87171; margin-left: 0.5em;">${escapeHtml(err.message || String(err))}</span>`;
        resetBtn.classList.add('needs-reset');
      }
    });

    slider.addEventListener('input', () => {
      renderStep(parseInt(slider.value, 10));
    });

    // Keyboard navigation when stepper has focus
    root.addEventListener('keydown', (e) => {
      // Do not intercept navigation keys while typing inside an editable element
      if (e.target && (e.target.isContentEditable || (e.target.closest && e.target.closest('code, pre, input, textarea, [contenteditable="true"]')))) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        renderStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        renderStep(currentStep - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        renderStep(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        renderStep(timeline.length - 1);
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
    const initialInputs = [...inputs];
    const steps = [];
    const scope = {};
    const varTypes = {};
    const MAX_STEPS = 200;

    let readInputsThisStep = [];
    let readPromptsThisStep = [];
    let consumedInputsCount = 0;

    function pushStep(stepObj) {
      if (readInputsThisStep.length > 0 && !stepObj.in) {
        stepObj.in = readInputsThisStep.join('\n');
      }
      if (readPromptsThisStep.length > 0 && !stepObj.out) {
        stepObj.out = readPromptsThisStep.join('');
      }
      stepObj.consumedCount = consumedInputsCount;
      stepObj.initialInputs = initialInputs;
      readInputsThisStep = [];
      readPromptsThisStep = [];
      steps.push(stepObj);
    }

    // --- 1. Tokenizer ---
    function tokenize(code) {
      const tokens = [];
      let i = 0;
      let line = 1;
      let col = 1;

      const KEYWORDS = new Set([
        'byte', 'short', 'int', 'double', 'float', 'long', 'boolean', 'String', 'char', 'void',
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
          if (i < code.length && /[fFdDlL]/.test(code[i])) {
            numStr += code[i];
            i++;
            col++;
          }
          const cleanNum = numStr.replace(/[fFdDlL]$/, '');
          tokens.push({
            type: 'NUMBER',
            value: cleanNum.includes('.') ? parseFloat(cleanNum) : parseInt(cleanNum, 10),
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

    const scanner = {
      nextLine: () => {
        const val = inputQueue.shift() ?? '';
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return String(val);
      },
      next: () => {
        const val = inputQueue.shift() ?? '';
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return String(val);
      },
      nextInt: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseInt(val, 10) || 0;
      },
      nextLong: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseInt(val, 10) || 0;
      },
      nextByte: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseInt(val, 10) || 0;
      },
      nextShort: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseInt(val, 10) || 0;
      },
      nextDouble: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseFloat(val) || 0;
      },
      nextFloat: () => {
        const val = inputQueue.shift() ?? 0;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return parseFloat(val) || 0;
      },
      nextBoolean: () => {
        const val = inputQueue.shift() ?? false;
        readInputsThisStep.push(String(val));
        consumedInputsCount++;
        return String(val).trim().toLowerCase() === 'true';
      },
      hasNext: () => inputQueue.length > 0,
      hasNextInt: () => inputQueue.length > 0 && !isNaN(parseInt(inputQueue[0], 10)),
      hasNextDouble: () => inputQueue.length > 0 && !isNaN(parseFloat(inputQueue[0]))
    };

    const IO = {
      readln: (prompt) => {
        if (prompt !== undefined && prompt !== null && prompt !== '') {
          readPromptsThisStep.push(String(prompt));
        }
        return scanner.nextLine();
      },
      println: (msg) => msg,
      print: (msg) => msg
    };

    function toChar(val) {
      if (typeof val === 'number') return String.fromCharCode(val);
      if (typeof val === 'string') {
        const m1 = val.match(/^([a-zA-Z])(\d+)$/);
        if (m1) return String.fromCharCode(m1[1].charCodeAt(0) + Number(m1[2]));
        const m2 = val.match(/^(\d+)([a-zA-Z])$/);
        if (m2) return String.fromCharCode(m2[2].charCodeAt(0) + Number(m2[1]));
        return val.length > 0 ? val[0] : '\0';
      }
      return '\0';
    }

    function toInt(val) {
      if (typeof val === 'string' && val.length === 1 && !/^[0-9]$/.test(val)) {
        return val.charCodeAt(0);
      }
      return Math.trunc(Number(val)) || 0;
    }

    function getDefaultValue(type) {
      switch (type) {
        case 'byte':
        case 'short':
        case 'int':
        case 'long': return 0;
        case 'float':
        case 'double': return 0.0;
        case 'boolean': return false;
        case 'char': return '\0';
        case 'String': return null;
        default: return null;
      }
    }

    function coerceType(val, type) {
      if (val === null || val === undefined) {
        if (type === 'String' || (type && type.endsWith('[]'))) return null;
        return getDefaultValue(type);
      }
      switch (type) {
        case 'byte':
        case 'short':
        case 'int':
        case 'long':
          if (typeof val === 'string' && val.length === 1 && !/^[0-9]/.test(val)) {
            return val.charCodeAt(0);
          }
          return Math.trunc(Number(val)) || 0;
        case 'float':
        case 'double':
          return Number(val) || 0.0;
        case 'boolean':
          return Boolean(val);
        case 'char':
          return toChar(val);
        case 'String':
          return String(val);
        default:
          return val;
      }
    }

    function formatValue(v, type) {
      if (Array.isArray(v)) {
        const subType = type ? type.replace(/\[\]$/, '') : undefined;
        return `[${v.map(item => formatValue(item, subType)).join(', ')}]`;
      }
      if (v === null || v === undefined) return 'null';
      if (type === 'char') {
        return `'${v}'`;
      }
      if (type === 'String' || (typeof v === 'string' && type !== 'char')) {
        return `"${v}"`;
      }
      if (typeof v === 'number') {
        if ((type === 'double' || type === 'float') && Number.isInteger(v)) {
          return `${v}.0`;
        }
        return String(v);
      }
      if (typeof v === 'boolean') {
        return String(v);
      }
      return String(v);
    }

    function getMemSnapshot() {
      const parts = [];
      for (const [k, v] of Object.entries(scope)) {
        if (k === 'scanner' || k === 'sc' || varTypes[k] === 'Scanner') continue;
        const type = varTypes[k];
        parts.push(`${k}: ${formatValue(v, type)}`);
      }
      return parts.join(', ');
    }

    function parseArrayLiteral(rhs, elemType, dims) {
      const str = rhs.trim();
      if (dims === 2) {
        if (str.startsWith('{') && str.endsWith('}')) {
          const inner = str.slice(1, -1).trim();
          if (!inner) return [];
          const rows = [];
          let depth = 0;
          let cur = '';
          for (let i = 0; i < inner.length; i++) {
            const ch = inner[i];
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            else if (ch === ',' && depth === 0) {
              rows.push(cur.trim());
              cur = '';
              continue;
            }
            cur += ch;
          }
          if (cur.trim()) rows.push(cur.trim());
          return rows.map(r => parseArrayLiteral(r, elemType, 1));
        }
      } else {
        if (str.startsWith('{') && str.endsWith('}')) {
          const inner = str.slice(1, -1).trim();
          if (!inner) return [];
          const items = [];
          let depth = 0;
          let cur = '';
          for (let i = 0; i < inner.length; i++) {
            const ch = inner[i];
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            else if (ch === ',' && depth === 0) {
              items.push(cur.trim());
              cur = '';
              continue;
            }
            cur += ch;
          }
          if (cur.trim()) items.push(cur.trim());
          return items.map(item => {
            const val = evaluateExprString(item.trim());
            return coerceType(val, elemType);
          });
        }
      }
      return [];
    }

    // --- 2. Expression Evaluator ---
    function evaluateExprString(jsExpr) {
      if (!jsExpr) return true;

      let expr = jsExpr.trim();

      // Char subtraction: 'c' - 'a' or c - 'a'
      expr = expr.replace(/'([^'\\])'\s*-\s*'([^'\\])'/g, (m, c1, c2) => `(${c1.charCodeAt(0)} - ${c2.charCodeAt(0)})`);
      expr = expr.replace(/([a-zA-Z0-9_]+)\s*-\s*'([^'\\])'/g, (m, v, c) => `((typeof ${v} === 'string' ? ${v}.charCodeAt(0) : ${v}) - ${c.charCodeAt(0)})`);

      // Equals
      expr = expr.replace(/\.equals\(([^)]+)\)/g, ' === ($1)');
      expr = expr.replace(/\.equalsIgnoreCase\(([^)]+)\)/g, '.toLowerCase() === ($1).toLowerCase()');

      // Casts
      expr = expr.replace(/\((?:int|long|short|byte)\)\s*([a-zA-Z0-9_.]+|\([^)]+\))/g, 'toInt($1)');
      expr = expr.replace(/\((?:double|float)\)\s*([a-zA-Z0-9_.]+|\([^)]+\))/g, 'Number($1)');
      expr = expr.replace(/\(char\)\s*([a-zA-Z0-9_.]+|\([^)]+\))/g, 'toChar($1)');
      expr = expr.replace(/\(String\)\s*([a-zA-Z0-9_.]+|\([^)]+\))/g, 'String($1)');
      expr = expr.replace(/\(boolean\)\s*([a-zA-Z0-9_.]+|\([^)]+\))/g, 'Boolean($1)');

      // .length()
      expr = expr.replace(/\.length\(\)/g, '.length');

      // Strip trailing semicolon
      expr = expr.replace(/;+$/, '').trim();

      // Number suffixes
      expr = expr.replace(/\b(\d+(?:\.\d+)?)[fFdDlL]\b/g, '$1');

      const evalScope = {
        scanner,
        sc: scanner,
        IO,
        toChar,
        toInt,
        Integer: {
          parseInt: (s) => parseInt(s, 10),
          valueOf: (s) => parseInt(s, 10),
          max: Math.max,
          min: Math.min
        },
        Double: {
          parseDouble: (s) => parseFloat(s),
          valueOf: (s) => parseFloat(s)
        },
        Float: {
          parseFloat: (s) => parseFloat(s),
          valueOf: (s) => parseFloat(s)
        },
        Long: {
          parseLong: (s) => parseInt(s, 10),
          valueOf: (s) => parseInt(s, 10)
        },
        Boolean: {
          parseBoolean: (s) => String(s).toLowerCase() === 'true',
          valueOf: (s) => String(s).toLowerCase() === 'true'
        },
        Character: {
          isDigit: (c) => /^[0-9]$/.test(c),
          isLetter: (c) => /^[a-zA-Z]$/.test(c),
          isWhitespace: (c) => /^\s$/.test(c),
          toUpperCase: (c) => String(c).toUpperCase(),
          toLowerCase: (c) => String(c).toLowerCase()
        },
        ...scope
      };

      try {
        const keys = Object.keys(evalScope);
        const vals = Object.values(evalScope);
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
      if (tok.type === 'IDENT' || (tok.type === 'KEYWORD' && ['byte', 'short', 'int', 'double', 'float', 'long', 'boolean', 'String', 'char'].includes(tok.value))) {
        let lookahead = 1;
        let varTok = tok;
        if (['byte', 'short', 'int', 'double', 'float', 'long', 'boolean', 'String', 'char'].includes(tok.value)) {
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

      // Method declaration: void main(...) { ... } or public static void main(...) { ... }
      if (tok.value === 'void' || (tok.value === 'public' && peek(1) && peek(1).value === 'static')) {
        while (peek() && peek().value !== '{') consume();
        if (peek() && peek().value === '{') {
          return parseStatement();
        }
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
        pushStep({
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
        pushStep({
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
          pushStep({
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
            pushStep({
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
              pushStep({
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
            pushStep({
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
            pushStep({
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
            pushStep({
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
          pushStep({
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
        pushStep({
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
              pushStep({
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
              pushStep({
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
        pushStep({
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
        pushStep({
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
        pushStep({
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

      // A. Output: print / println / System.out.println / IO.println
      const printMatch = s.match(/^(?:(?:System\.out|IO)\.)?(println|print)\s*\((.*)\)$/);
      if (printMatch) {
        const isLn = printMatch[1] === 'println';
        const arg = printMatch[2].trim();
        const val = arg ? evaluateExprString(arg) : '';
        const outStr = String(val) + (isLn ? '\n' : '');
        if (!silent) {
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Sortida',
            hl: s,
            onlyHl: true,
            out: outStr,
            memRaw: getMemSnapshot(),
            explanation: `S'executa <code class="w">${s}</code>, mostrant <code class="w">${val}</code> per consola.`
          });
        }
        return;
      }

      // B. Scanner declaration: Scanner sc = new Scanner(System.in);
      const scannerDeclMatch = s.match(/^(?:Scanner)\s+([a-zA-Z0-9_]+)\s*=\s*new\s+Scanner\(.*\)$/);
      if (scannerDeclMatch) {
        const varName = scannerDeclMatch[1];
        scope[varName] = scanner;
        varTypes[varName] = 'Scanner';
        if (!silent) {
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Instrucció',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `S'inicialitza l'objecte Scanner (<code class="w">${varName}</code>) per llegir de l'entrada.`
          });
        }
        return;
      }

      // C. 2D Array element assignment: m[i][j] = val; m[i][j] += val; etc.
      const array2dElemMatch = s.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\]\[([^\]]+)\]\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if (array2dElemMatch) {
        const arrName = array2dElemMatch[1];
        const rExpr = array2dElemMatch[2];
        const cExpr = array2dElemMatch[3];
        const op = array2dElemMatch[4];
        const rhsExpr = array2dElemMatch[5];

        const r = Number(evaluateExprString(rExpr));
        const c = Number(evaluateExprString(cExpr));
        const val = evaluateExprString(rhsExpr);

        if (scope[arrName] && Array.isArray(scope[arrName]) && Array.isArray(scope[arrName][r])) {
          const row = [...scope[arrName][r]];
          const elemType = varTypes[arrName] ? varTypes[arrName].replace(/\[\]\[\]$/, '') : undefined;
          const coercedVal = elemType ? coerceType(val, elemType) : val;

          if (op === '=') row[c] = coercedVal;
          else if (op === '+=') row[c] += coercedVal;
          else if (op === '-=') row[c] -= coercedVal;
          else if (op === '*=') row[c] *= coercedVal;
          else if (op === '/=') row[c] /= coercedVal;

          const newMat = [...scope[arrName]];
          newMat[r] = row;
          scope[arrName] = newMat;

          if (!silent) {
            pushStep({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `S'assigna <code class="w">${formatValue(row[c], elemType)}</code> a la posició <code>[${r}][${c}]</code> de <code class="w">${arrName}</code>.`
            });
          }
        }
        return;
      }

      // D. 2D Array element increment/decrement: m[i][j]++; ++m[i][j]; etc.
      const array2dIncMatch = s.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\]\[([^\]]+)\](\+\+|--)$/) ||
                              s.match(/^(\+\+|--)([a-zA-Z0-9_]+)\[([^\]]+)\]\[([^\]]+)\]$/);
      if (array2dIncMatch) {
        const isPrefix = s.startsWith('++') || s.startsWith('--');
        const arrName = isPrefix ? array2dIncMatch[2] : array2dIncMatch[1];
        const rExpr = isPrefix ? array2dIncMatch[3] : array2dIncMatch[2];
        const cExpr = isPrefix ? array2dIncMatch[4] : array2dIncMatch[3];
        const op = s.includes('++') ? 1 : -1;

        const r = Number(evaluateExprString(rExpr));
        const c = Number(evaluateExprString(cExpr));

        if (scope[arrName] && Array.isArray(scope[arrName]) && Array.isArray(scope[arrName][r])) {
          const row = [...scope[arrName][r]];
          const elemType = varTypes[arrName] ? varTypes[arrName].replace(/\[\]\[\]$/, '') : undefined;
          if (elemType === 'char') {
            row[c] = String.fromCharCode(row[c].charCodeAt(0) + op);
          } else {
            row[c] = (row[c] || 0) + op;
          }
          const newMat = [...scope[arrName]];
          newMat[r] = row;
          scope[arrName] = newMat;

          if (!silent) {
            pushStep({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es modifica l'element <code class="w">${arrName}[${r}][${c}]</code>: ara val <strong>${formatValue(row[c], elemType)}</strong>.`
            });
          }
        }
        return;
      }

      // E. 1D Array element assignment: a[i] = val; a[i] += val; etc.
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
          const elemType = varTypes[arrName] ? varTypes[arrName].replace(/\[\]$/, '') : undefined;
          const coercedVal = elemType ? coerceType(val, elemType) : val;

          if (op === '=') newArr[idx] = coercedVal;
          else if (op === '+=') newArr[idx] += coercedVal;
          else if (op === '-=') newArr[idx] -= coercedVal;
          else if (op === '*=') newArr[idx] *= coercedVal;
          else if (op === '/=') newArr[idx] /= coercedVal;
          scope[arrName] = newArr;

          if (!silent) {
            pushStep({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `S'assigna <code class="w">${formatValue(newArr[idx], elemType)}</code> a la posició <code>[${idx}]</code> de <code class="w">${arrName}</code>.`
            });
          }
        }
        return;
      }

      // F. 1D Array element increment/decrement: a[i]++; ++a[i]; etc.
      const arrayIncMatch = s.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\](\+\+|--)$/) ||
                            s.match(/^(\+\+|--)\[([a-zA-Z0-9_]+)\[([^\]]+)\]$/) ||
                            s.match(/^(\+\+|--)([a-zA-Z0-9_]+)\[([^\]]+)\]$/);
      if (arrayIncMatch) {
        const isPrefix = s.startsWith('++') || s.startsWith('--');
        const arrName = isPrefix ? (arrayIncMatch[2] || arrayIncMatch[1]) : arrayIncMatch[1];
        const idxExpr = isPrefix ? (arrayIncMatch[3] || arrayIncMatch[2]) : arrayIncMatch[2];
        const op = s.includes('++') ? 1 : -1;
        const idx = Number(evaluateExprString(idxExpr));

        if (scope[arrName] && Array.isArray(scope[arrName])) {
          const newArr = [...scope[arrName]];
          const elemType = varTypes[arrName] ? varTypes[arrName].replace(/\[\]$/, '') : undefined;
          if (elemType === 'char') {
            newArr[idx] = String.fromCharCode(newArr[idx].charCodeAt(0) + op);
          } else {
            newArr[idx] = (newArr[idx] || 0) + op;
          }
          scope[arrName] = newArr;

          if (!silent) {
            pushStep({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Modificació Array',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es modifica l'element <code class="w">${arrName}[${idx}]</code>: ara val <strong>${formatValue(newArr[idx], elemType)}</strong>.`
            });
          }
        }
        return;
      }

      // G. Array declaration (1D and 2D): Type[]... a = ...; or Type[]... a;
      const arrayDeclMatch = s.match(/^(byte|short|int|long|float|double|boolean|char|String)((?:\[\])+)\s*([a-zA-Z0-9_]+)(?:\s*=\s*(.+))?$/);
      if (arrayDeclMatch) {
        const elemType = arrayDeclMatch[1];
        const dims = arrayDeclMatch[2];
        const varName = arrayDeclMatch[3];
        const rhs = arrayDeclMatch[4] ? arrayDeclMatch[4].trim() : null;
        const fullType = elemType + dims;
        varTypes[varName] = fullType;

        let arrVal = null;
        if (rhs) {
          const is2D = dims === '[][]';
          if (rhs.startsWith('{') || /^new\s+[a-zA-Z0-9_]+(?:\[\s*\])+\s*\{/.test(rhs)) {
            const literal = rhs.replace(/^new\s+[a-zA-Z0-9_]+(?:\[\s*\])+\s*/, '');
            arrVal = parseArrayLiteral(literal, elemType, is2D ? 2 : 1);
          } else if (is2D) {
            const new2dMatch = rhs.match(/^new\s+[a-zA-Z0-9_]+\[([^\]]+)\]\[([^\]]*)\]$/);
            if (new2dMatch) {
              const rows = Number(evaluateExprString(new2dMatch[1]));
              const colsExpr = new2dMatch[2].trim();
              if (colsExpr) {
                const cols = Number(evaluateExprString(colsExpr));
                const defaultVal = getDefaultValue(elemType);
                arrVal = Array.from({ length: rows }, () => Array.from({ length: cols }, () => (typeof defaultVal === 'object' ? null : defaultVal)));
              } else {
                arrVal = Array.from({ length: rows }, () => null);
              }
            } else {
              arrVal = evaluateExprString(rhs);
            }
          } else {
            // 1D
            const new1dMatch = rhs.match(/^new\s+[a-zA-Z0-9_]+\[([^\]]+)\]$/);
            if (new1dMatch) {
              const size = Number(evaluateExprString(new1dMatch[1]));
              const defaultVal = getDefaultValue(elemType);
              arrVal = Array.from({ length: size }, () => (typeof defaultVal === 'object' ? null : defaultVal));
            } else {
              arrVal = evaluateExprString(rhs);
            }
          }
        }

        scope[varName] = arrVal;
        if (!silent) {
          const is2D = dims === '[][]';
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Array',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: rhs
              ? `Es crea l'array ${is2D ? 'bidimensional ' : ''}<code class="w">${varName}</code> amb valor <strong>${formatValue(arrVal, fullType)}</strong>.`
              : `Es declara l'array <code class="w">${varName}</code> de tipus <code>${fullType}</code> (inicialitzat a <strong>null</strong>).`
          });
        }
        return;
      }

      // H. Regular variable declaration / assignment
      const assignMatch = s.match(/^(?:(byte|short|int|long|float|double|boolean|char|String)\s+)?([a-zA-Z0-9_]+)(?:\s*(=|\+=|-=|\*=|\/=)\s*(.+))?$/);
      if (assignMatch && (assignMatch[1] || assignMatch[3])) {
        const declaredType = assignMatch[1];
        const varName = assignMatch[2];
        const op = assignMatch[3];
        const rhsExpr = assignMatch[4];

        if (['return', 'break', 'continue', 'yield', 'case', 'default'].includes(varName)) return;

        if (declaredType) {
          varTypes[varName] = declaredType;
        }
        const currentType = varTypes[varName] || declaredType;

        if (!op) {
          // Declaration without initializer: e.g. int a;
          const defVal = getDefaultValue(declaredType);
          scope[varName] = defVal;
          if (!silent) {
            pushStep({
              lineRaw: String(lineNum),
              part: 'body',
              partName: 'Instrucció',
              hl: s,
              onlyHl: true,
              memRaw: getMemSnapshot(),
              explanation: `Es declara la variable <code class="w">${varName}</code> de tipus <code>${declaredType}</code> (valor per defecte: <strong>${formatValue(defVal, declaredType)}</strong>).`
            });
          }
          return;
        }

        // Has assignment operator (=, +=, -=, *=, /=)
        readInputsThisStep = [];
        const rawVal = evaluateExprString(rhsExpr);
        const val = currentType ? coerceType(rawVal, currentType) : rawVal;

        if (op === '=') scope[varName] = val;
        else if (op === '+=') {
          if (currentType === 'String' || typeof scope[varName] === 'string') {
            scope[varName] = String(scope[varName]) + String(val);
          } else {
            scope[varName] = (scope[varName] || 0) + val;
          }
        }
        else if (op === '-=') scope[varName] = (scope[varName] || 0) - val;
        else if (op === '*=') scope[varName] = (scope[varName] || 0) * val;
        else if (op === '/=') scope[varName] = (scope[varName] || 0) / val;

        if (!silent) {
          const inVal = readInputsThisStep.length > 0 ? readInputsThisStep.join('\n') : undefined;
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: inVal !== undefined ? 'Entrada' : 'Instrucció',
            hl: s,
            onlyHl: true,
            in: inVal,
            memRaw: getMemSnapshot(),
            explanation: inVal !== undefined
            ? (rhsExpr.includes('IO.readln')
                ? `Es llegeix <code class="w">${formatValue(val, currentType)}</code> de l'entrada (IO.readln) i s'assigna a <code class="w">${varName}</code>.`
                : `Es llegeix <code class="w">${formatValue(val, currentType)}</code> de l'entrada (Scanner) i s'assigna a <code class="w">${varName}</code>.`)
            : `S'assigna el valor <strong>${formatValue(val, currentType)}</strong> a <code class="w">${varName}</code>.`
          });
        }
        return;
      }

      // I. Regular increment / decrement
      const incMatch = s.match(/^([a-zA-Z0-9_]+)(\+\+|--)$/) || s.match(/^(\+\+|--)([a-zA-Z0-9_]+)$/);
      if (incMatch) {
        const varName = incMatch[1] || incMatch[2];
        const op = s.includes('++') ? 1 : -1;
        const currentType = varTypes[varName];
        if (currentType === 'char' && typeof scope[varName] === 'string') {
          scope[varName] = String.fromCharCode(scope[varName].charCodeAt(0) + op);
        } else {
          scope[varName] = (scope[varName] || 0) + op;
        }

        if (!silent) {
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Modificació',
            hl: s,
            onlyHl: true,
            memRaw: getMemSnapshot(),
            explanation: `Es modifica la variable <code class="w">${varName}</code> (${s}). Ara val <strong>${formatValue(scope[varName], currentType)}</strong>.`
          });
        }
        return;
      }

      // J. Standalone IO.readln or scanner call
      if (s.includes('IO.readln') || s.includes('scanner.') || s.includes('sc.')) {
        readInputsThisStep = [];
        readPromptsThisStep = [];
        evaluateExprString(s);
        if (!silent) {
          const inVal = readInputsThisStep.length > 0 ? readInputsThisStep.join('\n') : undefined;
          const outVal = readPromptsThisStep.length > 0 ? readPromptsThisStep.join('') : undefined;
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: inVal !== undefined ? 'Entrada' : 'Instrucció',
            hl: s,
            onlyHl: true,
            in: inVal,
            out: outVal,
            memRaw: getMemSnapshot(),
            explanation: inVal !== undefined
              ? (s.includes('IO.readln')
                  ? `Es llegeix <code class="w">${formatValue(inVal, 'String')}</code> de l'entrada (IO.readln).`
                  : `Es llegeix <code class="w">${formatValue(inVal)}</code> de l'entrada (Scanner).`)
              : `S'executa <code class="w">${s}</code>.`
          });
        }
        return;
      }

      // Fallback
      if (!silent) {
        pushStep({
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
          explanation: explanationHtml,
          isManual: true
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
          explanation,
          isManual: true
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

  function buildTimeline(stepsData, initialInputs = []) {
    const timeline = [];
    let currentMemMap = new Map();
    let currentOutHtml = '';
    let cumulativeConsumedCount = 0;
    const extraConsumedInputs = [];

    // Precompute state snapshots at each boundary:
    // stateSnapshots[0] = initial state before any statement has executed
    // stateSnapshots[k+1] = state after statement k has executed
    const stateSnapshots = [];

    let initialInHtml = '';
    if (initialInputs.length > 0) {
      initialInHtml = initialInputs.map(lineText => {
        return `<div class="in-line">${escapeHtml(lineText) || '&nbsp;'}</div>`;
      }).join('');
    }

    stateSnapshots.push({
      memEntries: [],
      customMemHtml: null,
      customShellHtml: null,
      inHtml: initialInHtml.trimEnd(),
      outHtml: '',
      shellHtml: ''
    });

    stepsData.forEach((rawStep) => {
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

      // 2. Compute Console Updates (Out)
      let nextOutHtml = currentOutHtml;

      if (rawStep.customOutHtml) {
        nextOutHtml = rawStep.customOutHtml;
      } else if (rawStep.customShellHtml) {
        nextOutHtml = rawStep.customShellHtml;
      } else if (rawStep.shellRaw) {
        nextOutHtml = escapeHtml(rawStep.shellRaw);
      } else if (rawStep.out !== undefined && rawStep.out !== null && rawStep.out !== '') {
        let outStr = String(rawStep.out);
        if (rawStep.isManual && !outStr.endsWith('\n')) {
          outStr += '\n';
        }
        nextOutHtml += `<span class="out">${escapeHtml(outStr)}</span>`;
      }
      currentOutHtml = nextOutHtml;

      // 3. Compute Consola (Entrada) Updates
      let stepConsumed = rawStep.consumedCount;
      if (stepConsumed === undefined) {
        if (rawStep.in !== undefined && rawStep.in !== null && rawStep.in !== '') {
          cumulativeConsumedCount++;
        }
        stepConsumed = cumulativeConsumedCount;
      }

      if (rawStep.in !== undefined && rawStep.in !== null && rawStep.in !== '') {
        const inLines = String(rawStep.in).split('\n');
        inLines.forEach(inLine => {
          if (stepConsumed > initialInputs.length + extraConsumedInputs.length) {
            extraConsumedInputs.push(inLine);
          }
        });
      }

      let inHtml = '';
      if (rawStep.customInHtml) {
        inHtml = rawStep.customInHtml;
      } else {
        const allInLines = [...initialInputs, ...extraConsumedInputs];
        if (allInLines.length > 0) {
          inHtml = allInLines.map((lineText, idx) => {
            const isConsumed = idx < stepConsumed;
            if (isConsumed) {
              return `<div class="in-line consumed" style="text-decoration: line-through red 0.2rem;">${escapeHtml(lineText) || '&nbsp;'}</div>`;
            } else {
              return `<div class="in-line">${escapeHtml(lineText) || '&nbsp;'}</div>`;
            }
          }).join('');
        }
      }

      stateSnapshots.push({
        memEntries,
        customMemHtml: rawStep.customMemHtml,
        customShellHtml: rawStep.customShellHtml,
        inHtml: inHtml.trimEnd(),
        outHtml: currentOutHtml.trimEnd(),
        shellHtml: currentOutHtml.trimEnd()
      });
    });

    // Build timeline items:
    // Each step i shows the code/explanation of stepsData[i] (about to execute)
    // with the machine state BEFORE it executes (stateSnapshots[i]).
    stepsData.forEach((rawStep, index) => {
      const lines = parseLineNumbers(rawStep.lineRaw);
      const snapshot = stateSnapshots[index];

      timeline.push({
        index,
        lines,
        hl: rawStep.hl,
        part: rawStep.part,
        partName: rawStep.partName,
        explanation: rawStep.explanation,
        memEntries: snapshot.memEntries,
        customMemHtml: snapshot.customMemHtml,
        inHtml: snapshot.inHtml,
        outHtml: snapshot.outHtml,
        shellHtml: snapshot.shellHtml
      });
    });

    // Final state (after the last statement has executed)
    const lastStep = stepsData[stepsData.length - 1];
    if (lastStep && (lastStep.lineRaw || lastStep.hl)) {
      const finalSnapshot = stateSnapshots[stateSnapshots.length - 1];
      timeline.push({
        index: timeline.length,
        lines: [],
        hl: null,
        part: 'end',
        partName: 'Fi',
        explanation: 'El programa ha finalitzat la seva execució.',
        memEntries: finalSnapshot.memEntries,
        customMemHtml: finalSnapshot.customMemHtml,
        inHtml: finalSnapshot.inHtml,
        outHtml: finalSnapshot.outHtml,
        shellHtml: finalSnapshot.shellHtml
      });
    }

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
  global.buildTimeline = buildTimeline;
  global.parseInputAttribute = parseInputAttribute;

})(typeof window !== 'undefined' ? window : global);

