// 1. Plantilla estática en memoria para la estructura base del Shadow DOM
const tabsTemplate = document.createElement('template');
tabsTemplate.innerHTML = `
    <link rel="stylesheet" href="../css/tab.css">
    <div class="tabs-header">
        <div class="tabs-buttons"></div>
    </div>
    <div class="tabs-content">
        <slot></slot>
    </div>
`;

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

        if (this.shadowRoot.children.length > 0) {
            return;
        }

        this.shadowRoot.appendChild(
            tabsTemplate.content.cloneNode(true)
        );
        
        this.slotElement = this.shadowRoot.querySelector("slot");
        if (this.slotElement) {
            this.slotElement.addEventListener("slotchange", this.handleSlotChange);
        }
        this.handleSlotChange();
        
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
            this.moveIndicator();
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
            btn.classList.toggle("active", isActive);
        });
    }

    moveIndicator() {
        const activeBtn = this.shadowRoot.querySelector(".tab-btn.active");
        const indicator = this.shadowRoot.querySelector(".tab-indicator");
        
        if (activeBtn && indicator) {
            const left = activeBtn.offsetLeft;
            const width = activeBtn.offsetWidth;
            
            indicator.style.width = `${width}px`;
            indicator.style.transform = `translateX(${left}px)`;
        }
    }

    renderButtons() {
        const container = this.shadowRoot.querySelector(".tabs-buttons");
        if (!container) return;

        const panels = this.getPanels();
        const fragment = document.createDocumentFragment();

        // 2. Creación dinámica de elementos mediante nodos puros de JS
        panels.forEach(panel => {
            const title = panel.getAttribute("data-tab-title") || panel.id;
            const isActive = panel.id === this.activeTab;

            const btn = document.createElement("button");
            btn.className = `tab-btn ${isActive ? 'active' : ''}`;
            btn.setAttribute("data-panel-id", panel.id);
            btn.textContent = title; // Sanitización nativa por asignación directa

            btn.addEventListener("click", () => {
                this.activeTab = btn.getAttribute("data-panel-id");
            });

            fragment.appendChild(btn);
        });

        // Añadir el indicador visual deslizante al final de la cabecera
        const indicator = document.createElement("div");
        indicator.className = "tab-indicator";
        fragment.appendChild(indicator);

        // Limpieza y volcado seguro del fragmento al DOM
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(fragment);

        requestAnimationFrame(() => this.moveIndicator());
    }
}

customElements.define("ui-tabs", UiTabs);