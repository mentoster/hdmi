const memory = new Int8Array(256);
const registers = {
    eax: 0,
    ebx: 0,
    ecx: 0,
    edx: 0,
    ebp: 0,
    esp: 0,
    eip: 0
};

function displayMemory() {
    let str = '';
    for (let i = 0; i < memory.length; i++) {
        str += `${memory[i].toString().padStart(4, ' ')} `;
        if ((i + 1) % 16 === 0) {
            str += '\n';
        }
    }
    document.getElementById('memoryOutput').textContent = str;
}
function displayRegisters() {
    document.getElementById('resultOutput').textContent = `eax: ${registers.eax}`;
}
function emulate() {
    // Initialize memory and registers
    registers.eax = 0;
    registers.ebx = 0;
    registers.ecx = 0;
    registers.edx = 0;
    registers.ebp = 0;
    registers.esp = 0;
    registers.eip = 0;

    memory.fill(0);
    const inputCode = document.getElementById('inputCode').value.split('\n');

    // Load the provided data into the memory (starting from index 10 for simplicity)
    let memoryIndex = 10;
    inputCode.forEach(line => {
        if (line.includes('db')) {
            const data = line.split('db')[1].trim().split(',').map(v => parseInt(v.trim()));
            for (let d of data) {
                memory[memoryIndex++] = d;
            }
        }
        if (line.includes('dd')) {
            const data = line.split('dd')[1].trim();
            memory[memoryIndex++] = parseInt(data);
        }
    });

    registers.edx = 11; // Point to the first element after the array size
    registers.ecx = memory[10]; // Set the loop count to the size of the array

    while (registers.ecx > 0) {
        registers.ebx = memory[registers.edx];
        if (registers.ebx > memory[20]) { // Assuming 'max' is at memory index 20
            memory[20] = registers.ebx;
        }
        registers.edx++;
        registers.ecx--;
    }
    registers.eax = memory[20];  // Load the maximum value to eax after finding it

    displayMemory();
    displayRegisters();
}
