// SensorsController.js
import { Quaternion, Euler, Vector3, MathUtils } from 'three'; // Use named imports
import notifications from './AppNotifications.js'; // Import notifications directly

export class SensorController {
    /**
     * Creates an instance of SensorController.
     * @param {User1Manager} user1Manager - The user manager instance.
     */
    constructor(user1Manager) {
        if (SensorController.instance) {
            return SensorController.instance;
        }

        this.isSensorActive = false;
        this.user1Manager = user1Manager;
        this.debugInterval = null;

        // Initialize Three.js Quaternion and Vector3
        this.quaternion = new Quaternion();
        this.referenceVector = new Vector3(1, 0, 0); // Reference axis to map
        this.rotatedVector = new Vector3();

        SensorController.instance = this;
    }

    /**
     * Checks if Device Orientation is supported.
     * @returns {boolean}
     */
    static isSupported() {
        return typeof DeviceOrientationEvent !== 'undefined';
    }

    /**
     * Requests permission to access sensors if needed (iOS 13+).
     * @async
     * @returns {Promise<boolean>} - True if permission granted, false otherwise.
     */
    async requestPermission() {
        if (
            typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function'
        ) {
            try {
                const response = await DeviceOrientationEvent.requestPermission();
                if (response === 'granted') {
                    notifications.showToast('Sensor access granted.', 'success');
                    return true;
                } else {
                    notifications.showToast('Sensor access denied.', 'error');
                    return false;
                }
            } catch (error) {
                console.error('SensorController: Error requesting permission:', error);
                notifications.showToast('Error requesting sensor access.', 'error');
                return false;
            }
        }

        // Assume permissions are granted for non-iOS devices
        notifications.showToast('Sensor access available (no explicit request needed).', 'info');
        return true;
    }

    /**
     * Activates sensor data listening if supported and user grants permission.
     * @async
     * @public
     * @returns {Promise<void>}
     */
    async activateSensors() {
        if (!SensorController.isSupported()) {
            notifications.showToast('Device orientation not supported by this browser/device.', 'warning');
            return;
        }

        const permissionGranted = await this.requestPermission();
        if (!permissionGranted) {
            notifications.showToast('Permission to access sensors denied.', 'error');
            return;
        }

        this.startListening();
        this.isSensorActive = true;
        notifications.showToast('Sensors activated successfully!', 'success');
    }

    /**
     * Starts listening to device orientation events.
     * @private
     */
    startListening() {
        window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this), true);
        this.startDebugging();
        console.log('SensorController: Started listening to deviceorientation events.');
    }

    /**
     * Stops listening to device orientation events.
     * @public
     */
    stopListening() {
        window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
        this.isSensorActive = false;
        this.stopDebugging();
        notifications.showToast('Sensors deactivated.', 'info');
        console.log('SensorController: Stopped listening to deviceorientation events.');
    }

    /**
     * Handles device orientation events.
     * Converts Euler angles to quaternion and maps to parameters.
     * @param {DeviceOrientationEvent} event - The orientation event.
     * @private
     */
    handleDeviceOrientation(event) {
        try {
            const { alpha, beta, gamma } = event;

            // Log received angles
            console.log(`DeviceOrientationEvent: alpha=${alpha}, beta=${beta}, gamma=${gamma}`);

            this.sensorData = { alpha, beta, gamma, quaternion: null };

            // Convert Euler angles to quaternion using Three.js
            // Three.js uses 'ZXY' order for device orientation by default
            const euler = new Euler(
                MathUtils.degToRad(beta || 0),
                MathUtils.degToRad(alpha || 0),
                MathUtils.degToRad(gamma || 0),
                'ZXY'
            );
            this.quaternion.setFromEuler(euler);

            // Log quaternion
            console.log(`Quaternion: w=${this.quaternion.w.toFixed(3)}, x=${this.quaternion.x.toFixed(3)}, y=${this.quaternion.y.toFixed(3)}, z=${this.quaternion.z.toFixed(3)}`);

            this.sensorData.quaternion = [this.quaternion.w, this.quaternion.x, this.quaternion.y, this.quaternion.z];

            this.mapQuaternionToParameters(this.quaternion);
        } catch (error) {
            console.error('SensorController: Error in handleDeviceOrientation:', error);
        }
    }

    /**
     * Maps a quaternion to normalized x, y, z parameters by rotating a reference vector.
     * @param {THREE.Quaternion} q - The quaternion representing orientation.
     * @private
     */
    mapQuaternionToParameters(q) {
        try {
            // Apply quaternion to reference vector
            this.rotatedVector.copy(this.referenceVector).applyQuaternion(q);

            // Log rotated vector
            console.log(`Rotated Vector: x=${this.rotatedVector.x.toFixed(3)}, y=${this.rotatedVector.y.toFixed(3)}, z=${this.rotatedVector.z.toFixed(3)}`);

            // Normalize vector components from [-1, 1] to [0, 1]
            const mapTo01 = (v) => (v + 1) / 2;

            const xNorm = MathUtils.clamp(mapTo01(this.rotatedVector.x), 0, 1);
            const yNorm = MathUtils.clamp(mapTo01(this.rotatedVector.y), 0, 1);
            const zNorm = MathUtils.clamp(mapTo01(this.rotatedVector.z), 0, 1);

            // Log normalized values
            console.log(`Normalized Parameters: x=${xNorm.toFixed(3)}, y=${yNorm.toFixed(3)}, z=${zNorm.toFixed(3)}`);

            // Update parameters
            this.user1Manager.setNormalizedValue('x', xNorm);
            this.user1Manager.setNormalizedValue('y', yNorm);
            this.user1Manager.setNormalizedValue('z', zNorm);

            // Log updated parameters
            console.debug(`[SensorController] Updated parameters via quaternion: x=${xNorm.toFixed(3)}, y=${yNorm.toFixed(3)}, z=${zNorm.toFixed(3)}`);
        } catch (error) {
            console.error('SensorController: Error in mapQuaternionToParameters:', error);
        }
    }

    /**
     * Starts periodic debugging toasts with sensor data.
     * @private
     */
    startDebugging() {
        if (this.debugInterval) return;

        this.debugInterval = setInterval(() => {
            if (this.isSensorActive) {
                const { alpha, beta, gamma } = this.sensorData;
                notifications.showToast(
                    `Sensor Data:
Alpha: ${alpha?.toFixed(2)}°, Beta: ${beta?.toFixed(2)}°, Gamma: ${gamma?.toFixed(2)}°`,
                    'info'
                );
            }
        }, 5000);

        console.log('SensorController: Started debugging interval.');
    }

    /**
     * Stops periodic debugging toasts.
     * @private
     */
    stopDebugging() {
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
            this.debugInterval = null;
            console.log('SensorController: Stopped debugging interval.');
        }
    }
}