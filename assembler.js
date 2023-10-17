let memory = {},
    memoryPointer = 0,
    labelMap = {},
    lines;

// Adding new components
let battery = 100;  // assuming battery level can be between 0 to 100.
let commandCounter = 0;  // to keep track of the number of commands executed
let commandRegister = { machineCode: '', assembler: '' };
let flagRegister = { ZF: 0, SF: 0, OF: 0 };  // assuming Zero, Sign, and Overflow flags for simplicity

let registers = {
    eax: 0, ebx: 0, ecx: 0, edx: 0, ebp: 0, esp: 0,
    counter: 0
};

// Функция для очистки регистров и памяти.
function Clear() {
    registers = { eax: 0, ebx: 0, ecx: 0, edx: 0, ebp: 0, esp: 0, counter: 0 };
    memory = {};
    memoryPointer = 0;

    // Resetting new components
    battery = 100;
    counter = 0;
    commandCounter = 0;
    commandRegister = { machineCode: '', assembler: '' };
    flagRegister = { ZF: 0, SF: 0, OF: 0 };
}


// Номер записи журнала для функции log.
let logEntryNumber = 1;

// Функция для вывода сообщений в журнал.
function log(message) {
    document.getElementById('logDisplay').innerHTML += `<div><span class="log-number">${logEntryNumber++}.</span> ${message}</div>`;
}

// Функция для наполнения памяти инструкциями.
function populateMemory(instruction) {
    const directives = ['db', 'dd', 'dw', 'dq'];

    for (let dir of directives) {
        if (!instruction.includes(dir)) continue;

        let [varName, data] = instruction.split(dir).map(part => part.trim());

        let values = data.split(',').map(val => parseInt(val.trim()));

        labelMap[varName] = memoryPointer;

        for (let value of values) {
            log(`Сохранено значение ${value} в адресе памяти ${memoryPointer}`);
            memory[memoryPointer++] = value;
        }
        break;
    }
}

/**
 * Возвращает указатель памяти для данной метки.
 *
 * @param {string} label - Метка, для которой требуется указатель памяти.
 * @returns {number} Указатель памяти для метки.
 */
function memoryPointerForLabel(label) {
    log(`Поиск label ${label}`);
    if (!labelMap[label]) log(`Ошибка: Label ${label} не найден`);
    return labelMap[label];
}

/**
 * Выполняет код, введенный пользователем.
 *
 * 1. Очищает память и регистры.
 * 2. Удаляет комментарии из введенного кода.
 * 3. Сохраняет код в сессии.
 * 4. Выполняет инструкции построчно.
 */
function executeCode() {
    // Очистка данных перед началом выполнения
    Clear();
    document.getElementById('logDisplay').innerHTML = '';

    // Получение кода из текстового поля
    let code = document.getElementById('codeInput').value;

    // Удаление всех комментариев из кода ассемблера
    code = code.replace(/;.*\n/g, "\n");

    // Сохранение кода в сессионном хранилище
    sessionStorage.setItem('lastLaunchCode', code);

    // Разделение кода на строки и удаление пустых строк
    lines = code.split("\n").filter(line => line.trim() !== '');

    let inDataSection = false;

    while (commandCounter < lines.length) {
        let line = lines[commandCounter].trim();

        // Обработка раздела данных
        if (line.startsWith('section .data')) {
            inDataSection = true;
            commandCounter++;
            continue;
        }

        // Обработка текстового раздела
        if (line.startsWith('section .text')) {
            inDataSection = false;
            commandCounter++;
            continue;
        }
        // if line contains : then it is a label and continue
        if (line.includes(':')) {
            commandCounter++;
            continue;
        }

        // Если находимся в разделе данных
        if (inDataSection) {
            populateMemory(line);
            commandCounter++;
            continue;
        }

        // Выполнение инструкции
        log(`Запуск: ${line}`);

        commandRegister.assembler = line;
        // Assuming a function to convert assembler instruction to machine code
        commandRegister.machineCode = convertToMachineCode(line);
        let nextInstruction = executeInstruction(line);

        if (nextInstruction === 'halt' || typeof nextInstruction === 'exit') {
            break;
        } else if (typeof nextInstruction === 'number') {
            commandCounter = nextInstruction;
        } else {
            commandCounter++;
        }
        battery -= 0.5;  // assuming each instruction consumes 1% battery
    }

    displayMemory();
    displayRegisters();
}



