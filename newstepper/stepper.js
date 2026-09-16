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
    const lang = root.getAttribute('lang') || root.getAttribute('java') !== null ? 'java' : 'plaintext';
    const lang = root.getAttribute('lang') || (root.getAttribute('java') !== null ? 'java' : 'plaintext');
    const normalizedLines = normalizeCodeLines(rawCode);

    // 2. Extract step definitions
    const stepsData = parseSteps(root);
    // 2. Extract step definitions or Auto-Simulate Java code
    let stepsData = parseSteps(root, normalizedLines);
    const forceAuto = root.hasAttribute('auto') || root.getAttribute('mode') === 'auto';
    
    if (stepsData.length === 0 || forceAuto) {
      // Auto-simulate Java execution!
      const inputs = (root.getAttribute('in') || '').split(/[,;]+/).map(s => s.trim()).filter(Boolean);
      stepsData = simulateJava(rawCode, inputs);
    }

    if (stepsData.length === 0) {
      console.warn('Stepper 2.0: No steps defined in stepper', root);
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
        const codeCell = row.querySelector('.code-line-content');
        if (codeCell && codeCell.dataset.originalHtml) {
          codeCell.innerHTML = codeCell.dataset.originalHtml;
        }
      });

      if (state.lines && state.lines.length > 0) {
        state.lines.forEach(lineNum => {
          const targetRow = tbody.querySelector(`.code-line-row[data-line="${lineNum}"]`);
          if (targetRow) {
            targetRow.classList.add('active');
            
            // Sub-token highlight within this line
            if (state.hl) {
              const codeCell = targetRow.querySelector('.code-line-content');
              highlightTokenInCell(codeCell, state.hl);
            }
          }
        });
      }

      // 2. Update Explanation
      explanationBox.innerHTML = state.explanation || '';
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
      } else if (state.memEntries.length > 0) {
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

  function normalizeCodeLines(code) {
    const rawLines = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    
    // Trim leading/trailing blank lines
    while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
    while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();
  function simulateJava(rawCode, inputs = []) {
    const inputQueue = [...inputs];
    const cleanLines = normalizeCodeLines(rawCode);
    const steps = [];
    const scope = {};
    const MAX_STEPS = 150;

    if (rawLines.length === 0) return [];
    function evalExpression(expr, ctx) {
      let jsExpr = expr.trim();
      if (!jsExpr) return true;

    // Calculate common indentation
    let minIndent = Infinity;
    rawLines.forEach(line => {
      if (line.trim().length > 0) {
        const indent = line.match(/^[ \t]*/)[0].length;
        if (indent < minIndent) minIndent = indent;
      // Handle scanner input
      if (jsExpr.includes('scanner.nextInt()') || jsExpr.includes('scanner.next()')) {
        const val = inputQueue.shift() ?? 0;
        return Number(val);
      }
    });

    if (minIndent === Infinity || minIndent === 0) return rawLines;
      jsExpr = jsExpr.replace(/equals\(([^)]+)\)/g, '=== $1');

    return rawLines.map(line => {
      return line.length >= minIndent ? line.substring(minIndent) : line;
    });
      try {
        const keys = Object.keys(ctx);
        const vals = Object.values(ctx);
        const fn = new Function(...keys, `return (${jsExpr});`);
        return fn(...vals);
      } catch (e) {
        return undefined;
      }
    }

    function getMemDiff(newScope) {
      const diff = [];
      for (const [k, v] of Object.entries(newScope)) {
        diff.push(`${k}: ${v}`);
      }
      return diff.join(', ');
    }

    function executeStatementSilent(stmt) {
      let s = stmt.replace(/;$/, '').trim();
      const assignMatch = s.match(/^(?:int|double|String|boolean|float|long)?\s*([a-zA-Z0-9_]+)\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const op = assignMatch[2];
        const expr = assignMatch[3];
        const val = evalExpression(expr, scope);
        if (op === '=') scope[varName] = val;
        else if (op === '+=') scope[varName] += val;
        else if (op === '-=') scope[varName] -= val;
        else if (op === '*=') scope[varName] *= val;
        else if (op === '/=') scope[varName] /= val;
        return;
      }
      const incMatch = s.match(/^([a-zA-Z0-9_]+)(\+\+|--)$/) || s.match(/^(\+\+|--)([a-zA-Z0-9_]+)$/);
      if (incMatch) {
        const varName = incMatch[1] || incMatch[2];
        const op = s.includes('++') ? 1 : -1;
        scope[varName] = (scope[varName] || 0) + op;
      }
    }

    function executeStatement(stmt, lineNum) {
      let s = stmt.replace(/;$/, '').trim();

      // print / println
      const printMatch = s.match(/^(?:System\.out\.)?(println|print)\s*\((.*)\)$/);
      if (printMatch) {
        const arg = printMatch[2].trim();
        const val = arg ? evalExpression(arg, scope) : '';
        steps.push({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Cos del bucle',
          hl: '',
          out: String(val),
          memRaw: getMemDiff(scope),
          explanation: `S'executa <code class="w">${escapeHtml(stmt)}</code>, mostrant <code class="w">${escapeHtml(String(val))}</code> per consola.`
        });
        return;
      }

      // scanner input
      const scanMatch = s.match(/^(?:int|double|String|float|long)?\s*([a-zA-Z0-9_]+)\s*=\s*scanner\.(nextInt|nextDouble|next|nextLine)\(\)$/);
      if (scanMatch) {
        const varName = scanMatch[1];
        const inVal = inputQueue.shift() ?? 0;
        const numVal = isNaN(Number(inVal)) ? inVal : Number(inVal);
        scope[varName] = numVal;
        steps.push({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Entrada',
          hl: '',
          in: String(inVal),
          memRaw: getMemDiff(scope),
          explanation: `Es llegeix el valor <span class="in">${escapeHtml(String(inVal))}</span> per teclat i s'assigna a <code class="w">${varName}</code>.`
        });
        return;
      }

      // variable declaration / assignment
      const assignMatch = s.match(/^(?:int|double|String|boolean|float|long)?\s*([a-zA-Z0-9_]+)\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const op = assignMatch[2];
        const expr = assignMatch[3];
        const val = evalExpression(expr, scope);

        if (op === '=') scope[varName] = val;
        else if (op === '+=') scope[varName] += val;
        else if (op === '-=') scope[varName] -= val;
        else if (op === '*=') scope[varName] *= val;
        else if (op === '/=') scope[varName] /= val;

        steps.push({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Instrucció',
          hl: '',
          memRaw: getMemDiff(scope),
          explanation: `S'assigna el valor <strong>${val}</strong> a la variable <code class="w">${varName}</code>.`
        });
        return;
      }

      // increment / decrement
      const incMatch = s.match(/^([a-zA-Z0-9_]+)(\+\+|--)$/) || s.match(/^(\+\+|--)([a-zA-Z0-9_]+)$/);
      if (incMatch) {
        const varName = incMatch[1] || incMatch[2];
        const op = s.includes('++') ? 1 : -1;
        scope[varName] = (scope[varName] || 0) + op;
        steps.push({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Modificació',
          hl: '',
          memRaw: getMemDiff(scope),
          explanation: `Es modifica la variable <code class="w">${varName}</code> (${s}). Ara val <strong>${scope[varName]}</strong>.`
        });
        return;
      }

      // fallback
      steps.push({
        lineRaw: String(lineNum),
        part: 'body',
        partName: 'Instrucció',
        hl: '',
        memRaw: getMemDiff(scope),
        explanation: `S'executa la instrucció <code class="w">${escapeHtml(stmt)}</code>.`
      });
    }

    function executeBlock(startIdx, endIdx) {
      let i = startIdx;
      while (i <= endIdx && steps.length < MAX_STEPS) {
        const lineNum = i + 1;
        const rawText = cleanLines[i].trim();

        if (!rawText || rawText.startsWith('//') || rawText === '}' || rawText === '{') {
          i++;
          continue;
        }

        // 1. FOR LOOP
        const forMatch = rawText.match(/^for\s*\(\s*([^;]*);\s*([^;]*);\s*([^)]*)\)\s*\{?$/);
        if (forMatch) {
          const forLine = lineNum;
          const initPart = forMatch[1].trim();
          const condPart = forMatch[2].trim();
          const updatePart = forMatch[3].trim();

          let blockStart = i + 1;
          let blockEnd = i + 1;
          let depth = 1;
          if (rawText.endsWith('{')) {
            let j = i + 1;
            while (j < cleanLines.length) {
              if (cleanLines[j].includes('{')) depth++;
              if (cleanLines[j].includes('}')) {
                depth--;
                if (depth === 0) {
                  blockEnd = j - 1;
                  break;
                }
              }
              j++;
            }
            i = j + 1;
          } else {
            blockEnd = blockStart;
            i = blockStart + 1;
          }

          // PHASE 1: INIT
          if (initPart) {
            executeStatementSilent(initPart);
            steps.push({
              lineRaw: String(forLine),
              part: 'init',
              partName: 'Inicialització',
              hl: initPart,
              memRaw: getMemDiff(scope),
              explanation: `La primera vegada s'executa la <strong>inicialització</strong> (<code class="w">${escapeHtml(initPart)}</code>).`
            });
          }

          // LOOP ITERATIONS
          let iteration = 0;
          while (steps.length < MAX_STEPS) {
            iteration++;
            // PHASE 2: CONDITION
            const condVal = condPart ? Boolean(evalExpression(condPart, scope)) : true;
            if (condVal) {
              steps.push({
                lineRaw: String(forLine),
                part: 'cond',
                partName: 'Condició',
                hl: condPart,
                memRaw: getMemDiff(scope),
                explanation: iteration === 1
                  ? `S'avalua la <strong>condició</strong> <code class="w">${escapeHtml(condPart)}</code>: és <strong>cert</strong> (<code>true</code>), es fa una iteració.`
                  : `Es torna a avaluar la <strong>condició</strong> per veure si cal fer una altra iteració (<code class="w">${escapeHtml(condPart)}</code>: és cert).`
              });

              // PHASE 3: BODY
              executeBlock(blockStart, blockEnd);

              // PHASE 4: UPDATE
              if (updatePart) {
                executeStatementSilent(updatePart);
                steps.push({
                  lineRaw: String(forLine),
                  part: 'update',
                  partName: 'Modificació',
                  hl: updatePart,
                  memRaw: getMemDiff(scope),
                  explanation: `Després de la iteració es fa la <strong>modificació</strong> (<code class="w">${escapeHtml(updatePart)}</code>).`
                });
              }
            } else {
              // Condition False -> exit
              steps.push({
                lineRaw: String(forLine),
                part: 'cond',
                partName: 'Condició',
                hl: condPart,
                memRaw: getMemDiff(scope),
                explanation: `Es torna a avaluar la <strong>condició</strong> (<code class="w">${escapeHtml(condPart)}</code>): és <strong>fals</strong> (<code>false</code>). Surt del bucle!`
              });
              break;
            }
          }
          continue;
        }

        // 2. WHILE LOOP
        const whileMatch = rawText.match(/^while\s*\(([^)]+)\)\s*\{?$/);
        if (whileMatch) {
          const whileLine = lineNum;
          const condPart = whileMatch[1].trim();

          let blockStart = i + 1;
          let blockEnd = i + 1;
          let depth = 1;
          if (rawText.endsWith('{')) {
            let j = i + 1;
            while (j < cleanLines.length) {
              if (cleanLines[j].includes('{')) depth++;
              if (cleanLines[j].includes('}')) {
                depth--;
                if (depth === 0) {
                  blockEnd = j - 1;
                  break;
                }
              }
              j++;
            }
            i = j + 1;
          } else {
            blockEnd = blockStart;
            i = blockStart + 1;
          }

          let iteration = 0;
          while (steps.length < MAX_STEPS) {
            iteration++;
            const condVal = Boolean(evalExpression(condPart, scope));
            if (condVal) {
              steps.push({
                lineRaw: String(whileLine),
                part: 'cond',
                partName: 'Condició',
                hl: condPart,
                memRaw: getMemDiff(scope),
                explanation: iteration === 1
                  ? `S'avalua la <strong>condició</strong> <code class="w">${escapeHtml(condPart)}</code>: és <strong>cert</strong> (<code>true</code>), s'entra al bucle.`
                  : `Es torna a avaluar la <strong>condició</strong> <code class="w">${escapeHtml(condPart)}</code>: és <strong>cert</strong> (<code>true</code>), es torna a iterar.`
              });

              executeBlock(blockStart, blockEnd);
            } else {
              steps.push({
                lineRaw: String(whileLine),
                part: 'cond',
                partName: 'Condició',
                hl: condPart,
                memRaw: getMemDiff(scope),
                explanation: `Es torna a avaluar la <strong>condició</strong> <code class="w">${escapeHtml(condPart)}</code>: és <strong>fals</strong> (<code>false</code>). Surt del bucle!`
              });
              break;
            }
          }
          continue;
        }

        // 3. SWITCH STATEMENT
        const switchMatch = rawText.match(/^switch\s*\(([^)]+)\)\s*\{?$/);
        if (switchMatch) {
          const switchLine = lineNum;
          const switchExpr = switchMatch[1].trim();
          const switchVal = evalExpression(switchExpr, scope);

          steps.push({
            lineRaw: String(switchLine),
            part: 'cond',
            partName: 'Avaluació',
            hl: `switch (${switchExpr})`,
            memRaw: getMemDiff(scope),
            explanation: `S'avalua la sentència <code class="w">switch (${escapeHtml(switchExpr)})</code> amb el valor <strong>${escapeHtml(String(switchVal))}</strong>.`
          });

          let blockStart = i + 1;
          let blockEnd = i + 1;
          let depth = 1;
          let j = i + 1;
          while (j < cleanLines.length) {
            if (cleanLines[j].includes('{')) depth++;
            if (cleanLines[j].includes('}')) {
              depth--;
              if (depth === 0) {
                blockEnd = j - 1;
                break;
              }
            }
            j++;
          }
          i = j + 1;

          let k = blockStart;
          let matched = false;
          let executing = false;

          while (k <= blockEnd && steps.length < MAX_STEPS) {
            const caseLineNum = k + 1;
            const caseText = cleanLines[k].trim();

            const cMatch = caseText.match(/^case\s+([^:]+):$/);
            const defMatch = caseText.match(/^default:$/);

            if (cMatch) {
              const caseVal = evalExpression(cMatch[1], scope);
              const isMatch = caseVal === switchVal;
              if (!executing) {
                if (isMatch) {
                  matched = true;
                  executing = true;
                  steps.push({
                    lineRaw: String(caseLineNum),
                    part: 'cond',
                    partName: 'Coincidència',
                    hl: caseText,
                    memRaw: getMemDiff(scope),
                    explanation: `Coincideix amb <code class="w">${escapeHtml(caseText)}</code>! S'entra a executar aquest bloc.`
                  });
                } else {
                  steps.push({
                    lineRaw: String(caseLineNum),
                    part: 'cond',
                    partName: 'Comprovació',
                    hl: caseText,
                    memRaw: getMemDiff(scope),
                    explanation: `Es comprova <code class="w">${escapeHtml(caseText)}</code>. Com que ${caseVal} != ${switchVal}, no coincideix.`
                  });
                }
              }
              k++;
              continue;
            }

            if (defMatch && !matched && !executing) {
              executing = true;
              steps.push({
                lineRaw: String(caseLineNum),
                part: 'cond',
                partName: 'Default',
                hl: caseText,
                memRaw: getMemDiff(scope),
                explanation: `Cap cas anterior ha coincidit. S'executa la branca <code class="w">default:</code>.`
              });
              k++;
              continue;
            }

            if (executing) {
              if (caseText.startsWith('break;')) {
                steps.push({
                  lineRaw: String(caseLineNum),
                  part: 'body',
                  partName: 'Salt (break)',
                  hl: 'break;',
                  memRaw: getMemDiff(scope),
                  explanation: `La sentència <code class="w">break;</code> atura l'execució del switch i salta immediatament a la primera ordre posterior.`
                });
                break;
              }
              executeStatement(caseText, caseLineNum);
            }
            k++;
          }
          continue;
        }

        // 4. REGULAR STATEMENT
        executeStatement(rawText, lineNum);
        i++;
      }
    }

    executeBlock(0, cleanLines.length - 1);
    return steps;
  }

  function parseSteps(root) {
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
        const hlAttr = el.getAttribute('hl') || el.getAttribute('data-hl') || '';
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

    // Splits by comma or semicolon
    const tokens = memStr.split(/[,;]/);
    tokens.forEach(tok => {
      const trimmed = tok.trim();
      if (!trimmed) return;
      
      // supports "var: val" or "var = val"
      const match = trimmed.match(/^([^:=]+)[:=](.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        map.set(key, val);
      } else if (trimmed.startsWith('-')) {
        // support deleting variable: -varName
        map.set(trimmed.substring(1).trim(), null);
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

  function highlightTokenInCell(cell, tokenText) {
    if (!cell || !tokenText) return;
    const currentHtml = cell.innerHTML;
    // Highlight first occurrence of the token inside text nodes
    const escaped = escapeRegex(tokenText);
    const regex = new RegExp(`(${escaped})`, 'g');
    cell.innerHTML = currentHtml.replace(regex, '<span class="hl-token">$1</span>');
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

