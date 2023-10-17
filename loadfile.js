function loadCodeFromFile() {
    const fileInput = document.getElementById('fileInput');
    const codeInput = document.getElementById('codeInput');

    if (fileInput.files.length === 0) {
        log('No file selected.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        codeInput.value = event.target.result;
    };

    reader.onerror = function () {
        log('Error reading file.');
    };

    reader.readAsText(file);
}
