function initSettings() {
    const repairSlider = document.getElementById('repair-time-slider');
    if (repairSlider) {
        repairSlider.addEventListener('input', (e) => {
            const bubble = e.target.closest('.sn-slider-group').querySelector('.sn-value-bubble');
            bubble.textContent = `${e.target.value} Hours`;
        });
    }
    const tabs = document.querySelectorAll('.sn-tab-link');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}