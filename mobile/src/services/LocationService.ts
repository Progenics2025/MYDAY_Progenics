import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ApiService } from './ApiService';
import * as SecureStore from 'expo-secure-store';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        console.log('Received background locations:', locations.length);

        try {
            // Get employee ID from storage (we'll need to store it on login)
            const employeeId = await SecureStore.getItemAsync('employee_id');

            if (employeeId && locations.length > 0) {
                // Format locations for API
                const formattedLocations = locations.map(loc => ({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    accuracy: loc.coords.accuracy,
                    altitude: loc.coords.altitude,
                    speed: loc.coords.speed,
                    heading: loc.coords.heading,
                    timestamp: new Date(loc.timestamp).toISOString()
                }));

                // Send to backend
                await ApiService.post('/api/location/track', {
                    employeeId,
                    locations: formattedLocations
                });
                console.log('Locations synced to server');
            }
        } catch (err) {
            console.error('Failed to sync locations:', err);
            // TODO: Queue for offline sync
        }
    }
});

export const LocationService = {
    async requestPermissions() {
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
            console.log('Foreground permission denied');
            return false;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
            console.log('Background permission denied');
            return false;
        }
        return true;
    },

    async startTracking() {
        const hasPermissions = await this.requestPermissions();
        if (!hasPermissions) return false;

        const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isStarted) return true;

        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000, // Update every 1 minute
            distanceInterval: 50, // Or every 50 meters
            deferredUpdatesInterval: 60000, // Minimum time to wait before delivering updates
            deferredUpdatesDistance: 50, // Minimum distance
            foregroundService: {
                notificationTitle: "MyDay Tracking Active",
                notificationBody: "Your location is being tracked for work.",
                notificationColor: "#4F46E5",
            },
        });
        console.log('Background tracking started');
        return true;
    },

    async stopTracking() {
        const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (isStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('Background tracking stopped');
        }
    },

    async isTracking() {
        return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
};
