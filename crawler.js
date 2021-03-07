//const { on } = require('events')
const https = require('https')
const db = require('./db')
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const pretty = require('pretty');
 


const options = {
    hostname: 'www.hackerrank.com',
    method: 'GET',
    headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36 Edg/85.0.564.63',
        'Authorization': 'Basic ' + Buffer.from(process.argv[2] + ':' + process.argv[3]).toString('base64')
     }
}

const get = async url => {
    options.path = url;
    console.log(url);
    return new Promise((resolve, reject) => {
        https.get(options, res => {
            var body = "";
            res.on('data', data => { body += data; });
            res.on('end', () => { 
                try {
                    resolve(JSON.parse(body));
                } catch(e) {
                    resolve(JSON.parse("{}"));
                }
            });
            res.on('error', () => { reject(error); });
        });
    });
}

(async () => {

	let total = 305; //(await get('/rest/administration/challenges')).total;

    console.log(total);
	const limit = 10

	var down = { ete1: 90762,
        'primeros-iguales-a-ultimos': 90779,
        'cuenta-numeros': 90780,
        'cuentas-de-numeros': 90781,
        'divisibles-por-7': 90783,
        'sucesion-de-fibonacci-3': 90784,
        'sucesiones-de-fibonacci': 90785,
        'tres-iguales-seguidos': 90786,
        'los-primos-del-pueblo': 90787,
        'suma-digitos': 90788,
        'picos-maximos': 91434,
        'picos-maximos-y-minimos': 91435,
        'tabla-de-multiplicar-1': 91436,
        'tabla-de-multiplicar-2': 91437,
        'subsecuencia-1': 91612,
        'del-1-al-5': 91617,
        'ceros-debajo-de-la-diagonal': 91619,
        banderas: 91622,
        'tablero-ajedrez': 92073,
        'del-reves': 92810,
        'el-ultimo-que-sume': 92814,
        'iguales-al-ultimo': 92816,
        'dos-secuencias-iguales': 92817,
        'suma-de-dos-secuencias': 92818,
        'sucesion-capicua': 92820,
        'estan-todos': 92821,
        'encontrando-minas': 92825,
        'buscando-minas': 92827,
        'contando-minas': 92828,
        'mezcla-de-secuencias': 93461,
        'ordenar-secuencia': 93464,
        'separar-los-pares-de-los-impares': 93466,
        'separar-los-grandes-de-los-pequenos': 93469,
        'secuencias-rotativas': 93474,
        'cuenta-vocales': 94953,
        'elimina-vocales': 94955,
        'vocales-mayusculas': 94956,
        'cuenta-palabras': 94957,
        'palindromo-3-1': 94959,
        lipograma: 94973,
        acronimo: 94974,
        'scrabble-2-1': 94975,
        'posicion-de-una-letra': 94987,
        'posicion-en-el-alfabeto': 94988,
        pangrama: 94990,
        'suma-digitos-1': 95343,
        'distancia-hamming': 95345,
        'robot-simulator': 95355,
        'dos-reinas': 95422,
        'tres-en-raya': 95423,
        'piedra-papel-tijera-1': 95428,
        randomsix: 95926,
        'graficos-de-calificaciones': 95927,
        'corrigiendo-los-deberes': 96152,
        'precision-mecanografica': 96164,
        superbowling: 96170,
        canastas: 96182,
        'bomberman-2': 96185,
        'estadisticas-del-partido': 96263,
        'fontana-di-puig': 96265,
        'numero-de-divisores': 96287,
        'operadores-perdidos': 96288,
        'numero-de-incrementos': 96289,
        'sumas-encadenadas': 96290,
        'rota-el-vector-en-el-elemento-k': 96293,
        'bowling-2': 96303,
        'el-primo-del-pueblo': 96848,
        'suma-dos-numeros': 97751,
        'notes-analytics': 98616,
        'estadisticas-teatro': 98624,
        'a-hello-world': 107234,
        'a-hello-you': 107237,
        'a-recompte': 107238,
        'c1-l1-4': 107387,
        'c1-l1-5-nota-mitjana': 107396,
        'c1-l1-6-llums-apagades': 107402,
        'c1-l1-7-temps-de-descarrega': 107408,
        'c1-l1-8-lliga-de-futbol': 107419,
        'c1-l1-9-sobren-ous': 107422,
        'c1-l1-10-comptant-els-minuts-per-cap-dany': 107426,
        'c1-l1-11-perimetre-dun-rectangle': 107431,
        'c1-l1-12-artropodes': 107439,
        'c1-l2-1-emmarcant-les-fotos': 107443,
        'c1-l2-2-prova-mecanografica': 107546,
        'c1-l2-3-rellotge-de-manilles': 107549,
        'c1-l2-4-aprovar-el-modul': 107564,
        'data-valida': 107620,
        'c1-l2-6-ticket-daparcament': 107621,
        'c1-l2-7-tir-amb-arc': 107681,
        'c1-l2-8-notacio-algebraica-als-escacs': 107691,
        'c1-l3-1-dues-reines': 107692,
        'c1-l3-2-space-invaders': 107768,
        'c1-l3-3-piramides-de-llumins': 107771,
        'c1-l3-4-hardy-ramanujan': 107785,
        'c1-l3-5-data-de-part': 107889,
        'c1-l3-6-just-a-lanella': 107896,
        'c1-l3-7-xifratge-cesar': 107897,
        'c1-l3-8-cub-de-rubik': 107906,
        'c1-l4-1-piramide-lego': 107908,
        'c1-l4-2-un-cavall-contra-2-peons': 107912,
        'c1-l4-3-cercles-rgb': 107925,
        'c1-l4-4-scrollbar': 107938,
        'c2-l4-1-les-quatre-estacions': 108094,
        'c2-l2-1-permisos-unix': 108097,
        'c2-l3-1-xarxes-privades': 108130,
        'c3-l1-1-jump-jump': 108140,
        'c3-l2-1-pics-i-valls': 108147,
        'c3-l3-1-robot-simulator': 108151,
        'c2-l1-2-lletres-scrabble': 108154,
        'compresio-rle': 108159,
        'c3-l2-7-descompressio-rle': 108161,
        'c3-l2-3-l33t': 108185,
        'c2-l1-5-tres-en-ratlla': 108208,
        'c5-l4-2-doble-join': 108241,
        'c5-l3-1-join': 108258,
        'c5-l2-2-select': 108268,
        'c5-l2-3-url-parser': 108293,
        'c2-l2-6-joc-de-pistes': 108294,
        'c2-l1-5-trendingtopic': 108324,
        'c5-l2-4-auto-indent-lines': 108338,
        'c4-l2-1-case-styles': 108349,
        'c5-l2-5-hansel-i-gretel': 108371,
        'c5-l1-5-reverse-string': 108378,
        'c5-l1-6-tres-en-ratlla': 108379,
        'c1-l2-2-secret-handshake': 108401,
        'c2-l1-7-saluda-en-diferents-llenguatges': 108441,
        'c3-l4-1-build-a-wall': 108496,
        'c5-l3-2-diccionari': 108497,
        'c5-l4-4-sopa-de-lletres': 108498,
        'c2-l1-4-operacions-aritmetiques': 108512,
        'c1-l2-3-ieee-1541': 108522,
        'c2-l1-8-cotxes-autonoms': 108525,
        'c2-l3-1-permisos-unix': 108526,
        'c2-l3-1-contenidors': 108542,
        'c3-l3-3-caixer-automatic': 108557,
        'c3-l2-5-ticket-machine': 108559,
        'c4-l4-4-ddos': 108617,
        'c4-l3-1-paritat-raid': 108620,
        diffie: 108621,
        'c5-l1-1-leds': 108978,
        'c5-l1-2': 108984,
        'c6-l1-3-lineseparator': 108985,
        'c6-l1-4-advancedlineseparator': 108986,
        'c6-l2-1-termometre': 108989,
        'c6-l2-2-equation': 108991,
        'c6-l2-3-gearbox': 108992,
        'c6-l2-4-butlleti-de-notes': 108995,
        'c6-l3-1-triangle': 108996,
        'c6-l3-2-equation2d': 109007,
        'c6-l3-3-uri-scheme': 109008,
        'c6-l3-4-clock-tick': 109009,
        'c7-l1-1-suma-els-n-primers-nombres': 109010,
        'c7-l1-2-factorial': 109011,
        'c7-l2-1-successio-de-fibonacci': 109012,
        'c7-l2-2-reverse-string': 109013,
        'c7-l3-1-palindrom': 109014,
        'c7-l3-2-evaluate-expression': 109015,
        'c7-l4-1-hanoi': 109059,
        'c4-l4-2-maze': 109062,
        'c4-l4-1-acces-log-analyzer': 109795,
        'c4-l3-1-inventari-en-ordre': 109798,
        'c4-l2-4-balanceig-de-carrega': 109808,
        'c3-l3-4-multi-armed-bandit': 109871,
        'c4-l4-2-nearest-neighbour-interpolation': 109890,
        'c4-l4-3-organitzant-el-magatzem': 109938,
        'preu-de-lentrada': 124777,
        'porter-de-discoteca': 126173,
        'street-fighter-1': 126740,
        'un-dos-tres': 126744,
        triler: 126929,
        'calcul-de-notes': 129366,
        'c2-lo-2-preu-del-ferrocarril': 129368,
        'c2-l0-3-calculadora-amb-menu': 129401,
        'c2-l0-4-la-mida-dun-cargol': 129409,
        'c3-l0-1-linia-de-punts': 129526,
        'c3-l0-2-interval': 129531,
        'c3-l0-3-repeat-x': 129534,
        'c3-l0-4-divisibles-per-3': 129535,
        'c3-l0-5-compta-vocals': 129540,
        'c3-l0-6-code-analyzer': 129544,
        'c3-l0-7-passwd': 129565,
        'c3-l0-8-show-line-numbers': 129721,
        'c4-l0-1-altura-minima': 132628,
        'c4-l0-0-mitjana-de-vendes': 132657,
        'c4-l1-2-apunts': 134834,
        'c3-l1-13-quatre-iguals-seguits': 135469,
        'c3-l3-5-maquina-de-vending': 135539,
        'suma-de-pares-y-producto-de-impares': 135626,
        paella: 135627,
        'desglose-de-cantidades-en-monedas': 135628,
        'impresora-matricial': 135629,
        'combinacion-secreta-de-la-caja-fuerte': 135630,
        'abdf3-sprite-flip': 139495,
        proves: 139567,
        'afe43-amaga-les-columnes': 140189,
        'cb3c8-el-conill-i-la-pastanaga': 140282,
        'c6a99-cromos-repetits': 141285,
        'e33c4-full-de-notes': 143018,
        'llista-despera': 144097,
        'e9bed-generador-de-corrent': 144345,
        'ec528-producte-class-l0': 144762,
        'ec7cc-song-class-l0': 144771,
        'd5d1e-creditcard-class-l0': 144777,
        'd1e2a-contact-class-l0': 145618,
        'dad4d-libro-class-l0': 145625,
        'f2eb6-players': 145626,
        'ea92e-shopping-cart-class-l0': 145649,
        'b46d0-postsstream-class-l0': 145652,
        'ae12f-notas-class-l0': 145808,
        'a2e8f-usuari-class-l0': 146964,
        'b0ae0-cotxe-class-l0': 146972,
        'a9adb-post-class-l0': 146986,
        'd3da3-paper-rock-scissors-class-l0': 146988,
        'c2c46-ahorcado-class-l0': 146993,
        'e679d-enemy-class-l0': 147462,
        'f831b-tabla-class-l0': 147470,
        'aac7e-functiongame-class-l0': 147491,
        'bf6f0-functiongame2-class-l0': 147534,
        'dbb58-bikes-class-l0': 147960,
        'e8f27-fusion-class-l0': 147969,
        'ebeac-fighters-class-l0': 147972,
        'e2ac7-rebajas-class-l0': 148614,
        'aafec-orden-en-la-cola': 150229,
        'e25bb-cubetris': 150231,
        'cb550-barrel-cannon': 150232,
        'e5b54-superposicion-de-capas': 150233,
        'hello-name-3': 181018,
        einstein: 181077,
        'de-0-a-4': 181492,
        'jota-amb-asteriscs': 181494,
        'declaracio-invalida-de-variables': 181706,
        assignacions: 181708,
        'completa-la-declaracio': 181710,
        'gatito-ascii-art': 181742,
        'tipus-correctes': 182273,
        'valors-correctes': 182275,
        'noms-correctes': 182287,
        'cada-paraula-a-una-linia': 182291,
        'contractar-un-xef': 182294,
        'arxius-de-codi-font': 182302,
        'carta-formal': 182335,
        'esquirols-i-nous': 182444,
        'stigid-sert': 182775,
        'els-petits-davant': 182776,
        'major-dedat': 182777,
        cargol: 182780,
        'contractar-un-programador': 182912,
        'pares-o-nones': 183959,
        'hora-dapertura-operadors-ternari': 183965,
        'xocolata-if': 184066,
        'arrodonir-la-nota': 184254,
        'unicode-points': 184258,
        'enquesta-frameworks': 184260,
        'notacio-vectorial': 186623,
        'maquina-parada': 186632,
        'maxima-puntuacio': 186650,
        'fizz-buzz-for': 186654,
        galib: 188744,
        'inicialitzar-array': 188781,
        'new-array': 188786,
        'true-index': 189891,
        'parentesis-1': 190525,
        'inode-flags': 190556,
        'train-bird': 190614,
        'black-friday-1-1': 191026,
        'dintre-de-termini': 191038,
        'anar-sumant': 191204,
        'anar-comptant': 191205,
        'anar-restant': 191207,
        'maxim-minim-comptador-suma-i-resta': 191211,
        mitjanes: 191215,
        divisibles: 191268,
        'definir-la-classe-comptecorrent': 196046,
        'estadistiques-al-teatre-for': 199405,
        'matrix-arrays': 199534,
        xirtam: 199535,
        'reaccio-en-cadena': 200078,
        salari: 200202,
        'tetris-eliminar-linies': 200211,
        'vendes-acumulades': 200243,
        'fireball-1': 202435,
        'passar-llista': 202451,
        inventari: 202534,
        tramesa: 202678,
        tasca: 202713,
        'informe-de-vendes': 202813,
        'auto-test': 203260,
        'el-club-de-la-lucha': 203311,
        simcity: 203415,
        outline: 203474,
        'ice-skating-1-1': 203585,
        'block-puzzle': 204428,
        tpv: 204433,
        'media-truncada': 204436,
        'en-ruta': 204466,
        'metro-circular': 204596,
        'teclado-robot': 204624,
        'book-class-4': 205458,
        'inner-box': 205460,
        'recorrer-array': 205597,
        'esta-la-palabra-si-o-no': 205606,
        'cuantas-veces-esta-la-palabra': 205678,
        'd-27': 206540,
        'gos-i-gat-class': 206705,
        'hola-persona-class': 206708 
    };
      
    // for (let i = 0; i < total/limit+1; i++){
	// 	for ( model of (await get(`/rest/administration/challenges?limit=${limit}&offset=${i*limit}`)).models) {
	// 		down[model.slug] = model.id;
    //     }
    // }

    // console.log("--------");
    // console.log(down);
    // console.log("--------");

    //down = { 'metro-circular':'204596' };
    // down = { 'a-hello-world': '107234'};

    for (slug in down){

        console.log("crawling: " + slug + " : " + down[slug]);

        const admch = await get(`/rest/administration/challenges/${down[slug]}`);

        // console.log(admch);

        let url = "";
        if (admch.model && admch.model.contest_challenge_associations && admch.model.contest_challenge_associations.length > 0){
            url = `/rest/contests/${admch.model.contest_challenge_associations[0].slug}/challenges/${down[slug]}/`;
        } else {
            url = `/rest/contests/previewdummycontest/challenges/${down[slug]}/`;
        }

        // testurl = url + /download_testcases
        const resp = await get(url);

        if (resp.model) {

            const dom = new JSDOM(resp.model.body_html);

            for(query of ['style', 'svg', '.MathJax_SVG']) {
                var element = dom.window.document.querySelectorAll(query);
                for (let index = element.length - 1; index >= 0; index--) {
                    element[index].parentNode.removeChild(element[index]);
        //         element[index].replaceWith(...element[index].childNodes);

                }    
            }

            var tests = [];

            for(query of [ '.challenge_sample_input']) {
                var elements = dom.window.document.querySelectorAll(query);
                for (let index = elements.length - 1; index >= 0; index--) {
                    var element = elements[index];

                    var num = element.querySelector("p").textContent.match(/(\d+)/)[0];
                    var pre = element.querySelector("pre").textContent.replace(/\n+$/g,'');

                    tests[num] = { testcase_input: pre};
                }    
            }

            for(query of ['.challenge_sample_output']) {
                var elements = dom.window.document.querySelectorAll(query);
                for (let index = elements.length - 1; index >= 0; index--) {
                    var element = elements[index];

                    var num = element.querySelector("p").textContent.match(/(\d+)/)[0];
                    var pre = element.querySelector("pre").textContent.replace(/(\s+)\n/g,'').replace(/\s+$/g,'');
                    // console.log("OUT " + num + " ====>>> " + pre);

                    if(!tests[num]) tests[num] = {};
                    tests[num].testcase_output = pre;

                }    
            }

            for(query of ['.challenge_explanation']) {
                var elements = dom.window.document.querySelectorAll(query);
                for (let index = elements.length - 1; index >= 0; index--) {
                    var element = elements[index];

                    var num = element.querySelector("p").textContent.match(/(\d+)/)[0];
                    var pre = element.querySelector(".hackdown-content").innerHTML.replace(/https\:\/\/s3.amazonaws.com\/hr-assets\/0\//, '/assets/');
                    // console.log("EX " + num + " ====>>> " + pre);

                    tests[num].testcase_explanation = pre;

                }    
            }

            const statement = dom.window.document.querySelector(".challenge_problem_statement_body .hackdown-content").innerHTML.replace(/https\:\/\/s3.amazonaws.com\/hr-assets\/0\//, '/assets/');
            const constraints = dom.window.document.querySelector(".challenge_constraints_body .hackdown-content").innerHTML.replace(/https\:\/\/s3.amazonaws.com\/hr-assets\/0\//, '/assets/');
            const inputformat = dom.window.document.querySelector(".challenge_input_format_body .hackdown-content").innerHTML.replace(/https\:\/\/s3.amazonaws.com\/hr-assets\/0\//, '/assets/');
            const outputformat = dom.window.document.querySelector(".challenge_output_format_body .hackdown-content").innerHTML.replace(/https\:\/\/s3.amazonaws.com\/hr-assets\/0\//, '/assets/');

            // console.log(statement + inputformat + constraints + outputformat);
            
            const id = await db.problems.insert({
                 problem_title: resp.model.name,
                 problem_slug: resp.model.slug,
                 problem_statement: statement,
                 problem_input: inputformat + constraints != "<p>-</p>" ? constraints : "",
                 problem_output: outputformat,
                 problem_template: resp.model.java8_template ? resp.model.java8_template : ""
            });

            // console.log(id);

            for (testcase of tests){
                testcase.problem_id = id.problem_id;
                testcase.testcase_input = testcase.testcase_input ? testcase.testcase_input : null,
                testcase.testcase_output = testcase.testcase_output ? testcase.testcase_output : null,
                testcase.testcase_explanation = testcase.testcase_explanation ? testcase.testcase_explanation : null;

                db.problems.insertTestcase(testcase);
            }

        } else {
            console.log("Sin respuesta de " + slug + " : " + url);
        }

    }
})();
