import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationService } from '../services/LocationService';
import { ApiService } from '../services/ApiService';
import * as SecureStore from 'expo-secure-store';
import { MapPin, Clock, LogOut, Play, Square, Navigation } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }: any) {
    const [isTracking, setIsTracking] = useState(false);
    const [employeeName, setEmployeeName] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ distance: 0, visits: 0 });

    useFocusEffect(
        useCallback(() => {
            checkStatus();
            loadEmployeeInfo();
            fetchStats();
        }, [])
    );

    const loadEmployeeInfo = async () => {
        const name = await SecureStore.getItemAsync('employee_name');
        if (name) setEmployeeName(name);
    };

    const fetchStats = async () => {
        try {
            const employeeId = await SecureStore.getItemAsync('employee_id');
            if (!employeeId) return;

            const response = await ApiService.get(`/api/location/summary/${employeeId}`);

            if (response.ok) {
                const data = await response.json();
                // Correctly access nested summary object
                setStats({
                    distance: data.summary?.totalDistanceKm || 0,
                    visits: data.summary?.totalVisits || 0
                });
            } else {
                // Log error if response is not OK
                const text = await response.text();
                console.error('Fetch stats failed:', response.status, text);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([checkStatus(), loadEmployeeInfo(), fetchStats()]);
        setRefreshing(false);
    };

    const checkStatus = async () => {
        const tracking = await LocationService.isTracking();
        setIsTracking(tracking);
    };

    const handleToggleTracking = async () => {
        setLoading(true);
        try {
            if (isTracking) {
                // Stop Tracking
                await LocationService.stopTracking();
                setIsTracking(false);
                Alert.alert('Tracking Stopped', 'You are no longer sharing your location.');
            } else {
                // Start Tracking
                const success = await LocationService.startTracking();
                if (success) {
                    setIsTracking(true);
                    Alert.alert('Tracking Started', 'Your location is now being tracked in the background.');
                } else {
                    Alert.alert('Permission Denied', 'Location permission is required to track your route.');
                }
            }
            // Refresh stats after toggling
            fetchStats();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to toggle tracking.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await LocationService.stopTracking();
                        await ApiService.removeToken();
                        navigation.replace('Login');
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello,</Text>
                    <Text style={styles.name}>{employeeName || 'Employee'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <LogOut color="#EF4444" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Status Card */}
                <View style={[styles.card, isTracking ? styles.cardActive : styles.cardInactive]}>
                    <View style={styles.statusHeader}>
                        <View style={[styles.statusDot, { backgroundColor: isTracking ? '#10B981' : '#9CA3AF' }]} />
                        <Text style={[styles.statusText, { color: isTracking ? '#10B981' : '#6B7280' }]}>
                            {isTracking ? 'TRACKING ACTIVE' : 'TRACKING INACTIVE'}
                        </Text>
                    </View>

                    <Text style={styles.statusDescription}>
                        {isTracking
                            ? 'Your location is being recorded in the background.'
                            : 'Punch in to start tracking your location.'}
                    </Text>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: isTracking ? '#EF4444' : '#4F46E5' }]}
                        onPress={handleToggleTracking}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                {isTracking ? <Square color="white" size={20} fill="white" /> : <Play color="white" size={20} fill="white" />}
                                <Text style={styles.actionButtonText}>
                                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <Navigation color="#4F46E5" size={24} />
                        </View>
                        <Text style={styles.statValue}>{stats.distance.toFixed(2)} km</Text>
                        <Text style={styles.statLabel}>Distance Today</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                            <MapPin color="#10B981" size={24} />
                        </View>
                        <Text style={styles.statValue}>{stats.visits}</Text>
                        <Text style={styles.statLabel}>Visits Today</Text>
                    </View>
                </View>

                {/* Recent Activity Placeholder */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <View style={styles.emptyState}>
                        <Clock color="#9CA3AF" size={48} />
                        <Text style={styles.emptyStateText}>No recent activity</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    greeting: {
        fontSize: 14,
        color: '#6B7280',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    logoutButton: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    content: {
        padding: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
    },
    cardActive: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    cardInactive: {
        borderColor: '#E5E7EB',
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    statusDescription: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: 'white',
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    emptyStateText: {
        marginTop: 16,
        color: '#9CA3AF',
    },
});
