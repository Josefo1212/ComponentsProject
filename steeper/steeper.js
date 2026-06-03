class UiStepper extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleSlotChange = this.handleSlotChange.bind(this);
		this.stepCompletion = [];
		this.handleInternalComplete = this.handleInternalComplete.bind(this);
		this.handleInternalInput = this.handleInternalInput.bind(this);
	}

	static get observedAttributes() {
		return ["active-step"];
	}

	connectedCallback() {
		this.render();
		this.slotElement = this.shadowRoot.querySelector("slot");
		this.slotElement.addEventListener("slotchange", this.handleSlotChange);
		this.shadowRoot.querySelector("[data-action='prev']").addEventListener("click", () => this.previous());
		this.shadowRoot.querySelector("[data-action='next']").addEventListener("click", () => this.next());
		this.handleSlotChange();
	}

	disconnectedCallback() {
		if (this.slotElement) {
			this.slotElement.removeEventListener("slotchange", this.handleSlotChange);
		}
	}

	attributeChangedCallback() {
		if (this.shadowRoot) {
			this.syncState();
		}
	}

	get activeStep() {
		const value = Number.parseInt(this.getAttribute("active-step") || "0", 10);
		return Number.isNaN(value) ? 0 : value;
	}

	set activeStep(value) {
		const nextValue = Math.max(0, value);
		this.setAttribute("active-step", String(nextValue));
	}

	get steps() {
		return this.stepElements || [];
	}

	next() {
		if (this.activeStep < this.steps.length - 1) {
			// validar/chequear si el paso actual permite avanzar
			if (!this.isStepValid(this.activeStep)) {
				// intentar enfocar el primer campo inválido si existe
				const current = this.steps[this.activeStep];
				if (current) {
					const firstInvalid = current.querySelector('input:invalid, input:not([type=hidden]):not([value=""]), textarea:not(:placeholder-shown)');
					if (firstInvalid) firstInvalid.focus();
				}
				return;
			}
			this.activeStep = this.activeStep + 1;
		}
	}

	previous() {
		if (this.activeStep > 0) {
			this.activeStep = this.activeStep - 1;
		}
	}

	handleSlotChange() {
		this.stepElements = this.getStepElements();
		// inicializar estados de completado
		this.stepCompletion = this.stepElements.map(() => false);
		// preparar listeners internos para botones de completado
		this.stepElements.forEach((el, idx) => {
			const completeBtn = el.querySelector('[data-action="complete"], [data-complete-button]');
			if (completeBtn) {
				completeBtn.removeEventListener('click', this.handleInternalComplete);
				completeBtn.addEventListener('click', this.handleInternalComplete);
				// almacenar índice en dataset para el handler
				completeBtn.dataset._stepIndex = String(idx);
			}
			// input/change listeners to re-evaluate validation
			el.removeEventListener('input', this.handleInternalInput);
			el.removeEventListener('change', this.handleInternalInput);
			el.addEventListener('input', this.handleInternalInput);
			el.addEventListener('change', this.handleInternalInput);
		});
		this.syncState();
	}

	handleInternalComplete(e) {
		const btn = e.currentTarget;
		const idx = Number.parseInt(btn.dataset._stepIndex || '0', 10);
		this.stepCompletion[idx] = true;
		this.syncState();

		// Reemplazar contenido del panel por mensaje de éxito cuando se complete
		const panels = this.getStepElements();
		const panel = panels[idx];
		if (panel) {
			panel.innerHTML = `<h4>Usuario creado</h4><p>El usuario se creó correctamente.</p>`;
		}
	}

	handleInternalInput() {
		// re-evaluar validación cuando cambian inputs dentro de un paso
		this.syncState();
	}

	getStepElements() {
		const slot = this.shadowRoot.querySelector("slot");
		return slot ? slot.assignedElements({ flatten: true }).filter((element) => element.nodeType === Node.ELEMENT_NODE) : [];
	}

	isStepValid(index) {
		const step = this.steps[index];
		if (!step) return true;
		// si tiene un botón interno que debe completar la acción
		if (step.querySelector('[data-action="complete"], [data-complete-button]')) {
			return !!this.stepCompletion[index];
		}
		// si tiene data-validate="required" validar inputs/textarea
		if (step.getAttribute('data-validate') === 'required') {
			const inputs = Array.from(step.querySelectorAll('input, textarea')).filter(i => !i.disabled);
			if (inputs.length === 0) return true;
			return inputs.every(i => (i.value || '').toString().trim().length > 0);
		}
		return true;
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					font-family: Arial, sans-serif;
					color: #0f172a;
				}

				:host([hidden]) {
					display: none;
				}

				.shell {
					padding: 24px;
					border-radius: 24px;
					background: rgba(255, 255, 255, 0.88);
					border: 1px solid rgba(148, 163, 184, 0.28);
					box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
				}

				.steps {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
					gap: 12px;
					margin-bottom: 24px;
				}

				.step-button {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 12px 14px;
					border: 1px solid #d8dee8;
					border-radius: 16px;
					background: #f8fafc;
					color: #334155;
					font: inherit;
					cursor: pointer;
					text-align: left;
					transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
				}

				.step-button:hover {
					transform: translateY(-1px);
				}

				.step-button[aria-current="step"] {
					background: linear-gradient(180deg, #1d4ed8, #2563eb);
					color: #fff;
					border-color: #1d4ed8;
				}

				.badge {
					display: grid;
					place-items: center;
					width: 28px;
					height: 28px;
					border-radius: 999px;
					background: rgba(59, 130, 246, 0.12);
					font-weight: 700;
					flex: none;
				}

				.step-button[aria-current="step"] .badge {
					background: rgba(255, 255, 255, 0.18);
				}

				.step-label {
					display: grid;
					gap: 3px;
				}

				.step-title {
					font-weight: 700;
				}

				.step-subtitle {
					font-size: 0.9rem;
					opacity: 0.78;
				}

				.content {
					min-height: 180px;
					padding: 20px;
					border-radius: 20px;
					background: linear-gradient(180deg, #ffffff, #f8fafc);
					border: 1px solid #e2e8f0;
				}

				.content ::slotted(*) {
					display: none;
				}

				.content ::slotted(.is-active) {
					display: block;
				}

				.footer {
					display: flex;
					justify-content: space-between;
					gap: 12px;
					margin-top: 20px;
				}

				.nav-button {
					border: 0;
					border-radius: 999px;
					padding: 11px 18px;
					font: inherit;
					font-weight: 700;
					cursor: pointer;
				}

				.nav-button[data-action='prev'] {
					background: #e2e8f0;
					color: #0f172a;
				}

				.nav-button[data-action='next'] {
					background: #2563eb;
					color: #fff;
				}

				.nav-button:disabled {
					opacity: 0.45;
					cursor: not-allowed;
				}
			</style>

			<div class="shell">
				<div class="steps" part="steps"></div>
				<div class="content" part="content">
					<slot></slot>
				</div>
				<div class="footer">
					<button class="nav-button" data-action="prev" type="button">Anterior</button>
					<button class="nav-button" data-action="next" type="button">Siguiente</button>
				</div>
			</div>
		`;

		this.stepsContainer = this.shadowRoot.querySelector(".steps");
		this.syncState();
	}

	syncState() {
		if (!this.shadowRoot || !this.stepsContainer) {
			return;
		}

		const stepElements = this.steps || [];
		this.stepsContainer.innerHTML = stepElements
			.map((element, index) => {
				const title = element.getAttribute("data-title") || element.getAttribute("title") || `Paso ${index + 1}`;
				const subtitle = element.getAttribute("data-subtitle") || "";
				const current = index === this.activeStep;
				return `
					<button class="step-button" type="button" aria-current="${current ? "step" : "false"}" data-step="${index}">
						<span class="badge">${index + 1}</span>
						<span class="step-label">
							<span class="step-title">${title}</span>
							${subtitle ? `<span class="step-subtitle">${subtitle}</span>` : ""}
						</span>
					</button>
				`;
			})
			.join("");

		this.shadowRoot.querySelectorAll(".step-button").forEach((button) => {
			button.addEventListener("click", () => {
				this.activeStep = Number.parseInt(button.getAttribute("data-step") || "0", 10);
			});
		});

		stepElements.forEach((element, index) => {
			element.classList.toggle("is-active", index === this.activeStep);
			// use inline style to reliably hide/show regardless of page CSS
			if (index === this.activeStep) {
				element.style.display = '';
				element.hidden = false;
			} else {
				element.style.display = 'none';
				element.hidden = true;
			}
		});

		const prevButton = this.shadowRoot.querySelector("[data-action='prev']");
		const nextButton = this.shadowRoot.querySelector("[data-action='next']");
		const lastIndex = Math.max(stepElements.length - 1, 0);
		prevButton.disabled = this.activeStep <= 0;
		// además de rango, deshabilitar si el paso actual no está validado/terminado
		const valid = this.isStepValid(this.activeStep);
		nextButton.disabled = this.activeStep >= lastIndex || !valid;
	}
}

customElements.define("ui-stepper", UiStepper);