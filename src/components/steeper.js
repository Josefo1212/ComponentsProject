class UiStepper extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleSlotChange = this.handleSlotChange.bind(this);
		this.stepCompletion = [];
		this.handleInternalComplete = this.handleInternalComplete.bind(this);
		this.handleInternalInput = this.handleInternalInput.bind(this);
		this._lastReason = "init";
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

	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.shadowRoot) {
			return;
		}
		if (name === "active-step" && oldValue !== newValue && !this._lastReason) {
			this._lastReason = "step-change";
		}
		this.syncState();
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
					const fields = Array.from(current.querySelectorAll('input, textarea, select')).filter(
						(field) => field.type !== 'hidden' && !field.disabled
					);
					const firstInvalid = fields.find((field) => String(field.value || '').trim().length === 0);
					if (firstInvalid) firstInvalid.focus();
				}
				return;
			}
			this._lastReason = "next";
			this.activeStep = this.activeStep + 1;
		}
	}

	previous() {
		if (this.activeStep > 0) {
			this._lastReason = "prev";
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
		this._lastReason = "init";
		this.syncState();
	}

	handleInternalComplete(e) {
		const btn = e.currentTarget;
		const idx = Number.parseInt(btn.dataset._stepIndex || '0', 10);
		this.stepCompletion[idx] = true;
		this._lastReason = "complete";
		this.syncState();
	}

	handleInternalInput() {
		// re-evaluar validación cuando cambian inputs dentro de un paso
		this._lastReason = "input";
		this.syncState();
	}

	getStepElements() {
		const slot = this.shadowRoot.querySelector("slot");
		return slot ? slot.assignedElements({ flatten: true }).filter((element) => element.nodeType === Node.ELEMENT_NODE) : [];
	}

	getFieldLabel(field) {
		if (field.dataset && field.dataset.label) {
			return field.dataset.label;
		}
		const label = field.closest('label');
		if (label) {
			const textParts = Array.from(label.childNodes)
				.filter((node) => node.nodeType === Node.TEXT_NODE)
				.map((node) => node.textContent.trim())
				.filter(Boolean);
			if (textParts.length) return textParts.join(' ');
		}
		return field.getAttribute('aria-label') || field.name || field.id || 'Campo';
	}

	collectState() {
		const steps = this.steps.map((step, index) => {
			const title = step.getAttribute("data-title") || step.getAttribute("title") || `Paso ${index + 1}`;
			const subtitle = step.getAttribute("data-subtitle") || "";
			const fields = Array.from(step.querySelectorAll('input, textarea, select')).filter(
				(field) => field.type !== 'hidden'
			);
			const mappedFields = fields.map((field) => ({
				label: this.getFieldLabel(field),
				name: field.name || field.id || field.getAttribute('aria-label') || '',
				value: field.type === 'password' || field.dataset.sensitive === 'true'
					? field.value
						? '••••••'
						: ''
					: field.value
						? String(field.value)
						: '',
				type: field.type || field.tagName.toLowerCase(),
			}));
			const filledCount = mappedFields.filter((field) => field.value.trim().length > 0).length;
			return {
				index,
				title,
				subtitle,
				required: step.getAttribute('data-validate') === 'required',
				fields: mappedFields,
				filledCount,
				totalFields: mappedFields.length,
				isComplete: !!this.stepCompletion[index],
				isValid: this.isStepValid(index),
			};
		});

		return {
			activeStep: this.activeStep,
			totalSteps: steps.length,
			steps,
			completion: [...this.stepCompletion],
		};
	}

	emitStatus(reason = "update") {
		const detail = {
			reason,
			...this.collectState(),
		};
		this.dispatchEvent(
			new CustomEvent("stepper:update", {
				detail,
				bubbles: true,
				composed: true,
			})
		);
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

	render() {}

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
					<button class="step-button" type="button" aria-current="${current ? "step" : "false"}" data-step="${index}" disabled aria-disabled="true" tabindex="-1">
						<span class="badge">${index + 1}</span>
						<span class="step-label">
							<span class="step-title">${title}</span>
							${subtitle ? `<span class="step-subtitle">${subtitle}</span>` : ""}
						</span>
					</button>
				`;
			})
			.join("");

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

		const reason = this._lastReason || "update";
		this._lastReason = "";
		this.emitStatus(reason);
	}
}

customElements.define("ui-stepper", UiStepper);