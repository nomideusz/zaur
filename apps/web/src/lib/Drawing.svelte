<script lang="ts">
	// Catalog line drawings for the apps. Decorative: every fact a callout
	// names is also in the part's spec table, so the SVG stays aria-hidden.
	let { id }: { id: string } = $props();
</script>

<svg class="drawing" viewBox="0 0 280 200" aria-hidden="true">
	<defs>
		<marker id="arrow-{id}" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
			<path d="M0 1.5 8 4 0 6.5z" class="head" />
		</marker>
	</defs>

	{#if id === 'szkolyjogi'}
		<!-- card-index drawer, one city card pulled up -->
		<path class="thin" d="M38 112V98H172V112M48 98v-6h24v6" />
		<path class="thin solid" d="M34 112V104H176V112H34M130 104v-6h24v6" />
		<rect class="ln solid" x="54" y="30" width="108" height="90" />
		<path class="ln solid" d="M118 30v-8h30v8" />
		<text class="tag" x="66" y="54">Kraków</text>
		<path class="thin" d="M66 68H148M66 80H136M66 92H144" />
		<rect class="ln solid" x="30" y="112" width="150" height="48" />
		<rect class="thin" x="89" y="124" width="32" height="12" />
		<path class="ln" d="M97 144a8 5 0 0 0 16 0" />
		<!-- width dimension -->
		<path class="thin" d="M30 166V192M180 166V192" />
		<path class="thin" d="M30 184H180" marker-start="url(#arrow-{id})" marker-end="url(#arrow-{id})" />
		<text class="lbl lbl--ground" x="105" y="188" text-anchor="middle">ALL OF POLAND</text>
		<!-- callouts -->
		<circle class="dot" cx="136" cy="80" r="2" />
		<path class="thin" d="M136 80 176 62H190" />
		<text class="lbl" x="194" y="60">SCHEDULES</text>
		<text class="lbl" x="194" y="73">PRICES</text>
		<circle class="dot" cx="121" cy="130" r="2" />
		<path class="thin" d="M121 130 182 154H190" />
		<text class="lbl" x="194" y="152">LANGUAGES</text>
		<text class="lbl" x="194" y="165">PL/EN/UK</text>
	{:else if id === 'mail'}
		<!-- envelope, flap down -->
		<rect class="ln" x="34" y="66" width="150" height="96" />
		<path class="ln" d="M34 66 109 120 184 66" />
		<path class="hid" d="M34 162 92 112M184 162 126 112" />
		<!-- width dimension -->
		<path class="thin" d="M34 60V36M184 60V36" />
		<path class="thin" d="M34 44H184" marker-start="url(#arrow-{id})" marker-end="url(#arrow-{id})" />
		<text class="lbl" x="109" y="38" text-anchor="middle">JMAP</text>
		<!-- callouts -->
		<circle class="dot" cx="109" cy="120" r="2" />
		<path class="thin" d="M109 120 150 90H192" />
		<text class="lbl" x="196" y="88">STALWART</text>
		<text class="lbl" x="196" y="101">SELF-HOSTED</text>
		<circle class="dot" cx="160" cy="146" r="2" />
		<path class="thin" d="M160 146 178 176H192" />
		<text class="lbl" x="196" y="174">CALENDAR</text>
		<text class="lbl" x="196" y="187">CONTACTS</text>
	{:else if id === 'register'}
		<!-- address tag on its string -->
		<path class="ln" d="M68 68H196V152H68L40 128V92Z" />
		<circle class="ln" cx="56" cy="110" r="6" />
		<path class="ln" d="M50 110C22 106 14 74 26 46" />
		<text class="tag" x="80" y="114">you@zaur.app</text>
		<path class="thin" d="M80 124H186M80 138H150" />
		<path class="thin" d="M68 60V36M196 60V36" />
		<path class="thin" d="M68 44H196" marker-start="url(#arrow-{id})" marker-end="url(#arrow-{id})" />
		<text class="lbl" x="132" y="38" text-anchor="middle">ONE FORM</text>
		<circle class="dot" cx="180" cy="124" r="2" />
		<path class="thin" d="M180 124 196 176H204" />
		<text class="lbl" x="208" y="174">REAL</text>
		<text class="lbl" x="208" y="187">MAILBOX</text>
	{:else if id === 'dino'}
		<!-- one day of sky: sun path over the horizon -->
		<path class="ln" d="M16 150H264" />
		<path class="hid" d="M45 150A95 95 0 0 1 235 150" />
		<circle class="ln" cx="79" cy="77" r="9" />
		<path class="thin" d="M79 60V54M79 94V100M62 77H56M96 77H102M67 65l-4-4M91 89l4 4M67 89l-4 4M91 65l4-4" />
		<path class="ln" d="M164 116a10 10 0 0 1 19-3 8 8 0 0 1 13 6 7 7 0 0 1-2 13h-30a8 8 0 0 1 0-16z" />
		<path class="thin" d="M150 32v8M146 36h8M250 72v6M247 75h6M180 26v6M177 29h6" />
		<path class="thin" d="M45 150v6M235 150v6" />
		<text class="lbl" x="45" y="168" text-anchor="middle">SUNRISE</text>
		<text class="lbl" x="235" y="168" text-anchor="middle">SUNSET</text>
		<path class="thin" d="M45 178V192M235 178V192" />
		<path class="thin" d="M45 186H235" marker-start="url(#arrow-{id})" marker-end="url(#arrow-{id})" />
		<text class="lbl lbl--ground" x="140" y="189" text-anchor="middle">NEXT 24 HOURS</text>
		<circle class="dot" cx="196" cy="120" r="2" />
		<path class="thin" d="M196 120 206 52H212" />
		<text class="lbl" x="214" y="36">LIVE</text>
		<text class="lbl" x="214" y="49">WEATHER</text>
	{:else}
		<!-- record and tonearm -->
		<circle class="ln" cx="100" cy="108" r="72" />
		<circle class="thin" cx="100" cy="108" r="62" />
		<circle class="thin" cx="100" cy="108" r="52" />
		<circle class="thin" cx="100" cy="108" r="42" />
		<circle class="ln" cx="100" cy="108" r="22" />
		<circle class="dot" cx="100" cy="108" r="2.5" />
		<circle class="ln" cx="222" cy="40" r="9" />
		<path class="ln" d="M222 40 196 118 172 134" />
		<path class="ln" d="M166 128l12 12-6 6-12-12z" />
		<path class="thin" d="M28 14V100M172 14V100" />
		<path class="thin" d="M28 22H172" marker-start="url(#arrow-{id})" marker-end="url(#arrow-{id})" />
		<text class="lbl lbl--ground" x="100" y="25" text-anchor="middle">YOUR LIBRARY</text>
		<circle class="dot" cx="112" cy="116" r="2" />
		<path class="thin" d="M112 116 180 170H188" />
		<text class="lbl" x="192" y="168">NAVIDROME</text>
		<text class="lbl" x="192" y="181">SELF-HOSTED</text>
	{/if}
</svg>

<style>
	.drawing {
		display: block;
		width: 100%;
		height: auto;
		overflow: hidden;
	}

	.ln,
	.thin,
	.hid {
		fill: none;
		stroke: var(--ink);
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.ln {
		stroke-width: 1.6;
	}

	.thin {
		stroke-width: 0.75;
	}

	.hid {
		stroke-width: 1;
		stroke-dasharray: 4 3;
	}

	.solid {
		fill: var(--stock);
	}

	.dot,
	.head {
		fill: var(--ink);
	}

	.lbl {
		font-size: 12px;
		font-weight: 600;
		font-stretch: 80%;
		letter-spacing: 0.08em;
		fill: var(--ink);
	}

	/* Label sitting on a dimension line: knock the line out behind it. */
	.lbl--ground {
		paint-order: stroke;
		stroke: var(--stock);
		stroke-width: 6px;
	}

	.tag {
		font-size: 15px;
		font-weight: 500;
		fill: var(--ink);
	}
</style>
