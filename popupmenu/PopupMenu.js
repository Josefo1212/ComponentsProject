class PopupMenu extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleDocumentClick = this.handleDocumentClick.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);
	}

	connectedCallback() {
		this.render();
		this.button = this.shadowRoot.querySelector("button");
		this.menu = this.shadowRoot.querySelector("[part='menu']");
		this.button.addEventListener("click", () => this.toggle());
		document.addEventListener("click", this.handleDocumentClick);
		document.addEventListener("keydown", this.handleKeydown);
	}

	disconnectedCallback() {
		document.removeEventListener("click", this.handleDocumentClick);
		document.removeEventListener("keydown", this.handleKeydown);
	}

	static get observedAttributes() {
		return ["label", "open", "placement"];
	}

	attributeChangedCallback() {
		if (this.shadowRoot) {
			this.syncState();
		}
	}

	get open() {
		return this.hasAttribute("open");
	}

	set open(value) {
		if (value) {
			this.setAttribute("open", "");
		} else {
			this.removeAttribute("open");
		}
	}

	toggle() {
		this.open = !this.open;
	}

	close() {
		this.open = false;
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					position: relative;
					display: inline-block;
					font-family: Arial, sans-serif;
					color: #1f2937;
					z-index: 1;
				}

				:host([hidden]) {
					display: none;
				}

				.trigger {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					border: 1px solid #c7cdd6;
					background: linear-gradient(180deg, #ffffff, #f3f6fb);
					color: inherit;
					border-radius: 12px;
					padding: 10px 14px;
					cursor: pointer;
					box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
				}

				.trigger:focus-visible {
					outline: 3px solid rgba(59, 130, 246, 0.45);
					outline-offset: 2px;
				}

				.caret {
					font-size: 0.75rem;
					transition: transform 0.18s ease;
				}

				.menu {
					position: absolute;
					min-width: 220px;
					margin-top: 10px;
					padding: 8px;
					border-radius: 14px;
					border: 1px solid rgba(148, 163, 184, 0.35);
					background: #fff;
					box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
					opacity: 0;
					transform: translateY(-6px) scale(0.98);
					transform-origin: top left;
					pointer-events: none;
					transition: opacity 0.18s ease, transform 0.18s ease;
					z-index: 1000;
				}

				:host([placement='top']) .menu {
					bottom: calc(100% + 10px);
					top: auto;
					margin-top: 0;
					margin-bottom: 10px;
					transform-origin: bottom left;
				}

				:host([placement='top-end']) .menu,
				:host([placement='bottom-end']) .menu {
					right: 0;
					left: auto;
					transform-origin: top right;
				}

				:host([open]) .menu {
					opacity: 1;
					transform: translateY(0) scale(1);
					pointer-events: auto;
				}

				:host([open]) .caret {
					transform: rotate(180deg);
				}

				::slotted(*) {
					display: block;
					width: 100%;
					margin: 0;
				}

				::slotted(button),
				::slotted(a) {
					border: 0;
					background: transparent;
					color: #0f172a;
					text-align: left;
					padding: 11px 12px;
					border-radius: 10px;
					font: inherit;
					cursor: pointer;
					text-decoration: none;
				}

				::slotted(button:hover),
				::slotted(a:hover),
				::slotted(button:focus-visible),
				::slotted(a:focus-visible) {
					background: #eff6ff;
					outline: none;
				}
			</style>

			<button class="trigger" type="button" aria-haspopup="menu" aria-expanded="false">
				<span class="label"></span>
				<span class="caret" aria-hidden="true">▾</span>
			</button>

			<div class="menu" part="menu" role="menu" hidden>
				<slot></slot>
			</div>
		`;

		this.syncState();
		const slot = this.shadowRoot.querySelector("slot");
		slot.addEventListener("click", (e) => {
			setTimeout(() => this.close(), 0);
		});
	}

	syncState() {
		if (!this.button || !this.menu) {
			return;
		}

		this.button.querySelector(".label").textContent = this.getAttribute("label") || "Opciones";
		this.button.setAttribute("aria-expanded", String(this.open));
		this.menu.hidden = !this.open;
	}

	handleDocumentClick(event) {
		if (!this.open) {
			return;
		}

		if (!this.contains(event.target) && !this.shadowRoot.contains(event.target)) {
			this.close();
		}
	}

	handleKeydown(event) {
		if (event.key === "Escape") {
			this.close();
		}
	}
}

customElements.define("popup-menu", PopupMenu);