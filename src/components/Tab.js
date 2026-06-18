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
        if (this.slotElement) {
            this.slotElement.addEventListener("slotchange", this.handleSlotChange);
        }
        this.handleSlotChange();
        
        // Ajustar la barra si la ventana cambia de tamaño (diseño responsive)
        window.addEventListener('resize', () => this.moveIndicator());
    }

    disconnectedCallback() {
        if (this.slotElement) {
            this.slotElement.removeEventListener("slotchange", this.handleSlotChange);
        }
        window.removeEventListener('resize', () => this.moveIndicator());
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "active-tab" && oldValue !== newValue) {
            this.updateVisibility(newValue);
            this.updateButtons(newValue);
            this.moveIndicator(); // Deslizar la barra al cambiar el atributo
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
            .filter(el => el.classList?.contains("tab-panel"));
    }

    handleSlotChange() {
        const panels = this.getPanels();
        if (!this.activeTab && panels.length > 0) {
            this.activeTab = panels[0].id;
        }
        this.updateVisibility(this.activeTab);
        this.renderButtons();
    }

    updateVisibility(activeId) {
        const panels = this.getPanels();
        panels.forEach(panel => {
            const isActive = panel.id === activeId;
            panel.hidden = !isActive;
        });
    }

    updateButtons(activeId) {
        const buttons = this.shadowRoot.querySelectorAll(".tab-btn");
        buttons.forEach(btn => {
            const isActive = btn.getAttribute("data-panel-id") === activeId;
            if (isActive) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    /* --- ESTA FUNCIÓN HACE LA MAGIA DEL DESLIZAMIENTO --- */
    moveIndicator() {
        const activeBtn = this.shadowRoot.querySelector(".tab-btn.active");
        const indicator = this.shadowRoot.querySelector(".tab-indicator");
        
        if (activeBtn && indicator) {
            // Calculamos la posición izquierda del botón y su ancho físico real
            const left = activeBtn.offsetLeft;
            const width = activeBtn.offsetWidth;
            
            // Le aplicamos el estilo inline para activar la animación de CSS
            indicator.style.width = `${width}px`;
            indicator.style.transform = `translateX(${left}px)`;
        }
    }

    renderButtons() {
        const container = this.shadowRoot.querySelector(".tabs-buttons");
        if (!container) return;

        const panels = this.getPanels();
        
        // Renderizamos los botones e inyectamos la etiqueta del indicador al final
        container.innerHTML = panels.map(panel => {
            const title = panel.getAttribute("data-tab-title") || panel.id;
            const isActive = panel.id === this.activeTab;
            return `
                <button class="tab-btn ${isActive ? 'active' : ''}" data-panel-id="${panel.id}">
                    ${this.escapeHtml(title)}
                </button>
            `;
        }).join("") + `<div class="tab-indicator"></div>`; // <-- Aquí se aloja la barrita única

        const buttons = container.querySelectorAll(".tab-btn");
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeTab = btn.getAttribute("data-panel-id");
            });
        });

        // Un pequeño delay para esperar que el DOM calcule los tamaños iniciales al cargar
        requestAnimationFrame(() => this.moveIndicator());
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
                @import url('../css/tab.css');
            </style>
            <div class="tabs-header">
                <div class="tabs-buttons"></div>
            </div>
            <div class="tabs-content">
                <slot></slot>
            </div>
        `;
    }
}

customElements.define("ui-tabs", UiTabs);