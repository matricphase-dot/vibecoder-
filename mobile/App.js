import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator();

// Home screen: connect to backend, send prompts, view logs
function HomeScreen() {
  const [connected, setConnected] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://192.168.1.X:8000/ws'); // Change to your backend IP
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'log') {
        setLogs(prev => [...prev, { message: data.message, timestamp: new Date() }]);
      } else if (data.type === 'complete') {
        setGenerating(false);
      }
    };
    return () => ws.close();
  }, []);

  const generate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    wsRef.current.send(JSON.stringify({ type: 'generate', prompt, plan: 'fast', template: 'vanilla' }));
    setLogs(prev => [...prev, { message: `Generating: ${prompt}`, timestamp: new Date() }]);
    setPrompt('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>VibeCoder Mobile</Text>
      <Text style={styles.status}>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ask anything..."
        value={prompt}
        onChangeText={setPrompt}
        editable={!generating}
      />
      <Button title={generating ? "Generating..." : "Generate"} onPress={generate} disabled={generating} />
      <FlatList
        data={logs.slice().reverse()}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={({ item }) => <Text style={styles.log}>[{item.timestamp.toLocaleTimeString()}] {item.message}</Text>}
        style={styles.logList}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="VibeCoder" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0D1117' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#58A6FF', marginBottom: 20 },
  status: { fontSize: 14, color: '#C9D1D9', marginBottom: 10 },
  input: { backgroundColor: '#161B22', color: '#C9D1D9', padding: 10, borderRadius: 5, marginBottom: 10 },
  logList: { marginTop: 20, flex: 1 },
  log: { color: '#8B949E', fontSize: 12, marginVertical: 2 },
});
