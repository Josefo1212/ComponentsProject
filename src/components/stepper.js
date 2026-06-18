class UiStepper extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.handleSlotChange = this.handleSlotChange.bind(this);
		this._currentStep = 0;
		this._totalSteps = 0;
		this._steps = [];
		this._isTransitioning = false;
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
		if (newStep !== this._currentStep && !this._isTransitioning) {
			this._isTransitioning = true;
			
			// Ocultar panel actual con animación de salida
			const currentPanel = this._steps[this._currentStep];
			if (currentPanel) {
				currentPanel.style.animation = 'slideFadeOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
			}
			
			// Esperar a que termine la animación de salida
			setTimeout(() => {
				this._currentStep = newStep;
				this.updateVisibility();
				this.updateButtonsState();
				this.emitUpdate();
				
				// Mostrar nuevo panel con animación de entrada
				const newPanel = this._steps[this._currentStep];
				if (newPanel) {
					newPanel.style.display = 'flex';
					newPanel.hidden = false;
					newPanel.style.animation = 'none';
					// Forzar reflow
					void newPanel.offsetHeight;
					newPanel.style.animation = 'slideFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
				}
				
				this._isTransitioning = false;
			}, 500);
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
				input.classList.add('input-error');
				setTimeout(() => {
					input.classList.remove('input-error');
				}, 1500);
			}
		});
		
		return allFilled;
	}

	next() {
		if (this._currentStep < this._totalSteps - 1 && !this._isTransitioning) {
			if (this.isCurrentStepValid()) {
				const nextBtn = this.shadowRoot.querySelector("[data-action='next']");
				if (nextBtn) {
					nextBtn.classList.add('clicked');
					setTimeout(() => {
						nextBtn.classList.remove('clicked');
					}, 700);
				}
				this.activeStep = this._currentStep + 1;
			} else {
				this.showToast('Completa todos los campos antes de continuar', '#ff4444');
			}
		}
	}

	previous() {
		if (this._currentStep > 0 && !this._isTransitioning) {
			const prevBtn = this.shadowRoot.querySelector("[data-action='prev']");
			if (prevBtn) {
				prevBtn.classList.add('clicked');
				setTimeout(() => {
					prevBtn.classList.remove('clicked');
				}, 700);
			}
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
		toast.classList.add('stepper-toast');
		toast.classList.add(color === '#00cc66' ? 'toast-success' : 'toast-error');
		document.body.appendChild(toast);
		setTimeout(() => {
			toast.classList.add('is-exiting');
			setTimeout(() => toast.remove(), 500);
		}, 2800);
	}

	handleSlotChange() {
		const slot = this.shadowRoot.querySelector("slot");
		const steps = slot ? slot.assignedElements({ flatten: true }) : [];
		this._steps = steps.filter(el => el.classList?.contains("step-panel"));
		this._totalSteps = this._steps.length;
		
		this._steps.forEach(step => {
			step.style.display = 'flex';
			step.style.flexDirection = 'column';
			step.style.gap = 'var(--space-2xl)';
			
			const inputs = step.querySelectorAll('input, textarea');
			inputs.forEach(input => {
				if (input.__stepperInputHandler) {
					input.removeEventListener('input', input.__stepperInputHandler);
				}
				input.__stepperInputHandler = () => {
					// Solo actualizar el estado de los botones, NO re-renderizar
					this.updateButtonsState();
					input.classList.remove('input-error');
				};
				input.addEventListener('input', input.__stepperInputHandler);
			});
			
			const completeBtn = step.querySelector('[data-action="complete"]');
			if (completeBtn) {
				if (completeBtn.__stepperCompleteHandler) {
					completeBtn.removeEventListener('click', completeBtn.__stepperCompleteHandler);
				}
				completeBtn.__stepperCompleteHandler = () => this.complete();
				completeBtn.addEventListener('click', completeBtn.__stepperCompleteHandler);
			}
		});
		
		this.renderStepsContainer();
		this.updateVisibility();
		this.updateButtonsState();
		this.emitUpdate();
	}

	renderStepsContainer() {
		const container = this.shadowRoot.querySelector(".steps-container");
		if (!container) return;
		
		// Guardar referencia a los botones actuales para no recrearlos innecesariamente
		container.innerHTML = this._steps.map((step, index) => {
			const title = step.getAttribute("data-title") || `Paso ${index + 1}`;
			const subtitle = step.getAttribute("data-subtitle") || "";
			const isActive = index === this._currentStep;
			const isCompleted = this._currentStep > index;
			const completedClass = isCompleted ? 'completed' : '';
			return `
				<button class="step-button ${isActive ? 'active' : ''} ${completedClass}" 
				        type="button" 
				        data-step="${index}" 
				        data-title="${this.escapeHtml(title)}"
				        disabled 
				        aria-disabled="true" 
				        tabindex="-1">
					<span class="step-badge">${index + 1}</span>
					<span class="step-info">
						<span class="step-title">${this.escapeHtml(title)}</span>
						${subtitle ? `<span class="step-subtitle">${this.escapeHtml(subtitle)}</span>` : ""}
					</span>
				</button>
			`;
		}).join("");
	}

	// NUEVO: Solo actualiza el estado de los botones sin re-renderizar
	updateButtonsState() {
		const stepButtons = this.shadowRoot.querySelectorAll(".step-button");
		const prevBtn = this.shadowRoot.querySelector("[data-action='prev']");
		const nextBtn = this.shadowRoot.querySelector("[data-action='next']");
		
		if (prevBtn) prevBtn.disabled = this._currentStep === 0;
		
		const isValid = this.isCurrentStepValid();
		if (nextBtn) {
			nextBtn.disabled = !isValid;
		}
		
		// Actualizar clases de los botones sin recrearlos
		stepButtons.forEach((btn, index) => {
			const isActive = index === this._currentStep;
			const isCompleted = this._currentStep > index;
			
			btn.classList.toggle('active', isActive);
			btn.classList.toggle('completed', isCompleted);
		});
	}

	updateVisibility() {
		if (!this._steps) return;
		this._steps.forEach((step, index) => {
			if (index === this._currentStep) {
				step.hidden = false;
				step.style.display = 'flex';
				step.style.flexDirection = 'column';
				step.style.gap = 'var(--space-2xl)';
				if (!step.dataset.initialized) {
					step.dataset.initialized = 'true';
					step.style.animation = 'slideFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
				}
			} else {
				step.hidden = true;
				step.style.display = 'none';
				step.style.animation = '';
			}
		});
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
				@import url('../css/steeper.css');
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