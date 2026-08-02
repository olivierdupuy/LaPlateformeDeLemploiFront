// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * Analyse statique.
 *
 * Le dépôt n'en avait aucune : le workflow enchaînait `npm install`,
 * `npm run build`, déploiement. Un `console.log` oublié, un `any` posé
 * en passant, un abonnement jamais fermé passaient en production sans
 * que rien ne les signale.
 *
 * Les règles ci-dessous sont volontairement peu nombreuses. Une
 * configuration qui produit huit cents avertissements le premier jour
 * n'est pas lue : elle est désactivée. Ce qui est en `error` doit
 * casser le build et le mérite ; le reste est en `warn` et se résorbe
 * au fil des passages.
 */
module.exports = tseslint.config(
  {
    // Ce qu'on n'analyse pas : ce qu'on n'écrit pas.
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'public/sw.js'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Les conventions du projet : préfixe « app », sélecteurs en
      // tiret pour les composants, en casse chameau pour les
      // directives.
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // `any` fait taire le compilateur sans régler quoi que ce soit.
      // En avertissement : le code existant en contient, et casser le
      // build sur du code qui marche ne convainc personne.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Une variable inutilisée est presque toujours le reste d'une
      // modification inachevée. Le préfixe « _ » sert à dire « je sais ».
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // `console.log` en production livre au visiteur ce qu'on se
      // disait entre nous. `warn` et `error` restent : ils servent au
      // gestionnaire d'erreurs.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Une promesse ignorée est une erreur qui n'arrivera nulle part.
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // Une image sans alternative est inutilisable au lecteur
      // d'écran, et c'est aussi vite écrit que corrigé : celle-ci
      // casse le build.
      '@angular-eslint/template/alt-text': 'error',

      // ── Accessibilité : en erreur, désormais ──
      //
      // L'audit initial en relevait 120 (98 étiquettes sans champ
      // associé, 22 éléments cliquables non focalisables). Les passer
      // en `error` d'emblée aurait rendu le dépôt inconstructible, et
      // une règle qui empêche de travailler finit désactivée — on
      // aurait perdu l'analyse au lieu de gagner l'accessibilité.
      //
      // Le plafond d'avertissements du workflow a tenu lieu de cliquet
      // le temps de les résorber : 333 → 250 → 223 → 187. Ces règles
      // sont à zéro, et le seul moyen de tenir un zéro est d'interdire
      // le premier retour en arrière. Elles cassent donc le build.
      //
      // Ce qui reste sous le plafond n'est plus que du `no-explicit-any`.
      '@angular-eslint/template/label-has-associated-control': 'error',
      '@angular-eslint/template/interactive-supports-focus': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'error',
      '@angular-eslint/template/elements-content': 'error',

      // `autofocus` déplace le curseur sans prévenir : le lecteur
      // d'écran annonce le champ avant d'avoir lu la page.
      '@angular-eslint/template/no-autofocus': 'error',

      // ── Comparaison souple ──
      //
      // `x != null` est l'idiome qui teste « ni null ni undefined » en
      // une fois. Le remplacer par `!==` changerait le sens : une
      // valeur `undefined` passerait le test. La règle reste active
      // pour tout le reste, et c'est bien elle qui compte.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
);
