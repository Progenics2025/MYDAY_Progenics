import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    BackHandler,
    Alert,
    Animated
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ApiService } from '../services/ApiService';
import { LocationService } from '../services/LocationService';
import { MapPin, Navigation, Play, Square, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

const WEB_URL = 'https://myday.progenicslabs.com';

export default function DashboardScreen({ navigation }: any) {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [injectedScript, setInjectedScript] = useState('');

    // Tracking state
    const [isTracking, setIsTracking] = useState(false);
    const [trackingLoading, setTrackingLoading] = useState(false);
    const [stats, setStats] = useState({ distance: 0, visits: 0 });
    const [isExpanded, setIsExpanded] = useState(false);
    const animatedHeight = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadToken();
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkTrackingStatus();
            fetchStats();
        }, [])
    );

    const loadToken = async () => {
        const token = await ApiService.getToken();
        if (token) {
            const script = `
                (function() {
                    try {
                        const currentToken = localStorage.getItem('auth_token');
                        if (currentToken !== '${token}') {
                            localStorage.setItem('auth_token', '${token}');
                            if (window.location.pathname === '/auth' || !currentToken) {
                                window.location.reload();
                            }
                        }
                    } catch (e) {
                        console.error('Failed to set token', e);
                    }
                })();
            `;
            setInjectedScript(script);
        }
    };

    const checkTrackingStatus = async () => {
        const tracking = await LocationService.isTracking();
        setIsTracking(tracking);
    };

    const fetchStats = async () => {
        try {
            const employeeId = await SecureStore.getItemAsync('employee_id');
            if (!employeeId) return;

            const response = await ApiService.get(`/api/location/summary/${employeeId}`);
            if (response.ok) {
                const data = await response.json();
                setStats({
                    distance: data.summary?.totalDistanceKm || 0,
                    visits: data.summary?.totalVisits || 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleToggleTracking = async () => {
        setTrackingLoading(true);
        try {
            if (isTracking) {
                await LocationService.stopTracking();
                setIsTracking(false);
                Alert.alert('Tracking Stopped', 'Location tracking has been stopped.');
            } else {
                const success = await LocationService.startTracking();
                if (success) {
                    setIsTracking(true);
                    Alert.alert('Tracking Started', 'Your location is being tracked.');
                } else {
                    Alert.alert('Permission Denied', 'Location permission is required.');
                }
            }
            fetchStats();
        } catch (error) {
            Alert.alert('Error', 'Failed to toggle tracking.');
        } finally {
            setTrackingLoading(false);
        }
    };

    const toggleExpand = () => {
        const toValue = isExpanded ? 0 : 1;
        Animated.timing(animatedHeight, {
            toValue,
            duration: 200,
            useNativeDriver: false,
        }).start();
        setIsExpanded(!isExpanded);
    };

    // Handle Android hardware back button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (canGoBack && webViewRef.current) {
                    webViewRef.current.goBack();
                    return true;
                }
                return false;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [canGoBack])
    );

    const expandedHeight = animatedHeight.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 80],
    });

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Field Tracking Header */}
            <View style={styles.trackingHeader}>
                <TouchableOpacity style={styles.trackingBar} onPress={toggleExpand}>
                    <View style={styles.trackingInfo}>
                        <View style={[styles.statusDot, { backgroundColor: isTracking ? '#10B981' : '#9CA3AF' }]} />
                        <Text style={styles.statusText}>
                            {isTracking ? 'Tracking Active' : 'Tracking Off'}
                        </Text>
                    </View>
                    <View style={styles.trackingStats}>
                        <View style={styles.miniStat}>
                            <Navigation color="#4F46E5" size={14} />
                            <Text style={styles.miniStatText}>{stats.distance.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.miniStat}>
                            <MapPin color="#10B981" size={14} />
                            <Text style={styles.miniStatText}>{stats.visits}</Text>
                        </View>
                    </View>
                    {isExpanded ? <ChevronUp color="#6B7280" size={20} /> : <ChevronDown color="#6B7280" size={20} />}
                </TouchableOpacity>

                {/* Expandable Controls */}
                <Animated.View style={[styles.expandedContent, { height: expandedHeight }]}>
                    <TouchableOpacity
                        style={[styles.trackingButton, { backgroundColor: isTracking ? '#EF4444' : '#4F46E5' }]}
                        onPress={handleToggleTracking}
                        disabled={trackingLoading}
                    >
                        {trackingLoading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <>
                                {isTracking ? (
                                    <Square color="white" size={18} fill="white" />
                                ) : (
                                    <Play color="white" size={18} fill="white" />
                                )}
                                <Text style={styles.trackingButtonText}>
                                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* WebView Dashboard */}
            <WebView
                ref={webViewRef}
                source={{ uri: WEB_URL }}
                style={styles.webview}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onNavigationStateChange={(navState) => {
                    setCanGoBack(navState.canGoBack);
                }}
                injectedJavaScript={injectedScript}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    trackingHeader: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    trackingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    trackingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    trackingStats: {
        flexDirection: 'row',
        gap: 12,
    },
    miniStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    miniStatText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    expandedContent: {
        overflow: 'hidden',
        paddingHorizontal: 16,
    },
    trackingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12,
    },
    trackingButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
});