function findLabelInstructionIndex(label) {
    let index = lines.findIndex(line => line.trim() === label + ':');
    log(index !== -1 ? `Найден label ${label} на индексе ${index}` : `Ошибка: Label ${label} не найден`);
    return index;
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
        else if (dest.startsWith('[') && !isNaN(source)) {
            let memLocation = extractMemoryLocation(dest);
            memory[memLocation] = parseInt(source);
            log(`Moved value ${source} to memory address ${memLocation}`);
        }
        else if (dest.startsWith('[')) {
            let memLocation = extractMemoryLocation(dest);
            memory[memLocation] = registers[source];
            log(`Передвинуто значение из ${source} в адресс ${memLocation}`);
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
            log('Ошибка: неправильная mov команда');
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
        log(`Увеличено значение в регистре ${dest}`);
    }
    // cmp
    else if (instruction.startsWith('cmp')) {
        flagRegister.ZF = 0; // clear Zero Flag before comparison

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
                log(`Регистр ${dest} равен адресу ${memLocation}`);
                flagRegister.ZF = 1;  // Zero Flag set

            } else if (registers[dest] > memory[memLocation]) {
                log(`Регистр ${dest} выше чем адрес  ${memLocation}`);
                flagRegister.SF = 0;  // Sign Flag cleared

            } else {
                log(`Регистр ${dest} меньше, чем адрес  ${memLocation}`);
                flagRegister.SF = 1;  // Sign Flag set

            }
        }
    }
    else if (instruction.startsWith('jnl')) {
        let label = instruction.split(' ')[1];
        if (flagRegister.ZF === 1 || flagRegister.SF === 0) {  // If Zero Flag is set or Sign Flag is cleared
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
        log('Программа закончена');
        return 'exit';
    }
    // no instruction - error
    else if (instruction.startsWith('')) {
        log('Ошибка: Нет такой команды');
        return 'exit';
    }
}
function convertToMachineCode(instruction) {
    // Define a mapping between assembler mnemonics and machine code
    const instructionMap = {
        "mov": "01",
        "add": "02",
        "sub": "03",
        "inc": "04",
        "cmp": "05",
        "jnl": "06",
        "loop": "07",
        "ret": "08",
        // ... add more as needed ...
    };

    // Extract the mnemonic from the instruction
    const mnemonic = instruction.split(" ")[0];

    // Check if the mnemonic exists in the mapping
    if (instructionMap[mnemonic]) {
        return instructionMap[mnemonic] + " " + extractOperands(instruction);
    } else {
        console.warn(`Warning: Unknown mnemonic '${mnemonic}'`);
        return "FF";  // Let's assume "FF" is an unknown instruction code
    }
}

// Helper function to extract operands and convert them to a machine code representation
function extractOperands(instruction) {
    // For simplicity, let's assume that registers are mapped to numbers
    const registerMap = {
        "eax": "A1",
        "ebx": "B2",
        "ecx": "C3",
        "edx": "D4",
        "ebp": "E5",
        "esp": "F6",
        // ... add more as needed ...
    };

    const parts = instruction.split(" ");
    if (parts.length <= 1) return "";

    const operands = parts.slice(1).join(" ").split(",");

    return operands.map(op => {
        op = op.trim();
        if (registerMap[op]) {
            return registerMap[op];
        } else if (!isNaN(op)) { // If it's a number
            return parseInt(op).toString(16).toUpperCase(); // Convert to hex for simplicity
        } else if (op.startsWith('[') && op.endsWith(']')) {
            // For memory references, just return the hex representation of the label or register
            const memRef = op.slice(1, -1).trim();
            return registerMap[memRef] || memRef;
        } else {
            return op;  // For labels or other operands, return as-is for now
        }
    }).join(" ");
}
const updateDisplay = (elementId, items, format) => {
    document.getElementById(elementId).innerHTML = Object.entries(items)
        .map(format)
        .join('');
};

const displayMemory = () => updateDisplay('memoryDisplay', memory,
    ([addr, value]) => `<div>адрес: ${addr}, значение: ${value}</div>`);

const displayRegisters = () => {
    updateDisplay('registerDisplay', registers, ([reg, value]) => `<div>${reg.toUpperCase()}: ${value}</div>`);

    // Display new components
    document.getElementById('batteryDisplay').innerText = battery;
    document.getElementById('counterDisplay').innerText = registers.counter;
    document.getElementById('commandCounterDisplay').innerText = commandCounter;
    document.getElementById('commandMachineCodeDisplay').innerText = commandRegister.machineCode;
    document.getElementById('commandAssemblerDisplay').innerText = commandRegister.assembler;
    document.getElementById('ZFDisplay').innerText = flagRegister.ZF;
    document.getElementById('SFDisplay').innerText = flagRegister.SF;
    document.getElementById('OFDisplay').innerText = flagRegister.OF;
};


const loadCode = () => {
    const code = sessionStorage.getItem('lastLaunchCode');
    if (code) document.getElementById('codeInput').value = code;
};
