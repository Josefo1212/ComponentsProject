// Delegated handler: permitir que elementos con `data-target` activen pestañas
document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-target]');
    if (!el) return;
    const targetId = el.dataset.target;
    const uiTabs = document.querySelector('ui-tabs');
    if (uiTabs) {
        const cleanId = targetId.startsWith('tab-') ? targetId.replace('tab-', 'panel-') : targetId;
        const panels = uiTabs.getPanels();
        const hasPanel = panels.some(p => p.id === cleanId);
        if (hasPanel) {
            uiTabs.activeTab = cleanId;
        }
    }
});

const stepper = document.querySelector("ui-stepper");
const panelStatus = document.getElementById("panel-status");
const panelSubtitle = document.querySelector(".panel-subtitle");

const normalizeFieldValue = (field) => {
    if (!field) return "";
    const isSensitive = field.type === "password" || field.name === "password" || field.name === "contrasena";
    if (isSensitive) {
        return field.value ? "••••••" : "";
    }
    return field.value || "";
};

// NUEVO: Genera las filas de estado usando nodos puros (Sin innerHTML)
const buildStatusRowsFragment = (detail, currentPanelEl) => {
    const fragment = document.createDocumentFragment();
    const { activeStep, totalSteps, steps } = detail;
    const currentStepData = steps[activeStep] || {};
    const nextStepData = steps[activeStep + 1];

    // 1. OBTENER INFORMACIÓN REAL DEL DOM ACTUAL
    // Validamos si el panel actual tiene inputs vacíos
    let isValid = true;
    let fields = [];

    if (currentPanelEl) {
        const inputs = currentPanelEl.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.type === 'hidden') return;
            const val = input.value?.trim() || '';
            if (val === '') isValid = false;

            // Intentar buscar un label asociado o usar el placeholder/name
            let labelText = input.placeholder || input.name || "Campo";
            const associatedLabel = currentPanelEl.querySelector(`label[for="${input.id}"]`);
            if (associatedLabel) labelText = associatedLabel.textContent;

            fields.push({
                label: labelText,
                value: normalizeFieldValue(input)
            });
        });
    }

    const validLabel = isValid ? "Listo para avanzar" : "Faltan datos";
    const validClass = isValid ? "is-ready" : "is-blocked";
    const activeFields = fields.filter(f => f.value.trim().length > 0);

    // 2. CONSTRUIR GRUPO: PASO ACTUAL
    const groupCurrent = document.createElement("div");
    groupCurrent.className = "status-group";

    const labelCurrent = document.createElement("span");
    labelCurrent.className = "status-label";
    labelCurrent.textContent = "Paso actual";
    groupCurrent.appendChild(labelCurrent);

    const rowCurrent = document.createElement("div");
    rowCurrent.className = "status-row";

    const strongCurrent = document.createElement("strong");
    strongCurrent.textContent = currentStepData.title || "Paso";
    rowCurrent.appendChild(strongCurrent);

    const pillCurrent = document.createElement("span");
    pillCurrent.className = `status-pill ${validClass}`;
    pillCurrent.textContent = validLabel;
    rowCurrent.appendChild(pillCurrent);
    groupCurrent.appendChild(rowCurrent);

    if (currentStepData.subtitle) {
        const captionCurrent = document.createElement("p");
        captionCurrent.className = "status-caption";
        captionCurrent.textContent = currentStepData.subtitle;
        groupCurrent.appendChild(captionCurrent);
    }
    fragment.appendChild(groupCurrent);

    // 3. CONSTRUIR GRUPO: PROGRESO
    const groupProgress = document.createElement("div");
    groupProgress.className = "status-group";

    const labelProgress = document.createElement("span");
    labelProgress.className = "status-label";
    labelProgress.textContent = "Progreso";
    groupProgress.appendChild(labelProgress);

    const captionProgress = document.createElement("p");
    captionProgress.className = "status-caption";
    captionProgress.textContent = `${activeStep + 1} de ${totalSteps} pasos completados.`;
    groupProgress.appendChild(captionProgress);

    if (nextStepData) {
        const captionNext = document.createElement("p");
        captionNext.className = "status-caption";
        captionNext.textContent = `Siguiente: ${nextStepData.title}`;
        groupProgress.appendChild(captionNext);
    }
    fragment.appendChild(groupProgress);

    // 4. CONSTRUIR GRUPO: DATOS CAPTURADOS
    const groupFields = document.createElement("div");
    groupFields.className = "status-group";

    const labelFields = document.createElement("span");
    labelFields.className = "status-label";
    labelFields.textContent = "Datos capturados";
    groupFields.appendChild(labelFields);

    if (activeFields.length > 0) {
        const containerFields = document.createElement("div");
        containerFields.className = "status-fields";

        activeFields.forEach(f => {
            const fieldDiv = document.createElement("div");
            fieldDiv.className = "status-field";

            const spanLabel = document.createElement("span");
            spanLabel.textContent = f.label;
            fieldDiv.appendChild(spanLabel);

            const strongValue = document.createElement("strong");
            strongValue.textContent = f.value;
            fieldDiv.appendChild(strongValue);

            containerFields.appendChild(fieldDiv);
        });
        groupFields.appendChild(containerFields);
    } else {
        const emptyFields = document.createElement("p");
        emptyFields.className = "status-empty";
        emptyFields.textContent = "Todavía no hay información en este paso.";
        groupFields.appendChild(emptyFields);
    }
    fragment.appendChild(groupFields);

    return fragment;
};

