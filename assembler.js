let memory = {};
let memoryPointer = 0;  // Pointer to track current memory location
let registers = {
    eax: 0,
    ebx: 0,
    ecx: 0,
    edx: 0,
    ebp: 0,
    esp: 0
};
let labelMap = {};
let lines;

function Clear() {
    registers = {   // Reset registers
        eax: 0,
        ebx: 0,
        ecx: 0,
        edx: 0,
        ebp: 0,
        esp: 0
    };
    // clear memory cells
    memory = {};
    memoryPointer = 0;
}

function initEmulator() {
    displayRegisters();
    displayMemory();
}

let logEntryNumber = 1; // Start the log count

function log(message) {
    const logDisplay = document.getElementById('logDisplay');
    const timestamp = new Date().toISOString(); // ISO format: YYYY-MM-DDTHH:MM:SS.sssZ
    logDisplay.innerHTML += `<div><span class="log-number">${logEntryNumber}.</span> <span class="log-timestamp"></span>${message}</div>`;
    logEntryNumber++;
}
function populateMemory(instruction) {
    // Supported data directives
    const directives = ['db', 'dd', 'dw', 'dq'];

    for (let directive of directives) {
        if (instruction.includes(directive)) {
            let parts = instruction.split(directive);
            let variableName = parts[0].trim();  // Extracting the label/variable name
            let values = parts[1].split(',').map(value => parseInt(value.trim()));

            labelMap[variableName] = memoryPointer;  // Store the memory address for the label

            for (let value of values) {
                memory[memoryPointer] = value;
                log(`Saved value ${value} in memory address ${memoryPointer}`);
                memoryPointer++;
            }
            break; // Exit the loop once we've processed the directive
        }
    }
}

function memoryPointerForLabel(label) {
    log(`Looking for label ${label}`);
    // log if error
    if (!labelMap.hasOwnProperty(label)) {
        log(`Error: Label ${label} not found`);
    }
    return labelMap[label];  // If the label doesn't exist, this will return undefined
}
function executeCode() {
    Clear();
    document.getElementById('logDisplay').innerHTML = '';

    let code = document.getElementById('codeInput').value;
    // delete all comments in code assembler
    code = code.replace(/;.*\n/g, "\n");

    sessionStorage.setItem('lastLaunchCode', code); // Save to session storage

    lines = code.split("\n").filter(line => line.trim() !== ''); // removing empty lines

    let index = 0;
    let inDataSection = false;

    while (index < lines.length) {
        let line = lines[index].trim();

        if (line.startsWith('section .data')) {
            inDataSection = true;
            index++;
            continue;
        }

        if (line.startsWith('section .text')) {
            inDataSection = false;
            index++;
            continue;
        }

        if (inDataSection) {
            populateMemory(line);
            index++;
            continue;
        }

        log(`Executing: ${line}`);
        let nextInstruction = executeInstruction(line);
        if (nextInstruction === 'halt') {
            break;
        } else if (typeof nextInstruction === 'number') {
            index = nextInstruction;
        }// exit
        else if (typeof nextInstruction === 'exit') {
            break;
        }
        else {
            index++;
        }
    }
    displayMemory();
    displayRegisters()
}



function findLabelInstructionIndex(label) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === label + ':') {
            log(`Found label ${label} at index ${i}`);
            return i;
        }
    }
    log(`Error: Label ${label} not found`);
    return -1;  // not found (shouldn't happen in well-formed code)
}

