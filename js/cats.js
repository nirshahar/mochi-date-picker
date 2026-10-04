// Hand-drawn SVG cats. Every function returns an SVG markup string.
window.App = window.App || {};

(function () {
  const ORANGE = "#F6A65A";
  const ORANGE_DARK = "#D9823A";
  const CREAM = "#FFE8C7";
  const PINK = "#FFB5C8";
  const INK = "#3B2A33";
  const NOSE = "#FF6B9A";
  const GREY = "#A3ACB9";
  const GREY_DARK = "#87919E";

  // Mochi: the cream-and-orange tabby who guards the No button.
  function mochi() {
    return `
<svg class="cat mochi" viewBox="0 0 200 220" data-mood="" aria-hidden="true">
  <path class="tail" d="M146 196 C 196 192, 204 136, 176 112" stroke="${ORANGE}" stroke-width="16" fill="none" stroke-linecap="round"/>
  <ellipse cx="100" cy="166" rx="58" ry="50" fill="${ORANGE}"/>
  <ellipse cx="100" cy="176" rx="33" ry="35" fill="${CREAM}"/>
  <ellipse cx="78" cy="210" rx="16" ry="9" fill="${CREAM}"/>
  <ellipse cx="122" cy="210" rx="16" ry="9" fill="${CREAM}"/>
  <g class="ear ear-l"><path d="M50 74 L56 18 L96 50 Z" fill="${ORANGE}"/><path d="M59 62 L62 31 L84 50 Z" fill="${PINK}"/></g>
  <g class="ear ear-r"><path d="M150 74 L144 18 L104 50 Z" fill="${ORANGE}"/><path d="M141 62 L138 31 L116 50 Z" fill="${PINK}"/></g>
  <ellipse cx="100" cy="90" rx="60" ry="50" fill="${ORANGE}"/>
  <path d="M100 42 v14 M85 45 l3 11 M115 45 l-3 11" stroke="${ORANGE_DARK}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="100" cy="110" rx="25" ry="16" fill="${CREAM}"/>
  <circle cx="60" cy="106" r="9" fill="${NOSE}" opacity=".35"/>
  <circle cx="140" cy="106" r="9" fill="${NOSE}" opacity=".35"/>
  <g class="eyes-open"><g class="pupils">
    <ellipse cx="78" cy="86" rx="9" ry="11" fill="${INK}"/><circle cx="81" cy="82" r="3.2" fill="#fff"/>
    <ellipse cx="122" cy="86" rx="9" ry="11" fill="${INK}"/><circle cx="125" cy="82" r="3.2" fill="#fff"/>
  </g></g>
  <g class="lids" fill="${ORANGE}">
    <rect x="66" y="72" width="24" height="13"/><rect x="110" y="72" width="24" height="13"/>
    <path d="M67 85 H89 M111 85 H133" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <g class="eyes-happy" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round">
    <path d="M68 90 Q78 76 88 90"/><path d="M112 90 Q122 76 132 90"/>
  </g>
  <path d="M94 102 H106 L100 109 Z" fill="${NOSE}"/>
  <path class="mouth" d="M100 109 Q95 117 88 112 M100 109 Q105 117 112 112" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path class="mouth-smug" d="M89 114 Q102 118 113 108" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M36 102 L68 106 M36 114 L68 111 M164 102 L132 106 M164 114 L132 111" stroke="${ORANGE_DARK}" stroke-width="2" stroke-linecap="round"/>
</svg>`;
  }

  // Biscuit: a chubby grey loaf, always asleep.
  function biscuit() {
    return `
<svg class="cat biscuit" viewBox="0 0 220 150" aria-hidden="true">
  <path d="M46 62 L58 12 L98 44 Z" fill="${GREY}"/><path d="M57 50 L62 26 L84 44 Z" fill="${PINK}"/>
  <path d="M174 62 L162 12 L122 44 Z" fill="${GREY}"/><path d="M163 50 L158 26 L136 44 Z" fill="${PINK}"/>
  <rect x="18" y="38" width="184" height="106" rx="53" fill="${GREY}"/>
  <path d="M95 44 v12 M110 42 v13 M125 44 v12" stroke="${GREY_DARK}" stroke-width="5" stroke-linecap="round"/>
  <g stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round">
    <path d="M70 84 Q80 92 90 84"/><path d="M130 84 Q140 92 150 84"/>
    <path d="M110 103 Q104 110 98 106 M110 103 Q116 110 122 106" stroke-width="2.5"/>
  </g>
  <path d="M104 96 H116 L110 103 Z" fill="${NOSE}"/>
  <circle cx="62" cy="100" r="9" fill="${NOSE}" opacity=".35"/>
  <circle cx="158" cy="100" r="9" fill="${NOSE}" opacity=".35"/>
  <path d="M34 136 Q110 152 186 132" stroke="${GREY_DARK}" stroke-width="13" fill="none" stroke-linecap="round"/>
</svg>`;
  }

  // A big toe-bean paw pointing up, tip at (45, 0). The arm runs far below so it reaches any edge.
  function paw() {
    return `
<svg class="paw" viewBox="0 0 90 220" aria-hidden="true">
  <rect x="17" y="40" width="56" height="2400" rx="28" fill="${ORANGE}"/>
  <path d="M28 120 h34 M28 160 h34 M28 200 h34 M28 240 h34" stroke="${ORANGE_DARK}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="16" cy="24" r="13" fill="${ORANGE}"/><circle cx="35" cy="12" r="13" fill="${ORANGE}"/>
  <circle cx="55" cy="12" r="13" fill="${ORANGE}"/><circle cx="74" cy="24" r="13" fill="${ORANGE}"/>
  <ellipse cx="45" cy="48" rx="38" ry="34" fill="${ORANGE}"/>
  <ellipse cx="45" cy="56" rx="16" ry="12" fill="${PINK}"/>
  <ellipse cx="18" cy="28" rx="6" ry="7" fill="${PINK}"/><ellipse cx="36" cy="17" rx="6" ry="7" fill="${PINK}"/>
  <ellipse cx="54" cy="17" rx="6" ry="7" fill="${PINK}"/><ellipse cx="72" cy="28" rx="6" ry="7" fill="${PINK}"/>
</svg>`;
  }

  function pawPrint(color) {
    return `<svg viewBox="0 0 50 50" aria-hidden="true"><g fill="${color}">
  <ellipse cx="25" cy="33" rx="12" ry="10"/><ellipse cx="10" cy="20" rx="5" ry="6.5"/><ellipse cx="20" cy="11" rx="5" ry="6.5"/>
  <ellipse cx="31" cy="11" rx="5" ry="6.5"/><ellipse cx="40" cy="20" rx="5" ry="6.5"/></g></svg>`;
  }

  function catFace(fur, eye = INK) {
    return `<svg viewBox="0 0 60 54" aria-hidden="true">
  <path d="M8 26 L10 2 L28 14 Z M52 26 L50 2 L32 14 Z" fill="${fur}"/>
  <ellipse cx="30" cy="32" rx="25" ry="20" fill="${fur}"/>
  <circle cx="21" cy="30" r="3" fill="${eye}"/><circle cx="39" cy="30" r="3" fill="${eye}"/>
  <path d="M27 37 H33 L30 40 Z" fill="${NOSE}"/></svg>`;
  }

  function heart(color) {
    return `<svg viewBox="0 0 50 46" aria-hidden="true"><path d="M25 44 C 10 32, 2 24, 2 14 A 12 12 0 0 1 25 9 A 12 12 0 0 1 48 14 C 48 24, 40 32, 25 44 Z" fill="${color}"/></svg>`;
  }

  // [fur, eye] pairs for the cat rain: ginger, grey, black, cream.
  const FUR = [[ORANGE, INK], [GREY, INK], ["#4A3B42", "#FFE08A"], ["#FFF3E2", INK]];

  App.cats = { mochi, biscuit, paw, pawPrint, catFace, heart, FUR };
})();
