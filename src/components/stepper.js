// 1. Plantilla estática en memoria para la estructura base del Shadow DOM
const stepperTemplate = document.createElement('template');
stepperTemplate.innerHTML = `
    <link rel="stylesheet" href="../css/steeper.css">
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
        console.log("connectedCallback");

    if (this.shadowRoot.children.length > 0) {
        return;
    }

    this.shadowRoot.appendChild(
        stepperTemplate.content.cloneNode(true)
    );

    this.slotElement = this.shadowRoot.querySelector("slot");

    if (this.slotElement) {
        this.slotElement.addEventListener(
            "slotchange",
            this.handleSlotChange
        );
    }

    const prevBtn =
        this.shadowRoot.querySelector("[data-action='prev']");

    const nextBtn =
        this.shadowRoot.querySelector("[data-action='next']");

    if (prevBtn)
        prevBtn.addEventListener("click", () => this.previous());

    if (nextBtn)
        nextBtn.addEventListener("click", () => this.next());

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
        console.log("activeStep", value);
        const newStep = Math.max(0, Math.min(value, this._totalSteps - 1));
        if (newStep !== this._currentStep && !this._isTransitioning) {
            this._isTransitioning = true;
            
            const currentPanel = this._steps[this._currentStep];
            if (currentPanel) {
                currentPanel.style.animation = 'slideFadeOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            }
            
            setTimeout(() => {
                this._currentStep = newStep;
                this.updateVisibility();
                this.updateButtonsState();
                this.emitUpdate();
                
                const newPanel = this._steps[this._currentStep];
                if (newPanel) {
    				newPanel.hidden = false;
    				newPanel.style.display = 'flex';

    				requestAnimationFrame(() => {
        					if (newPanel.dataset.animated !== "true") {
							newPanel.style.animation =
									'slideFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
							newPanel.dataset.animated = "true";
						}
    				});
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
        toast.className = `stepper-toast ${color === '#00cc66' ? 'toast-success' : 'toast-error'}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('is-exiting');
            setTimeout(() => toast.remove(), 500);
        }, 2800);
    }
    
    handleSlotChange() {

    console.log("handleSlotChange");

    if (this._initialized) {
        console.log("slotchange ignorado");
        return;
    }

    this._initialized = true;

    const slot = this.shadowRoot.querySelector("slot");
    const steps = slot
        ? slot.assignedElements({ flatten: true })
        : [];

    this._steps = steps.filter(
        el => el.classList?.contains("step-panel")
    );

    this._totalSteps = this._steps.length;

    this._steps.forEach(step => {

        step.style.flexDirection = 'column';
        step.style.gap = 'var(--space-2xl)';

        const inputs = step.querySelectorAll('input, textarea');

        inputs.forEach(input => {

            input.__stepperInputHandler = () => {
                this.updateButtonsState();
                input.classList.remove('input-error');
            };

            input.addEventListener(
                'input',
                input.__stepperInputHandler
            );
        });
    });

    this.renderStepsContainer();
    this.updateVisibility();
    this.updateButtonsState();
    this.emitUpdate();
}
    renderStepsContainer() {
        console.log("renderStepsContainer");
        const container = this.shadowRoot.querySelector(".steps-container");
        if (!container) return;
        
        const fragment = document.createDocumentFragment();

        this._steps.forEach((step, index) => {
            const title = step.getAttribute("data-title") || `Paso ${index + 1}`;
            const subtitle = step.getAttribute("data-subtitle") || "";
            const isActive = index === this._currentStep;
            const isCompleted = this._currentStep > index;

            const btn = document.createElement("button");
            btn.className = `step-button ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
            btn.type = "button";
            btn.setAttribute("data-step", index);
            btn.setAttribute("data-title", title);
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.setAttribute("tabindex", "-1");

            const badge = document.createElement("span");
            badge.className = "step-badge";
            badge.textContent = index + 1;
            btn.appendChild(badge);

            const info = document.createElement("span");
            info.className = "step-info";

            const titleSpan = document.createElement("span");
            titleSpan.className = "step-title";
            titleSpan.textContent = title;
            info.appendChild(titleSpan);

            if (subtitle) {
                const subtitleSpan = document.createElement("span");
                subtitleSpan.className = "step-subtitle";
                subtitleSpan.textContent = subtitle;
                info.appendChild(subtitleSpan);
            }

            btn.appendChild(info);
            fragment.appendChild(btn);
        });

        // Limpieza y renderizado libre de innerHTML
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(fragment);
    }

    updateButtonsState() {
        const stepButtons = this.shadowRoot.querySelectorAll(".step-button");
        const prevBtn = this.shadowRoot.querySelector("[data-action='prev']");
        const nextBtn = this.shadowRoot.querySelector("[data-action='next']");
        
        if (prevBtn) prevBtn.disabled = this._currentStep === 0;
        
        const isValid = this.isCurrentStepValid();
        if (nextBtn) {
            nextBtn.disabled = !isValid;
        }
        
        stepButtons.forEach((btn, index) => {
            const isActive = index === this._currentStep;
            const isCompleted = this._currentStep > index;
            
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('completed', isCompleted);
        });
    }

  updateVisibility() {
    console.log("updateVisibility", Date.now());

    if (!this._steps) return;

    this._steps.forEach((step, index) => {

        const isActive = index === this._currentStep;

        if (isActive) {

            step.hidden = false;
            step.style.display = "flex";

        } else {

            step.hidden = true;
            step.style.display = "none";
        }
    });
}

    emitUpdate() {
        console.log("emitUpdate");
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
}

customElements.define("ui-stepper", UiStepper);