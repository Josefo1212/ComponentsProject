const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const setActiveTab = (button) => {
	tabButtons.forEach((tabButton) => {
		const isActive = tabButton === button;
		tabButton.classList.toggle("is-active", isActive);
		tabButton.setAttribute("aria-selected", String(isActive));
		tabButton.tabIndex = isActive ? 0 : -1;
	});

	tabPanels.forEach((panel) => {
		const isActive = panel.id === button.getAttribute("aria-controls");
		panel.classList.toggle("is-active", isActive);
		panel.hidden = !isActive;
	});
};

tabButtons.forEach((button) => {
	button.addEventListener("click", () => setActiveTab(button));
});

// Delegated handler: permitir que elementos con `data-target` activen pestañas
document.addEventListener('click', (e) => {
	const el = e.target.closest('[data-target]');
	if (!el) return;
	const targetId = el.dataset.target;
	const targetButton = document.getElementById(targetId);
	if (targetButton) targetButton.click();
});

// También atamos directamente al host `popup-menu` para mayor fiabilidad
const popup = document.querySelector('popup-menu');
if (popup) {
	popup.addEventListener('click', (e) => {
		const el = e.target.closest('[data-target]');
		if (!el) return;
		const btn = document.getElementById(el.dataset.target);
		if (btn) setActiveTab(btn);
	});
}

// Enlace directo para el botón slotted 'Acerca de' si existe
const aboutBtn = document.querySelector('popup-menu > button[data-target="tab-detalle"]');
if (aboutBtn) {
	aboutBtn.addEventListener('click', (e) => {
		e.preventDefault();
		const target = document.getElementById(aboutBtn.dataset.target);
		if (target) target.click();
	});
}

