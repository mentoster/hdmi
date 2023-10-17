document.addEventListener('DOMContentLoaded', function () {
    const codeInput = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');

    codeInput.addEventListener('input', updateLineNumbers);
    codeInput.addEventListener('scroll', function () {
        // Sync the scroll position
        lineNumbers.scrollTop = codeInput.scrollTop;
    });

    function updateLineNumbers() {
        const lines = codeInput.value.split('\n').length;
        lineNumbers.textContent = '';
        for (let i = 1; i <= lines; i++) {
            lineNumbers.textContent += i + '\n';
        }
    }

    // Initial line numbering
    updateLineNumbers();
});
