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
