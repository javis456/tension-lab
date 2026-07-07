/* ============================================================
   Knowledge — string-selection principles, bilingual (EN / TH)
   ============================================================ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  /* ---------------- visual artifacts (language-independent SVG) ---------------- */
  const SVG = {
    spectrum: `<svg viewBox="0 0 720 150" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="spec" x1="0" x2="1">
        <stop offset="0" stop-color="#D8A24A"/><stop offset="0.5" stop-color="#7Fb8a6"/><stop offset="1" stop-color="#2E7DB5"/>
      </linearGradient></defs>
      <rect x="40" y="46" width="640" height="20" rx="10" fill="url(#spec)"/>
      ${[["40","Natural gut"],["150","Multifilament"],["270","Synthetic gut"],["390","Soft poly"],["510","Co-poly"],["600","Shaped poly"],["680","Kevlar"]]
        .map(([x, l]) => `<circle cx="${x}" cy="56" r="4" fill="#fff" stroke="var(--ink-soft)"/><text x="${x}" y="34" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--ink-soft)">${l}</text>`).join("")}
      <text x="40" y="92" font-family="IBM Plex Mono" font-size="11" fill="#B07A28">◄ softer</text>
      <text x="40" y="108" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-faint)">more power · comfort · feel</text>
      <text x="680" y="92" text-anchor="end" font-family="IBM Plex Mono" font-size="11" fill="#2E7DB5">firmer ►</text>
      <text x="680" y="108" text-anchor="end" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-faint)">more control · spin · durability</text>
    </svg>`,

    shape: `<svg viewBox="0 0 720 210" width="100%" xmlns="http://www.w3.org/2000/svg">
      <g><text x="180" y="24" text-anchor="middle" font-family="Space Grotesk" font-weight="600" font-size="14" fill="var(--ink)">Round</text>
        <path d="M60 150 A120 120 0 0 1 300 150" fill="none" stroke="var(--line)" stroke-width="2"/>
        <text x="180" y="176" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--ink-faint)">ball surface</text>
        <circle cx="180" cy="110" r="26" fill="#EFE9DD" stroke="var(--ink-soft)" stroke-width="2"/>
        <path d="M160 150 q20 -14 40 0" fill="none" stroke="var(--teal)" stroke-width="2" marker-end="url(#ar)"/>
        <text x="180" y="200" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-soft)">slides across the ball → smooth, less bite</text></g>
      <line x1="360" y1="30" x2="360" y2="190" stroke="var(--line)"/>
      <g><text x="540" y="24" text-anchor="middle" font-family="Space Grotesk" font-weight="600" font-size="14" fill="var(--ink)">Shaped / textured</text>
        <path d="M420 150 A120 120 0 0 1 660 150" fill="none" stroke="var(--line)" stroke-width="2"/>
        <text x="540" y="176" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="var(--ink-faint)">ball surface</text>
        <polygon points="540,82 566,97 566,127 540,142 514,127 514,97" fill="#E4F0EA" stroke="var(--teal-deep)" stroke-width="2"/>
        <path d="M540 150 l-8 -12 M540 150 l8 -12" stroke="var(--signal)" stroke-width="2"/>
        <text x="540" y="200" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-soft)">edges bite & grip → more spin, a touch harsher</text></g>
      <defs><marker id="ar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6z" fill="var(--teal)"/></marker></defs>
    </svg>`,

    gauge: `<svg viewBox="0 0 720 150" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="150" y="30" width="7" height="90" rx="3" fill="var(--teal)"/>
      <text x="153" y="140" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" fill="var(--ink-soft)">1.20 mm · thin</text>
      <text x="240" y="60" font-family="IBM Plex Sans" font-size="12" fill="var(--ink)">more spin &amp; feel, a little more power</text>
      <text x="240" y="80" font-family="IBM Plex Sans" font-size="12" fill="var(--signal)">but breaks / wears faster</text>
      <rect x="150" y="30" width="0" height="90"/>
      <rect x="500" y="30" width="16" height="90" rx="4" fill="var(--teal-deep)"/>
      <text x="508" y="140" text-anchor="middle" font-family="IBM Plex Mono" font-size="11" fill="var(--ink-soft)">1.30 mm · thick</text>
      <text x="530" y="60" font-family="IBM Plex Sans" font-size="12" fill="var(--ink)">more durable, more control</text>
      <text x="530" y="80" font-family="IBM Plex Sans" font-size="12" fill="var(--ink-faint)">less spin, feel &amp; power</text>
    </svg>`,

    tension: `<svg viewBox="0 0 720 170" width="100%" xmlns="http://www.w3.org/2000/svg">
      <polygon points="360,150 340,150 360,120 380,150" fill="var(--ink-soft)"/>
      <g transform="rotate(-8 360 120)"><rect x="120" y="114" width="480" height="10" rx="5" fill="var(--teal)"/>
        <circle cx="150" cy="119" r="20" fill="#E4F0EA" stroke="var(--teal-deep)" stroke-width="2"/>
        <circle cx="570" cy="119" r="20" fill="var(--signal-soft)" stroke="var(--signal)" stroke-width="2"/></g>
      <text x="150" y="60" text-anchor="middle" font-family="Space Grotesk" font-weight="600" font-size="13" fill="var(--teal-deep)">Looser (e.g. 45 lb)</text>
      <text x="150" y="80" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-soft)">more power &amp; comfort</text>
      <text x="570" y="90" text-anchor="middle" font-family="Space Grotesk" font-weight="600" font-size="13" fill="var(--signal)">Tighter (e.g. 60 lb)</text>
      <text x="570" y="110" text-anchor="middle" font-family="IBM Plex Sans" font-size="11" fill="var(--ink-soft)">more control</text>
    </svg>`,
  };

  /* ---------------- content (each block has en + th) ---------------- */
  const M = (tag, en, th) => ({ name: { en, th }, tag });
  const CONTENT = [
    { t: "h", en: "Why the string matters", th: "ทำไมเอ็นถึงสำคัญ" },
    { t: "p",
      en: "The string is the only part of your racket that actually touches the ball. Changing it can shift your power, control, spin and comfort more than most players expect — often more than changing rackets. This page covers the basics so you can choose with intention.",
      th: "เอ็นคือส่วนเดียวของแร็กเกตที่สัมผัสลูกบอลจริง ๆ การเปลี่ยนเอ็นจึงส่งผลต่อพลัง การควบคุม สปิน และความนุ่มมากกว่าที่หลายคนคิด — บ่อยครั้งมากกว่าการเปลี่ยนไม้เสียอีก หน้านี้จะปูพื้นฐานให้คุณเลือกเอ็นได้อย่างเข้าใจ" },

    { t: "h", en: "The material families", th: "ประเภทของเนื้อเอ็น" },
    { t: "p",
      en: "Every string sits somewhere on a spectrum from soft and lively to firm and controlled. Softer strings give power, comfort and touch; firmer strings give control, spin bite and durability. There is no 'best' — only what fits your game and your arm.",
      th: "เอ็นทุกชนิดจะอยู่บนสเปกตรัมตั้งแต่ 'นุ่มและสปริงตัวดี' ไปจนถึง 'แข็งและควบคุมแม่น' เอ็นนุ่มให้พลัง ความสบาย และฟีล ส่วนเอ็นแข็งให้การควบคุม การเกาะสปิน และความทนทาน ไม่มีเอ็นที่ 'ดีที่สุด' มีแต่เอ็นที่ 'เหมาะกับเกมและแขนของคุณ'" },
    { t: "svg", key: "spectrum",
      cap: { en: "Where the common materials sit — softer/livelier on the left, firmer/more controlled on the right.",
             th: "ตำแหน่งของวัสดุยอดนิยม — ด้านซ้ายนุ่ม/สปริงดี ด้านขวาแข็ง/ควบคุมแม่น" } },
    { t: "cards", items: [
      { m: M("gut", "Natural gut", "เอ็นแท้ (Natural gut)"),
        en: "The gold standard for comfort, power, feel and tension hold. Beautiful to play, but expensive and not very durable.",
        th: "มาตรฐานสูงสุดด้านความนุ่ม พลัง ฟีล และการคงแรงตึง เล่นดีมาก แต่ราคาแพงและไม่ค่อยทน" },
      { m: M("multi", "Multifilament", "มัลติฟิลาเมนต์"),
        en: "Hundreds of soft fibres mimic gut at lower cost — comfortable and powerful, a great arm-friendly choice. Less control and durability than poly.",
        th: "เส้นใยนุ่มหลายร้อยเส้นเลียนแบบเอ็นแท้ในราคาถูกลง — นุ่มและมีพลัง เหมาะกับคนถนอมแขน แต่คุมและความทนน้อยกว่าโพลี" },
      { m: M("syn", "Synthetic gut", "ซินเธติกกัต"),
        en: "The all-round budget default. Balanced and inexpensive, without excelling at any one thing.",
        th: "เอ็นพื้นฐานราคาประหยัด สมดุลทุกด้านและถูก แต่ไม่โดดเด่นด้านใดด้านหนึ่ง" },
      { m: M("poly", "Co-polyester (poly)", "โพลีเอสเตอร์ (โพลี)"),
        en: "The modern control string. Firm and low-powered, it lets big swingers hit hard and keep the ball in. Stiffer on the arm — restring often as it dies.",
        th: "เอ็นคอนโทรลยุคใหม่ แข็งและพลังต่ำ ช่วยให้คนสวิงแรงตีเต็มแล้วบอลยังลง แต่แข็งต่อแขน ควรเปลี่ยนบ่อยเพราะเสื่อมเร็ว" },
      { m: M("polyspin", "Shaped / spin poly", "โพลีทรงเหลี่ยม (สปิน)"),
        en: "A poly with edges (hexagonal, twisted). Same control, extra spin bite. The go-to for heavy-topspin baseliners.",
        th: "โพลีที่มีเหลี่ยม (หกเหลี่ยม/บิดเกลียว) คุมได้เท่าเดิมแต่เกาะสปินมากขึ้น เหมาะกับสายบุกท้ายคอร์ตที่ใช้ท็อปสปินหนัก" },
      { m: M("polysoft", "Soft co-poly", "โพลีนุ่ม"),
        en: "A gentler poly — most of the control with better comfort and feel. A good first poly.",
        th: "โพลีที่นุ่มขึ้น — คุมได้เกือบเท่าเดิมแต่สบายและฟีลดีกว่า เหมาะเป็นโพลีเส้นแรก" },
      { m: M("kevlar", "Kevlar / aramid", "เคฟลาร์"),
        en: "Nearly unbreakable and very stiff. Only for chronic string-breakers, usually in a hybrid — harsh on the arm.",
        th: "แทบไม่ขาดและแข็งมาก เหมาะเฉพาะคนที่เอ็นขาดบ่อย ๆ มักใช้แบบไฮบริด — กระแทกแขนหนัก" },
      { m: M("zyex", "Zyex mono", "ไซเอ็กซ์ (Zyex)"),
        en: "A durable monofilament that stays soft and holds tension well — a comfortable, long-lasting alternative to poly.",
        th: "โมโนฟิลาเมนต์ที่ทนทาน ยังคงความนุ่มและคงแรงตึงได้ดี — เป็นทางเลือกที่นุ่มและอยู่ได้นานแทนโพลี" },
    ] },

    { t: "h", en: "What the shape does", th: "รูปทรงหน้าตัดมีผลอย่างไร" },
    { t: "p",
      en: "A round string slides smoothly across the ball. A shaped or twisted string (hexagonal, pentagonal, textured) presents edges that bite into the ball and grab it — so it snaps back with more spin. The trade-off: those edges feel a little harsher and wear down (losing tension) a bit faster.",
      th: "เอ็นทรงกลมจะลื่นไถลผ่านลูกบอลอย่างนุ่มนวล ส่วนเอ็นทรงเหลี่ยมหรือบิดเกลียว (หกเหลี่ยม ห้าเหลี่ยม หรือผิวหยาบ) จะมีเหลี่ยมคมที่ 'กัด' และเกาะลูกบอล ทำให้ดีดกลับพร้อมสปินมากขึ้น ข้อแลกเปลี่ยนคือ เหลี่ยมเหล่านั้นจะรู้สึกแข็งขึ้นเล็กน้อยและสึกเร็วกว่า (แรงตึงตกไวกว่า)" },
    { t: "svg", key: "shape",
      cap: { en: "Round slides; shaped bites. More edges = more spin bite, slightly less comfort and tension life.",
             th: "ทรงกลมลื่น ทรงเหลี่ยมกัด ยิ่งมีเหลี่ยมมาก = เกาะสปินมากขึ้น แต่ความนุ่มและอายุแรงตึงลดลงเล็กน้อย" } },

    { t: "h", en: "What the gauge (thickness) does", th: "ความหนา (เกจ) มีผลอย่างไร" },
    { t: "p",
      en: "Gauge is the string's diameter in millimetres (thinner = higher gauge number). A thinner string embeds into the ball more and snaps back faster, giving more spin and feel, and it deforms a bit more for slightly more power. The catch is durability — a thinner string wears through and breaks sooner.",
      th: "เกจคือเส้นผ่านศูนย์กลางของเอ็นเป็นมิลลิเมตร (ยิ่งบางเลขเกจยิ่งสูง) เอ็นที่บางกว่าจะฝังเข้าไปในลูกบอลมากขึ้นและดีดกลับเร็วขึ้น ให้สปินและฟีลมากกว่า อีกทั้งยืดตัวได้มากขึ้นเล็กน้อยจึงมีพลังเพิ่มนิดหน่อย ข้อเสียคือความทนทาน — เอ็นบางจะสึกและขาดเร็วกว่า" },
    { t: "svg", key: "gauge",
      cap: { en: "Common range is about 1.15–1.35 mm. Thin for spin/feel, thick for durability/control.",
             th: "ช่วงที่นิยมอยู่ราว 1.15–1.35 มม. บางเน้นสปิน/ฟีล หนาเน้นความทน/คอนโทรล" } },

    { t: "h", en: "What the tension does — the biggest dial", th: "แรงตึงมีผลอย่างไร — ปุ่มปรับที่สำคัญที่สุด" },
    { t: "p",
      en: "Tension is the single biggest lever you control. A looser bed acts like a trampoline — more energy return (power) and more give on impact (comfort), but a less predictable launch angle (less control). A tighter bed is the reverse: more control and precision, at the cost of power and comfort. Note that stringing very tight OR very loose both make the string lose tension a little faster.",
      th: "แรงตึงคือปุ่มปรับที่ทรงพลังที่สุดที่คุณควบคุมได้ หน้าเอ็นที่ตึงน้อย (หลวม) จะเหมือนแทรมโพลีน — คืนพลังมากขึ้น (พลัง) และยุบตัวรับแรงกระแทกมากขึ้น (นุ่ม) แต่มุมออกของลูกจะคาดเดายากขึ้น (คุมยากขึ้น) ส่วนหน้าเอ็นที่ตึงมากจะตรงกันข้าม: คุมแม่นและควบคุมดีขึ้น แต่แลกด้วยพลังและความนุ่ม ข้อควรรู้: การขึ้นเอ็นตึงมากหรือหลวมมากล้วนทำให้แรงตึงตกเร็วขึ้นเล็กน้อย" },
    { t: "svg", key: "tension",
      cap: { en: "Same string, different tension: loosen for power & comfort, tighten for control.",
             th: "เอ็นเดียวกันแต่แรงตึงต่างกัน: ลดแรงตึงเพื่อพลังและความนุ่ม เพิ่มแรงตึงเพื่อการควบคุม" } },

    { t: "h", en: "The racket's part", th: "บทบาทของแร็กเกต" },
    { t: "ul", items: [
      { en: "Open string pattern (e.g. 16×19): mains snap back freely → more spin and power.",
        th: "แพทเทิร์นเอ็นห่าง (เช่น 16×19): เอ็นเมนดีดกลับได้อิสระ → สปินและพลังมากขึ้น" },
      { en: "Dense pattern (e.g. 18×20): the tighter grid grips the ball → more control and durability, less spin.",
        th: "แพทเทิร์นเอ็นถี่ (เช่น 18×20): ตารางเอ็นที่ถี่จับลูกได้มั่นคง → คุมและทนมากขึ้น แต่สปินน้อยลง" },
      { en: "Stiffer frame (higher RA): a touch more power, but transmits more shock — less comfortable.",
        th: "เฟรมแข็งกว่า (ค่า RA สูง): พลังเพิ่มนิดหน่อย แต่ส่งแรงสะเทือนมากกว่า — นุ่มน้อยลง" },
      { en: "Bigger head size: more power, a little less control and feel.",
        th: "หน้าไม้ใหญ่กว่า: พลังมากขึ้น แต่คุมและฟีลลดลงเล็กน้อย" },
    ] },

    { t: "h", en: "Hybrids — mixing two strings", th: "ไฮบริด — ผสมเอ็นสองชนิด" },
    { t: "p",
      en: "A hybrid uses one string in the mains (vertical) and a different one in the crosses (horizontal). The mains carry most of the character, so the classic setup is a soft, powerful string (natural gut) in the mains with a control poly in the crosses — comfort and feel from one, control and durability from the other. It genuinely plays better than the average of the two.",
      th: "ไฮบริดคือการใช้เอ็นชนิดหนึ่งเป็นเส้นเมน (แนวตั้ง) และอีกชนิดเป็นเส้นครอส (แนวนอน) เส้นเมนเป็นตัวกำหนดคาแรกเตอร์หลัก สูตรคลาสสิกจึงใช้เอ็นนุ่มมีพลัง (เอ็นแท้) เป็นเมน คู่กับโพลีคอนโทรลเป็นครอส — ได้ความนุ่มและฟีลจากเส้นหนึ่ง ได้คอนโทรลและความทนจากอีกเส้น ซึ่งเล่นได้ดีกว่าค่าเฉลี่ยของทั้งสองเส้นจริง ๆ" },

    { t: "h", en: "How to choose — quick principles", th: "จะเลือกอย่างไร — หลักการสั้น ๆ" },
    { t: "ul", items: [
      { en: "Arm pain or tennis elbow? Prioritise comfort: natural gut or a multifilament, lower tension. Avoid stiff full-poly.",
        th: "ปวดแขนหรือเทนนิสเอลโบว์? เน้นความนุ่มก่อน: เอ็นแท้หรือมัลติ และลดแรงตึง หลีกเลี่ยงโพลีแข็งล้วน" },
      { en: "Swing fast and hit the fence? You need control: a (shaped) poly, or a poly-cross hybrid.",
        th: "สวิงเร็วและตีออกหลัง? คุณต้องการคอนโทรล: โพลี (ทรงเหลี่ยม) หรือไฮบริดที่ใช้โพลีเป็นครอส" },
      { en: "Want maximum spin? A thin, shaped poly in an open pattern.",
        th: "อยากได้สปินสูงสุด? โพลีทรงเหลี่ยมเส้นบาง ในแพทเทิร์นเอ็นห่าง" },
      { en: "Break strings every week? Go thicker, add a poly or Kevlar hybrid for durability.",
        th: "เอ็นขาดทุกสัปดาห์? ใช้เอ็นหนาขึ้น หรือเพิ่มไฮบริดโพลี/เคฟลาร์เพื่อความทน" },
      { en: "Need more free power? A softer/livelier string (multi or gut) and/or a lower tension.",
        th: "อยากได้พลังฟรีเพิ่ม? ใช้เอ็นที่นุ่ม/สปริงดี (มัลติหรือกัต) และ/หรือ ลดแรงตึงลง" },
      { en: "Golden rule: change one thing at a time, and re-string before the string dies — a dead poly is what hurts arms.",
        th: "กฎทอง: เปลี่ยนทีละอย่าง และเปลี่ยนเอ็นก่อนที่มันจะ 'ตาย' — โพลีที่หมดสภาพคือสิ่งที่ทำร้ายแขน" },
    ] },

    { t: "h", en: "How Tension Lab's rating is built — and how far to trust it", th: "ระบบให้คะแนนของ Tension Lab สร้างมาอย่างไร — และเชื่อได้แค่ไหน" },
    { t: "p",
      en: "Every setup is scored 0–100 on seven axes: power, control, spin, comfort, feel, durability and tension hold. The model starts from each string's material character, then adjusts it from a neutral reference point (1.25 mm, 52 lb, a 16×19 / RA 64 / 98 in² racket) using the physics on this page — shape, gauge, tension, string pattern, frame stiffness and head size each nudge specific axes. For hybrids it blends the two strings with the mains weighted more heavily, and caps durability at the weaker string.",
      th: "ทุกเซ็ตอัปจะถูกให้คะแนน 0–100 ใน 7 ด้าน: พลัง คอนโทรล สปิน ความนุ่ม ฟีล ความทนทาน และการคงแรงตึง โมเดลเริ่มจากคาแรกเตอร์ตามวัสดุของเอ็นแต่ละเส้น แล้วปรับจาก 'จุดอ้างอิงกลาง' (1.25 มม., 52 ปอนด์, ไม้ 16×19 / RA 64 / 98 ตร.นิ้ว) ด้วยหลักฟิสิกส์ในหน้านี้ — รูปทรง ความหนา แรงตึง แพทเทิร์นเอ็น ความแข็งเฟรม และขนาดหน้าไม้ ต่างก็ขยับคะแนนแต่ละด้าน สำหรับไฮบริดจะผสมเอ็นสองเส้นโดยถ่วงน้ำหนักเส้นเมนมากกว่า และจำกัดความทนทานไว้ที่เส้นที่อ่อนแอกว่า" },
    { t: "p",
      en: "It's calibrated to the kind of lab data published by Tennis Warehouse University (stringbed stiffness, spin potential, energy return, tension loss) plus long-established stringing rules. Because it's one consistent engine, two strings are always compared on the same fair basis, and a product added today lands on the same scale as one added a year ago.",
      th: "โมเดลถูกปรับเทียบกับข้อมูลแล็บแบบที่ Tennis Warehouse University เผยแพร่ (ความแข็งหน้าเอ็น ศักยภาพสปิน การคืนพลังงาน การสูญเสียแรงตึง) ร่วมกับหลักการขึ้นเอ็นที่ยึดถือกันมานาน เพราะใช้เอนจินเดียวที่สอดคล้องกัน เอ็นสองเส้นจึงถูกเทียบบนพื้นฐานที่ยุติธรรมเสมอ และสินค้าที่เพิ่มวันนี้จะอยู่บนสเกลเดียวกับที่เพิ่มเมื่อปีก่อน" },
    { t: "callout",
      en: "But it is not 100% right — and it's not meant to be. There is no official string-rating standard in tennis, so these numbers are structured estimates, not lab measurements of each product. They describe tendencies, not guarantees: your technique, swing speed, arm history and even the ball change the real result. Use Tension Lab as a smart, consistent starting point to narrow your choices — then trust your own feel on court, especially for comfort.",
      th: "แต่มันไม่ได้ถูกต้อง 100% — และไม่ได้ตั้งใจให้เป็นเช่นนั้น วงการเทนนิสไม่มีมาตรฐานการให้คะแนนเอ็นอย่างเป็นทางการ ตัวเลขเหล่านี้จึงเป็นการประมาณการอย่างมีหลักการ ไม่ใช่ผลวัดจริงของสินค้าแต่ละชิ้น มันบอก 'แนวโน้ม' ไม่ใช่ 'การรับประกัน': เทคนิค ความเร็วสวิง ประวัติอาการแขน หรือแม้แต่ลูกบอลที่ใช้ ล้วนเปลี่ยนผลลัพธ์จริงได้ ใช้ Tension Lab เป็นจุดเริ่มต้นที่ฉลาดและสม่ำเสมอเพื่อคัดตัวเลือกให้แคบลง — แล้วเชื่อความรู้สึกของตัวเองในสนามเป็นหลัก โดยเฉพาะเรื่องความนุ่ม" },
    { t: "p",
      en: "Want the exact formulas? Every coefficient is documented in the project's algorithm reference. Every rating is also visible and editable by the site admin, so the catalog can be corrected and improved over time.",
      th: "อยากดูสูตรแบบเป๊ะ ๆ? ทุกค่าสัมประสิทธิ์มีบันทึกไว้ในเอกสารอ้างอิงอัลกอริทึมของโปรเจกต์ และทุกคะแนนแอดมินของเว็บสามารถดูและแก้ไขได้ ทำให้ปรับปรุงฐานข้อมูลให้ดีขึ้นได้เรื่อย ๆ" },
  ];

  const UI = {
    title: { en: "String Knowledge", th: "ความรู้เรื่องเอ็น" },
    lede: { en: "The basics of choosing a tennis string — what each material, shape, gauge and tension actually does — plus how our rating is built and how far to trust it.",
            th: "พื้นฐานการเลือกเอ็นเทนนิส — ว่าวัสดุ รูปทรง ความหนา และแรงตึง แต่ละอย่างทำอะไรบ้าง — พร้อมวิธีสร้างระบบให้คะแนนของเราและควรเชื่อได้แค่ไหน" },
    ctaSetup: { en: "Try it in Setup String →", th: "ลองใช้งานใน Setup String →" },
  };

  /* ---------------- render ---------------- */
  const MATCOLOR = (window.TL && window.TL.matHex) || (() => "#8E979A");
  function render(lang) {
    let html = "";
    for (const b of CONTENT) {
      if (b.t === "h") html += '<h2 class="k-h">' + b[lang] + "</h2>";
      else if (b.t === "p") html += "<p class=\"k-p\">" + b[lang] + "</p>";
      else if (b.t === "callout") html += '<div class="k-callout">' + b[lang] + "</div>";
      else if (b.t === "ul") html += "<ul class=\"k-ul\">" + b.items.map((i) => "<li>" + i[lang] + "</li>").join("") + "</ul>";
      else if (b.t === "svg") html += '<figure class="k-fig">' + SVG[b.key] + '<figcaption>' + b.cap[lang] + "</figcaption></figure>";
      else if (b.t === "cards") html += '<div class="k-cards">' + b.items.map((c) =>
        '<div class="k-card"><span class="k-swatch" style="background:' + MATCOLOR(c.m.tag) + '"></span>' +
        '<div><div class="k-card-t">' + c.m.name[lang] + "</div><div class=\"k-card-d\">" + c[lang] + "</div></div></div>").join("") + "</div>";
    }
    html += '<div style="margin-top:26px;text-align:center"><a class="btn" href="/">' + UI.ctaSetup[lang] + "</a></div>";
    $("kContent").innerHTML = html;
    $("kTitle").textContent = UI.title[lang];
    $("kLede").textContent = UI.lede[lang];
    document.body.classList.toggle("lang-th", lang === "th");
    document.documentElement.setAttribute("lang", lang === "th" ? "th" : "en");
    document.querySelectorAll("#langToggle button").forEach((btn) => btn.classList.toggle("on", btn.getAttribute("data-lang") === lang));
  }

  function getLang() {
    const m = document.cookie.match(/(?:^|; )tl_lang=(en|th)/);
    return m ? m[1] : "en";
  }
  function setLang(l) {
    document.cookie = "tl_lang=" + l + "; Path=/; Max-Age=" + (60 * 60 * 24 * 365) + "; SameSite=Lax";
    render(l);
  }

  document.querySelectorAll("#langToggle button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.getAttribute("data-lang"))));
  render(getLang());
})();
