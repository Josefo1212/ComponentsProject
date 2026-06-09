class UiStepper extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleSlotChange = this.handleSlotChange.bind(this);
		this._currentStep = 0;
		this._totalSteps = 0;
		this._steps = [];
	}

	static get observedAttributes() {
		return ["active-step"];
	}

	connectedCallback() {
		this.render();
		this.slotElement = this.shadowRoot.querySelector("slot");
		if (this.slotElement) {
			this.slotElement.addEventListener("slotchange", this.handleSlotChange);
		}
		
		const prevBtn = this.shadowRoot.querySelector("[data-action='prev']");
		const nextBtn = this.shadowRoot.querySelector("[data-action='next']");
		if (prevBtn) prevBtn.addEventListener("click", () => this.previous());
		if (nextBtn) nextBtn.addEventListener("click", () => this.next());
		
		this.handleSlotChange();
	}

	disconnectedCallback() {
		if (this.slotElement) {
			this.slotElement.removeEventListener("slotchange", this.handleSlotChange);
		}
	}

	get activeStep() {
		return this._currentStep;
	}

	set activeStep(value) {
		const newStep = Math.max(0, Math.min(value, this._totalSteps - 1));
		if (newStep !== this._currentStep) {
			this._currentStep = newStep;
			this.updateVisibility();
			this.updateButtons();
			this.emitUpdate();
		}
	}

	isCurrentStepValid() {
		const currentPanel = this._steps[this._currentStep];
		if (!currentPanel) return false;
		
		const inputs = currentPanel.querySelectorAll('input, textarea');
		if (inputs.length === 0) return true;
		
		let allFilled = true;
		inputs.forEach(input => {
			if (input.type === 'hidden') return;
			const value = input.value?.trim() || '';
			if (value === '') {
				allFilled = false;
				input.style.borderColor = '#ff4444';
				input.style.boxShadow = '0 0 0 1px #ff4444';
				setTimeout(() => {
					input.style.borderColor = '';
					input.style.boxShadow = '';
				}, 1500);
			}
		});
		
		return allFilled;
	}

	next() {
		if (this._currentStep < this._totalSteps - 1) {
			if (this.isCurrentStepValid()) {
				this.activeStep = this._currentStep + 1;
			} else {
				this.showToast('Completa todos los campos antes de continuar', '#ff4444');
			}
		}
	}

	previous() {
		if (this._currentStep > 0) {
			this.activeStep = this._currentStep - 1;
		}
	}

	complete() {
		if (this.isCurrentStepValid()) {
			this.showToast('Formulario completado exitosamente', '#00cc66');
			this.dispatchEvent(new CustomEvent("stepper:completed", {
				detail: { 
					activeStep: this._currentStep, 
					totalSteps: this._totalSteps,
					completed: true
				},
				bubbles: true,
				composed: true
			}));
		} else {
			this.showToast('Completa todos los campos antes de finalizar', '#ff4444');
		}
	}

	showToast(message, color) {
		const toast = document.createElement('div');
		toast.textContent = message;
		toast.style.cssText = `
			position: fixed;
			bottom: 20px;
			right: 20px;
			background: ${color};
			color: #ffffff;
			padding: 12px 24px;
			border-radius: 40px;
			font-family: monospace;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 1px;
			z-index: 1000;
			animation: slideInRight 0.3s ease;
		`;
		document.body.appendChild(toast);
		setTimeout(() => {
			toast.style.animation = 'fadeOut 0.3s ease';
			setTimeout(() => toast.remove(), 300);
		}, 2500);
	}

	handleSlotChange() {
		const slot = this.shadowRoot.querySelector("slot");
		const steps = slot ? slot.assignedElements({ flatten: true }) : [];
		this._steps = steps.filter(el => el.classList?.contains("step-panel"));
		this._totalSteps = this._steps.length;
		
		this._steps.forEach(step => {
			const inputs = step.querySelectorAll('input, textarea');
			inputs.forEach(input => {
				input.removeEventListener('input', () => this.updateButtons());
				input.addEventListener('input', () => {
					this.updateButtons();
					input.style.borderColor = '';
					input.style.boxShadow = '';
				});
			});
			
			const completeBtn = step.querySelector('[data-action="complete"]');
			if (completeBtn) {
				completeBtn.removeEventListener('click', () => this.complete());
				completeBtn.addEventListener('click', () => this.complete());
			}
		});
		
		this.renderStepsContainer();
		this.updateVisibility();
		this.updateButtons();
		this.emitUpdate();
	}

	renderStepsContainer() {
		const container = this.shadowRoot.querySelector(".steps-container");
		if (!container) return;
		
		container.innerHTML = this._steps.map((step, index) => {
			const title = step.getAttribute("data-title") || `Paso ${index + 1}`;
			const subtitle = step.getAttribute("data-subtitle") || "";
			const isActive = index === this._currentStep;
			const isCompleted = this._currentStep > index;
			const completedClass = isCompleted ? 'completed' : '';
			return `
				<button class="step-button ${isActive ? 'active' : ''} ${completedClass}" type="button" data-step="${index}" disabled aria-disabled="true" tabindex="-1">
					<span class="step-badge">${index + 1}</span>
					<span class="step-info">
						<span class="step-title">${this.escapeHtml(title)}</span>
						${subtitle ? `<span class="step-subtitle">${this.escapeHtml(subtitle)}</span>` : ""}
					</span>
				</button>
			`;
		}).join("");
	}

	updateVisibility() {
		if (!this._steps) return;
		this._steps.forEach((step, index) => {
			if (index === this._currentStep) {
				step.hidden = false;
				step.style.display = '';
			} else {
				step.hidden = true;
				step.style.display = 'none';
			}
		});
	}

	updateButtons() {
		const prevBtn = this.shadowRoot.querySelector("[data-action='prev']");
		const nextBtn = this.shadowRoot.querySelector("[data-action='next']");
		
		if (prevBtn) prevBtn.disabled = this._currentStep === 0;
		
		const isValid = this.isCurrentStepValid();
		if (nextBtn) {
			nextBtn.disabled = !isValid;
		}
		
		this.renderStepsContainer();
	}

	emitUpdate() {
		const detail = {
			activeStep: this._currentStep,
			totalSteps: this._totalSteps,
			steps: this._steps.map((step, i) => ({
				title: step.getAttribute("data-title") || `Paso ${i + 1}`,
				subtitle: step.getAttribute("data-subtitle") || "",
				isActive: i === this._currentStep,
				isCompleted: i < this._currentStep
			}))
		};
		this.dispatchEvent(new CustomEvent("stepper:update", { detail, bubbles: true }));
	}

	escapeHtml(str) {
		if (!str) return "";
		return str.replace(/[&<>]/g, function(m) {
			if (m === '&') return '&amp;';
			if (m === '<') return '&lt;';
			if (m === '>') return '&gt;';
			return m;
		});
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				@import url('/dist/css/steeper.css');
			</style>
			<div class="stepper-header">
				<div class="steps-container"></div>
			</div>
			<div class="stepper-content">
				<slot></slot>
			</div>
			<div class="stepper-controls">
				<button type="button" data-action="prev">← Anterior</button>
				<button type="button" data-action="next">Siguiente →</button>
			</div>
		`;
	}
}

customElements.define("ui-stepper", UiStepper);