function executeInstruction(instruction) {
    // For simplicity, let's handle a few instructions only
    if (instruction.startsWith('mov')) {
        let parts = instruction.split(",");
        let dest = parts[0].split(" ")[1].trim();
        let source = parts[1].trim();

        // Extract memory location, considering possible displacement
        function extractMemoryLocation(memStr) {
            let memLocation = memStr.split('[')[1].split(']')[0].trim();
            let displacement = 0;
            if (memLocation.includes('+')) {
                let [base, offset] = memLocation.split('+');
                memLocation = memoryPointerForLabel(base.trim());
                displacement = parseInt(offset.trim());
            } else if (isNaN(memLocation)) {
                memLocation = memoryPointerForLabel(memLocation);
            }
            return memLocation + displacement;
        }

        // Move byte from memory to register
        if (source.startsWith('byte [') && registers.hasOwnProperty(source.split('[')[1].split(']')[0].trim())) {
            let regName = source.split('[')[1].split(']')[0].trim();
            let memLocation = registers[regName];
            registers[dest] = memory[memLocation];
        }
        // Move value from register to memory
        else if (dest.startsWith('[')) {
            let memLocation = extractMemoryLocation(dest);
            memory[memLocation] = registers[source];
            log(`Moved value from register ${source} to memory address ${memLocation}`);
        }
        // Move value from register to register
        else if (registers.hasOwnProperty(dest) && registers.hasOwnProperty(source)) {
            registers[dest] = registers[source];
        }
        // Move label (address) to register
        else if (registers.hasOwnProperty(dest) && memoryPointerForLabel(source) !== undefined) {
            registers[dest] = memoryPointerForLabel(source);
        }
        // Handle immediate values (e.g., mov eax, 4)
        else if (registers.hasOwnProperty(dest) && !isNaN(source)) {
            registers[dest] = parseInt(source);
        }
        else {
            log('Error: Invalid mov instruction');
        }
    }
    // TODO: Add other instruction handlers here

    else if (instruction.startsWith('add')) {
        let parts = instruction.split(",");
        let dest = parts[0].split(" ")[1].trim();
        let source = parts[1].trim();
        if (source.startsWith('[')) {
            let memLocation = source.split('[')[1].split(']')[0].trim();

            // Check if memLocation is a label (e.g., 'array') or an immediate address
            if (isNaN(memLocation)) { // if memLocation is not a number
                memLocation = memoryPointerForLabel(memLocation);
            }

            memory[memLocation] += registers[dest];
            log(`Added value from register ${dest} to memory address ${memLocation}`);
        }
    }
    else if (instruction.startsWith('sub')) {
        let parts = instruction.split(",");
        let dest = parts[0].split(" ")[1].trim();
        let source = parts[1].trim();
        if (source.startsWith('[')) {
            let memLocation = source.split('[')[1].split(']')[0].trim();

            // Check if memLocation is a label (e.g., 'array') or an immediate address
            if (isNaN(memLocation)) { // if memLocation is not a number
                memLocation = memoryPointerForLabel(memLocation);
            }

            memory[memLocation] -= registers[dest];
            log(`Subtracted value from register ${dest} to memory address ${memLocation}`);
        }
    }
    // inc
    else if (instruction.startsWith('inc')) {
        let parts = instruction.split(",");
        let dest = parts[0].split(" ")[1].trim();
        registers[dest] += 1;
        log(`Incremented value in register ${dest}`);
    }
    // cmp
    else if (instruction.startsWith('cmp')) {
        let parts = instruction.split(",");
        let dest = parts[0].split(" ")[1].trim();
        let source = parts[1].trim();
        if (source.startsWith('[')) {
            let memLocation = source.split('[')[1].split(']')[0].trim();

            // Check if memLocation is a label (e.g., 'array') or an immediate address
            if (isNaN(memLocation)) { // if memLocation is not a number
                memLocation = memoryPointerForLabel(memLocation);
            }

            if (registers[dest] === memory[memLocation]) {
                log(`Register ${dest} is equal to memory address ${memLocation}`);
            } else if (registers[dest] > memory[memLocation]) {
                log(`Register ${dest} is greater than memory address ${memLocation}`);
            } else {
                log(`Register ${dest} is less than memory address ${memLocation}`);
            }
        }
    }
    else if (instruction.startsWith('jnl')) {
        let label = instruction.split(' ')[1];
        if (registers.eax >= registers.ebx) {
            return findLabelInstructionIndex(label);
        }
    } else if (instruction === 'ret') {
        return 'halt';  // halt the execution
    } else if (instruction.startsWith('loop')) {
        registers.ecx--;
        if (registers.ecx > 0) {
            let label = instruction.split(' ')[1];
            return findLabelInstructionIndex(label);
        }
    }
    //end_program
    else if (instruction.startsWith('end_program')) {
        log('Program ended');
        return 'exit';
    }
    // no instruction - error
    else if (instruction.startsWith('')) {
        log('Error: No instruction');
        return 'exit';
    }
}

function displayMemory() {
    let memoryDisplay = document.getElementById('memoryDisplay');
    memoryDisplay.innerHTML = '';

    for (let addr in memory) {
        memoryDisplay.innerHTML += `<div>Address: ${addr}, Value: ${memory[addr]}</div>`;
    }
}

function displayRegisters() {
    let registerDisplay = document.getElementById('registerDisplay');
    registerDisplay.innerHTML = '';

    for (let reg in registers) {
        registerDisplay.innerHTML += `<div>${reg.toUpperCase()}: ${registers[reg]}</div>`;
    }
}

function loadCode() {
    let code = sessionStorage.getItem('lastLaunchCode'); // Load from session storage
    if (code) {
        document.getElementById('codeInput').value = code;
    }
}
