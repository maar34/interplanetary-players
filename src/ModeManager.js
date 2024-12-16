// ModeManager.js
import { SensorController } from './SensorsController.js'; // Import the class
import notifications from './AppNotifications.js';
import { MIDIControllerInstance } from './MIDIController.js'; // Ensure MIDIController is properly exported

export class ModeManager {
    constructor() {
        this.currentMode = 'JAM'; // default mode
        this.subscribers = [];
        this.modes = {};
    }

    registerMode(name, { onEnter, onExit }) {
        this.modes[name] = { onEnter, onExit };
    }
    activateMode(newMode) {
        // Check if the mode being activated is already active
        if (this.currentMode === newMode) {
            console.log(`[ModeManager] Mode "${newMode}" is already active. No action taken.`);
            return;
        }
    
        console.log(`[ModeManager] Switching mode from "${this.currentMode}" to "${newMode}".`);
    
        // Exit current mode
        const oldMode = this.currentMode;
        if (this.modes[oldMode] && this.modes[oldMode].onExit) {
            console.log(`[ModeManager] Exiting mode: ${oldMode}`);
            this.modes[oldMode].onExit();
        }
    
        // Set the new mode
        this.currentMode = newMode;
    
        // Enter new mode
        if (this.modes[newMode] && this.modes[newMode].onEnter) {
            console.log(`[ModeManager] Entering mode: ${newMode}`);
            this.modes[newMode].onEnter();
        } else {
            console.warn(`[ModeManager] No onEnter function defined for mode: ${newMode}`);
        }
    
        // Notify subscribers
        this.subscribers.forEach(cb => cb(newMode));
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    getActiveMode() {
        return this.currentMode;
    }
}

export const ModeManagerInstance = new ModeManager();

// Register all modes here
ModeManagerInstance.registerMode('JAM', {
    onEnter: () => {
        console.log('[ModeManager] Entered JAM mode.');
        notifications.showToast("Switched to Jam mode.");
        // Add any JAM mode-specific UI changes here
    },
    onExit: () => {
        console.log('[ModeManager] Exited JAM mode.');
        // Clean up JAM mode-specific UI changes here
    }
});

ModeManagerInstance.registerMode('MIDI_LEARN', {
    onEnter: async () => {
        console.log('[ModeManager] Entered MIDI_LEARN mode.');
        try {

            // Show sensor toggle buttons as part of MIDI Learn mode
            document.querySelectorAll('.xyz-sensors-toggle').forEach(button => {
                console.log(`Showing sensor toggle button: ${button.id}`);
                button.style.display = 'block';
            });
            
            if (MIDIControllerInstance) {
                await MIDIControllerInstance.activateMIDI();
                MIDIControllerInstance.enableMidiLearn();
                console.log('[ModeManager] MIDI Learn functionality enabled.');
                notifications.showToast("MIDI Learn mode activated.");
            } else {
                console.error('[ModeManager] MIDIControllerInstance is not available.');
                notifications.showToast("MIDI Controller is not available.", 'error');
            }


        } catch (error) {
            console.error('[ModeManager] Error activating MIDI Learn mode:', error);
            notifications.showToast("Error activating MIDI Learn mode.", 'error');
        }
    },
    onExit: () => {
        console.log('[ModeManager] Exited MIDI_LEARN mode.');
        if (MIDIControllerInstance) {
            MIDIControllerInstance.exitMidiLearnMode();
            console.log('[ModeManager] MIDI Learn functionality disabled.');
        }

        // Hide sensor toggle buttons when leaving MIDI Learn mode
        document.querySelectorAll('.xyz-sensors-toggle').forEach(button => {
            console.log(`Hiding sensor toggle button: ${button.id}`);
            button.style.display = 'none';
        });

        notifications.showToast("Exited MIDI Learn mode.");
    }
});
ModeManagerInstance.registerMode('SENSORS', {
    onEnter: async () => {
        console.log('[ModeManager] Entering SENSORS mode...');
        // Instantiate SensorController with user1Manager when activating
        if (ModeManagerInstance.user1Manager) { // Ensure user1Manager is set
            const sensorControllerInstance = new SensorController(ModeManagerInstance.user1Manager);
            await sensorControllerInstance.activateSensors();
            notifications.showToast("Sensors mode activated. Receiving device orientation data.");
            console.log('[ModeManager] Sensors mode activated.');

            // Show sensor toggle buttons
            document.querySelectorAll('.xyz-sensors-toggle').forEach(button => {
                console.log(`Showing button: ${button.id}`);
                button.style.display = 'block';
            });

            // Store the instance if needed for later use
            ModeManagerInstance.sensorControllerInstance = sensorControllerInstance;
        } else {
            console.error('[ModeManager] user1Manager is not initialized.');
            notifications.showToast("Sensors cannot be activated because user manager is not available.", 'error');
        }
    },
    onExit: () => {
        console.log('[ModeManager] Exiting SENSORS mode...');
        const sensorControllerInstance = ModeManagerInstance.sensorControllerInstance;
        if (sensorControllerInstance && sensorControllerInstance.isSensorActive) {
            sensorControllerInstance.stopListening();
            console.log('[ModeManager] Sensors mode deactivated.');
        }
        notifications.showToast("Exited Sensors mode.");

        // Hide sensor toggle buttons
        document.querySelectorAll('.xyz-sensors-toggle').forEach(button => {
            console.log(`Hiding button: ${button.id}`);
            button.style.display = 'none';
        });
    }
});

ModeManagerInstance.registerMode('COSMIC_LFO', {
    onEnter: () => {
        console.log('[ModeManager] Entered COSMIC_LFO mode.');
        notifications.showToast("Cosmic LFO mode activated.");
        // Add any COSMIC_LFO mode-specific UI changes here
    },
    onExit: () => {
        console.log('[ModeManager] Exited COSMIC_LFO mode.');
        notifications.showToast("Exited Cosmic LFO mode.");
        // Clean up COSMIC_LFO mode-specific UI changes here
    }
});

// Optionally, set user1Manager here if it's globally accessible
// ModeManagerInstance.user1Manager = user1Manager; // Set it when user1Manager is available

// Initially start in JAM mode
ModeManagerInstance.activateMode('JAM');

// Subscribe to mode changes if needed elsewhere
ModeManagerInstance.subscribe((newMode) => {
    console.log(`[ModeManager] Mode changed to: ${newMode}`);
});