// NUEVO: Genera el overview de pasos usando nodos puros (Sin innerHTML)
const buildStepsOverviewFragment = (detail) => {
    const { activeStep, steps } = detail;

    const container = document.createElement("div");
    container.className = "status-steps";

    steps.forEach((step, index) => {
        const status = step.isCompleted || index < activeStep ? "Completado" : index === activeStep ? "En curso" : "Pendiente";
        const statusClass = status === "Completado" ? "is-done" : status === "En curso" ? "is-live" : "";

        const stepDiv = document.createElement("div");
        stepDiv.className = `status-step ${statusClass}`;

        const badge = document.createElement("span");
        badge.className = "status-badge";
        badge.textContent = index + 1;
        stepDiv.appendChild(badge);

        const titleSpan = document.createElement("span");
        titleSpan.textContent = step.title;
        stepDiv.appendChild(titleSpan);

        const emStatus = document.createElement("em");
        emStatus.textContent = status;
        stepDiv.appendChild(emStatus);

        container.appendChild(stepDiv);
    });

    return container;
};

const renderPanel = (detail) => {
    if (!panelStatus || !detail) return;

    // Conseguir el elemento real del panel correspondiente al paso actual del componente
    let currentPanelEl = null;
    if (stepper && stepper._steps) {
        currentPanelEl = stepper._steps[detail.activeStep];
    }

    const summaryFragment = buildStatusRowsFragment(detail, currentPanelEl);
    const stepsOverviewEl = buildStepsOverviewFragment(detail);

    // Limpieza segura del contenedor principal
    while (panelStatus.firstChild) {
        panelStatus.removeChild(panelStatus.firstChild);
    }

    // Volcado de los fragmentos y elementos clonados
    panelStatus.appendChild(summaryFragment);
    panelStatus.appendChild(stepsOverviewEl);

    if (panelSubtitle) {
        panelSubtitle.textContent = detail.reason === "complete"
            ? "El último paso fue confirmado."
            : "Resumen del estado actual.";
    }
};

if (stepper) {
    stepper.addEventListener("stepper:update", (event) => {
        renderPanel(event.detail);
    });

    // En lugar de esperar un frame completo, ejecutamos en el microtask queue
    // para que el panel lateral se sincronice en el mismo ciclo de renderizado.
    queueMicrotask(() => {
        if (typeof stepper.emitUpdate === "function") {
            stepper.emitUpdate();
        }
    });
}