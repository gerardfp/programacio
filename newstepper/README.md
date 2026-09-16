# Proposta d'Arquitectura: Stepper 2.0
# Stepper 2.0: Guia de Referència i Proves

Aquest directori (`newstepper/`) és un espai de laboratori per desenvolupar i provar una nova manera de definir els **steppers interactius** de codi a la plataforma d'apunts.
Aquest directori (`newstepper/`) conté la nova generació del motor de **steppers interactius** per a l'assignatura de programació Java.

---

## 1. El Problema Actual (Stepper v1)
## 1. Novetats Principals de Stepper 2.0

Fins ara, per fer un stepper de 15 passos d'un programa de 10 línies de Java:
1. **Duplicació massiva del codi**: S'havia de copiar el bloc sencer de Java a cadascun dels 15 passos (`<div class="step">`).
2. **Ressaltat manual difícil de mantenir**: Calia moure manualment l'etiqueta `<span class="h">` a la línia corresponent a cada pas. Si corregies una errada o canviaves el nom d'una variable al codi, havies de canviar-ho 15 vegades.
3. **Manca d'estat a la memòria**: Cada pas havia de reescriure la llista completa de variables de memòria existents, en comptes de només reflectir el canvi.
4. **Consola manual**: Calia copiar a mà tot el text acumulat anterior a la consola a cada pas.
5. **Variables d'alçada CSS manuals**: Calia calcular `--sc-h`, `--mm-h`, `--sh-h`, `--ex-h` per evitar salts verticals estranys.
6. **Volum de fitxer**: Un stepper típic ocupava entre 300 i 600 línies d'HTML repetitiu.
### A. Repetició Real de Bucles (`while`, `for`, `do-while`)
- **No més traces que van només de dalt a baix**: Quan el codi arriba al final del cos del bucle, la traça **torna a pujar automàticament a avaluar la condició** en cada iteració.
- Recrea exactament com la màquina virtual avalua la condició (`true`/`false`), repeteix el cos, actualitza la memòria i finalitza quan la condició esdevé falsa.

---
### B. Desglossament Explícit de les 4 Fases del Bucle `for`
En un bucle `for (inicialització; condició; modificació)`:
1. <span class="stepper-phase-badge part-init">Inicialització</span>: Ressalta únicament la declaració/inicialització (ex: `int i = 0`) i actualitza la memòria. S'executa una sola vegada.
2. <span class="stepper-phase-badge part-cond">Condició</span>: Ressalta la comparació (ex: `i < n`), avalua el resultat booleà i explica si s'entra al bucle o s'ix.
3. <span class="stepper-phase-badge part-body">Cos del bucle</span>: Ressalta les instruccions interiors executades.
4. <span class="stepper-phase-badge part-update">Modificació</span>: Després de cada iteració, ressalta l'increment/decrement (ex: `i++`) i actualitza la memòria.
5. Torna a la fase de **Condició** fins que siga falsa.

## 2. La Solució: Stepper 2.0
### C. Mode Auto-Simulació (Sense escriure passos a mà!)
Pots escriure **únicament el codi Java** i el motor simula el programa complet, generant totes les iteracions, estats de memòria, sortides de consola i explicacions pedagògiques:

Amb **Stepper 2.0**, el codi Java es defineix **UNA SOLA VEGADA** i cada pas és una declaració compacta i expressiva.
```html
<div class="stepper-v2" java auto title="Bucle For Automàtic">
  <code class="source">
int n = 4;
for (int i = 0; i < n; i++) {
    print(i + " ");
}
  </code>
</div>
```

### 🌟 Sintaxi 1: Declarativa HTML (Recomanada)

També admet entrades de teclat (`Scanner`) amb l'atribut `in`:
```html
<div class="stepper-v2" java title="Execució Switch (opcio = 2)">
  <!-- 1. El codi font es defineix un sol cop -->
<div class="stepper-v2" java auto in="2, 5" title="Scanner i Bucle">
  <code class="source">
int opcio = 2;

switch (opcio) {
    case 1:
        println("Nou joc");
        break;
    case 2:
        println("Carregar partida");
        break;
    case 3:
        println("Configuració");
        break;
    default:
        println("Opció no vàlida");
        break;
int ini = scanner.nextInt();
int fin = scanner.nextInt();
int sum = 0;
for (int i = ini; i <= fin; i++) {
    sum += i;
}
println("Fi del menú");
println(sum);
  </code>

  <!-- 2. Traça d'execució pas a pas -->
  <step line="1" mem="opcio: 2">El programa declara la variable opcio amb valor 2.</step>
  <step line="3">S'avalua la sentència switch (opcio).</step>
  <step line="4">Avalua case 1: no coincideix (1 != 2).</step>
  <step line="7">Coincideix amb case 2!</step>
  <step line="8" out="Carregar partida">S'executa el println, mostrant el text per pantalla.</step>
  <step line="9">La sentència break atura el switch i salta fora.</step>
  <step line="17" out="Fi del menú">Imprimeix la línia final fora del bloc.</step>
</div>
```

