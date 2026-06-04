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
