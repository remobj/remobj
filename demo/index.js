import { consume, createJsonEndpoint, provide, setDevtoolsEP } from '../packages/core/dist/core.bundler.js';

setDevtoolsEP(new WebSocket('ws://localhost:3333'))

// Global variables for demo
let channelA, channelB;
let channel;
let remoteCalculator;
let localCalculator;

// Logging helpers
function logA(message, type = 'local') {
    const logDiv = document.querySelector('#logA');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.append(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function logB(message, type = 'remote') {
    const logDiv = document.querySelector('#logB');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.append(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
}

// Update connection status
function updateStatus(contextId, connected) {
    const statusEl = document.getElementById(`status${contextId}`);
    statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
    statusEl.textContent = connected ? 'Connected' : 'Disconnected';
}

// Setup MessageChannel connection
window.setupConnection = function setupConnection() {
    logA('Setting up MessageChannel...', 'local');
    
    // Create MessageChannel
    channel = new MessageChannel();
    
    // Create multiplexed endpoints for both sides
    channelA = (channel.port1);
    channelB = (channel.port2);
    
    // Start the ports
    channel.port1.start();
    channel.port2.start();
    
    updateStatus('A', true);
    updateStatus('B', true);
    
    logA('MessageChannel connected!', 'local');
    logB('MessageChannel connected!', 'remote');
};

// Create a local object in Context B
window.createLocalObject = function createLocalObject() {
    if (!channelB) {
        logB('Please setup connection first!', 'error');
        return;
    }
    
    logB('Creating local Calculator object...', 'remote');
    
    // Create a calculator object with methods and properties using closure
    let result = 0;
    let history = [];
    let onClearHandler;
    let onCalculationHandler;
    
    localCalculator = {
        get result() { return result; },
        set result(val) { result = val; },
        
        get history() { return history; },
        
        get onClear() { return onClearHandler; },
        set onClear(handler) { onClearHandler = handler; },
        
        get onCalculation() { return onCalculationHandler; },
        set onCalculation(handler) { onCalculationHandler = handler; },
        
        add(a, b) {
            console.log(1)
            const sum = a + b;
            result = sum;
            history.push(`${a} + ${b} = ${sum}`);
            logB(`Calculator.add(${a}, ${b}) = ${sum}`, 'remote');
            return sum;
        },
        
        subtract(a, b) {
            console.log(2)
            const diff = a - b;
            result = diff;
            history.push(`${a} - ${b} = ${diff}`);
            logB(`Calculator.subtract(${a}, ${b}) = ${diff}`, 'remote');
            return diff;
        },
        
        multiply(a, b) {
            console.log(3)
            const product = a * b;
            result = product;
            history.push(`${a} * ${b} = ${product}`);
            logB(`Calculator.multiply(${a}, ${b}) = ${product}`, 'remote');
            return product;
        },
        
        divide(a, b) {
            console.log(4)
            if (b === 0) {
                throw new Error('Division by zero!');
            }
            const quotient = a / b;
            result = quotient;
            history.push(`${a} / ${b} = ${quotient}`);
            logB(`Calculator.divide(${a}, ${b}) = ${quotient}`, 'remote');
            return quotient;
        },
        
        getHistory() {
            console.log(5)
            logB(`Calculator.getHistory() called`, 'remote');
            return history;
        },
        
        clear() {
            console.log(6)
            result = 0;
            history = [];
            logB('Calculator cleared', 'remote');
            if (onClearHandler) {
                onClearHandler();
            }
        }
    };
    
    // Provide the object through Context B
    provide(localCalculator, channelB);
    
    logB('Calculator object created and provided!', 'remote');
};

// Create remote object proxy in Context A
window.createRemoteObject = async function createRemoteObject() {
    if (!channelA) {
        logA('Please setup connection first!', 'error');
        return;
    }
    
    logA('Creating remote object proxy for Calculator...', 'local');
    
    try {
        remoteCalculator = consume(channelA);
        logA('Remote Calculator proxy created!', 'local');
    } catch (error) {
        logA(`Error creating remote object: ${error.message}`, 'error');
    }
};

// Call remote methods
window.callRemoteMethod = async function callRemoteMethod() {
    if (!remoteCalculator) {
        logA('Please create remote object first!', 'error');
        return;
    }
    
    try {
        logA('Calling remote methods...', 'local');
        
        // Call add method
        const sum = await remoteCalculator.add(5, 3);
        logA(`Remote add(5, 3) returned: ${sum}`, 'local');
        
        // Call multiply method
        const product = await remoteCalculator.multiply(4, 7);
        logA(`Remote multiply(4, 7) returned: ${product}`, 'local');
        
        // Call divide method with error handling
        try {
            const quotient = await remoteCalculator.divide(10, 2);
            logA(`Remote divide(10, 2) returned: ${quotient}`, 'local');
        } catch (error) {
            logA(`Remote divide error: ${error.message}`, 'error');
        }
        
    } catch (error) {
        logA(`Error calling remote method: ${error.message}`, 'error');
    }
};

// Get remote properties
window.getRemoteProperty = async function getRemoteProperty() {
    if (!remoteCalculator) {
        logA('Please create remote object first!', 'error');
        return;
    }
    
    try {
        logA('Getting remote properties...', 'local');
        
        const result = await remoteCalculator.result;
        logA(`Remote result property: ${result}`, 'local');
        
        const history = await remoteCalculator.getHistory();
        logA(`Remote history: ${JSON.stringify(history)}`, 'local');
        
    } catch (error) {
        logA(`Error getting remote property: ${error.message}`, 'error');
    }
};

// Subscribe to remote events
window.subscribeToEvents = function subscribeToEvents() {
    if (!remoteCalculator) {
        logA('Please create remote object first!', 'error');
        return;
    }
    
    logA('Subscribing to remote events...', 'local');
    
    // Subscribe to onClear event
    remoteCalculator.onClear = () => {
        logA('Received onClear event from remote!', 'local');
    };
    
    logA('Subscribed to remote events!', 'local');
};

// Trigger event from Context A
window.triggerRemoteEvent = async function triggerRemoteEvent() {
    if (!remoteCalculator) {
        logA('Please create remote object first!', 'error');
        return;
    }
    
    try {
        logA('Triggering clear() method which will emit event...', 'local');
        await remoteCalculator.clear();
        logA('Clear method called!', 'local');
    } catch (error) {
        logA(`Error triggering remote event: ${error.message}`, 'error');
    }
};

// Update local property (Context B)
window.updateLocalProperty = function updateLocalProperty() {
    if (!localCalculator) {
        logB('Please create local object first!', 'error');
        return;
    }
    
    const newValue = Math.floor(Math.random() * 100);
    localCalculator.result = newValue;
    logB(`Updated result property to: ${newValue}`, 'remote');
};

// Emit local event (Context B)
window.emitLocalEvent = function emitLocalEvent() {
    if (!localCalculator) {
        logB('Please create local object first!', 'error');
        return;
    }
    
    const handler = localCalculator.onClear;
    if (handler) {
        logB('Emitting onClear event...', 'remote');
        handler();
    } else {
        logB('No event listeners subscribed to onClear', 'remote');
    }
};

// Auto-setup for demo
window.addEventListener('load', () => {
    logA('RemObj Demo loaded. Click "Setup Connection" to begin.', 'local');
    logB('Waiting for connection...', 'remote');
});