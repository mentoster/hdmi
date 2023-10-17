const memory = new Int8Array(256);
const registers = {
    eax: 0,
    ebx: 0,
    ecx: 0,
    edx: 0,
    ebp: 0,
    esp: 0,
    eip: 0,
    ZF: 0, // Zero flag
    CF: 0, // Carry flag
    OF: 0  // Overflow flag
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
    document.getElementById('resultOutput').textContent = `
eax: ${registers.eax}
ebx: ${registers.ebx}
ecx: ${registers.ecx}
edx: ${registers.edx}
ebp: ${registers.ebp}
esp: ${registers.esp}
eip: ${registers.eip}
    `;
}

function displayCommandRegister(command) {
    document.getElementById('commandRegister').textContent = `Command: ${command}`;
}

function displayFlags() {
    document.getElementById('flagsOutput').textContent = `ZF: ${registers.ZF} | CF: ${registers.CF} | OF: ${registers.OF}`;
}

function emulate() {
    // Initialize memory and registers

    const inputCode = document.getElementById('inputCode').value.split('\n');
    loadMemoryFromInput(inputCode);

    // Execute each command in sequence
    inputCode.forEach(command => {
        execute(command);
    });


    displayMemory();
    displayRegisters();
    displayFlags();
}

function initRegistersAndMemory() {
    registers.eax = 0;
    registers.ebx = 0;
    registers.ecx = 0;
    registers.edx = 0;
    registers.ebp = 0;
    registers.esp = 0;
    registers.eip = 0;
    memory.fill(0);
}

function changeRegisterValue(register, value) {
    console.log("Changing register value:", register, value);
    switch (register) {
        case 'eax':
            registers.eax = value;
            break;
        case 'ebx':
            registers.ebx = value;
            break;
        case 'ecx':
            registers.ecx = value;
            break;
        case 'edx':
            registers.edx = value;
            break;
        case 'ebp':
            registers.ebp = value;
            break;
        case 'esp':
            registers.esp = value;
            break;
        case 'eip':
            registers.eip = value;
            break;
    }
}
function loadMemoryFromInput(inputCode) {
    let memoryIndex = 10;
    inputCode.forEach(line => {
        const trimmedLine = line.trim(); // Ensure we are working with trimmed lines

        if (trimmedLine.includes('array') && trimmedLine.includes('db')) {
            const data = trimmedLine.split('db')[1].trim().split(',').map(v => parseInt(v.trim()));
            data.forEach(d => memory[memoryIndex++] = d);
        }

        if (trimmedLine.includes('max') && trimmedLine.includes('dd')) {
            const data = trimmedLine.split('dd')[1].trim();
            memory[memoryIndex++] = parseInt(data);
        }
    });
}



let flags = {
    ZF: 0, // Zero Flag
    SF: 0, // Sign Flag (1 if result is negative)
    OF: 0  // Overflow Flag
};

function execute(command) {
    const parts = command.split(' ');

    switch (parts[0]) {
        case 'MOV':
            const [, dest, value] = parts;
            if (dest === 'edx' && value === 'array') {
                changeRegisterValue('edx', 10); // set edx to the start of array
            } else if (dest.includes('[') && dest.includes('max')) {
                const address = 20; // address of max
                memory[address] = isNaN(value) ? registers[value] : parseInt(value);
            } else if (dest.includes('[') && dest.includes('edx')) {
                // This handles commands like "movzx eax, byte [edx]"
                const address = registers.edx;
                if (value === 'byte') {
                    changeRegisterValue(parts[3], memory[address]); // assign value from memory to register
                }
            } else if (registers.hasOwnProperty(dest)) {
                changeRegisterValue(dest, isNaN(value) ? registers[value] : parseInt(value));
            } else if (memory.hasOwnProperty(dest)) {
                memory[dest] = isNaN(value) ? registers[value] : parseInt(value);
            }
            break;

        case 'ADD':
            const [, reg1, reg2] = parts;
            const result = registers[reg1] + registers[reg2];
            if (result > 127) {
                registers.OF = 1;
            } else {
                registers.OF = 0;
            }
            registers[reg1] = result;
            break;


        case 'SUB':
            const [, regSub1, regSub2] = parts;
            if (registers.hasOwnProperty(regSub1) && registers.hasOwnProperty(regSub2)) {
                registers[regSub1] -= registers[regSub2];
            }
            break;

        case 'CMP':
            const [, regCmp1, regCmp2] = parts;
            const value1 = isNaN(regCmp1) ? registers[regCmp1] : parseInt(regCmp1);
            const value2 = isNaN(regCmp2) ? registers[regCmp2] : parseInt(regCmp2);

            if (value1 === value2) {
                registers.ZF = 1;
            } else {
                registers.ZF = 0;
            }
            if (value1 > value2) {
                registers.SF = 0;
            } else {
                registers.SF = 1;
            }
            break;


        case 'JG':
            if (flags.ZF === 0 && flags.SF === 0) {
                // Here you'd implement the logic for jumping to the given label.
                // This requires more comprehensive control over program flow, which is beyond this basic example.
            }
            break;

        case 'JL':
            if (flags.ZF === 0 && flags.SF === 1) {
                // Similarly, jump to label logic should be added.
            }
            break;

        case 'JE':
            if (flags.ZF === 1) {
                // Jump to label logic.
            }
            break;

        case 'FIND_MAX':
            registers.edx = 11;
            registers.ecx = memory[10];
            while (registers.ecx > 0) {
                registers.ebx = memory[registers.edx];
                if (registers.ebx > memory[20]) {
                    memory[20] = registers.ebx;
                }
                registers.edx++;
                registers.ecx--;
            }
            registers.eax = memory[20];
            break;
    }
}
