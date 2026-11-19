
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const keypad = document.getElementById("keypad");

let expression = "";
let isCalculated = false;

const operators = ["+", "-", "*", "/"];

function updateDisplay() {
    expressionDisplay.textContent = expression || "Ready to calculate";
    resultDisplay.textContent = expression || "0";
}

function clearCalculator() {
    expression = "";
    isCalculated = false;
    expressionDisplay.textContent = "Ready to calculate";
    resultDisplay.textContent = "0";
}

function appendValue(value) {
    if (isCalculated) {
        if (!operators.includes(value) && value !== "%") {
            expression = "";
        }
        isCalculated = false;
    }

    const lastChar = expression.slice(-1);

    if (value === ".") {
        const currentNumber = expression.split(/[+\-*/]/).pop();

        if (currentNumber.includes(".")) return;

        if (currentNumber === "") {
            expression += "0";
        }
    }

    if (operators.includes(value)) {
        if (!expression && value !== "-") return;

        if (operators.includes(lastChar)) {
            if (value === "-" && lastChar !== "-") {
                expression += value;
                updateDisplay();
                return;
            }

            expression = expression.slice(0, -1);
        }
    }

    expression += value;
    updateDisplay();
}

function backspace() {
    expression = expression.slice(0, -1);
    isCalculated = false;
    updateDisplay();
}

function toggleSign() {
    if (!expression) {
        expression = "-";
    } else if (expression.startsWith("-")) {
        expression = expression.slice(1);
    } else {
        expression = "-" + expression;
    }

    isCalculated = false;
    updateDisplay();
}

// Safe arithmetic parser without eval()
function tokenize(input) {
    const tokens = input.match(/\d*\.?\d+|[+\-*/%]/g);

    if (!tokens || tokens.join("") !== input) {
        throw new Error("Invalid expression");
    }

    return tokens;
}

function calculateExpression(input) {
    const tokens = tokenize(input);
    let position = 0;

    function parseExpression() {
        let value = parseTerm();

        while (position < tokens.length) {
            const operator = tokens[position];

            if (operator !== "+" && operator !== "-") break;

            position++;
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (position < tokens.length) {
            const operator = tokens[position];

            if (!["*", "/", "%"].includes(operator)) break;

            position++;
            const right = parseUnary();

            if ((operator === "/" || operator === "%") && right === 0) {
                throw new Error("Cannot divide by zero");
            }

            if (operator === "*") value *= right;
            if (operator === "/") value /= right;
            if (operator === "%") value %= right;
        }

        return value;
    }

    function parseUnary() {
        const operator = tokens[position];

        if (operator === "+" || operator === "-") {
            position++;
            const value = parseUnary();

            return operator === "-" ? -value : value;
        }

        return parseNumber();
    }

    function parseNumber() {
        const token = tokens[position];

        if (!token || !/^\d*\.?\d+$/.test(token)) {
            throw new Error("Invalid number");
        }

        position++;

        return Number(token);
    }

    const result = parseExpression();

    if (position !== tokens.length || !Number.isFinite(result)) {
        throw new Error("Invalid expression");
    }

    return result;
}

function calculate() {
    if (!expression) return;

    try {
        const result = calculateExpression(expression);

        const formattedResult = Number(result.toPrecision(12));

        expressionDisplay.textContent = expression + " =";
        resultDisplay.textContent = formattedResult.toString();

        expression = formattedResult.toString();
        isCalculated = true;

    } catch (error) {
        resultDisplay.textContent =
            error.message === "Cannot divide by zero"
                ? "Cannot divide by zero"
                : "Error";

        isCalculated = true;
    }
}

// Event delegation: no inline onclick attributes
keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) return;

    const { value, action } = button.dataset;

    if (action === "clear") {
        clearCalculator();
    } else if (action === "backspace") {
        backspace();
    } else if (action === "calculate") {
        calculate();
    } else if (action === "sign") {
        toggleSign();
    } else if (value) {
        appendValue(value);
    }
});

// Keyboard support
document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/^[0-9.]$/.test(key)) {
        appendValue(key);
    } else if (operators.includes(key) || key === "%") {
        appendValue(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculate();
    } else if (key === "Backspace") {
        backspace();
    } else if (key === "Escape") {
        clearCalculator();
    }
});