#### Atributs disponibles per a cada `<step>`:
- **`line="X"`**: Número de línia a ressaltar (ex: `line="4"`, rangs `line="5-8"` o múltiples `line="3, 5"`).
- **`hl="text"`**: Subexpressió o fragment a ressaltar dins la línia (ex: `line="5" hl="int i = 0"` o `hl="i < n"`).
- **`mem="clau: valor, ..."`**: Modificacions a la memòria.
  - La memòria és **persistent i acumulativa**: les variables anteriors continuen actives sense haver-les de reescriure.
  - El sistema detecta automàticament quines variables s'han modificat o creat en aquest pas i les ressalta amb un fons verd i pols visual (`.changed`).
- **`out="text"`**: Afegeix una línia de sortida a la consola.
- **`in="text"`**: Simula una entrada de teclat per l'usuari (es mostra amb estil blau destacat `<span class="in">`).
- **Contingut del `<step>`**: És l'explicació. Pot contenir text simple o etiquetes HTML riques (`<code>`, `<strong>`, etc.).

---

### ⚡ Sintaxi 2: Format Compacte (DSL de Traça)
## 2. Mode Declaratiu amb Fases del `for`

Per a bucles molt llargs amb moltes iteracions on escriure etiquetes HTML siga lent:
Si prefereixes escriure explicacions personalitzades per a cada pas, pots utilitzar l'atribut `part`:

```html
<div class="stepper-v2" java title="Traça Factorial">
<div class="stepper-v2" java title="Bucle For Personalitzat">
  <code class="source">
int n = 3;
int fact = 1;
while (n > 0) {
    fact *= n;
    n--;
for (int i = 0; i < n; i++) {
    print(i + " ");
}
println("Fact: " + fact);
  </code>

  <div class="trace">
    1 | mem: n: 3 | Inicialitza n = 3
    2 | mem: fact: 1 | Inicialitza fact = 1
    3 [n > 0] | Condició 3 > 0 és cert
    4 | mem: fact: 3 | fact = 1 * 3 = 3
    5 | mem: n: 2 | n decreix a 2
    3 [n > 0] | Condició 2 > 0 és cert
    4 | mem: fact: 6 | fact = 3 * 2 = 6
    5 | mem: n: 1 | n decreix a 1
    3 [n > 0] | Condició 0 > 0 és fals. Surt del while.
    7 | out: Fact: 6 | Mostra el resultat
  </div>
  <step line="1" mem="n: 3">Inicialització de n a 3.</step>
  <step line="2" part="init" mem="i: 0">La primera vegada s'executa la inicialització.</step>
  <step line="2" part="cond">S'avalua la condició (0 &lt; 3: cert).</step>
  <step line="3" out="0 ">Executa el cos del bucle.</step>
  <step line="2" part="update" mem="i: 1">Es fa la modificació (i++).</step>
  <step line="2" part="cond">Es torna a avaluar la condició (1 &lt; 3: cert).</step>
  <step line="3" out="1 ">Executa el cos del bucle.</step>
</div>
```

---
Valors per a `part`:
- `part="init"` o `part="inicialitzacio"` -> Mostra la xapa blava `[Inicialització]` i ressalta la primera part del `for`.
- `part="cond"` o `part="condicio"` -> Mostra la xapa groga `[Condició]` i ressalta la condició.
- `part="body"` o `part="cos"` -> Mostra la xapa verda `[Cos del bucle]`.
- `part="update"` o `part="modificacio"` -> Mostra la xapa lila `[Modificació]` i ressalta l'increment.

## 3. Fitxers del Laboratori

- **`index.html`**: Pàgina completa de proves amb tres demostracions interactives funcionant i un **Playground en viu** per editar codi i provar steppers en temps real.
- **`stepper.js`**: Motor JavaScript modular amb suport per a ressaltat Prism, màquina d'estats acumulativa, controls de reproducció automàtica i navegació per teclat (Fletxes Esquerra/Dreta).
- **`stepper.css`**: Disseny adaptable (Grid en pantalles amples, columna en mòbils), amb números de línia, efectes de pols a la memòria i consola retro.

---

## 4. Prova-ho en el teu navegador
## 3. Com Provar-ho

Obre al navegador el fitxer [**`newstepper/index.html`**](file:///home/gerard/programacio/newstepper/index.html) per interactuar amb els steppers de prova i utilitzar l'editor en viu.

Obre [**`newstepper/index.html`**](file:///home/gerard/programacio/newstepper/index.html) al teu navegador. Disposes de:
1. **Demos interactives** de `while` amb repetició real, `for` amb les 4 fases, i bucle amb `Scanner`.
2. **Editor interactiu en viu** amb botons per carregar plantilles (`for`, `while`, `scanner`, `switch`) i provar el funcionament en temps real.
