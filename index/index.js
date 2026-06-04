const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const activatePanel = (panel) => {
	if (!panel) return;
	panel.hidden = false;
	panel.classList.remove("is-leaving");
	panel.setAttribute("aria-hidden", "false");
	requestAnimationFrame(() => {
		panel.classList.add("is-active");
	});
};

const deactivatePanel = (panel) => {
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
};

const setActiveTab = (button) => {
	const targetId = button.getAttribute("aria-controls");
	const nextPanel = tabPanels.find((panel) => panel.id === targetId);
	const currentPanel = tabPanels.find((panel) => panel.classList.contains("is-active"));
	if (nextPanel === currentPanel) {
		return;
	}

	tabButtons.forEach((tabButton) => {
		const isActive = tabButton === button;
		tabButton.classList.toggle("is-active", isActive);
		tabButton.setAttribute("aria-selected", String(isActive));
		tabButton.tabIndex = isActive ? 0 : -1;
	});

	if (currentPanel) {
		deactivatePanel(currentPanel);
	}
	activatePanel(nextPanel);
};

tabButtons.forEach((button) => {
	button.addEventListener("click", () => setActiveTab(button));
});

tabPanels.forEach((panel) => {
	const isActive = panel.classList.contains("is-active");
	panel.hidden = !isActive;
	panel.setAttribute("aria-hidden", String(!isActive));
});

// Delegated handler: permitir que elementos con `data-target` activen pestañas
document.addEventListener('click', (e) => {
	const el = e.target.closest('[data-target]');
	if (!el) return;
	const targetId = el.dataset.target;
	const targetButton = document.getElementById(targetId);
	if (targetButton) targetButton.click();
});

const stepper = document.querySelector("ui-stepper");
const panelStatus = document.getElementById("panel-status");
const panelSubtitle = document.querySelector(".panel-subtitle");

const escapeHtml = (value) => {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
};

const normalizeFieldValue = (field) => {
	if (!field) return "";
	const isSensitive = field.type === "password" || field.name === "password" || field.name === "contrasena";
	if (isSensitive) {
		return field.value ? "••••••" : "";
	}
	return field.value || "";
};

const buildStatusRows = (detail) => {
	const { activeStep, totalSteps, steps } = detail;
	const current = steps[activeStep] || {};
	const next = steps[activeStep + 1];
	const validLabel = current.isValid ? "Listo para avanzar" : "Faltan datos";
	const validClass = current.isValid ? "is-ready" : "is-blocked";

	const fields = (current.fields || [])
		.map((field) => ({
			label: field.label || "Campo",
			value: normalizeFieldValue(field),
		}))
		.filter((field) => field.value.trim().length > 0);

	const fieldMarkup = fields.length
		? `
			<div class="status-group">
				<span class="status-label">Datos capturados</span>
				<div class="status-fields">
					${fields
						.map(
							(field) => `
								<div class="status-field">
									<span>${escapeHtml(field.label)}</span>
									<strong>${escapeHtml(field.value)}</strong>
								</div>
							`
						)
						.join("")}
				</div>
			</div>
		`
		: `
			<div class="status-group">
				<span class="status-label">Datos capturados</span>
				<p class="status-empty">Todavia no hay informacion en este paso.</p>
			</div>
		`;

	return `
		<div class="status-group">
			<span class="status-label">Paso actual</span>
			<div class="status-row">
				<strong>${escapeHtml(current.title || "Paso")}</strong>
				<span class="status-pill ${validClass}">${validLabel}</span>
			</div>
			${current.subtitle ? `<p class="status-caption">${escapeHtml(current.subtitle)}</p>` : ""}
		</div>
		<div class="status-group">
			<span class="status-label">Progreso</span>
			<p class="status-caption">${activeStep + 1} de ${totalSteps} pasos completados.</p>
			${next ? `<p class="status-caption">Siguiente: ${escapeHtml(next.title)}</p>` : ""}
		</div>
		${fieldMarkup}
	`;
};

const buildStepsOverview = (detail) => {
	const { activeStep, steps } = detail;
	return `
		<div class="status-steps">
			${steps
				.map((step, index) => {
					const status = step.isComplete || index < activeStep ? "Completado" : index === activeStep ? "En curso" : "Pendiente";
					const statusClass = status === "Completado" ? "is-done" : status === "En curso" ? "is-live" : "";
					return `
						<div class="status-step ${statusClass}">
							<span class="status-badge">${index + 1}</span>
							<span>${escapeHtml(step.title)}</span>
							<em>${status}</em>
						</div>
					`;
				})
				.join("")}
		</div>
	`;
};

const renderPanel = (detail) => {
	if (!panelStatus || !detail) return;
	const summary = buildStatusRows(detail);
	const stepsOverview = buildStepsOverview(detail);
	panelStatus.innerHTML = `${summary}${stepsOverview}`;

	if (panelSubtitle) {
		panelSubtitle.textContent = detail.reason === "complete"
			? "El ultimo paso fue confirmado."
			: "Resumen del estado actual.";
	}
};

if (stepper) {
	stepper.addEventListener("stepper:update", (event) => {
		renderPanel(event.detail);
	});
	if (typeof stepper.emitStatus === "function") {
		stepper.emitStatus("init");
	}
}
