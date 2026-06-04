class UiTabs extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleSlotChange = this.handleSlotChange.bind(this);
	}

	static get observedAttributes() {
		return ["active-tab"];
	}

	connectedCallback() {
		this.render();
		this.slotElement = this.shadowRoot.querySelector("slot");
		this.slotElement.addEventListener("slotchange", this.handleSlotChange);
		this.handleSlotChange();
	}

	disconnectedCallback() {
		if (this.slotElement) {
			this.slotElement.removeEventListener("slotchange", this.handleSlotChange);
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.shadowRoot) return;
		if (name === "active-tab" && oldValue !== newValue) {
			this.syncState(oldValue, newValue);
		}
	}

	get activeTab() {
		return this.getAttribute("active-tab") || "";
	}

	set activeTab(value) {
		this.setAttribute("active-tab", value);
	}

	getPanels() {
		const slot = this.shadowRoot.querySelector("slot");
		if (!slot) return [];
		return slot.assignedElements({ flatten: true })
			.filter(el => el.classList.contains("tab-panel") || el.tagName.toLowerCase() === "article");
	}

	handleSlotChange() {
		const panels = this.getPanels();
		
		if (!this.activeTab && panels.length > 0) {
			this.activeTab = panels[0].id;
		}

		panels.forEach((panel) => {
			const isActive = panel.id === this.activeTab;
			panel.hidden = !isActive;
			panel.setAttribute("aria-hidden", String(!isActive));
			if (isActive) {
				panel.classList.add("is-active");
				panel.classList.remove("is-leaving");
			} else {
				panel.classList.remove("is-active", "is-leaving");
			}
		});

		this.renderButtons();
	}

	renderButtons() {
		const buttonsContainer = this.shadowRoot.querySelector(".tab-buttons");
		if (!buttonsContainer) return;

		const panels = this.getPanels();
		buttonsContainer.innerHTML = panels.map((panel) => {
			const title = panel.getAttribute("data-tab-title") || panel.getAttribute("data-title") || panel.getAttribute("title") || panel.id;
			const isActive = panel.id === this.activeTab;
			return `
				<button 
					class="tab-button" 
					role="tab" 
					aria-selected="${isActive}" 
					aria-controls="${panel.id}" 
					id="tab-${panel.id}"
					tabindex="${isActive ? "0" : "-1"}"
					type="button"
				>
					${title}
				</button>
			`;
		}).join("");

		const buttons = buttonsContainer.querySelectorAll(".tab-button");
		buttons.forEach((btn) => {
			btn.addEventListener("click", () => {
				const targetPanelId = btn.getAttribute("aria-controls");
				this.activeTab = targetPanelId;
			});
		});
	}

	syncState(oldTabId, newTabId) {
		const panels = this.getPanels();
		const currentPanel = panels.find(p => p.id === oldTabId);
		const nextPanel = panels.find(p => p.id === newTabId);

		const buttons = this.shadowRoot.querySelectorAll(".tab-button");
		buttons.forEach((btn) => {
			const isSelected = btn.getAttribute("aria-controls") === newTabId;
			btn.setAttribute("aria-selected", String(isSelected));
			btn.tabIndex = isSelected ? 0 : -1;
		});

		if (currentPanel && currentPanel !== nextPanel) {
			this.deactivatePanel(currentPanel);
		}
		if (nextPanel) {
			this.activatePanel(nextPanel);
		}
	}

	activatePanel(panel) {
		if (!panel) return;
		panel.hidden = false;
		panel.classList.remove("is-leaving");
		panel.setAttribute("aria-hidden", "false");
		requestAnimationFrame(() => {
			panel.classList.add("is-active");
		});
	}

	deactivatePanel(panel) {
		if (!panel) return;
		panel.classList.remove("is-active");
		panel.classList.add("is-leaving");
		panel.setAttribute("aria-hidden", "true");
		const handleTransitionEnd = (event) => {
			if (event.propertyName !== "opacity") return;
			panel.hidden = true;
			panel.classList.remove("is-leaving");
			panel.removeEventListener("transitionend", handleTransitionEnd);
		};
		panel.addEventListener("transitionend", handleTransitionEnd);
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					width: 100%;
					background: var(--surface, #ffffff);
					border: 1px solid var(--border, #dddddd);
					border-radius: 16px;
					padding: 16px;
					overflow: visible;
				}

				.tab-buttons {
					display: flex;
					gap: 8px;
					margin-bottom: 12px;
					flex-wrap: wrap;
				}

				.tab-button {
					border: 1px solid var(--border, #cccccc);
					background: rgba(13, 18, 45, 0.6);
					padding: 8px 12px;
					border-radius: 999px;
					cursor: pointer;
					color: var(--text, #222222);
					font: inherit;
					transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
				}

				.tab-button:hover {
					transform: translateY(-1px);
					border-color: rgba(139, 92, 246, 0.6);
					background: var(--gradient-accent, #eeeeee);
				}

				.tab-button[aria-selected="true"] {
					background: var(--gradient-accent, #222222);
					color: var(--text, #ffffff);
					border-color: rgba(139, 92, 246, 0.6);
					box-shadow: 0 10px 20px rgba(46, 29, 95, 0.5);
				}

				.tab-button:focus-visible {
					outline: none;
					box-shadow: var(--ring, 0 0 0 3px rgba(99, 102, 241, 0.5));
				}
			</style>
			<div class="tab-buttons" role="tablist"></div>
			<div class="tab-panels">
				<slot></slot>
			</div>
		`;
	}
}

customElements.define("ui-tabs", UiTabs);
