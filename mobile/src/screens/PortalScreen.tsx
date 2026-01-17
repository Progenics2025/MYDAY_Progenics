import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ApiService } from '../services/ApiService';

const WEB_URL = 'https://myday.progenicslabs.com';

export default function PortalScreen() {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [canGoBack, setCanGoBack] = useState(false);
    const [injectedScript, setInjectedScript] = useState('');

    useEffect(() => {
        loadToken();
    }, []);

    const loadToken = async () => {
        const token = await ApiService.getToken();
        if (token) {
            // Script to set localStorage and reload if needed
            const script = `
                (function() {
                    try {
                        const currentToken = localStorage.getItem('auth_token');
                        if (currentToken !== '${token}') {
                            localStorage.setItem('auth_token', '${token}');
                            // Only reload if we're on the login page or if we just set the token
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
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
